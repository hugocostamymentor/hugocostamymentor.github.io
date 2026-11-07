/* My Mentor — app principal: roteamento por hash, renderização a partir de content.json. */
(function () {
  var conteudo = null;
  var SECOES = {
    testes:    { titulo: "Testes",    rotulo: "Autoconhecimento", vazio: "Novos testes serão publicados aqui." },
    guias:     { titulo: "Guias",     rotulo: "Leitura",          vazio: "Novos guias serão publicados aqui." },
    audios:    { titulo: "Áudios",    rotulo: "Escuta",           vazio: "Os áudios serão publicados aqui." },
    videos:    { titulo: "Vídeos",    rotulo: "Aulas e conversas", vazio: "Os vídeos serão publicados aqui." },
    novidades: { titulo: "Novidades", rotulo: "Avisos",           vazio: "Nenhuma novidade por enquanto." }
  };
  var NOTA_TESTES = "Ferramenta autoral, não instrumento psicométrico validado. Não substitui o acompanhamento.";
  var $ = function (id) { return document.getElementById(id); };

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function data(d) {
    if (!d) return "";
    var p = d.split("-"); var m = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
    return p.length === 3 ? Number(p[2]) + " " + m[Number(p[1]) - 1] + " " + p[0] : d;
  }
  function ordenar(l) { return (l || []).slice().sort(function (a, b) { return (b.data || "").localeCompare(a.data || ""); }); }
  function destino(i) { return i.arquivo || i.url || "#"; }
  /* Rótulo "Novo": some 15 dias após "publicado" (ou ao abrir o item neste aparelho, ids em localStorage "mm_vistos"). */
  var DIAS_NOVO = 15, HOJE_PADRAO = "2026-11-02";
  function nid(i) { return String(i.id || i.url || i.arquivo || i.titulo || ""); }
  function vistos() { try { return JSON.parse(localStorage.getItem("mm_vistos") || "[]"); } catch (e) { return []; } }
  function marcarVisto(id) {
    if (!id) return; var v = vistos(); if (v.indexOf(id) >= 0) return;
    v.push(id); try { localStorage.setItem("mm_vistos", JSON.stringify(v)); } catch (e) {}
    document.querySelectorAll('[data-nid="' + (window.CSS && CSS.escape ? CSS.escape(id) : id) + '"] .novo').forEach(function (n) { n.remove(); });
  }
  function ehNovo(i, agora) {
    if (!i.novo) return false;
    var p = /^\d{4}-\d{2}-\d{2}$/.test(i.publicado || "") ? i.publicado : HOJE_PADRAO;
    var fim = new Date(p + "T00:00:00").getTime() + DIAS_NOVO * 864e5;
    if ((agora || Date.now()) >= fim) return false;
    return vistos().indexOf(nid(i)) < 0;
  }
  var TIPOS = { teste: "Teste", pdf: "Guia em PDF", audio: "Áudio", video: "Vídeo", youtube: "Vídeo", aviso: "Novidade", link: "Link" };

  function meta(i) {
    return '<div class="meta"><span class="rotulo">' + esc(TIPOS[i.tipo] || i.tipo || "") + " · " + esc(data(i.data)) + (i.tempo ? " · " + esc(i.tempo) : "") + "</span>" +
      (ehNovo(i) ? '<span class="novo">Novo</span>' : "") + "</div>";
  }
  function card(i, secao) {
    var href = destino(i), extra = "";
    if (i.tipo === "teste") href = "#/abrir/" + encodeURIComponent(secao) + "/" + encodeURIComponent(i.id);
    else if (i.tipo === "pdf") extra = ' data-pdf="true" data-titulo="' + esc(i.titulo) + '"';
    else if (i.tipo === "link") extra = ' target="_blank" rel="noopener"';
    return '<a class="card" data-nid="' + esc(nid(i)) + '" href="' + esc(href) + '"' + extra + ">" + meta(i) + "<h3>" + esc(i.titulo) + "</h3><p>" + esc(i.descricao) + "</p></a>";
  }

  /* Native PDF navigation traps some standalone PWAs; keep the app alive. */
  var pdfOverlay = null, pdfFocus = null, pdfOverflow = "", pdfSession = null;
  function removerPDF() {
    if (!pdfOverlay) return;
    if (pdfSession) {
      pdfSession.closed = true;
      if (pdfSession.observer) pdfSession.observer.disconnect();
      if (pdfSession.task) pdfSession.task.destroy().catch(function () {});
      pdfSession = null;
    }
    pdfOverlay.remove(); pdfOverlay = null;
    $("tela-app").inert = false;
    document.body.style.overflow = pdfOverflow;
    if (pdfFocus && pdfFocus.isConnected) pdfFocus.focus();
  }
  function fecharPDF() {
    if (history.state && history.state.mmPDF) history.back();
    else removerPDF();
  }
  function abrirPDF(url, titulo, registrar) {
    removerPDF();
    pdfFocus = document.activeElement; pdfOverflow = document.body.style.overflow;
    pdfOverlay = document.createElement("section");
    pdfOverlay.className = "pdf-overlay";
    pdfOverlay.setAttribute("role", "dialog");
    pdfOverlay.setAttribute("aria-modal", "true");
    pdfOverlay.setAttribute("aria-label", titulo);
    pdfOverlay.innerHTML = '<header class="pdf-bar"><button type="button" class="pdf-close">× Fechar</button><span class="pdf-title">' + esc(titulo) + '</span></header>' +
      '<div class="pdf-status" role="status">Carregando PDF…</div><div class="pdf-body" tabindex="0" aria-label="Páginas do PDF"></div>';
    document.body.appendChild(pdfOverlay);
    $("tela-app").inert = true; document.body.style.overflow = "hidden";
    pdfOverlay.querySelector("button").onclick = fecharPDF;
    pdfOverlay.querySelector("button").focus();
    renderizarPDF(url, pdfOverlay);
    if (registrar) history.pushState({ mmPDF: true, url: url, titulo: titulo }, "", location.href);
  }
  /* Render locally: mobile native PDF iframes often show only the first page. */
  function renderizarPDF(url, overlay) {
    var session = { closed: false, task: null, observer: null };
    pdfSession = session;
    var body = overlay.querySelector(".pdf-body"), status = overlay.querySelector(".pdf-status");
    function erro(err) {
      if (session.closed) return;
      status.textContent = "Não foi possível exibir o PDF. ";
      var retry = document.createElement("button");
      retry.type = "button"; retry.textContent = "Tentar novamente";
      retry.onclick = function () {
        if (session.observer) session.observer.disconnect();
        session.closed = true;
        if (session.task) session.task.destroy().catch(function () {});
        body.textContent = ""; status.textContent = "Carregando PDF…";
        renderizarPDF(url, overlay);
      };
      status.appendChild(retry);
      console.error("PDF:", err);
    }
    import("../vendor/pdfjs/pdf.min.mjs").then(async function (pdfjs) {
      if (session.closed) return;
      var base = new URL("vendor/pdfjs/", document.baseURI).href;
      pdfjs.GlobalWorkerOptions.workerSrc = base + "pdf.worker.min.mjs";
      session.task = pdfjs.getDocument({ url: url, cMapUrl: base + "cmaps/", cMapPacked: true,
        standardFontDataUrl: base + "standard_fonts/", wasmUrl: base + "wasm/", isEvalSupported: false });
      var doc = await session.task.promise;
      if (session.closed) return;
      var first = await doc.getPage(1), initial = first.getViewport({ scale: 1 });
      status.textContent = doc.numPages + (doc.numPages === 1 ? " página" : " páginas");
      var queue = [], busy = false;
      async function processar() {
        if (busy || session.closed) return;
        busy = true;
        try {
          while (queue.length && !session.closed) {
            var slot = queue.shift();
            var page = await doc.getPage(Number(slot.dataset.page));
            if (session.closed) break;
            var viewport = page.getViewport({ scale: 1 });
            var width = slot.clientWidth;
            var fit = width / viewport.width;
            var dpr = Math.min(window.devicePixelRatio || 1, 2);
            var view = page.getViewport({ scale: fit * dpr });
            var canvas = document.createElement("canvas");
            canvas.width = Math.ceil(view.width); canvas.height = Math.ceil(view.height);
            canvas.setAttribute("role", "img"); canvas.setAttribute("aria-label", "Página " + slot.dataset.page);
            slot.style.aspectRatio = viewport.width + " / " + viewport.height;
            await page.render({ canvasContext: canvas.getContext("2d"), viewport: view }).promise;
            if (session.closed) { canvas.width = 0; break; }
            slot.textContent = ""; slot.appendChild(canvas); slot.dataset.rendered = "true";
            page.cleanup();
          }
        } catch (err) { erro(err); }
        busy = false;
      }
      session.observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting && !entry.target.dataset.queued) {
            entry.target.dataset.queued = "true"; queue.push(entry.target);
            session.observer.unobserve(entry.target);
          }
        });
        processar();
      }, { root: body, rootMargin: "700px 0px" });
      for (var n = 1; n <= doc.numPages; n++) {
        var slot = document.createElement("div");
        slot.className = "pdf-page"; slot.dataset.page = n;
        slot.style.aspectRatio = initial.width + " / " + initial.height;
        slot.textContent = "Página " + n; body.appendChild(slot); session.observer.observe(slot);
      }
    }).catch(erro);
  }

  window.addEventListener("popstate", function (e) {
    if (e.state && e.state.mmPDF) abrirPDF(e.state.url, e.state.titulo, false);
    else removerPDF();
  });
  window.addEventListener("hashchange", removerPDF);
  document.addEventListener("keydown", function (e) {
    if (pdfOverlay && e.key === "Escape") { e.preventDefault(); fecharPDF(); }
  });
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a[data-pdf]");
    if (!a || e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
    e.preventDefault(); abrirPDF(a.href, a.dataset.titulo || "Guia em PDF", true);
  });

  /* Componente de áudio com controles próprios */
  function audio(i) {
    return '<div class="player" data-nid="' + esc(nid(i)) + '" data-src="' + esc(destino(i)) + '">' + meta(i) + "<h3>" + esc(i.titulo) + "</h3><p class=\"sec\">" + esc(i.descricao) + "</p>" +
      '<div class="ctrl"><button class="play" aria-label="Reproduzir">▶</button><input type="range" min="0" max="100" value="0" step="0.1" aria-label="Posição"><span class="tempo">0:00 / 0:00</span></div></div>';
  }
  function youtubeId(u) { var m = /(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/.exec(u || ""); return m ? m[1] : null; }
  function video(i) {
    var u = destino(i), yt = youtubeId(u), midia;
    if (yt) {
      /* Capa clicável: o player do YouTube só carrega ao tocar (mais leve e funciona offline mostrando a capa) */
      var capa = i.capa || ("https://i.ytimg.com/vi/" + yt + "/hqdefault.jpg");
      midia = '<button class="yt-capa" data-yt="' + yt + '" aria-label="Assistir: ' + esc(i.titulo) + '"><img src="' + esc(capa) + '" alt="" loading="lazy"><span class="yt-play">▶</span></button>';
    } else midia = '<video controls playsinline preload="metadata" src="' + esc(u) + '"' + (i.capa ? ' poster="' + esc(i.capa) + '"' : "") + "></video>";
    return '<div class="player" data-nid="' + esc(nid(i)) + '">' + meta(i) + "<h3>" + esc(i.titulo) + '</h3><div class="video">' + midia + "</div>" +
      (i.descricao ? '<p class="sec">' + esc(i.descricao) + "</p>" : "") +
      (yt ? '<p style="margin:0"><a class="link" href="https://youtu.be/' + yt + '" target="_blank" rel="noopener">Abrir no YouTube</a></p>' : "") + "</div>";
  }
  function fmt(s) { s = Math.floor(s || 0); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); }
  function ligarPlayers(raiz) {
    raiz.querySelectorAll(".player[data-src]").forEach(function (p) {
      var a = new Audio(); a.preload = "metadata"; a.src = p.dataset.src;
      var b = p.querySelector(".play"), r = p.querySelector("input"), t = p.querySelector(".tempo");
      b.onclick = function () {
        if (a.paused) { a.play(); } else { a.pause(); }
      };
      a.onplay = function () { b.textContent = "❚❚"; b.setAttribute("aria-label", "Pausar"); };
      a.onpause = function () { b.textContent = "▶"; b.setAttribute("aria-label", "Reproduzir"); };
      a.ontimeupdate = a.onloadedmetadata = function () {
        if (a.duration) r.value = (a.currentTime / a.duration) * 100;
        t.textContent = fmt(a.currentTime) + " / " + fmt(a.duration);
      };
      r.oninput = function () { if (a.duration) a.currentTime = (r.value / 100) * a.duration; };
      p._audio = a;
    });
  }

  function ligarVistos() {
    if (ligarVistos.ok) return; ligarVistos.ok = true;
    var f = function (e) {
      var el = e.target && e.target.closest && e.target.closest("[data-nid]");
      if (!el) return;
      if (el.tagName === "A" || e.type === "play" || e.target.closest("button,a,video")) marcarVisto(el.dataset.nid);
    };
    document.addEventListener("click", f, true);
    document.addEventListener("play", f, true);
  }
  window.MMNovo = { ehNovo: ehNovo, marcarVisto: marcarVisto, nid: nid };
  function vazio(secao) {
    return '<div class="vazio"><p class="rotulo">' + esc(SECOES[secao].rotulo) + "</p><h2>Em breve</h2><p class=\"sec\">" + esc(SECOES[secao].vazio) + "</p></div>";
  }
  function lista(secao) {
    var itens = ordenar(conteudo.secoes[secao]);
    if (!itens.length) return vazio(secao);
    return itens.map(function (i) {
      if (secao === "audios" || i.tipo === "audio") return audio(i);
      if (secao === "videos" || i.tipo === "video" || i.tipo === "youtube") return video(i);
      return card(i, secao);
    }).join("");
  }

  function telaInicio() {
    var novas = ordenar(conteudo.secoes.novidades).slice(0, 3);
    var notif = MMNotificacoes.estado();
    return '<p class="rotulo">Sua força &amp; evolução</p><h1>Bem-vindo.</h1>' +
      '<p class="sec">Este é o seu espaço de acompanhamento: testes, guias, áudios e vídeos preparados por nós para o seu processo.</p>' +
      '<div class="filete"></div><p class="rotulo">Últimas novidades</p>' +
      (novas.length ? novas.map(function (i) { return card(i, "novidades"); }).join("") : '<p class="sec">Nenhuma novidade por enquanto.</p>') +
      '<p style="margin-top:8px"><a class="link" href="#/novidades">Ver todas</a></p>' +
      '<div class="filete"></div><p class="rotulo">Fale conosco</p>' +
      (conteudo.precos ? blocoContato(conteudo.precos.contato).replace('class="contato"', 'class="contato" style="margin-top:8px"') + '<p style="margin-top:4px"><a class="link" href="#/precos">Ver preços e planos</a></p>' : "") +
      '<div class="filete"></div><p class="rotulo">Avisos</p>' +
      '<p class="sec">Receba um aviso quando houver conteúdo novo.</p>' +
      '<button class="btn bloco" id="ativar-notif" type="button"' + (notif === "granted" ? " disabled" : "") + ">" +
      (notif === "granted" ? "Notificações ativadas" : "Ativar notificações") + '</button><p class="sec" id="notif-msg" style="font-size:.85rem"></p>';
  }
  var WA_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20l1.3-3.9A8 8 0 1 1 8 19z"/><path d="M9 8.5c0 3.5 3 6.5 6.5 6.5l1-1.6-2-1-1 .8a5 5 0 0 1-2.2-2.2l.8-1-1-2z"/></svg>';
  function blocoContato(c) {
    return '<div class="contato"><p class="rotulo">Para agendar ou tirar dúvidas</p>' +
      '<h3>' + esc(c.nome) + '</h3><p class="sec" style="margin:0;font-size:.88rem">' + esc(c.papel) + '</p>' +
      '<p class="num">' + esc(c.exibir) + '</p>' +
      '<a class="btn primario bloco wa" href="' + esc(c.whatsapp) + '" target="_blank" rel="noopener">' + WA_SVG + 'Falar com a Rafaella no WhatsApp</a>' +
      '<div class="acoes"><button class="btn" type="button" data-copiar="' + esc(c.exibir) + '">Copiar número</button>' +
      '<a class="btn" href="tel:' + esc(c.tel) + '">Ligar</a>' +
      '<a class="btn" href="' + esc(c.vcf) + '" download="Rafaella Coutinho - My Mentor.vcf">Salvar contato</a></div></div>';
  }
  function telaPrecos() {
    var p = conteudo.precos; if (!p) return vazio("precos");
    var I = p.integral, S = p.sessoes;
    return '<p class="rotulo">Investimento</p><h1>Preços</h1><p class="sec pr-intro">Conheça as formas de acompanhamento que oferecemos.</p>' +
      '<section class="integral" aria-label="' + esc(I.rotulo) + '"><p class="rotulo">' + esc(I.rotulo) + '</p><h2>' + esc(I.titulo) + '</h2>' +
      '<p class="lead">' + esc(I.texto) + '</p><ul>' + I.inclui.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + '</ul>' +
      I.planos.map(function (pl) {
        return '<div class="plano-i"><div class="topo-p"><div><p class="rotulo" style="margin:0">' + esc(pl.periodo) + '</p><h3>' + esc(pl.nome) + '</h3></div>' +
          '<div class="valor">' + esc(pl.valor) + '</div></div><ul>' + pl.itens.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + '</ul>' +
          (pl.nota ? '<p class="desc">' + esc(pl.nota) + '</p>' : "") + '</div>';
      }).join("") +
      '<p class="fecho">' + esc(I.fecho) + '</p>' +
      '<a class="btn primario bloco wa" href="' + esc(p.contato.whatsapp) + '" target="_blank" rel="noopener">' + WA_SVG + 'Conversar sobre o Acompanhamento Integral</a></section>' +
      '<p class="rotulo">Plano de investimento</p><h2>' + esc(S.titulo) + '</h2><p class="sec">' + esc(S.subtitulo) + '</p>' +
      S.planos.map(function (pl) {
        return '<div class="sessao"><div><h3>' + esc(pl.nome) + '</h3><p>' + (pl.periodo ? esc(pl.periodo) + " · " : "") + esc(pl.detalhe) + '</p>' +
          (pl.economia ? '<p class="eco">' + esc(pl.economia) + '</p>' : "") + '</div><div class="valor">' + esc(pl.valor) + '</div></div>';
      }).join("") +
      S.notas.map(function (n) { return '<p class="sec" style="font-size:.88rem;margin:.3em 0">' + esc(n) + '</p>'; }).join("") +
      '<div class="filete"></div><p class="rotulo">Formas de pagamento</p><p>' + esc(p.pagamento) + '</p>' + blocoContato(p.contato);
  }
  function toast(t) { var e = $("toast"); e.textContent = t; e.classList.remove("oculto"); clearTimeout(e._t); e._t = setTimeout(function () { e.classList.add("oculto"); }, 2200); }
  function copiar(txt) {
    var ok = function () { toast("Número copiado: " + txt); };
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(txt).then(ok).catch(function () { fallback(); });
    fallback();
    function fallback() { var t = document.createElement("textarea"); t.value = txt; document.body.appendChild(t); t.select(); try { document.execCommand("copy"); ok(); } catch (e) { toast(txt); } t.remove(); }
  }
  function telaSecao(secao) {
    var s = SECOES[secao];
    return '<p class="rotulo">' + esc(s.rotulo) + "</p><h1>" + esc(s.titulo) + "</h1>" + lista(secao) +
      (secao === "testes" ? '<p class="nota">' + NOTA_TESTES + "</p>" : "");
  }
  function telaAbrir(secao, id) {
    var i = (conteudo.secoes[secao] || []).filter(function (x) { return x.id === id; })[0];
    if (!i) return telaSecao(secao);
    marcarVisto(nid(i));
    return '<p><a class="link" href="#/' + esc(secao) + '">← Voltar</a></p>' +
      '<iframe src="' + esc(destino(i)) + '" title="' + esc(i.titulo) + '" style="width:100%;height:calc(100vh - 230px);border:1px solid rgba(168,134,85,.4);background:#fff"></iframe>' +
      (i.tipo === "teste" ? '<p class="nota">' + NOTA_TESTES + "</p>" : "");
  }

  function rotear() {
    if (!conteudo) return;
    var partes = (location.hash.replace(/^#\/?/, "") || "inicio").split("/").map(decodeURIComponent);
    var aba = partes[0], html;
    try { localStorage.setItem("mm_rota", JSON.stringify({ h: location.hash, t: Date.now() })); } catch (e) {}
    document.querySelectorAll("audio").forEach(function (a) { a.pause(); });
    document.querySelectorAll(".player[data-src]").forEach(function (p) { p._audio && p._audio.pause(); });
    if (aba === "abrir") { html = telaAbrir(partes[1], partes[2]); aba = partes[1]; }
    else if (aba === "precos") html = '<div class="pg-precos">' + telaPrecos() + '</div>';
    else if (SECOES[aba]) html = telaSecao(aba);
    else { aba = "inicio"; html = telaInicio(); }
    var main = $("conteudo"); main.innerHTML = html; window.scrollTo(0, 0);
    document.querySelectorAll(".tabs a").forEach(function (a) {
      var on = a.dataset.tab === aba; a.classList.toggle("ativo", on);
      if (on) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });
    $("wa-flutuante").classList.toggle("oculto", aba === "precos" || aba === "inicio");
    main.querySelectorAll("[data-copiar]").forEach(function (b) { b.onclick = function () { copiar(b.dataset.copiar); }; });
    ligarPlayers(main);
    main.querySelectorAll(".yt-capa").forEach(function (b) {
      b.onclick = function () {
        var f = document.createElement("iframe");
        f.src = "https://www.youtube-nocookie.com/embed/" + b.dataset.yt + "?autoplay=1&rel=0&playsinline=1";
        f.title = "Vídeo"; f.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen"; f.allowFullscreen = true;
        b.replaceWith(f);
      };
    });
    var bn = $("ativar-notif");
    if (bn) bn.onclick = function () {
      bn.disabled = true;
      MMNotificacoes.ativar().then(function (r) { $("notif-msg").textContent = r.aviso; bn.textContent = "Notificações ativadas"; })
        .catch(function (e) { bn.disabled = false; $("notif-msg").textContent = e.message; });
    };
  }

  function carregarConteudo() {
    return fetch("content.json", { cache: "no-cache" }).then(function (r) { return r.json(); })
      .then(function (c) { conteudo = c; ligarVistos(); rotear();
        if (history.state && history.state.mmPDF) abrirPDF(history.state.url, history.state.titulo, false); })
      .catch(function () { $("conteudo").innerHTML = '<h1>Sem conexão</h1><p class="sec">Não foi possível carregar o conteúdo. Tente de novo quando estiver online.</p>'; });
  }

  function mostrarLogin() { $("tela-app").classList.add("oculto"); $("tela-login").classList.remove("oculto"); }
  function mostrarApp() {
    $("tela-login").classList.add("oculto"); $("tela-app").classList.remove("oculto");
    $("sair").classList.toggle("oculto", MMAuth.modoDev);
    if (!conteudo) carregarConteudo(); else rotear();
  }

  /* Se o sistema fechou o app em segundo plano (ex.: ao minimizar), volta para a mesma tela (até 12 h). */
  try {
    var rota = JSON.parse(localStorage.getItem("mm_rota") || "null");
    if (!location.hash && rota && rota.h && rota.h.indexOf("#/abrir/") === 0 && Date.now() - rota.t < 12 * 3600e3)
      history.replaceState(null, "", location.pathname + location.search + rota.h);
  } catch (e) {}

  document.addEventListener("DOMContentLoaded", function () {
    var forcarLogin = /[?&]login\b/.test(location.search); /* ?login mostra a tela de login (útil para testes) */
    if (!MMAuth.servidorConfigurado) $("aviso-dev").classList.remove("oculto");
    if (MMAuth.motivo) $("login-erro").textContent = MMAuth.motivo;
    function linkPedido() {
      var nome = $("nome-pedido").value.trim();
      var msg = "Olá! Gostaria de pedir acesso ao app My Mentor." + (nome ? " Meu nome é " + nome + "." : "");
      $("pedir-acesso").href = "https://api.whatsapp.com/send?phone=" + (self.MM_WHATSAPP || "5531984239778") + "&text=" + encodeURIComponent(msg);
    }
    $("nome-pedido").oninput = linkPedido; linkPedido();
    $("form-login").onsubmit = function (e) {
      e.preventDefault(); $("login-erro").textContent = "";
      var codigo = $("codigo").value.trim();
      if (!codigo) { $("login-erro").textContent = "Digite o código que você recebeu."; return; }
      $("btn-codigo").disabled = true;
      MMAuth.entrar(codigo).catch(function (err) { $("login-erro").textContent = err.message; })
        .then(function () { $("btn-codigo").disabled = false; });
    };
    $("sair").onclick = function () { if (confirm("Sair deste aparelho? Para entrar de novo será preciso um novo código.")) MMAuth.sair(); };
    window.addEventListener("hashchange", rotear);
    if (forcarLogin) { mostrarLogin(); return; }
    MMAuth.observar(function (u) { if (u) mostrarApp(); else { if (MMAuth.motivo) $("login-erro").textContent = MMAuth.motivo; mostrarLogin(); } });
  });

  if ("serviceWorker" in navigator) {
    /* Atualização automática: ao abrir/voltar ao app procura sw.js novo; quando o novo assume, recarrega uma vez. */
    var tinhaControle = !!navigator.serviceWorker.controller, recarregou = false;
    navigator.serviceWorker.addEventListener("controllerchange", function () {
      if (!tinhaControle) { tinhaControle = true; return; } /* primeira instalação: não recarrega */
      if (recarregou) return;
      recarregou = true;
      window.location.reload();
    });
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("sw.js", { scope: "./", updateViaCache: "none" }).then(function (r) {
        self.MMSW = r;
        r.update().catch(function () {});
        document.addEventListener("visibilitychange", function () {
          if (document.visibilityState === "visible") r.update().catch(function () {});
        });
      }).catch(function (e) { console.error("Service worker não registrado:", e); });
    });
  }
})();
