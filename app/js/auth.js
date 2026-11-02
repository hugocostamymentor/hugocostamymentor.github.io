/* Módulo de autenticação — preparado para Firebase Authentication (e-mail/senha).
   Enquanto o Firebase não estiver configurado (apiKey vazia) ou MM_DEV_BYPASS_LOGIN = true,
   o login é ignorado e o app abre direto (modo de desenvolvimento).
   ATENÇÃO: este login só controla a interface. Os arquivos hospedados no GitHub Pages
   continuam públicos para quem tiver o link. Proteção real exige Firebase Storage/Firestore com regras. */
(function () {
  var SDK = "https://www.gstatic.com/firebasejs/10.12.2/";
  var cfg = self.MM_FIREBASE_CONFIG || {};
  var configurado = !!(cfg.apiKey && cfg.projectId);
  var bypass = !configurado || self.MM_DEV_BYPASS_LOGIN === true;
  var pronto = null;

  function carregar(src) {
    return new Promise(function (ok, erro) {
      var s = document.createElement("script");
      s.src = src; s.onload = ok; s.onerror = function () { erro(new Error("Falha ao carregar " + src)); };
      document.head.appendChild(s);
    });
  }

  function iniciarFirebase() {
    if (pronto) return pronto;
    pronto = carregar(SDK + "firebase-app-compat.js")
      .then(function () { return carregar(SDK + "firebase-auth-compat.js"); })
      .then(function () {
        if (!firebase.apps.length) firebase.initializeApp(cfg);
        firebase.auth().languageCode = "pt";
        return firebase;
      });
    return pronto;
  }

  var MENSAGENS = {
    "auth/invalid-email": "E-mail inválido.",
    "auth/invalid-credential": "E-mail ou senha incorretos.",
    "auth/wrong-password": "E-mail ou senha incorretos.",
    "auth/user-not-found": "E-mail ou senha incorretos.",
    "auth/user-disabled": "Seu acesso está bloqueado. Fale conosco.",
    "auth/too-many-requests": "Muitas tentativas. Aguarde alguns minutos.",
    "auth/network-request-failed": "Sem conexão. Tente novamente."
  };
  function traduzir(e) { return MENSAGENS[e && e.code] || "Não foi possível entrar. Tente novamente."; }

  self.MMAuth = {
    modoDev: bypass,
    firebaseConfigurado: configurado,
    iniciarFirebase: iniciarFirebase,
    /* Chama cb(usuario|null) sempre que o estado de login mudar. */
    observar: function (cb) {
      if (bypass) { cb({ uid: "dev", email: "dev@local", dev: true }); return; }
      iniciarFirebase().then(function (fb) {
        fb.auth().onAuthStateChanged(function (u) {
          if (!u) return cb(null);
          /* Futuro: conferir em Firestore (clientes/{uid}.status == "aprovado") antes de liberar. */
          cb(u);
        });
      }).catch(function () { cb(null); });
    },
    entrar: function (email, senha) {
      if (bypass) return Promise.resolve({ uid: "dev" });
      return iniciarFirebase().then(function (fb) {
        return fb.auth().signInWithEmailAndPassword(email, senha);
      }).catch(function (e) { throw new Error(traduzir(e)); });
    },
    redefinirSenha: function (email) {
      if (bypass) return Promise.resolve();
      return iniciarFirebase().then(function (fb) {
        return fb.auth().sendPasswordResetEmail(email);
      }).catch(function (e) { throw new Error(traduzir(e)); });
    },
    sair: function () {
      if (bypass) return Promise.resolve();
      return iniciarFirebase().then(function (fb) { return fb.auth().signOut(); });
    }
  };
})();
