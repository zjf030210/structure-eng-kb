/* ============================================================
 * kb-step.js —— STEP 成本评估：材料库 / 几何量 / 成本模型 / 导出
 *
 * 设计要点：
 *   · 成本口径与站内「塑料件成本估算」计算器完全一致，便于互相对照：
 *       材料费 = 重量(g) × 单价(元/kg) ÷ 1000 × (1 + 损耗%)
 *       加工费 = 机时费 × 成型周期 ÷ 3600 ÷ 模穴数
 *       单件成本 = (材料费 + 加工费) ÷ 良率 + 表面处理包装 + 模具摊销
 *   · 材料密度与单价均为行业参考值，页面内可改，以供应商实际报价为准
 *   · 几何量全部从三角网格计算：
 *       体积   —— 散度定理（对每个三角形求有向体积再求和取绝对值）
 *       表面积 —— 所有三角形面积之和
 * ============================================================ */
(function () {
  "use strict";

  /* ══════════ 材料库 ══════════
   * d  密度 g/cm³        p 参考单价 元/kg（可改）
   * sr 成型收缩率 %       st 允许应变 %（用于卡扣校核参考）
   */
  var MATS = [
    { id: "abs",   n: "ABS",           d: 1.05, p: 13, use: "外壳、结构件",           sr: 0.5, st: 1.5 },
    { id: "pcabs", n: "PC/ABS",        d: 1.15, p: 20, use: "外观件、耐冲击外壳",      sr: 0.5, st: 1.8 },
    { id: "pc",    n: "PC 透明",        d: 1.20, p: 24, use: "灯罩、透光件",           sr: 0.6, st: 2.0 },
    { id: "pcfr",  n: "PC 阻燃 V0",     d: 1.22, p: 32, use: "电源外壳、安规件",       sr: 0.6, st: 1.8 },
    { id: "pmma",  n: "PMMA 亚克力",    d: 1.19, p: 17, use: "导光板、透镜",           sr: 0.5, st: 1.6 },
    { id: "pp",    n: "PP",            d: 0.91, p: 11, use: "内部支架、活动铰链",      sr: 1.5, st: 3.0 },
    { id: "pom",   n: "POM",           d: 1.41, p: 19, use: "齿轮、卡扣、滑动件",      sr: 2.0, st: 2.5 },
    { id: "pa6",   n: "PA6 尼龙",       d: 1.14, p: 21, use: "结构件、耐磨件",         sr: 1.2, st: 2.5 },
    { id: "hips",  n: "HIPS",          d: 1.04, p: 12, use: "灯座、内衬",             sr: 0.5, st: 1.4 },
    { id: "petg",  n: "PETG",          d: 1.27, p: 18, use: "透光件、装饰件",         sr: 0.4, st: 1.8 },
    { id: "tpu",   n: "TPU 软胶",       d: 1.20, p: 30, use: "包胶、按键",             sr: 1.0, st: 3.5 },
    { id: "silic", n: "硅胶 LSR",       d: 1.15, p: 85, use: "柔光罩、密封圈",         sr: 0,   st: 4.0 },
    { id: "pvc",   n: "PVC 搪胶料",     d: 1.30, p: 15, use: "搪胶成型件",             sr: 0,   st: 2.5 },
    { id: "epoxy", n: "环氧树脂",        d: 1.15, p: 34, use: "树脂一体成型",           sr: 0,   st: 1.5 },
    { id: "al",    n: "铝合金 6061",     d: 2.70, p: 26, use: "散热器、结构件",         sr: 0,   st: 0 },
    { id: "pcb",   n: "PCB 板",         d: 1.85, p: 0,  use: "电路板（通常按面积计价）", sr: 0,   st: 0 },
    { id: "none",  n: "不计材料",        d: 0,    p: 0,  use: "标准件、外购件",         sr: 0,   st: 0 }
  ];

  /* ══════════ 工艺参数默认值（与「塑料件成本估算」计算器一致）══════════ */
  var PARAMS = {
    loss:   { l: "材料损耗 (%)",     v: 4 },
    rate:   { l: "机时费 (元/h)",    v: 60 },
    cycle:  { l: "成型周期 (s)",     v: 30 },
    cav:    { l: "模穴数",           v: 2 },
    yield:  { l: "良率 (%)",         v: 95 },
    extra:  { l: "表处+包装 (元/件)", v: 1.5 },
    mold:   { l: "模具总价 (元)",    v: 60000 },
    qty:    { l: "订单量 (件)",      v: 100000 }
  };

  /* 默认材料猜测：按零件名关键词给一个合理初值 */
  var GUESS = [
    [/罩|lens|cover|shade|diffus|透光|灯罩|pc(?!b)/i, "pc"],
    [/导光|light.?guide|lgp|pmma|亚克力/i, "pmma"],
    [/电源|driver|psu|适配器|adapter/i, "pcfr"],
    [/壳|housing|case|body|enclosur|上盖|下盖|底壳|面盖/i, "abs"],
    [/外观|panel|装饰|decor|面壳|前盖/i, "pcabs"],
    [/卡扣|clip|snap|gear|齿轮|滑块|buckle/i, "pom"],
    [/支架|bracket|holder|frame|骨架|底座|base/i, "pp"],
    [/密封|seal|gasket|o.?ring|圈|垫/i, "silic"],
    [/硅胶|silicone|柔光|软/i, "tpu"],
    [/散热|heat.?sink|铝|alumin/i, "al"],
    [/pcb|板|board|电路/i, "pcb"],
    [/螺丝|screw|螺栓|bolt|螺母|标准件|磁铁|magnet|弹簧|spring/i, "none"]
  ];

  function guessMat(name) {
    var s = String(name || "");
    for (var i = 0; i < GUESS.length; i++) if (GUESS[i][0].test(s)) return GUESS[i][1];
    return "abs";
  }

  function matById(id) {
    for (var i = 0; i < MATS.length; i++) if (MATS[i].id === id) return MATS[i];
    return MATS[0];
  }

  /* ══════════ 几何量：从三角网格算体积 / 表面积 / 包围盒 ══════════ */
  function meshStats(mesh) {
    var pos = mesh.attributes.position.array;
    var idx = mesh.index.array;
    var vol = 0, area = 0, tris = idx.length / 3;
    var mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
    var i, k;
    for (i = 0; i < pos.length; i += 3) {
      for (k = 0; k < 3; k++) {
        var x = pos[i + k];
        if (x < mn[k]) mn[k] = x;
        if (x > mx[k]) mx[k] = x;
      }
    }
    for (var t = 0; t < idx.length; t += 3) {
      var a = idx[t] * 3, b = idx[t + 1] * 3, c = idx[t + 2] * 3;
      var ax = pos[a], ay = pos[a + 1], az = pos[a + 2];
      var bx = pos[b], by = pos[b + 1], bz = pos[b + 2];
      var cx = pos[c], cy = pos[c + 1], cz = pos[c + 2];
      vol += (ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx)) / 6;
      var ux = bx - ax, uy = by - ay, uz = bz - az;
      var vx = cx - ax, vy = cy - ay, vz = cz - az;
      area += Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx) / 2;
    }
    for (k = 0; k < 3; k++) if (!isFinite(mn[k])) { mn[k] = 0; mx[k] = 0; }
    return {
      vol: Math.abs(vol), area: area, tris: tris,
      min: mn, max: mx,
      dim: [mx[0] - mn[0], mx[1] - mn[1], mx[2] - mn[2]]
    };
  }

  /* ══════════ 装配层级 → 扁平零件表 ══════════
   * 每个叶子节点若挂着 mesh，就算一个「零件」；
   * 同时保留层级路径，便于在界面里还原树形结构。
   */
  function flatten(root, meshes) {
    var parts = [], tree = [];
    (function walk(node, depth, path, sibTag) {
      if (!node) return;
      var name = String(node.name || "").trim();
      var label = name + (sibTag || "");
      var here = label ? path.concat([label]) : path;
      var mine = (node.meshes || []).filter(function (i) { return meshes[i]; });
      var nodeId = tree.length;
      tree.push({ id: nodeId, depth: depth, name: label || "(未命名)", path: here.join(" / "), isPart: mine.length > 0 });
      if (mine.length) {
        for (var i = 0; i < mine.length; i++) {
          var m = meshes[mine[i]];
          var st = m.stats;
          /* 零件名要带上节点的实例号：同名装配节点各挂多个 mesh 时，
             只用「节点名 + 序号」会与另一个同名节点的零件完全撞名 */
          var pname = (name || m.name || "零件") + (sibTag || "")
                    + (mine.length > 1 ? " · " + (i + 1) : "");
          parts.push({
            id: parts.length,
            nodeId: nodeId,
            depth: depth,
            path: here.join(" / "),
            name: pname,
            rawName: m.name || name || "",
            vol: st.vol, area: st.area, tris: st.tris, dim: st.dim,
            min: st.min, max: st.max,        // 自身包围盒的角点（原始坐标，3D 画线框用）
            mat: guessMat(name + " " + (m.name || "")),
            on: true
          });
        }
      }
      var ch = node.children || [];
      var cnt = {}, seq = {}, j;
      for (j = 0; j < ch.length; j++) {
        var kn = String(ch[j].name || "").trim();
        cnt[kn] = (cnt[kn] || 0) + 1;
      }
      for (j = 0; j < ch.length; j++) {
        var kn2 = String(ch[j].name || "").trim();
        seq[kn2] = (seq[kn2] || 0) + 1;
        walk(ch[j], depth + 1, here, cnt[kn2] > 1 ? " #" + seq[kn2] : "");
      }
    })(root, 0, []);
    return { parts: parts, tree: tree };
  }

  /* ══════════ 成本模型 ══════════ */
  function estimate(parts, P) {
    var loss = +P.loss / 100, rate = +P.rate, cycle = +P.cycle;
    var cav = Math.max(+P.cav || 1, 1), yld = Math.max(+P.yield || 1, 1) / 100;
    var extra = +P.extra, mold = +P.mold, qty = Math.max(+P.qty || 1, 1);

    var mat = 0, weight = 0, volSum = 0, areaSum = 0, n = 0, perPart = [];
    for (var i = 0; i < parts.length; i++) {
      var pt = parts[i];
      var m = matById(pt.mat);
      var w = m.d > 0 ? (pt.vol / 1000) * m.d : 0;          // mm³ → cm³ × g/cm³ = g
      var c = w * m.p / 1000 * (1 + loss);                   // 材料费
      if (!pt.on) { perPart.push({ pt: pt, w: w, mat: c, mach: 0 }); continue; }
      mat += c; weight += w; volSum += pt.vol; areaSum += pt.area; n++;
      perPart.push({ pt: pt, w: w, mat: c, mach: 0 });
    }
    var mach = rate * cycle / 3600 / cav * n;                // 每个零件各注塑一次
    var amort = mold / qty;
    var sub = mat + mach;
    var total = sub / yld + extra + amort;

    return {
      weighted: weight, volSum: volSum, areaSum: areaSum, n: n,
      mat: mat, mach: mach, amort: amort,
      yldLoss: sub * (1 / yld - 1),
      extra: extra,
      total: total, perPart: perPart,
      machEach: rate * cycle / 3600 / cav
    };
  }

  /* ══════════ 格式化 ══════════ */
  function fix(x, d) {
    if (!isFinite(x)) return "—";
    var s = (+x).toFixed(d === undefined ? 2 : d);
    if (s.indexOf(".") >= 0) s = s.replace(/\.?0+$/, "");
    return s;
  }
  /* 选单位的依据是「四舍五入后的显示值」而不是原始阈值：
     999.9999 mm³ 若按阈值判断会显示成 1000 mm³，其实写成 1 cm³ 更好读 */
  function vol(x) {           // mm³ → 智能单位
    var m3 = x / 1e9, L = x / 1e6, cm = x / 1e3;
    if (Math.round(m3 * 1000) / 1000 >= 1) return fix(m3, 3) + " m³";
    if (Math.round(L * 100) / 100 >= 1) return fix(L, 2) + " L";
    if (Math.round(cm * 100) / 100 >= 1) return fix(cm, 2) + " cm³";
    return fix(x, 1) + " mm³";
  }
  function area(x) {          // mm² → 智能单位
    if (x >= 1e4) return fix(x / 1e2, 1) + " cm²";
    return fix(x, 0) + " mm²";
  }
  function grams(x) {
    if (x >= 1000) return fix(x / 1000, 2) + " kg";
    return fix(x, x < 10 ? 2 : 1) + " g";
  }
  function money(x) { return "¥ " + fix(x, x < 0.1 ? 4 : x < 10 ? 3 : 2); }

  /* ══════════ AI 提示词 ══════════ */
  function buildPrompt(info, parts, est, P) {
    var rows = [], i;
    for (i = 0; i < parts.length; i++) {
      var pt = parts[i], m = matById(pt.mat);
      rows.push(
        (i + 1) + ". " + pt.name +
        " | 材料 " + (pt.on ? m.n : "（未计入）") +
        " | 体积 " + fix(pt.vol / 1000, 2) + " cm³" +
        " | 表面积 " + fix(pt.area / 100, 1) + " cm²" +
        " | 包围盒 " + pt.dim.map(function (d) { return fix(d, 1); }).join("×") + " mm" +
        " | 面片 " + pt.tris
      );
    }
    var L = [];
    L.push("我是一名灯具结构工程师，正在做项目前期成本评估。");
    L.push("下面是一份从 STEP 装配体自动提取的零件清单（体积由三角网格按散度定理积分得到，与 CAD 实测值可对齐），请帮我就「成本」和「工艺可行性」做分析。");
    L.push("");
    L.push("【模型信息】");
    L.push("· 文件：" + info.file + "（" + info.size + "）");
    L.push("· 整体包围盒：" + info.bbox + " mm");
    L.push("· 零件数：" + est.n + " 个（参与计价）");
    L.push("· 总体积：" + fix(est.volSum / 1000, 2) + " cm³（" + vol(est.volSum) + "）");
    L.push("· 总重量：" + fix(est.weighted, 2) + " g（" + grams(est.weighted) + "）");
    L.push("· 总表面积：" + fix(est.areaSum / 100, 1) + " cm²");
    L.push("");
    L.push("【零件清单】");
    L.push(rows.join("\n"));
    L.push("");
    L.push("【已按注塑工艺做的初步估算】");
    L.push("· 工艺参数：材料损耗 " + P.loss + "%，机时费 " + P.rate + " 元/h，成型周期 " + P.cycle + " s，模穴数 " + P.cav + "，良率 " + P.yield + "%，表处+包装 " + P.extra + " 元/件");
    L.push("· 模具总价 " + P.mold + " 元，订单量 " + P.qty + " 件 → 单件摊销 " + fix(est.amort, 3) + " 元");
    L.push("· 材料费合计 " + fix(est.mat, 3) + " 元；加工费合计 " + fix(est.mach, 3) + " 元");
    L.push("· 单件估算成本 " + fix(est.total, 3) + " 元");
    L.push("");
    L.push("【请回答】");
    L.push("1. 这个成本结构里，哪一项的压缩空间最大？给出具体可执行的降本方向（含预期幅度）。");
    L.push("2. 从零件的体积/表面积比例看，是否存在壁厚过厚、可以减料或抽壳的部位？请指出具体是哪个零件。");
    L.push("3. 材料选型是否合理？哪些零件换材料后成本或性能会明显改善？（我主要做塑料灯具：小夜灯、氛围灯、补光灯，也涉及树脂一体成型、搪胶、软硅胶等小众工艺）");
    L.push("4. 前期的风险提示：哪些零件在开模前必须再确认（脱模斜度、卡扣强度、缩水、透光均匀性等）？");
    L.push("");
    L.push("如果信息不足，请先说明你需要补充什么，不要凭空假设尺寸或结构细节。");
    return L.join("\n");
  }

  /* ══════════ CSV 导出 ══════════ */
  function toCSV(info, parts, est, P) {
    var q = function (v) {
      var s = String(v === undefined || v === null ? "" : v);
      return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    var L = [];
    L.push(["零件名称", "层级路径", "材料", "密度(g/cm³)", "单价(元/kg)", "体积(cm³)", "表面积(cm²)", "包围盒(mm)", "重量(g)", "材料费(元)", "是否计入"].map(q).join(","));
    for (var i = 0; i < parts.length; i++) {
      var pt = parts[i], m = matById(pt.mat);
      var w = m.d > 0 ? (pt.vol / 1000) * m.d : 0;
      var c = w * m.p / 1000 * (1 + (+P.loss) / 100);
      L.push([pt.name, pt.path, m.n, m.d, m.p, fix(pt.vol / 1000, 3), fix(pt.area / 100, 2),
        pt.dim.map(function (d) { return fix(d, 1); }).join("×"),
        fix(w, 3), fix(c, 4), pt.on ? "是" : "否"].map(q).join(","));
    }
    L.push("");
    L.push(["汇总", "", "", "", "", "", "", "", "", ""].map(q).join(","));
    var S = [
      ["参与计价零件数", est.n], ["总体积(cm³)", fix(est.volSum / 1000, 2)], ["总表面积(cm²)", fix(est.areaSum / 100, 1)],
      ["总重量(g)", fix(est.weighted, 2)], ["材料费合计(元)", fix(est.mat, 4)], ["加工费合计(元)", fix(est.mach, 4)],
      ["良率损失(元)", fix(est.yldLoss, 4)], ["模具摊销(元/件)", fix(est.amort, 4)], ["表处包装(元/件)", fix(est.extra, 4)],
      ["单件成本(元)", fix(est.total, 4)]
    ];
    for (var k = 0; k < S.length; k++) L.push([S[k][0], S[k][1]].map(q).join(","));
    L.push("");
    L.push(["工艺参数", "值"].map(q).join(","));
    for (var key in P) if (P.hasOwnProperty(key)) L.push([P[key].l, P[key].v].map(q).join(","));
    return "\uFEFF" + L.join("\n");   // BOM 让 Excel 正确识别中文
  }

  window.KB_STEP = {
    MATS: MATS, PARAMS: PARAMS,
    matById: matById, guessMat: guessMat,
    meshStats: meshStats, flatten: flatten, estimate: estimate,
    buildPrompt: buildPrompt, toCSV: toCSV,
    fix: fix, vol: vol, area: area, grams: grams, money: money
  };
})();
