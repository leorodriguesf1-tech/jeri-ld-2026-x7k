// Offline cache for the Jeri app.
// Network first (with a short timeout) so updates arrive whenever there is signal;
// falls back to the cached copy when offline.
const CACHE = "jeri-app";
const ARQUIVOS = ["./", "./index.html", "./data.enc", "./manifest.json", "./icon-180.png", "./icon-512.png"];
const ESPERA_MS = 4000;

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ARQUIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(self.clients.claim());
});

function chaveDe(req) {
  const url = new URL(req.url);
  if (req.mode === "navigate" || url.pathname.endsWith("/")) return "./index.html";
  return req.url.split("?")[0];
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  const chave = chaveDe(req);
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const daRede = fetch(req).then((r) => {
      if (r && r.ok) cache.put(chave, r.clone());
      return r;
    });
    const tempo = new Promise((res) => setTimeout(res, ESPERA_MS, null));
    try {
      const r = await Promise.race([daRede, tempo]);
      if (r && r.ok) return r;
    } catch (err) { /* offline */ }
    const guardado = await cache.match(chave);
    if (guardado) return guardado;
    return daRede;
  })());
});
