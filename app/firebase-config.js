/* Configuração do Firebase — PREENCHER quando o projeto existir.
   Firebase Console → Configurações do projeto → Seus apps → App da Web → "Configuração do SDK". */
self.MM_FIREBASE_CONFIG = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: ""
};
/* Firebase Console → Cloud Messaging → Certificados push da Web → par de chaves (VAPID). */
self.MM_VAPID_KEY = "";

/* O login por Firebase foi substituído pelo código de acesso (js/auth.js + config.js).
   Este arquivo fica só para as notificações (inertes enquanto apiKey estiver vazia). */
self.MM_DEV_BYPASS_LOGIN = false; /* login agora é por código (config.js); mantido só para notificações */
