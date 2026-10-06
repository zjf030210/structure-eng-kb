/* ============================================================
 * kb-files.js —— 资料库数据（第 22 模块）
 * ------------------------------------------------------------
 * 静态站没有后端，资料由站长放进 files/ 目录或挂外链。
 * 以后加资料【只需要改这个文件】，不用动 index.html 与 app.js。
 *
 * 字段说明：
 *   id       唯一标识（英文小写，别重复）
 *   name     资料名（列表显示）
 *   cat      doc 文档 / zip 压缩包 / img 图片素材 / video 视频 / link 链接
 *   type     文件类型徽章显示的文字，如 "PDF" "ZIP" "JPG" "网盘"
 *   size     体积（人读的字符串）
 *   pages    页数（可选，PDF 用）
 *   desc     一句话说明（写清「里面有什么、什么时候用得上」）
 *   src      local 站内文件（放 files/ 目录） / external 外链
 *   url      local → "files/xxx.pdf"；external → 完整网址
 *   file     下载时的文件名（站内资料用，中文名也没问题）
 *   from     外链来源名（如「百度网盘」），仅 external 用
 *   code     提取码（可选），仅 external 用
 *   gate     none 直接下载 / wx 加微信领取（会引导打开咨询弹窗）
 *   updated  更新日期 YYYY-MM-DD
 *   tags     标签数组（会影响搜索命中）
 *   hot      true 会在列表前部并标「推荐」
 * ============================================================ */
window.KB_FILES = [

  /* ══════════ 合集（一次拿全）══════════ */
  {
    id: "quick-ref-all", cat: "doc", type: "PDF",
    name: "速查手册合集（17 张表）",
    size: "546 KB", pages: 15,
    desc: "站内 17 张速查表汇成一份：常用塑料特性、注塑结构设计、公差与配合、螺丝紧固、金属与钣金、表面处理、安规防护、光学参数、包装运输、成本量产。A4 排版，可直接打印带走。",
    src: "local", url: "files/quick-ref-all.pdf", file: "结构工程师速查手册-17张表合集.pdf",
    gate: "none", updated: "2026-10-06",
    tags: ["速查表", "合集", "打印版", "随身带"],
    hot: true,
  },
  {
    id: "checklists-all", cat: "doc", type: "PDF",
    name: "检查清单合集（5 份）",
    size: "345 KB", pages: 13,
    desc: "开模前结构评审、DFM 检讨、安规自检、试产与量产准备、包装与运输评审。每条前面带勾选框，评审会上一份一份过。",
    src: "local", url: "files/checklists-all.pdf", file: "结构工程师检查清单-5份合集.pdf",
    gate: "none", updated: "2026-10-06",
    tags: ["检查清单", "评审", "DFM", "安规", "合集"],
    hot: true,
  },
  {
    id: "templates-all", cat: "doc", type: "PDF",
    name: "实战模板合集（4 份）",
    size: "372 KB", pages: 9,
    desc: "NPI 新品开发流程、DFM 检讨报告、供应商报价对比表、手板/打样需求单。表单式排版，打印出来就能填。",
    src: "local", url: "files/templates-all.pdf", file: "结构工程师实战模板-4份合集.pdf",
    gate: "wx", updated: "2026-10-06",
    tags: ["模板", "NPI", "DFM", "报价", "打样"],
    hot: true,
  },

  /* ══════════ 单表（只要一张的时候）══════════ */
  {
    id: "quick-thread", cat: "doc", type: "PDF",
    name: "螺纹与底孔速查表",
    size: "108 KB", pages: 1,
    desc: "公制螺纹与自攻螺丝的底孔孔径、攻牙要点。打样现场、车间最常翻的一张。",
    src: "local", url: "files/quick-thread.pdf", file: "螺纹与底孔速查表.pdf",
    gate: "none", updated: "2026-10-06",
    tags: ["螺纹", "底孔", "自攻螺丝", "M3", "打样"],
  },
  {
    id: "quick-screw", cat: "doc", type: "PDF",
    name: "螺丝与紧固速查表",
    size: "108 KB", pages: 1,
    desc: "常用螺丝规格、推荐扭矩与塑件螺丝柱设计要点（柱径、壁厚、防滑牙）。",
    src: "local", url: "files/quick-screw.pdf", file: "螺丝与紧固速查表.pdf",
    gate: "none", updated: "2026-10-06",
    tags: ["螺丝", "扭矩", "螺丝柱", "紧固"],
  },
  {
    id: "quick-plastic", cat: "doc", type: "PDF",
    name: "常用塑料特性对比表",
    size: "123 KB", pages: 1,
    desc: "ABS / PC / PMMA / POM / PA / TPU / 硅胶等 13 种材料的密度、收缩率、耐温、透光率与典型用途对照。",
    src: "local", url: "files/quick-plastic.pdf", file: "常用塑料特性对比表.pdf",
    gate: "none", updated: "2026-10-06",
    tags: ["塑料", "材料", "收缩率", "耐温", "选型"],
    hot: true,
  },
  {
    id: "quick-tol", cat: "doc", type: "PDF",
    name: "公差与配合速查表",
    size: "109 KB", pages: 1,
    desc: "常用配合公差、标注要点与塑件公差取法。画图标注时对着看。",
    src: "local", url: "files/quick-tol.pdf", file: "公差与配合速查表.pdf",
    gate: "none", updated: "2026-10-06",
    tags: ["公差", "配合", "标注", "图纸"],
  },

];
