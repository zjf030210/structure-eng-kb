/* ============================================================
 * kb-step-view.js —— STEP 成本评估的界面层
 *
 * 三块内容：
 *   ① 极简 WebGL 查看器（自写，不依赖 three.js —— 保持离线可用、零外部依赖）
 *      · 正交于项目的既有决策：统计图表也是手绘 SVG，同样不引图表库
 *      · 拖拽旋转 / 滚轮缩放 / 点击拾取（颜色编码渲染到离屏缓冲再读像素）
 *   ② STEP 解析：官方 Worker + WASM，主线程不卡顿
 *   ③ 界面：装配树（按零件选材料）、成本卡、AI 提示词、CSV 导出
 * ============================================================ */
(function () {
  "use strict";

  var $ = function (id) { return document.getElementById(id); };
  var S = window.KB_STEP;

  function esc(s) {
    return String(s === null || s === undefined ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  /* 零件配色（低饱和，与站点风格一致） */
  var PALETTE = [
    [96, 145, 200], [120, 180, 150], [205, 150, 95], [160, 130, 195],
    [200, 110, 120], [110, 170, 195], [175, 175, 105], [145, 145, 175],
    [200, 165, 130], [125, 190, 180], [185, 140, 165], [130, 155, 130]
  ];
  function partColor(i) {
    var c = PALETTE[i % PALETTE.length];
    var k = 0.78 + 0.22 * ((Math.floor(i / PALETTE.length) % 2));
    return [c[0] * k / 255, c[1] * k / 255, c[2] * k / 255];
  }

  /* ══════════════ 状态 ══════════════ */
  var st = {
    parts: [], tree: [], params: {}, info: null,
    sel: -1, parsed: false, busy: false, err: "",
    open: {}          // 展开了「开模设置」的零件索引
  };
  for (var k in S.PARAMS) st.params[k] = S.PARAMS[k].v;

  /* ══════════════ ① WebGL 查看器 ══════════════ */
  function Viewer(canvas) {
    var gl = canvas.getContext("webgl", { antialias: true, preserveDrawingBuffer: true })
          || canvas.getContext("experimental-webgl", { antialias: true, preserveDrawingBuffer: true });
    if (!gl) return null;

    var VS = [
      "attribute vec3 aPos; attribute vec3 aNrm;",
      "uniform mat4 uMVP; uniform mat3 uRot; uniform float uScale;",
      "varying vec3 vN;",
      "void main(){ vN = uRot * aNrm; gl_Position = uMVP * vec4(aPos * uScale, 1.0); }"
    ].join("\n");
    var FS = [
      "precision mediump float;",
      "varying vec3 vN; uniform vec3 uColor; uniform float uDim;",
      "void main(){",
      "  vec3 n = normalize(vN);",
      "  float d = abs(dot(n, normalize(vec3(0.45, 0.75, 0.5))));",
      "  float e = abs(dot(n, normalize(vec3(-0.6, 0.2, -0.4))));",
      "  float l = 0.46 + 0.46 * d + 0.16 * e;",
      "  gl_FragColor = vec4(uColor * l * uDim, 1.0);",
      "}"
    ].join("\n");
    var PVS = "attribute vec3 aPos; uniform mat4 uMVP; uniform float uScale; void main(){ gl_Position = uMVP * vec4(aPos * uScale, 1.0); }";
    var PFS = "precision mediump float; uniform vec3 uId; void main(){ gl_FragColor = vec4(uId, 1.0); }";

    /* 包围盒线框：单位立方体（12 条边）经 uCenter/uSize 变换到目标零件的位置 */
    var WVS = "attribute vec3 aPos; uniform mat4 uMVP; uniform vec3 uCenter; uniform vec3 uSize; uniform float uScale;"
            + " void main(){ vec3 p = uCenter + aPos * uSize; gl_Position = uMVP * vec4(p * uScale, 1.0); }";
    var WFS = "precision mediump float; uniform vec3 uColor; void main(){ gl_FragColor = vec4(uColor, 1.0); }";
    var UNIT_BOX = new Float32Array([
      -0.5, -0.5, -0.5,  0.5, -0.5, -0.5,
       0.5, -0.5, -0.5,  0.5,  0.5, -0.5,
       0.5,  0.5, -0.5, -0.5,  0.5, -0.5,
      -0.5,  0.5, -0.5, -0.5, -0.5, -0.5,
      -0.5, -0.5,  0.5,  0.5, -0.5,  0.5,
       0.5, -0.5,  0.5,  0.5,  0.5,  0.5,
       0.5,  0.5,  0.5, -0.5,  0.5,  0.5,
      -0.5,  0.5,  0.5, -0.5, -0.5,  0.5,
      -0.5, -0.5, -0.5, -0.5, -0.5,  0.5,
       0.5, -0.5, -0.5,  0.5, -0.5,  0.5,
       0.5,  0.5, -0.5,  0.5,  0.5,  0.5,
      -0.5,  0.5, -0.5, -0.5,  0.5,  0.5
    ]);

    function sh(type, src) {
      var s = gl.createShader(type);
      gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn(gl.getShaderInfoLog(s)); return null; }
      return s;
    }
    function prog(vs, fs) {
      var p = gl.createProgram();
      gl.attachShader(p, sh(gl.VERTEX_SHADER, vs));
      gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs));
      gl.linkProgram(p);
      return gl.getProgramParameter(p, gl.LINK_STATUS) ? p : null;
    }
    var P = prog(VS, FS), PP = prog(PVS, PFS), PW = prog(WVS, WFS);
    if (!P || !PP || !PW) return null;

    /* 大模型单个零件顶点常超过 65535，Uint16 索引会静默出错 */
    var uintExt = gl.getExtension("OES_element_index_uint");
    var IDX = uintExt ? Uint32Array : Uint16Array;
    var IDX_GL = uintExt ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT;

    var loc = {
      aPos: gl.getAttribLocation(P, "aPos"), aNrm: gl.getAttribLocation(P, "aNrm"),
      uMVP: gl.getUniformLocation(P, "uMVP"), uRot: gl.getUniformLocation(P, "uRot"),
      uScale: gl.getUniformLocation(P, "uScale"), uColor: gl.getUniformLocation(P, "uColor"),
      uDim: gl.getUniformLocation(P, "uDim")
    };
    var pLoc = {
      aPos: gl.getAttribLocation(PP, "aPos"),
      uMVP: gl.getUniformLocation(PP, "uMVP"),
      uScale: gl.getUniformLocation(PP, "uScale"),
      uId: gl.getUniformLocation(PP, "uId")
    };
    var wLoc = {
      aPos: gl.getAttribLocation(PW, "aPos"),
      uMVP: gl.getUniformLocation(PW, "uMVP"),
      uCenter: gl.getUniformLocation(PW, "uCenter"),
      uSize: gl.getUniformLocation(PW, "uSize"),
      uScale: gl.getUniformLocation(PW, "uScale"),
      uColor: gl.getUniformLocation(PW, "uColor")
    };
    var boxBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, boxBuf);
    gl.bufferData(gl.ARRAY_BUFFER, UNIT_BOX, gl.STATIC_DRAW);
    var boxMin = null, boxMax = null;

    var bufs = [];       // 每个零件：{pos, nrm, idx, count, color}
    var center = [0, 0, 0], radius = 1;
    var rotX = -0.5, rotY = 0.6, zoom = 1;
    var fbo = null, fboTex = null, fboRtt = null, fboW = 0, fboH = 0;

    /* ── 矩阵工具 ── */
    function mul(a, b) {
      var o = new Float32Array(16);
      for (var i = 0; i < 4; i++) for (var j = 0; j < 4; j++) {
        var v = 0; for (var n = 0; n < 4; n++) v += a[n * 4 + j] * b[i * 4 + n];
        o[i * 4 + j] = v;
      }
      return o;
    }
    function persp(fovy, asp, zn, zf) {
      var f = 1 / Math.tan(fovy / 2), o = new Float32Array(16);
      o[0] = f / asp; o[5] = f; o[10] = (zf + zn) / (zn - zf); o[11] = -1;
      o[14] = 2 * zf * zn / (zn - zf);
      return o;
    }
    function rotMat(rx, ry) {
      var cx = Math.cos(rx), sx = Math.sin(rx), cy = Math.cos(ry), sy = Math.sin(ry);
      var o = new Float32Array(16);
      o[0] = cy; o[2] = -sy;
      o[4] = sx * sy; o[5] = cx; o[6] = sx * cy;
      o[1] = 0;
      o[8] = cx * sy; o[9] = -sx; o[10] = cx * cy;
      o[15] = 1;
      return o;
    }
    function rotMat3(m) {
      return new Float32Array([m[0], m[1], m[2], m[4], m[5], m[6], m[8], m[9], m[10]]);
    }
    function mvp() {
      var R = rotMat(rotX, rotY);
      var dist = 2.2 / zoom;
      var view = new Float32Array(16);
      view[0] = 1; view[5] = 1; view[10] = 1; view[14] = -dist; view[15] = 1;
      var canvas = gl.canvas;
      var asp = (canvas.width || 1) / (canvas.height || 1);
      return { m: mul(persp(Math.PI / 4, asp, 0.05, 60), mul(view, R)), R: rotMat3(R) };
    }

    /* 先算整体包围盒 → 平移顶点到原点 → 再上传。
       顺序不能反：一旦先 bufferData，之后改数组不会同步到 GPU。 */
    function upload(list) {
      for (var i = 0; i < bufs.length; i++) {
        gl.deleteBuffer(bufs[i].pos); gl.deleteBuffer(bufs[i].nrm); gl.deleteBuffer(bufs[i].idx);
      }
      bufs = [];
      var mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
      var p, c, v;
      for (p = 0; p < list.length; p++) {
        var pa = list[p].pos;
        for (v = 0; v < pa.length; v += 3) for (c = 0; c < 3; c++) {
          var x = pa[v + c]; if (x < mn[c]) mn[c] = x; if (x > mx[c]) mx[c] = x;
        }
      }
      if (!isFinite(mn[0])) { mn = [0, 0, 0]; mx = [1, 1, 1]; }
      center = [(mn[0] + mx[0]) / 2, (mn[1] + mx[1]) / 2, (mn[2] + mx[2]) / 2];
      /* 用最大边长（不是半边长）做归一化基准，否则模型会占满整个视野 */
      var dmax = Math.max(mx[0] - mn[0], mx[1] - mn[1], mx[2] - mn[2]);
      radius = dmax > 0 ? dmax : 1;

      for (p = 0; p < list.length; p++) {
        var g = list[p];
        var pos = new Float32Array(g.pos.length);
        for (v = 0; v < g.pos.length; v += 3) {
          pos[v]     = g.pos[v]     - center[0];
          pos[v + 1] = g.pos[v + 1] - center[1];
          pos[v + 2] = g.pos[v + 2] - center[2];
        }
        var nrm = new Float32Array(g.nrm);
        var idx = new IDX(g.idx.length);
        for (v = 0; v < g.idx.length; v++) idx[v] = g.idx[v];
        var bp = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, bp); gl.bufferData(gl.ARRAY_BUFFER, pos, gl.STATIC_DRAW);
        var bn = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, bn); gl.bufferData(gl.ARRAY_BUFFER, nrm, gl.STATIC_DRAW);
        var bi = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, bi); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);
        bufs.push({ pos: bp, nrm: bn, idx: bi, count: idx.length, color: g.color });
      }
    }

    function resize() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      var w = Math.max(1, Math.round(canvas.clientWidth * dpr));
      var h = Math.max(1, Math.round(canvas.clientHeight * dpr));
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    }

    function drawTo(target, pick) {
      resize();
      var m = mvp();
      if (pick) {
        if (!fbo) { fbo = gl.createFramebuffer(); fboTex = gl.createTexture(); fboRtt = gl.createRenderbuffer(); }
        if (fboW !== canvas.width || fboH !== canvas.height) {
          gl.bindTexture(gl.TEXTURE_2D, fboTex);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, canvas.width, canvas.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
          gl.bindRenderbuffer(gl.RENDERBUFFER, fboRtt);
          gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, canvas.width, canvas.height);
          gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
          gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, fboTex, 0);
          gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, fboRtt);
          fboW = canvas.width; fboH = canvas.height;
        }
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      } else {
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      }
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.enable(gl.DEPTH_TEST);
      gl.clearColor(pick ? 0 : bg[0], pick ? 0 : bg[1], pick ? 0 : bg[2], 1);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

      var P0 = pick ? PP : P;
      gl.useProgram(P0);
      var sc = 1 / radius;
      gl.uniformMatrix4fv(pick ? pLoc.uMVP : loc.uMVP, false, m.m);
      gl.uniform1f(pick ? pLoc.uScale : loc.uScale, sc);
      if (!pick) gl.uniformMatrix3fv(loc.uRot, false, m.R);

      for (var i = 0; i < bufs.length; i++) {
        var b = bufs[i];
        gl.bindBuffer(gl.ARRAY_BUFFER, b.pos);
        gl.enableVertexAttribArray(pick ? pLoc.aPos : loc.aPos);
        gl.vertexAttribPointer(pick ? pLoc.aPos : loc.aPos, 3, gl.FLOAT, false, 0, 0);
        if (!pick) {
          gl.bindBuffer(gl.ARRAY_BUFFER, b.nrm);
          gl.enableVertexAttribArray(loc.aNrm);
          gl.vertexAttribPointer(loc.aNrm, 3, gl.FLOAT, false, 0, 0);
          gl.uniform3fv(loc.uColor, b.color);
          gl.uniform1f(loc.uDim, (st.sel >= 0 && st.sel !== i) ? 0.45 : 1.0);
        } else {
          var id = i + 1;
          gl.uniform3f(pLoc.uId, (id & 255) / 255, ((id >> 8) & 255) / 255, 0);
        }
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, b.idx);
        gl.drawElements(gl.TRIANGLES, b.count, IDX_GL, 0);
      }

      /* 选中零件的包围盒线框（拾取用的那趟不画，免得干扰 id 颜色） */
      if (!pick && boxMin && boxMax) {
        gl.useProgram(PW);
        gl.uniformMatrix4fv(wLoc.uMVP, false, m.m);
        gl.uniform1f(wLoc.uScale, sc);
        gl.uniform3f(wLoc.uCenter,
          (boxMin[0] + boxMax[0]) / 2 - center[0],
          (boxMin[1] + boxMax[1]) / 2 - center[1],
          (boxMin[2] + boxMax[2]) / 2 - center[2]);
        /* 略微外扩，避免与零件表面重叠时被 z-fighting 吃掉 */
        gl.uniform3f(wLoc.uSize,
          Math.max(boxMax[0] - boxMin[0], 1e-3) * 1.004,
          Math.max(boxMax[1] - boxMin[1], 1e-3) * 1.004,
          Math.max(boxMax[2] - boxMin[2], 1e-3) * 1.004);
        gl.uniform3f(wLoc.uColor, 0.94, 0.44, 0.09);
        gl.bindBuffer(gl.ARRAY_BUFFER, boxBuf);
        gl.enableVertexAttribArray(wLoc.aPos);
        gl.vertexAttribPointer(wLoc.aPos, 3, gl.FLOAT, false, 0, 0);
        gl.drawArrays(gl.LINES, 0, 24);
      }
    }

    var bg = [0.96, 0.97, 0.99];
    function setBg(c) { bg = c; }
    function setRot(rx, ry) { rotX = rx; rotY = ry; }
    function setZoom(z) { zoom = z; }

    function pickAt(cx, cy) {
      drawTo(null, true);
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      var px = new Uint8Array(4);
      gl.readPixels(Math.round(cx * dpr), canvas.height - Math.round(cy * dpr), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      var id = px[0] + (px[1] << 8);
      return id > 0 ? id - 1 : -1;
    }

    return {
      upload: upload, draw: function () { drawTo(null, false); },
      pick: pickAt, mvp: mvp, setBg: setBg,
      /* 传 null 取消线框；坐标是模型的原始坐标系（与 parts 的 min/max 一致） */
      setBox: function (mn, mx) { boxMin = mn; boxMax = mx; },
      rot: function () { return [rotX, rotY]; }, setRot: setRot, setZoom: setZoom,
      getZoom: function () { return zoom; },
      dispose: function () { gl.getExtension("WEBGL_lose_context") && gl.getExtension("WEBGL_lose_context").loseContext(); }
    };
  }

  /* 把解析出来的 mesh 转成查看器需要的扁平三角形数组 */
  function toGeom(meshes, parts) {
    var out = [];
    for (var i = 0; i < meshes.length; i++) {
      var m = meshes[i];
      var pos = m.attributes.position.array;
      var nrm = m.attributes.normal ? m.attributes.normal.array : null;
      var idx = m.index.array;
      var P2 = [], N = [], I = [];
      for (var v = 0; v < pos.length; v++) P2.push(pos[v]);
      if (nrm && nrm.length === pos.length) for (var n = 0; n < nrm.length; n++) N.push(nrm[n]);
      else for (var q = 0; q < pos.length / 3; q++) { N.push(0, 1, 0); }
      for (var t = 0; t < idx.length; t++) I.push(idx[t]);
      out.push({ pos: P2, nrm: N, idx: I, color: partColor(i) });
    }
    return out;
  }

  /* ══════════════ ② Worker 解析 ══════════════ */
  var worker = null, workerWaiting = null, workerBusy = false;

  function ensureWorker(onStatus) {
    if (worker) return Promise.resolve(worker);
    if (workerWaiting) return workerWaiting;
    workerWaiting = new Promise(function (resolve, reject) {
      if (onStatus) onStatus("正在加载解析引擎（约 3 MB，仅首次需要）…");
      var w = new Worker("vendor/occt/occt-import-js-worker.js");
      var timer = setTimeout(function () {
        reject(new Error("解析引擎加载超时，请检查网络后重试"));
      }, 90000);
      w.onmessage = function (e) {
        clearTimeout(timer);
        if (workerBusy && workerWaiting2) { var r = workerWaiting2; workerWaiting2 = null; workerBusy = false; r(e.data); }
      };
      w.onerror = function (e) {
        clearTimeout(timer);
        reject(new Error("解析引擎加载失败：" + (e.message || "未知错误")));
      };
      worker = w;
      // Worker 脚本与 wasm 是懒加载的：给它一点时间，随后视为就绪
      setTimeout(function () { resolve(w); }, 300);
    });
    return workerWaiting;
  }
  var workerWaiting2 = null;

  function parseBuffer(buf, onStatus) {
    return ensureWorker(onStatus).then(function (w) {
      return new Promise(function (resolve, reject) {
        var to = setTimeout(function () { reject(new Error("解析超时（超过 3 分钟），文件可能过大")); }, 180000);
        workerWaiting2 = function (data) { clearTimeout(to); resolve(data); };
        workerBusy = true;
        try { w.postMessage({ format: "step", buffer: buf, params: null }, [buf.buffer]); }
        catch (err) { w.postMessage({ format: "step", buffer: buf, params: null }); }
      });
    });
  }

  /* ══════════════ ③ 界面 ══════════════ */
  function uploadHTML() {
    return ''
      + '<div class="st-drop" id="stDrop" role="button" tabindex="0" aria-label="选择或拖入 STEP 文件">'
      + '  <div class="st-ic"><svg class="ic-lg" aria-hidden="true"><use href="#i-upload-cloud"/></svg></div>'
      + '  <h3>拖入 STEP 文件，或点击选择</h3>'
      + '  <p>支持 .step / .stp（以及 .igs / .iges / .brep）　·　单个文件建议 50 MB 以内</p>'
      + '  <div class="st-privacy">解析全部在你自己的浏览器里完成，文件不会上传到任何服务器。</div>'
      + '  <input type="file" id="stFile" accept=".step,.stp,.STEP,.STP,.igs,.iges,.brep" style="display:none">'
      + '</div>'
      + '<div id="stStatus" class="st-privacy" style="text-align:center; margin-top:14px;"></div>';
  }

  function busyHTML(msg) {
    return '<div class="st-drop" style="cursor:default">'
      + '<div class="st-ic"><svg class="ic-lg" aria-hidden="true"><use href="#i-cube"/></svg></div>'
      + '<h3>' + esc(msg) + '</h3>'
      + '<p>大装配体可能需要十几秒，请稍候…</p></div>';
  }

  function resultHTML() {
    var e = S.estimate(st.parts, st.params);
    var h = [];

    /* 顶栏：文件信息 + 重新选择 */
    h.push('<div class="st-bar">'
      + '<div class="st-file"><svg class="ic" aria-hidden="true"><use href="#i-file-text"/></svg>'
      + '<b>' + esc(st.info.file) + '</b><span>' + esc(st.info.size) + '</span></div>'
      + '<button class="pill" id="stAgain"><svg class="ic" aria-hidden="true"><use href="#i-refresh"/></svg>换一个文件</button>'
      + '</div>');

    /* 左右分栏 */
    h.push('<div class="st-grid">');

    /* 左：3D + 概览 */
    h.push('<div>');
    h.push('<div class="st-stage" id="stStage"><canvas id="stCanvas"></canvas>'
      + '<div class="st-btns">'
      + '<button class="st-mini" id="stReset" title="复位视角" aria-label="复位视角"><svg class="ic" aria-hidden="true"><use href="#i-refresh"/></svg></button>'
      + '</div>'
      + '<div class="st-hint" id="stHint">拖拽旋转 · 滚轮缩放 · 点击零件查看该零件包围盒</div></div>');
    h.push('<div class="st-meta">'
      + '<div><span>零件数</span><b>' + e.n + ' 个</b></div>'
      + '<div><span>总体积</span><b>' + S.vol(e.volSum) + '</b></div>'
      + '<div><span>总重量</span><b>' + S.grams(e.weighted) + '</b></div>'
      + '<div><span>总表面积</span><b>' + S.area(e.areaSum) + '</b></div>'
      + '<div><span>三角形</span><b>' + st.info.tris + '</b></div>'
      + '<div><span>包围盒 (mm)</span><b>' + st.info.bbox + '</b></div>'
      + '</div>');
    h.push('</div>');

    /* 右：装配树 */
    h.push('<div>');
    h.push('<div class="st-tree" id="stTree">' + treeHTML() + '</div>');
    h.push('</div>');
    h.push('</div>');

    /* 成本区 */
    h.push('<div class="st-sec"><h3><svg class="ic" aria-hidden="true"><use href="#i-coins"/></svg>成本估算</h3>');
    h.push('<div class="st-params">' + paramsHTML() + '</div>');
    h.push('<div id="stCost">' + costHTML() + '</div>');
    h.push('<div id="stSanity">' + sanityHTML() + '</div>');
    h.push('</div>');

    /* 模具方案 */
    h.push('<div class="st-sec"><h3><svg class="ic" aria-hidden="true"><use href="#i-wrench"/></svg>模具方案</h3>');
    h.push('<div class="st-privacy" style="margin:0 0 10px">每个零件默认独立开模；小件可以在装配树里展开「开模设置」，把多个零件勾选成共模拼进同一套模具（可多选）。滑块 / 行位、斜顶、热流道都会直接抬高模具报价，并相应拉长成型周期。</div>');
    h.push('<div id="stMolds">' + moldsHTML() + '</div>');
    h.push('</div>');

    /* 报价分析 */
    h.push('<div class="st-sec"><h3><svg class="ic" aria-hidden="true"><use href="#i-trending-up"/></svg>报价分析</h3>');
    h.push('<div id="stTiers">' + tiersHTML() + '</div>');
    h.push('</div>');

    /* 导出区 */
    h.push('<div class="st-sec"><h3><svg class="ic" aria-hidden="true"><use href="#i-cpu"/></svg>交给 AI 深入分析</h3>'
      + '<div class="st-privacy" style="margin:0 0 10px">本地已经算准了体积、重量与成本；把下面这段提示词连同数据一起发给 AI，让它帮你分析降本方向与工艺风险。</div>'
      + '<div class="st-tools">'
      + '<button class="pill" id="stPrompt"><svg class="ic" aria-hidden="true"><use href="#i-file-text"/></svg>生成 AI 提示词</button>'
      + '<button class="pill" id="stCsv"><svg class="ic" aria-hidden="true"><use href="#i-download"/></svg>导出 CSV（Excel）</button>'
      + '</div><div id="stPromptBox"></div></div>');

    return h.join("");
  }

  function treeHTML() {
    var rows = [], i;
    rows.push('<div class="st-tr head"><div class="st-nm"><span>装配结构 / 零件（点击可展开开模设置）</span></div>'
      + '<div class="st-b">包围盒 mm</div><div class="st-v">体积</div><div class="st-w">重量</div></div>');
    for (i = 0; i < st.tree.length; i++) {
      var t = st.tree[i];
      if (!t.isPart) {
        rows.push('<div class="st-tr' + (t.depth ? ' off' : '') + '">'
          + '<div class="st-nm" style="padding-left:' + (t.depth * 12) + 'px">'
          + '<svg class="ic" aria-hidden="true"><use href="#i-layers"/></svg><span>' + esc(t.name) + '</span></div>'
          + '<div class="st-b"></div><div class="st-v"></div><div class="st-w"></div></div>');
      }
    }
    for (i = 0; i < st.parts.length; i++) {
      rows.push(partRowHTML(i));
      if (st.open[i]) rows.push(cfgRowHTML(i));
    }
    return rows.join("");
  }

  function partRowHTML(i) {
    var p = st.parts[i], m = S.matById(p.mat);
    var w = m.d > 0 ? (p.vol / 1000) * m.d : 0;
    var c = partColor(i);
    var opts = S.MATS.map(function (mm) {
      return '<option value="' + mm.id + '"' + (mm.id === p.mat ? " selected" : "") + '>' + esc(mm.n) + '</option>';
    }).join("");
    return '<div class="st-tr part' + (p.on ? "" : " off") + (st.sel === i ? " on" : "") + '" data-i="' + i + '">'
      + '<div class="st-nm" style="padding-left:' + ((p.depth + 1) * 12) + 'px">'
      + '<i style="background:rgb(' + Math.round(c[0] * 255) + ',' + Math.round(c[1] * 255) + ',' + Math.round(c[2] * 255) + ')"></i>'
      + '<span title="' + esc(p.path) + '">' + esc(p.name) + '</span></div>'
      + '<div class="st-b" title="该零件的自身包围盒">'
      + p.dim.map(function (d) { return S.fix(d, 1); }).join("×") + '</div>'
      + '<div class="st-v">' + S.vol(p.vol) + '</div>'
      + '<div class="st-w">' + S.grams(w) + '</div>'
      + '<select class="st-sel" data-mat="' + i + '">' + opts + '</select>'
      + '<button class="st-mini" data-toggle="' + i + '" title="' + (p.on ? "不计入成本" : "计入成本") + '" aria-label="切换是否计入成本" style="width:24px;height:24px">'
      + '<svg class="ic" aria-hidden="true"><use href="#' + (p.on ? "i-check-square" : "i-x-circle") + '"/></svg></button>'
      + '</div>';
  }

  function paramsHTML() {
    var out = [];
    for (var key in S.PARAMS) if (S.PARAMS.hasOwnProperty(key)) {
      out.push('<div><label for="stp-' + key + '">' + esc(S.PARAMS[key].l) + '</label>'
        + '<input id="stp-' + key + '" data-p="' + key + '" type="number" step="any" value="' + st.params[key] + '"></div>');
    }
    return out.join("");
  }

  /* 下拉选项 */
  function optList(list, cur) {
    return list.map(function (x) {
      return '<option value="' + x.id + '"' + (x.id === cur ? " selected" : "") + '>' + esc(x.n) + '</option>';
    }).join("");
  }
  /* 共模多选：与本件拼在同一套模具里的零件可以勾多个 ——
     小件拼模（一模具装好几件）是常态，所以这里是「分组」不是「两两配对」。
       勾上  = 并入本件所在的模具（若该零件本就在别的模具里，则两套模具合并）
       取消  = 该零件脱离本套模具、改为独立开模
     标签上的「模 N」表示它当前还在第 N 套模具里，点一下就会并过来。 */
  function sharePickerHTML(i) {
    var mine = S.moldMembers(st.parts, i);
    var e = S.estimate(st.parts, st.params);
    var moldNo = {}, moldSize = {}, j;
    e.molds.forEach(function (m, k) {
      m.members.forEach(function (x) { moldNo[x] = k + 1; moldSize[x] = m.members.length; });
    });
    var o = ['<div class="st-share">'];
    o.push('<div class="st-share-h"><span>共模零件</span>'
      + '<em>可多选；勾上的零件与本件拼在同一套模具里</em>'
      + '<b>本套模具 ' + mine.length + ' 件</b>'
      + (mine.length > 1 ? '<button type="button" class="st-share-clr" data-shareclear="' + i + '">本件改为独立开模</button>' : '')
      + '</div>');
    var others = 0;
    for (j = 0; j < st.parts.length; j++) if (j !== i && st.parts[j].on) others++;
    if (!others) {
      o.push('<div class="st-share-none">没有其他零件可以合并</div>');
    } else {
      o.push('<div class="st-share-list">');
      for (j = 0; j < st.parts.length; j++) {
        if (j === i || !st.parts[j].on) continue;
        var on = mine.indexOf(j) >= 0;
        o.push('<button type="button" class="st-share-i' + (on ? " on" : "") + '"'
          + ' data-share="' + i + '|' + j + '"'
          + ' title="' + esc(st.parts[j].path || st.parts[j].name) + '">'
          + esc(st.parts[j].name)
          + (on ? '<i class="x">×</i>' : (moldSize[j] > 1 ? '<i>模 ' + moldNo[j] + '</i>' : ''))
          + '</button>');
      }
      o.push('</div>');
    }
    o.push('</div>');
    return o.join('');
  }

  /* ══════ 成本卡 ══════ */
  function costHTML() {
    var e = S.estimate(st.parts, st.params);
    var L = [];
    L.push('<div class="st-cost">');
    L.push('<div class="st-line"><span>材料费<span class="st-sub">' + e.n + ' 个零件 · 含损耗 ' + st.params.loss + '% · 水口料按回收折价抵扣</span></span><b>' + S.money(e.mat) + '</b></div>');
    L.push('<div class="st-line"><span>加工费<span class="st-sub">按各零件的机台吨位与模穴数分别推算</span></span><b>' + S.money(e.mach) + '</b></div>');
    L.push('<div class="st-line"><span>良率损失<span class="st-sub">良率 ' + st.params.yield + '%</span></span><b>' + S.money(e.yldLoss) + '</b></div>');
    L.push('<div class="st-line"><span>二次加工 / 表面处理<span class="st-sub">在零件上逐件设置</span></span><b>' + S.money(e.post) + '</b></div>');
    L.push('<div class="st-line"><span>包装</span><b>' + S.money(e.pack) + '</b></div>');
    L.push('<div class="st-line"><span>组装</span><b>' + S.money(e.asm) + '</b></div>');
    L.push('<div class="st-line"><span>模具摊销<span class="st-sub">模具总投入 ' + S.fix(e.moldTotal, 0) + ' 元 ÷ ' + S.fix(e.qty, 0) + ' 件</span></span><b>' + S.money(e.amort) + '</b></div>');
    L.push('<div class="st-total"><span>单件估算成本</span><span class="st-num">' + S.money(e.total) + '</span></div>');
    L.push('<div class="st-privacy" style="margin-top:10px">材料密度与单价、模具结构单价均为行业参考值，请按实际供应商报价调整。</div>');
    L.push('</div>');
    return L.join("");
  }

  /* ══════ 零件：开模设置面板 ══════ */
  function cfgRowHTML(i) {
    var p = st.parts[i], t = p.tool;
    var g = [];
    g.push('<div class="st-cfg" data-i="' + i + '">');
    g.push('<div class="st-cfg-grid">');
    g.push('<label>模穴数<input type="number" min="1" max="64" step="1" data-c="cav" data-i="' + i + '" value="' + (t.cav || 1) + '"></label>');
    g.push('<label>滑块 / 行位<input type="number" min="0" max="20" step="1" data-c="slides" data-i="' + i + '" value="' + (t.slides || 0) + '"></label>');
    g.push('<label>斜顶<input type="number" min="0" max="20" step="1" data-c="lifters" data-i="' + i + '" value="' + (t.lifters || 0) + '"></label>');
    g.push('<label>浇口形式<select data-c="runner" data-i="' + i + '">' + optList(S.RUNNERS, t.runner) + '</select></label>');
    g.push('<label>钢材<select data-c="steel" data-i="' + i + '">' + optList(S.STEELS, t.steel) + '</select></label>');
    g.push('<label>精度<select data-c="precision" data-i="' + i + '">' + optList(S.PRECISIONS, t.precision) + '</select></label>');
    g.push('<label>表面要求<select data-c="finish" data-i="' + i + '">' + optList(S.FINISHES, t.finish) + '</select></label>');
    g.push('<label>二次加工 (元/件)<input type="number" min="0" step="any" data-c="post" data-i="' + i + '" value="' + (t.post || 0) + '"></label>');
    g.push('<label>模具厂报价 (元，留空=按估算)<input type="number" min="0" step="any" data-c="quote" data-i="' + i + '" value="' + (t.quote === null || t.quote === undefined ? "" : t.quote) + '"></label>');
    g.push('</div>');
    g.push(sharePickerHTML(i));
    g.push('<div class="st-cfg-note">' + cfgNoteHTML(i) + '</div>');
    g.push('</div>');
    return g.join("");
  }

  /* 该零件当前的推算结论（改任一配置项后只刷新这一行） */
  function cfgNoteHTML(i) {
    var e = S.estimate(st.parts, st.params);
    var r = null;
    for (var k = 0; k < e.perPart.length; k++) if (e.perPart[k].i === i) r = e.perPart[k];
    if (!r) return "";
    return '推算：投影 ' + S.fix(r.area, 1) + ' cm² → 锁模力 ' + S.fix(r.clamp, 1) + ' t → 机台 '
      + S.fix(r.tonnage, 0) + ' t（' + r.rate + ' 元/h）｜周期 ' + S.fix(r.cycle, 1) + ' s｜' + r.cav + ' 穴'
      + '｜材料 ' + S.money(r.mat) + '　加工 ' + S.money(r.mach) + '　模具摊销 ' + S.money(r.amort)
      + (r.mold ? '｜所属：模 ' + (e.molds.indexOf(r.mold) + 1) + '（' + S.money(r.mold.total) + '）' : '');
  }

  /* ══════ 模具投入清单 ══════ */
  function moldsHTML() {
    var e = S.estimate(st.parts, st.params);
    if (!e.molds.length) return '<div class="st-privacy">暂无参与计价的零件</div>';
    var L = ['<div class="st-molds">'];
    for (var mi = 0; mi < e.molds.length; mi++) {
      var m = e.molds[mi];
      L.push('<div class="st-mold' + (m.members.length > 1 ? " multi" : "") + (m.quoted ? " quoted" : "") + '">');
      L.push('<div class="st-mold-h"><b>模 ' + (mi + 1) + '</b>'
        + '<span>' + m.members.map(function (x) { return esc(st.parts[x].name); }).join('、')
        + '（' + (m.members.length > 1 ? '共模 ' + m.members.length + ' 件' : '单件模')
        + (m.cfg.cav > 1 ? ' · ' + m.cfg.cav + ' 穴' : '') + '）</span>'
        + '<em>' + S.money(m.total) + '</em></div>');
      L.push('<div class="st-mold-b">'
        + '<span>基准件 ' + esc(m.main.name) + '　投影 ' + S.fix(m.area, 0) + ' cm²</span>'
        + '<span>' + S.fix(m.base, 0) + ' × 穴数 ' + S.fix(m.kCav, 2) + ' × 钢材 ' + S.fix(m.steel.k, 2)
        + ' × 精度 ' + S.fix(m.prec.k, 2) + ' × 表面 ' + S.fix(m.fin.k, 2) + ' = ' + S.fix(m.core, 0) + ' 元</span>'
        + (m.slideCost ? '<span>滑块 / 行位 +' + S.fix(m.slideCost, 0) + ' 元</span>' : '')
        + (m.liftCost ? '<span>斜顶 +' + S.fix(m.liftCost, 0) + ' 元</span>' : '')
        + (m.runCost ? '<span>浇口系统 +' + S.fix(m.runCost, 0) + ' 元</span>' : '')
        + '<span>' + (m.quoted ? '模具厂实际报价' : '系统估算') + '</span>'
        + '</div>');
      L.push('</div>');
    }
    L.push('</div>');
    L.push('<div class="st-privacy">模具总投入 <b>' + S.money(e.moldTotal) + '</b>　共 ' + e.molds.length + ' 套　'
      + '（明细可在上方装配树里逐件调整；模具厂给了实际报价后填进去即可覆盖估算）</div>');
    return L.join("");
  }

  /* ══════ 报价分析：阶梯价 + 回本点 ══════ */
  function tiersHTML() {
    var e = S.estimate(st.parts, st.params);
    var tl = S.tiers(st.parts, st.params, [10000, 50000, 100000, 300000, 500000]);
    var cur = +st.params.qty;
    var L = ['<div class="st-tiers">'];
    L.push('<div class="st-tier head"><span>订单量</span><b>单件成本</b><span>其中模具摊销</span></div>');
    for (var i = 0; i < tl.length; i++) {
      var on = Math.abs(tl[i].qty - cur) < 1;
      L.push('<div class="st-tier' + (on ? " on" : "") + '"><span>' + tl[i].qty.toLocaleString() + ' 件'
        + (on ? '（当前）' : '') + '</span><b>' + S.money(tl[i].unit) + '</b>'
        + '<span>' + S.fix(tl[i].amort, 3) + ' 元</span></div>');
    }
    L.push('</div>');
    var be = S.breakEven(e, st.params.target);
    if (be && be.ok) {
      L.push('<div class="st-note">按目标售价 ' + S.money(st.params.target) + '：单件毛利 ' + S.money(be.gross)
        + '，模具投入 <b>' + S.money(e.moldTotal) + '</b> 需要 <b>' + be.qty.toLocaleString() + ' 件</b>才能收回</div>');
    } else if (be && !be.ok) {
      L.push('<div class="st-note warn">目标售价 ' + S.money(st.params.target) + ' 低于不含模具摊销的单件成本 '
        + S.money(be.variable) + '，模具投入永远收不回来</div>');
    } else {
      L.push('<div class="st-note">在下面「目标售价」里填一个价格，就能算出模具投入需要多少件收回</div>');
    }
    return L.join("");
  }

  /* ══════ 合理性提示 ══════ */
  function sanityHTML() {
    var e = S.estimate(st.parts, st.params);
    var w = S.sanity(st.parts, e);
    if (!w.length) return "";
    return '<div class="st-note warn" style="margin-top:12px">'
      + '<b>超出常规注塑范围，结果仅作量级参考：</b><br>'
      + w.map(function (x) { return "· " + esc(x); }).join("<br>") + '</div>';
  }

  /* ══════════════ 渲染与事件 ══════════════ */
  var viewer = null;

  function mount() {
    var body = $("stepBody");
    if (!body) return;
    if (st.busy) { body.innerHTML = busyHTML(st.busyMsg || "正在解析…"); return; }
    if (!st.parsed) {
      body.innerHTML = uploadHTML() + (st.err
        ? '<div class="st-cost" style="margin-top:14px; border-color:var(--danger-bd); background:var(--danger-bg)">'
          + '<div style="font-size:var(--fs-sm); color:var(--danger); display:flex; gap:var(--sp-4); align-items:flex-start">'
          + '<svg class="ic" aria-hidden="true"><use href="#i-alert"/></svg><span>' + esc(st.err) + '</span></div></div>'
        : "");
      bindUpload();
      return;
    }
    body.innerHTML = resultHTML();
    bindResult();
    mountViewer();
  }

  function mountViewer() {
    var cv = $("stCanvas");
    if (!cv) return;
    viewer = Viewer(cv);
    if (!viewer) {
      $("stStage").innerHTML = '<div style="padding:40px 16px;text-align:center;color:var(--tx-faint);font-size:var(--fs-xs)">'
        + '当前浏览器不支持 WebGL，3D 预览不可用（其余功能不受影响）</div>';
      return;
    }
    viewer.setBg([0.96, 0.97, 0.99]);
    if (document.documentElement.getAttribute("data-theme") === "dark") viewer.setBg([0.08, 0.11, 0.17]);
    viewer.upload(toGeom(st.meshes, st.parts));
    viewer.draw();

    var stage = $("stStage");
    var dragging = false, lx = 0, ly = 0, moved = 0;
    function down(x, y) { dragging = true; lx = x; ly = y; moved = 0; stage.classList.add("drag"); }
    function move(x, y) {
      if (!dragging) return;
      var r = viewer.rot();
      var ry = r[1] + (x - lx) * 0.01;
      var rx = Math.max(-1.5, Math.min(1.5, r[0] + (y - ly) * 0.01));
      viewer.setRot(rx, ry);
      moved += Math.abs(x - lx) + Math.abs(y - ly);
      lx = x; ly = y;
      viewer.draw();
    }
    function up(x, y) {
      if (!dragging) return;
      dragging = false; stage.classList.remove("drag");
      if (moved < 4) {
        var r = cv.getBoundingClientRect();
        var hit = viewer.pick(x - r.left, y - r.top);
        st.sel = (hit >= 0 && hit < st.parts.length) ? hit : -1;
        updateSelection();
        var tree = $("stTree");
        if (tree) {
          tree.innerHTML = treeHTML();
          var row = tree.querySelector('.st-tr.part[data-i="' + st.sel + '"]');
          if (row && row.scrollIntoView) { try { row.scrollIntoView({ block: "nearest" }); } catch (e2) {} }
        }
      }
    }
    cv.addEventListener("mousedown", function (e) { down(e.clientX, e.clientY); e.preventDefault(); });
    window.addEventListener("mousemove", function (e) { if (dragging) move(e.clientX, e.clientY); });
    window.addEventListener("mouseup", function (e) { if (dragging) up(e.clientX, e.clientY); });
    cv.addEventListener("touchstart", function (e) {
      if (e.touches.length === 1) { down(e.touches[0].clientX, e.touches[0].clientY); }
    }, { passive: true });
    cv.addEventListener("touchmove", function (e) {
      if (e.touches.length === 1 && dragging) { move(e.touches[0].clientX, e.touches[0].clientY); e.preventDefault(); }
    }, { passive: false });
    cv.addEventListener("touchend", function (e) {
      var t = e.changedTouches[0]; if (t) up(t.clientX, t.clientY);
    });
    cv.addEventListener("wheel", function (e) {
      e.preventDefault();
      var z = viewer.getZoom() * (e.deltaY > 0 ? 0.92 : 1.08);
      viewer.setZoom(Math.max(0.3, Math.min(6, z)));
      viewer.draw();
    }, { passive: false });

    var rb = $("stReset");
    if (rb) rb.onclick = function () { viewer.setRot(-0.5, 0.6); viewer.setZoom(1); viewer.draw(); };
  }

  function bindUpload() {
    var drop = $("stDrop"), input = $("stFile");
    if (!drop) return;
    var open = function () { input.click(); };
    drop.onclick = open;
    drop.onkeydown = function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } };
    input.onchange = function () { if (input.files && input.files[0]) handle(input.files[0]); };
    ["dragenter", "dragover"].forEach(function (ev) {
      drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add("over"); });
    });
    ["dragleave", "drop"].forEach(function (ev) {
      drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove("over"); });
    });
    drop.addEventListener("drop", function (e) {
      var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (f) handle(f);
    });
  }

  function handle(file) {
    var mb = file.size / 1024 / 1024;
    if (mb > 120) { st.err = "文件超过 120 MB，浏览器端解析可能失败，建议先在 CAD 里精简或分拆装配体"; }
    st.busy = true; st.busyMsg = "正在读取 " + file.name + " …";
    mount();
    file.arrayBuffer().then(function (ab) {
      st.busyMsg = "正在解析几何（" + S.fix(mb, 1) + " MB）…";
      mount();
      return parseBuffer(new Uint8Array(ab), function (msg) { st.busyMsg = msg; mount(); });
    }).then(function (res) {
      st.busy = false;
      if (!res || !res.success) {
        st.err = "解析失败：文件可能不是有效的 STEP，或使用了不支持的高级实体";
        st.parsed = false; mount(); return;
      }
      var meshes = (res.meshes || []).map(function (m) {
        return { name: m.name, stats: S.meshStats(m) };
      });
      var flat = S.flatten(res.root, meshes);
      st.parts = flat.parts;
      st.tree = flat.tree;
      st.meshes = res.meshes;
      st.geom = meshes;
      var bb = [0, 0, 0], tris = 0;
      st.parts.forEach(function (p) {
        tris += p.tris;
        for (var c = 0; c < 3; c++) bb[c] = Math.max(bb[c], p.dim[c]);
      });
      st.info = {
        file: file.name,
        size: S.fix(mb, mb < 1 ? 2 : 1) + " MB",
        bbox: bb.map(function (x) { return S.fix(x, 0); }).join(" × "),
        tris: tris
      };
      st.parsed = true;
      mount();
    }).catch(function (err) {
      st.busy = false; st.parsed = false;
      st.err = err && err.message ? err.message : "解析出错";
      mount();
    });
  }

  function bindResult() {
    var again = $("stAgain");
    if (again) again.onclick = function () { st.parsed = false; st.parts = []; st.sel = -1; st.err = ""; mount(); };

    var tree = $("stTree");
    if (tree) {
      /* 材料下拉 */
      tree.addEventListener("change", function (e) {
        var sel = e.target.closest(".st-sel");
        if (sel) { st.parts[+sel.dataset.mat].mat = sel.value; refreshAll(); return; }
        var c = e.target.closest("[data-c]");
        if (c) applyCfg(c);
      });
      /* 开模设置里的数字输入 */
      tree.addEventListener("input", function (e) {
        var c = e.target.closest("[data-c]");
        if (c && e.target.tagName === "INPUT") applyCfg(c);
      });
      /* 点击：勾选 / 展开开模设置 */
      tree.addEventListener("click", function (e) {
        /* 共模多选标签 */
        var sh = e.target.closest("[data-share]");
        if (sh) {
          var ab = sh.dataset.share.split("|");
          S.toggleShare(st.parts, +ab[0], +ab[1]);
          refreshAll();
          return;
        }
        var cl = e.target.closest("[data-shareclear]");
        if (cl) { S.leaveMold(st.parts, +cl.dataset.shareclear); refreshAll(); return; }
        if (e.target.closest(".st-sel") || e.target.closest("[data-c]")) return;
        var tg = e.target.closest("[data-toggle]");
        if (tg) {
          var it = +tg.dataset.toggle;
          st.parts[it].on = !st.parts[it].on;
          refreshAll();
          return;
        }
        var row = e.target.closest(".st-tr.part");
        if (!row) return;
        var i = +row.dataset.i;
        if (st.open[i]) { delete st.open[i]; } else { st.open[i] = 1; }   // 再点一次收起
        st.sel = st.open[i] ? i : -1;
        refreshTree();
        updateSelection();
        refreshAll(true);
      });
    }

    var pp = document.querySelectorAll("[data-p]");
    Array.prototype.forEach.call(pp, function (inp) {
      inp.addEventListener("input", function () {
        var v = parseFloat(inp.value);
        if (isFinite(v)) { st.params[inp.dataset.p] = v; refreshAll(true); }
      });
    });

    var pb = $("stPrompt"), cb = $("stCsv");
    if (pb) pb.onclick = function () {
      var p = S.buildPrompt(st.info, st.parts, S.estimate(st.parts, st.params), st.params);
      $("stPromptBox").innerHTML = '<div class="st-tools" style="margin-bottom:10px">'
        + '<button class="pill" id="stCopyPrompt"><svg class="ic" aria-hidden="true"><use href="#i-clipboard"/></svg>复制提示词</button></div>'
        + '<div class="st-prompt">' + esc(p) + '</div>';
      $("stCopyPrompt").onclick = function () {
        copyText(p, $("stCopyPrompt"));
      };
    };
    if (cb) cb.onclick = function () {
      var csv = S.toCSV(st.info, st.parts, S.estimate(st.parts, st.params), st.params);
      var blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = String(st.info.file).replace(/\.[^.]+$/, "") + "-成本估算.csv";
      document.body.appendChild(a); a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    };
  }

  function copyText(txt, btn) {
    var done = function () {
      var old = btn.innerHTML;
      btn.innerHTML = '<svg class="ic" aria-hidden="true"><use href="#i-check-square"/></svg>已复制';
      setTimeout(function () { btn.innerHTML = old; }, 1600);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(txt).then(done).catch(fallback);
    } else fallback();
    function fallback() {
      var ta = document.createElement("textarea");
      ta.value = txt; ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); done(); } catch (e) {}
      ta.remove();
    }
  }

  /* 选中零件 → 3D 里画出它的包围盒线框，并在提示行显示尺寸 */
  function updateSelection() {
    var p = st.sel >= 0 ? st.parts[st.sel] : null;
    if (viewer) {
      viewer.setBox(p ? p.min : null, p ? p.max : null);
      viewer.draw();
    }
    var h = $("stHint");
    if (h) {
      h.textContent = p
        ? "已选：" + p.name
          + "　包围盒 " + p.dim.map(function (d) { return S.fix(d, 1); }).join(" × ")
          + " mm（最大 " + S.fix(Math.max(p.dim[0], p.dim[1], p.dim[2]), 1) + "）"
          + "　体积 " + S.vol(p.vol) + "　（再点空白处取消）"
        : "拖拽旋转 · 滚轮缩放 · 点击零件查看该零件包围盒";
    }
  }

  /* 只更新概览卡片 */
  function refreshMeta() {
    var meta = document.querySelector(".st-meta");
    if (meta) {
      var e = S.estimate(st.parts, st.params);
      meta.innerHTML = '<div><span>零件数</span><b>' + e.n + ' 个</b></div>'
        + '<div><span>总体积</span><b>' + S.vol(e.volSum) + '</b></div>'
        + '<div><span>总重量</span><b>' + S.grams(e.weighted) + '</b></div>'
        + '<div><span>总表面积</span><b>' + S.area(e.areaSum) + '</b></div>'
        + '<div><span>三角形</span><b>' + st.info.tris + '</b></div>'
        + '<div><span>包围盒 (mm)</span><b>' + st.info.bbox + '</b></div>';
    }
  }

  function refreshTree() {
    var t = $("stTree");
    if (t) t.innerHTML = treeHTML();
  }

  /* keepTree = true 时不重绘装配树，避免正在输入的输入框失焦 */
  function refreshAll(keepTree) {
    var c = $("stCost"); if (c) c.innerHTML = costHTML();
    var m = $("stMolds"); if (m) m.innerHTML = moldsHTML();
    var ti = $("stTiers"); if (ti) ti.innerHTML = tiersHTML();
    var sa = $("stSanity"); if (sa) sa.innerHTML = sanityHTML();
    refreshMeta();
    if (keepTree) {
      for (var k in st.open) if (st.open.hasOwnProperty(k)) updateCfgNote(+k);
    } else {
      refreshTree();
    }
  }

  function updateCfgNote(i) {
    var el = document.querySelector('.st-cfg[data-i="' + i + '"] .st-cfg-note');
    if (el) el.innerHTML = cfgNoteHTML(i);
  }

  /* 把开模设置里的一项写回零件并刷新 */
  function applyCfg(el) {
    var i = +el.dataset.i, k = el.dataset.c, v;
    if (k === "quote") {
      v = el.value === "" ? null : +el.value;
      if (v !== null && (!isFinite(v) || v < 0)) return;
    } else if (k === "cav" || k === "slides" || k === "lifters" || k === "post") {
      v = el.value === "" ? 0 : +el.value;
      if (!isFinite(v) || v < 0) return;
      if (k === "cav" && v < 1) v = 1;
    } else {
      v = el.value;
    }
    st.parts[i].tool[k] = v;
    refreshAll(true);
  }

  /* 主入口：由 app.js 的 renderAll 调用 */
  window.renderStep = function () {
    mount();
  };

  /* 主题切换时同步 3D 背景 */
  window.KB_STEP_THEME = function (dark) {
    if (viewer) { viewer.setBg(dark ? [0.08, 0.11, 0.17] : [0.96, 0.97, 0.99]); viewer.draw(); }
  };
})();
