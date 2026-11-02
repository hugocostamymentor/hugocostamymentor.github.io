/* Service worker do Firebase Cloud Messaging (stub).
   Funciona assim que firebase-config.js tiver apiKey/projectId preenchidos. Registrado com escopo ./fcm/. */
importScripts("firebase-config.js");
var cfg = self.MM_FIREBASE_CONFIG || {};
if (cfg.apiKey && cfg.projectId) {
  importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js",
                "https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");
  firebase.initializeApp(cfg);
  firebase.messaging().onBackgroundMessage(function (msg) {
    var n = msg.notification || {}, d = msg.data || {};
    self.registration.showNotification(n.title || "My Mentor", {
      body: n.body || "Há conteúdo novo para você.",
      icon: "icons/icon-192.png", badge: "icons/favicon-64.png",
      data: { url: d.url || "../#/novidades" }
    });
  });
}
self.addEventListener("notificationclick", function (e) {
  e.notification.close();
  var alvo = new URL((e.notification.data && e.notification.data.url) || "../#/novidades", self.registration.scope).href;
  e.waitUntil(clients.openWindow(alvo));
});
