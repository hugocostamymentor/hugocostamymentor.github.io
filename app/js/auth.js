/* Acesso por código de uso único (Cloudflare Worker — ver /worker).
   O cliente digita o código recebido pelo WhatsApp; o Worker vincula o código a este aparelho
   e devolve um token assinado (HMAC), guardado no localStorage. A cada abertura o token é
   conferido em /check (Hugo pode bloquear). Sem internet, vale o último status válido por até 7 dias.
   Firebase continua carregável apenas para as notificações (iniciarFirebase). */
(function () {
  var SDK = "https://www.gstatic.com/firebasejs/10.12.2/";
  var cfg = self.MM_FIREBASE_CONFIG || {};
  var URL_W = String(self.MM_WORKER_URL || "").replace(/\/+$/, "");
  var configurado = /^https?:\/\//.test(URL_W) && URL_W.indexOf("COLE-AQUI") < 0;
  var K_TOKEN = "mm_token", K_DEV = "mm_device_id", K_OK = "mm_ultimo_ok", K_NOME = "mm_nome";
  var GRACA_MS = 7 * 24 * 3600 * 1000;
  var fb = null, ouvinte = null;

  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { return null; } }
  function deviceId() {
    var d = ls(K_DEV);
    if (!d) {
      var b = crypto.getRandomValues(new Uint8Array(16));
      d = Array.prototype.map.call(b, function (x) { return ("0" + x.toString(16)).slice(-2); }).join("");
      ls(K_DEV, d);
    }
    return d;
  }
  function post(rota, corpo) {
    return fetch(URL_W + rota, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corpo), cache: "no-store" })
      .then(function (r) { return r.json().catch(function () { return { ok: false, erro: "Resposta inválida do servidor." }; }); });
  }
  function carregar(src) {
    return new Promise(function (ok, erro) {
      var s = document.createElement("script");
      s.src = src; s.onload = ok; s.onerror = function () { erro(new Error("Falha ao carregar " + src)); };
      document.head.appendChild(s);
    });
  }
  function iniciarFirebase() {
    if (fb) return fb;
    fb = carregar(SDK + "firebase-app-compat.js").then(function () {
      if (!firebase.apps.length) firebase.initializeApp(cfg);
      return firebase;
    });
    return fb;
  }
  function avisar(u) { if (ouvinte) ouvinte(u); }
  function usuario() { return { uid: deviceId(), nome: ls(K_NOME) || "" }; }

  self.MMAuth = {
    modoDev: false,
    servidorConfigurado: configurado,
    firebaseConfigurado: !!(cfg.apiKey && cfg.projectId),
    iniciarFirebase: iniciarFirebase,
    motivo: "",
    /* cb(usuario|null) */
    observar: function (cb) {
      ouvinte = cb;
      var token = ls(K_TOKEN);
      if (!token) return cb(null);
      var ultimo = parseInt(ls(K_OK) || "0", 10);
      var emGraca = Date.now() - ultimo < GRACA_MS;
      if (!configurado) return cb(emGraca ? usuario() : null);
      /* Abre já se o último status válido for recente; confere em segundo plano. */
      if (emGraca) cb(usuario());
      post("/check", { token: token }).then(function (r) {
        if (r && r.valido) { ls(K_OK, String(Date.now())); if (r.nome) ls(K_NOME, r.nome); if (!emGraca) cb(usuario()); }
        else if (r && r.valido === false) { ls(K_TOKEN, null); ls(K_OK, null); MMAuth.motivo = r.motivo || ""; cb(null); }
        else if (!emGraca) cb(null);
      }).catch(function () { if (!emGraca) { MMAuth.motivo = "Sem conexão para confirmar seu acesso."; cb(null); } });
    },
    entrar: function (codigo) {
      if (!configurado) return Promise.reject(new Error("Servidor de acesso ainda não configurado."));
      return post("/redeem", { code: codigo, deviceId: deviceId() }).catch(function () {
        throw new Error("Sem conexão. Tente novamente.");
      }).then(function (r) {
        if (!r.ok || !r.token) throw new Error(r.erro || "Não foi possível validar o código.");
        ls(K_TOKEN, r.token); ls(K_OK, String(Date.now())); ls(K_NOME, r.nome || "");
        avisar(usuario());
        return usuario();
      });
    },
    sair: function () {
      ls(K_TOKEN, null); ls(K_OK, null);
      avisar(null);
      return Promise.resolve();
    }
  };
})();
