/* Service worker do My Mentor — cache offline.
   Ao publicar mudanças no app (HTML/CSS/JS), aumente VERSAO para forçar atualização. */
var VERSAO = "mymentor-v10";
var NUCLEO = [
  "./", "index.html", "manifest.json", "content.json", "firebase-config.js", "config.js",
  "css/app.css", "js/app.js", "js/auth.js", "js/notificacoes.js", "js/instalar.js",
  "assets/img/logo_principal_fundo-escuro.png", "assets/img/logo_sem-tagline_fundo-escuro.png",
  "assets/fonts/Fraunces.ttf", "assets/fonts/Manrope.ttf", "assets/fonts/IBMPlexMono-Medium.ttf",
  "icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png", "icons/favicon-64.png",
  "contato/rafaella-coutinho.vcf",
  "testes/romantismo.html",
  "testes/parametros.html",
  "testes/ansiedade.html",
  "testes/apego.html",
  "testes/autoestima.html",
  "testes/autossabotagem.html",
  "testes/burnout.html",
  "testes/ciume.html",
  "testes/comunicacao-conflito.html",
  "testes/crencas-limitantes.html",
  "testes/esquemas.html",
  "testes/linguagens-cuidado.html",
  "testes/missao-proposito.html",
  "testes/regulacao-emocional.html",
  "assets/thumbs/qEl2NoMdEFU.jpg", "assets/thumbs/V0T4WCDQNic.jpg", "assets/thumbs/As622_zJZ94.jpg"
];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(VERSAO).then(function (c) { return c.addAll(NUCLEO); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== VERSAO; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
function guardar(req, r) {
  if (r && r.ok && r.type === "basic") { var copia = r.clone(); caches.open(VERSAO).then(function (c) { c.put(req, copia); }); }
  return r;
}
self.addEventListener("fetch", function (e) {
  var req = e.request, url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin) return; /* Firebase, YouTube etc. vão direto à rede */
  if (/(^|\/)admin\.html$/.test(url.pathname)) return; /* painel admin: nunca em cache */
  if (req.headers.has("range")) return; /* áudio/vídeo com Range: rede */
  var p = url.pathname;
  var estatico = /\.(png|jpe?g|gif|webp|svg|ico|ttf|otf|woff2?|pdf)$/i.test(p);
  if (!estatico) {
    /* Rede primeiro (HTML, CSS, JS, content.json...): sempre a versão nova quando online; cache offline.
       ignoreSearch permite achar "css/app.css" no cache mesmo pedindo "css/app.css?v=6". */
    e.respondWith(fetch(req, { cache: "no-cache" }).then(function (r) { return guardar(req, r); }).catch(function () {
      return caches.match(req, { ignoreSearch: true }).then(function (r) {
        return r || (req.mode === "navigate" ? caches.match("index.html") : Response.error());
      });
    }));
    return;
  }
  /* Ícones, fontes, imagens, PDFs: cache primeiro */
  e.respondWith(caches.match(req).then(function (hit) {
    return hit || fetch(req).then(function (r) { return guardar(req, r); });
  }));
});
