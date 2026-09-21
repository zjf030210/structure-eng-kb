/* ============================================================
 * app.js —— 页面主逻辑（原 index.html 内联脚本抽出）
 * 与全部数据脚本一同以 defer 加载：并行下载、按序执行、DOM 就绪后运行
 * ============================================================ */
/* ══════════ 把新增知识点合并进主库（不改 data.js / deep.js） ══════════
 * 支持多批新增：PLUS（第 167~186 条）、PLUS2（第 187~198 条）……
 * 以后再加一批，只要建好 KB_*_PLUS3 并在下面 BATCH 里加 "3" 即可
 * ══════════════════════════════════════════════════════════════════ */
(function(){
  try{
    const BATCH = ["", "2", "3"];

    /* ① 条目并入 KB_ITEMS */
    const has = new Set(KB_ITEMS.map(x=>x.name));
    BATCH.forEach(b => {
      const P = window["KB_ITEMS_PLUS" + b] || [];
      P.forEach(it=>{ if(!has.has(it.name)){ KB_ITEMS.push(it); has.add(it.name); } });
    });

    /* ② 五张以「条目名」为键的表并入 */
    const mergeAll = (target, base) => {
      if(!target) return;
      BATCH.forEach(b => {
        const s = window[base + b];
        if(!s) return;
        Object.keys(s).forEach(k=>{ if(target[k] === undefined) target[k] = s[k]; });
      });
    };
    mergeAll(window.KB_DEEP, "KB_DEEP_PLUS");
    mergeAll(window.KB_NUM,  "KB_NUM_PLUS");
    mergeAll(window.KB_REL,  "KB_REL_PLUS");
    mergeAll(window.KB_MEMO, "KB_MEMO_PLUS");
    mergeAll(window.KB_TASK, "KB_TASK_PLUS");

    /* ③ 学习地图归位（键为「领域id|层序号」） */
    BATCH.forEach(b => {
      const MP = window["KB_MAP_PLUS" + b] || {};
      Object.keys(MP).forEach(key=>{
        const p = key.split("|"), d = (window.KB_MAP||[]).find(x=>x.id===p[0]);
        if(!d || !d.layers[+p[1]]) return;
        const items = d.layers[+p[1]].items;
        MP[key].forEach(x=>{ if(!items.some(y=>y.n===x.n)) items.push(x); });
      });
    });

    /* ④ 把术语词典的 英文↔中文 并入同义词表，让英文检索也能命中 */
    const syn = window.KB_SYN = window.KB_SYN || [];
    const seenPair = new Set(syn.map(g=>g.join("|")));
    (window.KB_GLOSS||[]).forEach(g=>{
      if(!g.en || !g.cn) return;
      const pair = g.en + "|" + g.cn;
      if(seenPair.has(pair)) return;
      syn.push([g.en, g.cn]);
      seenPair.add(pair);
    });
  }catch(e){ console.warn("合并新增数据失败：", e); }
})();

const DC = {
  material:     {c:"#d97706", s:"#b45309", w:"#fff7ed"},
  manufacturing:{c:"#7c3aed", s:"#6d28d9", w:"#f5f3ff"},
  mold:         {c:"#0891b2", s:"#0e7490", w:"#ecfeff"},
  design:       {c:"#2563eb", s:"#1d4ed8", w:"#eff4ff"},
  drawing:      {c:"#64748b", s:"#475569", w:"#f8fafc"},
  surface:      {c:"#db2777", s:"#be185d", w:"#fdf2f8"},
  optic:        {c:"#ea580c", s:"#c2410c", w:"#fff7ed"},
  thermal:      {c:"#dc2626", s:"#b91c1c", w:"#fef2f2"},
  safety:       {c:"#059669", s:"#047857", w:"#ecfdf5"},
  test:         {c:"#0d9488", s:"#0f766e", w:"#f0fdfa"},
  pack:         {c:"#9333ea", s:"#7e22ce", w:"#faf5ff"},
  cost:         {c:"#ca8a04", s:"#a16207", w:"#fefce8"},
};
function dc(id){ return DC[id] || {c:"#2563eb", s:"#1d4ed8", w:"#eff4ff"}; }

const kw = document.getElementById("kw");
const lvFilter = document.getElementById("lvFilter");
const stFilter = document.getElementById("stFilter");
const backBtn = document.getElementById("backBtn");
const homeView = document.getElementById("homeView");
const stepView = document.getElementById("stepView");
const domainView = document.getElementById("domainView");
const searchView = document.getElementById("searchView");
const domainsEl = document.getElementById("domains");
const homeStatsEl = document.getElementById("homeStats");
const domainHeadEl = document.getElementById("domainHead");
const abListEl = document.getElementById("abList");
const chipsEl = document.getElementById("chips");
const tbody = document.getElementById("tbody");
const statsEl = document.getElementById("stats");
const emptyEl = document.getElementById("empty");
const searchTbody = document.getElementById("searchTbody");
const searchStatsEl = document.getElementById("searchStats");
const searchEmptyEl = document.getElementById("searchEmpty");

// ── 新模块元素 ──
const navbar = document.getElementById("navbar");
const quickView = document.getElementById("quickView");
const checkView = document.getElementById("checkView");
const caseView = document.getElementById("caseView");
const glossView = document.getElementById("glossView");
const pathView = document.getElementById("pathView");
const mapView = document.getElementById("mapView");
const quizView = document.getElementById("quizView");
const dailyView = document.getElementById("dailyView");
const reviewView = document.getElementById("reviewView");
const compareView = document.getElementById("compareView");
const calcView = document.getElementById("calcView");
const fieldView = document.getElementById("fieldView");
const galleryView = document.getElementById("galleryView");
const selectView = document.getElementById("selectView");
const formulaView = document.getElementById("formulaView");
const wrongView = document.getElementById("wrongView");
const statsView = document.getElementById("statsView");
const tplView = document.getElementById("tplView");
const favView = document.getElementById("favView");
const KB_VIEWS = [homeView, domainView, searchView];
const MOD_VIEWS = {quick:quickView, check:checkView, case:caseView, gloss:glossView, path:pathView,
                   map:mapView, quiz:quizView, calc:calcView, field:fieldView, gallery:galleryView,
                   select:selectView, formula:formulaView, wrong:wrongView, stats:statsView,
                   tpl:tplView, fav:favView, daily:dailyView, review:reviewView, compare:compareView,
                   step:stepView};

let activeModule = "kb";
let activeQuick = (window.KB_QUICK && KB_QUICK[0] ? KB_QUICK[0].id : "");
let activeCase  = (window.KB_CASES && KB_CASES[0] ? KB_CASES[0].id : "");
let activeChk   = (window.KB_CHECKS && KB_CHECKS[0] ? KB_CHECKS[0].id : "");
let activeMap   = (window.KB_MAP && KB_MAP[0] ? KB_MAP[0].id : "");
let activeQuiz  = (window.KB_QUIZ && KB_QUIZ[0] ? KB_QUIZ[0].id : "");
let activeField = "mistake";
let glCat = "全部";
let activeSel   = (window.KB_SELECT && KB_SELECT[0] ? KB_SELECT[0].id : "");
let activeFm    = (window.KB_FORMULA && KB_FORMULA[0] ? KB_FORMULA[0].cat : "");

let activeDomain = null;
let activeSub = "all";
let browseAll = false;
let currentList = null;   // 详情面板上/下一条所依据的列表
let activeTpl = (window.KB_TEMPLATE && KB_TEMPLATE[0] ? KB_TEMPLATE[0].id : "");
let wrongDom = "all";
let favTab = "fav";
let curDetail = null;     // 当前详情面板打开的知识点

const CAT_NAME = Object.fromEntries(KB_CATS.map(c=>[c.id,c.name]));
const CAT_DOMAIN = {};
KB_DOMAINS.forEach(d=>d.subs.forEach(s=>CAT_DOMAIN[s]=d));

const LS_KEY = "kb-progress-v1";
let progress = {};
try{ progress = JSON.parse(localStorage.getItem(LS_KEY) || "{}"); }catch(e){ progress = {}; }
function getSt(name){ return progress[name] || 0; }
function setSt(name, v){ progress[name] = v; localStorage.setItem(LS_KEY, JSON.stringify(progress)); }
function cycleSt(name){ setSt(name, (getSt(name)+1) % 3); markStudy(1); renderAll(); }

/* ── 本机存储：主题 / 收藏 / 笔记 / 模板草稿 ── */
const LS_THEME = "kb-theme-v1", LS_FAV = "kb-fav-v1", LS_NOTE = "kb-note-v1", LS_TPL = "kb-tpl-v1";
const LS_RECENT = "kb-recent-v1", LS_SEARCH = "kb-search-v1", LS_STREAK = "kb-streak-v1";
function lsGet(k, dft){ try{ const v = JSON.parse(localStorage.getItem(k) || "null"); return v === null ? dft : v; }catch(e){ return dft; } }
function lsSet(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} }

let theme = lsGet(LS_THEME, "light");
let favs = lsGet(LS_FAV, {});          // { 条目名: 收藏时间戳 }
let notes = lsGet(LS_NOTE, {});        // { 条目名: 文本 }
/* 「还没搞懂」的标记：和「已掌握」是两回事 —— 那是学会了，这是还没学会 */
const LS_DOUBT = "kb-doubt-v1";
let doubts = lsGet(LS_DOUBT, {});      // { 条目名: 时间戳 }
let tplDraft = lsGet(LS_TPL, {});      // { "模板id|块序号|行|列": "填写内容" }
let recents = lsGet(LS_RECENT, []);    // [ { n:条目名, t:时间戳 } ]  最多 30 条
let searchHist = lsGet(LS_SEARCH, []); // [ 关键词 ]  最多 12 条
let streak = lsGet(LS_STREAK, {});     // { "YYYY-MM-DD": 动作次数 }
function favOn(n){ return !!favs[n]; }
function favCount(){ return Object.keys(favs).length; }
function noteCount(){ return Object.values(notes).filter(x => x && x.trim()).length; }
function doubtCount(){ return Object.keys(doubts).length; }
function doubtOn(name){ return !!doubts[name]; }
function todayStr(d0){
  const d = d0 || new Date();
  return d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0");
}
/* 学习打卡：任何「学习动作」都会记一次（打开知识点 / 答题 / 勾清单 / 切状态 / 收藏 / 写笔记） */
function markStudy(step){
  const d = todayStr();
  streak[d] = (streak[d] || 0) + (step || 1);
  lsSet(LS_STREAK, streak);
  return streak[d];
}
function streakDays(){
  let n = 0;
  const d = new Date();
  if(!streak[todayStr(d)]) d.setDate(d.getDate() - 1);   // 今天还没学，则从昨天开始数（连续未断）
  while(streak[todayStr(d)]){ n++; d.setDate(d.getDate() - 1); }
  return n;
}
function streakTotal(){ return Object.keys(streak).length; }
function pushRecent(name){
  if(!name) return;
  recents = recents.filter(x => x.n !== name);
  recents.unshift({ n: name, t: Date.now() });
  if(recents.length > 30) recents = recents.slice(0, 30);
  lsSet(LS_RECENT, recents);
}
function pushSearchHist(q){
  q = (q || "").trim();
  if(q.length < 2) return;
  searchHist = searchHist.filter(x => x !== q);
  searchHist.unshift(q);
  if(searchHist.length > 12) searchHist = searchHist.slice(0, 12);
  lsSet(LS_SEARCH, searchHist);
  renderSearchHist();
}
function applyTheme(){
  document.documentElement.setAttribute("data-theme", theme);
  const b = document.getElementById("themeBtn");
  if(b) b.innerHTML = theme === "dark"
    ? '<svg class=ic aria-hidden=true><use href=#i-sun /></svg>'
    : '<svg class=ic aria-hidden=true><use href=#i-moon /></svg>';
  /* 3D 预览的画布不受 CSS 变量影响，需要主动通知重绘 */
  if(typeof window.KB_STEP_THEME === "function") window.KB_STEP_THEME(theme === "dark");
}
applyTheme();

const ST_TXT = ["待学习","学习中","已掌握"];
const LV_TXT = {1:"核心必会",2:"进阶掌握",3:"了解即可"};
const LV_ORDER = {1:0, 2:1, 3:2};
const LV_NAME = {1:"一级",2:"二级",3:"三级"};

