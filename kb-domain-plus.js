// ============================================================
// kb-domain-plus.js —— 领域导读「核心概念地图」补充层
// 把新增的第 167~186 条知识点补进对应领域的概念地图
// 结构：window.KB_DOMAIN_GUIDE[领域id].map 追加 {g 分组名, items:[条目名]}
// ============================================================
(function () {
  const G = window.KB_DOMAIN_GUIDE;
  if (!G) return;
  const add = (id, groups) => {
    const d = G[id];
    if (!d) return;
    d.map = (d.map || []).concat(groups);
  };

  add("material", [
    { g: "合金与功能料", items: ["PC/ABS 合金", "导热塑料"] },
    { g: "选材落地：牌号与介质", items: ["常用塑料牌号对照", "塑料耐化学性速查"] }
  ]);

  add("manufacturing", [
    { g: "连接与包覆工艺", items: ["嵌件注塑（Insert Molding）", "硅胶包塑（双色硅胶）"] },
    { g: "先进焊接", items: ["塑料激光焊接"] }
  ]);

  add("mold", [
    { g: "产能与寿命", items: ["多腔模具与流道平衡", "模具钢热处理与表面强化"] }
  ]);

  add("design", [
    { g: "灯具结构件专题", items: ["灯罩固定方式", "透镜固定与卡位", "导线固定与线槽设计", "防水透气膜（ePTFE）"] },
    { g: "紧固与线束细节", items: ["螺钉柱防滑牙设计", "线束固定与热缩管"] }
  ]);

  add("optic", [
    { g: "验证与实测", items: ["灯具配光测试"] }
  ]);

  add("thermal", [
    { g: "材料层面的散热选项", items: ["导热塑料"] }
  ]);

  add("safety", [
    { g: "塑料件的安规考核", items: ["灼热丝与球压测试"] }
  ]);

  add("test", [
    { g: "环境应力类测试", items: ["恒温恒湿与冷热冲击"] }
  ]);

  add("cost", [
    { g: "供应链与量产把关", items: ["供应商评估与选点", "样品承认流程"] }
  ]);
})();
