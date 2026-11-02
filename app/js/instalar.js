/* Banner de instalação: Android/Chrome usa beforeinstallprompt; iPhone/iPad mostra instruções do Safari. */
(function () {
  var evento = null;
  var CHAVE = "mm-instalar-dispensado";
  var ua = navigator.userAgent || "";
  var ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  var safari = ios && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|GSA/.test(ua);
  var instalado = window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;

  function el(id) { return document.getElementById(id); }
  function dispensado() { try { return Number(localStorage.getItem(CHAVE) || 0) > Date.now(); } catch (e) { return false; } }
  function mostrar(texto, comBotao) {
    if (instalado || dispensado()) return;
    el("instalar-texto").innerHTML = texto;
    el("instalar-botao").classList.toggle("oculto", !comBotao);
    el("banner-instalar").classList.remove("oculto");
  }
  function esconder(dias) {
    el("banner-instalar").classList.add("oculto");
    if (dias) try { localStorage.setItem(CHAVE, String(Date.now() + dias * 864e5)); } catch (e) {}
  }

  window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault(); evento = e;
    mostrar("Acesse seus testes, guias e áudios direto da tela inicial, como um aplicativo.", true);
  });
  window.addEventListener("appinstalled", function () { instalado = true; esconder(); });

  document.addEventListener("DOMContentLoaded", function () {
    el("instalar-botao").onclick = function () {
      if (!evento) return;
      evento.prompt();
      evento.userChoice.finally(function () { evento = null; esconder(); });
    };
    el("instalar-depois").onclick = function () { esconder(7); };
    el("instalar-fechar").onclick = function () { esconder(7); };
    if (ios && !instalado) {
      setTimeout(function () {
        mostrar(safari
          ? "No Safari, toque em <strong>Compartilhar</strong> (quadrado com seta) e depois em <strong>Adicionar à Tela de Início</strong>."
          : "Abra este endereço no <strong>Safari</strong>, toque em <strong>Compartilhar</strong> e depois em <strong>Adicionar à Tela de Início</strong>.", false);
      }, 1200);
    }
  });
  self.MMInstalar = { mostrar: mostrar, esconder: esconder, ios: ios };
})();
