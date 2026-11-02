/* Notificações push — preparado para Firebase Cloud Messaging (FCM).
   Requer: firebase-config.js preenchido + MM_VAPID_KEY. Usa o service worker firebase-messaging-sw.js. */
(function () {
  var SDK = "https://www.gstatic.com/firebasejs/10.12.2/";
  function suportado() { return "Notification" in self && "serviceWorker" in navigator && "PushManager" in self; }

  self.MMNotificacoes = {
    suportado: suportado,
    estado: function () { return suportado() ? Notification.permission : "nao-suportado"; },
    ativar: function () {
      if (!suportado()) return Promise.reject(new Error("Este navegador não aceita notificações. No iPhone, instale o app na Tela de Início (iOS 16.4 ou superior)."));
      return Notification.requestPermission().then(function (p) {
        if (p !== "granted") throw new Error("Permissão negada. Você pode liberar nas configurações do navegador.");
        if (!MMAuth.firebaseConfigurado || !self.MM_VAPID_KEY) {
          return { token: null, aviso: "Permissão concedida. O envio de avisos será ligado quando o Firebase for configurado." };
        }
        return MMAuth.iniciarFirebase()
          .then(function () {
            return new Promise(function (ok, erro) {
              var s = document.createElement("script"); s.src = SDK + "firebase-messaging-compat.js";
              s.onload = ok; s.onerror = erro; document.head.appendChild(s);
            });
          })
          .then(function () { return navigator.serviceWorker.register("firebase-messaging-sw.js", { scope: "./fcm/" }); })
          .then(function (reg) {
            return firebase.messaging().getToken({ vapidKey: self.MM_VAPID_KEY, serviceWorkerRegistration: reg });
          })
          .then(function (token) {
            /* Futuro: salvar o token em Firestore (clientes/{uid}/tokens/{token}) para Hugo enviar avisos. */
            return { token: token, aviso: "Notificações ativadas." };
          });
      });
    }
  };
})();
