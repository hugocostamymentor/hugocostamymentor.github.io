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

/* DEV: enquanto true (ou enquanto apiKey estiver vazia), o login é ignorado.
   Mude para false depois de configurar o Firebase. */
self.MM_DEV_BYPASS_LOGIN = true;
