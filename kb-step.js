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
  /* 模穴数与机时费改为按零件 / 模具自动推算，不再用全局固定值；
     这里只保留跨零件共用的基础参数 */
  var PARAMS = {
    loss:   { l: "材料损耗 (%)",     v: 4 },
    cycle:  { l: "基础成型周期 (s)",  v: 30 },
    yield:  { l: "良率 (%)",         v: 95 },
    rateK:  { l: "机时费系数 (×)",    v: 1 },
    pack:   { l: "包装费 (元/件)",    v: 0.8 },
    asm:    { l: "组装费 (元/件)",    v: 1.0 },
    qty:    { l: "订单量 (件)",      v: 100000 },
    target: { l: "目标售价 (元/件)",  v: 0 }
  };

  /* ══════════ 模具结构选项 ══════════
   * k 为相对系数（用于乘在「基础价 × 穴数系数」上）
   * 价格口径参考：深圳 / 台州模具厂 2026 公开报价区间
   */
  var STEELS = [
    { id: "p20",   n: "P20 预硬钢",     k: 1.00, life: "30-50 万模次",  price: "45-60 元/kg" },
    { id: "718",   n: "718H",          k: 1.15, life: "50-80 万模次",  price: "65-85 元/kg" },
    { id: "nak80", n: "NAK80 镜面钢",   k: 1.35, life: "80-100 万模次", price: "90-120 元/kg" },
    { id: "s136",  n: "S136 耐蚀钢",    k: 1.50, life: "100 万模次+",   price: "120-180 元/kg" },
    { id: "h13",   n: "H13 淬火钢",     k: 1.40, life: "300 万模次+",   price: "90-130 元/kg" }
  ];
  var PRECISIONS = [
    { id: "normal", n: "常规 ±0.05",  k: 1.00 },
    { id: "fine",   n: "较精密 ±0.02", k: 1.15 },
    { id: "high",   n: "精密 ±0.01",  k: 1.35 }
  ];
  var FINISHES = [
    { id: "normal", n: "普通抛光",       k: 1.00, note: "" },
    { id: "gloss",  n: "高光",           k: 1.12, note: "外观面要求高" },
    { id: "mirror", n: "镜面 Ra<0.1",    k: 1.30, note: "透明件 / 导光件常用" }
  ];
  /* scrap = 水口料占净重的比例（冷流道最大，热流道几乎为零） */
  var RUNNERS = [
    { id: "cold",  n: "冷流道（两板模）",   scrap: 0.22, add: 0,    note: "结构最简单" },
    { id: "three", n: "三板模（点进胶）",   scrap: 0.14, add: 4000, note: "自动断水口" },
    { id: "hot",   n: "热流道",            scrap: 0.02, add: 0,    note: "无水口，模具贵但省料" }
  ];
  /* 锁模力系数 t/cm²（与站内「锁模力估算」计算器口径一致） */
  var MOLD_COEF = {
    abs: 0.35, pcabs: 0.38, pc: 0.40, pcfr: 0.40, pmma: 0.40, pp: 0.35,
    pom: 0.40, pa6: 0.40, hips: 0.32, petg: 0.38, tpu: 0.30, silic: 0.30,
    pvc: 0.35, epoxy: 0.40, al: 0.50, pcb: 0, none: 0
  };
  /* 注塑机机时费（含人工/电费/折旧的参考值） */
  var RATE_TABLE = [[80, 35], [150, 45], [250, 60], [400, 80], [650, 110], [Infinity, 160]];
  /* 水口料回收可按新料的多少折价抵扣 */
  var RECYCLE = 0.62;

  function byId(list, id) {
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return list[0];
  }
  function moldCoefOf(matId) {
    var v = MOLD_COEF[matId];
    return v === undefined ? 0.38 : v;
  }
  function machineRate(tonnage) {
    for (var i = 0; i < RATE_TABLE.length; i++) if (tonnage <= RATE_TABLE[i][0]) return RATE_TABLE[i][1];
    return 160;
  }

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
            on: true,
            /* 模具与工艺配置（默认按体积给一个合理初值，可在界面上逐项改） */
            tool: {
              cav: st.vol / 1000 < 5 ? 4 : (st.vol / 1000 < 50 ? 2 : 1),
              slides: 0,          // 滑块 / 行位数量
              lifters: 0,         // 斜顶数量
              runner: "cold",     // 浇口类型
              steel: "p20",       // 钢材等级
              precision: "normal",// 精度等级
              finish: "normal",   // 表面要求
              post: 0,            // 二次加工 / 表面处理费（元/件）
              moldId: null,       // 共模组 id：同一 id 的零件拼在一套模具里（null = 独立开模）
              quote: null         // 若填了模具厂实际报价，则覆盖估算
            }
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

  /* ══════════ 模具：分组 / 报价 / 周期 ══════════ */

  /* 按「共模」关系把零件聚合成模具组。
     同一 moldId 的零件拼在同一套模具里（可以 2 个、3 个甚至更多）；
     moldId 为 null 的零件各自独立开模 —— 也就是「一零件一套模具」。
     ⚠️ 一套模具很可能装好几个零件（小件拼模是常态），所以这里是「分组」而不是「两两配对」。 */
  function moldGroups(parts) {
    var map = {}, keys = [], i, k;
    for (i = 0; i < parts.length; i++) {
      if (!parts[i].on) continue;
      k = parts[i].tool.moldId;
      /* 独立件用一个「只属于自己」的私有键，天然不会与别人合并 */
      if (k === null || k === undefined || k === "") k = "@" + i;
      if (!map[k]) { map[k] = []; keys.push(k); }
      map[k].push(i);
    }
    var groups = keys.map(function (kk) {
      var m = map[kk];
      return { leader: m[0], parts: m, cfg: parts[m[0]].tool };
    });
    /* 按最小零件序号排序，保证「模 1 / 模 2」的编号稳定 */
    groups.sort(function (a, b) { return a.leader - b.leader; });
    return groups;
  }

  var moldSeq = 0;      // 共模组 id 计数器（只增不减，保证脱离旧组的零件不会误并）

  /* 与 i 同属一套模具的全部零件索引（含自身） */
  function moldMembers(parts, i) {
    var gs = moldGroups(parts);
    for (var k = 0; k < gs.length; k++) if (gs[k].parts.indexOf(i) >= 0) return gs[k].parts.slice();
    return [i];
  }

  /* 把一组零件写成一个共模组；不足 2 件则各自独立开模 */
  function setMold(parts, ids) {
    ids.forEach(function (x) { parts[x].tool.moldId = null; });
    if (!ids || ids.length < 2) return null;
    var k = "G" + (++moldSeq);
    ids.forEach(function (x) { parts[x].tool.moldId = k; });
    return k;
  }

  /* 多选开关：把 j 并进 i 所在的模具 / 或从该模具中移出
     加入时若 j 原本已在别的模具里，则两套模具合并成一套 */
  function toggleShare(parts, i, j) {
    if (i === j) return;
    var set = moldMembers(parts, i);
    var at = set.indexOf(j);
    if (at >= 0) {
      set.splice(at, 1);
      setMold(parts, set);
      parts[j].tool.moldId = null;      // 被移出的零件改为独立开模
      return;
    }
    moldMembers(parts, j).forEach(function (x) { if (set.indexOf(x) < 0) set.push(x); });
    set.sort(function (a, b) { return a - b; });
    setMold(parts, set);
  }

  /* 本件改为独立开模，原同模的其余零件仍留在同一套模具里 */
  function leaveMold(parts, i) {
    var rest = moldMembers(parts, i).filter(function (x) { return x !== i; });
    setMold(parts, rest);
    parts[i].tool.moldId = null;
  }

  /* 单套模具的结构化报价
     基础价按模具最大投影面积估；穴数、钢材、精度、表面用系数相乘；
     滑块 / 斜顶 / 热流道按行业单价直接叠加 */
  function moldCost(parts, group) {
    var members = group.parts.map(function (i) { return parts[i]; });
    var main = members[0];
    for (var i = 1; i < members.length; i++) {
      var a = members[i].dim.slice().sort(function (x, y) { return y - x; });
      var b = main.dim.slice().sort(function (x, y) { return y - x; });
      if (a[0] * a[1] > b[0] * b[1]) main = members[i];
    }
    var d = main.dim.slice().sort(function (x, y) { return y - x; });
    var area = d[0] * d[1] / 100;                                  // mm² → cm²
    var base = 8500 * Math.pow(Math.max(area, 5) / 25, 0.55);      // 经验式：面积越小越便宜
    base = Math.min(base, 350000);                                 // 软上限，避免超大面积外推过度

    var cfg = group.cfg;
    var steel = byId(STEELS, cfg.steel), prec = byId(PRECISIONS, cfg.precision), fin = byId(FINISHES, cfg.finish);
    var cav = Math.max(cfg.cav || 1, 1);
    var kCav = Math.pow(cav, 0.75);                                // 多腔成本递减（非线性）
    var core = base * kCav * steel.k * prec.k * fin.k;
    var slideCost = (cfg.slides || 0) * 5000;                      // 滑块 / 行位：每组 5,000 元
    var liftCost = (cfg.lifters || 0) * 3000;                      // 斜顶：每个 3,000 元
    var runCost = 0;
    if (cfg.runner === "three") runCost = 4000;
    else if (cfg.runner === "hot") runCost = 8000 + 1500 * cav;    // 热流道按点数

    var est = core + slideCost + liftCost + runCost;
    var quoted = cfg.quote !== null && cfg.quote !== undefined && +cfg.quote > 0;
    return {
      leader: group.leader, members: group.parts, cfg: cfg, main: main,
      area: area, base: base, kCav: kCav, cav: cav,
      core: core, slideCost: slideCost, liftCost: liftCost, runCost: runCost,
      steel: steel, prec: prec, fin: fin,
      est: est, total: quoted ? +cfg.quote : est, quoted: quoted
    };
  }

  /* 滑块 / 斜顶会让开合模多出侧向抽芯动作，周期随之变长 */
  function cycleOf(part, baseCycle) {
    var c = part.tool;
    var k = 1 + 0.08 * (c.slides || 0) + 0.05 * (c.lifters || 0);
    if (c.runner === "three") k *= 1.10;
    else if (c.runner === "hot") k *= 0.96;
    return baseCycle * Math.min(k, 1.6);
  }

  /* 零件投影面积 → 锁模力 → 机台吨位 → 机时费 */
  function partMachine(part, rateK) {
    var d = part.dim.slice().sort(function (x, y) { return y - x; });
    var area = d[0] * d[1] / 100;                       // cm²
    var clamp = area * moldCoefOf(part.mat);            // t
    var tonnage = clamp * 1.2;                          // 含 20% 余量
    return { area: area, clamp: clamp, tonnage: tonnage, rate: machineRate(tonnage) * rateK };
  }

  /* ══════════ 成本模型 ══════════ */
  function estimate(parts, P) {
    var loss = +P.loss / 100;
    var yld = Math.max(+P.yield || 1, 1) / 100;
    var rateK = +P.rateK || 1;
    var qty = Math.max(+P.qty || 1, 1);
    var pack = +P.pack || 0, asm = +P.asm || 0;

    /* 先按共模关系聚合模具，算出每套模具的报价 */
    var groups = moldGroups(parts);
    var molds = groups.map(function (g) { return moldCost(parts, g); });
    var moldTotal = 0;
    molds.forEach(function (m) { moldTotal += m.total; });
    var moldOf = {};
    molds.forEach(function (m) { m.members.forEach(function (pi) { moldOf[pi] = m; }); });

    var mat = 0, mach = 0, post = 0, amort = 0, weight = 0, volSum = 0, areaSum = 0, n = 0;
    var perPart = [];

    for (var i = 0; i < parts.length; i++) {
      var pt = parts[i], m = matById(pt.mat);
      var netW = m.d > 0 ? (pt.vol / 1000) * m.d : 0;                 // 净重 g
      var rn = byId(RUNNERS, pt.tool.runner);
      var scrapW = netW * rn.scrap;                                   // 水口料重
      /* 材料费 = 净重(含损耗) 全价 + 水口料按回收折价后计入 */
      var matCost = (netW * (1 + loss) + scrapW * (1 - RECYCLE)) * m.p / 1000;

      var mi = partMachine(pt, rateK);
      var cycle = cycleOf(pt, +P.cycle);
      var cav = Math.max(pt.tool.cav || 1, 1);
      var machCost = mi.rate * cycle / 3600 / cav;                    // 按模穴分摊

      var mm = moldOf[i];
      /* 模具摊销：该套模具价 ÷ 订单量 ÷ 组内零件数 */
      var amortCost = mm ? mm.total / qty / mm.members.length : 0;

      var row = {
        pt: pt, i: i, netW: netW, scrapW: scrapW, mat: matCost, mach: machCost,
        post: +pt.tool.post || 0, amort: amortCost,
        area: mi.area, clamp: mi.clamp, tonnage: mi.tonnage, rate: mi.rate,
        cycle: cycle, cav: cav, mold: mm
      };
      perPart.push(row);

      if (pt.on) {
        mat += matCost; mach += machCost; post += (+pt.tool.post || 0);
        amort += amortCost; weight += netW;
        volSum += pt.vol; areaSum += pt.area; n++;
      }
    }

    var sub = mat + mach;
    var total = sub / yld + post + pack + asm + amort;

    return {
      weighted: weight, volSum: volSum, areaSum: areaSum, n: n,
      mat: mat, mach: mach, post: post, pack: pack, asm: asm, amort: amort,
      yldLoss: sub * (1 / yld - 1),
      total: total,
      molds: molds, moldTotal: moldTotal, qty: qty,
      perPart: perPart
    };
  }

  /* 常规注塑范围检查：超出行业常见范围的数值要给出提示，避免误读 */
  function sanity(parts, est) {
    var warn = [];
    for (var i = 0; i < est.perPart.length; i++) {
      var r = est.perPart[i];
      if (r.netW > 20000) warn.push(r.pt.name + " 单件重 " + fix(r.netW / 1000, 1) + " kg，超出常规注塑范围（常见 ≤20 kg）");
      if (r.clamp > 2500) warn.push(r.pt.name + " 需锁模力 " + fix(r.clamp, 0) + " t，超出常规注塑机（常见 ≤2500 t）");
      if (r.area > 10000) warn.push(r.pt.name + " 投影面积 " + fix(r.area, 0) + " cm²，超出常规注塑机台板尺寸");
    }
    var big = parts.filter(function (p) { return p.on; }).sort(function (a, b) { return b.vol - a.vol; })[0];
    if (big && big.vol / 1000 > 20000) warn.push("最大件体积 " + fix(big.vol / 1000, 0) + " cm³，模具尺寸与机台需专项评估");
    return warn.slice(0, 4);
  }

  /* 阶梯价：同一套零件在不同订单量下的单件成本 */
  function tiers(parts, P, qtys) {
    var out = [];
    for (var i = 0; i < qtys.length; i++) {
      var P2 = {};
      for (var k in P) if (P.hasOwnProperty(k)) P2[k] = P[k];
      P2.qty = qtys[i];
      var e = estimate(parts, P2);
      out.push({ qty: qtys[i], unit: e.total, amort: e.amort, moldTotal: e.moldTotal });
    }
    return out;
  }

  /* 回本点：模具投入要多少件才能靠单件毛利收回来 */
  function breakEven(e, target) {
    if (!target || +target <= 0) return null;
    var variable = e.total - e.amort;          // 不含模具摊销的单件成本
    var gross = +target - variable;            // 单件毛利
    if (gross <= 0) return { ok: false, variable: variable, gross: gross };
    return { ok: true, qty: Math.ceil(e.moldTotal / gross), variable: variable, gross: gross };
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
    var B = String.fromCharCode(124);   // 竖线，避免转义困扰
    var rows = [], i;
    /* 零件 → 所属模具序号与同模件数（一个模具可能装好几个零件，必须逐件标出来） */
    var moldNo = {}, moldSize = {};
    est.molds.forEach(function (m, k) {
      m.members.forEach(function (x) { moldNo[x] = k + 1; moldSize[x] = m.members.length; });
    });
    for (i = 0; i < parts.length; i++) {
      var pt = parts[i], m = matById(pt.mat), t = pt.tool;
      var rn = byId(RUNNERS, pt.tool.runner);
      rows.push(
        (i + 1) + ". " + pt.name +
        " " + B + " 材料 " + (pt.on ? m.n : "（未计入）") +
        " " + B + " 体积 " + fix(pt.vol / 1000, 2) + " cm³" +
        " " + B + " 包围盒 " + pt.dim.map(function (d) { return fix(d, 1); }).join("×") + " mm" +
        " " + B + " 模具 " + (t.cav || 1) + " 穴 / " + rn.n +
        (t.slides ? " / 滑块 " + t.slides : "") +
        (t.lifters ? " / 斜顶 " + t.lifters : "") +
        " / " + byId(STEELS, t.steel).n +
        " / " + byId(PRECISIONS, t.precision).n +
        (t.finish !== "normal" ? " / " + byId(FINISHES, t.finish).n : "") +
        (moldSize[i] > 1 ? " / 与另 " + (moldSize[i] - 1) + " 件共模（模 " + moldNo[i] + "）" : "") +
        (t.post ? " / 二次加工 " + t.post + " 元" : "")
      );
    }

    var molds = [], mi;
    for (mi = 0; mi < est.molds.length; mi++) {
      var md = est.molds[mi];
      molds.push(
        "模 " + (mi + 1) + "（共模 " + md.members.length + " 件：" +
        md.members.map(function (x) { return parts[x].name; }).join("、") + "）" +
        "\n    投影面积 " + fix(md.area, 0) + " cm² " + B + " 基准件 " + md.main.name +
        "\n    基础价 ¥" + fix(md.base, 0) + " × 穴数系数 " + fix(md.kCav, 2) +
        " × 钢材 " + fix(md.steel.k, 2) + " × 精度 " + fix(md.prec.k, 2) + " × 表面 " + fix(md.fin.k, 2) +
        " = ¥" + fix(md.core, 0) +
        "，滑块 ¥" + fix(md.slideCost, 0) + "，斜顶 ¥" + fix(md.liftCost, 0) + "，浇口系统 ¥" + fix(md.runCost, 0) +
        "\n    合计 ¥" + fix(md.total, 0) + "" + (md.quoted ? "（已按模具厂实际报价覆盖）" : "（系统估算）")
      );
    }

    var tl = tiers(parts, P, [10000, 50000, 100000, 300000, 500000]);
    var tierTxt = tl.map(function (x) { return fix(x.qty, 0) + " 件 → " + fix(x.unit, 3) + " 元/件"; }).join("；");
    var be = breakEven(est, P.target);

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
    L.push("【零件清单（含各自的开模方案）】");
    L.push(rows.join("\n"));
    L.push("");
    L.push("【模具投入清单（共 " + est.molds.length + " 套模具，合计 ¥" + fix(est.moldTotal, 0) + "）】");
    L.push(molds.join("\n"));
    L.push("");
    L.push("【成本估算（按注塑工艺）】");
    L.push("· 全局参数：材料损耗 " + P.loss + "%，基础成型周期 " + P.cycle + " s，良率 " + P.yield + "%，机时费系数 " + P.rateK + "×");
    L.push("· 机时费与水口比例按每套模具的机台吨位与浇口形式分别推算；滑块/斜顶会相应延长成型周期");
    L.push("· 订单量 " + fix(P.qty, 0) + " 件 → 模具摊销 " + fix(est.amort, 4) + " 元/件");
    L.push("· 材料费合计 " + fix(est.mat, 3) + " 元；加工费合计 " + fix(est.mach, 3) + " 元；良率损失 " + fix(est.yldLoss, 3) + " 元");
    L.push("· 二次加工 " + fix(est.post, 3) + " 元/件；包装 " + fix(est.pack, 3) + " 元/件；组装 " + fix(est.asm, 3) + " 元/件");
    L.push("· **单件估算成本 " + fix(est.total, 3) + " 元**");
    L.push("· 阶梯价：" + tierTxt);
    if (be && be.ok) L.push("· 目标售价 " + P.target + " 元时，模具投入需 " + be.qty.toLocaleString() + " 件才能收回（单件毛利 " + fix(be.gross, 3) + " 元）");
    else if (be && !be.ok) L.push("· ⚠️ 目标售价 " + P.target + " 元低于不含摊销的单件成本 " + fix(be.variable, 3) + " 元，模具永远收不回来");
    L.push("");
    L.push("【请回答】");
    L.push("1. 这套开模方案（模穴数、滑块、斜顶、浇口形式、钢材）有没有明显过度或不足的地方？逐条说明理由与调整建议。");
    L.push("2. 这个成本结构里哪一项压缩空间最大？给出具体可执行的降本方向（含预期幅度）。");
    L.push("3. 上面的模具分组（哪几个零件拼在同一套模具里）是否合理？请逐组评估：产量、材料、颜色、精度、模具尺寸是否匹配；哪些零件应该拆成单独一副模具，哪些还可以继续合并进来？");
    L.push("4. 从零件的体积/表面积比例看，是否存在壁厚过厚、可以减料或抽壳的部位？请指出具体是哪个零件。");
    L.push("5. 材料选型是否合理？哪些零件换材料后成本或性能会明显改善？（我主要做塑料灯具：小夜灯、氛围灯、补光灯，也涉及树脂一体成型、搪胶、软硅胶等小众工艺）");
    L.push("6. 前期的风险提示：哪些零件在开模前必须再确认（脱模斜度、卡扣强度、缩水、透光均匀性等）？");
    L.push("");
    L.push("如果信息不足，请先说明你需要补充什么，不要凭空假设尺寸或结构细节。");
    return L.join("\n");
  }

  /* ══════════ CSV 导出 ══════════ */
  function toCSV(info, parts, est, P) {
    var q = function (v) {
      var sv = String(v === undefined || v === null ? "" : v);
      return /[",\n]/.test(sv) ? '"' + sv.replace(/"/g, '""') + '"' : sv;
    };
    var rowOf = {}, ri;
    for (ri = 0; ri < est.perPart.length; ri++) rowOf[est.perPart[ri].i] = est.perPart[ri];

    /* 零件 → 所属模具序号与同模件数（一个模具可以装好几个零件） */
    var moldNo = {}, moldSize = {};
    est.molds.forEach(function (m, k) {
      m.members.forEach(function (x) { moldNo[x] = k + 1; moldSize[x] = m.members.length; });
    });

    var L = [];
    L.push(["零件名称", "层级路径", "材料", "体积(cm³)", "包围盒(mm)", "重量(g)",
      "所属模具", "共模件数",
      "模穴数", "滑块", "斜顶", "浇口形式", "钢材", "精度", "表面要求",
      "投影面积(cm²)", "锁模力(t)", "机台吨位(t)", "机时费(元/h)", "成型周期(s)",
      "材料费(元)", "加工费(元)", "二次加工(元)", "模具摊销(元)", "单件小计(元)", "是否计入"].map(q).join(","));

    for (var i = 0; i < parts.length; i++) {
      var pt = parts[i], m = matById(pt.mat), t = pt.tool, r = rowOf[i] || {};
      L.push([
        pt.name, pt.path, m.n, fix(pt.vol / 1000, 3),
        pt.dim.map(function (d) { return fix(d, 1); }).join("×"),
        fix(r.netW || 0, 3),
        "模 " + (moldNo[i] || ""), moldSize[i] || 1,
        t.cav || 1, t.slides || 0, t.lifters || 0,
        byId(RUNNERS, t.runner).n, byId(STEELS, t.steel).n,
        byId(PRECISIONS, t.precision).n, byId(FINISHES, t.finish).n,
        fix(r.area || 0, 1), fix(r.clamp || 0, 1), fix(r.tonnage || 0, 0),
        fix(r.rate || 0, 1), fix(r.cycle || 0, 1),
        fix(r.mat || 0, 4), fix(r.mach || 0, 4), fix(r.post || 0, 4), fix(r.amort || 0, 4),
        fix((r.mat || 0) + (r.mach || 0) + (r.post || 0) + (r.amort || 0), 4),
        pt.on ? "是" : "否"
      ].map(q).join(","));
    }

    L.push("");
    L.push(["模具投入清单", "", "", "", "", ""].map(q).join(","));
    L.push(["模具", "共模件数", "涉及零件", "基准件", "投影面积(cm²)", "基础价(元)", "穴数系数",
      "钢材系数", "精度系数", "表面系数", "滑块(元)", "斜顶(元)", "浇口系统(元)", "模具合计(元)", "来源"].map(q).join(","));
    for (var mi = 0; mi < est.molds.length; mi++) {
      var md = est.molds[mi];
      L.push([
        "模 " + (mi + 1),
        md.members.length,
        md.members.map(function (x) { return parts[x].name; }).join("、"),
        md.main.name, fix(md.area, 0), fix(md.base, 0), fix(md.kCav, 3),
        fix(md.steel.k, 2), fix(md.prec.k, 2), fix(md.fin.k, 2),
        fix(md.slideCost, 0), fix(md.liftCost, 0), fix(md.runCost, 0),
        fix(md.total, 0), md.quoted ? "模具厂报价" : "系统估算"
      ].map(q).join(","));
    }
    L.push(["模具合计", "", "", "", "", "", "", "", "", "", "", "", fix(est.moldTotal, 0), ""].map(q).join(","));

    L.push("");
    L.push(["成本汇总", "金额 / 数值"].map(q).join(","));
    var S = [
      ["参与计价零件数", est.n],
      ["模具套数", est.molds.length],
      ["模具总投入(元)", fix(est.moldTotal, 0)],
      ["总体积(cm³)", fix(est.volSum / 1000, 2)],
      ["总重量(g)", fix(est.weighted, 2)],
      ["总表面积(cm²)", fix(est.areaSum / 100, 1)],
      ["材料费合计(元)", fix(est.mat, 4)],
      ["加工费合计(元)", fix(est.mach, 4)],
      ["良率损失(元/件)", fix(est.yldLoss, 4)],
      ["二次加工(元/件)", fix(est.post, 4)],
      ["包装(元/件)", fix(est.pack, 4)],
      ["组装(元/件)", fix(est.asm, 4)],
      ["模具摊销(元/件)", fix(est.amort, 4)],
      ["单件成本(元)", fix(est.total, 4)]
    ];
    for (var k = 0; k < S.length; k++) L.push([S[k][0], S[k][1]].map(q).join(","));

    L.push("");
    L.push(["阶梯价（不同订单量下的单件成本）", ""].map(q).join(","));
    L.push(["订单量(件)", "单件成本(元)", "其中模具摊销(元)"].map(q).join(","));
    var tl = tiers(parts, P, [10000, 50000, 100000, 300000, 500000]);
    for (var ti = 0; ti < tl.length; ti++) {
      L.push([fix(tl[ti].qty, 0), fix(tl[ti].unit, 4), fix(tl[ti].amort, 4)].map(q).join(","));
    }
    var be = breakEven(est, P.target);
    if (be) {
      L.push(["回本点", be.ok ? (be.qty + " 件（单件毛利 " + fix(be.gross, 4) + " 元）") : "目标售价低于可变成本，无法回本"].map(q).join(","));
    }

    L.push("");
    L.push(["全局工艺参数", "值"].map(q).join(","));
    for (var key in P) if (P.hasOwnProperty(key)) L.push([P[key].l, P[key].v].map(q).join(","));
    return "\uFEFF" + L.join("\n");   // BOM 让 Excel 正确识别中文
  }

  window.KB_STEP = {
    MATS: MATS, PARAMS: PARAMS,
    STEELS: STEELS, PRECISIONS: PRECISIONS, FINISHES: FINISHES, RUNNERS: RUNNERS,
    byId: byId, moldCoefOf: moldCoefOf, machineRate: machineRate,
    matById: matById, guessMat: guessMat,
    meshStats: meshStats, flatten: flatten, estimate: estimate,
    moldGroups: moldGroups, moldCost: moldCost, cycleOf: cycleOf,
    moldMembers: moldMembers, setMold: setMold, toggleShare: toggleShare, leaveMold: leaveMold,
    partMachine: partMachine, tiers: tiers, breakEven: breakEven, sanity: sanity,
    RECYCLE: RECYCLE,
    buildPrompt: buildPrompt, toCSV: toCSV,
    fix: fix, vol: vol, area: area, grams: grams, money: money
  };
})();
