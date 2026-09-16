/* ============================================================
 * kb-workspace.js —— 工作台数据层
 *
 * 统一管理「属于用户自己的数据」，全部落 localStorage：
 *   · 单价库     —— 材料单价/密度、模具结构单价、机时费档位（只存改过的项）
 *   · 报价方案   —— STEP 的模型几何摘要 + 全部配置，可命名、可对比、可恢复
 *   · 计算器记忆 —— 13 个计算器上次填的值
 *   · 项目台账   —— 产品/客户/订单量/报价/状态
 *   · 首页快捷   —— 首页钉选的常用模块
 *
 * 设计要点：
 *   · **自包含**：自带 load/save，不依赖 app.js 的内部实现（只被 app.js 调用、不反向依赖）
 *   · **只存差异**：单价库只记录被改过的项，代码里的默认值升级后不会因为旧数据卡住
 *   · 变更后 emit 事件，界面订阅刷新
 * ============================================================ */
(function () {
  "use strict";

  var K = {
    price: "kb-ws-price-v1",
    plan:  "kb-ws-plan-v1",
    calc:  "kb-ws-calc-v1",
    proj:  "kb-ws-proj-v1",
    short: "kb-ws-short-v1",
    auto:  "kb-ws-auto-v1"
  };
  var PLAN_MAX = 20;          // 方案数量上限（1 条 18 零件方案约 6KB）

  function get(k, d) {
    try { var v = JSON.parse(localStorage.getItem(k) || "null"); return v === null ? d : v; }
    catch (e) { return d; }
  }
  function set(k, v) {
    try { localStorage.setItem(k, JSON.stringify(v)); return true; }
    catch (e) { return false; }
  }

  /* ══════════════ 变更通知 ══════════════ */
  var subs = [];
  function on(fn) { if (typeof fn === "function") subs.push(fn); }
  function emit(what) { for (var i = 0; i < subs.length; i++) { try { subs[i](what); } catch (e) {} } }

  /* ══════════════ ① 单价库 ══════════════ */

  /* 模具结构单价 / 系数（默认值 = kb-step.js 里的行业参考值） */
  var TOOL_DEF = [
    { k: "base",     n: "模具基础价基数 (元)",    v: 8500,   unit: "元",  d: "口径：25 cm² 投影面积的基准价" },
    { k: "baseP",    n: "面积指数",             v: 0.55,   unit: "",    d: "基础价 = 基数 × (投影面积/25)^指数", step: 0.01 },
    { k: "baseCap",  n: "基础价上限 (元)",       v: 350000, unit: "元",  d: "挡住超大件外推过度" },
    { k: "cavP",     n: "穴数指数",             v: 0.75,   unit: "",    d: "多腔成本递减：穴数^指数", step: 0.01 },
    { k: "slide",    n: "滑块 / 行位 (元/组)",    v: 5000,   unit: "元" },
    { k: "lifter",   n: "斜顶 (元/个)",          v: 3000,   unit: "元" },
    { k: "hotBase",  n: "热流道系统 (元/套)",     v: 8000,   unit: "元" },
    { k: "hotPoint", n: "热流道每点 (元)",        v: 1500,   unit: "元" },
    { k: "three",    n: "三板模浇口 (元/套)",     v: 4000,   unit: "元" },
    { k: "recycle",  n: "水口料回收折价 (%)",     v: 62,     unit: "%",  d: "回收料按新料这个比例折价抵扣" },
    { k: "slideCyc", n: "每滑块周期增加 (%)",     v: 8,      unit: "%" },
    { k: "liftCyc",  n: "每斜顶周期增加 (%)",     v: 5,      unit: "%" }
  ];
  /* 机时费档位：注塑机吨位上限 → 元/小时 */
  var RATE_DEF = [
    { cap: 80,       v: 35 },
    { cap: 150,      v: 45 },
    { cap: 250,      v: 60 },
    { cap: 400,      v: 80 },
    { cap: 650,      v: 110 },
    { cap: Infinity, v: 160 }
  ];

  var price = get(K.price, { mat: {}, den: {}, tool: {}, rate: {} });
  if (!price.mat) price.mat = {};
  if (!price.den) price.den = {};
  if (!price.tool) price.tool = {};
  if (!price.rate) price.rate = {};
  function savePrice() { set(K.price, price); emit("price"); }

  /* 材料清单（默认值来自 kb-step.js，叠加本地改动） */
  function mats() {
    var S = window.KB_STEP;
    var list = (S && S.MATS) ? S.MATS : [];
    return list.map(function (m) {
      var po = price.mat[m.id], dn = price.den[m.id];
      return {
        id: m.id, n: m.n, use: m.use, sr: m.sr,
        d: dn === undefined || dn === "" ? m.d : +dn,      d0: m.d,
        p: po === undefined || po === "" ? m.p : +po,      p0: m.p,
        dChg: dn !== undefined && dn !== "" && +dn !== m.d,
        pChg: po !== undefined && po !== "" && +po !== m.p
      };
    });
  }
  function matPrice(id, dft) {
    var v = price.mat[id];
    return v === undefined || v === "" || !isFinite(+v) ? dft : +v;
  }
  function matDensity(id, dft) {
    var v = price.den[id];
    return v === undefined || v === "" || !isFinite(+v) ? dft : +v;
  }
  function setMat(id, val, kind) {
    var bag = kind === "d" ? price.den : price.mat;
    if (val === "" || val === null || val === undefined) delete bag[id]; else bag[id] = +val;
    savePrice();
  }
  function toolOf(key, dft) {
    var v = price.tool[key];
    return v === undefined || v === "" || !isFinite(+v) ? dft : +v;
  }
  function setTool(key, val) {
    if (val === "" || val === null || val === undefined) delete price.tool[key]; else price.tool[key] = +val;
    savePrice();
  }
  function rateTable() {
    return RATE_DEF.map(function (r, i) {
      var v = price.rate[i];
      return { cap: r.cap, v: v === undefined || v === "" || !isFinite(+v) ? r.v : +v, v0: r.v, chg: v !== undefined && v !== "" && +v !== r.v };
    });
  }
  function setRate(i, val) {
    if (val === "" || val === null || val === undefined) delete price.rate[i]; else price.rate[i] = +val;
    savePrice();
  }
  /* 统计改过多少项（首页/入口上显示「已自定义 N 项」） */
  function changedCount() {
    return Object.keys(price.mat).length + Object.keys(price.den).length
         + Object.keys(price.tool).length + Object.keys(price.rate).length;
  }
  function resetPrice(scope) {
    if (!scope || scope === "all") { price = { mat: {}, den: {}, tool: {}, rate: {} }; }
    else if (price[scope]) { price[scope] = {}; }
    savePrice();
  }
  function exportPrice() {
    return { app: "结构工程师知识库", type: "单价库", at: new Date().toISOString(), price: price };
  }
  /* 导入：接受导出文件对象，或直接是 {mat,den,tool,rate} */
  function importPrice(obj) {
    var p = obj && obj.price ? obj.price : obj;
    if (!p || typeof p !== "object") return { ok: false, msg: "不是有效的单价库文件" };
    var bag = { mat: {}, den: {}, tool: {}, rate: {} };
    ["mat", "den", "tool", "rate"].forEach(function (g) {
      var src = p[g];
      if (!src || typeof src !== "object") return;
      Object.keys(src).forEach(function (k) {
        if (isFinite(+src[k])) bag[g][k] = +src[k];
      });
    });
    var n = Object.keys(bag.mat).length + Object.keys(bag.den).length + Object.keys(bag.tool).length + Object.keys(bag.rate).length;
    if (!n) return { ok: false, msg: "文件里没有可导入的单价" };
    price = bag; savePrice();
    return { ok: true, n: n };
  }

  /* ══════════════ ② 报价方案 ══════════════ */
  var plans = get(K.plan, []);
  if (!Array.isArray(plans)) plans = [];
  function savePlan(p) {
    if (!p) return null;
    var id = p.id || ("p" + Date.now().toString(36));
    var rec = {
      id: id,
      name: p.name || (p.info && p.info.file) || "未命名方案",
      at: Date.now(),
      info: p.info || {},
      params: p.params || {},
      parts: p.parts || []
    };
    var hit = -1;
    for (var i = 0; i < plans.length; i++) if (plans[i].id === id) hit = i;
    if (hit >= 0) plans[hit] = rec;
    else {
      plans.unshift(rec);
      while (plans.length > PLAN_MAX) plans.pop();
    }
    set(K.plan, plans); emit("plan");
    return rec;
  }
  function removePlan(id) {
    plans = plans.filter(function (p) { return p.id !== id; });
    set(K.plan, plans); emit("plan");
  }
  function renamePlan(id, name) {
    for (var i = 0; i < plans.length; i++) if (plans[i].id === id) plans[i].name = name || plans[i].name;
    set(K.plan, plans); emit("plan");
  }
  function getPlan(id) {
    for (var i = 0; i < plans.length; i++) if (plans[i].id === id) return plans[i];
    return null;
  }
  function clearPlans() { plans = []; set(K.plan, plans); emit("plan"); }

  /* ══════════════ ③ 自动草稿（STEP 的工作状态） ══════════════
     模型几何 + 全部配置，关掉页面/刷新都不丢；重新打开 STEP 模块时提示「继续上次的报价」。
     与「方案」分开存，免得草稿把方案列表搞脏。 */
  function setAuto(rec) { if (rec) rec.at = Date.now(); set(K.auto, rec || null); }
  function getAuto() { return get(K.auto, null); }
  function clearAuto() { try { localStorage.removeItem(K.auto); } catch (e) {} }

  /* ══════════════ ④ 计算器输入记忆 ══════════════ */
  var calcMem = get(K.calc, {});
  if (!calcMem || typeof calcMem !== "object") calcMem = {};
  function calcGet(id) { return calcMem[id] || null; }
  function calcSet(id, k, v) {
    if (!calcMem[id]) calcMem[id] = {};
    if (v === "" || v === null || !isFinite(+v)) delete calcMem[id][k];
    else calcMem[id][k] = +v;
    if (!Object.keys(calcMem[id]).length) delete calcMem[id];
    set(K.calc, calcMem);
  }
  function calcReset(id) { if (id) delete calcMem[id]; else calcMem = {}; set(K.calc, calcMem); emit("calc"); }

  /* ══════════════ ⑤ 项目台账 ══════════════ */
  var projects = get(K.proj, []);
  if (!Array.isArray(projects)) projects = [];
  var PROJ_STATUS = ["报价中", "已报价", "打样中", "量产中", "暂停", "已结束"];
  function saveProject(p) {
    if (!p) return null;
    var rec = {
      id: p.id || ("j" + Date.now().toString(36)),
      name: p.name || "未命名产品",
      customer: p.customer || "",
      qty: isFinite(+p.qty) ? +p.qty : 0,
      mat: p.mat || "",
      unitCost: isFinite(+p.unitCost) ? +p.unitCost : 0,
      moldCost: isFinite(+p.moldCost) ? +p.moldCost : 0,
      price: isFinite(+p.price) ? +p.price : 0,
      status: p.status || PROJ_STATUS[0],
      note: p.note || "",
      planId: p.planId || "",
      at: Date.now()
    };
    var hit = -1;
    for (var i = 0; i < projects.length; i++) if (projects[i].id === rec.id) hit = i;
    if (hit >= 0) projects[hit] = rec; else projects.unshift(rec);
    set(K.proj, projects); emit("proj");
    return rec;
  }
  function removeProject(id) {
    projects = projects.filter(function (p) { return p.id !== id; });
    set(K.proj, projects); emit("proj");
  }
  function getProject(id) {
    for (var i = 0; i < projects.length; i++) if (projects[i].id === id) return projects[i];
    return null;
  }

  /* ══════════════ ⑥ 首页快捷入口 ══════════════ */
  var short = get(K.short, []);
  if (!Array.isArray(short)) short = [];
  function shortList() { return short.slice(); }
  function shortToggle(id) {
    var i = short.indexOf(id);
    if (i >= 0) short.splice(i, 1); else short.push(id);
    set(K.short, short); emit("short");
    return short.slice();
  }
  function shortSet(list) { short = (list || []).slice(0, 8); set(K.short, short); emit("short"); }

  /* ══════════════ 对外接口 ══════════════ */
  window.KB_WS = {
    KEYS: K,
    on: on,
    /* 单价库 */
    mats: mats, matPrice: matPrice, matDensity: matDensity, setMat: setMat,
    toolOf: toolOf, setTool: setTool, TOOL_DEF: TOOL_DEF,
    rateTable: rateTable, setRate: setRate,
    changedCount: changedCount, resetPrice: resetPrice,
    exportPrice: exportPrice, importPrice: importPrice,
    /* 自动草稿 */
    setAuto: setAuto, getAuto: getAuto, clearAuto: clearAuto,
    /* 方案 */
    plans: function () { return plans.slice(); }, getPlan: getPlan, savePlan: savePlan,
    removePlan: removePlan, renamePlan: renamePlan, clearPlans: clearPlans, PLAN_MAX: PLAN_MAX,
    /* 计算器 */
    calcGet: calcGet, calcSet: calcSet, calcReset: calcReset,
    /* 台账 */
    projects: function () { return projects.slice(); }, getProject: getProject,
    saveProject: saveProject, removeProject: removeProject, PROJ_STATUS: PROJ_STATUS,
    /* 快捷入口 */
    shortList: shortList, shortToggle: shortToggle, shortSet: shortSet
  };
})();
