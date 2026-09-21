/* ============================================================
 * sw.js —— Service Worker：让知识库在离线/弱网下也能打开
 *
 * 策略（按资源类型分开处理，避免「页面是新的、脚本是旧的」错位）：
 *   · 页面导航 / 脚本 / 样式 / 数据  → network-first
 *       在线时永远取最新（走 HTTP 协商缓存，没变就是 304，很快）；
 *       断网时回退到上次缓存，照常能用
 *   · 图片（jpg/png/svg...）        → cache-first
 *       图片内容基本不变且数量多，命中缓存直接秒出
 *   · 跨域资源（B站 / 访问统计）     → 不接管
 * ============================================================ */
const CACHE = "struct-kb-v17";
const CORE = ["./", "./index.html", "./app.js", "./kb-plus3.js", "./kb-plus4.js", "./kb-workspace.js", "./kb-quiz-why.js", "./images/qr-site.svg", "./favicon.svg",
  "./images/qr-wechat.jpg", "./images/qr-alipay.jpg"];
/* wasm 与图片一样走缓存优先：解析引擎 7.6 MB，不该每次访问都重新验证。
   它刻意不放进 CORE —— 首屏不会下载，只有真正打开 STEP 模块时才拉取。 */
const IMG = /\.(jpe?g|png|gif|webp|svg|ico|bmp|avif|wasm)$/i;

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(CORE))
      .catch(() => {})                 // 单个资源失败不影响安装
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function put(req, res) {
  if (res && res.status === 200 && (res.type === "basic" || res.type === "default")) {
    const copy = res.clone();
    caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
  }
  return res;
}

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  let url;
  try { url = new URL(req.url); } catch (err) { return; }
  if (url.origin !== self.location.origin) return;   // 跨域不接管
  if (url.pathname.endsWith("/sw.js")) return;       // 别缓存 SW 自己

  // ① 图片：缓存优先
  if (IMG.test(url.pathname)) {
    e.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => put(req, res)).catch(() => hit))
    );
    return;
  }

  // ② 页面与脚本：网络优先，断网回退缓存
  e.respondWith(
    fetch(req).then(res => put(req, res)).catch(() =>
      caches.match(req).then(hit => {
        if (hit) return hit;
        if (req.mode === "navigate") return caches.match("./index.html");
        return Response.error();
      })
    )
  );
});
