/* =========================================================
   EITO · LÓGICA DE LA PÁGINA
   Los datos se cambian en js/config.js. Cada bloque está aislado:
   si uno falla (estadísticas, música, fondos), el resto sigue funcionando.
   ========================================================= */
(() => {
  'use strict';

  const CFG = window.EITO_CONFIG || {};
  const LINKS = CFG.links || {};
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (v = '') => String(v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]));

  const UA = navigator.userAgent || '';
  const IS_ANDROID = /Android/i.test(UA);
  const IS_IOS = /iPhone|iPad|iPod/i.test(UA) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const IS_MOBILE = IS_ANDROID || IS_IOS;
  const IN_APP_BROWSER = /TikTok|BytedanceWebview|musical_ly|Instagram|FBAN|FBAV|FB_IAB/i.test(UA);
  const mq = q => (window.matchMedia ? window.matchMedia(q) : { matches: false, addEventListener() {} });
  const REDUCED = mq('(prefers-reduced-motion: reduce)');
  const SMALL = mq('(max-width: 700px)');

  /** Ejecuta un bloque sin que un error detenga la página. */
  const safe = (name, fn) => { try { fn(); } catch (e) { console.warn(`[EITO] ${name}:`, e); } };

  const ICON = {
    app: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18.5h2"/></svg>',
    web: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z"/></svg>',
    copy: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/></svg>',
    check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
    steam: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="12" rx="2"/><path d="M8 21h8M12 17v4"/></svg>',
    down: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11M7 10.5l5 5 5-5M5 20h14"/></svg>'
  };

  /* =========================================================
     AVISOS Y COPIAR
     ========================================================= */
  let toastTimer;
  function toast(message, kind = 'success', ms = 3000) {
    const el = $('#siteToast');
    if (!el) return;
    el.textContent = message;
    el.className = `site-toast show ${kind}`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), ms);
  }

  async function copyText(text) {
    try {
      if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(text); return true; }
    } catch (_) { /* se prueba el método alternativo */ }
    try {
      const f = document.createElement('textarea');
      f.value = text; f.setAttribute('readonly', '');
      f.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none';
      document.body.appendChild(f); f.select(); f.setSelectionRange(0, text.length);
      const ok = document.execCommand('copy'); f.remove(); return ok;
    } catch (_) { return false; }
  }

  /** Si el navegador no deja copiar, muestra el texto seleccionado para copiarlo a mano. */
  function showManualCopy(container, text) {
    let box = $('.manual-copy', container);
    if (!box) {
      box = document.createElement('label');
      box.className = 'manual-copy';
      box.innerHTML = 'No se pudo copiar automáticamente. Mantén pulsado el texto para copiarlo:<input type="text" readonly>';
      container.appendChild(box);
    }
    const input = $('input', box);
    input.value = text;
    setTimeout(() => { input.focus(); input.select(); }, 50);
    toast('Copia el texto que aparece en pantalla', 'info');
  }

  /* =========================================================
     ABRIR ENLACES (app primero en móvil)
     ========================================================= */
  function openInApp(url) {
    if (!url) return;
    if (IS_ANDROID && !IN_APP_BROWSER) {
      try {
        const u = new URL(url);
        window.location.href = `intent://${u.host}${u.pathname}${u.search}#Intent;scheme=https;S.browser_fallback_url=${encodeURIComponent(url)};end`;
        return;
      } catch (_) { /* sigue abajo */ }
    }
    if (IS_MOBILE) { window.location.href = url; return; } // iOS: enlaces universales abren la app si está instalada
    window.open(url, '_blank', 'noopener');
  }

  /* =========================================================
     QR (generado en el navegador desde la URL de cada tarjeta)
     ========================================================= */
  function qrMarkup(url, label) {
    try {
      if (window.EitoQR && url) return window.EitoQR.svg(url, esc(label));
    } catch (e) { console.warn('[EITO] QR:', e); }
    return '<span class="qr-fail">QR no disponible</span>';
  }

  /* =========================================================
     BOTONES DE ACCIÓN (compartidos por Discord y las redes)
     ========================================================= */
  function actionsMarkup({ url, app, steamClient, copy = [], appLabel }) {
    const out = [];
    if (url && (app || appLabel) && (IS_MOBILE || appLabel)) {
      out.push(`<button class="act pressable" type="button" data-act="app" data-url="${esc(url)}">${ICON.app}<span>${esc(appLabel || 'Abrir en la aplicación')}</span></button>`);
    }
    if (url && steamClient && !IS_MOBILE) {
      out.push(`<button class="act pressable" type="button" data-act="steam" data-url="${esc(url)}">${ICON.steam}<span>Abrir en la app de Steam</span></button>`);
    }
    if (url) {
      out.push(`<a class="act pressable" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${ICON.web}<span>${appLabel ? 'Abrir en el navegador' : 'Abrir en la web'}</span></a>`);
    }
    copy.forEach(c => {
      const value = c.value === 'link' ? url : c.value;
      if (value) out.push(`<button class="act pressable" type="button" data-act="copy" data-value="${esc(value)}" data-msg="${esc(c.msg || 'Copiado')}">${ICON.copy}<span>${esc(c.label)}</span></button>`);
    });
    return out.join('');
  }

  function bindActions() {
    document.addEventListener('click', async e => {
      const btn = e.target.closest('[data-act]');
      if (!btn) return;
      const act = btn.dataset.act;
      if (act === 'app') {
        e.preventDefault();
        if (!IS_MOBILE) toast('Si tienes la app instalada, la página te ofrecerá abrirla', 'info');
        else if (IN_APP_BROWSER) toast('Si no se abre la app, usa “Abrir en la web”', 'info');
        openInApp(btn.dataset.url);
      } else if (act === 'steam') {
        e.preventDefault();
        window.location.href = 'steam://openurl/' + btn.dataset.url;
        toast('Si no se abre Steam, usa “Abrir en la web”', 'info');
      } else if (act === 'copy') {
        e.preventDefault();
        const value = btn.dataset.value;
        if (await copyText(value)) {
          const old = btn.innerHTML;
          btn.innerHTML = `${ICON.check}<span>¡Copiado!</span>`;
          btn.classList.add('copied');
          toast(`✓ ${btn.dataset.msg}`);
          clearTimeout(btn._t);
          btn._t = setTimeout(() => { btn.innerHTML = old; btn.classList.remove('copied'); }, 1700);
        } else {
          showManualCopy(btn.closest('.expand-inner') || btn.parentElement, value);
        }
      }
    });
  }

  /* =========================================================
     TARJETAS EXPANDIBLES (solo una abierta a la vez)
     ========================================================= */
  const expanders = [];
  function makeExpander(root, trigger, panel, build) {
    let built = false;
    const inner = $('.expand-inner', panel);
    panel.inert = true;
    const api = {
      root,
      isOpen: () => root.classList.contains('open'),
      set(open) {
        if (open && !built) { inner.innerHTML = build(); built = true; }
        root.classList.toggle('open', open);
        trigger.setAttribute('aria-expanded', String(open));
        panel.inert = !open;
      }
    };
    trigger.addEventListener('click', () => {
      const open = !api.isOpen();
      if (open) expanders.forEach(x => x !== api && x.isOpen() && x.set(false));
      api.set(open);
      if (open && SMALL.matches) {
        setTimeout(() => {
          const r = root.getBoundingClientRect();
          if (r.bottom > window.innerHeight) root.scrollIntoView({ block: 'nearest', behavior: REDUCED.matches ? 'auto' : 'smooth' });
        }, 320);
      }
    });
    expanders.push(api);
    return api;
  }
  // Cerrar con Escape o tocando fuera de la tarjeta abierta.
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    const open = expanders.find(x => x.isOpen());
    if (open) { open.set(false); const t = $('[aria-expanded]', open.root); if (t) t.focus({ preventScroll: true }); }
  });
  document.addEventListener('click', e => {
    if (e.target.closest('.site-toast')) return;
    expanders.forEach(x => { if (x.isOpen() && !x.root.contains(e.target)) x.set(false); });
  });

  /* =========================================================
     PERFIL
     ========================================================= */
  function renderProfile() {
    const p = CFG.profile || {};
    if (p.name) { $('#profileName').textContent = p.name; $('#profileName').setAttribute('aria-label', p.name.replace(/\s+/g, '')); }
    if (p.subtitle) $('#profileSubtitle').textContent = p.subtitle;
    if (p.tagline && $('#profileTagline')) $('#profileTagline').textContent = p.tagline;
    const img = $('#avatarImg');
    const wrap = $('#avatarWrap');
    const logo = p.logo || 'assets/perfil/eito-logo.webp';
    if (p.photo) {
      img.onerror = () => { img.onerror = null; img.src = logo; img.alt = 'Logo de EITO'; wrap.classList.remove('has-photo'); };
      img.src = p.photo; img.alt = 'Foto de perfil de EITO';
      wrap.classList.add('has-photo');
    } else if (img.getAttribute('src') !== logo) img.src = logo;
  }

  /* =========================================================
     FONDOS: carrusel con fundido cruzado (cada ~2 s)
     - La imagen nueva aparece ENCIMA de la anterior, que sigue visible
       debajo hasta terminar el fundido: nunca hay pantalla negra.
     - Solo se precarga la siguiente imagen; nunca se descargan todas.
     - Solo existen 2 capas en pantalla, así la memoria se mantiene baja.
     ========================================================= */
  function startBackgrounds() {
    const list = (CFG.backgrounds || []).filter(b => b && b.desktop);
    const layers = [$('#bgA'), $('#bgB')];
    if (!list.length || !layers[0]) return;
    const seconds = Math.min(15, Math.max(1.5, Number(CFG.backgroundSeconds) || 2)) * (REDUCED.matches ? 2.5 : 1);
    const fade = Math.min(seconds * 0.85, Math.max(0.4, Number(CFG.backgroundFade) || 1.2));
    document.documentElement.style.setProperty('--bg-fade', `${fade}s`);
    document.documentElement.style.setProperty('--bg-life', `${seconds + fade}s`);
    const bad = new Set();
    let idx = -1, front = 1, timer = null, nextReady = null;
    const srcOf = item => (SMALL.matches && item.mobile ? item.mobile : item.desktop);

    // Descarga y decodifica una imagen ANTES de mostrarla (evita tirones).
    function load(i) {
      const item = list[i];
      const img = new Image();
      img.decoding = 'async';
      img.src = srcOf(item);
      const ready = img.decode ? img.decode() : new Promise((res, rej) => { img.onload = res; img.onerror = rej; });
      return ready.then(() => ({ i, item, src: img.src }), () => { bad.add(i); throw new Error('img'); });
    }
    function nextIndex(from) {
      for (let k = 1; k <= list.length; k++) { const j = (from + k) % list.length; if (!bad.has(j)) return j; }
      return -1;
    }
    function swap({ i, item, src }) {
      const top = layers[1 - front], under = layers[front];
      top.classList.remove('on', 'under');
      top.style.backgroundImage = `url("${src.replace(/"/g, '%22')}")`;
      top.style.setProperty('--dim', String(Math.min(0.4, Math.max(0, Number(item.dim) || 0))));
      void top.offsetWidth;                       // reinicia la transición
      under.classList.remove('on'); under.classList.add('under');
      top.classList.add('on');
      front = 1 - front; idx = i;
      const cap = $('#bgCaption');
      if (cap) cap.textContent = item.game ? `Fondo actual: ${item.game}` : '';
      // Prepara la siguiente mientras esta se ve.
      const n = nextIndex(idx);
      nextReady = n >= 0 && n !== idx ? load(n).catch(() => null) : null;
      schedule();
    }
    function schedule() {
      clearTimeout(timer);
      if (document.hidden || !nextReady) return;
      const due = Date.now() + seconds * 1000;
      timer = setTimeout(() => {
        const p = nextReady; nextReady = null;
        p.then(r => {
          if (r) swap(r);
          else { const n = nextIndex(idx); if (n >= 0) { nextReady = load(n).catch(() => null); schedule(); } }
        });
      }, Math.max(0, due - Date.now()));
    }
    document.addEventListener('visibilitychange', () => { if (document.hidden) clearTimeout(timer); else if (!nextReady) { const n = nextIndex(idx); if (n >= 0) nextReady = load(n).catch(() => null); schedule(); } else schedule(); });
    // Primera imagen
    (function first(k) {
      if (k >= list.length) return;
      load(k).then(swap, () => first(k + 1));
    })(0);
  }

  /* =========================================================
     NAVEGACIÓN con resaltado del destino
     ========================================================= */
  // Qué se resalta al llegar a cada sección desde la barra.
  const NAV_EFFECTS = {
    inicio: () => pulseBlock('#inicio', 'glow-hero'),
    recursos: () => { pulseBlock('#recursos', 'glow-block'); flash('.res-tile'); },
    juegos: () => flash('.game-tile'),
    comunidad: () => {
      pulseBlock('#comunidad', 'glow-block');
      $$('.hub-stat').forEach(el => pulseBlock(el, 'bump'));
      pulseBlock('#joinBtn', 'attention');
    }
  };
  function pulseBlock(target, cls) {
    const el = typeof target === 'string' ? $(target) : target;
    if (!el) return;
    el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls);
    setTimeout(() => el.classList.remove(cls), 2200);
  }
  function flash(selector) {
    $$(selector).forEach((el, i) => {
      el.classList.remove('flash');
      void el.offsetWidth; // reinicia la animación
      el.style.setProperty('--fd', `${Math.min(i, 8) * 90}ms`);
      el.classList.add('flash');
      el.addEventListener('animationend', function done(ev) {
        if (ev.animationName !== 'flash') return;
        el.classList.remove('flash'); el.removeEventListener('animationend', done);
      });
    });
  }
  /* Desplazamiento lento y suave (más elegante que el del navegador).
     Se cancela si la persona toca, usa la rueda o el teclado. */
  let glideRaf = 0;
  function glideTo(top, done) {
    cancelAnimationFrame(glideRaf);
    // El límite se recalcula en cada cuadro: si un panel se abre mientras baja, llega igual.
    const maxNow = () => document.documentElement.scrollHeight - window.innerHeight;
    const to = Math.max(0, Math.round(top));
    const from = window.scrollY, dist = Math.min(to, maxNow() + 600) - from;
    const finish = () => { ['wheel', 'touchstart', 'keydown'].forEach(ev => window.removeEventListener(ev, stop)); if (done) done(); };
    const stop = () => { cancelAnimationFrame(glideRaf); finish(); };
    if (REDUCED.matches || Math.abs(dist) < 4) { window.scrollTo(0, to); finish(); return; }
    const dur = Math.min(1700, Math.max(850, 650 + Math.abs(dist) * 0.45));
    const ease = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    const t0 = performance.now();
    ['wheel', 'touchstart', 'keydown'].forEach(ev => window.addEventListener(ev, stop, { passive: true, once: true }));
    const step = now => {
      const t = Math.min(1, (now - t0) / dur);
      window.scrollTo(0, Math.min(maxNow(), from + dist * ease(t)));
      if (t < 1) glideRaf = requestAnimationFrame(step); else finish();
    };
    glideRaf = requestAnimationFrame(step);
  }
  const navOffset = () => { const nav = $('.topnav'); return (nav ? nav.getBoundingClientRect().bottom : 0) + 14; };

  let navLock = 0;
  function setupNav() {
    const nav = $('.topnav');
    const links = $$('[data-nav]');
    links.forEach(a => a.addEventListener('click', e => {
      const key = a.dataset.nav;
      const target = document.getElementById(key);
      if (!target) return;
      e.preventDefault();
      // La barra es fija: se deja su altura + un margen para que no tape el título.
      const top = key === 'inicio' ? 0 : target.getBoundingClientRect().top + window.scrollY - navOffset();
      navLock = Date.now() + 2000;   // mientras se desplaza, queda marcada la opción pulsada
      glideTo(top, () => { navLock = Date.now() + 250; (NAV_EFFECTS[key] || (() => {}))(); });
      history.replaceState(null, '', key === 'inicio' ? location.pathname : `#${key}`);
      a.classList.remove('pulse'); void a.offsetWidth; a.classList.add('pulse');
      $$('.nav-links a').forEach(x => x.classList.toggle('active', x.dataset.nav === key));
    }));

    // Marca en la barra la sección visible (también al desplazarse a mano).
    const ids = ['inicio', 'comunidad', 'recursos', 'juegos', 'clips'];
    let ticking = false;
    const update = () => {
      ticking = false;
      if (Date.now() < navLock) return;
      const line = (nav ? nav.getBoundingClientRect().bottom : 0) + window.innerHeight * 0.15;
      let current = 'inicio';
      const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
      if (atBottom) current = 'juegos';
      else ids.forEach(id => {
        const el = document.getElementById(id);
        // Juegos y clips están al final y no siempre pueden subir hasta arriba:
        // cuentan como activos cuando ya ocupan la parte alta de la pantalla.
        const thr = id === 'juegos' || id === 'clips' ? Math.max(line, window.innerHeight * 0.62) : line;
        if (el && el.getBoundingClientRect().top <= thr) current = id;
      });
      if (current === 'clips') current = 'juegos';   // los clips son parte de la zona de juegos
      $$('.nav-links a').forEach(a => a.classList.toggle('active', a.dataset.nav === current));
    };
    window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    window.addEventListener('resize', update, { passive: true });
    update();
  }

  /* =========================================================
     DISCORD (sección destacada)
     ========================================================= */
  function renderDiscordHub() {
    const d = CFG.discord || {};
    if (d.serverName) $('#serverName').textContent = d.serverName;
    if (d.description) $('#serverDesc').textContent = d.description;
    const url = LINKS.discordInvite;
    const hub = $('#comunidad');
    const btn = $('#joinBtn');
    if (!url) { btn.hidden = true; return; }
    makeExpander(hub, btn, $('#joinPanel'), () => `
      <div class="qr-act">
        <div class="qr-box">${qrMarkup(url, 'Código QR para unirse al servidor de Discord')}<small>Escanéalo con tu celular</small></div>
        <div class="acts">${actionsMarkup({ url, appLabel: 'Abrir en la aplicación', copy: [{ label: 'Copiar invitación', value: 'link', msg: 'Invitación de Discord copiada' }] })}</div>
      </div>`);
  }

  /* =========================================================
     TARJETAS DE REDES
     ========================================================= */
  const statSlots = {}; // id -> elemento donde van las cifras
  function renderSocials() {
    const grid = $('#socialGrid');
    if (!grid) return;
    const frag = document.createDocumentFragment();
    (CFG.socials || []).forEach((s, i) => {
      const url = LINKS[s.urlKey || s.id] || '';
      const card = document.createElement('article');
      card.className = `social-card ${s.id}`;
      card.style.setProperty('--i', i);
      card.innerHTML = `
        <button class="sc-head" type="button" aria-expanded="false" aria-controls="panel-${s.id}" data-tap>
          <span class="sc-icon"><img src="assets/${esc(s.icon)}" alt="" width="30" height="30"></span>
          <span class="sc-text">
            <span class="sc-name">${esc(s.name)}</span>
            <span class="sc-user">${esc(s.user)}</span>
            <span class="sc-stats"${s.noStats ? '' : ' hidden'}>${s.noStats ? `<span class="stat-msg">${esc(s.noStats)}</span>` : ''}</span>
          </span>
          <span class="chev" aria-hidden="true">›</span>
        </button>
        <div class="expand" id="panel-${s.id}"><div class="expand-inner"></div></div>`;
      makeExpander(card, $('.sc-head', card), $('.expand', card), () => `
        <div class="qr-act">
          ${url ? `<div class="qr-box">${qrMarkup(url, `Código QR de ${s.name}`)}<small>Escanea para abrir</small></div>` : ''}
          <div class="acts">${actionsMarkup({ url, app: s.app, steamClient: s.steamClient, copy: s.copy })}</div>
        </div>
        ${s.note ? `<p class="note">${esc(s.note)}</p>` : ''}`);
      if (!s.noStats) statSlots[s.id] = $('.sc-stats', card);
      frag.appendChild(card);
    });
    grid.replaceChildren(frag);
  }

  /* =========================================================
     RECURSOS (solo hay botón de descarga si el archivo existe)
     ========================================================= */
  async function fileExists(path) {
    try {
      const r = await fetch(path, { method: 'HEAD', cache: 'no-cache' });
      return r.ok;
    } catch (_) { return false; }
  }
  const RES_ICON = {
    cfg: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 15h6M9 18h4"/>',
    target: '<circle cx="12" cy="12" r="7.5"/><circle cx="12" cy="12" r="2.5"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/>',
    crate: '<path d="M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5z"/><path d="M3.5 7.5 12 12l8.5-4.5M12 12v9"/>',
    hud: '<rect x="2.5" y="4.5" width="19" height="13" rx="2"/><path d="M6 14v-3M9 14V9M12 14v-5M8 21h8"/><circle cx="17" cy="9.5" r="1.6"/>',
    bolt: '<path d="M13.5 2.5 5 13.5h6l-1.5 8 8.5-11h-6z"/>',
    book: '<path d="M3 5.5c3-1.2 6-1.2 9 .8 3-2 6-2 9-.8V19c-3-1.2-6-1.2-9 .8-3-2-6-2-9-.8z"/><path d="M12 6.3v13.5"/>'
  };
  const resIcon = k => `<svg viewBox="0 0 24 24" aria-hidden="true">${RES_ICON[k] || RES_ICON.cfg}</svg>`;
  function renderResources() {
    const grid = $('#resourceGrid');
    if (!grid) return;
    const list = CFG.resources || [];
    grid.innerHTML = list.map((r, i) => `
      <div class="res-tile${r.id === 'autoexec' ? ' featured' : ''}" data-i="${i}" title="${esc(r.title)} · ${esc(r.desc || '')}">
        <span class="res-icon">${resIcon(r.icon)}</span>
        <b>${esc(r.short || r.title)}</b>
        <span class="res-state">${r.file ? 'Comprobando…' : r.url ? 'Abrir' : 'Próximamente'}</span>
        ${r.url ? `<a class="res-link" href="${esc(r.url)}" target="_blank" rel="noopener noreferrer" aria-label="Abrir ${esc(r.title)}"></a>`
          : `<button class="res-link" type="button" data-soon="${i}" aria-label="${esc(r.title)}: próximamente"></button>`}
      </div>`).join('');
    grid.addEventListener('click', e => {
      const b = e.target.closest('[data-soon]');
      if (b) toast(`${list[Number(b.dataset.soon)].title}: todavía no está disponible. Próximamente.`, 'info', 3200);
    });
    list.forEach(async (r, i) => {
      if (!r.file) return;
      const tile = $(`.res-tile[data-i="${i}"]`, grid);
      const name = r.file.split('/').pop();
      if (await fileExists(r.file)) {
        tile.classList.add('ready');
        $('.res-state', tile).textContent = 'Descargar';
        $('.res-link', tile).outerHTML = `<a class="res-link" href="${esc(r.file)}" download="${esc(name)}" aria-label="Descargar ${esc(name)}"></a>`;
      } else {
        $('.res-state', tile).textContent = 'Próximamente';
      }
    });

    const guides = $('#guideGrid');
    if (guides) guides.innerHTML = (CFG.guides || []).map(g => g.url
      ? `<a class="guide-chip is-link pressable" href="${esc(g.url)}" target="_blank" rel="noopener noreferrer"><b>${esc(g.title)}</b><span>${esc(g.sub)}</span></a>`
      : `<span class="guide-chip"><b>${esc(g.title)}</b><span>${esc(g.sub)} · Próximamente</span></span>`).join('');
  }

  /* =========================================================
     JUEGOS: perfiles y galería
     ========================================================= */
  const logoImg = (g, cls = '') => g.logo
    ? `<img class="${cls}${g.logoInvert ? ' invert' : ''}" src="${esc(g.logo)}" alt="" decoding="async">`
    : `<b>${esc(g.short || g.name)}</b>`;

  /* Una sola acción para cada juego: la usan los botones bajo mi nombre
     y las tarjetas de la galería. Lleva a la galería, marca el juego y
     abre su ficha (perfil, identificador y accesos). */
  let selectedGame = null;
  function selectGame(id, { scroll = true } = {}) {
    const games = CFG.games || [];
    const g = games.find(x => x.id === id);
    const panel = $('#gameDetail');
    if (!g || !panel) return;
    const same = selectedGame === id && panel.classList.contains('open');
    $$('[data-game]').forEach(el => {
      const on = !same && el.dataset.game === id;
      el.classList.toggle('selected', on);
      el.setAttribute('aria-pressed', String(on));
    });
    if (same) { panel.classList.remove('open'); panel.inert = true; selectedGame = null; return; }
    selectedGame = id;
    const p = g.profile || {};
    const actions = [];
    if (p.url) actions.push(`<a class="act pressable" href="${esc(p.url)}" target="_blank" rel="noopener noreferrer">${ICON.web}<span>${esc(p.label || 'Ver mi perfil')}</span></a>`);
    if (p.copy) actions.push(`<button class="act pressable" type="button" data-act="copy" data-value="${esc(p.copy)}" data-msg="${esc(p.msg || 'Copiado')}">${ICON.copy}<span>Copiar: ${esc(p.copy)}</span></button>`);
    if (g.resources) actions.push(`<button class="act pressable" type="button" data-goto="recursos">${ICON.down}<span>Ver mis recursos</span></button>`);
    $('.expand-inner', panel).innerHTML = `
      <div class="gd-card" style="--c:${esc(g.accent || '#7fd6ff')}">
        <div class="gd-art">${g.image ? `<img src="${esc(g.image)}" alt="${esc(g.name)}" decoding="async">` : ''}<span class="gd-logo">${logoImg(g)}</span></div>
        <div class="gd-info">
          <h3>${esc(g.name)}</h3>
          <p>${p.url || p.copy ? esc(p.label || 'Mi perfil') + (p.copy ? ` · <b>${esc(p.copy)}</b>` : '') : 'Perfil próximamente: todavía no hay un enlace configurado para este juego.'}</p>
          <div class="acts">${actions.join('') || '<span class="soon">Perfil próximamente</span>'}</div>
        </div>
        <button class="gd-close pressable" type="button" aria-label="Cerrar ficha">×</button>
      </div>`;
    panel.classList.add('open'); panel.inert = false;
    const tile = $(`.game-tile[data-game="${id}"]`);
    // En móvil la galería se desliza a los lados: se centra la tarjeta del juego.
    const strip = $('#gameGrid');
    if (tile && strip && strip.scrollWidth > strip.clientWidth + 4) {
      strip.scrollTo({ left: tile.offsetLeft - (strip.clientWidth - tile.offsetWidth) / 2, behavior: REDUCED.matches ? 'auto' : 'smooth' });
    }
    const glow = () => tile && pulseBlock(tile, 'flash');
    if (scroll) {
      const target = $('#juegos');
      const top = target.getBoundingClientRect().top + window.scrollY - navOffset();
      if (Math.abs(window.scrollY - top) > 40) glideTo(top, glow); else glow();
    } else glow();
  }

  function renderGames() {
    const games = CFG.games || [];
    // Botones con logotipos bajo mi nombre
    const chips = $('#gameChips');
    if (chips) chips.innerHTML = games.map((g, i) => `
      <li><button class="game-chip pressable" type="button" data-game="${esc(g.id)}" aria-pressed="false" style="--c:${esc(g.accent || '#7fd6ff')};--i:${i}" title="${esc(g.name)}" aria-label="${esc(g.name)}">
        <span class="chip-logo">${logoImg(g)}</span>
      </button></li>`).join('');

    // Galería: mismas acciones que los botones de arriba
    const grid = $('#gameGrid');
    if (grid) {
      grid.innerHTML = games.map((g, i) => `
        <button class="game-tile pressable${g.image ? '' : ' no-img'}" type="button" data-game="${esc(g.id)}" aria-pressed="false" style="--c:${esc(g.accent || '#7fd6ff')};--i:${i}">
          ${g.image ? `<img src="${esc(g.image)}" alt="" loading="lazy" decoding="async" width="640" height="360">` : ''}
          <span class="tile-logo">${logoImg(g)}</span>
          <span class="tile-name">${esc(g.name)}</span>
        </button>`).join('');
      $$('img', grid).forEach(img => { img.onerror = () => { img.closest('.game-tile').classList.add('no-img'); img.remove(); }; });
    }
    document.addEventListener('click', e => {
      const b = e.target.closest('[data-game]');
      if (b) { selectGame(b.dataset.game, { scroll: !b.closest('#gameGrid') }); return; }
      if (e.target.closest('.gd-close')) { const g = selectedGame; if (g) selectGame(g, { scroll: false }); return; }
      const go = e.target.closest('[data-goto]');
      if (go) { const link = $(`.nav-links a[data-nav="${go.dataset.goto}"]`); if (link) link.click(); }
    });
    const panel = $('#gameDetail'); if (panel) panel.inert = true;

    // Perfiles de juegos
    const row = $('#gameProfiles');
    if (row) {
      row.innerHTML = (CFG.gameProfiles || []).map((g, i) => {
        const state = g.url || g.copy ? (g.detail || 'Ver perfil') : 'Perfil próximamente';
        const hint = g.url ? `Abrir mi perfil de ${g.name}` : g.copy ? `Copiar ${g.copy}` : `${g.name}: perfil próximamente`;
        return `<button class="gp-btn pressable${g.url || g.copy ? '' : ' soon'}${g.copy && !g.url ? ' copyable' : ''}" type="button" data-i="${i}" style="--c:${esc(g.color || '#7fd6ff')}" title="${esc(hint)}" aria-label="${esc(hint)}" data-tap>
          <span class="gp-icon">${g.icon ? `<img class="glyph" src="assets/${esc(g.icon)}" alt="" width="26" height="26">`
            : g.logo ? `<img class="logo${g.invert ? ' invert' : ''}" src="${esc(g.logo)}" alt="" decoding="async">` : `<b>${esc(g.name[0])}</b>`}</span>
          <b>${esc(g.name)}</b>
          <span>${esc(state)}</span>
        </button>`; }).join('');
      row.addEventListener('click', async e => {
        const b = e.target.closest('.gp-btn');
        if (!b) return;
        const g = CFG.gameProfiles[Number(b.dataset.i)];
        if (!g) return;
        if (g.url) window.open(g.url, '_blank', 'noopener');
        else if (g.copy) {
          if (await copyText(g.copy)) { toast(`✓ ${g.copyMsg || 'Copiado'}`); pulseBlock(b, 'copied-flash'); }
          else showManualCopy(b.parentElement, g.copy);
        } else toast(`Todavía no hay un enlace configurado para mi perfil de ${g.name}. Próximamente.`, 'info', 3600);
      });
    }
  }

  /* =========================================================
     ESTADÍSTICAS
     Fuente 1: stats.json que publica GitHub Actions.
     Fuente 2: Discord en vivo (invitación pública, sin claves).
     Nunca se muestran ceros por error ni cifras inventadas.
     ========================================================= */
  const STATS_CFG = Object.assign({ url: '', branch: 'estadisticas', refreshMinutes: 15, discordLive: true }, CFG.stats);
  const STAT_LABELS = {
    discord: [['members', 'miembros', 'miembro']],
    youtube: [['subscribers', 'suscriptores', 'suscriptor']],
    tiktok: [['followers', 'seguidores', 'seguidor'], ['likes', 'me gusta', 'me gusta']],
    steam: [['friends', 'amigos', 'amigo']],
    instagram: [['followers', 'seguidores', 'seguidor']],
    xbox: [['followers', 'seguidores', 'seguidor'], ['gamerscore', 'Gamerscore', 'Gamerscore', 'prefix']],
    twitch: [['followers', 'seguidores', 'seguidor']]
  };
  const CACHE_KEY = 'eito:stats:v2';
  const MAX_CACHE_AGE = 7 * 24 * 3600e3;
  const STALE_AFTER = 3 * 3600e3;
  const REFRESH_MS = Math.max(5, Number(STATS_CFG.refreshMinutes) || 15) * 60e3;
  const nf = new Intl.NumberFormat('es-MX');
  const nf1 = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 1 });
  const fmt = n => n >= 1e6 ? `${nf1.format(Math.floor(n / 1e5) / 10)} M` : n >= 1e4 ? `${nf1.format(Math.floor(n / 100) / 10)} mil` : nf.format(n);
  const validNumber = v => typeof v === 'number' && Number.isFinite(v) && v >= 0;
  function timeAgo(ms) {
    const min = Math.max(0, Math.round((Date.now() - ms) / 60000));
    if (min < 1) return 'hace un momento';
    if (min < 60) return `hace ${min} min`;
    const h = Math.round(min / 60);
    if (h < 24) return `hace ${h} h`;
    const d = Math.round(h / 24);
    return `hace ${d} ${d === 1 ? 'día' : 'días'}`;
  }
  const st = { data: {}, discordFailed: false, fetching: false, lastFetch: 0 };

  function loadCache() {
    try {
      const saved = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
      Object.entries(saved).forEach(([id, e]) => { if (e && e.stats && Date.now() - e.updatedAt < MAX_CACHE_AGE) st.data[id] = e; });
    } catch (_) { /* sin almacenamiento */ }
  }
  function saveCache() {
    try {
      const out = {};
      Object.entries(st.data).forEach(([id, e]) => { if (e.stats) out[id] = { stats: e.stats, updatedAt: e.updatedAt }; });
      localStorage.setItem(CACHE_KEY, JSON.stringify(out));
    } catch (_) { /* sin almacenamiento */ }
  }
  function mergeEntry(id, stats, updatedAt) {
    const defs = STAT_LABELS[id];
    if (!defs || !stats || !updatedAt) return;
    const clean = {};
    defs.forEach(([k]) => { if (validNumber(stats[k])) clean[k] = stats[k]; });
    if (id === 'discord' && validNumber(stats.online)) clean.online = stats.online;
    if (!Object.keys(clean).length) return;
    const cur = st.data[id];
    if (!cur || !cur.stats || updatedAt >= cur.updatedAt) st.data[id] = { stats: clean, updatedAt };
  }

  function statParts(id, entry) {
    return STAT_LABELS[id].filter(([k]) => validNumber(entry.stats[k])).map(([k, plural, singular, mode]) => {
      const n = entry.stats[k];
      const word = n === 1 ? singular : plural;
      const title = id === 'youtube' ? 'YouTube redondea el número público de suscriptores' : nf.format(n);
      return mode === 'prefix'
        ? `<span class="stat" title="${title}">${word} <b>${fmt(n)}</b></span>`
        : `<span class="stat" title="${title}"><b>${fmt(n)}</b> ${word}</span>`;
    });
  }

  /* Contador animado de Discord.
     - En CADA carga de la página, cuando llegan las cifras, sube desde 0 hasta la
       cifra real en ~9 s (effects.counterSeconds): empieza con saltos pequeños,
       acelera y frena suave al final. No depende de que la sección esté a la vista.
     - Si llega una cifra nueva mientras cuenta, solo cambia la meta: la animación
       sigue su curva y su tiempo (no se reinicia ni da saltos).
     - Actualizaciones posteriores (cada 15 min): pasa del número visible al nuevo en 1.5 s.
     - Al terminar siempre muestra la cifra exacta. */
  const easeCount = t => t < 0.82 ? 0.88 * Math.pow(t / 0.82, 2.3) : 0.88 + 0.12 * (1 - Math.pow(1 - (t - 0.82) / 0.18, 2));
  const easeOut = t => 1 - Math.pow(1 - t, 3);
  function countTo(el, value) {
    if (!el || !validNumber(value)) return;
    if (el._anim) { el._anim.to = value; return; }              // contando: solo cambia la meta
    if (el._target === value) { el.textContent = nf.format(value); return; }
    const first = !Number.isFinite(el._shown);
    const from = first ? 0 : el._shown;
    const secs = Math.min(15, Math.max(1, Number((CFG.effects || {}).counterSeconds) || 9));
    const dur = (first ? secs : 1.5) * 1000 * (REDUCED.matches ? 0.15 : 1);
    const ease = first ? easeCount : easeOut;
    const anim = el._anim = { to: value, t0: 0 };
    el.textContent = nf.format(from);
    const step = now => {
      if (!anim.t0) anim.t0 = now;
      const t = Math.min(1, (now - anim.t0) / dur);
      if (t < 1) {
        el._shown = Math.round(from + (anim.to - from) * ease(t));
        el.textContent = nf.format(el._shown);
        requestAnimationFrame(step);
        return;
      }
      el._shown = el._target = anim.to;                          // siempre termina en la cifra exacta
      el.textContent = nf.format(anim.to);
      el._anim = null;
      const box = el.closest('.hub-stat'); if (box) pulseBlock(box, 'settled');
    };
    // Si la pestaña está en segundo plano, espera a que se vea para no "perder" la animación.
    const go = () => requestAnimationFrame(step);
    if (document.hidden) document.addEventListener('visibilitychange', function v() { if (!document.hidden) { document.removeEventListener('visibilitychange', v); go(); } });
    else go();
  }

  /* Estado del bloque de Discord: solo usa la consulta EN VIVO a Discord.
     loading → cargando · ok → cifras reales · error → aviso claro (el botón para unirse sigue). */
  const hub = { state: 'loading', members: null, online: null, at: 0, tries: 0 };
  function renderHub() {
    const mEl = $('#hubMembers'), oEl = $('#hubOnline'), note = $('#hubNote'), box = $('#hubStats');
    if (!box) return;
    const onlineBox = $('.hub-stat.online');
    box.dataset.state = hub.state;
    if (hub.state === 'ok') {
      countTo(mEl, hub.members);
      if (validNumber(hub.online)) { onlineBox.hidden = false; countTo(oEl, hub.online); }
      else onlineBox.hidden = true;
      note.textContent = hub.failedRefresh ? `No se pudo actualizar ahora · cifra de ${timeAgo(hub.at)}` : '';
    } else if (hub.state === 'loading') {
      note.textContent = 'Cargando cifras de Discord…';
    } else {
      mEl.textContent = '—'; oEl.textContent = '—'; onlineBox.hidden = false;
      note.innerHTML = 'No se pudieron cargar las cifras de Discord ahora. El botón para unirte funciona igual. <button type="button" class="hub-retry" id="hubRetry">Reintentar</button>';
    }
  }

  function renderStats() {
    let newest = 0;
    Object.entries(statSlots).forEach(([id, el]) => {
      const entry = st.data[id];
      const parts = entry && entry.stats ? statParts(id, entry) : [];
      if (id === 'steam' && validNumber(CFG.steamAwardsManual) && CFG.steamAwardsManual > 0) {
        parts.push(`<span class="stat manual" title="Dato escrito a mano en la configuración"><b>${nf.format(CFG.steamAwardsManual)}</b> premios</span>`);
      }
      if (parts.length) {
        if (entry && entry.stats) {
          if (Date.now() - entry.updatedAt > STALE_AFTER) parts.push(`<span class="stat-age">· dato de ${timeAgo(entry.updatedAt)}</span>`);
          newest = Math.max(newest, entry.updatedAt);
        }
        el.innerHTML = parts.join('');
        el.hidden = false;
      } else if (entry && entry.error) {
        el.innerHTML = '<span class="stat-msg">Cifras no disponibles por ahora</span>';
        el.hidden = false;
      } else {
        el.hidden = true;
      }
    });

    renderHub();

    const up = $('#statsUpdated');
    if (up) {
      up.hidden = !newest;
      if (newest) up.textContent = `Cifras públicas · actualizadas ${timeAgo(newest)}`;
    }
  }

  function statsUrl() {
    if (STATS_CFG.url) return STATS_CFG.url;
    const m = location.hostname.match(/^([a-z0-9-]+)\.github\.io$/i);
    if (m) {
      const first = location.pathname.split('/').filter(Boolean)[0];
      const repo = first && !/\.html?$/i.test(first) ? first : `${m[1]}.github.io`;
      return `https://raw.githubusercontent.com/${m[1]}/${repo}/${STATS_CFG.branch}/stats.json`;
    }
    return '';   // Railway u otro servidor: sin stats.json (Discord funciona igual, en vivo)
  }
  async function fetchJSON(url, timeout = 8000) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeout);
    try {
      const res = await fetch(url, { signal: ctrl.signal, cache: 'no-cache', credentials: 'omit' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return await res.json();
    } finally { clearTimeout(t); }
  }
  async function loadStatsFile() {
    const url = statsUrl();
    if (!url) return;
    try {
      const json = await fetchJSON(url);
      Object.entries((json && json.platforms) || {}).forEach(([id, e]) => {
        if (!e || !STAT_LABELS[id]) return;
        const t = Date.parse(e.updatedAt);
        if (e.stats && t) mergeEntry(id, e.stats, t);
        if (!e.stats && e.ok === false && !(st.data[id] && st.data[id].stats)) st.data[id] = { error: true };
      });
    } catch (_) { /* se conservan las cifras guardadas */ }
  }
  async function loadDiscordLive() {
    if (!STATS_CFG.discordLive || !LINKS.discordInvite) { if (hub.state === 'loading') hub.state = 'error'; return; }
    const code = (LINKS.discordInvite.match(/discord(?:\.gg|(?:app)?\.com\/invite)\/([\w-]+)/i) || [])[1];
    if (!code) { hub.state = 'error'; return; }
    hub.tries++;
    try {
      const j = await fetchJSON(`https://discord.com/api/v10/invites/${encodeURIComponent(code)}?with_counts=true`, 8000);
      if (!(validNumber(j.approximate_member_count) && j.approximate_member_count > 0)) throw new Error('sin cifras');
      hub.members = j.approximate_member_count;
      hub.online = validNumber(j.approximate_presence_count) ? j.approximate_presence_count : null;
      hub.at = Date.now(); hub.state = 'ok'; hub.failedRefresh = false; hub.tries = 0;
      mergeEntry('discord', { members: hub.members, online: hub.online }, hub.at);   // también para la tarjeta de Discord
      st.discordFailed = false;
    } catch (_) {
      st.discordFailed = true;
      if (hub.state === 'ok') hub.failedRefresh = true;            // se conservan las cifras reales ya mostradas
      else hub.state = 'error';
    }
  }
  async function refreshStats() {
    if (st.fetching) return;
    st.fetching = true; st.lastFetch = Date.now();
    await Promise.allSettled([loadStatsFile(), loadDiscordLive()]);
    st.fetching = false;
    saveCache(); renderStats();
    // Si Discord falló al cargar, se reintenta solo (a los 20 s y a los 60 s).
    if (hub.state === 'error' && hub.tries < 3) setTimeout(refreshStats, hub.tries === 1 ? 20e3 : 60e3);
  }
  function startStats() {
    loadCache(); renderStats(); refreshStats();
    document.addEventListener('click', e => { if (e.target.closest('#hubRetry')) { hub.state = 'loading'; hub.tries = 0; renderHub(); refreshStats(); } });
    setInterval(() => (document.visibilityState === 'visible' ? refreshStats() : renderStats()), REFRESH_MS);
    setInterval(renderStats, 60e3);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && Date.now() - st.lastFetch > REFRESH_MS) refreshStats();
    });
  }

  /* =========================================================
     ESTRELLAS DORADAS (canvas entre el fondo y el contenido)
     - Estrellas de cuatro puntas en tonos amarillos y dorados.
     - Se mueven muy lento, cambian de brillo y de tamaño suavemente.
     - Pocas partículas; menos en celular y en equipos modestos.
     - Con música suben un poco su brillo (sin llenar la pantalla).
     - Se esconden al pasar detrás del logo para no taparlo.
     ========================================================= */
  const Stars = (() => {
    const fx = CFG.effects || {};
    const canvas = $('#goldStars');
    const ctx = canvas && canvas.getContext ? canvas.getContext('2d') : null;
    const enabled = !!ctx && fx.goldStars !== false;
    let stars = [], raf = 0, last = 0, w = 0, h = 0, dpr = 1, energy = 0, boost = 0, avoid = null, lastAvoid = 0;
    const COLORS = ['#ffd84a', '#ffc21f', '#fff0a6', '#ffb000', '#ffe27a'];
    const low = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4;
    const count = () => {
      let n = SMALL.matches ? (fx.maxStarsMobile || 12) : (fx.maxStarsDesktop || 26);
      if (low) n = Math.round(n * 0.65);
      return n;
    };
    // Dibujo de cada estrella preparado una sola vez (más ligero que redibujar la forma).
    const sprites = COLORS.map(c => {
      const S = 64, cv = document.createElement('canvas'); cv.width = cv.height = S;
      const g = cv.getContext('2d'), m = S / 2;
      const halo = g.createRadialGradient(m, m, 0, m, m, m * 0.55);
      halo.addColorStop(0, c + 'aa'); halo.addColorStop(1, c + '00');
      g.fillStyle = halo; g.beginPath(); g.arc(m, m, m * 0.55, 0, 6.283); g.fill();
      // Cuatro puntas angulosas (largas en vertical y horizontal).
      const L = m * 0.96, k = m * 0.13;
      g.fillStyle = c; g.beginPath();
      g.moveTo(m, m - L); g.lineTo(m + k, m - k); g.lineTo(m + L * 0.82, m); g.lineTo(m + k, m + k);
      g.lineTo(m, m + L); g.lineTo(m - k, m + k); g.lineTo(m - L * 0.82, m); g.lineTo(m - k, m - k); g.closePath(); g.fill();
      g.fillStyle = '#fffbe6'; g.beginPath(); g.arc(m, m, k * 0.9, 0, 6.283); g.fill();
      return cv;
    });
    function make(i) {
      return {
        x: Math.random(), y: Math.random(),
        size: (SMALL.matches ? 7 : 9) + Math.random() * (SMALL.matches ? 9 : 13),
        vx: (Math.random() - 0.5) * 4, vy: -1.5 - Math.random() * 3,   // px/s: deriva lentísima
        tw: 0.25 + Math.random() * 0.5, ph: Math.random() * 6.28,       // parpadeo suave
        rot: Math.random() * 0.6 - 0.3, spr: sprites[i % sprites.length], base: 0.35 + Math.random() * 0.45
      };
    }
    function resize() {
      dpr = Math.min(1.5, window.devicePixelRatio || 1);
      w = window.innerWidth; h = window.innerHeight;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = count();
      while (stars.length < n) stars.push(make(stars.length));
      stars.length = n;
      if (REDUCED.matches) draw(0);
    }
    function avoidRect(t) {
      if (t - lastAvoid < 300) return avoid;
      lastAvoid = t;
      const el = $('#avatarWrap');
      const r = el && el.getBoundingClientRect();
      avoid = r && r.bottom > 0 && r.top < h ? { x: r.left + r.width / 2, y: r.top + r.height / 2, r: r.width * 0.75 } : null;
      return avoid;
    }
    function draw(dt, t = 0) {
      ctx.clearRect(0, 0, w, h);
      boost += ((energy > 0 ? 1 : 0) - boost) * Math.min(1, dt * 1.5);
      const av = avoidRect(t);
      for (const s of stars) {
        s.x += (s.vx * dt) / w; s.y += (s.vy * (1 + boost * 0.6) * dt) / h; s.ph += s.tw * dt;
        if (s.y < -0.05) { s.y = 1.05; s.x = Math.random(); }
        if (s.x < -0.05) s.x = 1.05; else if (s.x > 1.05) s.x = -0.05;
        const x = s.x * w, y = s.y * h;
        let a = s.base * (0.55 + 0.45 * Math.sin(s.ph)) * (0.85 + boost * 0.25 + energy * 0.5);
        if (av) { const d = Math.hypot(x - av.x, y - av.y); if (d < av.r) a *= Math.max(0, (d - av.r * 0.55) / (av.r * 0.45)); }
        if (a <= 0.02) continue;
        const sz = s.size * (0.88 + 0.12 * Math.sin(s.ph * 0.7)) * (1 + energy * 0.35);
        ctx.globalAlpha = Math.min(1, a);
        ctx.save(); ctx.translate(x, y); ctx.rotate(s.rot);
        ctx.drawImage(s.spr, -sz, -sz, sz * 2, sz * 2);
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    }
    // ~30 cuadros por segundo: suficiente para un movimiento tan lento y ahorra batería.
    function frame(t) {
      raf = requestAnimationFrame(frame);
      if (t - last < 32) return;
      const dt = Math.min(0.1, (t - (last || t)) / 1000); last = t;
      draw(dt, t);
    }
    function run() { if (!raf && !document.hidden && !REDUCED.matches) { last = 0; raf = requestAnimationFrame(frame); } }
    function halt() { cancelAnimationFrame(raf); raf = 0; }
    if (enabled) {
      resize(); run();
      window.addEventListener('resize', resize, { passive: true });
      document.addEventListener('visibilitychange', () => (document.hidden ? halt() : run()));
    } else if (canvas) canvas.hidden = true;
    return {
      setEnergy(e) { energy = e; },
      get count() { return stars.length; },
      get running() { return !!raf; }
    };
  })();

  /* =========================================================
     ESPECTRO "EITO" + ARO RGB
     Diseño propio pensado para el logo:
     - Barras de segmentos luminosos (estilo LED gamer) alrededor del aro,
       en espejo: graves arriba, agudos hacia abajo (así no tapan el nombre).
     - Color RGB que gira junto con el aro; las puntas brillan con los agudos.
     - "Tapas" que caen despacio marcando los picos.
     - Ondas de choque finas cuando entra un golpe fuerte de graves.
     - Todo sale del análisis REAL del audio (Web Audio API · AnalyserNode).
       Sin análisis no se dibuja nada: no se finge sincronía.
     ========================================================= */
  const Viz = (() => {
    const wrap = $('#avatarWrap');
    const canvas = $('#vizCanvas');
    const ctx = canvas && canvas.getContext ? canvas.getContext('2d') : null;
    const eq = $$('#playEq i');
    let analyser = null, data = null, raf = 0, running = false;
    let bass = 0, mid = 0, tre = 0, avgBass = 0, lastHit = 0, hue = 0;
    const HALF = () => (SMALL.matches ? 22 : 34);
    let vals = new Float32Array(40), caps = new Float32Array(40), capV = new Float32Array(40);
    const waves = [];
    function size() {
      if (!canvas) return;
      const r = canvas.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(r.width * dpr); canvas.height = Math.round(r.height * dpr);
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function loop(t) {
      if (!analyser || !ctx) { raf = 0; return; }
      analyser.getByteFrequencyData(data);
      const nyq = analyser.context.sampleRate / 2, binHz = nyq / data.length;
      const bin = hz => Math.max(1, Math.min(data.length - 1, Math.round(hz / binHz)));
      const band = (a, b) => { const i0 = bin(a), i1 = Math.max(i0, bin(b)); let sum = 0; for (let i = i0; i <= i1; i++) sum += data[i]; return sum / ((i1 - i0 + 1) * 255); };
      // Bandas reales: graves 40-180 Hz · medios 180 Hz-2.5 kHz · agudos 2.5-12 kHz
      const tb = running ? Math.pow(band(40, 180), 1.5) : 0;
      const tm = running ? Math.pow(band(180, 2500), 1.25) : 0;
      const tt = running ? Math.min(1, Math.pow(band(2500, 12000), 1.05) * 1.8) : 0;
      bass += (tb - bass) * (tb > bass ? 0.35 : 0.07);
      mid += (tm - mid) * (tm > mid ? 0.22 : 0.06);
      tre += (tt - tre) * (tt > tre ? 0.32 : 0.08);
      avgBass += (tb - avgBass) * 0.03;
      wrap.style.setProperty('--bass', bass.toFixed(3));
      wrap.style.setProperty('--mid', mid.toFixed(3));
      wrap.style.setProperty('--tre', tre.toFixed(3));
      Stars.setEnergy(running ? bass : 0);
      // Indicador del reproductor: 5 barritas con las bandas reales.
      if (eq.length) {
        const lv = [bass, (bass + mid) / 2, mid, (mid + tre) / 2, tre];
        eq.forEach((b, i) => { b.style.transform = `scaleY(${(0.18 + lv[i] * 0.82).toFixed(3)})`; });
      }
      // Golpe de graves → onda de choque (máx. 3 a la vez, mín. 180 ms entre ondas).
      if (running && tb > 0.28 && tb > avgBass * 1.35 && t - lastHit > 180 && waves.length < 3) { waves.push({ r: 0, a: 0.6 }); lastHit = t; }

      const W = canvas.clientWidth, H = canvas.clientHeight, cx = W / 2, cy = H / 2;
      const ring = wrap.querySelector('.rgb-ring');
      const inner = ring.offsetWidth / 2 + 7;
      const maxLen = Math.max(16, Math.min(W, H) / 2 - inner - 4);
      const half = HALF();
      if (vals.length !== half) { vals = new Float32Array(half); caps = new Float32Array(half); capV = new Float32Array(half); }
      const seg = SMALL.matches ? 3.2 : 4, gap = SMALL.matches ? 1.8 : 2, segs = Math.max(4, Math.floor(maxLen / (seg + gap)));
      ctx.clearRect(0, 0, W, H);
      hue = (hue + 0.6 + tre * 2) % 360;
      // Ondas de choque
      for (let i = waves.length - 1; i >= 0; i--) {
        const wv = waves[i]; wv.r += 1.6 + bass * 2; wv.a *= 0.94;
        if (wv.a < 0.03 || wv.r > maxLen) { waves.splice(i, 1); continue; }
        ctx.strokeStyle = `hsla(${hue} 100% 70% / ${wv.a})`; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.arc(cx, cy, inner + wv.r, 0, 6.283); ctx.stroke();
      }
      ctx.lineCap = 'butt';
      const lw = SMALL.matches ? 3 : 3.6;
      for (let k = 0; k < half; k++) {
        // Reparto logarítmico de frecuencias: 45 Hz (arriba) → 11 kHz (abajo)
        const f0 = 45 * Math.pow(11000 / 45, k / half), f1 = 45 * Math.pow(11000 / 45, (k + 1) / half);
        const target = running ? Math.min(1, Math.pow(band(f0, f1), 1.35) * (1 + k / half * 0.9)) : 0;
        vals[k] += (target - vals[k]) * (target > vals[k] ? 0.45 : 0.08);
        if (vals[k] > caps[k]) { caps[k] = vals[k]; capV[k] = 0; } else { capV[k] += 0.0009; caps[k] = Math.max(0, caps[k] - capV[k]); }
        const lit = Math.round(vals[k] * segs);
        for (const side of [1, -1]) {
          const ang = -Math.PI / 2 + side * (k + 0.5) / half * (Math.PI * 0.94);
          const cos = Math.cos(ang), sin = Math.sin(ang);
          const h = (hue + (side > 0 ? k : half * 2 - k) * (360 / (half * 2))) % 360;
          for (let sIdx = 0; sIdx < lit; sIdx++) {
            const r0 = inner + sIdx * (seg + gap), r1 = r0 + seg;
            const tip = sIdx === lit - 1;
            ctx.strokeStyle = tip ? `hsla(${h} 100% ${70 + tre * 25}% / .95)` : `hsla(${h} 100% 58% / ${0.35 + (sIdx / segs) * 0.5})`;
            ctx.lineWidth = lw;
            ctx.beginPath(); ctx.moveTo(cx + cos * r0, cy + sin * r0); ctx.lineTo(cx + cos * r1, cy + sin * r1); ctx.stroke();
          }
          if (caps[k] > 0.04) {
            const rc = inner + Math.round(caps[k] * segs) * (seg + gap) + 1;
            ctx.strokeStyle = `hsla(${h} 100% 85% / .9)`; ctx.lineWidth = lw;
            ctx.beginPath(); ctx.moveTo(cx + cos * rc, cy + sin * rc); ctx.lineTo(cx + cos * (rc + 1.6), cy + sin * (rc + 1.6)); ctx.stroke();
          }
        }
      }
      const busy = running || bass > 0.004 || waves.length || vals.some(v => v > 0.01) || caps.some(c => c > 0.04);
      if (busy) raf = requestAnimationFrame(loop);
      else {
        raf = 0; ctx.clearRect(0, 0, W, H);
        ['--bass', '--mid', '--tre'].forEach(v => wrap.style.setProperty(v, '0'));
        eq.forEach(b => { b.style.transform = ''; });
        Stars.setEnergy(0);
      }
    }
    window.addEventListener('resize', size, { passive: true });
    return {
      attach(an) { analyser = an; data = new Uint8Array(an.frequencyBinCount); size(); },
      get live() { return !!analyser; },
      start() {
        running = true;
        wrap.classList.add('playing');
        if (analyser) { wrap.classList.add('live'); if (!raf) raf = requestAnimationFrame(loop); }
      },
      stop() {
        running = false;               // las barras bajan suave y el aro vuelve a su giro normal
        wrap.classList.remove('playing', 'live');
      }
    };
  })();

  /* =========================================================
     REPRODUCTOR PROPIO (HTML5 Audio, archivos locales)
     - Nunca suena solo al cargar la página.
     - Empieza en "startSeconds" de cada canción (configurable).
     - Estados: listo, cargando, sonando, en pausa y error.
     ========================================================= */
  function setupPlayer() {
    const M = CFG.music || {};
    const audio = $('#audio');
    const player = $('#player');
    const playBtn = $('#playBtn'), seek = $('#seek'), msg = $('#playerMsg');
    const tCur = $('#timeCur'), tDur = $('#timeDur'), modeEl = $('#vizMode');
    const restartBtn = $('#restartBtn'), prevBtn = $('#prevBtn'), nextBtn = $('#nextBtn'), vol = $('#vol');
    const coverEl = $('#coverArt');
    const volume = Math.min(1, Math.max(0, M.volume == null ? 0.5 : Number(M.volume)));
    // Compatible con la configuración anterior (music.file) y con la lista nueva (music.tracks).
    const tracks = (Array.isArray(M.tracks) && M.tracks.length ? M.tracks
      : [{ title: M.title, artist: M.artist, file: M.file, cover: M.cover, startSeconds: M.startSeconds != null ? M.startSeconds : M.startAt }])
      .filter(t => t && t.file);
    const fmtT = s => (!Number.isFinite(s) || s < 0) ? '--:--' : `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
    const say = t => { msg.textContent = t || ''; };
    const setState = st => { player.dataset.state = st; };
    let idx = 0, primed = false, playing = false, dragging = false, wantPlay = false;
    let ac = null, gain = null, graphTried = false;
    vol.value = String(Math.round(volume * 100));

    function setPlaying(p) {
      if (p === playing) return;
      playing = p;
      playBtn.classList.toggle('is-playing', p);
      playBtn.setAttribute('aria-label', p ? 'Pausar' : 'Reproducir');
      document.body.classList.toggle('music-on', p);
      if (p) Viz.start(); else Viz.stop();
    }
    if (!tracks.length) {
      playBtn.disabled = true; seek.disabled = true;
      $('#trackTitle').textContent = 'Sin canción';
      coverEl.classList.add('generic');
      say('Agrega tu canción en js/config.js › music.tracks.');
      return;
    }
    const startOf = t => Math.max(0, Number(t.startSeconds) || 0);

    function showCover(src) {
      coverEl.classList.remove('loaded', 'generic');
      coverEl.style.backgroundImage = '';
      if (!src) { coverEl.classList.add('generic'); return; }
      const im = new Image();
      im.onload = () => { coverEl.style.backgroundImage = `url("${src.replace(/"/g, '%22')}")`; coverEl.classList.add('loaded'); };
      im.onerror = () => coverEl.classList.add('generic');
      im.src = src;
    }
    function load(i) {
      idx = (i + tracks.length) % tracks.length;
      const t = tracks[idx];
      primed = false;
      $('#trackTitle').textContent = t.title || 'Canción';
      const artist = $('#trackArtist');
      artist.textContent = t.artist || 'Artista sin confirmar';
      artist.classList.toggle('unknown', !t.artist);
      const tag = $('#trackTag'); tag.hidden = !t.tag; tag.textContent = t.tag || '';
      coverEl.setAttribute('aria-label', `Portada de ${t.title || 'la canción'}`);
      showCover(t.cover || (CFG.profile || {}).logo || '');
      tCur.textContent = fmtT(startOf(t)); tDur.textContent = '--:--'; seek.value = '0'; seek.disabled = true;
      restartBtn.disabled = true;
      say('');
      setState('idle');
      audio.preload = 'metadata';          // solo los datos (duración), no la canción entera
      audio.src = t.file;
    }

    // Análisis real del audio (para el aro y el espectro). Si no se puede, la música suena igual.
    function connectGraph() {
      if (graphTried) return Promise.resolve(!!gain);
      graphTried = true;
      if (location.protocol === 'file:') {
        // Abierta como archivo local, el navegador bloquea el análisis (y silenciaría el audio).
        setMode(false, 'Ábrela desde un servidor (por ejemplo GitHub Pages) para ver el espectro en vivo.');
        return Promise.resolve(false);
      }
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) { setMode(false, 'Este navegador no permite analizar el audio.'); return Promise.resolve(false); }
      try {
        ac = new AC();
        const src = ac.createMediaElementSource(audio);
        const an = ac.createAnalyser(); an.fftSize = 2048; an.smoothingTimeConstant = 0.72;
        gain = ac.createGain(); gain.gain.value = Number(vol.value) / 100;
        src.connect(an); an.connect(gain); gain.connect(ac.destination);
        audio.volume = 1;
        Viz.attach(an);
      } catch (e) {
        gain = null;
        setMode(false, 'No se pudo iniciar el análisis del audio; la música suena normal.');
        return Promise.resolve(false);
      }
      return Promise.race([ac.resume().then(() => ac.state === 'running'), new Promise(r => setTimeout(() => r(false), 1500))])
        .then(ok => { setMode(ok); return ok; }, () => { setMode(false); return false; });
    }
    function setMode(live, why) {
      modeEl.hidden = false;
      modeEl.textContent = live ? 'Espectro en vivo' : 'Sin análisis';
      modeEl.classList.toggle('off', !live);
      modeEl.title = live ? 'El aro y el espectro reaccionan a la música real' : (why || 'No se pudo analizar el audio; el aro mantiene su giro normal');
      if (!live && why) console.info('[EITO] ' + why);
    }

    function play() {
      wantPlay = true;
      const t = tracks[idx];
      if (ac && ac.state === 'suspended') ac.resume().catch(() => {});
      const graph = connectGraph();             // se crea dentro del toque (lo exigen los navegadores)
      if (!primed) {
        primed = true;
        const st = startOf(t);
        const jump = () => {
          if (st && audio.duration && st < audio.duration - 0.5) { try { audio.currentTime = st; } catch (_) {} }
          else if (st && audio.duration && st >= audio.duration - 0.5) say(`El segundo de inicio (${st}) es mayor que la duración; suena desde el principio.`);
        };
        if (audio.readyState >= 1) jump();
        else { audio.muted = true; audio.addEventListener('loadedmetadata', () => { jump(); setTimeout(() => { audio.muted = false; }, 120); }, { once: true }); }
      }
      setState('loading');
      const p = audio.play();
      if (p && p.catch) p.catch(err => {
        audio.muted = false; wantPlay = false; setPlaying(false); setState(audio.error ? 'error' : 'idle');
        if (!audio.error) say(err && err.name === 'NotAllowedError' ? 'Toca reproducir de nuevo para escuchar.' : 'No se pudo reproducir. Inténtalo otra vez.');
      });
      graph.then(() => { if (gain) gain.gain.value = Number(vol.value) / 100; });
    }
    function pause() { wantPlay = false; audio.pause(); }

    audio.addEventListener('loadedmetadata', () => {
      tDur.textContent = fmtT(audio.duration); seek.disabled = false; restartBtn.disabled = false;
      if (!audio.currentTime || audio.currentTime < 0.05) tCur.textContent = fmtT(Math.min(startOf(tracks[idx]), audio.duration || 0));
    });
    audio.addEventListener('playing', () => { setState('playing'); setPlaying(true); say(''); });
    audio.addEventListener('waiting', () => { if (wantPlay) setState('loading'); });
    audio.addEventListener('pause', () => { setPlaying(false); if (player.dataset.state !== 'error') setState('paused'); });
    audio.addEventListener('ended', () => {
      setPlaying(false); setState('paused');
      if (tracks.length > 1) { load(idx + 1); play(); }
      else { primed = false; tCur.textContent = fmtT(startOf(tracks[idx])); seek.value = '0'; }
    });
    audio.addEventListener('error', () => {
      if (!audio.getAttribute('src')) return;
      wantPlay = false; audio.muted = false; setPlaying(false); setState('error'); primed = false;
      const f = tracks[idx].file;
      say(`No se pudo cargar el audio (${f.split('/').pop()}). Revisa que el archivo esté en assets/audio/ y la ruta en js/config.js.`);
    });
    audio.addEventListener('timeupdate', () => {
      if (dragging || !audio.duration) return;
      tCur.textContent = fmtT(audio.currentTime);
      seek.value = String(Math.round((audio.currentTime / audio.duration) * 1000));
      seek.style.setProperty('--p', `${(audio.currentTime / audio.duration) * 100}%`);
    });
    seek.addEventListener('input', () => { dragging = true; tCur.textContent = fmtT((seek.value / 1000) * audio.duration); seek.style.setProperty('--p', `${seek.value / 10}%`); });
    seek.addEventListener('change', () => { dragging = false; if (audio.duration) { primed = true; audio.currentTime = (seek.value / 1000) * audio.duration; } });
    vol.addEventListener('input', () => {
      const v = Number(vol.value) / 100;
      if (gain) gain.gain.value = v; else audio.volume = v;
      vol.style.setProperty('--p', `${vol.value}%`);
    });
    vol.style.setProperty('--p', `${vol.value}%`);
    audio.volume = volume;
    playBtn.addEventListener('click', () => { if (audio.paused) play(); else pause(); });
    restartBtn.addEventListener('click', () => {
      const st = startOf(tracks[idx]);
      primed = true;
      try { audio.currentTime = audio.duration && st < audio.duration - 0.5 ? st : 0; } catch (_) {}
      if (audio.paused) play();
    });
    if (tracks.length > 1) {
      prevBtn.hidden = false; nextBtn.hidden = false;
      prevBtn.addEventListener('click', () => { const was = !audio.paused; load(idx - 1); if (was) play(); });
      nextBtn.addEventListener('click', () => { const was = !audio.paused; load(idx + 1); if (was) play(); });
    }
    tracks.forEach(t => { if (t.tag && /fragmento/i.test(t.tag)) console.info(`[EITO] "${t.title}" es un fragmento: reemplázalo por la canción completa autorizada en js/config.js › music.tracks.`); });
    load(0);
  }

  /* =========================================================
     CLIPS (sección preparada; se llena desde config.js › clips)
     ========================================================= */
  function renderClips() {
    const grid = $('#clipGrid');
    if (!grid) return;
    const clips = (CFG.clips || []).filter(c => c && (c.video || c.url));
    if (!clips.length) {
      grid.innerHTML = `<div class="clip-empty panel"><span class="clip-ico" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M10 9.2v5.6l4.8-2.8z"/></svg></span>
        <div><b>Muy pronto: clips de mis partidas</b><span>Aquí subiré mis mejores jugadas de diferentes juegos.</span></div></div>`;
      return;
    }
    grid.innerHTML = clips.map((c, i) => `
      <article class="clip-card" style="--i:${i}">
        <button class="clip-media pressable" type="button" data-clip="${i}" aria-label="${c.video ? 'Reproducir' : 'Abrir'} clip: ${esc(c.title || 'Clip')}">
          ${c.thumb ? `<img src="${esc(c.thumb)}" alt="" loading="lazy" decoding="async">` : ''}
          <span class="clip-play" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M8 5.5v13l11-6.5z"/></svg></span>
        </button>
        <div class="clip-info"><b>${esc(c.title || 'Clip')}</b>${c.game ? `<span>${esc(c.game)}</span>` : ''}</div>
      </article>`).join('');
    grid.addEventListener('click', e => {
      const b = e.target.closest('[data-clip]');
      if (!b) return;
      const c = clips[Number(b.dataset.clip)];
      if (c.video) {
        const v = document.createElement('video');
        v.src = c.video; v.controls = true; v.playsInline = true; v.preload = 'metadata';
        if (c.thumb) v.poster = c.thumb;
        b.replaceWith(v);
        const a = $('#audio'); if (a && !a.paused) a.pause();   // no se mezclan dos audios
        v.play().catch(() => {});
      } else if (c.url) window.open(c.url, '_blank', 'noopener');
    });
  }

  /* =========================================================
     TOQUES: un arrastre no activa botones por accidente
     ========================================================= */
  function setupTapGuard() {
    let sx = 0, sy = 0, moved = false;
    document.addEventListener('pointerdown', e => { sx = e.clientX; sy = e.clientY; moved = false; }, { passive: true });
    document.addEventListener('pointermove', e => {
      if (e.pointerType !== 'mouse' && (Math.abs(e.clientX - sx) > 10 || Math.abs(e.clientY - sy) > 10)) moved = true;
    }, { passive: true });
    document.addEventListener('click', e => {
      if (moved && e.target.closest('[data-tap], .pressable')) { e.preventDefault(); e.stopPropagation(); }
      moved = false;
    }, true);
  }

  /* =========================================================
     INICIO
     ========================================================= */
  safe('perfil', renderProfile);
  safe('acciones', bindActions);
  safe('toques', setupTapGuard);
  safe('discord', renderDiscordHub);
  safe('redes', renderSocials);
  safe('recursos', renderResources);
  safe('juegos', renderGames);
  safe('clips', renderClips);
  safe('navegación', setupNav);
  safe('reproductor', setupPlayer);
  safe('fondos', startBackgrounds);
  safe('estadísticas', startStats);   // la consulta a Discord sale en cuanto carga la página
  document.documentElement.classList.add('js-ready');
})();