function esc(s){return (s==null?"":String(s)).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");}
/* 高亮：支持一次高亮多个词（同义词扩展后的结果） */
function hlm(text, terms){
  const s = (text == null ? "" : String(text));
  const list = [...new Set((terms || []).filter(t => t && String(t).trim()).map(String))]
    .sort((a, b) => b.length - a.length);
  if(!list.length) return esc(s);
  let re;
  try{ re = new RegExp("(" + list.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|") + ")", "gi"); }
  catch(e){ return esc(s); }
  return s.split(re).map((part, i) => (i % 2 ? "<mark>" + esc(part) + "</mark>" : esc(part))).join("");
}
/* 对已是 HTML 的片段做高亮（避开标签内部） */
function markInHTML(html, terms){
  if(html == null) return "";
  const list = [...new Set((terms || []).filter(t => t && String(t).trim().length >= 2).map(String))]
    .sort((a, b) => b.length - a.length);
  if(!list.length) return String(html);
  let re;
  try{ re = new RegExp("(" + list.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|") + ")(?![^<]*>)", "gi"); }
  catch(e){ return String(html); }
  return String(html).replace(re, "<mark>$1</mark>");
}
function hl(text, q){ return hlm(text, Array.isArray(q) ? q : (q ? [q] : [])); }

/* 同义词扩展：把用户输入扩展成一组等价词（含术语词典的英文↔中文） */
function synExpand(q){
  const s = (q || "").trim();
  if(!s) return [];
  const lq = s.toLowerCase();
  const out = new Set([s]);
  const groups = window.KB_SYN || [];
  for(const g of groups){
    if(out.size > 26) break;
    let hitG = false;
    for(const t0 of g){
      const lt = String(t0).toLowerCase();
      if(lt.length < 2) continue;
      if(lt === lq || (lt.length >= 3 && lq.length >= 3 && (lt.includes(lq) || lq.includes(lt)))){ hitG = true; break; }
    }
    if(hitG) g.forEach(t => { if(String(t).trim().length >= 1) out.add(String(t)); });
  }
  return [...out];
}
/* 用扩展词做「是否命中」判断 */
function makeHit(terms){
  const list = terms.map(t => t.toLowerCase()).filter(Boolean);
  return s => { const t = (s == null ? "" : String(s)).toLowerCase(); return list.some(x => t.includes(x)); };
}
function refreshBadges(){
  const f = document.getElementById("nbFav"); if(f) f.textContent = favCount() + " 条";
  const w = document.getElementById("nbWrong"); if(w) w.textContent = wrongList().length + " 题";
  const dl = document.getElementById("nbDaily");
  if(dl){ const s = d20StatOf(d20Today()); dl.textContent = s.done + "/" + D20_N; }
  const rvb = document.getElementById("nbReview");
  if(rvb){ const n = rvDue().length; rvb.textContent = n ? n + " 题" : "0 题"; }
}
function domainItems(d){ return KB_ITEMS.filter(it=>d.subs.includes(it.cat)); }
function sortByLv(list){ return [...list].sort((a,b)=> LV_ORDER[a.lv]-LV_ORDER[b.lv]); }

// 图片路径工具：主图缩略图（列表用 3.5KB） / 参考图缩略图（图库用，约为原图一半）
function thumbOf(p){
  if(!p || p.indexOf("images/") !== 0 || p.indexOf("images/ref/") === 0 || p.indexOf("images/thumb/") === 0) return p || "";
  return "images/thumb/" + p.slice(7).replace(/\.(jpe?g|png)$/i, ".jpg");
}
function refThumbOf(p){
  if(!p || p.indexOf("images/ref/") !== 0) return p || "";
  return p.replace("images/ref/", "images/ref/thumb/").replace(/\.(jpe?g|png)$/i, ".jpg");
}

// 平台配色
const PLAT = {
  "B站":    {cls:"bili",    label:"B站",    enc: kw => "https://search.bilibili.com/all?keyword=" + encodeURIComponent(kw)},
  "YouTube":{cls:"yt",      label:"YouTube",enc: kw => "https://www.youtube.com/results?search_query=" + encodeURIComponent(kw)},
  "腾讯视频":{cls:"qqv",    label:"腾讯视频",enc: kw => "https://v.qq.com/search.html?query=" + encodeURIComponent(kw)},
  "百度":   {cls:"bh",      label:"百度",   enc: kw => "https://haokan.baidu.com/haokan/search?query=" + encodeURIComponent(kw)},
};

// 深度解析小节定义与渲染
const DEEP_DEF = {
  p:{t:"<svg class=ic aria-hidden=true><use href=#i-compass /></svg>核心原理",          c:"#2563eb", bg:"#eff4ff"},
  k:{t:"<svg class=ic aria-hidden=true><use href=#i-ruler /></svg>关键参数与公式",     c:"#7c3aed", bg:"#f5f3ff"},
  e:{t:"<svg class=ic aria-hidden=true><use href=#i-settings /></svg>实战经验值",        c:"#059669", bg:"#ecfdf5"},
  f:{t:"<svg class=ic aria-hidden=true><use href=#i-alert /></svg>常见错误与避坑",     c:"#dc2626", bg:"#fef2f2"},
  s:{t:"<svg class=ic aria-hidden=true><use href=#i-book /></svg>相关标准与术语",     c:"#d97706", bg:"#fffbeb"}
};
/* ══════════════ 三句话速览：把「要点 + 关键数值 + 实操提醒」前置 ══════════════
   内容全部来自已有数据（points / KB_DEEP 的 k、e、f），不新增未经核实的信息 ——
   知识库的可信度比字数重要。 */
function renderBrief(it){
  const sec = document.getElementById("dpBriefSec"), box = document.getElementById("dpBrief");
  if(!sec || !box) return;
  const d = (window.KB_DEEP || {})[it.name] || {};
  const clip = (s, n) => {
    s = String(s || "").trim();
    return s.length > n ? s.slice(0, n).replace(/[，,、；;]$/, "") + "…" : s;
  };
  const rows = [];
  /* 01 取「原理」而非 points —— points 在下方「核心要点」已有，重复展示没有信息增量 */
  const p0 = (Array.isArray(d.p) && d.p[0]);
  if(p0) rows.push({ k: "核心原理", t: clip(String(p0).replace(/^[^:：]{1,10}[：:]s*/, ""), 96) });
  const k0 = (Array.isArray(d.k) && d.k[0]);
  if(k0) rows.push({ k: "关键数值", t: clip(k0, 96) });
  const e0 = (Array.isArray(d.e) && d.e[0]) || (Array.isArray(d.f) && d.f[0]);
  if(e0) rows.push({ k: "实操提醒", t: clip(e0, 96) });
  if(rows.length < 2){ sec.style.display = "none"; return; }
  sec.style.display = "";
  box.innerHTML = rows.map((r, i) =>
    "<div class=\"bf-item\"><span class=\"bf-n\">" + String(i + 1).padStart(2, "0") + "</span><div>"
    + "<span class=\"bf-k\">" + esc(r.k) + "</span>" + esc(r.t) + "</div></div>").join("");
}
function renderDeep(it){
  const sec = document.getElementById("dpDeepSec"), box = document.getElementById("dpDeep");
  const d = it.deep || (window.KB_DEEP || {})[it.name];
  if(!d){ sec.style.display = "none"; return; }
  const parts = Object.keys(DEEP_DEF).filter(k=>d[k] && (Array.isArray(d[k])? d[k].filter(x=>x&&String(x).trim()).length>0 : String(d[k]).trim()));
  if(!parts.length){ sec.style.display = "none"; return; }
  sec.style.display = "";
  box.innerHTML = parts.map(k=>{
    const def = DEEP_DEF[k];
    const arr = Array.isArray(d[k]) ? d[k] : [d[k]];
    const lis = arr.filter(x=>x && String(x).trim()).map(x=>{
      const s = String(x).trim();
      const m = s.match(/^([^:：]{1,10})[：:]\s*([\s\S]+)$/);
      const inner = m
        ? `<span class="tag" style="--d-c:${def.c};--d-bg:${def.bg}">${esc(m[1])}</span>${esc(m[2])}`
        : esc(s);
      return `<li>${inner}</li>`;
    }).join("");
    return `<div class="d-item"><h5 style="--d-c:${def.c};--d-bg:${def.bg}">${def.t}</h5><ul>${lis}</ul></div>`;
  }).join("");
}

// 经验数值 + 关联知识点
function renderNumRel(it){
  const nSec = document.getElementById("dpNumSec"), nBox = document.getElementById("dpNum");
  const arr = (window.KB_NUM || {})[it.name];
  if(arr && arr.length){
    nSec.style.display = "";
    nBox.innerHTML = arr.map((s,i)=>`<div class="n-item"><span class="ni">${String(i+1).padStart(2,"0")}</span><span>${esc(s)}</span></div>`).join("");
  }else{
    nSec.style.display = "none";
  }
  const rSec = document.getElementById("dpRelSec"), rBox = document.getElementById("dpRel");
  const rel = ((window.KB_REL || {})[it.name] || []).filter(n=>KB_ITEMS.some(x=>x.name===n));
  if(rel.length){
    rSec.style.display = "";
    rBox.innerHTML = rel.map(n=>`<button class="rel-chip" data-rel="${esc(n)}">${esc(n)} →</button>`).join("");
  }else{
    rSec.style.display = "none";
  }
  // 动手练习
  const tSec = document.getElementById("dpTaskSec"), tBox = document.getElementById("dpTask");
  const taskRaw = (window.KB_TASK || {})[it.name];
  if(taskRaw){
    const task = normTask(taskRaw);
    tSec.style.display = "";
    tBox.innerHTML = `<div class="task-box">
      <div class="tb-t">${esc(task.t)}</div>
      <div class="tb-d">${esc(task.d)}</div>
      <ul class="tb-k">${(task.k||[]).map(x=>`<li>${esc(x)}</li>`).join("")}</ul>
    </div>`;
  }else{
    tSec.style.display = "none";
  }
}
/* KB_TASK 历史上出现过三种写法：{t,d,k} 对象、纯字符串、字符串数组。
 * 后两批新增用了字符串/数组，旧渲染层读 task.t 得到 undefined → esc() 返回空串，
 * 结果是「动手练习」区块显示成一个空框（不报错，所以一直没被发现）。
 * 这里统一归一化成 {t,d,k}，并把「验收：」之后的部分自动拆成验收点。 */
function normTask(x){
  const split = s => {
    const str = String(s == null ? "" : s).trim();
    const i = str.search(/验收[：:]/);
    if(i < 0) return { d: str, k: [] };
    const rest = str.slice(i).replace(/^验收[：:]\s*/, "");
    const parts = rest.split(/\s*(?=[\u2460-\u2473])|\s+(?=\d[)）])/)
      .map(t => t.replace(/^[\u2460-\u2473]\s*/, "").trim()).filter(Boolean);
    return { d: str.slice(0, i).trim(), k: parts.length ? parts : [rest] };
  };
  if(typeof x === "string"){ const r = split(x); return { t: "动手练习", d: r.d, k: r.k }; }
  if(Array.isArray(x)) return { t: "动手练习", d: "逐项完成，每项都要留下可验证的结果（数据 / 图纸 / 结论）：", k: x.map(s => String(s).trim()) };
  return { t: x.t || "动手练习", d: x.d || "", k: x.k || [] };
}
function openItemByName(name){
  const it = KB_ITEMS.find(x=>x.name===name);
  if(!it) return;
  if(document.body.classList.contains("detail-open")){
    document.querySelector(".dp-body").scrollTop = 0;
  }
  openDetail(it);
}

// 详情面板
function openDetail(it){
  const d = CAT_DOMAIN[it.cat], col = dc(d.id);
  const panel = document.getElementById("detailPanel");
  panel.style.setProperty("--dp-c", col.c);
  panel.style.setProperty("--dp-s", col.s);
  const stv = getSt(it.name);
  document.getElementById("dpLv").textContent = LV_TXT[it.lv];
  document.getElementById("dpLv").className = "lv-mini lv" + it.lv;
  document.getElementById("dpDom").innerHTML = `${d.icon} <b>${d.name}</b> · ${CAT_NAME[it.cat]}`;
  document.getElementById("dpName").textContent = it.name;
  const stEl = document.getElementById("dpSt");
  stEl.className = "st st" + stv;
  stEl.innerHTML = '<span class="dot"></span>' + ST_TXT[stv] + "（点击切换）";
  stEl.onclick = () => { cycleSt(it.name); openDetail(it); };
  document.getElementById("dpExtra").textContent = `共 ${(it.videos||[]).length} 个视频源 · ${it.img? "已配置示意图" : "暂未配图"}`;
  document.getElementById("dpPoints").textContent = it.points;
  document.getElementById("dpUsage").textContent = it.usage;
  // 一句话记忆
  const memo = (window.KB_MEMO || {})[it.name];
  const memoSec = document.getElementById("dpMemoSec");
  if(memo){ memoSec.style.display = ""; document.getElementById("dpMemo").textContent = memo; }
  else { memoSec.style.display = "none"; }
  renderBrief(it);
  renderDeep(it);
  renderNumRel(it);
  // 视频列表
  document.getElementById("dpVideos").innerHTML = (it.videos||[]).map(v => {
    const cfg = PLAT[v.p] || {cls:"other", label:v.p};
    return `<a class="vid-card" href="${esc(v.u)}" target="_blank" rel="noopener">
      <div class="vid-logo ${cfg.cls}">${esc(cfg.label.slice(0,2))}</div>
      <div class="vid-info">
        <div class="vt">${esc(v.t)}</div>
        <div class="vp"><span>${esc(v.p)}</span><span>·</span><span>${esc(v.u.length > 60 ? v.u.slice(0,60)+"…" : v.u)}</span></div>
      </div>
      <span class="vid-arrow">›</span>
    </a>`;
  }).join("") || '<div style="font-size:13px;color:var(--sub);padding:10px 0">暂未配置视频链接</div>';
  // 图片区
  const imgEl = document.getElementById("dpImg");
  if(it.img){
    imgEl.innerHTML = `<img src="${esc(it.img)}" alt="${esc(it.name)}" loading="lazy" decoding="async">`;
  }else{
    imgEl.innerHTML = `<div class="ph"><b><svg class=ic aria-hidden=true><use href=#i-camera /></svg> 暂无示意图</b>可通过下方按钮搜索或让 AI 生成</div>`;
  }
  const kwTxt = (it.imgKw || it.name).split("/").map(s=>s.trim()).filter(Boolean);
  document.getElementById("dpKw").textContent = kwTxt.join(" · ");
  document.getElementById("dpImgBtns").innerHTML = `
    <a href="https://pixabay.com/zh/images/search/${encodeURIComponent(it.name)}/" target="_blank" rel="noopener"><svg class=ic aria-hidden=true><use href=#i-search /></svg>Pixabay 搜图</a>
    <a href="https://www.pexels.com/zh-cn/search/${encodeURIComponent(it.name)}/" target="_blank" rel="noopener"><svg class=ic aria-hidden=true><use href=#i-search /></svg>Pexels 搜图</a>
    <a href="https://huaban.com/search/?q=${encodeURIComponent(it.name)}" target="_blank" rel="noopener"><svg class=ic aria-hidden=true><use href=#i-search /></svg>花瓣 搜图</a>
    <button class="ai" id="aiGenBtn"><svg class=ic aria-hidden=true><use href=#i-cpu /></svg>AI 提示词</button>`;
  document.getElementById("aiGenBtn").onclick = () => {
    document.getElementById("aiPromptText").textContent = it.imgAi || `工程示意图：${it.name}。线条简洁、白底、轴侧视角，关键部件引出标注。`;
    document.getElementById("aiModal").classList.add("open");
  };
  // 参考图集
  renderRef(it);
  dpNavUpdate(it);
  updateAnchors();
  // 收藏 / 笔记 / 打印
  curDetail = it;
  pushRecent(it.name);
  markStudy(1);
  renderDpActions(it);
  const ta = document.getElementById("dpNote");
  if(ta){
    ta.value = notes[it.name] || "";
    ta.oninput = ()=>{
      notes[it.name] = ta.value;
      clearTimeout(noteTimer);
      noteTimer = setTimeout(()=>{ lsSet(LS_NOTE, notes); refreshBadges(); }, 500);
      const nj = document.getElementById("dpNoteJump");
      // ⚠️ 这里必须用 innerHTML：图标是 <svg> 标签，用 textContent 会把源码当文字显示出来
      if(nj) nj.innerHTML = ta.value.trim() ? `<svg class=ic aria-hidden=true><use href=#i-edit /></svg>笔记（${ta.value.trim().length} 字）` : "<svg class=ic aria-hidden=true><use href=#i-edit /></svg>写笔记";
    };
    ta.onblur = ()=>{ lsSet(LS_NOTE, notes); refreshBadges(); renderDpActions(it); };
  }
  document.body.classList.add("detail-open");
}
let noteTimer = null;

// 详情面板：上一条 / 下一条
function dpNavUpdate(it){
  const names = (currentList && currentList.length) ? currentList : KB_ITEMS.map(x=>x.name);
  const i = names.indexOf(it.name);
  const prev = i > 0 ? names[i-1] : null;
  const next = (i >= 0 && i < names.length-1) ? names[i+1] : null;
  const bp = document.getElementById("dpPrev"), bn = document.getElementById("dpNext");
  bp.disabled = !prev; bn.disabled = !next;
  bp.textContent = prev ? "‹ " + (prev.length>9? prev.slice(0,9)+"…" : prev) : "‹ 上一条";
  bn.textContent = next ? (next.length>9? next.slice(0,9)+"…" : next) + " ›" : "下一条 ›";
  bp.onclick = prev ? ()=>openItemByName(prev) : null;
  bn.onclick = next ? ()=>openItemByName(next) : null;
}

// 详情面板：区块快速跳转
const DP_ANCHORS = [
  {id:"secPoints", t:"<svg class=ic aria-hidden=true><use href=#i-pin /></svg>要点"}, {id:"secUsage", t:"<svg class=ic aria-hidden=true><use href=#i-bulb /></svg>应用"},
  {id:"dpNumSec", t:"<svg class=ic aria-hidden=true><use href=#i-hash /></svg>数值"},  {id:"dpDeepSec", t:"<svg class=ic aria-hidden=true><use href=#i-book-open /></svg>深度"},
  {id:"dpRelSec", t:"<svg class=ic aria-hidden=true><use href=#i-link /></svg>关联"},  {id:"dpTaskSec", t:"<svg class=ic aria-hidden=true><use href=#i-edit /></svg>练习"},
  {id:"secVideos", t:"<svg class=ic aria-hidden=true><use href=#i-play /></svg>视频"}, {id:"dpRefSec", t:"<svg class=ic aria-hidden=true><use href=#i-camera /></svg>图集"},
  {id:"secNote", t:"<svg class=ic aria-hidden=true><use href=#i-file-text /></svg>笔记"}
];
function updateAnchors(){
  const box = document.getElementById("dpAnchors");
  const vis = DP_ANCHORS.filter(a=>{
    const el = document.getElementById(a.id);
    return el && el.style.display !== "none" && el.textContent.trim().length > 2;
  });
  box.innerHTML = vis.map(a=>`<button data-sec="${a.id}">${a.t}</button>`).join("");
  box.style.display = vis.length ? "" : "none";
}

// 参考图集渲染
function refCount(name){ const a=(window.KB_IMG||{})[name]; return a? a.length : 0; }
function renderRef(it){
  const sec = document.getElementById("dpRefSec"), grid = document.getElementById("dpRefGrid"), cnt = document.getElementById("dpRefCount");
  const arr = (window.KB_IMG || {})[it.name] || [];
  if(!arr.length){ sec.style.display = "none"; return; }
  sec.style.display = "";
  cnt.textContent = arr.length + " 张";
  grid.innerHTML = arr.map(x=>`<div class="ref-card" data-ref="${esc(x.f)}" data-cap="${esc(x.t)}" data-src="${esc(x.s||"")}">
    <div class="rc-img"><img src="${esc(x.f)}" alt="${esc(x.t)}" loading="lazy" decoding="async"></div>
    <div class="rc-cap">${esc(x.t)}</div>
    <div class="rc-src">来源：${esc(x.s||"—")}</div>
  </div>`).join("");
}

function closeDetail(){
  document.body.classList.remove("detail-open");
}
document.getElementById("dpClose").onclick = closeDetail;
document.getElementById("detailBackdrop").onclick = closeDetail;
document.addEventListener("keydown", e => {
  if(e.key === "Escape"){
    const im = document.getElementById("imgModal");
    const dm = document.getElementById("donateModal");
    const am = document.getElementById("aiModal");
    if(im && im.classList.contains("open")) im.classList.remove("open");
    else if(dm && dm.classList.contains("open")) dm.classList.remove("open");
    else if(am && am.classList.contains("open")) am.classList.remove("open");
    else if(document.body.classList.contains("detail-open")) closeDetail();
  }
});

// 首页
function renderHome(){
  const total = KB_ITEMS.length;
  const mastered = KB_ITEMS.filter(it=>getSt(it.name)===2).length;
  const learning = KB_ITEMS.filter(it=>getSt(it.name)===1).length;
  const core = KB_ITEMS.filter(it=>it.lv===1).length;
  homeStatsEl.innerHTML =
    `<div class="hs"><b>${KB_DOMAINS.length}</b><span>领域</span></div>` +
    `<div class="hs"><b>${total}</b><span>知识点</span></div>` +
    `<div class="hs"><b>${core}</b><span>核心必会</span></div>` +
    `<div class="hs"><b>${mastered}</b><span>已掌握</span></div>` +
    `<div class="hs"><b>${learning}</b><span>学习中</span></div>` +
    `<div class="hs"><b>${total?Math.round(mastered/total*100):0}%</b><span>总掌握率</span></div>`;

  // ── 内容总览 ──
  const ovCount = (fn,arr)=>arr.reduce(fn,0);
  const OVERVIEW = [
    {n:total, l:"知识点", mod:"kb"},
    {n:ovCount((a,b)=>a+b.length, Object.values(window.KB_IMG||{})), l:"参考图", mod:"gallery"},
    /* 题库是懒加载的：没到位时先显示「—」，别显示一个偏小的错数字（曾显示 120） */
    {n:dataReady("quiz") ? ovCount((a,p)=>a+quizTotal(p), KB_QUIZ) : "-", l:"自测题", mod:"quiz"},
    {n:D20_N, l:"每日练习题", mod:"daily"},
    {n:(typeof CALCS!=="undefined"?CALCS.length:0), l:"计算器", mod:"calc"},
    {n:ovCount((a,d)=>a+d.layers.reduce((x,l)=>x+l.items.length,0), KB_MAP), l:"地图条目", mod:"map"},
    {n:ovCount((a,w)=>a+w.days.length, KB_PATH), l:"天学习计划", mod:"path"},
    {n:KB_QUICK.length, l:"速查表", mod:"quick"},
    {n:ovCount((a,c)=>a+c.groups.reduce((x,g)=>x+g.items.length,0), KB_CHECKS), l:"检查项", mod:"check"},
    {n:KB_CASES.length, l:"整机案例", mod:"case"},
    {n:KB_GLOSS.length, l:"术语", mod:"gloss"},
    {n:ovCount((a,x)=>a+x.items.length, KB_TROUBLE), l:"缺陷排查", mod:"field", f:"trouble"},
    {n:ovCount((a,x)=>a+x.items.length, (window.KB_MISTAKE||[])), l:"设计避坑", mod:"field", f:"mistake"},
    {n:ovCount((a,x)=>a+x.items.length, KB_INTERVIEW), l:"面试题", mod:"field", f:"interview"},
    {n:ovCount((a,x)=>a+x.items.length, KB_STD), l:"标准", mod:"field", f:"std"},
    {n:(window.KB_SELECT||[]).length, l:"选型决策树", mod:"select"},
    {n:ovCount((a,g)=>a+(g.items||[]).length,(window.KB_FORMULA||[])) + ovCount((a,g)=>a+(g.items||[]).length,(window.KB_UNIT||[])), l:"公式与单位", mod:"formula"},
    {n:Object.keys(window.KB_MEMO||{}).length, l:"一句话记忆", mod:"kb"},
    {n:Object.keys(window.KB_DOMAIN_GUIDE||{}).length, l:"领域导读", mod:"kb"},
    {n:Object.keys(window.KB_TASK||{}).length, l:"动手练习", mod:"kb"},
    {n:(window.KB_TEMPLATE||[]).length, l:"实战模板", mod:"tpl"},
    {n:wrongList().length, l:"待复习错题", mod:"wrong"},
    {n:favCount(), l:"我的收藏", mod:"fav"}
  ];
  document.getElementById("panelOverview").innerHTML = `
    <h3><svg class=ic aria-hidden=true><use href=#i-box /></svg>内容总览</h3>
    <div class="pdesc">点任意数字直接进入对应模块</div>
    <div class="stat-grid">${OVERVIEW.map(o=>`
      <div class="stat-item" data-mod="${o.mod}" ${o.f?`data-field="${o.f}"`:""}>
        <b>${o.n}</b><span>${o.l}</span></div>`).join("")}</div>`;
  document.getElementById("panelOverview").querySelectorAll(".stat-item").forEach(el=>{
    el.onclick = ()=>{
      activeModule = el.dataset.mod;
      if(el.dataset.field) activeField = el.dataset.field;
      if(activeModule === "kb"){ browseAll=false; activeDomain=null; }
      renderAll();
      window.scrollTo({top:0, behavior:"smooth"});
    };
  });

  // ── 学习进度 ──
  let qTotal=0, qDone=0, qRight=0;
  KB_QUIZ.forEach(p=>{
    const a = quizState[p.id] || {};
    for(let i=0;i<quizTotal(p);i++){
      const q = quizAt(p,i); if(!q) continue;
      qTotal++; if(a[i]!==undefined){ qDone++; if(a[i]===q.a) qRight++; }
    }
  });
  let cTotal=0, cOn=0;
  KB_CHECKS.forEach(c=>{ const r = chkCount(c); cTotal += r.total; cOn += r.on; });
  const domRows = KB_DOMAINS.map(d=>{
    const items = domainItems(d);
    const m = items.filter(it=>getSt(it.name)===2).length;
    return {d, pct: items.length? Math.round(m/items.length*100):0, m, n: items.length};
  });
  const qPct = qDone? Math.round(qRight/qDone*100):0;
  const cPct = cTotal? Math.round(cOn/cTotal*100):0;

  // 下一步建议
  const weak = KB_QUIZ.map(p=>{
    const a = quizState[p.id] || {};
    let dn=0, rt=0;
    for(let i=0;i<quizTotal(p);i++){
      const q = quizAt(p,i); if(!q) continue;
      if(a[i]!==undefined){ dn++; if(a[i]===q.a) rt++; }
    }
    return {p, dn, pct: dn? Math.round(rt/dn*100):-1};
  }).filter(x=>x.dn>=5).sort((a,b)=>a.pct-b.pct)[0];
  const zeroDom = domRows.filter(r=>r.pct===0)[0];
  let advice;
  if(qDone === 0) advice = `先做一次 <b>「塑料材料」自测（10 题）</b>摸清底子，再按学习地图从第 1 层开始。`;
  else if(weak && weak.pct < 60) advice = `<b>「${weak.p.name}」</b>自测正确率只有 <b>${weak.pct}%</b>（已答 ${weak.dn} 题），建议回知识库重读这一块，再用「重做错题」巩固。`;
  else if(zeroDom) advice = `<b>「${zeroDom.d.name}」</b>（${zeroDom.n} 条）还没开始，建议点开 🧭 学习地图按层级过一遍。`;
  else if(mastered < total) advice = `已掌握 ${mastered}/${total} 条，还剩 <b>${total-mastered}</b> 条。保持每天 5-8 条的速度即可。`;
  else advice = `🎉 ${total} 条全部掌握！去「💼 实战宝典」用 35 道面试题检验一下，再去「🎯 自测题库」冲满分。`;
  const barColor = p=> p>=80 ? "linear-gradient(90deg,#059669,#10b981)" : p>=40 ? "linear-gradient(90deg,#d97706,#f59e0b)" : "linear-gradient(90deg,#dc2626,#ef4444)";
  document.getElementById("panelProgress").innerHTML = `
    <h3><svg class=ic aria-hidden=true><use href=#i-trending-up /></svg>我的学习进度</h3>
    <div class="pdesc">数据保存在本机浏览器，换电脑或清缓存会重置</div>
    <div class="prog-row"><span class="pl">知识掌握</span>
      <div class="prog-bar"><i style="width:${total?Math.round(mastered/total*100):0}%;background:${barColor(total?mastered/total*100:0)}"></i></div>
      <span class="pv">${mastered}/${total}</span></div>
    <div class="prog-row"><span class="pl">自测正确率</span>
      <div class="prog-bar"><i style="width:${qPct}%;background:${barColor(qPct)}"></i></div>
      <span class="pv">${qDone?qRight+"/"+qDone+" 题":"未开始"}<span style="opacity:.55"> / 共 ${qTotal}</span></span></div>
    <div class="prog-row"><span class="pl">清单完成度</span>
      <div class="prog-bar"><i style="width:${cPct}%;background:${barColor(cPct)}"></i></div>
      <span class="pv">${cOn}/${cTotal} 项</span></div>
    <div style="margin-top:13px; font-size:12px; color:var(--sub); margin-bottom:7px;">各领域掌握率</div>
    ${domRows.map(r=>`<div class="prog-row" style="margin-bottom:6px;">
      <span class="pl" style="width:96px;font-size:var(--fs-xs);">${r.d.icon} ${r.d.name}</span>
      <div class="prog-bar" style="height:6px;"><i style="width:${r.pct}%;background:${barColor(r.pct)}"></i></div>
      <span class="pv" style="width:56px;font-size:var(--fs-xs);">${r.m}/${r.n}</span></div>`).join("")}
    <div class="next-step">💡 <b>下一步建议：</b>${advice}</div>`;

  domainsEl.innerHTML = KB_DOMAINS.map(d=>{
    const items = domainItems(d);
    const m = items.filter(it=>getSt(it.name)===2).length;
    const pct = items.length ? Math.round(m/items.length*100) : 0;
    const n1 = items.filter(it=>it.lv===1).length, n2 = items.filter(it=>it.lv===2).length, n3 = items.filter(it=>it.lv===3).length;
    const col = dc(d.id);
    return `
    <div class="d-card" data-id="${d.id}" style="--dc:${col.c};--dcs:${col.s};--dcw:${col.w}">
      <div class="d-top">
        <div class="d-ic">${d.icon}</div>
        <div>
          <div class="d-nm">${d.name}</div>
          <div class="d-ct">${items.length} 个知识点 · ${d.subs.length} 个子类</div>
        </div>
        <div class="ring" style="--dcs:${col.s};--pct:${pct}" title="掌握率 ${pct}%"><i>${pct}%</i></div>
      </div>
      <div class="d-tag">${d.tagline}</div>
      <div class="d-marks">
        <span class="d-mk mk1">核心 ${n1}</span>
        <span class="d-mk mk2">进阶 ${n2}</span>
        <span class="d-mk mk3">了解 ${n3}</span>
      </div>
      <div class="d-bar"><i style="width:${pct}%"></i></div>
      <div class="d-bar-txt"><span>已掌握 ${m}/${items.length}</span><span>${d.name} →</span></div>
    </div>`;
  }).join("");
  domainsEl.querySelectorAll(".d-card").forEach(c=>{
    c.onclick = ()=>{ activeDomain = c.dataset.id; activeSub = "all"; browseAll = false; openDomain(); };
  });
  renderDaily();
  renderRecent();
  renderChangelog();
  renderHomeQuick();
}

/* ══════════════ 首页：更新日志（可折叠，默认收起） ══════════════ */
let chlogOpen = false;          // 默认收起，展开状态会保留
function renderChangelog(){
  const box = document.getElementById("panelChangelog"); if(!box) return;
  const all = window.KB_CHANGELOG || [];
  if(!all.length){ box.innerHTML = ""; return; }
  const LIMIT = 3;                       // 展开后只展示最近 3 条
  const list = all.slice(0, LIMIT);
  const rest = all.length - list.length;
  const latest = all[0];
  box.classList.toggle("open", chlogOpen);
  box.innerHTML = `
    <div class="clog-bar" id="clogBar">
      <span class="clog-t"><svg class=ic aria-hidden=true><use href=#i-refresh /></svg>最近更新</span>
      <span class="clog-h"><b>${esc(latest.d)}</b> ${esc(latest.t)}</span>
      <span class="clog-cnt">共 ${all.length} 条</span>
      <span class="clog-tg" id="clogToggle">${chlogOpen ? "收起 ▲" : "展开 ▼"}</span>
    </div>
    <div class="clog-body" id="clogBody">
      <div class="chlog">${list.map(l=>`
        <div class="cl-item">
          <div class="cl-head"><b>${esc(l.d)}</b><span>${esc(l.t)}</span></div>
          <ul>${(l.items || []).map(x=>`<li>${esc(x)}</li>`).join("")}</ul>
        </div>`).join("")}</div>
      ${rest > 0 ? `<div class="clog-more">另有 ${rest} 条更早记录</div>` : ""}
    </div>`;
  const bar = document.getElementById("clogBar");
  if(bar) bar.onclick = ()=>{
    chlogOpen = !chlogOpen;
    box.classList.toggle("open", chlogOpen);
    const tg = document.getElementById("clogToggle");
    if(tg) tg.textContent = chlogOpen ? "收起 ▲" : "展开 ▼";
  };
}

// 领域详情
/* ══════════════ 领域导读卡 ══════════════ */
let guideOpen = true;
function renderDomainGuide(d){
  const el = document.getElementById("domGuide");
  const g = (window.KB_DOMAIN_GUIDE || {})[d.id];
  if(!g){ el.innerHTML = ""; return; }
  const mapHtml = (g.map||[]).map(gr=>`
    <div class="dg-map-g">
      <div class="dg-map-t">${esc(gr.g)}</div>
      <div class="dg-map-i">${(gr.items||[]).map(n=>`<button class="rel-chip sm" data-rel="${esc(n)}">${esc(n)}</button>`).join("")}</div>
    </div>`).join("");
  el.innerHTML = `
    <div class="dg-box${guideOpen?" open":""}" id="dgBox">
      <div class="dg-bar" id="dgBar">
        <span class="dg-bar-t"><svg class=ic aria-hidden=true><use href=#i-book-open /></svg>领域导读</span>
        <span class="dg-bar-h">${esc(g.pos)}</span>
        <span class="dg-toggle" id="dgToggle">${guideOpen?"收起 ▲":"展开 ▼"}</span>
      </div>
      <div class="dg-body" id="dgBody">
        <div class="dg-sec">
          <div class="dg-h"><svg class=ic aria-hidden=true><use href=#i-target /></svg>这个领域解决什么问题</div>
          <div class="dg-p">${esc(g.pos)}</div>
          <div class="dg-p sub">${esc(g.why)}</div>
        </div>
        <div class="dg-sec">
          <div class="dg-h"><svg class=ic aria-hidden=true><use href=#i-map /></svg>核心概念地图<span class="dg-note">点任意概念直接打开</span></div>
          <div class="dg-map">${mapHtml}</div>
        </div>
        <div class="dg-sec">
          <div class="dg-h"><svg class=ic aria-hidden=true><use href=#i-link /></svg>在整机开发链条中的位置</div>
          <div class="dg-p">${esc(g.link)}</div>
        </div>
        <div class="dg-sec">
          <div class="dg-h"><svg class=ic aria-hidden=true><use href=#i-alert /></svg>常见误区 Top${(g.myth||[]).length}</div>
          <ul class="dg-myth">${(g.myth||[]).map(x=>`<li>${esc(x)}</li>`).join("")}</ul>
        </div>
        <div class="dg-tip">💡 <b>学习建议：</b>${esc(g.tips)}</div>
      </div>
    </div>`;
  document.getElementById("dgToggle").onclick = ()=>{
    guideOpen = !guideOpen;
    document.getElementById("dgBox").classList.toggle("open", guideOpen);
    document.getElementById("dgToggle").textContent = guideOpen ? "收起 ▲" : "展开 ▼";
  };
  document.getElementById("dgBar").onclick = (e)=>{ if(e.target.id!=="dgToggle") document.getElementById("dgToggle").click(); };
}

function openDomain(){
  const d = KB_DOMAINS.find(x=>x.id===activeDomain);
  const col = dc(d.id);
  const root = domainView.style;
  domainView.style.setProperty("--dc", col.c);
  domainView.style.setProperty("--dcs", col.s);
  domainView.style.setProperty("--dcw", col.w);
  domainHeadEl.innerHTML = `
    <div class="ic">${d.icon}</div>
    <div>
      <h2>${d.name} <span class="cnt">${domainItems(d).length} 条</span></h2>
      <div class="tg">${d.tagline} · ${d.subs.length} 个子类</div>
    </div>`;
  abListEl.innerHTML = d.abilities.map(a=>`<li>${a}</li>`).join("");
  renderDomainGuide(d);
  buildChips(d);
  renderDomain();
  lvFilter.style.display=""; stFilter.style.display=""; backBtn.style.display="";
  homeView.style.display="none"; domainView.style.display=""; searchView.style.display="none";
}
function buildChips(d){
  const items = domainItems(d);
  const subs = [{id:"all", name:`全部 ${items.length}`}].concat(
    d.subs.map(s=>({id:s, name:`${CAT_NAME[s]} ${items.filter(it=>it.cat===s).length}`}))
  );
  chipsEl.innerHTML = subs.map(s=>`<span class="chip${s.id===activeSub?" active":""}" data-id="${s.id}">${s.name}</span>`).join("");
  chipsEl.querySelectorAll(".chip").forEach(ch=>{
    ch.onclick = ()=>{ activeSub = ch.dataset.id; buildChips(d); renderDomain(); };
  });
}
/* 从深度解析里抽一句「一句话结论」，显示在知识点列表行里 */
function deepLead(name){
  const d = (window.KB_DEEP || {})[name];
  if(!d) return "";
  const src = (Array.isArray(d.p) && d.p.length) ? String(d.p[0]) : "";
  if(!src) return "";
  /* 取到第一个句末标点为止；过长再截 */
  const m = src.match(/^[\s\S]{6,90}?[。；;]/);
  let t = m ? m[0] : src;
  if(t.length > 78) t = t.slice(0, 78).replace(/[，,、]$/, "") + "…";
  return t;
}
function rowHTML(it, i, q, catLabel, catStyle){
  const stv = getSt(it.name);
  const rc = refCount(it.name);
  const imgCell = (it.img
    ? `<button class="img-btn" data-img="${esc(it.img)}" data-name="${esc(it.name)}"><img src="${esc(thumbOf(it.img))}" alt="" loading="lazy" decoding="async" width="36" height="36"></button>`
    : `<button class="img-btn none" data-name="${esc(it.name)}">＋ 配图</button>`) + (rc ? `<span class="ref-mini" title="另有 ${rc} 张参考图，点开行查看">＋${rc}</span>` : "");
  const videos = it.videos || [];
  const vidCell = videos.slice(0,2).map(v=>{
    const c = (v.p === "YouTube") ? "yt" : "";
    return `<span class="vid-mini ${c}"><i>${v.p.replace("B站","B站").slice(0,1)}</i>${videos.length>2? videos.length : (v.p === 'B站' ? 'B站' : 'YT')}</span>`;
  }).join("");
  const vSum = videos.length ? `<span class="vid-mini${videos.some(v=>v.p==='YouTube')?' yt':''}" style="border-radius:9px;">▶ ${videos.length}</span>` : `<span class="img-btn none" style="padding:2px 8px;">＋</span>`;
  return `
  <tr data-name="${esc(it.name)}">
    <td style="color:var(--sub); font-size:12px">${String(i+1).padStart(3,"0")}</td>
    <td><span class="cat-tag"${catStyle}>${catLabel}</span></td>
    <td class="name">${hl(it.name, q)}${doubtOn(it.name) ? `<svg class="ic doubt-ic" aria-hidden=true title="标了疑问"><use href=#i-alert /></svg>` : ""}</td>
    <td><span class="lv lv${it.lv}">${LV_TXT[it.lv]}</span></td>
    <td><span class="st st${stv}" data-name="${esc(it.name)}" title="点击切换：待学习 → 学习中 → 已掌握"><span class="dot"></span>${ST_TXT[stv]}</span></td>
    <td>${imgCell}</td>
    <td>${vSum}</td>
        <td>${hl(it.points, q)}${(()=>{ const L = deepLead(it.name); return L ? `<div class=td-lead><svg class=ic aria-hidden=true><use href=#i-compass /></svg><span>${hl(L, q)}</span></div>` : ""; })()}</td>
    <td>${hl(it.usage, q)}</td>
  </tr>`;
}
function renderDomain(){
  const d = KB_DOMAINS.find(x=>x.id===activeDomain);
  const col = dc(d.id);
  const q = kw.value.trim();
  const lv = lvFilter.value, st = stFilter.value;
  let list = domainItems(d).filter(it=>{
    if(activeSub!=="all" && it.cat!==activeSub) return false;
    if(lv && String(it.lv)!==lv) return false;
    if(st!=="" && st!=="-1" && String(getSt(it.name))!==st) return false;
    if(q){
      const hay = (it.name+it.points+it.usage+CAT_NAME[it.cat]).toLowerCase();
      if(!hay.includes(q.toLowerCase())) return false;
    }
    return true;
  });
  list = sortByLv(list);
  const lv1=list.filter(x=>x.lv===1).length, lv2=list.filter(x=>x.lv===2).length, lv3=list.filter(x=>x.lv===3).length;
  const s1=list.filter(x=>getSt(x.name)===1).length, s2=list.filter(x=>getSt(x.name)===2).length;
  statsEl.innerHTML =
    `共 <b>${list.length}</b> 条 &nbsp;|&nbsp;` +
    `<span class="lv lv1 pill">核心 ${lv1}</span><span class="lv lv2 pill">进阶 ${lv2}</span><span class="lv lv3 pill">了解 ${lv3}</span>` +
    `&nbsp;|&nbsp; 学习中 <span class="st st1 pill">${s1}</span> 已掌握 <span class="st st2 pill">${s2}</span>` +
    `&nbsp;|&nbsp; 掌握率 <b>${list.length?Math.round(s2/list.length*100):0}%</b>`;
  if(!list.length){ tbody.innerHTML=""; emptyEl.style.display="block"; return; }
  emptyEl.style.display="none";
  currentList = list.map(x=>x.name);
  tbody.innerHTML = list.map((it,i)=>{
    const cs = `style="--tcw:${col.w};--tcs:${col.s}"`;
    return rowHTML(it, i, q, CAT_NAME[it.cat], cs);
  }).join("");
}

// 全局浏览 / 搜索
const HOT_KW = ["脱模斜度","卡扣设计","公差与配合","散热设计","安规认证","成本估算","表面处理","光学设计"];
function noHitHTML(q){
  const s = String(q || "").trim();
  if(!s) return "当前筛选条件下没有知识点，换个条件试试～";
  const head = s.slice(0, 2);
  const cands = [];
  const push = n => { if(n && cands.length < 8 && cands.indexOf(n) < 0) cands.push(n); };
  KB_ITEMS.forEach(it=>{
    if(cands.length >= 8) return;
    if(it.name.includes(head) || (it.points||"").includes(head) || (it.usage||"").includes(head)) push(it.name);
  });
  if(cands.length < 3){
    const c0 = s[0];
    KB_ITEMS.forEach(it=>{ if(cands.length < 8 && it.name.includes(c0)) push(it.name); });
  }
  const chips = cands.length ? cands : HOT_KW;
  return `<div class="se-tip"><b>没有找到与「${esc(s)}」匹配的知识点</b><br>${
    cands.length ? "试试这些相近的条目：" : "换个说法试试，或者点下面的常用关键词："}</div>
    <div class="se-chips">${chips.map(c => `<button class="se-chip" data-sekw="${esc(c)}">${esc(c)}</button>`).join("")}</div>`;
}

function renderSearch(){
  const q = kw.value.trim();
  const terms = synExpand(q);
  const hitQ = makeHit(terms);
  const lv = lvFilter.value, st = stFilter.value;
  let list = KB_ITEMS.filter(it=>{
    if(lv && String(it.lv)!==lv) return false;
    if(st!=="" && st!=='-1' && String(getSt(it.name))!==st) return false;
    if(q){
      const hay = (it.name+it.points+it.usage+CAT_NAME[it.cat]).toLowerCase();
      if(!hitQ(hay)) return false;
    }
    return true;
  });
  list = sortByLv(list);
  const s2 = list.filter(x=>getSt(x.name)===2).length;
  const extra = q && terms.length > 1 ? `　·　已自动扩展同义词 <b>${terms.length-1}</b> 个（${esc(terms.slice(1, 6).join("、"))}${terms.length > 6 ? "…" : ""}）` : "";
  searchStatsEl.innerHTML = q
    ? `全局搜索「${esc(q)}」：共 <b>${list.length}</b> 条 · 已掌握 <b>${s2}</b>${extra}`
    : `${browseAll && lvFilter.value==="1" ? "<svg class=ic aria-hidden=true><use href=#i-flame /></svg>核心必会总览" : "<svg class=ic aria-hidden=true><use href=#i-book /></svg>全部知识点"}：共 <b>${list.length}</b> 条（按优先级排序） · 已掌握 <b>${s2}</b>`;
  if(!list.length){ searchTbody.innerHTML=""; searchEmptyEl.style.display="block"; searchEmptyEl.innerHTML = noHitHTML(q); }
  else {
    searchEmptyEl.style.display="none";
    currentList = list.map(x=>x.name);
    searchTbody.innerHTML = list.map((it,i)=>{
      const d = CAT_DOMAIN[it.cat], col = dc(d.id);
      return rowHTML(it, i, terms.length > 1 ? terms : q, `${d.icon} ${d.name}`, `style="--tcw:${col.w};--tcs:${col.s}"`);
    }).join("");
  }
  renderGlobalSearch(q);
}

// ── 全站搜索：把术语 / 标准 / 排查 / 面试 / 速查 / 题库 一起搜出来 ──
function renderGlobalSearch(q){
  const box = document.getElementById("gsGroups");
  if(!q){ box.innerHTML = ""; return; }
  const terms = synExpand(q);
  const hit = makeHit(terms);
  const groups = [];

  // 术语词典
  const gloss = KB_GLOSS.filter(g=>hit(g.en)||hit(g.cn)||hit(g.d)||hit(g.c));
  if(gloss.length) groups.push({icon:"<svg class=ic aria-hidden=true><use href=#i-book-open /></svg>", name:"术语词典", n:gloss.length, jump:"gloss",
    items: gloss.map(g=>({t:g.en, d:`<b>${esc(g.cn)}</b> — ${g.d}`}))});

  // 标准清单
  const std = [];
  KB_STD.forEach(g=>g.items.forEach(x=>{ if(hit(x.code)||hit(x.name)||hit(x.note)) std.push({t:x.code, d:`${esc(x.name)} — ${esc(x.note)}`}); }));
  if(std.length) groups.push({icon:"<svg class=ic aria-hidden=true><use href=#i-clipboard /></svg>", name:"标准清单", n:std.length, jump:"field", f:"std", items: std});

  // 缺陷排查
  const tr = [];
  KB_TROUBLE.forEach(g=>g.items.forEach(x=>{
    if(hit(x.s)||hit(x.c.join(" "))||hit(x.f.join(" "))||hit(x.v))
      tr.push({t:x.s, d:`原因：${x.c.slice(0,2).map(esc).join("；")}　对策：${esc(x.f[0])}`});
  }));
  if(tr.length) groups.push({icon:"<svg class=ic aria-hidden=true><use href=#i-search /></svg>", name:"缺陷排查", n:tr.length, jump:"field", f:"trouble", items: tr});

  // 面试题
  const iv = [];
  KB_INTERVIEW.forEach(g=>g.items.forEach(x=>{
    if(hit(x.q)||hit(x.a.join(" "))) iv.push({t:x.q, d:`${esc(x.cat)} · ${esc(x.tag)}　${esc(x.a[0])}`});
  }));
  if(iv.length) groups.push({icon:"<svg class=ic aria-hidden=true><use href=#i-briefcase /></svg>", name:"面试题库", n:iv.length, jump:"field", f:"interview", items: iv});

  // 速查手册
  const qk = [];
  KB_QUICK.forEach(t=>t.rows.forEach(r=>{
    if(hit(r.join(" "))) qk.push({t:t.name, d:r.slice(0,3).map(esc).join("　|　")});
  }));
  if(qk.length) groups.push({icon:"<svg class=ic aria-hidden=true><use href=#i-table /></svg>", name:"速查手册", n:qk.length, jump:"quick", items: qk.slice(0,8)});

  // 自测题库
  const qz = [];
  KB_QUIZ.forEach(p=>{
    for(let i=0;i<quizTotal(p);i++){
      const qq = quizAt(p,i); if(!qq) continue;
      const lv = quizLvAt(p,i), tp = quizTypeOf(qq);
      const extra = ((window.KB_QUIZ_EXP||{})[p.id+"|"+i]||{}).e || "";
      if(hit(qq.q)||hit(qq.exp)||hit(extra)||hit(qq.opts.join(" "))||hit((qq.w||[]).join(" ")))
        qz.push({t:p.name+" 第"+(i+1)+"题"+(lv?" · "+lv:""), d:esc(qq.q)+(tp!=="choice"?`　[${QUIZ_TYPE[tp]||tp}]`:""), pid:p.id});
    }
  });
  if(qz.length) groups.push({icon:"<svg class=ic aria-hidden=true><use href=#i-target /></svg>", name:"自测题库", n:qz.length, jump:"quiz", items: qz.slice(0,8)});

  // 整机案例
  const cs = [];
  KB_CASES.forEach(c=>{
    const hay = [c.name,c.tagline,c.issues.map(x=>x.t+x.d).join(" "),c.composition.map(x=>x.part+x.material+x.note).join(" ")].join(" ");
    if(hit(hay)) cs.push({t:c.name, d:esc(c.tagline)});
  });
  if(cs.length) groups.push({icon:"<svg class=ic aria-hidden=true><use href=#i-puzzle /></svg>", name:"整机案例", n:cs.length, jump:"case", items: cs});

  // 一句话记忆
  const mm = [];
  Object.entries(window.KB_MEMO||{}).forEach(([k,v])=>{
    if(hit(k)||hit(v)) mm.push({t:k, d:`<b>${esc(v)}</b>`, openName:k});
  });
  if(mm.length) groups.push({icon:"<svg class=ic aria-hidden=true><use href=#i-pin /></svg>", name:"一句话记忆", n:mm.length, jump:"kb", items: mm.slice(0,8)});

  // 设计避坑
  const mk = [];
  (window.KB_MISTAKE||[]).forEach(g=>g.items.forEach(x=>{
    if(hit(x.t)||hit(x.bad)||hit(x.cost)||hit(x.good)||hit(x.how))
      mk.push({t:x.t, d:`<b>✗</b> ${esc(x.bad)}　<b>✓</b> ${esc(x.good)}`});
  }));
  if(mk.length) groups.push({icon:"<svg class=ic aria-hidden=true><use href=#i-alert /></svg>", name:"设计避坑", n:mk.length, jump:"field", f:"mistake", items: mk});

  // 选型决策
  const sl = [];
  (window.KB_SELECT||[]).forEach(t=>{
    if(hit(t.name)||hit(t.desc)) sl.push({t:t.icon+" "+t.name, d:esc(t.desc), jumpSel:t.id});
    Object.values(t.nodes||{}).forEach(nd=>{
      if(nd.r && (hit(nd.r.title)||hit((nd.r.why||[]).join(" "))||hit((nd.r.avoid||[]).join(" "))||hit(nd.r.note)))
        sl.push({t:nd.r.title, d:`选型结论 · ${esc(t.name)}　${esc(nd.r.note)}`, jumpSel:t.id});
      else if(nd.q && hit(nd.q)) sl.push({t:nd.q, d:`决策问题 · ${esc(t.name)}`, jumpSel:t.id});
    });
  });
  if(sl.length) groups.push({icon:"<svg class=ic aria-hidden=true><use href=#i-sliders /></svg>", name:"选型决策", n:sl.length, jump:"select", items: sl.slice(0,8)});

  // 公式与单位
  const fg = [];
  (window.KB_FORMULA||[]).forEach(g=>(g.items||[]).forEach(x=>{
    if(hit(x.name)||hit(x.expr)||hit(x.unit)||hit(x.when)||hit(x.eg)||hit((x.vars||[]).map(v=>v.s+" "+v.d).join(" ")))
      fg.push({t:x.name, d:`<code>${esc(x.expr)}</code>　${esc(x.when).slice(0,70)}`, jumpFm:g.cat});
  }));
  (window.KB_UNIT||[]).forEach(g=>(g.items||[]).forEach(x=>{
    if(hit(x.a)||hit(x.b)||hit(x.note)) fg.push({t:x.a, d:`= ${esc(x.b)}　${esc(x.note||"")}`, jumpFm:"__unit"});
  }));
  if(fg.length) groups.push({icon:"<svg class=ic aria-hidden=true><use href=#i-ruler /></svg>", name:"公式与单位", n:fg.length, jump:"formula", items: fg.slice(0,8)});

  // 领域导读
  const dg = [];
  Object.entries(window.KB_DOMAIN_GUIDE||{}).forEach(([id,g])=>{
    const d = KB_DOMAINS.find(x=>x.id===id); if(!d) return;
    if(hit(d.name)||hit(g.pos)||hit(g.why)||hit((g.myth||[]).join(" "))||hit(g.tips)){
      const m = (g.myth||[]).find(x=>hit(x));
      dg.push({t:`${d.icon} ${d.name} · 领域导读`, d:m?`常见误区：${esc(m)}`:esc(g.pos), jumpDom:id});
    }
  });
  if(dg.length) groups.push({icon:"<svg class=ic aria-hidden=true><use href=#i-book-open /></svg>", name:"领域导读", n:dg.length, jump:"kb", items: dg});

  // 检查清单（开模前评审 / 试模 / 量产转产… 共 114 项）
  const ck = [];
  (window.KB_CHECKS||[]).forEach(c=>(c.groups||[]).forEach(g=>(g.items||[]).forEach(x=>{
    if(hit(x.t)||hit(x.d)) ck.push({t:x.t, d:`<b>${esc(c.name)}</b> · ${esc(g.t)}　${esc(x.d)}`, jumpChk:c.id});
  })));
  if(ck.length) groups.push({icon:"<svg class=ic aria-hidden=true><use href=#i-check-square /></svg>", name:"检查清单", n:ck.length, jump:"check", items: ck.slice(0,8)});

  // 实战模板（NPI 流程 / DFM 检讨表… 含表单字段）
  const tp = [];
  (window.KB_TEMPLATE||[]).forEach(t=>{
    if(hit(t.name)||hit(t.desc)||hit(t.note)) tp.push({t:t.name, d:`<b>${esc(t.name)}</b>　${esc(t.desc)}`, jumpTpl:t.id});
    (t.blocks||[]).forEach(b=>(b.fields||[]).forEach(f=>{
      if(hit(f.l)||hit(f.ph)) tp.push({t:f.l, d:`<b>${esc(t.name)}</b> · 表单字段　${esc(f.ph)}`, jumpTpl:t.id});
    }));
  });
  if(tp.length) groups.push({icon:"<svg class=ic aria-hidden=true><use href=#i-file-text /></svg>", name:"实战模板", n:tp.length, jump:"tpl", items: tp.slice(0,8)});

  if(!groups.length){ box.innerHTML = ""; return; }
  const LIMIT = 6;
  const attr = (g,x)=>`data-jump="${g.jump}" ${g.f?`data-field="${g.f}"`:""}` +
    (x && x.pid?` data-quiz="${x.pid}"`:"") +
    (x && x.jumpSel?` data-sel="${x.jumpSel}"`:"") +
    (x && x.jumpFm?` data-fm="${esc(x.jumpFm)}"`:"") +
    (x && x.openName?` data-open="${esc(x.openName)}"`:"") +
    (x && x.jumpDom?` data-dom="${x.jumpDom}"`:"") +
    (x && x.jumpChk?` data-chk="${esc(x.jumpChk)}"`:"") +
    (x && x.jumpTpl?` data-tpl="${esc(x.jumpTpl)}"`:"");
  box.innerHTML = groups.map(g=>`
    <div class="gs-group">
      <div class="gs-head" ${attr(g)}>
        <h4>${g.icon} ${esc(g.name)}</h4><span class="gsc">${g.n} 条命中</span>
        <span class="gsj">进入模块查看全部 →</span>
      </div>
      <div class="gs-body">
        ${g.items.slice(0,LIMIT).map(x=>`<div class="gs-item" ${attr(g,x)}>
          <div class="gs-t">${markInHTML(String(x.t).slice(0,30), terms)}</div><div class="gs-d">${markInHTML(String(x.d).slice(0,110), terms)}</div></div>`).join("")}
        ${g.n>LIMIT?`<div class="gs-more">还有 ${g.n-LIMIT} 条，点上方标题进入模块查看全部</div>`:""}
      </div>
    </div>`).join("");
}

/* ══════════════ 模块一：速查手册 ══════════════ */
function renderQuick(){
  const q = (document.getElementById("qvSearch").value||"").trim().toLowerCase();
  document.getElementById("qvTabs").innerHTML = KB_QUICK.map(t=>
    `<button class="qv-tab${t.id===activeQuick?" active":""}" data-qv="${t.id}">${t.icon} ${esc(t.name)}</button>`).join("");
  const t = KB_QUICK.find(x=>x.id===activeQuick) || KB_QUICK[0];
  const EXTRA = (window.KB_QUICK_ADD||{})[t.id] || [];
  const totalN = t.rows.length + EXTRA.length;
  let rows = t.rows.map(r=>({r, add:false})).concat(EXTRA.map(r=>({r, add:true})));
  if(q) rows = rows.filter(x=> x.r.join(" ").replace(/&[a-z]+;/g,"").toLowerCase().includes(q));
  const table = rows.length ? `
    <div class="tbl-hint"><svg class=ic aria-hidden=true><use href=#i-target /></svg>窄屏可左右滑动看全部 ${t.cols.length} 列，首列会固定</div>
    <div class="table-card"><div class="tbl-scroll">
      <table class="mini">
        <thead><tr>${t.cols.map(c=>`<th>${esc(c)}</th>`).join("")}</tr></thead>
        <tbody>${rows.map(x=>`<tr class="${x.add?"add":""}">${x.r.map(c=>`<td>${c}</td>`).join("")}</tr>`).join("")}</tbody>
      </table>
    </div></div>` : `<div class="card"><div class="empty">没有匹配的数据行，换个关键词试试～</div></div>`;
  document.getElementById("qvBody").innerHTML = `
    <div class="card">
      <h3>${t.icon} ${esc(t.name)}</h3>
      <div class="qv-desc">${esc(t.desc)} · 共 ${totalN} 行${EXTRA.length?`（其中本轮补充 ${EXTRA.length} 行，表中以浅底标出）`:""}${q?` · 筛出 ${rows.length} 行`:""}</div>
    </div>
    ${table}
    ${t.note?`<div class="qv-note">⚠️ ${esc(t.note)}</div>`:""}`;
}

/* ══════════════ 模块二：检查清单 ══════════════ */
const CHK_KEY = "kb-check-v2";
let chkState = {};
try{ chkState = JSON.parse(localStorage.getItem(CHK_KEY) || "{}"); }catch(e){ chkState = {}; }
function chkOn(id,g,i){ return !!chkState[id+"|"+g+"|"+i]; }
function chkSet(id,g,i,v){
  const k = id+"|"+g+"|"+i;
  if(v) chkState[k]=1; else delete chkState[k];
  try{ localStorage.setItem(CHK_KEY, JSON.stringify(chkState)); }catch(e){}
}
function chkCount(cl){
  let total=0, on=0;
  cl.groups.forEach((g,gi)=>g.items.forEach((it,ii)=>{ total++; if(chkOn(cl.id,gi,ii)) on++; }));
  return {total, on};
}
function renderChecks(){
  document.getElementById("chkSum").innerHTML = KB_CHECKS.map(c=>{
    const {total,on} = chkCount(c);
    const pct = total? Math.round(on/total*100):0;
    return `<div class="cs${c.id===activeChk?" on":""}" data-chk="${c.id}">
      <b>${c.icon} ${esc(c.name)}</b>
      <div class="csp"><span>已勾选 ${on} / ${total}</span><span>${pct}%</span></div>
      <div class="chk-bar"><i style="width:${pct}%"></i></div>
    </div>`;
  }).join("");
  const c = KB_CHECKS.find(x=>x.id===activeChk) || KB_CHECKS[0];
  const {total,on} = chkCount(c);
  document.getElementById("chkBody").innerHTML = `
    <div class="chk-card">
      <div class="chk-head">
        <div>
          <h3>${c.icon} ${esc(c.name)}</h3>
          <div class="cd">${esc(c.desc)}</div>
        </div>
        <div style="margin-left:auto; font-size:12px; color:var(--sub);">
          已勾选 <b style="color:#059669; font-size:15px;">${on}</b> / ${total} 项
        </div>
      </div>
      ${c.groups.map((g,gi)=>`
        <div class="chk-grp">
          <h4>${esc(g.t)}</h4>
          ${g.items.map((it,ii)=>{
            const onx = chkOn(c.id,gi,ii);
            return `<div class="chk-item${onx?" on":""}" data-ck="${c.id}|${gi}|${ii}">
              <div class="bx">✓</div>
              <div><div class="ct">${esc(it.t)}</div><div class="cd2">${it.d}</div></div>
            </div>`;
          }).join("")}
        </div>`).join("")}
      <div style="height:18px"></div>
    </div>`;
}

/* ══════════════ 模块三：整机案例 ══════════════ */
function renderCases(){
  document.getElementById("caseTabs").innerHTML = KB_CASES.map(c=>
    `<button class="qv-tab${c.id===activeCase?" active":""}" data-case="${c.id}">${c.icon} ${esc(c.name)}</button>`).join("");
  const c = KB_CASES.find(x=>x.id===activeCase) || KB_CASES[0];
  document.getElementById("caseBody").innerHTML = `
    <div class="case-hero">
      <h2>${c.icon} ${esc(c.name)}</h2>
      <p>${esc(c.tagline)}</p>
      <div class="case-meta">${c.meta.map(m=>`<div class="cm"><b>${esc(m.k)}</b><span>${esc(m.v)}</span></div>`).join("")}</div>
    </div>
    <div class="card">
      <h3><svg class=ic aria-hidden=true><use href=#i-layers /></svg>结构构成与选材</h3>
      <div class="tbl-scroll"><table class="mini">
        <thead><tr><th style="width:150px">部件</th><th style="width:190px">材料</th><th style="width:130px">工艺</th><th>设计要点</th></tr></thead>
        <tbody>${c.composition.map(x=>`<tr><td>${esc(x.part)}</td><td>${esc(x.material)}</td><td>${esc(x.process)}</td><td>${esc(x.note)}</td></tr>`).join("")}</tbody>
      </table></div>
    </div>
    <div class="card">
      <h3><svg class=ic aria-hidden=true><use href=#i-ruler /></svg>关键设计参数</h3>
      ${c.specs.map(s=>`<div class="spec-grp"><h5>${esc(s.t)}</h5><ul>${s.items.map(i=>`<li>${i}</li>`).join("")}</ul></div>`).join("")}
    </div>
    <div class="card">
      <h3><svg class=ic aria-hidden=true><use href=#i-calculator /></svg>开发流程与工艺路线</h3>
      ${c.steps.map((s,i)=>`<div class="step"><div class="sn">${i+1}</div><div class="st2"><b>${esc(s.t)}</b> — ${esc(s.d)}</div></div>`).join("")}
    </div>
    <div class="card">
      <h3><svg class=ic aria-hidden=true><use href=#i-alert /></svg>常见问题与对策</h3>
      ${c.issues.map(s=>`<div class="iss"><div class="iq">${esc(s.t)}</div><div class="ia">${esc(s.d)}</div></div>`).join("")}
    </div>
    ${((window.KB_CASE_DFM||{})[c.id]||[]).length?`<div class="card">
      <h3><svg class=ic aria-hidden=true><use href=#i-search /></svg>DFM 检讨记录</h3>
      <div class="qv-desc">开模前评审与试模检讨的真实过程：模具厂/工艺提出的问题 → 怎么处理 → 结果是什么</div>
      ${((window.KB_CASE_DFM||{})[c.id]||[]).map((x,i)=>`<div class="dfm-item">
        <div class="dfm-q"><span class="dfm-no">Q${i+1}</span><span>${esc(x.q)}</span></div>
        <div class="dfm-row"><span class="dfm-k">改法</span><span class="dfm-v">${esc(x.a)}</span></div>
        <div class="dfm-row res"><span class="dfm-k">结果</span><span class="dfm-v">${esc(x.r)}</span></div>
      </div>`).join("")}
    </div>`:""}
    <div class="card">
      <h3><svg class=ic aria-hidden=true><use href=#i-tag /></svg>成本构成估算</h3>
      <table class="mini">
        <thead><tr><th style="width:260px">成本项</th><th>估算区间</th></tr></thead>
        <tbody>${c.cost.map(x=>`<tr><td>${esc(x.k)}</td><td>${esc(x.v)}</td></tr>`).join("")}</tbody>
      </table>
      <div class="qv-note">${esc(c.costNote)}</div>
    </div>`;
}

/* ══════════════ 模块四：术语词典 ══════════════ */
function renderGloss(){
  const cats = ["全部"].concat([...new Set(KB_GLOSS.map(g=>g.c))]);
  document.getElementById("glChips").innerHTML = cats.map(c=>
    `<button class="qv-tab${c===glCat?" active":""}" data-gl="${esc(c)}">${esc(c)}${c==="全部"?` ${KB_GLOSS.length}`:""}</button>`).join("");
  const q = (document.getElementById("glSearch").value||"").trim().toLowerCase();
  const list = KB_GLOSS.filter(g=>{
    if(glCat!=="全部" && g.c!==glCat) return false;
    if(q && !(g.en+" "+g.cn+" "+g.d+" "+g.c+" "+((window.KB_GLOSS_USE||{})[g.en]||"")).toLowerCase().includes(q)) return false;
    return true;
  });
  document.getElementById("glCount").textContent = KB_GLOSS.length + " 个术语";
  document.getElementById("glBody").innerHTML = list.length ? list.map(g=>{
    const u = (window.KB_GLOSS_USE||{})[g.en];
    return `
    <div class="gl-card">
      <div class="gl-en">${esc(g.en)}<span class="gl-tag">${esc(g.c)}</span></div>
      <div class="gl-cn">${esc(g.cn)}</div>
      <div class="gl-d">${g.d}</div>
      ${u?`<div class="gl-u"><span class="gl-u-k">实际用法</span>${esc(u)}</div>`:""}
    </div>`;
  }).join("") : `<div class="empty" style="grid-column:1/-1">没有匹配的术语，换个关键词试试～</div>`;
}

/* ══════════════ 模块五：学习路径 ══════════════ */
/* 30 天路径的完成记录：{"周序|天序": 1} */
const LS_PATHDONE = "kb-path-done-v1";
let pathDone = lsGet(LS_PATHDONE, {});
function pathSave(){ lsSet(LS_PATHDONE, pathDone); }
function renderPath(){
  let wi = -1;
  document.getElementById("pathBody").innerHTML = KB_PATH.map(w=>{
    wi++;
    const tot = w.days.length;
    let dn = 0;
    for(let di = 0; di < tot; di++) if(pathDone[wi + "|" + di]) dn++;
    const allDone = tot > 0 && dn === tot;
    const pct = tot ? Math.round(dn / tot * 100) : 0;
    return `
    <div class="wk-card${allDone ? " all-done" : ""}">
      <div class="wk-head">
        <div class="wi">${w.icon}</div>
        <div><h3>${esc(w.title)}</h3><div class="wg"><svg class=ic aria-hidden=true><use href=#i-target /></svg>${esc(w.goal)}</div></div>
        <div class="wk-prog"><span>${dn}/${tot} 完成</span><i><b style="width:${pct}%"></b></i></div>
      </div>
      <div class="wk-body">
        ${w.days.map((d, di)=>{
          const done = !!pathDone[wi + "|" + di];
          return `
          <div class="pd${done ? " done" : ""}">
            <button class="pd-done${done ? " on" : ""}" data-pdone="${wi}|${di}" title="${done ? "点一下取消完成" : "标记这一天已完成"}"><svg class=ic aria-hidden=true><use href=#i-check-square /></svg></button>
            <div class="pdd">${esc(d.d)}</div>
            <div class="pdc">
              <div class="pdt">${esc(d.t)}</div>
              <ul>${d.tasks.map(t=>`<li>${esc(t)}</li>`).join("")}</ul>
              <div class="rel-chips">${(d.items||[]).map(n=>`<button class="rel-chip" data-rel="${esc(n)}">${esc(n)}</button>`).join("")}</div>
            </div>
          </div>`;
        }).join("")}
        <div class="wk-out">✅ 本周产出：${esc(w.output)}</div>
      </div>
    </div>`;
  }).join("");
}



/* ══════════════ 模块六：学习地图 ══════════════ */
function renderMap(){
  document.getElementById("mapTabs").innerHTML = KB_MAP.map(d=>
    `<button class="qv-tab${d.id===activeMap?" active":""}" data-map="${d.id}">${d.icon} ${esc(d.name)}</button>`).join("");
  const d = KB_MAP.find(x=>x.id===activeMap) || KB_MAP[0];
  const total = d.layers.reduce((a,l)=>a+l.items.length,0);
  document.getElementById("mapHead").innerHTML = `
    <div class="map-goal"><svg class=ic aria-hidden=true><use href=#i-target /></svg><b>学完这个领域你应该能做到：</b>${esc(d.goal)}<br>
      <span style="color:var(--sub); font-size:12px;">共 ${d.layers.length} 层 · ${total} 个知识点 · 建议按层顺序学，不要跳层。点任意知识点直接打开详情</span>
    </div>`;
  document.getElementById("mapBody").innerHTML = d.layers.map((l,i)=>{
    const cap = (window.KB_MAP_CAP||{})[d.id+"|"+i];
    return `
    <div class="layer-card">
      <div class="layer-head">
        <div class="layer-no">${i+1}</div>
        <div><h4>${esc(l.t)}</h4><div class="ld">${esc(l.d)}</div></div>
      </div>
      ${cap?`<div class="layer-cap"><span class="lc-k">学完你能</span>${esc(cap)}</div>`:""}
      <div class="layer-body">
        ${l.items.map(it=>`<div class="map-item" data-rel="${esc(it.n)}">
          <div class="mn">${esc(it.n)}</div><div class="mw">${esc(it.why)}</div></div>`).join("")}
      </div>
    </div>`;
  }).join("");
}

/* ══════════════ 模块七：自测题库 ══════════════ */
const QUIZ_KEY = "kb-quiz-v1";
let quizState = {};
try{ quizState = JSON.parse(localStorage.getItem(QUIZ_KEY) || "{}"); }catch(e){ quizState = {}; }
function quizSave(){ try{ localStorage.setItem(QUIZ_KEY, JSON.stringify(quizState)); }catch(e){} }
function quizAnsOf(pid){ if(!quizState[pid]) quizState[pid] = {}; return quizState[pid]; }

/* ══════════════ 题库：原 120 题 + 追加 240 题合并 ══════════════ */
const QUIZ_LEV = ["基础", "进阶", "易错"];
const QUIZ_TYPE = { choice:"选择题", tf:"判断题", calc:"计算题", scene:"情景题" };
let quizLevFilter = "全部";
let quizTypeFilter = "全部";
let quizFocus = null;        // 逐题模式：当前展开的题号（null = 全部折叠）
let quizExpandAll = false;   // 浏览模式：一次展开全部题目
let d20Focus = null;         // 每日20题：当前展开的题号（null = 全部折叠）
let d20ExpandAll = false;    // 每日20题：一次展开全部

/* 把「逐项干扰分析」并入 KB_QUIZ_EXP ----------
   基库 120 题的解析与干扰说明原本分散：解析在 KB_QUIZ_EXP[pid|i].e，
   干扰说明现在补在 KB_QUIZ_WHY[pid|i]（数组，与选项等长、答案位为空串），
   这里合并成 KB_QUIZ_EXP[pid|i].w，渲染层只认一个入口。 */
function mergeQuizWhy(){
  var WHY = window.KB_QUIZ_WHY;
  if(!WHY) return;
  var EXP = window.KB_QUIZ_EXP || (window.KB_QUIZ_EXP = {});
  Object.keys(WHY).forEach(function(k){
    var cur = EXP[k] || (EXP[k] = {});
    if(!cur.w) cur.w = WHY[k];
  });
}
mergeQuizWhy();

/* ══════════ 按需加载：非首屏模块的数据脚本 ══════════
 * 全站 57 个脚本、约 1.8MB 源码里，有 526KB 是「首页完全用不到、进对应模块才需要」的：
 *   · 题库 12 个文件（402KB）：被 题库 / 每日20题 / 错题本 / 复习计划 / 学习数据 五个模块共用
 *   · STEP 成本评估 2 个文件（124KB）：自带几何解析引擎，只在打开该模块时用
 * 它们改为「首屏渲染完成后后台预取 + 进模块时兜底等待」，首屏传输随之下降约四分之一。
 *
 * ⚠️ 顺序敏感：kb-quiz-add-1~6 用 Object.assign 写同一批领域键，后加载的会覆盖前面的，
 *    所以下面的清单顺序必须与原先 index.html 的 <script> 顺序完全一致，且用 async=false 保序。
 * ⚠️ 为什么只拆这两组：其余数据（选型 / 公式 / 模板 / 案例 / 术语…）被首页统计数字与
 *    全站搜索直接读取，拆出去会让首页显示 0、搜索结果缺分组，得不偿失。
 * ════════════════════════════════════════════════════ */
const LAZY_MODS = {
  quiz: ["kb-quiz-why.js","kb-quiz-exp-1.js","kb-quiz-exp-2.js",
         "kb-quiz-add-1.js","kb-quiz-add-2.js","kb-quiz-add-3.js","kb-quiz-add-4.js",
         "kb-quiz-add-5.js","kb-quiz-add-6.js","kb-quiz-lv.js",
         "kb-quiz-add-7.js","kb-quiz-add-8.js"],
  step: ["kb-step.js","kb-step-view.js"],
};
const MOD_DATA = { quiz:"quiz", daily:"quiz", wrong:"quiz", review:"quiz", stats:"quiz", step:"step" };
const _scriptP = {};    // src → Promise（同一文件只加载一次）
const _dataDone = {};   // 数据集 → 是否已就绪

function loadScript(src){
  if(!_scriptP[src]) _scriptP[src] = new Promise(function(res){
    const s = document.createElement("script");
    s.src = src;
    s.async = false;                 // 保序：见文件头说明
    s.onload = function(){ res(true); };
    s.onerror = function(){ res(false); };   // 失败也 resolve，避免界面卡在加载态
    document.head.appendChild(s);
  });
  return _scriptP[src];
}
function dataReady(mod){ const k = MOD_DATA[mod]; return !k || !!_dataDone[k]; }
function ensureData(mod){
  const k = MOD_DATA[mod];
  if(!k || _dataDone[k]) return Promise.resolve(true);
  if(_pending[k]) return _pending[k];
  showLazyNote(true);
  _pending[k] = Promise.all(LAZY_MODS[k].map(loadScript)).then(function(){
    _dataDone[k] = true;
    delete _pending[k];
    showLazyNote(false);
    if(k === "quiz") afterQuizData();
    return true;
  });
  return _pending[k];
}
const _pending = {};
function showLazyNote(on){
  let el = document.getElementById("lazyNote");
  if(on){
    if(!el){
      el = document.createElement("div");
      el.id = "lazyNote";
      el.className = "lazy-note";
      el.textContent = "正在加载题库数据…";
      document.body.appendChild(el);
    }
    el.style.display = "";
  }else if(el){ el.style.display = "none"; }
}
/* 题库数据到位后补做依赖它的收尾：干扰分析合并 + 角标数字 */
function afterQuizData(){
  try{ mergeQuizWhy(); }catch(e){}
  try{ refreshBadges(); }catch(e){}
  try{ initBadges(); }catch(e){}       // 题库总数角标（懒加载到位后校正）
  try{ syncCounts(); }catch(e){}       // 文案里的总数
  try{ renderHome(); }catch(e){}       // 首页「内容总览」里的自测题数
}
function quizExtra(p){ return (window.KB_QUIZ_ADD || {})[p.id] || []; }
function quizTotal(p){ return p.questions.length + quizExtra(p).length; }
function quizAt(p, i){
  if(i < p.questions.length) return p.questions[i];
  return quizExtra(p)[i - p.questions.length] || null;
}
function quizLvAt(p, i){
  if(i < p.questions.length) return ((window.KB_QUIZ_LV || {})[p.id] || [])[i] || "";
  const q = quizExtra(p)[i - p.questions.length];
  return q ? (q.lv || "") : "";
}
function quizTypeOf(q){ return q.t || "choice"; }

// 深度解析：追加题自带长解析与干扰项说明；原 120 题用 KB_QUIZ_EXP 加厚层
function quizExpHTML(pid, q, i, chosen){
  const x = (window.KB_QUIZ_EXP || {})[pid + "|" + i];
  const e = (x && x.e) ? x.e : q.exp;
  const wArr = (x && Array.isArray(x.w)) ? x.w : (Array.isArray(q.w) ? q.w : null);
  const head = chosen === q.a ? "✓ 回答正确" : "✗ 正确答案是 " + "ABCD"[q.a];
  let w = "";
  if(wArr && q.opts.length > 2){
    const rows = q.opts.map((o,j)=> (j !== q.a && wArr[j])
      ? `<div class="qw-row"><span class="qw-l">${"ABCD"[j]}</span><span class="qw-o">${esc(o)}</span><span class="qw-w">${esc(wArr[j])}</span></div>` : "").join("");
    if(rows) w = `<div class="q-why"><div class="qw-t">其他选项为什么不对</div>${rows}</div>`;
  }
  /* 默认收起：解析只露 2 行、干扰分析隐藏 —— 否则「答完自动全展开」反而比不答更长 */
  return `<div class="q-exps"><div class="q-exp"><b>${head}</b> — ${esc(e)}</div>${w}`
    + `<button class="qr-exp" data-qexp="1">展开解析</button></div>`;
}

function renderQuiz(){
  document.getElementById("quizTabs").innerHTML = KB_QUIZ.map(p=>{
    const a = quizState[p.id] || {};
    const tot = quizTotal(p);
    const done = Object.keys(a).filter(k=>+k < tot).length;
    return `<button class="qv-tab${p.id===activeQuiz?" active":""}" data-quiz="${p.id}">${p.icon} ${esc(p.name)}${done?` ${done}/${tot}`:""}</button>`;
  }).join("");
  const p = KB_QUIZ.find(x=>x.id===activeQuiz) || KB_QUIZ[0];
  const ans = quizAnsOf(p.id);
  const tot = quizTotal(p);
  let done = 0, right = 0;
  const lvStat = { "基础":{n:0,dn:0,rt:0}, "进阶":{n:0,dn:0,rt:0}, "易错":{n:0,dn:0,rt:0} };
  const tpStat = {};
  for(let i=0;i<tot;i++){
    const q = quizAt(p, i); if(!q) continue;
    const lv = quizLvAt(p, i), tp = quizTypeOf(q);
    if(lvStat[lv]) lvStat[lv].n++;
    tpStat[tp] = (tpStat[tp]||0) + 1;
    if(ans[i]!==undefined){
      done++;
      const ok = ans[i]===q.a;
      if(ok) right++;
      if(lvStat[lv]){ lvStat[lv].dn++; if(ok) lvStat[lv].rt++; }
    }
  }
  const pct = done ? Math.round(right/done*100) : 0;
  const lvTag = (k)=>{
    const s = lvStat[k];
    const r = s.dn ? Math.round(s.rt/s.dn*100) : -1;
    return `<span class="lev-stat lev-${QUIZ_LEV.indexOf(k)}">${k} <b>${s.n}</b> 题${s.dn?`　已答 ${s.dn}　正确 ${r}%`:""}</span>`;
  };
  document.getElementById("quizHead").innerHTML = `
    <div><h3>${p.icon} ${esc(p.name)}自测</h3>
      <div class="qd">共 ${tot} 题（${QUIZ_LEV.map(k=>k+" "+lvStat[k].n).join(" · ")}）· 题型的分布：${Object.entries(tpStat).map(([k,v])=>QUIZ_TYPE[k]+" "+v).join(" · ")}</div>
      <div class="lev-row">${QUIZ_LEV.map(lvTag).join("")}</div></div>
    <div class="quiz-score">
      <div class="qs"><b style="color:var(--primary)">${done}/${tot}</b><span>已作答</span></div>
      <div class="qs"><b style="color:#059669">${right}</b><span>答对</span></div>
      <div class="qs"><b style="color:${pct>=80?'#059669':pct>=60?'#d97706':'#dc2626'}">${pct}%</b><span>正确率</span></div>
    </div>`;
  // 难度 / 题型筛选
  const levCount = k => {
    let n = 0;
    for(let i=0;i<tot;i++){ if(!quizAt(p,i)) continue;
      if(k==="全部" || quizLvAt(p,i)===k) n++; }
    return n;
  };
  const typeCount = k => {
    let n = 0;
    for(let i=0;i<tot;i++){ const q=quizAt(p,i); if(!q) continue;
      if(k==="全部" || quizTypeOf(q)===k) n++; }
    return n;
  };
  document.getElementById("quizLev").innerHTML =
    `<span class="lvf-cap">难度</span>` +
    ["全部"].concat(QUIZ_LEV).map(k=>
      `<button class="lvf${k===quizLevFilter?" active":""}" data-qlv="${esc(k)}">${esc(k)} <b>${levCount(k)}</b></button>`).join("") +
    `<span class="lvf-cap" style="margin-left:10px">题型</span>` +
    ["全部","choice","tf","calc","scene"].filter(k=>k==="全部"||tpStat[k]).map(k=>
      `<button class="lvf${k===quizTypeFilter?" active":""}" data-qtype="${k}">${k==="全部"?"全部":QUIZ_TYPE[k]} <b>${typeCount(k)}</b></button>`).join("");
  document.getElementById("quizActions").innerHTML = `
    <button class="mini-btn" data-qact="wrong"><svg class=ic aria-hidden=true><use href=#i-repeat /></svg> 重做错题</button>
    <button class="mini-btn" data-qact="reset">清空本卷</button>
    <button class="mini-btn" data-qact="expand">${quizExpandAll ? "逐题模式" : "展开全部"}</button>
    ${done===tot && tot ? `<span class="mini-btn ${pct>=80?'ok':''}" style="cursor:default">${
      pct>=80 ? '🎉 掌握良好，可以进入下一领域'
      : pct>=60 ? '📖 基本掌握，建议把错题再过一遍'
      : '⚠️ 建议回知识库重读「'+p.name+'」相关条目'}</span>` : ''}`;
  const idxs = [];
  for(let i=0;i<tot;i++){ const q = quizAt(p,i); if(!q) continue;
    if(quizLevFilter!=="全部" && quizLvAt(p,i)!==quizLevFilter) continue;
    if(quizTypeFilter!=="全部" && quizTypeOf(q)!==quizTypeFilter) continue;
    idxs.push(i);
  }
  /* 答题卡：题号导航（已答复选题会收起，靠它跳题） */
  document.getElementById("quizSheet").innerHTML = idxs.length ? `
    <span class="qs-cap"><svg class=ic aria-hidden=true><use href=#i-grid /></svg>答题卡</span>
    ${idxs.map(i=>{
      const a = ans[i], qq = quizAt(p,i);
      const cls = a === undefined ? "" : (a === qq.a ? " ok" : " no");
      const tip = "第 " + (i+1) + " 题" + (a === undefined ? "（未作答）" : (a === qq.a ? "（答对）" : "（答错）"));
      return `<button class="qs-i${cls}" data-qjump="${i}" title="${tip}">${i+1}</button>`;
    }).join("")}
    <span class="qs-leg">
      <span><i class="ql ok"></i>答对</span><span><i class="ql no"></i>答错</span><span><i class="ql"></i>未做</span>
    </span>` : "";
  document.getElementById("quizBody").innerHTML = idxs.length ? idxs.map(i=>{
    const q = quizAt(p,i), chosen = ans[i], answered = chosen !== undefined;
    const opts = q.opts.map((o,j)=>{
      let cls = "q-opt";
      if(answered){
        cls += " lock";
        if(j === q.a) cls += " right";
        else if(j === chosen) cls += " wrong";
      }
      return `<div class="${cls}" data-q="${i}" data-o="${j}"><div class="ol">${"ABCD"[j]}</div><div>${esc(o)}</div></div>`;
    }).join("");
    /* 已答的题：默认收起 4 个选项，只留一行结果 —— 否则 35 题会铺出近 1 万 px */
    const optsHTML = answered
      ? `<div class="q-res ${chosen===q.a?"ok":"no"}">
           <span class="qr-i">${chosen===q.a?"✓":"✕"}</span>
           <span>你选 <b>${"ABCD"[chosen]||"—"}</b>${chosen===q.a?"　正确":`　·　正确答案 <b>${"ABCD"[q.a]}</b>`}</span>
           <button class="qr-more" data-qmore="${i}">看选项</button>
           ${(()=>{ for(let k=1;k<=tot;k++){ const j=(i+k)%tot; if(ans[j]===undefined && quizAt(p,j)) return `<button class="qr-more qr-next" data-qjump="${j}">下一题 →</button>`; } return ""; })()}
         </div>
         <div class="qopts" hidden>${opts}</div>`
      : opts;
    const lv = quizLvAt(p,i), tp = quizTypeOf(q);
    /* 逐题模式：默认只留题干一行，点开才展开选项（一次一题）—— 这是 9956px 降到 2000px 量级的关键 */
    if(!(quizExpandAll || i === quizFocus)){
      return `<div class="quiz-q q-collapsed" data-qi="${i}" data-qopen="${i}">
        <div class="qq-title"><div class="qq-no">${i+1}</div>
          <div class="qq-main">${esc(q.q)}</div>
          <div class="qq-tags">${lv?`<span class="qq-lv l-${QUIZ_LEV.indexOf(lv)}">${lv}</span>`:""}${
            tp!=="choice"?`<span class="qq-tp">${QUIZ_TYPE[tp]||tp}</span>`:""}
            <span class="qq-state${answered?(chosen===q.a?" ok":" no"):""}">${answered?(chosen===q.a?"✓ 答对":"✕ 答错"):"未作答"}</span></div>
        </div>
        ${answered?`<div class="q-res-mini">你选 <b>${"ABCD"[chosen]||"—"}</b>　·　正确答案 <b>${"ABCD"[q.a]}</b></div>`:""}
      </div>`;
    }
    return `<div class="quiz-q" data-qi="${i}">
      <div class="qq-title"><div class="qq-no">${i+1}</div>
        <div class="qq-main">${esc(q.q)}</div>
        <div class="qq-tags">${lv?`<span class="qq-lv l-${QUIZ_LEV.indexOf(lv)}">${lv}</span>`:""}${
          tp!=="choice"?`<span class="qq-tp">${QUIZ_TYPE[tp]||tp}</span>`:""}</div>
      </div>
      ${optsHTML}
      ${answered?quizExpHTML(p.id, q, i, chosen):""}
    </div>`;
  }).join("") : `<div class="card"><div class="empty">当前筛选条件下没有题目，换个难度或题型试试～</div></div>`;
}

/* ══════════════ 模块八：工程计算器 ══════════════ */
function toNum(v){ const n = parseFloat(v); return isFinite(n) ? n : 0; }
function nfmt(n, d){
  if(!isFinite(n)) return "—";
  if(Math.abs(n) >= 10000) return Math.round(n).toLocaleString("zh-CN");
  d = (d === undefined) ? 2 : d;
  let s = n.toFixed(d);
  if(s.indexOf(".") >= 0) s = s.replace(/0+$/,"").replace(/\.$/,"");
  return s;
}
const CALCS = [
{id:"shrink", icon:"<svg class=ic aria-hidden=true><use href=#i-ruler /></svg>", name:"收缩率换算", desc:"由成品尺寸反推模具型腔尺寸，是尺寸不超差的第一步",
 fields:[{k:"dim", l:"成品尺寸 (mm)", v:100}, {k:"sr", l:"材料收缩率 (%)", v:0.6}],
 formula:"模具尺寸 = 成品尺寸 ÷ (1 − 收缩率)　·　非结晶塑料 0.3-0.8%，结晶塑料 1.0-2.5%",
 calc:v=>{ const m = v.dim/(1-v.sr/100); return {
   main:{l:"模具型腔尺寸", val:nfmt(m,3), u:"mm"},
   extra:[{k:"相比成品需做大", v:nfmt(m-v.dim,3)+" mm"}, {k:"放大比例", v:nfmt(v.sr,2)+" %"},
          {k:"提示", v:"精密件需在成型 24h 后复测（后收缩）"}]};}},
{id:"clamp", icon:"<svg class=ic aria-hidden=true><use href=#i-gauge /></svg>", name:"锁模力估算", desc:"选注塑机吨位的快速估算，避免飞边或欠注",
 fields:[{k:"area", l:"制品投影面积 (cm²)", v:100}, {k:"coef", l:"材料系数 (t/cm²)", v:0.4}],
 formula:"锁模力 = 投影面积 × 材料系数　·　系数参考：ABS/PC 0.3-0.4，PP 0.3-0.5，流动性差取上限",
 calc:v=>{ const f = v.area*v.coef; return {
   main:{l:"所需锁模力", val:nfmt(f,1), u:"t"},
   extra:[{k:"建议机型吨位（含 20% 余量）", v:nfmt(f*1.2,0)+" t"},
          {k:"注意", v:"投影面积含流道；深腔件系数取大值"}]};}},
{id:"cavity", icon:"<svg class=ic aria-hidden=true><use href=#i-hash /></svg>", name:"模穴数计算", desc:"按年需求量反推合理模穴数，避免开大模或产能不够",
 fields:[{k:"annual", l:"年需求量 (件)", v:600000}, {k:"days", l:"年工作天数 (天)", v:300}, {k:"daily", l:"单机日产能 (件/天)", v:2000}],
 formula:"模穴数 = 年需求量 ÷ (年工作天数 × 单机日产能)，向上取整",
 calc:v=>{ const need = v.annual/((v.days||1)*(v.daily||1)); const cav = Math.max(1, Math.ceil(need)); return {
   main:{l:"建议模穴数", val:cav, u:"穴"},
   extra:[{k:"理论需求", v:nfmt(need,2)+" 穴"}, {k:"日产能需求", v:nfmt(v.annual/Math.max(v.days,1),0)+" 件/天"},
          {k:"提示", v:"模穴数每翻倍，模具费约增 40-60%，效率增约 80%"}]};}},
{id:"amort", icon:"<svg class=ic aria-hidden=true><use href=#i-coins /></svg>", name:"模具摊销计算", desc:"判断模具成本对单价的影响，决定是否谈阶梯价",
 fields:[{k:"mold", l:"模具总价 (元)", v:60000}, {k:"qty", l:"订单量 (件)", v:100000}],
 formula:"单件摊销 = 模具总价 ÷ 订单量　·　摊销高于料价 20% 就要重新评估模穴数或谈阶梯价",
 calc:v=>{ const per = v.mold/(v.qty||1); return {
   main:{l:"单件模具摊销", val:nfmt(per,3), u:"元/件"},
   extra:[{k:"订单量翻倍后的摊销", v:nfmt(per/2,3)+" 元/件"},
          {k:"订单量减半后的摊销", v:nfmt(per*2,3)+" 元/件"}]};}},
{id:"tj", icon:"<svg class=ic aria-hidden=true><use href=#i-flame /></svg>", name:"LED 结温估算", desc:"判断散热方案是否够用，Tj 越低 LED 寿命越长",
 fields:[{k:"ta", l:"环境温度 Ta (℃)", v:25}, {k:"p", l:"LED 功耗 P (W)", v:3},
         {k:"rjc", l:"结壳热阻 Rθjc (℃/W)", v:5}, {k:"rcs", l:"界面热阻 Rθcs (℃/W)", v:1},
         {k:"rsa", l:"散热器热阻 Rθsa (℃/W)", v:4}],
 formula:"Tj = Ta + P × (Rθjc + Rθcs + Rθsa)　·　目标 Tj < 85℃ 良好，< 105℃ 可用，每升 10℃ 寿命约减半",
 calc:v=>{ const r = v.rjc+v.rcs+v.rsa; const tj = v.ta + v.p*r;
   const judge = tj < 85 ? "✅ 良好" : tj < 105 ? "⚠️ 可用，建议优化" : "❌ 超标，必须加强散热";
   return { main:{l:"估算结温 Tj", val:nfmt(tj,1), u:"℃"},
   extra:[{k:"总热阻 ΣRθ", v:nfmt(r,2)+" ℃/W"}, {k:"按功耗分摊的温升", v:nfmt(v.p*r,1)+" ℃"},
          {k:"判定", v:judge}, {k:"最大热阻环节", v:["结壳","界面","散热器"][[v.rjc,v.rcs,v.rsa].indexOf(Math.max(v.rjc,v.rcs,v.rsa))]}]};}},
{id:"cost", icon:"<svg class=ic aria-hidden=true><use href=#i-tag /></svg>", name:"塑料件成本估算", desc:"料工费 + 良率 + 表面处理，估算单件落地成本",
 fields:[{k:"w", l:"单件重量 (g)", v:50}, {k:"price", l:"料价 (元/kg)", v:18}, {k:"loss", l:"材料损耗 (%)", v:4},
         {k:"rate", l:"机时费 (元/h)", v:60}, {k:"cycle", l:"成型周期 (s)", v:30}, {k:"cav", l:"模穴数", v:2},
         {k:"yield", l:"良率 (%)", v:95}, {k:"extra", l:"表处+包装 (元)", v:1.5}],
 formula:"单件成本 = (材料费 + 加工费) ÷ 良率 + 表面处理与包装费　·　材料费 = 重量 × 单价 ÷ 1000 × (1+损耗)",
 calc:v=>{ const mat = v.w*v.price/1000*(1+v.loss/100);
   const mach = v.rate*v.cycle/3600/Math.max(v.cav,1);
   const total = (mat+mach)/((v.yield||1)/100) + v.extra;
   return { main:{l:"单件估算成本", val:nfmt(total,3), u:"元"},
   extra:[{k:"材料费", v:nfmt(mat,3)+" 元"}, {k:"加工费（按模穴分摊）", v:nfmt(mach,3)+" 元"},
          {k:"良率损失", v:nfmt((mat+mach)*(100/(v.yield||1)-1),3)+" 元"},
          {k:"表处 + 包装", v:nfmt(v.extra,3)+" 元"},
          {k:"材料费占比", v:nfmt(total?mat/total*100:0,1)+" %"}]};}},
{id:"drop", icon:"<svg class=ic aria-hidden=true><use href=#i-box /></svg>", name:"跌落缓冲厚度估算", desc:"由跌落高度与产品脆值估算缓冲材料所需厚度（简化估算）",
 fields:[{k:"h", l:"跌落高度 (mm)", v:1000}, {k:"g", l:"产品脆值 (G)", v:50}, {k:"c", l:"缓冲材料系数 C", v:3}],
 formula:"缓冲厚度 ≈ C × 跌落高度 × 脆值 ÷ 10000　·　C 参考：EPE 珍珠棉 2.5-4，EVA 2-3.5。实际需按材料动态缓冲曲线选型",
 calc:v=>{ const t = v.c*v.h*v.g/10000; return {
   main:{l:"建议缓冲厚度", val:nfmt(t,1), u:"mm"},
   extra:[{k:"脆值参考", v:"电子件 40-60G、结构件 60-100G"},
          {k:"注意", v:"按角跌姿态校核，四角缓冲需加厚"}]};}},
{id:"tol", icon:"<svg class=ic aria-hidden=true><use href=#i-layers /></svg>", name:"公差叠加分析", desc:"对比最坏情况法与统计法，判断装配是否可靠",
 fields:[{k:"t1", l:"公差 1 (±mm)", v:0.1}, {k:"t2", l:"公差 2 (±mm)", v:0.1},
         {k:"t3", l:"公差 3 (±mm)", v:0.15}, {k:"t4", l:"公差 4 (±mm)", v:0.1}, {k:"t5", l:"公差 5 (±mm)", v:0.2}],
 formula:"最坏情况法 WC = Σ公差（保守）；统计法 RSS = √(Σ公差²)（更贴近实际）",
 calc:v=>{ const arr = [v.t1,v.t2,v.t3,v.t4,v.t5];
   const wc = arr.reduce((a,b)=>a+b,0);
   const rss = Math.sqrt(arr.reduce((a,b)=>a+b*b,0));
   return { main:{l:"最坏情况法总公差", val:"±"+nfmt(wc,3), u:"mm"},
   extra:[{k:"统计法（RSS）总公差", v:"±"+nfmt(rss,3)+" mm"},
          {k:"差值", v:nfmt(wc-rss,3)+" mm"},
          {k:"建议预留装配间隙", v:"≥ "+nfmt(wc,3)+" mm（取保守值）"}]};}},
{id:"snap", icon:"<svg class=ic aria-hidden=true><use href=#i-snap /></svg>", name:"卡扣应变校核", desc:"算出卡扣的最大应变，判断会不会装一次就断",
 fields:[{k:"t", l:"卡扣厚度 t (mm)", v:1.5}, {k:"y", l:"扣入量 / 挠度 y (mm)", v:1},
         {k:"L", l:"悬臂有效长度 L (mm)", v:12}, {k:"allow", l:"材料允许应变 (%)", v:1.5}],
 formula:"ε = 1.5 · t · y / L²　·　允许应变参考：ABS 约 1.5%、PC 约 2.0%、PP 约 3.0%、POM 约 2.5%（已含安全系数）",
 calc:v=>{ const eps = 1.5*v.t*v.y/(Math.max(v.L,0.001)*Math.max(v.L,0.001))*100;
   const ratio = v.allow ? eps/v.allow : 0;
   const verdict = !isFinite(eps) ? "参数有误" : ratio<=0.7 ? "✅ 安全（有余量）" : ratio<=1 ? "⚠️ 接近上限，建议留更多余量" : "❌ 超出允许应变，易断裂";
   return { main:{l:"卡扣最大应变 ε", val:nfmt(eps,2), u:"%"},
   extra:[{k:"材料允许应变", v:nfmt(v.allow,2)+" %"},
          {k:"安全裕度（允许/实际）", v:nfmt(ratio?1/ratio:0,2)+" 倍"},
          {k:"判定", v:verdict},
          {k:"调优方向", v:"加长 L 最有效（应变与 L² 成反比），其次减小 y 或 t"}]};}},
{id:"lux", icon:"<svg class=ic aria-hidden=true><use href=#i-bulb /></svg>", name:"照度与光效换算", desc:"由光通量估算照射面平均照度，并核算整灯光效",
 fields:[{k:"flux", l:"总光通量 Φ (lm)", v:800}, {k:"area", l:"照射面积 (m²)", v:6},
         {k:"cu", l:"利用系数 CU (0-1)", v:0.7}, {k:"mf", l:"维护系数 MF (0-1)", v:0.8},
         {k:"pw", l:"输入功率 (W)", v:10}],
 formula:"E = Φ · CU · MF / A　·　光效 η = Φ / P　·　CU 常见 0.5-0.8，MF 常见 0.7-0.9",
 calc:v=>{ const E = v.flux*v.cu*v.mf/Math.max(v.area,0.0001);
   const eff = v.flux/Math.max(v.pw,0.0001);
   const lvl = eff>=120 ? "优秀" : eff>=100 ? "良好" : eff>=80 ? "一般，可优化光学件或驱动" : "偏低，损耗过大";
   return { main:{l:"平均照度 E", val:nfmt(E,1), u:"lx"},
   extra:[{k:"整灯光效 η", v:nfmt(eff,1)+" lm/W（"+lvl+"）"},
          {k:"阅读场景（需 ≥300 lx）", v:E>=300 ? "✅ 达标" : "❌ 不足，需提高光通量或缩小面积"},
          {k:"注意", v:"整灯光效通常比单颗 LED 低 20%-40%，损失在扩散件、透镜与驱动上"}]};}},
{id:"stack", icon:"<svg class=ic aria-hidden=true><use href=#i-stack /></svg>", name:"包装堆码强度", desc:"按堆码层数与仓储条件反推纸箱所需抗压强度",
 fields:[{k:"w", l:"单箱重量 (kg)", v:8}, {k:"n", l:"堆码层数", v:6}, {k:"k", l:"安全系数", v:2}],
 formula:"BCT ≥ (n − 1) × W × K　·　K 取 1.6-3.0（仓储越久、湿度越高取越大；纸箱长期堆码强度会衰减到 50%-60%）",
 calc:v=>{ const need = Math.max(v.n-1,0)*v.w*v.k;
   return { main:{l:"所需纸箱抗压强度 BCT", val:nfmt(need,1), u:"kgf"},
   extra:[{k:"理论承重（不含安全系数）", v:nfmt(Math.max(v.n-1,0)*v.w,1)+" kgf"},
          {k:"折合牛顿", v:nfmt(need*9.807,0)+" N"},
          {k:"堆高参考（单箱按 300mm 估）", v:nfmt((v.n-1)*0.3,1)+" m"},
          {k:"提示", v:"按最底层箱子计算；仓储超过 30 天建议 K 取 2.5 以上"}]};}},
{id:"pilot", icon:"<svg class=ic aria-hidden=true><use href=#i-screw /></svg>", name:"自攻螺丝底孔", desc:"算出底孔、柱外径与柱壁厚，避免滑牙或撑裂",
 fields:[{k:"d", l:"螺丝外径 d (mm)", v:3}, {k:"kf", l:"底孔系数 (0.78-0.82)", v:0.8},
         {k:"len", l:"螺丝旋入长度 (mm)", v:6}],
 formula:"底孔 ≈ d × 0.8　·　柱外径 ≈ d × 2（保证柱壁厚 ≥1.0mm）　·　内孔深 ≥ 旋入长度 + 0.5mm",
 calc:v=>{ const hole = v.d*v.kf, boss = v.d*2, wall = (boss-hole)/2;
   const warn = wall < 1 ? "⚠️ 柱壁厚不足 1.0mm，建议加粗柱外径" : "✅ 柱壁厚充足";
   return { main:{l:"底孔直径", val:nfmt(hole,2), u:"mm"},
   extra:[{k:"建议柱外径", v:nfmt(boss,2)+" mm"},
          {k:"实际柱壁厚", v:nfmt(wall,2)+" mm（"+warn+"）"},
          {k:"建议内孔深度", v:nfmt(v.len+0.5,1)+" mm 以上"},
          {k:"根部", v:"加 R0.25-0.5 圆角或加强筋，抗裂能力明显提升"}]};}},
{id:"cool", icon:"<svg class=ic aria-hidden=true><use href=#i-snow /></svg>", name:"注塑冷却时间", desc:"理论冷却时间估算，判断周期是否还有压缩空间",
 fields:[{k:"T", l:"制品壁厚 T (mm)", v:2}, {k:"a", l:"热扩散系数 α (mm²/s)", v:0.09},
         {k:"tm", l:"熔体温度 (℃)", v:230}, {k:"tw", l:"模具温度 (℃)", v:60}, {k:"te", l:"顶出温度 (℃)", v:90}],
 formula:"t = { T² / (π² · α) } · ln{ (4/π) · (Tm − Tw) / (Te − Tw) }　·　α 参考：ABS 约 0.09、PC 约 0.10、PP 约 0.08 mm²/s",
 calc:v=>{ const ok = (v.te > v.tw) && (v.tm > v.te);
   const base = v.T*v.T/(Math.PI*Math.PI*Math.max(v.a,0.0001));
   const ratio = (4/Math.PI)*(v.tm-v.tw)/Math.max(v.te-v.tw,0.0001);
   const tc = ok ? base*Math.log(ratio) : NaN;
   const ex = [];
   if(!ok){ ex.push({k:"参数不成立", v:"需满足：熔体温度 > 顶出温度 > 模具温度"}); }
   else{
     ex.push({k:"壁厚加倍后", v:nfmt(tc*4,2)+" s（厚度是平方关系）"});
     ex.push({k:"冷却时间占比", v:"实际周期中冷却常占 50%-70%"});
   }
   ex.push({k:"提示", v:"缩短周期的优先手段是减薄壁厚与优化水路，而不是一味降温"});
   return { main:{l:"理论冷却时间", val:nfmt(tc,2), u:"s"}, extra:ex };}}
];
function runCalc(c){
  const v = {};
  c.fields.forEach(f=>{
    const el = document.querySelector('input[data-calc="'+c.id+'"][data-k="'+f.k+'"]');
    v[f.k] = el ? toNum(el.value) : f.v;
  });
  const r = c.calc(v);
  const el = document.getElementById("res-"+c.id);
  if(!el) return;
  el.innerHTML = `<div class="cr-main">${esc(r.main.l)}</div>
    <div class="cr-val">${esc(String(r.main.val))}<small>${esc(r.main.u||"")}</small></div>
    ${(r.extra&&r.extra.length) ? `<div class="cr-extra">${r.extra.map(x=>`<div><span>${esc(x.k)}</span><b>${esc(String(x.v))}</b></div>`).join("")}</div>` : ""}`;
}
/* ══════════════ 我的常用（首页快捷入口） ══════════════ */
const MOD_LABEL = {
  kb: "知识库", map: "学习地图", daily: "每日20题", quiz: "自测题库", wrong: "错题本",
  review: "复习计划", stats: "学习数据", calc: "计算器", path: "30天路径", select: "选型决策",
  formula: "公式速查", quick: "速查手册", check: "检查清单", tpl: "实战模板", case: "整机案例",
  gloss: "术语词典", gallery: "参考图库", field: "实战宝典", compare: "知识点对比",
  step: "STEP成本评估", fav: "我的收藏"
};
/* 模块描述。⚠️ 这里刻意不写「多少条」—— 数量会变，写死必然过期；
   需要数字的地方用带 data-cnt 标记的元素（见 syncCounts）。 */
const MOD_DESC = {
  step: "传 STEP，算体积 / 重量 / 模具费 / 单件成本",
  calc: "13 个常用工程计算，输入会记住",
  quick: "17 张速查表：塑料 / 公差 / 螺丝 / 安规",
  check: "开模前逐项核对，别漏项",
  formula: "42 个公式，照着套",
  case: "6 款整机案例，看别人怎么做",
  select: "选型决策树，纠结时走一遍",
  gallery: "594 张实景参考图",
  field: "避坑 30 例 · 缺陷排查 35 条 · 标准 72 项",
  compare: "任选两条知识点并排看",
  gloss: "139 条术语，跟供应商对得上话",
  tpl: "4 份实战模板，直接改着用",
  daily: "每天 20 题，碎片时间刷",
  wrong: "错题自动收集，专治反复错",
  quiz: "432 道题，按领域练",
  map: "12 个领域的知识地图",
  path: "6 周 29 天的学习计划",
  kb: "知识点全库",
  stats: "掌握率与学习曲线",
  review: "按记忆曲线安排复习",
  fav: "收藏与笔记"
};
const HQ_DEFAULT = ["step", "calc", "quick", "check"];
let hqEdit = false;

function switchMod(id){
  const b = document.querySelector('.nav-tab[data-mod="' + id + '"]');
  if (b) b.click();
}

function renderHomeQuick(){
  const host = document.getElementById("homeQuick");
  if (!host) return;
  const w = window.KB_WS;
  let list = w ? w.shortList() : [];
  const usingDefault = !list.length;
  if (usingDefault) list = HQ_DEFAULT.slice();

  host.innerHTML =
    '<div class="hq-h"><b>我的常用</b>'
    + '<span>' + (usingDefault ? "先放了几个最常用的，点「编辑」换成你自己的" : "点「编辑」可以增减") + '</span>'
    + '<button class="hq-edit" id="hqEdit">' + (hqEdit ? "完成" : "编辑") + '</button></div>'
    + '<div class="hq-grid">'
    + list.map(id =>
        '<button class="hq-item" data-mod="' + id + '">'
        + '<b>' + esc(MOD_LABEL[id] || id) + '</b>'
        + '<span>' + esc(MOD_DESC[id] || "") + '</span></button>').join("")
    + '</div>'
    + (hqEdit
      ? '<div class="hq-pick">'
        + Object.keys(MOD_LABEL).map(id =>
            '<label class="hq-pick-i"><input type="checkbox" data-hqp="' + id + '"'
            + (list.indexOf(id) >= 0 ? " checked" : "") + '><span>' + esc(MOD_LABEL[id]) + '</span></label>').join("")
        + '<div class="hq-pick-t">最多钉 8 个；不选就恢复默认</div></div>'
      : "");

  Array.prototype.forEach.call(host.querySelectorAll(".hq-item"), b => {
    b.onclick = () => switchMod(b.dataset.mod);
  });
  const ebtn = document.getElementById("hqEdit");
  if (ebtn) ebtn.onclick = () => { hqEdit = !hqEdit; renderHomeQuick(); };
  Array.prototype.forEach.call(host.querySelectorAll("[data-hqp]"), c => {
    c.onchange = () => {
      if (!w) return;
      let cur = w.shortList();
      if (!cur.length) cur = list.slice();   // 首次钉选：以当前显示的默认集合为起点
      const i = cur.indexOf(c.dataset.hqp);
      if (i >= 0) cur.splice(i, 1); else if (cur.length < 8) cur.push(c.dataset.hqp);
      else { c.checked = false; return; }
      w.shortSet(cur); renderHomeQuick();
    };
  });
}

/* ══════════════ 计算器：输入记忆 + 结果复制 ══════════════ */
function calcMemApply(){
  const w = window.KB_WS;
  const cards = document.querySelectorAll("#calcBody .calc-card");
  /* ① 先把上次填的值放回输入框（必须在 runCalc 之前，结果才对） */
  if (w) {
    document.querySelectorAll("#calcBody input[data-calc]").forEach(el => {
      const m = w.calcGet(el.dataset.calc);
      if (m && m[el.dataset.k] !== undefined && m[el.dataset.k] !== null) el.value = m[el.dataset.k];
    });
  }
  /* ② 每张卡补两个按钮：复制结果 / 清空输入 */
  cards.forEach((card, i) => {
    const c = CALCS[i];
    if (!c || card.querySelector(".calc-tools")) return;
    const t = document.createElement("div");
    t.className = "calc-tools";
    t.innerHTML = '<button class="pill" data-ccopy="' + c.id + '">'
      + '<svg class=ic aria-hidden=true><use href=#i-clipboard /></svg>复制结果</button>'
      + '<button class="mini-t" data-creset="' + c.id + '">清空输入</button>';
    card.appendChild(t);
  });
}
function calcResultText(c){
  const vals = [];
  c.fields.forEach(f => {
    const el = document.querySelector('input[data-calc="' + c.id + '"][data-k="' + f.k + '"]');
    vals.push(f.l + " " + (el ? el.value : f.v));
  });
  const res = document.getElementById("res-" + c.id);
  let main = "";
  if (res) {
    const l = res.querySelector(".cr-main"), v = res.querySelector(".cr-val");
    if (v) main = (l ? l.textContent + " = " : "") + v.textContent.replace(/\s+/g, " ").trim();
  }
  const ex = [];
  if (res) res.querySelectorAll(".cr-extra div").forEach(d => {
    const sp = d.querySelector("span"), b = d.querySelector("b");
    if (sp && b) ex.push("　· " + sp.textContent + "：" + b.textContent);
  });
  return "【" + c.name + "】\n输入：" + vals.join("　")
    + "\n结果：" + main + (ex.length ? "\n" + ex.join("\n") : "")
    + "\n（算于 " + new Date().toLocaleString("zh-CN") + "）";
}
function copyCalcResult(btn, c){
  const txt = calcResultText(c);
  const done = () => {
    if (!btn.dataset.orig) btn.dataset.orig = btn.innerHTML;
    btn.innerHTML = "已复制";
    setTimeout(() => { if (btn.dataset.orig) btn.innerHTML = btn.dataset.orig; }, 1200);
  };
  const fallback = () => {
    const ta = document.createElement("textarea");
    ta.value = txt; ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    try { document.execCommand("copy"); done(); }
    catch (e) { alert("复制失败，请手动选中结果复制"); }
    ta.remove();
  };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(txt).then(done).catch(fallback);
  } else fallback();
}

function renderCalc(){
  document.getElementById("calcBody").innerHTML = CALCS.map(c=>`
    <div class="calc-card">
      <h4>${c.icon} ${esc(c.name)}</h4>
      <div class="calc-desc">${esc(c.desc)}</div>
      <div class="calc-fields">${c.fields.map(f=>`<div class="cf">
        <label>${esc(f.l)}</label>
        <input type="number" step="any" data-calc="${c.id}" data-k="${f.k}" value="${f.v}"></div>`).join("")}</div>
      <div class="calc-res" id="res-${c.id}"></div>
      <div class="calc-formula"><svg class=ic aria-hidden=true><use href=#i-ruler /></svg>${esc(c.formula)}</div>
    </div>`).join("");
  calcMemApply();
  CALCS.forEach(c=>runCalc(c));
}

/* ══════════════ 模块九：实战宝典 ══════════════ */
function renderField(){
  const MIS = window.KB_MISTAKE || [];
  const misN = MIS.reduce((a,x)=>a+x.items.length,0);
  const TABS = [
    {id:"mistake", n:"<svg class=ic aria-hidden=true><use href=#i-alert /></svg>设计避坑", c:misN+" 个"},
    {id:"trouble", n:"<svg class=ic aria-hidden=true><use href=#i-search /></svg>缺陷排查", c:KB_TROUBLE.reduce((a,x)=>a+x.items.length,0)+" 条"},
    {id:"interview", n:"<svg class=ic aria-hidden=true><use href=#i-briefcase /></svg>面试题库", c:KB_INTERVIEW.reduce((a,x)=>a+x.items.length,0)+" 题"},
    {id:"std", n:"<svg class=ic aria-hidden=true><use href=#i-clipboard /></svg>标准清单", c:KB_STD.reduce((a,x)=>a+x.items.length,0)+" 项"}
  ];
  document.getElementById("fieldTabs").innerHTML = TABS.map(t=>
    `<button class="qv-tab${t.id===activeField?" active":""}" data-field="${t.id}">${t.n} <span style="opacity:.65">${t.c}</span></button>`).join("");
  const box = document.getElementById("fieldBody");
  const q = (document.getElementById("fieldSearch").value||"").trim().toLowerCase();
  const hit = s => (s==null?"":String(s)).toLowerCase().includes(q);
  const noHit = `<div class="card"><div class="empty">没有匹配的内容，换个关键词试试～</div></div>`;
  if(activeField === "mistake"){
    const groups = MIS.map(g=>({g, items: g.items.filter(x=>!q || hit(x.t)||hit(x.bad)||hit(x.cost)||hit(x.good)||hit(x.how)||hit((x.ref||[]).join(" ")))}))
                      .filter(x=>x.items.length);
    box.innerHTML = groups.length ? `
      <div class="card">
        <h3><svg class=ic aria-hidden=true><use href=#i-alert /></svg>开模前评审：设计阶段的坑</h3>
        <div class="qv-desc">这里的每一条都是<strong>在设计阶段就能避免</strong>的错误。和「缺陷排查」的区别：排查表对付的是量产后出现的现象，这里防的是还没开模就埋下的隐患。</div>
        <div class="mk-key">
          <span><b class="mk-b">错误做法</b></span>
          <span><b class="mk-c">后果</b></span>
          <span><b class="mk-g">正确做法</b></span>
          <span><b class="mk-h">怎么自查</b></span>
        </div>
      </div>` + groups.map(({g,items})=>`
      <div class="card">
        <h3>${g.icon} ${esc(g.name)} <span style="font-size:11px;color:var(--sub);font-weight:normal">${esc(g.desc)}${q?`　·　筛出 ${items.length} 个`:""}</span></h3>
        ${items.map(it=>`
          <div class="mk-item">
            <div class="mk-t">${esc(it.t)}</div>
            <div class="mk-row"><span class="mk-k mk-b">✗ 错误做法</span><div class="mk-v">${esc(it.bad)}</div></div>
            <div class="mk-row"><span class="mk-k mk-c">⚠ 后果</span><div class="mk-v">${esc(it.cost)}</div></div>
            <div class="mk-row"><span class="mk-k mk-g">✓ 正确做法</span><div class="mk-v">${esc(it.good)}</div></div>
            <div class="mk-row"><span class="mk-k mk-h"><svg class=ic aria-hidden=true><use href=#i-search /></svg>怎么自查</span><div class="mk-v">${esc(it.how)}</div></div>
            ${(it.ref||[]).length?`<div class="mk-rel">关联：${it.ref.map(n=>`<button class="rel-chip" data-rel="${esc(n)}">${esc(n)} →</button>`).join("")}</div>`:""}
          </div>`).join("")}
      </div>`).join("") : noHit;
  }else if(activeField === "trouble"){
    const groups = KB_TROUBLE.map(g=>({g, items: g.items.filter(x=>!q || hit(x.s)||hit(x.c.join(" "))||hit(x.f.join(" "))||hit(x.v))}))
                            .filter(x=>x.items.length);
    box.innerHTML = groups.length ? groups.map(({g,items})=>`
      <div class="card">
        <h3>${g.icon} ${esc(g.name)}</h3>
        <div class="qv-desc">${esc(g.desc)}${q?`　·　筛出 ${items.length} 条`:""}</div>
        ${items.map(it=>`
          <div class="tr-item">
            <div class="tr-sym"><svg class=ic aria-hidden=true><use href=#i-alert /></svg>${esc(it.s)}</div>
            <div class="tr-bd">
              <div class="tr-row"><div class="trk">可能原因</div><div class="trv">${it.c.map(esc).join("；")}</div></div>
              <div class="tr-row fix"><div class="trk">对策</div><div class="trv">${it.f.map((x,i)=>(i+1)+". "+esc(x)).join("　")}</div></div>
              <div class="tr-row"><div class="trk">怎么验证</div><div class="trv">${esc(it.v)}</div></div>
            </div>
          </div>`).join("")}
      </div>`).join("") : noHit;
  }else if(activeField === "interview"){
    const groups = KB_INTERVIEW.map(g=>({g, items: g.items.filter(x=>!q || hit(x.q)||hit(x.a.join(" "))||hit(x.cat)||hit(x.tag))}))
                              .filter(x=>x.items.length);
    box.innerHTML = groups.length ? groups.map(({g,items})=>`
      <div class="card">
        <h3>${g.icon} ${esc(g.cat)}${q?` <span style="font-size:11px;color:var(--sub);font-weight:normal">筛出 ${items.length} 题</span>`:""}</h3>
        ${items.map(it=>{
          const cls = it.tag==="核心" ? "" : (it.tag==="加分" ? "plus" : "mid");
          return `<div class="iv-item">
            <div class="iv-q"><span class="iv-tag ${cls}">${esc(it.tag)}</span><span>${esc(it.q)}</span></div>
            <ul class="iv-a">${it.a.map(x=>`<li>${esc(x)}</li>`).join("")}</ul>
          </div>`;
        }).join("")}
      </div>`).join("") : noHit;
  }else{
    const groups = KB_STD.map(g=>({g, items: g.items.filter(x=>!q || hit(x.code)||hit(x.name)||hit(x.note))}))
                         .filter(x=>x.items.length);
    const total = groups.reduce((a,x)=>a+x.items.length,0);
    box.innerHTML = groups.length ? groups.map(({g,items})=>`
      <div class="card">
        <h3>${g.icon} ${esc(g.cat)}</h3>
        <div class="tbl-scroll"><table class="mini std-tbl">
          <thead><tr><th style="width:225px">标准号</th><th style="width:270px">名称</th><th>说明 / 用途</th></tr></thead>
          <tbody>${items.map(x=>`<tr><td>${esc(x.code)}</td><td>${esc(x.name)}</td><td>${esc(x.note)}</td></tr>`).join("")}</tbody>
        </table></div>
      </div>`).join("") + (q?`<div class="qv-stat" style="font-size:12px;color:var(--sub);margin-top:4px;">共筛出 ${total} 项标准</div>`:"") : noHit;
  }
}

/* ══════════════ 模块十一：选型决策 ══════════════ */
let selCur = null;         // 当前节点 id
let selPath = [];          // [{nodeId, ans}] 走过的路

function selTree(){ return (window.KB_SELECT||[]).find(x=>x.id===activeSel) || (window.KB_SELECT||[])[0]; }

function renderSelect(){
  const T = window.KB_SELECT || [];
  if(!T.length) return;
  const tabsEl = document.getElementById("selTabs");
  tabsEl.innerHTML = T.map(t=>`<button class="qv-tab${t.id===activeSel?" active":""}" data-sel="${t.id}">${t.icon} ${esc(t.name)}</button>`).join("");
  const tree = selTree();
  if(!selCur || !tree.nodes[selCur]){ selCur = tree.start; selPath = []; }
  const node = tree.nodes[selCur];
  const pathHtml = selPath.length
    ? `<div class="sel-path">${selPath.map(p=>`<span class="sel-ans">${esc(p.ans)}</span>`).join('<span class="sel-ar">›</span>')}</div>`
    : `<div class="sel-path"><span class="sel-start">从这里开始 ↓</span></div>`;
  const acts = `<div class="sel-acts">${selPath.length?`<button class="sel-btn back" id="selBack">‹ 返回上一步</button>`:""}<button class="sel-btn reset" id="selReset">↺ 重新开始</button></div>`;
  let body;
  if(node.r){
    const r = node.r;
    body = `<div class="sel-result">
      <div class="sr-head">推荐结论</div>
      <div class="sr-title">${esc(r.title)}</div>
      <div class="sr-block why"><div class="sr-k">为什么推荐它</div><ul>${(r.why||[]).map(x=>`<li>${esc(x)}</li>`).join("")}</ul></div>
      <div class="sr-block avoid"><div class="sr-k">要特别注意</div><ul>${(r.avoid||[]).map(x=>`<li>${esc(x)}</li>`).join("")}</ul></div>
      <div class="sr-note">💡 ${esc(r.note)}</div>
      ${(r.ref||[]).length?`<div class="sr-rel">深入看这些知识点：${r.ref.map(n=>`<button class="rel-chip" data-rel="${esc(n)}">${esc(n)} →</button>`).join("")}</div>`:""}
      ${acts}
    </div>`;
  } else {
    const n = selPath.length;
    body = `<div class="sel-q"><span class="sel-step">第 ${n+1} 步</span>${esc(node.q)}</div>
      <div class="sel-opts">${node.opts.map((o,i)=>`<button class="sel-opt" data-opt="${i}"><span class="so-i">${i+1}</span><span class="so-t">${esc(o.t)}</span><span class="so-a">→</span></button>`).join("")}</div>
      ${acts}`;
  }
  document.getElementById("selBody").innerHTML = `
    <div class="card sel-card">
      <h3>${tree.icon} ${esc(tree.name)} <span class="sel-desc">${esc(tree.desc)}</span></h3>
      ${pathHtml}
      ${body}
    </div>`;
}

/* ══════════════ 模块十二：公式速查 ══════════════ */
function renderFormula(){
  const FM = window.KB_FORMULA || [], UN = window.KB_UNIT || [];
  const tabs = FM.map(g=>({ id:g.cat, n:g.icon+" "+g.cat,
    c:(g.items||[]).length+" 条" }));
  tabs.push({ id:"__unit", n:"<svg class=ic aria-hidden=true><use href=#i-ruler /></svg>单位换算", c:UN.reduce((a,x)=>a+(x.items||[]).length,0)+" 条" });
  if(activeFm !== "__unit" && !FM.some(g=>g.cat===activeFm)) activeFm = tabs[0].id;
  document.getElementById("fmTabs").innerHTML = tabs.map(t=>
    `<button class="qv-tab${t.id===activeFm?" active":""}" data-fm="${esc(t.id)}">${t.n} <span style="opacity:.65">${t.c}</span></button>`).join("");
  const q = (document.getElementById("fmSearch").value||"").trim().toLowerCase();
  const hit = s => (s==null?"":String(s)).toLowerCase().includes(q);
  const box = document.getElementById("fmBody");
  const noHit = `<div class="card"><div class="empty">没有匹配的内容，换个关键词试试～</div></div>`;

  if(activeFm === "__unit"){
    const groups = UN.map(g=>({ g, items:(g.items||[]).filter(x=>!q || hit(x.a)||hit(x.b)||hit(x.note)) })).filter(x=>x.items.length);
    box.innerHTML = groups.length ? groups.map(({g,items})=>`
      <div class="card">
        <h3>${g.icon} ${esc(g.cat)}</h3>
        <div class="tbl-scroll"><table class="mini">
          <thead><tr><th style="width:250px">这个单位</th><th style="width:250px">等于</th><th>备注 / 使用场景</th></tr></thead>
          <tbody>${items.map(x=>`<tr><td><b>${esc(x.a)}</b></td><td>${esc(x.b)}</td><td>${esc(x.note||"")}</td></tr>`).join("")}</tbody>
        </table></div>
      </div>`).join("") : noHit;
    return;
  }

  const groups = FM.map(g=>({ g, items:(g.items||[]).filter(x=>!q || hit(x.name)||hit(x.expr)||hit(x.when)||hit(x.eg)||hit(x.unit)||hit((x.vars||[]).map(v=>v.s+" "+v.d).join(" "))) })).filter(x=>x.items.length);
  box.innerHTML = groups.length ? groups.map(({g,items})=>`
    <div class="card">
      <h3>${g.icon} ${esc(g.cat)} <span class="sel-desc">${esc(g.desc||"")}${q?`　·　筛出 ${items.length} 条`:""}</span></h3>
      ${items.map(it=>`
        <div class="fm-item">
          <div class="fm-head"><span class="fm-name">${esc(it.name)}</span><span class="fm-unit">单位：${esc(it.unit)}</span></div>
          <div class="fm-expr">${esc(it.expr)}</div>
          <div class="fm-vars">${(it.vars||[]).map(v=>`<div class="fm-var"><span class="fv-s">${esc(v.s)}</span><span class="fv-d">${esc(v.d)}</span></div>`).join("")}</div>
          <div class="fm-when"><b>什么时候用：</b>${esc(it.when)}</div>
          ${it.eg?`<div class="fm-eg"><b>算例：</b>${esc(it.eg)}</div>`:""}
        </div>`).join("")}
    </div>`).join("") : noHit;
}

/* ══════════════ 模块十：参考图库 ══════════════ */
let gwLimit = 60;   // 分页渲染，避免手机端一次插入 498 个节点
function renderGallery(){
  const sel = document.getElementById("gwCat");
  if(!sel.dataset.init){
    sel.innerHTML = '<option value="">全部领域</option>' +
      KB_DOMAINS.map(d=>`<option value="${d.id}">${d.icon} ${esc(d.name)}</option>`).join("");
    sel.dataset.init = "1";
  }
  const q = (document.getElementById("gwSearch").value||"").trim().toLowerCase();
  const cat = sel.value;
  const cards = [];
  KB_ITEMS.forEach(it=>{
    const d = CAT_DOMAIN[it.cat]; if(!d) return;
    if(cat && d.id !== cat) return;
    ((window.KB_IMG||{})[it.name] || []).forEach(x=>{
      if(q && !(x.t+" "+it.name).toLowerCase().includes(q)) return;
      cards.push({it, x, d});
    });
  });
  const shown = cards.slice(0, gwLimit);
  document.getElementById("gwCount").textContent = cards.length + " 张";
  document.getElementById("gwStat").innerHTML =
    `共 <b>${cards.length}</b> 张参考图，覆盖 <b>${new Set(cards.map(c=>c.it.name)).size}</b> 个知识点` +
    (q||cat ? `（已筛选）` : `　·　点图片放大，点标题进入知识点`);
  document.getElementById("gwBody").innerHTML = (shown.length ? shown.map(c=>`
    <div class="gw-card" data-ref="${esc(c.x.f)}" data-cap="${esc(c.x.t)}" data-src="${esc(c.x.s||"")}">
      <div class="gc-img"><img src="${esc(refThumbOf(c.x.f))}" alt="${esc(c.x.t)}" loading="lazy" decoding="async"></div>
      <div class="gc-body">
        <div class="gc-item" data-rel="${esc(c.it.name)}">${c.d.icon} ${esc(c.it.name)} →</div>
        <div class="gc-cap">${esc(c.x.t)}</div>
      </div>
    </div>`).join("") : `<div class="empty" style="grid-column:1/-1">没有匹配的图片，换个关键词试试～</div>`)
    + (cards.length > gwLimit
        ? `<div style="grid-column:1/-1; text-align:center; padding:18px 0;">
             <button class="mini-btn" id="gwMore">加载更多（还有 ${cards.length - gwLimit} 张）</button>
           </div>`
        : "");
}

// 图库筛选变化时重置分页
function resetGallery(keepQ){ gwLimit = 60; renderGallery(); }

/* ══════════════ 模块十二：错题本与薄弱点 ══════════════ */
function allQuizQuestions(){
  const out = [];
  KB_QUIZ.forEach(p=>{
    for(let i=0;i<quizTotal(p);i++){ const q = quizAt(p,i); if(q) out.push({p, i, q}); }
  });
  return out;
}
function quizDomainStats(){
  return KB_QUIZ.map(p=>{
    const a = quizState[p.id] || {};
    let done = 0, right = 0;
    const total = quizTotal(p);
    for(let i=0;i<total;i++){
      const q = quizAt(p,i); if(!q) continue;
      if(a[i] !== undefined){ done++; if(a[i] === q.a) right++; }
    }
    return {p, total, done, right, wrong: done - right, pct: done ? Math.round(right/done*100) : -1};
  });
}
function wrongList(){
  const out = [];
  KB_QUIZ.forEach(p=>{
    const a = quizState[p.id] || {};
    for(let i=0;i<quizTotal(p);i++){
      const q = quizAt(p,i); if(!q) continue;
      if(a[i] !== undefined && a[i] !== q.a) out.push({p, i, q, chosen:a[i]});
    }
  });
  return out;
}
function barBg(v){ return v >= 80 ? "linear-gradient(90deg,#059669,#10b981)" : v >= 60 ? "linear-gradient(90deg,#d97706,#f59e0b)" : "linear-gradient(90deg,#dc2626,#ef4444)"; }

function renderWrong(){
  const list = wrongList(), doms = quizDomainStats();
  const answered = doms.reduce((a,d)=>a+d.done, 0), right = doms.reduce((a,d)=>a+d.right, 0);
  const pct = answered ? Math.round(right/answered*100) : 0;
  document.getElementById("wrongSum").innerHTML = `
    <div class="ws-card"><b style="color:var(--lv1)">${list.length}</b><span>当前错题数</span></div>
    <div class="ws-card"><b style="color:var(--primary)">${answered}<span style="font-size:var(--fs-md);color:var(--sub)"> / ${allQuizQuestions().length}</span></b><span>已作答</span></div>
    <div class="ws-card"><b style="color:#059669">${right}</b><span>累计答对</span></div>
    <div class="ws-card"><b style="color:${pct>=80?'#059669':pct>=60?'#d97706':'#dc2626'}">${answered?pct+"%":"—"}</b><span>总正确率</span></div>`;

  const weak = doms.filter(d=>d.done > 0).sort((a,b)=>a.pct - b.pct);
  document.getElementById("weakList").innerHTML = weak.length ? weak.map(d=>`
    <div class="weak-row">
      <div class="wn">${d.p.icon} ${esc(d.p.name)}</div>
      <div class="wb"><i style="width:${d.pct}%;background:${barBg(d.pct)}"></i></div>
      <div class="wv">${d.pct}%　${d.wrong} 错</div>
    </div>`).join("") : geHTML({ mini: true, icon: "i-trending-up", title: "还没有作答记录", desc: "这条曲线只统计你实际做过的题。做起题来之后，它会按「错得最多」排序，告诉你该先补哪一块。", acts: [["quiz", "去做 20 题", "i-play"]] });

  document.getElementById("wrongActions").innerHTML = list.length ? `
    <button class="mini-btn" data-wact="redo"><svg class=ic aria-hidden=true><use href=#i-repeat /></svg> 重做全部错题（清空这些题的选择）</button>
    <button class="mini-btn" data-wact="print"><svg class=ic aria-hidden=true><use href=#i-printer /></svg> 打印错题清单</button>` :
    `<span class="mini-btn" style="cursor:default">🎉 目前没有错题</span>`;

  const ids = [...new Set(list.map(x=>x.p.id))];
  // ⚠️ icon 与 name 必须分开，模板里 icon 不能过 esc()（否则 <svg> 会被转义成源码文字）
  const tabs = [{id:"all", icon:"<svg class=ic aria-hidden=true><use href=#i-book /></svg>", name:"全部错题", c:list.length+" 题"}].concat(
    ids.map(id=>{ const p = KB_QUIZ.find(x=>x.id===id);
      return {id, icon:p.icon||"", name:p.name, c:list.filter(x=>x.p.id===id).length+" 题"}; }));
  document.getElementById("wrongTabs").innerHTML = tabs.map(t=>
    `<button class="qv-tab${t.id===wrongDom?" active":""}" data-wd="${t.id}">${t.icon} ${esc(t.name)} <span style="opacity:.6">${t.c}</span></button>`).join("");

  const show = wrongDom === "all" ? list : list.filter(x=>x.p.id === wrongDom);
  document.getElementById("wrongBody").innerHTML = show.length ? show.map(x=>{
    const lv = quizLvAt(x.p, x.i), tp = quizTypeOf(x.q);
    const exp = ((window.KB_QUIZ_EXP||{})[x.p.id+"|"+x.i]||{}).e || x.q.exp || "";
    return `<div class="wq-item">
      <div>
        <span class="wq-tag">${x.p.icon} ${esc(x.p.name)}</span>
        <span class="wq-tag" style="background:var(--st0-bg);color:var(--sub)">第 ${x.i+1} 题</span>
        ${lv?`<span class="wq-tag" style="background:var(--lv2-bg);color:var(--lv2)">${esc(lv)}</span>`:""}
        ${tp!=="choice"?`<span class="wq-tag" style="background:var(--lv3-bg);color:var(--lv3)">${QUIZ_TYPE[tp]||tp}</span>`:""}
      </div>
      <div class="wq-q">${esc(x.q.q)}</div>
      ${x.q.opts.map((o,j)=>{
        const cls = j === x.q.a ? "right" : (j === x.chosen ? "wrong" : "");
        const mark = j === x.q.a ? " ✓正确答案" : (j === x.chosen ? " ✗你选的" : "");
        return `<div class="wq-opt ${cls}"><div class="ol">${"ABCD"[j]}</div><div>${esc(o)}${mark}</div></div>`;
      }).join("")}
      <div class="q-exp" style="margin-top:10px"><b>解析</b> — ${esc(exp)}</div>
    </div>`;
  }).join("") : `<div class="card">${geHTML({ icon: list.length ? "i-check-square" : "i-award", title: list.length ? "这个领域暂时没有错题" : "还没有错题 —— 先去答题，错的题会自动进这里", desc: list.length ? "换个领域看看，或者去做更多题。" : "错题本会自动收拢你答错的题，并按「哪个领域错得多」排序；答对之后会自动移出去。", steps: list.length ? [] : ["去自测题库做题", "错的自动进本页", "复习计划会排期提醒"], acts: [["quiz", "去自测题库", "i-play"]] })}</div>`;
}

/* ══════════════ 引导式空态（零数据时替代空白图表） ══════════════ */
/* o = {mini, icon, title, desc, steps:[], acts:[[mod, text], ...]} */
function geHTML(o){
  o = o || {};
  const steps = (o.steps || []).length
    ? `<div class="ge-steps">${o.steps.map((s, i) => `<div class="ge-step"><i>${i + 1}</i>${esc(s)}</div>`).join("")}</div>`
    : "";
  const acts = (o.acts || []).length
    ? `<div class="ge-act">${o.acts.map(a => `<button class="mini-btn" data-go="${esc(a[0])}">${a[2] ? `<svg class=ic aria-hidden=true><use href=#${esc(a[2])} /></svg>` : ""}${esc(a[1])}</button>`).join("")}</div>`
    : "";
  return `<div class="ge${o.mini ? " ge-mini" : ""}">`
    + (o.icon ? `<div class="ge-ic"><svg class=ic-lg aria-hidden=true><use href=#${esc(o.icon)} /></svg></div>` : "")
    + `<div class="ge-t">${esc(o.title || "")}</div>`
    + (o.desc ? `<div class="ge-d">${o.desc}</div>` : "")
    + steps + acts
    + `</div>`;
}

/* ══════════════ 模块十三：学习数据（纯 SVG 图表） ══════════════ */
function radarSVG(rows){
  const W = 430, H = 404, cx = 215, cy = 198, R = 136, n = rows.length;
  const ang = i => -Math.PI/2 + i*2*Math.PI/n;
  const pt = (i, r) => [cx + r*Math.cos(ang(i)), cy + r*Math.sin(ang(i))];
  let g = "";
  [.25,.5,.75,1].forEach(f=>{
    const p = rows.map((_,i)=>pt(i,R*f).map(x=>x.toFixed(1)).join(",")).join(" ");
    g += `<polygon points="${p}" fill="none" stroke="var(--border)" stroke-width="1"/>`;
  });
  rows.forEach((_,i)=>{ const [x,y] = pt(i,R);
    g += `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="var(--border)" stroke-width="1"/>`; });
  const dp = rows.map((r,i)=>pt(i, R*Math.max(2,r.v)/100).map(x=>x.toFixed(1)).join(",")).join(" ");
  g += `<polygon points="${dp}" fill="rgba(37,99,235,.20)" stroke="var(--primary)" stroke-width="2"/>`;
  rows.forEach((r,i)=>{ const [x,y] = pt(i, R*Math.max(2,r.v)/100);
    g += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3" fill="var(--primary)"/>`; });
  rows.forEach((r,i)=>{
    const [x,y] = pt(i, R + 26), a = ang(i), c = Math.cos(a), s = Math.sin(a);
    const anchor = Math.abs(c) < 0.25 ? "middle" : (c > 0 ? "start" : "end");
    const dy = s > 0.55 ? 10 : (s < -0.55 ? -3 : 4);
    g += `<text x="${x.toFixed(1)}" y="${(y+dy).toFixed(1)}" text-anchor="${anchor}" font-size="11" fill="var(--sub)" font-family="inherit">${esc(r.label)}</text>`;
    g += `<text x="${x.toFixed(1)}" y="${(y+dy+11).toFixed(1)}" text-anchor="${anchor}" font-size="11" fill="var(--primary)" font-weight="bold" font-family="inherit">${r.v}%</text>`;
  });
  return `<svg class="ch-svg" viewBox="0 0 ${W} ${H}">${g}</svg>`;
}
function barsSVG(rows, colorFn){
  const W = 430, rowH = 27, padL = 104, padR = 52, maxW = W - padL - padR;
  const H = rows.length*rowH + 8;
  let g = "";
  rows.forEach((r,i)=>{
    const y = i*rowH + 4, bw = Math.max(2, maxW*Math.max(0,Math.min(100, r.v))/100);
    g += `<text x="${padL-8}" y="${y+14}" text-anchor="end" font-size="11" fill="var(--sub)" font-family="inherit">${esc(r.label)}</text>`;
    g += `<rect x="${padL}" y="${y+3}" width="${maxW}" height="15" rx="7" fill="var(--st0-bg)"/>`;
    g += `<rect x="${padL}" y="${y+3}" width="${bw.toFixed(1)}" height="15" rx="7" fill="${colorFn(r.v)}"/>`;
    g += `<text x="${padL+maxW+8}" y="${y+15}" font-size="11" fill="var(--sub)" font-family="inherit">${r.v<0 ? "未作答" : r.v+"%"}</text>`;
  });
  return `<svg class="ch-svg" viewBox="0 0 ${W} ${H}">${g}</svg>`;
}
function donutSVG(parts){
  const total = parts.reduce((a,b)=>a+b.v,0) || 1, R = 62, C = 2*Math.PI*R, cx = 88, cy = 88;
  let off = 0, g = "";
  parts.forEach(p=>{
    const len = C*p.v/total;
    if(len > 0) g += `<circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="${p.color}" stroke-width="21"
      stroke-dasharray="${len.toFixed(2)} ${(C-len).toFixed(2)}" stroke-dashoffset="${(-off).toFixed(2)}"
      transform="rotate(-90 ${cx} ${cy})"/>`;
    off += len;
  });
  g += `<text x="${cx}" y="${cy+3}" text-anchor="middle" font-size="24" font-weight="bold" fill="var(--text)" font-family="inherit">${Math.round(parts[0].v/total*100)}%</text>`;
  g += `<text x="${cx}" y="${cy+21}" text-anchor="middle" font-size="11" fill="var(--sub)" font-family="inherit">已掌握</text>`;
  const legend = parts.map(p=>`<div><i style="background:${p.color}"></i>${esc(p.label)}　<b style="color:var(--text)">${p.v}</b></div>`).join("");
  return `<div style="display:flex; align-items:center; gap:22px; flex-wrap:wrap">
    <svg viewBox="0 0 176 176" style="width:176px; height:176px; flex-shrink:0">${g}</svg>
    <div class="ch-legend" style="flex-direction:column; gap:9px; margin:0; font-size:var(--fs-xs)">${legend}</div></div>`;
}
function renderStats(){
  const domRows = KB_DOMAINS.map(d=>{
    const items = domainItems(d);
    const m = items.filter(it=>getSt(it.name) === 2).length;
    return {label:d.name, v: items.length ? Math.round(m/items.length*100) : 0, m, n: items.length};
  });
  const doms = quizDomainStats();
  const answeredQ = doms.reduce((a,d)=>a+d.done,0), rightQ = doms.reduce((a,d)=>a+d.right,0);

  const tDone = {}, tRight = {}, lvDone = {}, lvRight = {};
  KB_QUIZ.forEach(p=>{
    const a = quizState[p.id] || {};
    for(let i=0;i<quizTotal(p);i++){
      const q = quizAt(p,i); if(!q) continue;
      const ans = a[i], tp = quizTypeOf(q), lv = quizLvAt(p,i) || "基础";
      if(ans !== undefined){
        tDone[tp] = (tDone[tp]||0)+1; lvDone[lv] = (lvDone[lv]||0)+1;
        if(ans === q.a){ tRight[tp] = (tRight[tp]||0)+1; lvRight[lv] = (lvRight[lv]||0)+1; }
      }
    }
  });
  const pctOf = (r,d)=> d ? Math.round(r/d*100) : -1;

  const total = KB_ITEMS.length, mastered = KB_ITEMS.filter(it=>getSt(it.name)===2).length,
        learning = KB_ITEMS.filter(it=>getSt(it.name)===1).length;
  let cTotal = 0, cOn = 0;
  KB_CHECKS.forEach(c=>{ const r = chkCount(c); cTotal += r.total; cOn += r.on; });

  const col = v => v < 0 ? "var(--st0)" : v >= 80 ? "#059669" : v >= 60 ? "#d97706" : "#dc2626";

  /* 零数据态：图表全是空的，看着没意义 → 换成「怎么让它亮起来」的引导 */
  const zeroQuiz = answeredQ === 0, zeroMaster = mastered === 0;
  const zeroCard = (t, d) => geHTML({ mini: true, icon: "i-compass", title: t, desc: d });

  document.getElementById("statsBody").innerHTML = `
  <div class="ch-grid">
    ${zeroQuiz && zeroMaster ? `<div class="ch-card" style="grid-column:1/-1">${geHTML({
      icon: "i-rocket",
      title: "这里还是一片空地 —— 先做 20 题，它就会长出来",
      desc: "下面的雷达、正确率、薄弱领域、打卡，全部来自你的真实动作：答题、标「已掌握」、勾清单、收藏、写笔记。现在还没有记录，所以先给你三条最快的路。",
      steps: ["去自测题库答 20 题（约 6 分钟）", "回来看雷达图找短板", "错题自动进复习计划"],
      acts: [["quiz", "去做第一组题", "i-play"], ["kb", "先标 5 条已掌握", "i-book"], ["path", "照 30 天上手路径走", "i-compass"]]
    })}</div>` : ""}
    <div class="ch-card">
      <h3><svg class=ic aria-hidden=true><use href=#i-target /></svg>知识点掌握雷达</h3>
      <div class="chd">12 个领域的「已掌握」占比（在知识库里把状态标成「已掌握」才会算进去）</div>
      ${zeroMaster ? zeroCard("还没有标过「已掌握」", "打开任意知识点，把状态从「待学习」切到「已掌握」，雷达图就会按 12 个领域长出形状。") : radarSVG(domRows)}
    </div>
    <div class="ch-card">
      <h3><svg class=ic aria-hidden=true><use href=#i-table /></svg>各领域答题正确率</h3>
      <div class="chd">按自测题库的实际作答计算；「未作答」表示这一领域还没做题</div>
      ${zeroQuiz ? zeroCard("还没有作答记录", "答完题这里会按 12 个领域列出正确率，一眼看出哪一块最弱、该先补哪里。") : barsSVG(doms.map(d=>({label:d.p.name, v:d.pct})), col)}
    </div>
    <div class="ch-card">
      <h3><svg class=ic aria-hidden=true><use href=#i-box /></svg> 难度维度正确率</h3>
      <div class="chd">基础 / 进阶 / 易错三档的答题表现——易错档偏低是正常的，但要重点补</div>
      ${zeroQuiz ? zeroCard("按难度看你的表现", "作答后这里会分成基础 / 进阶 / 易错三档，告诉你「是底子不牢，还是会背不会用」。") : barsSVG(["基础","进阶","易错"].map(k=>({label:k, v:pctOf(lvRight[k]||0, lvDone[k]||0)})), col)}
    </div>
    <div class="ch-card">
      <h3><svg class=ic aria-hidden=true><use href=#i-ruler /></svg>题型维度正确率</h3>
      <div class="chd">选择题、判断题、计算题、情景题——计算题与情景题偏低说明「会背不会用」</div>
      ${zeroQuiz ? zeroCard("按题型看你的表现", "计算题与情景题偏低，通常说明「会背不会用」；选择题高而计算题低，就该去动手算一遍。") : barsSVG(["choice","tf","calc","scene"].map(k=>({label:QUIZ_TYPE[k], v:pctOf(tRight[k]||0, tDone[k]||0)})), col)}
    </div>
    <div class="ch-card">
      <h3><svg class=ic aria-hidden=true><use href=#i-book /></svg>知识库进度</h3>
      <div class="chd">共 ${total} 条知识点 · 检查清单 ${cOn}/${cTotal} 项已完成</div>
      ${donutSVG([
        {label:"已掌握", v:mastered, color:"#059669"},
        {label:"学习中", v:learning, color:"#2563eb"},
        {label:"待学习", v:total-mastered-learning, color:"#94a3b8"}
      ])}
      <div style="margin-top:16px; font-size:12px; color:var(--sub); line-height:1.9">
        检查清单完成度：<b style="color:var(--text)">${cTotal?Math.round(cOn/cTotal*100):0}%</b>（${cOn}/${cTotal} 项）<br>
        自测正确率：<b style="color:var(--text)">${answeredQ?Math.round(rightQ/answeredQ*100)+"%":"未开始"}</b>（已答 ${answeredQ}/${allQuizQuestions().length} 题）
      </div>
    </div>
    <div class="ch-card">
      <h3><svg class=ic aria-hidden=true><use href=#i-trending-up /></svg>题库作答覆盖度</h3>
      <div class="chd">每个领域已作答的题数占比——覆盖面比正确率更优先，先做全再做好</div>
      ${zeroQuiz ? zeroCard("覆盖面还是 0%", "建议先每个领域都做几题，把覆盖面铺开，再回头攻正确率——顺序反了容易钻牛角尖。") : barsSVG(doms.map(d=>({label:d.p.name, v:d.total? Math.round(d.done/d.total*100):0})), v=>v>=80?"#2563eb":v>=40?"#7c3aed":"#94a3b8")}
    </div>
    ${timeCardHTML()}
    <div class="ch-card">
      <h3><svg class=ic aria-hidden=true><use href=#i-flame /></svg> 学习打卡</h3>
      <div class="chd">打开知识点、答题、勾清单、收藏、写笔记都算一次「学习动作」</div>
      <div class="streak-top">
        <b>${streakDays()}</b><span>天当前连续</span>
        <b style="font-size:20px; color:var(--sub)">${streakTotal()}</b><span>天累计打卡</span>
        <b style="font-size:20px; color:var(--sub)">${streak[todayStr()] || 0}</b><span>次今日动作</span>
      </div>
      ${heatHTML()}
    </div>
    <div class="ch-card">
      <h3><svg class=ic aria-hidden=true><use href=#i-save /></svg>我的数据</h3>
      <div class="chd">所有记录都存在这台电脑的浏览器里；导出后可在其他设备或重装后一键恢复</div>
      <div style="font-size:var(--fs-xs); line-height:var(--lh-loose)">
        学习进度 <b>${Object.keys(progress).length}</b> 条　·　答题记录 <b>${answeredQ}</b> 题　·　清单勾选 <b>${cOn}</b> 项<br>
        收藏 <b>${favCount()}</b> 条　·　笔记 <b>${noteCount()}</b> 条　·　模板草稿 <b>${Object.keys(tplDraft).length}</b> 格<br>
        浏览记录 <b>${recents.length}</b> 条　·　搜索历史 <b>${searchHist.length}</b> 条　·　打卡 <b>${streakTotal()}</b> 天
      </div>
      <div class="data-actions">
        <button class="mini-btn" data-data="export"><svg class=ic aria-hidden=true><use href=#i-download /></svg>导出备份</button>
        <button class="mini-btn" data-data="import"><svg class=ic aria-hidden=true><use href=#i-upload /></svg>导入恢复</button>
        <button class="mini-btn" data-data="clear"><svg class=ic aria-hidden=true><use href=#i-trash /></svg>清空全部记录</button>
      </div>
      <div class="data-note">导出文件为 JSON，包含：学习进度、清单勾选、答题记录、收藏、笔记、模板草稿、深浅色偏好、浏览记录、搜索历史与打卡记录。<br>导入时会覆盖同名的现有记录，建议先导出一次再导入。</div>
    </div>
  </div>
  <div class="next-step" id="statsAdvice"></div>`;

  let advice;
  if(answeredQ === 0) advice = `还没有做题记录。建议先去「🎯 自测题库」做一次<b>「塑料材料」</b>的 30 题，摸清自己的底子。`;
  else if(answeredQ < allQuizQuestions().length * 0.4) advice = `目前只答了 <b>${answeredQ}/${allQuizQuestions().length}</b> 题（${Math.round(answeredQ/allQuizQuestions().length*100)}%）。建议先把覆盖面做上去，再回头攻正确率。`;
  else if(rightQ/answeredQ < 0.8) advice = `整体正确率 <b>${Math.round(rightQ/answeredQ*100)}%</b>，离 80% 还有距离。去「❌ 错题本」看看错得最多的是哪个领域，集中补一遍。`;
  else if(mastered < total) advice = `正确率不错（${Math.round(rightQ/answeredQ*100)}%），知识点已掌握 <b>${mastered}/${total}</b>。建议按「🧭 学习地图」把剩余条目过完，并在知识库里把学过的标成「已掌握」。`;
  else advice = `🎉 知识库全部掌握、正确率 ${Math.round(rightQ/answeredQ*100)}%！可以去「📋 实战模板」把 NPI 流程与 DFM 检讨表用起来。`;
  document.getElementById("statsAdvice").innerHTML = `<b>下一步建议</b>　${advice}`;
}

/* ══════════════ 模块十四：项目实战模板 ══════════════ */
let tplSaveTimer = null;
function renderTpl(){
  const T = window.KB_TEMPLATE || [];
  if(!T.length){ document.getElementById("tplBody").innerHTML = `<div class="card"><div class="empty">模板数据未加载</div></div>`; return; }
  if(!T.some(x=>x.id===activeTpl)) activeTpl = T[0].id;
  document.getElementById("tplTabs").innerHTML = T.map(t=>
    `<button class="qv-tab${t.id===activeTpl?" active":""}" data-tp="${t.id}">${t.icon} ${esc(t.name)}</button>`).join("");
  const t = T.find(x=>x.id === activeTpl) || T[0];
  let h = `<div class="tpl-card"><h3 style="font-size:15px">${t.icon} ${esc(t.name)}</h3>
    <div class="qv-desc" style="margin:5px 0 16px">${esc(t.desc)}</div>`;
  t.blocks.forEach((b, bi)=>{
    if(b.type === "info"){
      h += `<div class="tpl-info">` + b.fields.map((f, fi)=>{
        const key = t.id+"|"+bi+"|"+fi;
        const v = tplDraft[key] !== undefined ? tplDraft[key] : (f.v || "");
        return `<div class="tpl-field"><label>${esc(f.l)}</label>
          <input data-tk="${key}" value="${esc(v)}" placeholder="${esc(f.ph||"")}"></div>`;
      }).join("") + `</div>`;
    } else if(b.type === "table"){
      h += `<div class="tbl-scroll" style="margin-bottom:16px"><table class="mini">
        <thead><tr>${b.cols.map(c=>`<th>${esc(c)}</th>`).join("")}</tr></thead>
        <tbody>${b.rows.map(r=>`<tr>${r.map((c,ci)=>`<td${ci===0?' style="font-weight:bold"':""}>${c}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
    } else if(b.type === "fill"){
      h += `<div class="tbl-scroll"><table class="tpl-fill">
        <thead><tr>${b.cols.map(c=>`<th>${esc(c)}</th>`).join("")}</tr></thead>
        <tbody>${b.rows.map((r, ri)=>`<tr>${r.map((c, ci)=>{
          const key = t.id+"|"+bi+"|"+ri+"|"+ci;
          if(b.labelCol && ci === 0) return `<td class="lbl">${esc(c)}</td>`;
          const v = tplDraft[key] !== undefined ? tplDraft[key] : c;
          return `<td contenteditable="true" data-tk="${key}">${esc(v)}</td>`;
        }).join("")}</tr>`).join("")}</tbody></table></div>`;
    }
  });
  h += `<div class="tpl-actions">
      <button class="mini-btn" data-tact="print"><svg class=ic aria-hidden=true><use href=#i-printer /></svg> 打印 / 存为 PDF</button>
      <button class="mini-btn" data-tact="clear"><svg class=ic aria-hidden=true><use href=#i-trash /></svg>清空填写内容</button>
      <span class="mini-btn" style="cursor:default; color:var(--sub)"><svg class=ic aria-hidden=true><use href=#i-edit /></svg> 填写内容自动保存在本机</span>
    </div>`;
  if(t.note) h += `<div class="tpl-note">💡 ${esc(t.note)}</div>`;
  h += `</div>`;
  document.getElementById("tplBody").innerHTML = h;
}

/* ══════════════ 模块十五：我的收藏与笔记 ══════════════ */
function renderFav(){
  const tabs = [
    {id:"fav",  n:"<svg class=ic aria-hidden=true><use href=#i-star /></svg>我的收藏", c:favCount()+" 条"},
    {id:"note", n:"<svg class=ic aria-hidden=true><use href=#i-file-text /></svg>我的笔记", c:noteCount()+" 条"},
    {id:"doubt", n:"<svg class=ic aria-hidden=true><use href=#i-alert /></svg>我的疑问", c:doubtCount()+" 条"}
  ];
  document.getElementById("favTabs").innerHTML = tabs.map(t=>
    `<button class="qv-tab${t.id===favTab?" active":""}" data-fv="${t.id}">${t.n} <span style="opacity:.6">${t.c}</span></button>`).join("");
  const box = document.getElementById("favBody");
  const domOf = n => { const it = KB_ITEMS.find(x=>x.name===n); return it ? CAT_DOMAIN[it.cat] : null; };

  if(favTab === "fav"){
    const list = Object.entries(favs).sort((a,b)=>b[1]-a[1]).filter(([n])=>KB_ITEMS.some(x=>x.name===n));
    box.innerHTML = list.length ? list.map(([n])=>{
      const d = domOf(n), it = KB_ITEMS.find(x=>x.name===n);
      const memo = (window.KB_MEMO||{})[n] || (it ? it.points : "");
      return `<div class="fav-item" data-open="${esc(n)}">
        <span class="fi-ic">${d ? d.icon : "<svg class=ic aria-hidden=true><use href=#i-file-text /></svg>"}</span>
        <div style="min-width:0">
          <div class="fi-n">${esc(n)}</div>
          <div class="fi-d">${esc(String(memo).slice(0, 54))}</div>
        </div>
        <span class="fi-t">${d ? esc(d.name) : ""}</span>
        <button class="mini-btn" data-unfav="${esc(n)}" style="margin-left:12px">移出</button>
      </div>`;
    }).join("") : `<div class="card">${geHTML({ icon: "i-star", title: "还没有收藏", desc: "收藏是给「以后还要翻」的条目用的 —— 常用的材料参数、容易忘的公差表、天天要查的标准。", steps: ["打开任意知识点", "点右上「☆ 收藏」", "回这里随时翻"], acts: [["kb", "去知识库逛逛", "i-book"]] })}</div>`;
  } else if(favTab === "doubt"){
    const list = Object.keys(doubts).sort((a,b)=>doubts[b]-doubts[a]).filter(n=>KB_ITEMS.some(x=>x.name===n));
    box.innerHTML = list.length ? list.map(nm=>{
      const d = domOf(nm), it = KB_ITEMS.find(x=>x.name===nm);
      const lead = deepLead(nm) || (it ? it.points : "");
      return `<div class="fav-item" data-open="${esc(nm)}">
        <span class="fi-ic">${d ? d.icon : "<svg class=ic aria-hidden=true><use href=#i-alert /></svg>"}</span>
        <div style="min-width:0">
          <div class="fi-n">${esc(nm)}</div>
          <div class="fi-d">${esc(String(lead).slice(0, 62))}</div>
        </div>
        <span class="fi-t">${d ? esc(d.name) : ""}</span>
        <button class="mini-btn" data-doubt="${esc(nm)}" style="margin-left:12px">搞懂了</button>
      </div>`;
    }).join("") : `<div class="card">${geHTML({ icon: "i-alert", title: "还没有标过疑问", desc: "遇到「看懂了但不敢下手」的条目，在它的详情里点「标为疑问」。攒起来回看，比糊过去强。", steps: ["打开任意知识点", "点「标为疑问」", "回这里集中回看"], acts: [["kb", "去知识库逛逛", "i-book"]] })}</div>`;
  } else {
    const list = Object.entries(notes).filter(([,v])=>v && v.trim()).sort((a,b)=>(b[1].length - a[1].length));
    box.innerHTML = list.length ? list.map(([n, v])=>{
      const d = domOf(n);
      return `<div class="fav-item" data-open="${esc(n)}" style="align-items:flex-start">
        <span class="fi-ic">${d ? d.icon : "<svg class=ic aria-hidden=true><use href=#i-file-text /></svg>"}</span>
        <div style="min-width:0; flex:1">
          <div class="fi-n">${esc(n)}</div>
          <div class="fi-d" style="white-space:pre-wrap; margin-top:6px; line-height:1.75; color:var(--text)">${esc(v)}</div>
        </div>
        <button class="mini-btn" data-unfav="${esc(n)}" data-nodelete="1" style="margin-left:12px">删除笔记</button>
      </div>`;
    }).join("") : `<div class="card">${geHTML({ icon: "i-edit", title: "还没有笔记", desc: "笔记写在各知识点的详情里，会汇总到这一页 —— 试模踩过的坑、供应商给的经验值、跟客户确认过的口径，都值得记一句。", steps: ["打开任意知识点", "翻到「我的笔记」", "写一句保存即可"], acts: [["kb", "去写第一条", "i-book"]] })}</div>`;
  }
}

function renderDpActions(it){
  const btn = document.getElementById("dpFavBtn");
  if(btn){ btn.className = favOn(it.name) ? "on" : ""; btn.textContent = favOn(it.name) ? "★ 已收藏" : "☆ 收藏"; }
  /* 「还没搞懂」标记：和「已掌握」是两回事 —— 那是学会了，这是还没学会 */
  const db = document.getElementById("dpDoubt");
  // ⚠️ 图标是 <svg>，只能进 innerHTML，不能进 textContent
  if(db){
    const on = doubtOn(it.name);
    db.className = on ? "on" : "";
    db.innerHTML = on
      ? "<svg class=ic aria-hidden=true><use href=#i-alert /></svg>已标疑问"
      : "<svg class=ic aria-hidden=true><use href=#i-alert /></svg>标为疑问";
    db.title = on ? "点击取消这个疑问标记" : "标上之后可以在「我的收藏与笔记 · 我的疑问」里集中回看";
  }
  const nj = document.getElementById("dpNoteJump");
  // ⚠️ 同上：图标是 <svg>，必须 innerHTML
  if(nj){ const n = notes[it.name]; nj.innerHTML = (n && n.trim()) ? `<svg class=ic aria-hidden=true><use href=#i-edit /></svg>笔记（${n.trim().length} 字）` : "<svg class=ic aria-hidden=true><use href=#i-edit /></svg>写笔记"; }
}
function toggleFav(name){
  if(favs[name]) delete favs[name]; else favs[name] = Date.now();
  lsSet(LS_FAV, favs);
  markStudy(1);
  if(curDetail && curDetail.name === name) renderDpActions(curDetail);
  refreshBadges();
  if(activeModule === "fav") renderFav();
}

/* ══════════════ 首页：每日一题 ══════════════ */
function hashStr(s){ let h = 2166136261; for(let i=0;i<s.length;i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function quizPool(){
  const pool = [];
  KB_QUIZ.forEach(p=>{ for(let i=0;i<quizTotal(p);i++){ const q = quizAt(p,i); if(q) pool.push({p, i, q}); } });
  return pool;
}
let dailyState = lsGet("kb-daily-v1", {});   // { date, key, chosen }
function dailyPick(){
  const pool = quizPool(); if(!pool.length) return null;
  const d = todayStr();
  const idx = hashStr(d) % pool.length;
  return { pool, item: pool[idx], idx, date: d };
}
function renderDaily(){
  const box = document.getElementById("panelDaily"); if(!box) return;
  const pk = dailyPick(); if(!pk){ box.innerHTML = ""; return; }
  const { item, idx, date } = pk;
  if(dailyState.date !== date){ dailyState = { date: date, key: idx, chosen: undefined }; lsSet("kb-daily-v1", dailyState); }
  const q = item.q, answered = dailyState.chosen !== undefined, chosen = dailyState.chosen;
  const lv = quizLvAt(item.p, item.i), tp = quizTypeOf(q);
  const exp = ((window.KB_QUIZ_EXP||{})[item.p.id+"|"+item.i]||{}).e || q.exp || "";
  box.innerHTML = `
    <h3><svg class=ic aria-hidden=true><use href=#i-sun /></svg>今日一题　<span style="font-size:12px; font-weight:normal; color:var(--sub)">${date}</span></h3>
    <div class="pdesc">每天固定一题，答完可以看解析；也可以点右上角「随机抽一题」换一道</div>
    <div class="qd-head">
      <span class="qd-badge">${item.p.icon} ${esc(item.p.name)}</span>
      <span class="qd-badge" style="background:var(--st0-bg); color:var(--sub)">第 ${item.i+1} 题</span>
      ${lv?`<span class="qd-badge" style="background:var(--lv2-bg); color:var(--lv2)">${esc(lv)}</span>`:""}
      ${tp!=="choice"?`<span class="qd-badge" style="background:var(--lv3-bg); color:var(--lv3)">${QUIZ_TYPE[tp]||tp}</span>`:""}
    </div>
    <div class="qd-q">${esc(q.q)}</div>
    <div class="qd-opts">${q.opts.map((o,j)=>{
      let cls = "qd-opt";
      if(answered){ cls += " lock"; cls += j === q.a ? " right" : (j === chosen ? " wrong" : ""); }
      return `<div class="${cls}" data-daily="${j}"><div class="ol">${"ABCD"[j]}</div><div>${esc(o)}</div></div>`;
    }).join("")}</div>
    ${answered ? `<div class="q-exp" style="margin-top:12px"><b>${chosen===q.a?"✓ 回答正确":"✗ 正确答案是 "+"ABCD"[q.a]}</b> — ${esc(exp)}</div>` : ""}
    <div class="d20-entry">
      <div class="d20-et">📅 <b>每日 20 题</b>　跨 12 个领域各抽 1 题 + 随机补 8 题，做完自动算正确率，错题会同步进错题本</div>
      <button class="mini-btn" data-godaily="1">去挑战今日 20 题 →</button>
    </div>`;
}

/* 随机抽一题（与今日一题共用渲染逻辑，但临时覆盖） */
function randomDaily(){
  const pool = quizPool(); if(!pool.length) return;
  const idx = Math.floor(Math.random()*pool.length);
  const item = pool[idx];
  dailyState = { date: todayStr(), key: idx, chosen: undefined };
  lsSet("kb-daily-v1", dailyState);
  // 直接渲染这一题（不改每日一题的固定选题）
  const box = document.getElementById("panelDaily"); if(!box) return;
  const q = item.q, lv = quizLvAt(item.p, item.i), tp = quizTypeOf(q);
  box.innerHTML = `
    <h3><svg class=ic aria-hidden=true><use href=#i-shuffle /></svg>随机练习题</h3>
    <div class="pdesc">从 432 题中随机抽一道；刷新或回到首页会恢复「今日一题」</div>
    <div class="qd-head">
      <span class="qd-badge">${item.p.icon} ${esc(item.p.name)}</span>
      <span class="qd-badge" style="background:var(--st0-bg); color:var(--sub)">第 ${item.i+1} 题</span>
      ${lv?`<span class="qd-badge" style="background:var(--lv2-bg); color:var(--lv2)">${esc(lv)}</span>`:""}
      ${tp!=="choice"?`<span class="qd-badge" style="background:var(--lv3-bg); color:var(--lv3)">${QUIZ_TYPE[tp]||tp}</span>`:""}
    </div>
    <div class="qd-q">${esc(q.q)}</div>
    <div class="qd-opts">${q.opts.map((o,j)=>`<div class="qd-opt" data-rand="${idx}|${j}"><div class="ol">${"ABCD"[j]}</div><div>${esc(o)}</div></div>`).join("")}</div>`;
  box._randItem = item;
}

/* ══════════════ 每日 20 题 ══════════════ */
const LS_D20 = "kb-daily20-v1";
const D20_N = 20, D20_KEEP = 30;
let d20Store = lsGet(LS_D20, {});   // { "2026-09-14": { order:[{d,i}], ans:{"0":2}, at } }
let d20ViewDate = "";               // 空 = 今天；否则是回看的历史日期

function d20Save(){
  const ks = Object.keys(d20Store).sort();
  if(ks.length > D20_KEEP){ ks.slice(0, ks.length - D20_KEEP).forEach(k=>{ delete d20Store[k]; }); }
  lsSet(LS_D20, d20Store);
}
/* 确定性随机：同一天永远抽出同一套题 */
function d20Rng(seed){
  let s = seed >>> 0;
  return function(){
    s = (s + 0x6D2B79F5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function d20Shuffle(arr, rnd){
  const a = arr.slice();
  for(let i = a.length - 1; i > 0; i--){
    const j = Math.floor(rnd() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
}
function d20Build(date){
  const rnd = d20Rng(hashStr("d20|" + date));
  const picked = [], used = {};
  // ① 12 个领域各抽 1 题：保证每天都能覆盖全部领域
  KB_QUIZ.forEach(p=>{
    const idxs = [];
    for(let i = 0; i < quizTotal(p); i++){ if(quizAt(p, i)) idxs.push(i); }
    const sh = d20Shuffle(idxs, rnd);
    if(sh.length){ picked.push({ d: p.id, i: sh[0] }); used[p.id + "|" + sh[0]] = 1; }
  });
  // ② 再从剩余题库随机补齐到 20 题
  const rest = [];
  KB_QUIZ.forEach(p=>{
    for(let i = 0; i < quizTotal(p); i++){ if(quizAt(p, i) && !used[p.id + "|" + i]) rest.push({ d: p.id, i }); }
  });
  d20Shuffle(rest, rnd).forEach(it=>{ if(picked.length < D20_N) picked.push(it); });
  // ③ 打乱最终顺序
  return { order: d20Shuffle(picked, rnd), ans: {}, at: Date.now() };
}
function d20Today(){
  const t = todayStr(), cur = d20Store[t];
  /* 题量不足或索引失效（题库结构变动）时自动重抽，保证永远是一套可用的 20 题 */
  const bad = !cur || !cur.order || cur.order.length !== D20_N ||
    cur.order.some(r=>{ const p = KB_QUIZ.find(x=>x.id === r.d); return !p || !quizAt(p, r.i); });
  if(bad){ d20Store[t] = d20Build(t); d20Save(); }
  return d20Store[t];
}
function d20Day(){
  const t = todayStr();
  const v = (d20ViewDate && d20Store[d20ViewDate]) ? d20ViewDate : t;
  if(v === t) return { date: t, day: d20Today(), isToday: true };
  return { date: v, day: d20Store[v], isToday: false };
}
function d20Quiz(ref){
  const p = KB_QUIZ.find(x=>x.id === ref.d);
  return p ? { p, q: quizAt(p, ref.i) } : null;
}
function d20StatOf(day){
  let done = 0, right = 0;
  day.order.forEach((r, k)=>{
    const v = day.ans[k]; if(v === undefined) return;
    const x = d20Quiz(r); if(!x || !x.q) return;
    done++; if(v === x.q.a) right++;
  });
  return { done, right, pct: done ? Math.round(right / done * 100) : 0 };
}

function renderDaily20(){
  const cur = d20Day(), day = cur.day, tot = day.order.length;
  const st = d20StatOf(day);
  const domN = new Set(day.order.map(r=>r.d)).size;
  document.getElementById("d20Sum").innerHTML = `
    <div class="ws-card"><b style="color:var(--primary)">${st.done}<span style="font-size:var(--fs-md);color:var(--sub)"> / ${tot}</span></b><span>${cur.isToday ? "今日已答" : "当日已答"} · ${cur.date}</span></div>
    <div class="ws-card"><b style="color:#059669">${st.right}</b><span>答对</span></div>
    <div class="ws-card"><b style="color:${st.pct>=80?'#059669':st.pct>=60?'#d97706':'#dc2626'}">${st.done?st.pct+"%":"—"}</b><span>正确率</span></div>
    <div class="ws-card"><b style="color:var(--lv3)">${domN}</b><span>覆盖领域</span></div>`;

  const lvN = {};
  day.order.forEach(r=>{
    const x = d20Quiz(r); if(!x || !x.q) return;
    const lv = quizLvAt(x.p, r.i) || "未标注";
    lvN[lv] = (lvN[lv] || 0) + 1;
  });
  const dots = day.order.map((r, k)=>{
    const x = d20Quiz(r); if(!x || !x.q) return "";
    const v = day.ans[k];
    const cls = v === undefined ? "" : (v === x.q.a ? " ok" : " no");
    return `<button class="d20-dot${cls}" data-d20go="${k}">${k+1}</button>`;
  }).join("");
  const pctDone = tot ? Math.round(st.done / tot * 100) : 0;
  document.getElementById("d20Plan").innerHTML = `
    <h3><svg class=ic aria-hidden=true><use href=#i-clipboard /></svg>${cur.isToday ? "今日卷面" : "卷面回看"}　<span style="font-size:12px;font-weight:normal;color:var(--sub)">${cur.date} · 共 ${tot} 题 · 难度 ${QUIZ_LEV.map(k=>k+" "+(lvN[k]||0)).join(" / ")}</span></h3>
    <div class="qv-desc">${cur.isToday
      ? "12 个领域各抽 1 题 + 随机补 8 题；当天固定不变，明天自动换新卷。点下方题号可以跳到该题"
      : "这是历史卷面，仅供回看与复习，不能再作答"}</div>
    ${cur.isToday ? "" : `<div style="margin:10px 0"><button class="mini-btn" data-d20day="${todayStr()}">← 回到今天的卷子</button></div>`}
    <div class="prog-row"><span class="pl">完成进度</span><div class="prog-bar"><i style="width:${pctDone}%;background:${barBg(pctDone)}"></i></div><span class="pv">${st.done}/${tot}</span></div>
    <div class="d20-dots">${dots}</div>
    <div class="qv-desc" style="margin-top:8px">圆点颜色：<b style="color:#059669">绿</b> 答对 · <b style="color:#dc2626">红</b> 答错 · 灰 未作答</div>`;

  document.getElementById("d20Actions").innerHTML =
    (cur.isToday ? `<button class="mini-btn" data-d20="redo"><svg class=ic aria-hidden=true><use href=#i-repeat /></svg> 重做今日错题</button>
    <button class="mini-btn" data-d20="reset"><svg class=ic aria-hidden=true><use href=#i-refresh /></svg> 清空今日作答</button>` : "") +
    `<button class="mini-btn" data-d20="print"><svg class=ic aria-hidden=true><use href=#i-printer /></svg> 打印这套卷子</button>
    <button class="mini-btn" data-d20="expand">${d20ExpandAll ? "逐题模式" : "展开全部"}</button>
    <span class="mini-btn ${(st.done===tot && st.pct>=80) ? "ok" : ""}" style="cursor:default">${
      !cur.isToday ? "📖 历史卷面（只读）"
      : st.done === tot ? (st.pct >= 80 ? "🎉 今日完成，正确率优秀" : st.pct >= 60 ? "📖 今日完成，建议把错题再过一遍" : "⚠️ 今日完成，建议回知识库补一补")
      : "还剩 " + (tot - st.done) + " 题"}</span>`;

  document.getElementById("d20Body").innerHTML = day.order.map((r, k)=>{
    const x = d20Quiz(r); if(!x || !x.q) return "";
    const p = x.p, q = x.q;
    const chosen = day.ans[k], answered = chosen !== undefined;
    const lv = quizLvAt(p, r.i), tp = quizTypeOf(q);
    const opts = q.opts.map((o, j)=>{
      let cls = "q-opt";
      if(answered || !cur.isToday){
        cls += " lock";
        if(j === q.a) cls += " right";
        else if(j === chosen) cls += " wrong";
      }
      return `<div class="${cls}" data-dq="${k}" data-do="${j}"><div class="ol">${"ABCD"[j]}</div><div>${esc(o)}</div></div>`;
    }).join("");
    /* 逐题模式：默认只留题干一行，点题号（或点这行）才展开 */
    if(!(d20ExpandAll || k === d20Focus)){
      return `<div class="quiz-q q-collapsed" id="d20q-${k}" data-d20open="${k}">
        <div class="qq-title"><div class="qq-no">${k+1}</div>
          <div class="qq-main">${esc(q.q)}<div class="d20-from">${p.icon} ${esc(p.name)} · 该领域第 ${r.i+1} 题</div></div>
          <div class="qq-tags">${lv?`<span class="qq-lv l-${QUIZ_LEV.indexOf(lv)}">${lv}</span>`:""}${
            tp!=="choice"?`<span class="qq-tp">${QUIZ_TYPE[tp]||tp}</span>`:""}
            <span class="qq-state${answered?(chosen===q.a?" ok":" no"):""}">${answered?(chosen===q.a?"✓ 答对":"✕ 答错"):"未作答"}</span></div>
        </div>
      </div>`;
    }
    return `<div class="quiz-q" id="d20q-${k}">
      <div class="qq-title"><div class="qq-no">${k+1}</div>
        <div class="qq-main">${esc(q.q)}<div class="d20-from">${p.icon} ${esc(p.name)} · 该领域第 ${r.i+1} 题${
          answered ? (chosen === q.a ? "　✓ 已答对" : "　✗ 已答错") : ""}</div></div>
        <div class="qq-tags">${lv?`<span class="qq-lv l-${QUIZ_LEV.indexOf(lv)}">${lv}</span>`:""}${
          tp!=="choice"?`<span class="qq-tp">${QUIZ_TYPE[tp]||tp}</span>`:""}</div>
      </div>
      ${opts}
      ${answered ? quizExpHTML(p.id, q, r.i, chosen) : ""}
    </div>`;
  }).join("");

  const hist = Object.keys(d20Store).sort().reverse().slice(0, 10);
  document.getElementById("d20Hist").innerHTML = hist.length > 1 ? `
    <h3><svg class=ic aria-hidden=true><use href=#i-calendar /></svg>最近记录　<span style="font-size:12px;font-weight:normal;color:var(--sub)">最多保留 30 天</span></h3>
    <div class="qv-desc">每天一套卷；点任意一天可回看当天的题目与解析（历史卷只读）</div>
    <div class="d20-hist">${hist.map(dt=>{
      const s2 = d20StatOf(d20Store[dt]);
      const on = dt === cur.date;
      return `<button class="d20-hrow${on?" on":""}" data-d20day="${dt}">
        <span class="d20-hd">${dt}${dt===todayStr()?"（今天）":""}</span>
        <span class="d20-hb"><i style="width:${s2.done?s2.pct:0}%;background:${s2.done?barBg(s2.pct):"transparent"}"></i></span>
        <span class="d20-hv">${s2.done}/${D20_N}${s2.done?"　"+s2.pct+"%":"　未开始"}</span>
      </button>`;
    }).join("")}</div>` :
    `<h3><svg class=ic aria-hidden=true><use href=#i-calendar /></svg>最近记录</h3>
    <div class="qv-desc">从今天开始记录——坚持每天完成一套，这里会累积你最近 30 天的正确率。</div>`;
}

/* ══════════════ 间隔重复复习队列 ══════════════ */
const LS_REVIEW = "kb-review-v1";
const RV_STEPS = [1, 4, 12, 30];   // 连对 1/2/3/4 次后，下次复习的间隔（天）
const RV_GRAD  = 4;                // 连对 4 次即毕业，移出队列
let reviewStore = lsGet(LS_REVIEW, {});   // { "领域id|题号": { lv, ok, no, due, last } }
let rvAnswered = {};                      // 本次会话已答的题（用于就地显示解析）
let rvLimit = 20;

function rvSave(){ lsSet(LS_REVIEW, reviewStore); }
function rvKey(pid, i){ return pid + "|" + i; }
function rvParse(k){ const a = String(k).split("|"); return { pid: a[0], i: +a[1] }; }
function rvDayOf(ts){
  const d = new Date(ts);
  return d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0");
}
function rvAddDays(n){
  const d = new Date(); d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + n);
  return d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0");
}
/* 任何地方答题后都调用这里：答对 → 间隔拉长；答错 → 重置为隔天复习 */
function rvGrade(pid, i, correct){
  const k = rvKey(pid, i);
  const cur = reviewStore[k] || { lv: 0, ok: 0, no: 0, last: 0 };
  cur.last = Date.now();
  if(correct){
    cur.ok = (cur.ok || 0) + 1;
    cur.lv = (cur.lv || 0) + 1;
    if(cur.lv >= RV_GRAD){ delete reviewStore[k]; rvSave(); return; }   // 连对够了 → 毕业
  }else{
    cur.no = (cur.no || 0) + 1;
    cur.lv = 0;
  }
  cur.due = rvAddDays(RV_STEPS[Math.min(Math.max(cur.lv - 1, 0), RV_STEPS.length - 1)]);
  reviewStore[k] = cur;
  rvSave();
}
function rvItem(k){
  const ref = rvParse(k);
  const p = KB_QUIZ.find(x => x.id === ref.pid);
  if(!p) return null;
  const q = quizAt(p, ref.i);
  if(!q) return null;
  return { k, p, i: ref.i, q };
}
function rvDue(){
  const t = todayStr(), out = [];
  Object.keys(reviewStore).forEach(k=>{
    const r = reviewStore[k]; if(!r || !r.due || r.due > t) return;
    const it = rvItem(k); if(!it) return;
    const late = Math.round((new Date(t + "T12:00:00") - new Date(r.due + "T12:00:00")) / 86400000);
    out.push(Object.assign(it, { r, late }));
  });
  out.sort((a, b)=> (b.late - a.late) || ((b.r.no || 0) - (a.r.no || 0)));
  return out;
}
function rvSoon(days){
  const t = todayStr(), lim = rvAddDays(days), out = [];
  Object.keys(reviewStore).forEach(k=>{
    const r = reviewStore[k]; if(!r || !r.due || r.due <= t || r.due > lim) return;
    const it = rvItem(k); if(it) out.push(Object.assign(it, { r }));
  });
  out.sort((a, b)=> a.r.due < b.r.due ? -1 : 1);
  return out;
}
function rvSession(){
  const out = [];
  Object.keys(rvAnswered).forEach(k=>{
    const it = rvItem(k); if(!it) return;
    out.push(Object.assign(it, { r: reviewStore[k] || { lv: 0, ok: 0, no: 0 }, late: 0 }));
  });
  return out;
}

function renderReview(){
  const t = todayStr();
  const due = rvDue(), que = Object.keys(reviewStore).length;
  const doneToday = Object.keys(reviewStore).filter(k => reviewStore[k].last && rvDayOf(reviewStore[k].last) === t).length;
  const soon = rvSoon(7);

  document.getElementById("rvSum").innerHTML = `
    <div class="ws-card"><b style="color:${due.length ? "var(--lv2)" : "#059669"}">${due.length}</b><span>今天待复习</span></div>
    <div class="ws-card"><b style="color:var(--primary)">${que}</b><span>队列中总题数</span></div>
    <div class="ws-card"><b style="color:#059669">${doneToday}</b><span>今天已复习</span></div>
    <div class="ws-card"><b style="color:var(--lv3)">${soon.length}</b><span>未来 7 天待复习</span></div>`;

  document.getElementById("rvPlan").innerHTML = `
    <h3><svg class=ic aria-hidden=true><use href=#i-calendar /></svg> 复习规则 <span style="font-size:12px;font-weight:normal;color:var(--sub)">艾宾浩斯式间隔重复</span></h3>
    <div class="rv-steps">
      <span class="rv-step now">答对 1 次<em>1 天后</em></span><i>›</i>
      <span class="rv-step">答对 2 次<em>4 天后</em></span><i>›</i>
      <span class="rv-step">答对 3 次<em>12 天后</em></span><i>›</i>
      <span class="rv-step">答对 4 次<em>30 天后</em></span><i>›</i>
      <span class="rv-step done">连对 4 次<em>毕业</em></span>
    </div>
    <div class="qv-desc">在<b>任何模块</b>答题（自测题库 / 每日 20 题）都会自动登记到复习计划；<b>答错则重置</b>为隔天复习。今天到期的题按「逾期最久 + 错得最多」排在最前面。</div>`;

  document.getElementById("rvActions").innerHTML =
    (due.length ? `<button class="mini-btn" data-rv="start">▶ 开始今日复习（${due.length} 题）</button>` : "") +
    (due.length > rvLimit ? `<button class="mini-btn" data-rv="more"><svg class=ic aria-hidden=true><use href=#i-eye /></svg>显示全部 ${due.length} 题</button>` : "") +
    (due.length ? `<button class="mini-btn" data-rv="print"><svg class=ic aria-hidden=true><use href=#i-printer /></svg> 打印今日复习清单</button>` : "") +
    `<span class="mini-btn ${due.length ? "" : "ok"}" style="cursor:default">${
      due.length ? "今天还有 " + due.length + " 题要复习" : "🎉 今天的复习任务已完成"}</span>`;

  const list = due.length ? (rvLimit >= due.length ? due : due.slice(0, rvLimit)) : [];
  const sess = rvSession();
  const show = list.concat(sess.filter(s => !list.some(x => x.k === s.k)));
  const body = document.getElementById("rvBody");
  if(!show.length){
    body.innerHTML = `<div class="card">${que
      ? geHTML({ icon: "i-check-square", title: "今天没有到期的复习题 —— 保持住", desc: "复习按艾宾浩斯间隔排期：答对 1 次 1 天后、答对 2 次 4 天后……没到期就不打扰你。", acts: [["quiz", "再练几题", "i-play"]] })
      : geHTML({ icon: "i-calendar", title: "复习队列还是空的", desc: "做过的题会自动排进队列，之后按记忆规律提醒你回头复习 —— 不用自己记什么时候该复习。", steps: ["去自测题库做题", "答过的题自动排期", "到期在这里提醒你"], acts: [["quiz", "去做题", "i-play"]] })
    }</div>`;
  }else{
    body.innerHTML = show.map((x, idx)=>{
      const chosen = rvAnswered[x.k], answered = chosen !== undefined;
      const lv = quizLvAt(x.p, x.i), tp = quizTypeOf(x.q);
      const opts = x.q.opts.map((o, j)=>{
        let cls = "q-opt";
        if(answered){
          cls += " lock";
          if(j === x.q.a) cls += " right";
          else if(j === chosen) cls += " wrong";
        }
        return `<div class="${cls}" data-rvk="${esc(x.k)}" data-rvo="${j}"><div class="ol">${"ABCD"[j]}</div><div>${esc(o)}</div></div>`;
      }).join("");
      const tag = answered ? (chosen === x.q.a ? "　✓ 已答对" : "　✗ 已答错")
                           : (x.late > 0 ? `　· 已逾期 ${x.late} 天` : "　· 今天到期");
      return `<div class="quiz-q">
        <div class="qq-title"><div class="qq-no">${idx+1}</div>
          <div class="qq-main">${esc(x.q.q)}<div class="d20-from">${x.p.icon} ${esc(x.p.name)} · 该领域第 ${x.i+1} 题　· 累计对 ${x.r.ok||0} / 错 ${x.r.no||0}${tag}</div></div>
          <div class="qq-tags">${lv?`<span class="qq-lv l-${QUIZ_LEV.indexOf(lv)}">${lv}</span>`:""}${
            tp!=="choice"?`<span class="qq-tp">${QUIZ_TYPE[tp]||tp}</span>`:""}</div>
        </div>
        ${opts}
        ${answered ? quizExpHTML(x.p.id, x.q, x.i, chosen) : ""}
      </div>`;
    }).join("");
  }

  const buckets = {};
  soon.forEach(x=>{ buckets[x.r.due] = (buckets[x.r.due] || 0) + 1; });
  const days = Object.keys(buckets).sort();
  document.getElementById("rvNext").innerHTML = `
    <h3><svg class=ic aria-hidden=true><use href=#i-pin /></svg>接下来要复习的</h3>
    ${days.length ? `<div class="rv-days">${days.map(d=>{
      const w = ["日","一","二","三","四","五","六"][new Date(d + "T12:00:00").getDay()];
      return `<span class="rv-day"><b>${d.slice(5)}</b><em>周${w}</em>${buckets[d]} 题</span>`;
    }).join("")}</div>` : `<div class="qv-desc">暂无安排。做题之后，这里会显示未来每天的复习量。</div>`}
    <div class="qv-desc" style="margin-top:10px">💡 记忆的规律是「先快后慢」——新学的当天最容易忘，所以第一次复习安排在最前面；随着答对次数增加，间隔会逐渐拉长，把时间花在真正容易忘的地方。</div>`;
}

/* ══════════════ 知识点对比 ══════════════ */
const LS_CMP = "kb-compare-v1";
const CMP_PRESETS = [
  { t: "ABS ↔ PC", a: "ABS", b: "PC" },
  { t: "PC ↔ 亚克力", a: "PC", b: "亚克力" },
  { t: "PP ↔ ABS", a: "PP", b: "ABS" },
  { t: "注塑 ↔ 搪胶", a: "注塑成型", b: "搪胶" },
  { t: "搪胶 ↔ 液态硅胶", a: "搪胶", b: "液态硅胶" },
  { t: "卡扣 ↔ 自攻螺丝", a: "卡扣设计", b: "自攻螺丝" },
  { t: "自攻螺丝 ↔ 热熔螺母", a: "自攻螺丝", b: "热熔螺母" },
  { t: "喷油 ↔ 电镀", a: "喷油", b: "电镀" }
];
let cmpSel = lsGet(LS_CMP, { a: "", b: "" });

function cmpFind(kw){
  if(!kw) return null;
  let hit = KB_ITEMS.find(x => x.name === kw);
  if(!hit) hit = KB_ITEMS.find(x => x.name.indexOf(kw) >= 0);
  return hit || null;
}
function cmpNumOf(n){ const v = (window.KB_NUM || {})[n]; return Array.isArray(v) ? v : []; }
function cmpRelOf(n){ const v = (window.KB_REL || {})[n]; return Array.isArray(v) ? v : []; }
function cmpMemoOf(n){ return (window.KB_MEMO || {})[n] || ""; }
function cmpSplitPoints(txt){
  return String(txt || "").split(/[；;\n]+/).map(s => s.trim()).filter(Boolean).slice(0, 14);
}
function renderCompare(){
  const selA = document.getElementById("cmpA"), selB = document.getElementById("cmpB");
  if(!selA.dataset.init){
    const opts = KB_DOMAINS.map(d=>{
      const items = KB_ITEMS.filter(it => { const dd = CAT_DOMAIN[it.cat]; return dd && dd.id === d.id; });
      if(!items.length) return "";
      return `<optgroup label="${d.icon} ${esc(d.name)}">` +
        items.map(it=>`<option value="${esc(it.name)}">${esc(it.name)}</option>`).join("") + `</optgroup>`;
    }).join("");
    const html = `<option value="">— 请选择知识点 —</option>` + opts;
    selA.innerHTML = html; selB.innerHTML = html;
    selA.dataset.init = "1";
  }
  if(!cmpFind(cmpSel.a)){ const f = cmpFind("ABS"); cmpSel.a = f ? f.name : ((KB_ITEMS[0] || {}).name || ""); }
  if(!cmpFind(cmpSel.b)){ const f = cmpFind("PC");  cmpSel.b = f ? f.name : ((KB_ITEMS[1] || {}).name || ""); }
  selA.value = cmpSel.a; selB.value = cmpSel.b;

  document.getElementById("cmpPresets").innerHTML = CMP_PRESETS.map((p, i)=>{
    const A = cmpFind(p.a), B = cmpFind(p.b);
    if(!A || !B) return "";
    const on = (cmpSel.a === A.name && cmpSel.b === B.name);
    return `<button class="mini-btn${on ? " ok" : ""}" data-cmp="${i}" style="padding:5px 11px; font-size:var(--fs-xs);">${esc(p.t)}</button>`;
  }).join("");

  const LVN = ["", "核心必会", "进阶掌握", "了解即可"];
  const col = it => {
    if(!it) return `<div class="cmp-col"><div class="empty">未选择</div></div>`;
    const d = CAT_DOMAIN[it.cat] || { icon: "", name: "" };
    const nums = cmpNumOf(it.name), rel = cmpRelOf(it.name), memo = cmpMemoOf(it.name);
    const pts = cmpSplitPoints(it.points);
    return `<div class="cmp-col">
      <div class="cmp-head">
        <div class="cmp-name" data-rel="${esc(it.name)}">${d.icon} ${esc(it.name)} <span class="cmp-go">查看详情 →</span></div>
        <div class="cmp-meta"><span>${esc(d.name)}</span><span class="cmp-lv">${LVN[it.lv] || ""}</span></div>
      </div>
      ${memo ? `<div class="cmp-sec memo"><div class="cmp-h"><svg class=ic aria-hidden=true><use href=#i-bulb /></svg>一句话记住</div><div class="cmp-b">${esc(memo)}</div></div>` : ""}
      <div class="cmp-sec"><div class="cmp-h"><svg class=ic aria-hidden=true><use href=#i-pin /></svg>核心要点</div><div class="cmp-b"><ul>${pts.map(x=>`<li>${esc(x)}</li>`).join("")}</ul></div></div>
      ${nums.length ? `<div class="cmp-sec"><div class="cmp-h"><svg class=ic aria-hidden=true><use href=#i-hash /></svg>关键经验数值</div><div class="cmp-b"><ul class="cmp-num">${nums.map(x=>`<li>${esc(x)}</li>`).join("")}</ul></div></div>` : ""}
      <div class="cmp-sec"><div class="cmp-h"><svg class=ic aria-hidden=true><use href=#i-factory /></svg>应用场景</div><div class="cmp-b">${esc(it.usage || "—")}</div></div>
      ${rel.length ? `<div class="cmp-sec"><div class="cmp-h"><svg class=ic aria-hidden=true><use href=#i-link /></svg>关联条目</div><div class="cmp-b"><div class="rel-box">${rel.map(n=>`<button class="rel-chip sm" data-rel="${esc(n)}">${esc(n)}</button>`).join("")}</div></div>` : ""}
    </div>`;
  };
  document.getElementById("cmpBody").innerHTML = `<div class="cmp-grid">${col(cmpFind(cmpSel.a))}${col(cmpFind(cmpSel.b))}</div>`;
}
document.getElementById("cmpA").addEventListener("change", e=>{ cmpSel.a = e.target.value; lsSet(LS_CMP, cmpSel); renderCompare(); });
document.getElementById("cmpB").addEventListener("change", e=>{ cmpSel.b = e.target.value; lsSet(LS_CMP, cmpSel); renderCompare(); });
document.getElementById("cmpPresets").addEventListener("click", e=>{
  const b = e.target.closest("[data-cmp]"); if(!b) return;
  const p = CMP_PRESETS[+b.dataset.cmp]; if(!p) return;
  const A = cmpFind(p.a), B = cmpFind(p.b); if(!A || !B) return;
  cmpSel = { a: A.name, b: B.name };
  lsSet(LS_CMP, cmpSel);
  renderCompare();
});

/* ══════════════ 首页：最近浏览 ══════════════ */
function relTime(ts){
  const s = Math.floor((Date.now() - ts)/1000);
  if(s < 60) return "刚刚";
  if(s < 3600) return Math.floor(s/60) + " 分钟前";
  if(s < 86400) return Math.floor(s/3600) + " 小时前";
  return Math.floor(s/86400) + " 天前";
}
function renderRecent(){
  const box = document.getElementById("panelRecent"); if(!box) return;
  const list = recents.filter(x => KB_ITEMS.some(it => it.name === x.n)).slice(0, 8);
  box.innerHTML = `<h3><svg class=ic aria-hidden=true><use href=#i-clock /></svg>最近浏览</h3>
    <div class="pdesc">点任意条目直接回到详情（只记录在本机）</div>
    ${list.length ? list.map(x=>{
      const it = KB_ITEMS.find(y => y.name === x.n), d = it ? CAT_DOMAIN[it.cat] : null;
      return `<div class="recent-item" data-recent="${esc(x.n)}">
        <span class="ri-ic">${d ? d.icon : "<svg class=ic aria-hidden=true><use href=#i-file-text /></svg>"}</span>
        <span class="ri-n">${esc(x.n)}</span>
        <span class="ri-t">${relTime(x.t)}</span></div>`;
    }).join("") : `<div class="empty" style="padding:14px 0">还没有浏览记录，点开任意知识点就会出现在这里。</div>`}
    ${recents.length > 8 ? `<div class="data-note">共 ${recents.length} 条记录，仅显示最近 8 条</div>` : ""}`;
}

/* ══════════════ 搜索历史下拉 ══════════════ */
function renderSearchHist(){
  const box = document.getElementById("searchHist"); if(!box) return;
  if(!searchHist.length || kw.value.trim()){ box.classList.remove("on"); box.innerHTML = ""; return; }
  box.innerHTML = `<div class="sh-cap"><span><svg class=ic aria-hidden=true><use href=#i-clock /></svg>搜索历史</span><button data-shclear="1">清空</button></div>` +
    searchHist.map(q => `<button class="sh-item" data-sh="${esc(q)}"><svg class=ic aria-hidden=true><use href=#i-search /></svg> ${esc(q)}</button>`).join("");
  box.classList.add("on");
}
function hideSearchHist(){ const b = document.getElementById("searchHist"); if(b) b.classList.remove("on"); }

/* ══════════════ 学习打卡热力图 ══════════════ */
function heatHTML(){
  const cells = [];
  for(let i = 29; i >= 0; i--){
    const d = new Date(); d.setDate(d.getDate() - i);
    const k = todayStr(d), n = streak[k] || 0;
    const lv = n === 0 ? "" : n < 3 ? "l1" : n < 8 ? "l2" : "l3";
    cells.push(`<i class="${lv}" title="${k}　${n} 次学习动作"></i>`);
  }
  return `<div class="heat">${cells.join("")}</div>
    <div class="heat-legend">少 <i></i><i class="l1"></i><i class="l2"></i><i class="l3"></i> 多　·　每格一天，颜色越深当天学习动作越多</div>`;
}

/* ══════════════ 学习时长统计 ══════════════ */
const LS_TIME = "kb-time-v1", LS_GOAL = "kb-goal-v1";
let timeLog = lsGet(LS_TIME, {});    // { "YYYY-MM-DD": 秒数 }
let goalMin = lsGet(LS_GOAL, 150);   // 每周目标（分钟）
let timeAcc = 0;
function timeSave(){ lsSet(LS_TIME, timeLog); }
function timeTick(){
  if(document.hidden) return;        // 只在页面可见时计
  const t = todayStr();
  timeLog[t] = (timeLog[t] || 0) + 15;
  timeAcc += 15;
  if(timeAcc >= 60){ timeAcc = 0; timeSave(); }
}
setInterval(timeTick, 15000);
document.addEventListener("visibilitychange", ()=>{ if(document.hidden) timeSave(); });
window.addEventListener("beforeunload", timeSave);
function fmtDur(sec){
  sec = Math.max(0, Math.round(sec || 0));
  if(sec < 60) return sec + " 秒";
  const m = Math.round(sec / 60);
  if(m < 60) return m + " 分";
  const h = m / 60;
  return (h >= 10 ? Math.round(h) : h.toFixed(1)) + " 小时";
}
function timeStats(){
  const t = todayStr(), days = Object.keys(timeLog);
  const total = days.reduce((a, d) => a + (timeLog[d] || 0), 0);
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const mon = new Date(now); mon.setDate(now.getDate() - ((now.getDay() + 6) % 7));  // 本周一
  const start7 = new Date(now); start7.setDate(now.getDate() - 6);
  let week = 0, last7 = 0, active = 0;
  days.forEach(d=>{
    const dt = new Date(d + "T12:00:00");
    if(dt >= mon && dt <= now) week += timeLog[d] || 0;
    if(dt >= start7 && dt <= now) last7 += timeLog[d] || 0;
    if((timeLog[d] || 0) >= 60) active++;
  });
  return { total, today: timeLog[t] || 0, week, avg: last7 / 7, active, goal: goalMin * 60, goalMin };
}
/* 时长卡片（供学习数据模块使用） */
function timeCardHTML(){
  const s = timeStats();
  const pct = s.goal ? Math.min(100, Math.round(s.week / s.goal * 100)) : 0;
  const opts = [60, 150, 300];
  return `
    <div class="ch-card">
      <h3>⏱️ 学习时长</h3>
      <div class="chd">页面打开时自动累计（切到后台不计）；共 ${s.active} 天有实质学习记录</div>
      <div class="time-grid">
        <div class="time-cell"><b>${fmtDur(s.today)}</b><span>今日</span></div>
        <div class="time-cell"><b>${fmtDur(s.week)}</b><span>本周</span></div>
        <div class="time-cell"><b>${fmtDur(s.total)}</b><span>累计</span></div>
        <div class="time-cell"><b>${fmtDur(s.avg)}</b><span>近 7 天日均</span></div>
      </div>
      <div class="prog-row" style="margin-top:12px">
        <span class="pl">本周目标</span>
        <div class="prog-bar"><i style="width:${pct}%;background:${barBg(pct)}"></i></div>
        <span class="pv">${Math.round(s.week / 60)}/${s.goalMin} 分</span>
      </div>
      <div class="qv-desc" style="margin-top:8px">目标：
        ${opts.map(m=>`<button class="mini-btn${m === s.goalMin ? " ok" : ""}" data-goal="${m}" style="padding:4px 10px; font-size:var(--fs-xs); margin:0 3px;">${m} 分/周</button>`).join("")}
      </div>
    </div>`;
}

/* ══════════════ 学习数据备份与恢复 ══════════════ */
const LS_ALL = ["kb-progress-v1","kb-check-v2","kb-quiz-v1","kb-fav-v1","kb-note-v1","kb-tpl-v1",
                "kb-theme-v1","kb-recent-v1","kb-search-v1","kb-streak-v1","kb-daily-v1","kb-daily20-v1","kb-review-v1","kb-time-v1","kb-goal-v1","kb-doubt-v1",
                "kb-path-done-v1",
                /* 工作台（kb-workspace.js）：单价库 / 报价方案 / 计算器记忆 / 项目台账 / 首页快捷 */
                "kb-ws-price-v1","kb-ws-plan-v1","kb-ws-calc-v1","kb-ws-proj-v1","kb-ws-short-v1","kb-ws-auto-v1"];
function exportData(){
  const bag = {};
  LS_ALL.forEach(k => { const v = localStorage.getItem(k); if(v !== null) bag[k] = v; });
  const payload = { app: "结构工程师知识库", ver: 1, at: new Date().toISOString(), data: bag };
  try{
    const blob = new Blob([JSON.stringify(payload, null, 1)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "结构工程师知识库-学习记录-" + todayStr() + ".json";
    document.body.appendChild(a); a.click();
    setTimeout(()=>{ try{ URL.revokeObjectURL(a.href); }catch(e){} a.remove(); }, 300);
    return true;
  }catch(e){ return false; }
}
/* 把导入的数据写回本机存储（供测试与导入共用） */
function importPayload(d){
  const bag = (d && d.data) ? d.data : d;
  if(!bag || typeof bag !== "object") return 0;
  let n = 0;
  LS_ALL.forEach(k => {
    if(bag[k] !== undefined){
      try{ localStorage.setItem(k, typeof bag[k] === "string" ? bag[k] : JSON.stringify(bag[k])); n++; }catch(e){}
    }
  });
  return n;
}
function importData(){
  const inp = document.createElement("input");
  inp.type = "file"; inp.accept = ".json,application/json";
  inp.onchange = () => {
    const f = inp.files && inp.files[0]; if(!f) return;
    const fr = new FileReader();
    fr.onload = () => {
      try{
        const n = importPayload(JSON.parse(fr.result));
        if(!n) throw new Error("文件里没有可识别的记录");
        alert("导入成功，共恢复 " + n + " 类记录。页面将刷新以应用。");
        try{ location.reload(); }catch(e){}
      }catch(e){ alert("导入失败：" + e.message); }
    };
    fr.readAsText(f);
  };
  inp.click();
}
function clearAllData(){
  if(!confirm("确定清空全部学习记录吗？\n\n将清除：学习进度、清单勾选、答题记录、收藏、笔记、模板草稿、打卡与浏览历史。\n此操作不可撤销，建议先「导出备份」。")) return;
  LS_ALL.forEach(k => { if(k !== "kb-theme-v1" && k !== "kb-goal-v1"){ try{ localStorage.removeItem(k); }catch(e){} } });
  alert("已清空，页面将刷新。");
  try{ location.reload(); }catch(e){}
}

function renderAll(){
  /* 当前模块的数据若还没到位：先用现有数据渲染一次让界面立刻响应，
     同时后台补齐，完成后自动重渲染（首屏省下那 526KB 靠的就是这段） */
  if(!dataReady(activeModule)){
    const want = activeModule;
    ensureData(want).then(function(){ if(activeModule === want) renderAll(); });
  }
  if(activeModule !== "daily") d20ViewDate = "";   // 离开「每日20题」就回到今天的卷子
  navbar.querySelectorAll(".nav-tab").forEach(b=>{
    const on = b.dataset.mod === activeModule;
    b.classList.toggle("active", on);
    if(on) b.setAttribute("aria-current", "true"); else b.removeAttribute("aria-current");
  });
  /* 小屏导航横向滑动时，把当前模块滚进可视区 */
  (function(){
    const cur = navbar.querySelector(".nav-tab.active");
    if(!cur || !cur.scrollIntoView) return;
    try{
      if(window.matchMedia && window.matchMedia("(max-width:640px)").matches){
        cur.scrollIntoView({ block: "nearest", inline: "center" });
      }
    }catch(e){}
  })();
  const isKB = activeModule === "kb";
  Object.values(MOD_VIEWS).forEach(v=>{ if(v) v.style.display = "none"; });
  document.querySelector(".search").style.display = isKB ? "" : "none";
  kw.style.display = isKB ? "" : "none";
  if(!isKB){
    KB_VIEWS.forEach(v=>{ if(v) v.style.display = "none"; });
    lvFilter.style.display = "none"; stFilter.style.display = "none"; backBtn.style.display = "none";
    const v = MOD_VIEWS[activeModule];
    if(v) v.style.display = "";
    if(activeModule==="quick") renderQuick();
    else if(activeModule==="check") renderChecks();
    else if(activeModule==="case") renderCases();
    else if(activeModule==="gloss") renderGloss();
    else if(activeModule==="path") renderPath();
    else if(activeModule==="map") renderMap();
    else if(activeModule==="quiz") renderQuiz();
    else if(activeModule==="daily") renderDaily20();
    else if(activeModule==="review") renderReview();
    else if(activeModule==="compare") renderCompare();
    else if(activeModule==="step") renderStep();
    else if(activeModule==="calc") renderCalc();
    else if(activeModule==="field") renderField();
    else if(activeModule==="gallery") renderGallery();
    else if(activeModule==="select") renderSelect();
    else if(activeModule==="formula") renderFormula();
    else if(activeModule==="wrong") renderWrong();
    else if(activeModule==="stats") renderStats();
    else if(activeModule==="tpl") renderTpl();
    else if(activeModule==="fav") renderFav();
    refreshBadges();          // 角标随当前状态刷新（复习/每日20题/错题/收藏）
    return;
  }
  const q = kw.value.trim();
  if(q || browseAll){
    homeView.style.display="none"; domainView.style.display="none"; searchView.style.display="";
    lvFilter.style.display=""; stFilter.style.display="";
    backBtn.style.display="";
    renderSearch();
  }else{
    document.getElementById("gsGroups").innerHTML = "";
    if(activeDomain){
      openDomain();
    }else{
      homeView.style.display=""; domainView.style.display="none"; searchView.style.display="none";
      lvFilter.style.display="none"; stFilter.style.display="none";
      backBtn.style.display="none";
      renderHome();
    }
  }
}

// 事件
kw.addEventListener("input", ()=>{
  const q = kw.value.trim();
  if(q) browseAll = false;
  /* 全站搜索会索引题库解析（KB_QUIZ_EXP），所以首次搜索时把题库数据补上 */
  if(q && !dataReady("quiz")) ensureData("quiz").then(function(){ if(kw.value.trim()) renderAll(); });
  renderAll();
});
lvFilter.addEventListener("change", renderAll);
stFilter.addEventListener("change", renderAll);
backBtn.onclick = ()=>{
  kw.value = ""; browseAll = false; activeDomain = null;
  renderAll();
  closeDetail();
};
document.getElementById("coreBtn").onclick = ()=>{
  browseAll = true; activeDomain = null; kw.value = "";
  lvFilter.value = "1"; stFilter.value = "-1";
  renderAll();
};
document.getElementById("allBtn").onclick = ()=>{
  browseAll = true; activeDomain = null; kw.value = "";
  lvFilter.value = ""; stFilter.value = "-1";
  renderAll();
};

// 行点击 → 打开详情；子按钮冒泡阻断
document.addEventListener("click", e=>{
  const stEl = e.target.closest(".st[data-name]");
  if(stEl){ e.stopPropagation(); cycleSt(stEl.dataset.name); return; }
  const imgBtn = e.target.closest(".img-btn[data-name]");
  if(imgBtn){
    // 点缩略图本身 → 只放大看图，不打开详情面板（避免同时弹出两个层）
    if(e.target.tagName === "IMG" && imgBtn.dataset.img) return;
    e.stopPropagation();
    const it = KB_ITEMS.find(x=>x.name === imgBtn.dataset.name);
    if(it) openDetail(it);
    return;
  }
  const tr = e.target.closest("tr[data-name]");
  if(tr){
    const it = KB_ITEMS.find(x=>x.name === tr.dataset.name);
    if(it) openDetail(it);
    return;
  }
});

// AI 提示词 Modal 复制
document.getElementById("aiCopyBtn").onclick = function(){
  const t = document.getElementById("aiPromptText").textContent;
  navigator.clipboard?.writeText(t).then(()=>{
    this.textContent = "✓ 已复制"; this.classList.add("ok");
    setTimeout(()=>{ this.textContent = "复制提示词"; this.classList.remove("ok"); }, 1800);
  });
};
document.getElementById("aiCloseBtn").onclick = ()=> document.getElementById("aiModal").classList.remove("open");

// 图片放大（主图 / 参考图集 / 图库通用）
document.addEventListener("click", e=>{
  // 图库卡片上的知识点标题 → 跳详情
  const gi = e.target.closest(".gc-item[data-rel]");
  if(gi){ e.preventDefault(); e.stopPropagation(); openItemByName(gi.dataset.rel); return; }
  const tgt = e.target.closest(".ref-card[data-ref], .gw-card[data-ref], .img-preview img, .img-btn[data-img] img");
  if(!tgt) return;
  e.stopPropagation();
  const card = e.target.closest(".ref-card[data-ref], .gw-card[data-ref]");
  let src = "", cap = "";
  if(card){
    src = card.dataset.ref; cap = card.dataset.cap + (card.dataset.src ? "　|　来源：" + card.dataset.src : "");
  }else{
    const btn = e.target.closest(".img-btn[data-img]");
    const im = e.target.closest("img");
    // 列表里显示的是缩略图，放大时要换成原图
    src = (btn && btn.dataset.img) ? btn.dataset.img : (im ? im.getAttribute("src") : "");
    cap = btn ? btn.dataset.name : "";
  }
  if(!src) return;
  document.getElementById("imgModalSrc").src = src;
  document.getElementById("imgModalCap").textContent = cap;
  document.getElementById("imgModal").classList.add("open");
});
document.getElementById("imgModalClose").onclick = ()=> document.getElementById("imgModal").classList.remove("open");
document.getElementById("imgModal").addEventListener("click", e=>{
  if(e.target === document.getElementById("imgModal")) document.getElementById("imgModal").classList.remove("open");
});

/* ══════════════ 赞赏支持 ══════════════ */
(function initDonate(){
  const modal = document.getElementById("donateModal");
  const btn = document.getElementById("donateBtn");
  if(!modal || !btn) return;
  const open = ()=> modal.classList.add("open");
  const close = ()=> modal.classList.remove("open");
  btn.addEventListener("click", open);
  const closeBtn = document.getElementById("donateCloseBtn");
  if(closeBtn) closeBtn.addEventListener("click", close);
  // 点遮罩关闭
  modal.addEventListener("click", e=>{ if(e.target === modal) close(); });
  // 点二维码放大查看（复用大图弹窗，它在本弹窗之上）
  modal.querySelectorAll(".donate-card img").forEach(img=>{
    img.addEventListener("click", ()=>{
      document.getElementById("imgModalSrc").src = img.getAttribute("src");
      document.getElementById("imgModalCap").textContent = img.getAttribute("alt") || "";
      document.getElementById("imgModal").classList.add("open");
    });
  });

  /* ══════════════════ 打开页面自动弹出 ══════════════════
     ⚙️ 想调整曝光强度，只改下面这一行：
        delay  延迟多少毫秒再弹（先让页面渲染出来，不要一打开就糊脸）
        days   同一访客最少间隔几天再弹一次。改成 0 = 每次打开都弹
     · 访客点「不再提示」后永久不再弹
     · 自己看效果：链接后加 ?donate=1 强制弹；?donate=0 关掉本轮 */
  const DONATE_AUTO = { on: true, delay: 1600 };

  /* 本次打开是否已经弹过（或访客说过「本次不再提示」）
     ⚠️ 只存在内存里、不写 localStorage —— 所以：
        · 一次打开最多弹一次（访客关掉后不会再冒出来）
        · 关掉浏览器/刷新后再打开，仍然会弹（不做「几天内只弹一次」的频率限制）
        · 点「本次不再提示」只对这一次有效，下次打开照弹 */
  let donateShown = false;

  (function autoPopup(){
    if(!DONATE_AUTO.on) return;
    try{
      if(new URLSearchParams(location.search).get("donate") === "0") return;   // ?donate=0 → 本轮不弹
    }catch(e){}
    let tries = 0;
    const tick = ()=>{
      if(donateShown) return;
      /* 页面在后台、或访客正开着别的弹窗时先避让，稍后补弹（不会两个弹窗叠一起） */
      const busy = document.visibilityState === "hidden"
        || document.getElementById("imgModal").classList.contains("open")
        || document.getElementById("aiModal").classList.contains("open")
        || modal.classList.contains("open");
      if(busy){
        if(tries++ < 20) setTimeout(tick, 3000);
        return;
      }
      donateShown = true;
      open();
    };
    setTimeout(tick, Math.max(0, DONATE_AUTO.delay));
  })();

  /* 「本次不再提示」：只抑制这一次打开，不写入任何持久化标记 */
  const neverBtn = document.getElementById("donateNeverBtn");
  if(neverBtn) neverBtn.addEventListener("click", ()=>{ donateShown = true; close(); });
})();

/* ══════════════ 模块导航与交互绑定 ══════════════ */

/* 站内多处文案写着「多少条知识点 / 多少道题 / 多少张图」—— 内容一直在长，
 * 光靠手改总会漏（2026-09-21 实测仍有 6 处写着 198、导航角标写着 120）。
 * 这里给这些位置加 data-cnt 标记，启动时按实际数据校正一遍；
 * HTML 里保留当前正确值作默认，所以题库（懒加载）还没到位时也不会显示错数字。
 * ⚠️ 新增知识点 / 题目后，只需更新 index.html 的 title 与 meta 描述（SEO 要静态值），
 *    页面内的这些数字会自动跟上。 */
function syncCounts(){
  const m = {
    items: KB_ITEMS.length,
    quiz:  (window.KB_QUIZ||[]).reduce(function(a,p){ return a + quizTotal(p); }, 0),
    img:   Object.values(window.KB_IMG||{}).reduce(function(a,v){ return a + v.length; }, 0),
    calc:  (typeof CALCS !== "undefined" ? CALCS.length : 0),
  };
  document.querySelectorAll("[data-cnt]").forEach(function(el){
    const k = el.dataset.cnt;
    if(m[k] === undefined) return;
    if(k === "quiz" && !dataReady("quiz")) return;   // 题库未到位：保留 HTML 里的默认值
    const tail = (el.textContent.match(/[条道张个]/) || [""])[0];
    el.textContent = m[k] + (tail ? " " + tail : "");
  });
}
function initBadges(){
  const set = (id,v)=>{ const el=document.getElementById(id); if(el) el.textContent=v; };
  set("nbKb", KB_ITEMS.length);
  set("nbQuick", (window.KB_QUICK||[]).length + " 表");
  set("nbCheck", (window.KB_CHECKS||[]).length + " 份");
  set("nbCase", (window.KB_CASES||[]).length + " 个");
  set("nbGloss", (window.KB_GLOSS||[]).length + " 条");
  set("nbPath", (window.KB_PATH||[]).length + " 周");
  set("nbMap", (window.KB_MAP||[]).length + " 领域");
  set("nbQuiz", (window.KB_QUIZ||[]).reduce((a,p)=>a+quizTotal(p),0) + " 题");
  set("nbCalc", (typeof CALCS!=="undefined" ? CALCS.length : 0) + " 个");
  set("nbField", ((window.KB_MISTAKE||[]).reduce((a,x)=>a+x.items.length,0) + (window.KB_TROUBLE||[]).reduce((a,x)=>a+x.items.length,0) + (window.KB_INTERVIEW||[]).reduce((a,x)=>a+x.items.length,0)) + " 条");
  set("nbGallery", Object.values(window.KB_IMG||{}).reduce((a,b)=>a+b.length,0) + " 张");
  set("nbSelect", (window.KB_SELECT||[]).length + " 棵树");
  /* 题库是懒加载的：数据没到位时这里的数字会偏小（曾让角标一直显示 120 题），
     所以 afterQuizData() 里会重新调用本函数校正一次。 */
  set("nbFormula", ((window.KB_FORMULA||[]).reduce((a,g)=>a+(g.items||[]).length,0) + (window.KB_UNIT||[]).reduce((a,g)=>a+(g.items||[]).length,0)) + " 条");
  set("nbTpl", (window.KB_TEMPLATE||[]).length + " 份");
  set("nbDaily", "20 题");
  set("nbReview", rvDue().length ? rvDue().length + " 题" : "0 题");
  set("nbCompare", KB_ITEMS.length + " 条");
  set("nbWrong", wrongList().length ? wrongList().length + " 题" : "0 题");
  set("nbStats", "6 图");
  set("nbFav", favCount() + " 条");
}
initBadges();
syncCounts();;

// 参考图库筛选
document.getElementById("gwCat").addEventListener("change", ()=>resetGallery());
document.getElementById("gwSearch").addEventListener("input", ()=>resetGallery());
// 加载更多
document.getElementById("gwBody").addEventListener("click", e=>{
  if(e.target.closest("#gwMore")){ gwLimit += 60; renderGallery(); }
});

// 实战宝典搜索
document.getElementById("fieldSearch").addEventListener("input", renderField);

// 详情面板区块跳转
document.getElementById("dpAnchors").addEventListener("click", e=>{
  const b = e.target.closest("[data-sec]"); if(!b) return;
  const sec = document.getElementById(b.dataset.sec); if(!sec) return;
  const body = document.getElementById("dpBody");
  const top = body.scrollTop + (sec.getBoundingClientRect().top - body.getBoundingClientRect().top) - 8;
  try{
    if(typeof body.scrollTo === "function") body.scrollTo({top: Math.max(0, top), behavior:"smooth"});
    else body.scrollTop = Math.max(0, top);
  }catch(err){ body.scrollTop = Math.max(0, top); }
});

// 全站搜索结果 → 跳转到对应模块并带上关键词
document.getElementById("gsGroups").addEventListener("click", e=>{
  const el = e.target.closest("[data-jump]"); if(!el) return;
  const q = kw.value.trim();
  activeModule = el.dataset.jump;
  if(el.dataset.field) activeField = el.dataset.field;
  if(el.dataset.quiz) activeQuiz = el.dataset.quiz;
  if(el.dataset.sel){ activeSel = el.dataset.sel; selCur = null; selPath = []; }
  if(el.dataset.fm) activeFm = el.dataset.fm;
  if(el.dataset.chk) activeChk = el.dataset.chk;
  if(el.dataset.tpl) activeTpl = el.dataset.tpl;
  if(el.dataset.dom){ activeDomain = el.dataset.dom; browseAll = false; kw.value = ""; }
  if(activeModule === "gloss"){ glCat = "全部"; document.getElementById("glSearch").value = q; }
  else if(activeModule === "quick"){ document.getElementById("qvSearch").value = q; }
  else if(activeModule === "field"){ document.getElementById("fieldSearch").value = q; }
  else if(activeModule === "formula"){ document.getElementById("fmSearch").value = q; }
  renderAll();
  if(el.dataset.open){ const it = KB_ITEMS.find(x=>x.name===el.dataset.open); kw.value=""; renderAll(); if(it) openDetail(it); }
  window.scrollTo({top:0, behavior:"smooth"});
});

// 回到顶部
(function(){
  const btn = document.getElementById("toTop");
  window.addEventListener("scroll", ()=>{
    btn.style.display = (window.scrollY > 480 && !document.body.classList.contains("detail-open")) ? "flex" : "none";
  }, {passive:true});
  btn.onclick = ()=> window.scrollTo({top:0, behavior:"smooth"});
})();

// 学习地图
document.getElementById("mapTabs").addEventListener("click", e=>{
  const b = e.target.closest("[data-map]"); if(!b) return;
  activeMap = b.dataset.map; renderMap(); window.scrollTo({top:0, behavior:"smooth"});
});

// 自测题库
document.getElementById("quizTabs").addEventListener("click", e=>{
  const b = e.target.closest("[data-quiz]"); if(!b) return;
  activeQuiz = b.dataset.quiz; quizLevFilter = "全部"; quizTypeFilter = "全部"; quizFocus = null;
  renderQuiz(); window.scrollTo({top:0, behavior:"smooth"});
});
document.getElementById("quizLev").addEventListener("click", e=>{
  const l = e.target.closest("[data-qlv]"), t = e.target.closest("[data-qtype]");
  if(l){ quizLevFilter = l.dataset.qlv; quizFocus = null; renderQuiz(); }
  else if(t){ quizTypeFilter = t.dataset.qtype; quizFocus = null; renderQuiz(); }
});
/* 「下一题 →」按钮：和答题卡跳题同样的行为 */
document.getElementById("quizBody").addEventListener("click", e=>{
  const b = e.target.closest(".qr-next[data-qjump]"); if(!b) return;
  goQuiz(+b.dataset.qjump);
});

/* 折叠态：点一下展开该题（一次只开一题） */
document.getElementById("quizBody").addEventListener("click", e=>{
  const card = e.target.closest(".quiz-q.q-collapsed[data-qopen]");
  if(!card) return;
  quizFocus = +card.dataset.qopen;
  renderQuiz();
});
document.getElementById("quizBody").addEventListener("click", e=>{
  const o = e.target.closest(".q-opt[data-q]"); if(!o) return;
  if(o.classList.contains("lock")) return;
  const p = KB_QUIZ.find(x=>x.id===activeQuiz); if(!p) return;
  const qi = +o.dataset.q, oi = +o.dataset.o;
  quizAnsOf(p.id)[qi] = oi;
  quizSave();
  const ansNow = quizAnsOf(p.id);
  const qq = quizAt(p, qi);
  if(qq) rvGrade(p.id, qi, oi === qq.a);      // 登记到复习计划
  markStudy(1);
  /* 逐题模式：答完仍保持这题展开 —— 要让学生当场看到解析，而不是立刻被折叠掉 */
  quizFocus = qi;
  renderQuiz(); refreshBadges();
});
/* 答题卡 / 「下一题」：展开该题并滚动过去（元素是重绘出来的，用委托） */
function goQuiz(idx){
  quizFocus = idx;
  renderQuiz();
  setTimeout(()=>{
    const el = document.querySelector('#quizBody .quiz-q[data-qi="' + idx + '"]');
    if(!el) return;
    el.scrollIntoView({behavior:"smooth", block:"center"});
    el.classList.remove("flash"); void el.offsetWidth; el.classList.add("flash");
    setTimeout(()=>el.classList.remove("flash"), 1200);
  }, 60);
}
document.getElementById("quizSheet").addEventListener("click", e=>{
  const b = e.target.closest("[data-qjump]"); if(!b) return;
  goQuiz(+b.dataset.qjump);
});

/* 已答题的「看选项」：展开/收起原来的 4 个选项 */
document.getElementById("quizBody").addEventListener("click", e=>{
  const b = e.target.closest("[data-qmore]"); if(!b) return;
  const wrap = b.closest(".quiz-q").querySelector(".qopts");
  if(!wrap) return;
  if(wrap.hasAttribute("hidden")){ wrap.removeAttribute("hidden"); b.textContent = "收起选项"; }
  else { wrap.setAttribute("hidden", ""); b.textContent = "看选项"; }
});

document.getElementById("quizActions").addEventListener("click", e=>{
  const b = e.target.closest("[data-qact]"); if(!b) return;
  const p = KB_QUIZ.find(x=>x.id===activeQuiz); if(!p) return;
  if(b.dataset.qact === "expand"){ quizExpandAll = !quizExpandAll; quizFocus = null; renderQuiz(); return; }
  if(b.dataset.qact === "reset"){ quizState[p.id] = {}; }
  else{
    const a = quizAnsOf(p.id);
    for(let i=0;i<quizTotal(p);i++){ const q = quizAt(p,i); if(q && a[i]!==undefined && a[i]!==q.a) delete a[i]; }
  }
  quizSave(); renderQuiz();
});

// 计算器
/* 30 天路径：勾选/取消某一天 */
document.getElementById("pathBody").addEventListener("click", e=>{
  const b = e.target.closest("[data-pdone]"); if(!b) return;
  const k = b.dataset.pdone;
  if(pathDone[k]) delete pathDone[k]; else { pathDone[k] = 1; markStudy(1); }
  pathSave(); renderPath(); refreshBadges();
});
document.getElementById("calcBody").addEventListener("input", e=>{
  const el = e.target.closest("input[data-calc]"); if(!el) return;
  const c = CALCS.find(x=>x.id===el.dataset.calc); if(c) runCalc(c);
  /* 输入自动记住：切模块、刷新都不丢 */
  const w = window.KB_WS; if(w) w.calcSet(el.dataset.calc, el.dataset.k, el.value);
});
document.getElementById("calcBody").addEventListener("click", e=>{
  const cp = e.target.closest("[data-ccopy]");
  if(cp){ const c = CALCS.find(x=>x.id===cp.dataset.ccopy); if(c) copyCalcResult(cp, c); return; }
  const rs = e.target.closest("[data-creset]");
  if(rs){ const w = window.KB_WS; if(w) w.calcReset(rs.dataset.creset); renderCalc(); return; }
});

// 实战宝典
document.getElementById("fieldTabs").addEventListener("click", e=>{
  const b = e.target.closest("[data-field]"); if(!b) return;
  activeField = b.dataset.field; renderField(); window.scrollTo({top:0, behavior:"smooth"});
});

// 选型决策
document.getElementById("selTabs").addEventListener("click", e=>{
  const b = e.target.closest("[data-sel]"); if(!b) return;
  activeSel = b.dataset.sel; selCur = null; selPath = [];
  renderSelect(); window.scrollTo({top:0, behavior:"smooth"});
});
document.getElementById("selBody").addEventListener("click", e=>{
  const tree = selTree(); if(!tree) return;
  if(e.target.closest("#selReset")){ selCur = tree.start; selPath = []; renderSelect(); return; }
  if(e.target.closest("#selBack")){
    const p = selPath.pop(); if(p){ selCur = p.nodeId; renderSelect(); }
    return;
  }
  const ob = e.target.closest("[data-opt]"); if(!ob) return;
  const node = tree.nodes[selCur]; if(!node || !node.opts) return;
  const o = node.opts[+ob.dataset.opt]; if(!o) return;
  selPath.push({ nodeId: selCur, ans: o.t });
  selCur = o.go;
  renderSelect();
});

// 公式速查
document.getElementById("fmTabs").addEventListener("click", e=>{
  const b = e.target.closest("[data-fm]"); if(!b) return;
  activeFm = b.dataset.fm; renderFormula();
});
document.getElementById("fmSearch").addEventListener("input", ()=>{ renderFormula(); });

/* 引导空态里的行动按钮：跳到指定模块（全局委托，元素后生成也有效） */
/* 解析展开/收起：三处调用（题库 / 每日20题 / 复习计划）共用，走全局委托 */
document.addEventListener("click", e=>{
  const b = e.target.closest("[data-qexp]"); if(!b) return;
  const wrap = b.closest(".q-exps"); if(!wrap) return;
  const open = !wrap.classList.contains("open");
  wrap.classList.toggle("open", open);
  b.textContent = open ? "收起解析" : "展开解析";
});

document.addEventListener("click", e=>{
  const b = e.target.closest("[data-go]"); if(!b) return;
  switchMod(b.dataset.go);
});
navbar.addEventListener("click", e=>{
  const b = e.target.closest(".nav-tab"); if(!b) return;
  activeModule = b.dataset.mod;
  window.scrollTo({top:0, behavior:"smooth"});
  renderAll();
});

document.getElementById("qvTabs").addEventListener("click", e=>{
  const b = e.target.closest("[data-qv]"); if(!b) return;
  activeQuick = b.dataset.qv; renderQuick();
});
document.getElementById("qvSearch").addEventListener("input", ()=>{ renderQuick(); });

document.getElementById("caseTabs").addEventListener("click", e=>{
  const b = e.target.closest("[data-case]"); if(!b) return;
  activeCase = b.dataset.case; renderCases();
  window.scrollTo({top:0, behavior:"smooth"});
});

document.getElementById("chkSum").addEventListener("click", e=>{
  const b = e.target.closest("[data-chk]"); if(!b) return;
  activeChk = b.dataset.chk; renderChecks();
});
document.getElementById("chkBody").addEventListener("click", e=>{
  const it = e.target.closest("[data-ck]"); if(!it) return;
  const parts = it.dataset.ck.split("|");
  const id = parts[0], g = +parts[1], i = +parts[2];
  chkSet(id, g, i, !chkOn(id,g,i));
  markStudy(1);
  renderChecks();
});
document.getElementById("chkReset").onclick = ()=>{
  const c = KB_CHECKS.find(x=>x.id===activeChk); if(!c) return;
  c.groups.forEach((g,gi)=>g.items.forEach((it,ii)=>chkSet(c.id,gi,ii,false)));
  renderChecks();
};
document.getElementById("chkPrint").onclick = ()=>{ window.print(); };

document.getElementById("glChips").addEventListener("click", e=>{
  const b = e.target.closest("[data-gl]"); if(!b) return;
  glCat = b.dataset.gl; renderGloss();
});
document.getElementById("glSearch").addEventListener("input", ()=>{ renderGloss(); });

// 关联知识点 / 学习路径 标签 → 打开详情
document.addEventListener("click", e=>{
  const chip = e.target.closest(".rel-chip[data-rel], .map-item[data-rel]"); if(!chip) return;
  e.preventDefault(); e.stopPropagation();
  openItemByName(chip.dataset.rel);
});

// Esc：详情未打开时，从其他模块回到知识库（有弹窗打开时先让弹窗处理）
document.addEventListener("keydown", e=>{
  const modalOpen = ["donateModal","imgModal","aiModal"].some(id=>{
    const el = document.getElementById(id); return el && el.classList.contains("open");
  });
  if(modalOpen) return;
  if(e.key === "Escape" && !document.body.classList.contains("detail-open") && activeModule !== "kb"){
    activeModule = "kb"; renderAll();
  }
});

/* ══════════ 主题切换 ══════════ */
document.getElementById("themeBtn").addEventListener("click", ()=>{
  theme = theme === "dark" ? "light" : "dark";
  lsSet(LS_THEME, theme); applyTheme();
});
document.getElementById("kbdBtn").addEventListener("click", ()=>{
  document.getElementById("kbdHint").classList.toggle("on");
});

/* ══════════ 详情面板：收藏 / 笔记跳转 / 打印 ══════════ */
document.getElementById("dpFavBtn").addEventListener("click", e=>{
  e.stopPropagation();
  if(curDetail) toggleFav(curDetail.name);
});
document.getElementById("dpNoteJump").addEventListener("click", e=>{
  e.stopPropagation();
  const sec = document.getElementById("secNote");
  const body = document.getElementById("dpBody");
  if(sec && body){
    const delta = sec.getBoundingClientRect().top - body.getBoundingClientRect().top;
    body.scrollTo({ top: body.scrollTop + delta - 8, behavior: "smooth" });
  }
  const ta = document.getElementById("dpNote"); if(ta) setTimeout(()=>ta.focus(), 320);
});
document.getElementById("dpPrintBtn").addEventListener("click", e=>{
  e.stopPropagation();
  document.body.classList.add("printing-detail");
  setTimeout(()=>{ window.print(); setTimeout(()=>document.body.classList.remove("printing-detail"), 400); }, 80);
});

/* ══════════ 错题本交互 ══════════ */
document.getElementById("wrongTabs").addEventListener("click", e=>{
  const b = e.target.closest("[data-wd]"); if(!b) return;
  wrongDom = b.dataset.wd; renderWrong();
});
document.getElementById("wrongActions").addEventListener("click", e=>{
  const b = e.target.closest("[data-wact]"); if(!b) return;
  if(b.dataset.wact === "print"){ window.print(); return; }
  if(!confirm("确定要清空全部错题的选择记录吗？这些题会回到「未作答」状态，可以重新做一遍。")) return;
  KB_QUIZ.forEach(p=>{
    const a = quizState[p.id]; if(!a) return;
    for(let i=0;i<quizTotal(p);i++){
      const q = quizAt(p,i); if(!q) continue;
      if(a[i] !== undefined && a[i] !== q.a) delete a[i];
    }
  });
  quizSave(); renderWrong(); refreshBadges();
});

/* ══════════ 实战模板交互 ══════════ */
document.getElementById("tplTabs").addEventListener("click", e=>{
  const b = e.target.closest("[data-tp]"); if(!b) return;
  activeTpl = b.dataset.tp; renderTpl(); window.scrollTo({ top:0, behavior:"smooth" });
});
function tplCollect(e){
  const el = e.target.closest("[data-tk]"); if(!el) return;
  const tag = (el.tagName || "").toUpperCase();
  tplDraft[el.dataset.tk] = (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") ? el.value : el.textContent;
  clearTimeout(tplSaveTimer);
  tplSaveTimer = setTimeout(()=>lsSet(LS_TPL, tplDraft), 400);
}
document.getElementById("tplBody").addEventListener("input", tplCollect);
document.getElementById("tplBody").addEventListener("focusout", e=>{
  tplCollect(e);
  clearTimeout(tplSaveTimer);
  lsSet(LS_TPL, tplDraft);
});
document.getElementById("tplBody").addEventListener("click", e=>{
  const b = e.target.closest("[data-tact]"); if(!b) return;
  if(b.dataset.tact === "print"){ window.print(); return; }
  if(b.dataset.tact === "clear"){
    if(!confirm("确定清空这个模板里已填写的内容吗？（不影响模板本身的预设文字）")) return;
    const pre = activeTpl + "|";
    Object.keys(tplDraft).forEach(k=>{ if(k.indexOf(pre) === 0) delete tplDraft[k]; });
    lsSet(LS_TPL, tplDraft); renderTpl();
  }
});

/* ══════════ 我的收藏交互 ══════════ */
document.getElementById("favTabs").addEventListener("click", e=>{
  const b = e.target.closest("[data-fv]"); if(!b) return;
  favTab = b.dataset.fv; renderFav();
});
document.getElementById("favBody").addEventListener("click", e=>{
  const un = e.target.closest("[data-unfav]");
  if(un){
    e.stopPropagation();
    const n = un.dataset.unfav;
    if(un.dataset.nodelete){ delete notes[n]; lsSet(LS_NOTE, notes); }
    else { delete favs[n]; lsSet(LS_FAV, favs); }
    refreshBadges(); renderFav();
    return;
  }
  const item = e.target.closest("[data-open]");
  if(item) openItemByName(item.dataset.open);
});

/* ══════════ 每日一题 / 随机练习 ══════════ */
document.getElementById("panelDaily").addEventListener("click", e=>{
  const box = document.getElementById("panelDaily");
  if(e.target.closest("[data-godaily]")){
    activeModule = "daily"; d20ViewDate = ""; renderAll();
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }
  const r = e.target.closest("[data-rand]");
  if(r){
    const item = box._randItem; if(!item) return;
    const [, oi] = r.dataset.rand.split("|").map(Number);
    const correct = item.q.a;
    box.querySelectorAll("[data-rand]").forEach((el, j)=>{
      el.classList.add("lock");
      if(j === correct) el.classList.add("right");
      else if(j === oi) el.classList.add("wrong");
      el.removeAttribute("data-rand");
    });
    const exp = ((window.KB_QUIZ_EXP||{})[item.p.id+"|"+item.i]||{}).e || item.q.exp || "";
    box.insertAdjacentHTML("beforeend",
      `<div class="q-exp" style="margin-top:12px"><b>${oi===correct?"✓ 回答正确":"✗ 正确答案是 "+"ABCD"[correct]}</b> — ${esc(exp)}</div>
       <div class="data-note">做完可点「<svg class=ic aria-hidden=true><use href=#i-shuffle /></svg> 随机抽一题」再来一道，或去「🎯 自测题库」按领域系统练习</div>`);
    markStudy(1);
    return;
  }
  const d = e.target.closest("[data-daily]");
  if(!d || dailyState.chosen !== undefined) return;
  dailyState.chosen = Number(d.dataset.daily);
  lsSet("kb-daily-v1", dailyState);
  markStudy(1);
  renderDaily();
});
document.getElementById("randBtn").addEventListener("click", ()=>{
  randomDaily();
  const el = document.getElementById("panelDaily");
  if(el && el.scrollIntoView) try{ el.scrollIntoView({ behavior: "smooth", block: "center" }); }catch(e){}
});

/* ══════════ 每日 20 题 ══════════ */
/* 折叠态：点这一行展开该题（一次只开一题） */
document.getElementById("d20Body").addEventListener("click", e=>{
  const card = e.target.closest(".quiz-q.q-collapsed[data-d20open]");
  if(!card) return;
  d20Focus = +card.dataset.d20open;
  renderDaily20();
});
document.getElementById("d20Body").addEventListener("click", e=>{
  const o = e.target.closest("[data-dq]"); if(!o) return;
  const k = +o.dataset.dq, oi = +o.dataset.do;
  const cur = d20Day();
  if(!cur.isToday || cur.day.ans[k] !== undefined) return;
  const x = d20Quiz(cur.day.order[k]); if(!x || !x.q) return;
  cur.day.ans[k] = oi;
  d20Save();
  /* 同步写回总答题记录：错题本、领域薄弱度、学习数据会自动联动 */
  const ans = quizAnsOf(x.p.id); ans[x.i] = oi; quizSave();
  rvGrade(x.p.id, x.i, oi === x.q.a);      // 登记到复习计划
  markStudy(1);
  d20Focus = k;            // 答完保持展开，能当场看解析
  renderDaily20();
  refreshBadges();
});

document.getElementById("d20Actions").addEventListener("click", e=>{
  const b = e.target.closest("[data-d20]"); if(!b) return;
  const act = b.dataset.d20, cur = d20Day();
  if(act === "print"){ window.print(); return; }
  if(act === "expand"){ d20ExpandAll = !d20ExpandAll; d20Focus = null; renderDaily20(); return; }
  if(!cur.isToday) return;
  if(act === "redo"){
    let n = 0;
    cur.day.order.forEach((r, k)=>{
      if(cur.day.ans[k] === undefined) return;
      const x = d20Quiz(r); if(!x || !x.q) return;
      if(cur.day.ans[k] !== x.q.a){
        delete cur.day.ans[k]; n++;
        const ans = quizAnsOf(x.p.id);
        if(ans[x.i] !== undefined && ans[x.i] !== x.q.a) delete ans[x.i];   // 只清错题记录，不误删正确答案
      }
    });
    d20Save(); quizSave();
    if(!n) alert("今天还没有答错的题。");
  }else if(act === "reset"){
    if(!confirm("清空今天的 20 题作答记录？（只影响这套每日卷，自测题库里的记录不受影响）")) return;
    cur.day.ans = {}; d20Save();
  }
  renderDaily20();
  refreshBadges();
});

document.getElementById("d20Plan").addEventListener("click", e=>{
  const s = e.target.closest("[data-d20go]");
  if(s){
    d20Focus = +s.dataset.d20go;
    renderDaily20();
    setTimeout(()=>{
      const el = document.getElementById("d20q-" + d20Focus);
      if(el && el.scrollIntoView) try{ el.scrollIntoView({ behavior: "smooth", block: "center" }); }catch(err){}
    }, 60);
    return;
  }
  const back = e.target.closest("[data-d20day]");
  if(back){
    d20ViewDate = (back.dataset.d20day === todayStr()) ? "" : back.dataset.d20day;
    d20Focus = null;
    renderDaily20(); window.scrollTo({ top: 0, behavior: "smooth" });
  }
});

document.getElementById("d20Hist").addEventListener("click", e=>{
  const h = e.target.closest("[data-d20day]"); if(!h) return;
  d20ViewDate = (h.dataset.d20day === todayStr()) ? "" : h.dataset.d20day;
  renderDaily20(); window.scrollTo({ top: 0, behavior: "smooth" });
});

/* ══════════ 复习计划 ══════════ */
document.getElementById("rvBody").addEventListener("click", e=>{
  const o = e.target.closest("[data-rvk]"); if(!o) return;
  const k = o.dataset.rvk, oi = +o.dataset.rvo;
  if(rvAnswered[k] !== undefined) return;
  const it = rvItem(k); if(!it) return;
  rvAnswered[k] = oi;
  rvGrade(it.p.id, it.i, oi === it.q.a);      // 更新复习计划（答错重置为隔天）
  const ans = quizAnsOf(it.p.id); ans[it.i] = oi; quizSave();   // 同步总记录
  markStudy(1);
  renderReview();
  refreshBadges();
});
document.getElementById("rvActions").addEventListener("click", e=>{
  const b = e.target.closest("[data-rv]"); if(!b) return;
  const act = b.dataset.rv;
  if(act === "print"){ window.print(); return; }
  if(act === "more"){ rvLimit = 999; renderReview(); return; }
  if(act === "start"){
    const el = document.getElementById("rvBody");
    if(el && el.scrollIntoView) try{ el.scrollIntoView({ behavior: "smooth", block: "start" }); }catch(err){}
  }
});

/* ══════════ 最近浏览 ══════════ */
document.addEventListener("click", e=>{
  const r = e.target.closest("[data-recent]"); if(!r) return;
  openItemByName(r.dataset.recent);
});

/* ══════════ 搜索历史 ══════════ */
document.getElementById("searchHist").addEventListener("click", e=>{
  const c = e.target.closest("[data-shclear]");
  if(c){ searchHist = []; lsSet(LS_SEARCH, searchHist); renderSearchHist(); return; }
  const b = e.target.closest("[data-sh]");
  if(!b) return;
  kw.value = b.dataset.sh;
  kw.dispatchEvent(new Event("input", { bubbles: true }));
  hideSearchHist();
});
kw.addEventListener("focus", ()=>renderSearchHist());
kw.addEventListener("blur", ()=>setTimeout(hideSearchHist, 200));
kw.addEventListener("keydown", e=>{
  if(e.key === "Enter"){ pushSearchHist(kw.value); hideSearchHist(); }
  else if(e.key === "Escape"){ hideSearchHist(); }
});
document.addEventListener("click", e=>{ if(!e.target.closest(".search")) hideSearchHist(); });

/* ══════════ 数据备份 / 恢复 / 清空 ══════════ */
document.getElementById("statsBody").addEventListener("click", e=>{
  const b = e.target.closest("[data-data]"); if(!b) return;
  if(b.dataset.data === "export"){
    if(exportData()) alert("已生成备份文件，请在浏览器的「下载」里找到这个 JSON 并妥善保存。");
    else alert("导出失败，请检查浏览器是否拦截了下载。");
  }else if(b.dataset.data === "import"){ importData(); }
  else if(b.dataset.data === "clear"){ clearAllData(); }
});

/* ══════════ 键盘快捷键 ══════════ */
(function(){
  const MODS = ["kb","map","quiz","wrong","stats","calc","path","select","formula","quick","check","tpl","case","gloss","gallery","field","fav","daily","review","compare","step"];
  document.addEventListener("keydown", e=>{
    const tag = (e.target.tagName || "").toLowerCase();
    const typing = tag === "input" || tag === "textarea" || tag === "select" || e.target.isContentEditable;

    // ? ：快捷键提示
    if(e.key === "?" && !typing){ document.getElementById("kbdHint").classList.toggle("on"); e.preventDefault(); return; }
    // Shift + D ：切换主题
    if(e.shiftKey && (e.key === "D" || e.key === "d") && !typing){ document.getElementById("themeBtn").click(); e.preventDefault(); return; }
    // Ctrl/⌘ + K 或 / ：聚焦搜索
    if(((e.ctrlKey || e.metaKey) && (e.key === "k" || e.key === "K")) || (e.key === "/" && !typing)){
      if(activeModule !== "kb"){ activeModule = "kb"; renderAll(); }
      setTimeout(()=>{ kw.focus(); kw.select(); }, 40);
      e.preventDefault(); return;
    }
    if(typing) return;
    // Esc 已由其他监听处理；左右键翻详情
    if(document.body.classList.contains("detail-open")){
      if(e.key === "ArrowLeft"){ const b = document.getElementById("dpPrev"); if(b && !b.disabled) b.click(); }
      else if(e.key === "ArrowRight"){ const b = document.getElementById("dpNext"); if(b && !b.disabled) b.click(); }
      return;
    }
    // 数字键切模块
    if(/^[1-9]$/.test(e.key)){ const m = MODS[+e.key - 1]; if(m){ activeModule = m; renderAll(); window.scrollTo({top:0}); } }
  });
})();

/* ══════════════ 深链接：URL 直达单条内容 ══════════════
   现在只能分享首页 —— 同事想看你说的「卡扣设计」，还是得自己再搜一次。
   支持：?mod=kb&item=卡扣设计（自动切到所属领域并打开详情）
        ?mod=kb&dom=material（某个领域）
        ?mod=quick&id=thread / ?mod=case&id=xx / ?mod=tpl&id=xx
        ?mod=field&id=std / ?mod=check&id=xx / ?mod=quiz&id=material
   注意：只读自己的参数，不碰 ?donate= 的行为。 */

function deepLinkOf(){
  const p = new URLSearchParams();
  p.set("mod", activeModule);
  if(activeModule === "kb"){
    const open = document.body.classList.contains("detail-open");
    const el = document.getElementById("dpName");
    const nm = open && el ? el.textContent.trim() : "";
    if(nm) p.set("item", nm);
    else if(!browseAll && activeDomain) p.set("dom", activeDomain);
  }
  if(activeModule === "quick" && activeQuick) p.set("id", activeQuick);
  if(activeModule === "case"  && activeCase)  p.set("id", activeCase);
  if(activeModule === "tpl"   && activeTpl)   p.set("id", activeTpl);
  if(activeModule === "check" && activeChk)   p.set("id", activeChk);
  if(activeModule === "field" && activeField) p.set("id", activeField);
  if(activeModule === "quiz"  && activeQuiz)  p.set("id", activeQuiz);
  return location.origin + location.pathname + "?" + p.toString();
}

function copyDeepLink(btn){
  const url = deepLinkOf();
  const done = () => {
    if(!btn.dataset.orig) btn.dataset.orig = btn.innerHTML;
    btn.innerHTML = "已复制链接";
    setTimeout(() => { if(btn.dataset.orig) btn.innerHTML = btn.dataset.orig; }, 1500);
  };
  const fallback = () => {
    const ta = document.createElement("textarea");
    ta.value = url; ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    try { document.execCommand("copy"); done(); }
    catch(e){ alert("复制失败，链接是：\n" + url); }
    ta.remove();
  };
  if(navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(done).catch(fallback);
  else fallback();
}

/* 打开带深链接的页面时直接定位过去 */
function applyDeepLink(){
  let sp;
  try { sp = new URLSearchParams(location.search); } catch(e){ return false; }
  const mod = sp.get("mod");
  if(!mod) return false;
  const id = sp.get("id"), item = sp.get("item"), dom = sp.get("dom");
  if(mod === "kb" && dom){ activeDomain = dom; browseAll = false; }
  if(mod === "quick" && id) activeQuick = id;
  if(mod === "case"  && id) activeCase  = id;
  if(mod === "tpl"   && id) activeTpl   = id;
  if(mod === "check" && id) activeChk   = id;
  if(mod === "field" && id) activeField = id;
  if(mod === "quiz"  && id) activeQuiz  = id;
  activeModule = mod;
  /* 打开单个知识点时，先把它的所属领域切过来，这样背景是正确的列表 */
  if(item){
    const it = KB_ITEMS.find(x => x.name === item);
    if(it){
      const d = CAT_DOMAIN[it.cat];
      if(d){ activeDomain = d.id; browseAll = false; activeSub = "all"; }
    }
  }
  renderAll();
  if(item) setTimeout(() => { try { openItemByName(item); } catch(e){ /* 名字对不上就不打开 */ } }, 90);
  window.scrollTo(0, 0);
  return true;
}

document.addEventListener("click", e => {
  const b = e.target.closest("[data-copy]"); if(!b) return;
  copyDeepLink(b);
});

/* 「标为疑问 / 搞懂了」：两个入口共用一套切换 */
function toggleDoubt(name){
  if(doubts[name]) delete doubts[name]; else doubts[name] = Date.now();
  lsSet(LS_DOUBT, doubts);
  refreshBadges();
  if(document.body.classList.contains("detail-open")) renderDpActions(KB_ITEMS.find(x=>x.name===name) || {name:name});
  if(activeModule === "fav") renderFav();
  if(activeModule === "kb") renderAll();
}
document.addEventListener("click", e=>{
  const b = e.target.closest("[data-doubt]"); if(!b) return;
  toggleDoubt(b.dataset.doubt);
});
document.getElementById("dpDoubt").addEventListener("click", ()=>{
  const el = document.getElementById("dpName");
  if(el && el.textContent.trim()) toggleDoubt(el.textContent.trim());
});

/* 「打印这张表」：走浏览器的打印（打印样式里已经把导航/工具栏隐藏掉） */
document.addEventListener("click", e=>{
  const b = e.target.closest("[data-print]"); if(!b) return;
  window.print();
});
renderAll();
applyDeepLink();
refreshBadges();
(function(){
  const box = document.getElementById("watermark");
  if(!box) return;
  function fill(){
    const cols = Math.ceil(window.innerWidth / 390) + 1;
    const rows = Math.ceil(window.innerHeight / 215) + 1;
    const need = cols * rows;
    while(box.children.length < need){
      const s = document.createElement("span");
      s.textContent = "光光light";
      box.appendChild(s);
    }
    while(box.children.length > need) box.lastChild.remove();
  }
  fill();
  let t = null;
  window.addEventListener("resize", ()=>{ clearTimeout(t); t = setTimeout(fill, 200); });
})();

/* ========== 访问统计角标（不蒜子）：加载成功才显示 ========== */
// 不蒜子加载成功后再显示统计角标（加载失败则自动隐藏，不影响使用）
(function(){
  var box = document.getElementById("site-stats");
  var tries = 0;
  var timer = setInterval(function(){
    tries++;
    var uv = document.getElementById("busuanzi_value_site_uv");
    var pv = document.getElementById("busuanzi_value_site_pv");
    if(uv && pv && uv.textContent && uv.textContent !== "–"){
      box.style.display = "block";
      clearInterval(timer);
    } else if(tries > 30){ // 约15秒仍失败则放弃
      clearInterval(timer);
    }
  }, 500);
})();

/* ========== 搜索无结果时的建议词：点一下直接搜 ========== */
document.addEventListener("click", e => {
  const c = e.target.closest("[data-sekw]"); if(!c) return;
  if(activeModule !== "kb"){ activeModule = "kb"; }
  kw.value = c.dataset.sekw;
  renderAll();
  try{ kw.focus(); }catch(err){}
});

/* ========== 每周学习目标：切换预设 ========== */
document.addEventListener("click", e => {
  const g = e.target.closest("[data-goal]"); if(!g) return;
  goalMin = +g.dataset.goal || 150;
  lsSet(LS_GOAL, goalMin);
  if(activeModule === "stats") renderStats();
});

/* ========== Service Worker：离线 / 弱网也能打开 ========== */
(function(){
  if(!("serviceWorker" in navigator)) return;
  // 本地用 file:// 直接打开时不注册（浏览器不允许）
  if(location.protocol !== "https:" && location.hostname !== "localhost") return;
  window.addEventListener("load", function(){
    navigator.serviceWorker.register("./sw.js").catch(function(){ /* 注册失败不影响使用 */ });
  });
})();

/* ══════════ 首屏之后：用空闲时间把按需数据后台取回来 ══════════
 * 首屏 load 后 0.6s 起，按「题库 → STEP」的顺序串行预取，每取完一组再等下一次空闲。
 * 这样用户点进学习模块时数据通常已就绪，几乎看不到加载提示 ——
 * 既拿到首屏速度，又不牺牲「点进去就能用」的体验。 */
(function preloadLazy(){
  function kick(){
    const ORDER = ["quiz", "step"];
    let i = 0;
    (function next(){
      if(i >= ORDER.length) return;
      const k = ORDER[i++];
      Promise.all(LAZY_MODS[k].map(loadScript)).then(function(){
        _dataDone[k] = true;
        if(k === "quiz") afterQuizData();
        (window.requestIdleCallback || function(f){ setTimeout(f, 500); })(next);
      });
    })();
  }
  if(document.readyState === "complete") setTimeout(kick, 600);
  else window.addEventListener("load", function(){ setTimeout(kick, 600); });
})();
