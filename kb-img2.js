// ============================================================
// kb-img2.js —— 参考图集索引（第二批：第 187~198 条，共 36 张）
// 结构：window.KB_IMG[条目名] = [{ f 路径, t 图注, s 来源域名 }]
// 在 kb-img.js 之后加载，只补充缺失的键，不覆盖已有条目
// ============================================================
(function () {
  const M = window.KB_IMG = window.KB_IMG || {};
  const ADD = {
    "驱动电源安装与固定": [{"f":"images/ref/187_1.jpg","t":"LED灯带电源 灯条驱动变压器适配器 220V转12V AC转DC开关大功率","s":"gd2.alicdn.com"}, {"f":"images/ref/187_2.jpg","t":"led驱动driver同步开关调色温镇流器36w单双三色分段变光控制电源","s":"t12.baidu.com"}, {"f":"images/ref/187_3.jpg","t":"桐汝壁led灯驱动器电源恒流三色无极调光智能分段吸顶灯镇整流器24w","s":"img14.360buyimg.com"}],
    "磁吸结构与磁铁固定": [{"f":"images/ref/188_1.jpg","t":"强磁铁打捞圆形高强力吸铁石吊环大小号钕铁硼磁铁强磁固定器吸盘","s":"t10.baidu.com"}, {"f":"images/ref/188_2.jpg","t":"磁吸何止手机:双光融合,守护电气安全","s":"static.asmag.com.cn"}, {"f":"images/ref/188_3.jpg","t":"简酷强力磁铁钕铁硼磁铁D30x10带孔M6强磁吸铁石磁钢圆形打捞磁石 - 360购物","s":"img2.tbcdn.cn"}],
    "接线端子与压线结构": [{"f":"images/ref/189_1.jpg","t":"mj1-5小母线架铜棒式母线端子接线架mj2-10柜顶组合导轨接线端子 mj2-","s":"t14.baidu.com"}, {"f":"images/ref/189_2.jpg","t":"mj1-5小母线架铜棒式母线端子接线架mj2-10柜顶组合导轨接线端子","s":"t15.baidu.com"}, {"f":"images/ref/189_3.jpg","t":"直插式接线端子dp2.5","s":"img0.baidu.com"}],
    "连接器与端子选型": [{"f":"images/ref/190_1.jpg","t":"2p带线dt062s德驰型连接器防水接插件公母对接汽车线束插头dt04","s":"img2.baidu.com"}, {"f":"images/ref/190_2.jpg","t":"2p带线 dt06 2s德驰型连接器防水接插件公母对接汽车线束插头dt04 -","s":"img1.baidu.com"}, {"f":"images/ref/190_3.jpg","t":"mini fakra线束.一拖四mini fakra连接器线","s":"img2.baidu.com"}],
    "轨道灯导电结构": [{"f":"images/ref/191_1.jpg","t":"雷士照明 三线轨道射灯配件 道轨导轨 黑白双色铝合金轨道轨道灯三线","s":"image.so.com"}, {"f":"images/ref/191_2.jpg","t":"无主灯选购:磁吸轨道灯的材质与安装详解","s":"image.so.com"}, {"f":"images/ref/191_3.jpg","t":"雷士照明 三线轨道射灯配件 道轨导轨 黑白双色铝合金轨道轨道灯三线","s":"img10.360buyimg.com"}],
    "触摸按键结构": [{"f":"images/ref/192_1.jpg","t":"轻触开关内部结构解析","s":"www.dg-switch.com"}, {"f":"images/ref/192_2.jpg","t":"一种用于触摸按键面板的触摸按键固定板安装结构","s":"static.tianyancha.com"}, {"f":"images/ref/192_3.jpg","t":"一种用于触摸按键面板的触摸按键固定板安装结构","s":"image.so.com"}],
    "O 圈与密封槽设计": [{"f":"images/ref/193_1.jpg","t":"O型圈密封结构设计,45页PPt图文讲解","s":"img.mp.sohu.com"}, {"f":"images/ref/193_2.jpg","t":"图文讲解--O型圈密封结构设计 |存干货_搜狐游戏_搜狐网","s":"img.mp.itc.cn"}, {"f":"images/ref/193_3.jpg","t":"机械设计】样子很简单,设计却不简单——O型密封圈及其槽的设计","s":"5b0988e595225.cdn.sohucs.com"}],
    "驱动灌胶与防水": [{"f":"images/ref/194_1.jpg","t":"线路板有机硅灌封电子胶 电源模块,电子模组防水绝缘灌封胶","s":"t10.baidu.com"}, {"f":"images/ref/194_2.jpg","t":"ab灌缝胶黑色聚氨酯密封防水双组份电路板电源电子灌封胶","s":"oss.huangye88.net"}, {"f":"images/ref/194_3.jpg","t":"电路板防水胶电子灌封胶ab胶透明胶水晶胶 - 厦门誉匠复合材料有限公","s":"l.b2b168.com"}],
    "保护接地与接地连续性": [{"f":"images/ref/195_1.jpg","t":"详解保护接地与接零:你该如何选择","s":"pic.rmb.bdstatic.com"}, {"f":"images/ref/195_2.jpg","t":"为什么必须分清“保护接地”与“保护接零”?","s":"5b0988e595225.cdn.sohucs.com"}, {"f":"images/ref/195_3.jpg","t":"m16桥隧型直型l型接线端子地线接地端子高铁桥墩不锈钢接地端子","s":"image.so.com"}],
    "认证送样与准备清单": [{"f":"images/ref/196_1.jpg","t":"3C认证怎么申请办理?CCC认证办理详细流程","s":"img04.sogoucdn.com"}, {"f":"images/ref/196_2.jpg","t":"ccc认证申请流程及作用 3c认证的全称为&quot;强制性产品认证制度&quot;,它是中","s":"pic.rmb.bdstatic.com"}, {"f":"images/ref/196_3.jpg","t":"河南周口配电箱3c认证改革ccc认证自我声明办理流程和收费","s":"oss.huangye88.net"}],
    "常见认证不合格项与整改": [{"f":"images/ref/197_1.jpg","t":"深圳市鼎点网络技术有限公司销售无3C认证的LED圆形超薄吸顶灯案","s":"image.so.com"}, {"f":"images/ref/197_2.jpg","t":"EMC整改之X电容和Y电容","s":"n.sinaimg.cn"}, {"f":"images/ref/197_3.jpg","t":"医疗 手术机器人EMC整改 安规测试 整改","s":"emc.wiki"}],
    "光衰与寿命设计": [{"f":"images/ref/198_1.jpg","t":"LED的寿命能不能预测?LED照明光衰问题探讨","s":"www.dianziaihaozhe.com"}, {"f":"images/ref/198_2.jpg","t":"led的光衰和寿命测算","s":"file4.renrendoc.com"}, {"f":"images/ref/198_3.jpg","t":"led灯珠光衰测试间接方法","s":"file1.renrendoc.com"}],
  };
  Object.keys(ADD).forEach(k => { if(!M[k] || !M[k].length) M[k] = ADD[k]; });
})();
