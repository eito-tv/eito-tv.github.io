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
      prebuild() { if (!built) { inner.innerHTML = build(); built = true; } },
      set(open) {
        if (open) api.prebuild();
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
  /* Rendimiento: los paneles (QR incluido) se preparan de uno en uno cuando el
     navegador está libre, así abrirlos después no provoca tirones. */
  const idle = window.requestIdleCallback ? (fn => requestIdleCallback(fn, { timeout: 2000 })) : (fn => setTimeout(() => fn(null), 120));
  function prebuildPanels() {
    const queue = expanders.slice();
    const work = deadline => {
      do { const x = queue.shift(); if (x) x.prebuild(); } while (queue.length && deadline && deadline.timeRemaining() > 6);
      if (queue.length) idle(work);
    };
    idle(work);
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
     - Rendimiento: cada imagen se descarga y DECODIFICA antes de mostrarse, y se
       usa ese mismo <img> ya decodificado (antes se ponía como background-image y
       el navegador podía volver a decodificarla justo al pintar → tirón).
     - Solo se prepara la siguiente; nunca se descargan todas. Solo hay 2 capas.
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

    function load(i) {
      const item = list[i];
      const img = new Image();
      img.decoding = 'async';
      img.alt = '';
      img.draggable = false;
      img.src = srcOf(item);
      const ready = img.decode ? img.decode() : new Promise((res, rej) => { img.onload = res; img.onerror = rej; });
      return ready.then(() => ({ i, item, img }), () => { bad.add(i); throw new Error('img'); });
    }
    function nextIndex(from) {
      for (let k = 1; k <= list.length; k++) { const j = (from + k) % list.length; if (!bad.has(j)) return j; }
      return -1;
    }
    function swap({ i, item, img }) {
      const top = layers[1 - front], under = layers[front];
      top.classList.remove('on', 'under');
      top.style.setProperty('--dim', String(Math.min(0.4, Math.max(0, Number(item.dim) || 0))));
      top.replaceChildren(img);                   // la imagen ya decodificada
      void top.offsetWidth;                       // reinicia la animación del fundido
      under.classList.remove('on'); under.classList.add('under');
      top.classList.add('on');
      front = 1 - front; idx = i;
      const cap = $('#bgCaption');
      if (cap) cap.textContent = item.game ? `Fondo actual: ${item.game}` : '';
      const n = nextIndex(idx);
      nextReady = n >= 0 && n !== idx ? load(n).catch(() => null) : null;
      schedule();
    }
    function schedule() {
      clearTimeout(timer);
      if (document.hidden || !nextReady) return;
      timer = setTimeout(() => {
        const p = nextReady; nextReady = null;
        p.then(r => {
          if (r) swap(r);
          else { const n = nextIndex(idx); if (n >= 0) { nextReady = load(n).catch(() => null); schedule(); } }
        });
      }, seconds * 1000);
    }
    document.addEventListener('visibilitychange', () => { if (document.hidden) clearTimeout(timer); else if (!nextReady) { const n = nextIndex(idx); if (n >= 0) nextReady = load(n).catch(() => null); schedule(); } else schedule(); });
    (function first(k) {
      if (k >= list.length) return;
      load(k).then(swap, () => first(k + 1));
    })(0);
  }

  /* =========================================================
     NAVEGACIÓN con resaltado del destino
     ========================================================= */
  // Qué se resalta al llegar a cada sección desde la barra (se repite en cada pulsación).
  const NAV_EFFECTS = {
    inicio: () => pulseBlock('#inicio', 'glow-hero'),
    // Recursos: los botones se iluminan uno después de otro (nunca todos a la vez).
    recursos: () => flash('#recursos .res-tile, #recursos .guide-chip', { cls: 'seq-flash', step: 140 }),
    // Juegos: los botones de juegos se encienden del primero al último con el color de cada juego.
    juegos: () => lightUpChips({ nav: true }),
    // Comunidad: solo el botón "Únete al servidor".
    comunidad: () => pulseBlock('#joinBtn', 'join-glow')
  };
  // Inicio: vuelve a la vista inicial sin recargar ni tocar la música
  // (cierra la ficha del juego y los paneles abiertos y regresa la galería al principio).
  function resetView() {
    if (selectedGame) selectGame(selectedGame, { scroll: false });
    expanders.forEach(x => x.isOpen() && x.set(false));
    const strip = $('#gameGrid');
    if (strip && strip.scrollLeft) strip.scrollTo({ left: 0, behavior: REDUCED.matches ? 'auto' : 'smooth' });
  }
  function pulseBlock(target, cls) {
    const el = typeof target === 'string' ? $(target) : target;
    if (!el) return;
    el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls);
    clearTimeout(el._pulseT);   // si se pulsa otra vez, el temporizador viejo no corta la animación nueva
    el._pulseT = setTimeout(() => el.classList.remove(cls), 2200);
  }
  function flash(selector, { cls = 'flash', step = 90 } = {}) {
    const els = $$(selector);
    els.forEach(el => el.classList.remove(cls));
    void document.body.offsetWidth; // reinicia la animación (una sola vez para todos)
    els.forEach((el, i) => {
      el.style.setProperty('--fd', `${Math.min(i, 12) * step}ms`);
      el.classList.add(cls);
      el.addEventListener('animationend', function done(ev) {
        if (ev.target !== el) return;
        el.classList.remove(cls); el.removeEventListener('animationend', done);
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
      // "Juegos" lleva a los botones de juegos (bajo mi nombre), que son los que se iluminan.
      const chips = key === 'juegos' ? $('#gameChips') : null;
      const target = chips || document.getElementById(key);
      if (!target) return;
      e.preventDefault();
      if (key === 'inicio') resetView();
      // La barra es fija: se deja su altura + un margen para que no tape el título.
      const r = target.getBoundingClientRect();
      const top = key === 'inicio' ? 0
        : chips ? Math.min(r.top + window.scrollY - navOffset(), r.top + window.scrollY - (window.innerHeight - r.height) / 2)
        : r.top + window.scrollY - navOffset();
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
  let discordCardStat = null;   // la tarjeta de Discord muestra los miembros en vivo
  // Símbolos de las cifras: vectoriales, de un solo color (currentColor), nunca emojis del teléfono.
  const STAT_ICON = {
    like: '<path d="M12 20.6 4.5 13.3A4.9 4.9 0 0 1 12 6.8a4.9 4.9 0 0 1 7.5 6.5z"/>',
    star: '<path d="m12 2.6 2.9 6 6.5.8-4.8 4.5 1.2 6.5L12 17.2l-5.8 3.2 1.2-6.5-4.8-4.5 6.5-.8z"/>',
    person: '<circle cx="12" cy="7.8" r="4.3"/><path d="M3.8 21c.6-4.6 3.9-7.2 8.2-7.2s7.6 2.6 8.2 7.2z"/>',
    members: '<circle cx="9" cy="8" r="3.4"/><path d="M2.8 19.5c.6-3.6 3.1-5.6 6.2-5.6s5.6 2 6.2 5.6z"/><circle cx="17.2" cy="9" r="2.7"/><path d="M16.2 13.9c2.8-.2 4.9 1.4 5.4 4.8h-4.4c-.2-1.9-.5-3.4-1-4.8z"/>',
    award: '<circle cx="12" cy="9" r="6.2"/><path d="M8.3 14.2 6.8 22l5.2-2.7 5.2 2.7-1.5-7.8a7.7 7.7 0 0 1-7.4 0z"/>',
    medal: '<path d="M6.6 2h4.2l2.3 5.6a8 8 0 0 0-3 .9zM17.4 2h-4.2l-.8 2 1.7 4.2a8 8 0 0 1 1.9.9z"/><circle cx="12" cy="15.6" r="6"/>',
    trophy: '<path d="M7 2.8h10v1.7h3.4v2.8a4.4 4.4 0 0 1-4.1 4.4 5.1 5.1 0 0 1-3.1 2.9v2.6h3.1v3.2H7.7v-3.2h3.1v-2.6a5.1 5.1 0 0 1-3.1-2.9 4.4 4.4 0 0 1-4.1-4.4V4.5H7zM5.6 6.4v.9c0 .9.6 1.7 1.4 2zm12.8 0-1.4 2.9c.8-.3 1.4-1.1 1.4-2z"/>'
  };
  const statIcon = k => (STAT_ICON[k] ? `<svg class="sc-sym" viewBox="0 0 24 24" aria-hidden="true">${STAT_ICON[k]}</svg>` : '');
  function statMarkup(st) {
    if (!st) return '';
    if (st.live === 'discord') return `<span class="sc-stat live" title="Miembros del servidor (en vivo desde Discord)"><span class="sc-num">${statIcon(st.icon)}<b data-live="discord">—</b></span><small>${esc(st.label || 'miembros')}</small></span>`;
    // Solo símbolo (sin cifra): no se inventa ningún número.
    if (st.value == null || st.value === '') return st.icon ? `<span class="sc-stat sym-only" title="${esc(st.title || '')}"><span class="sc-num">${statIcon(st.icon)}</span>${st.label ? `<small>${esc(st.label)}</small>` : ''}</span>` : '';
    return `<span class="sc-stat" title="${esc(st.title || `${st.value} ${st.label || ''}`)}"><span class="sc-num">${statIcon(st.icon)}<b data-count="${esc(st.value)}">${esc(st.value)}</b></span>${st.label ? `<small>${esc(st.label)}</small>` : ''}</span>`;
  }
  // Cifras fijas de las tarjetas: suben de 0 a su valor cuando la tarjeta entra en pantalla (una vez).
  // "600 mil" → número 600 + " mil"; "1,200" conserva la coma. Discord no pasa por aquí (va en vivo).
  function countUpStats(grid) {
    const els = $$('[data-count]', grid).map(el => {
      const m = /^(\d[\d,.]*)(.*)$/.exec(el.dataset.count.trim());
      return m && { el, n: Number(m[1].replace(/[,.]/g, '')), sep: /,/.test(m[1]), rest: m[2] };
    }).filter(x => x && x.n > 0);
    if (!els.length || REDUCED.matches || !('IntersectionObserver' in window)) return;
    const fmt = (x, v) => (x.sep ? v.toLocaleString('en-US') : String(v)) + x.rest;
    els.forEach(x => { x.el.textContent = fmt(x, 0); });
    const run = (x, delay) => {
      const dur = 1600; let t0 = 0;
      const step = now => {
        if (!t0) t0 = now + delay;
        const p = Math.min(1, Math.max(0, (now - t0) / dur));
        x.el.textContent = fmt(x, Math.round(x.n * (1 - Math.pow(1 - p, 3))));
        if (p < 1) requestAnimationFrame(step); else x.el.classList.add('counted');
      };
      requestAnimationFrame(step);
    };
    let k = 0;
    const io = new IntersectionObserver(entries => entries.forEach(e => {
      if (!e.isIntersecting) return;
      io.unobserve(e.target);
      const x = els.find(v => v.el === e.target);
      if (x) run(x, (k++ % 6) * 110);
    }), { threshold: 0.6 });
    els.forEach(x => io.observe(x.el));
  }
  function renderSocials() {
    const grid = $('#socialGrid');
    if (!grid) return;
    const frag = document.createDocumentFragment();
    (CFG.socials || []).forEach((s, i) => {
      const url = (s.id === 'github' && LINKS.githubAutoexec) || LINKS[s.urlKey || s.id] || '';
      const card = document.createElement('article');
      card.className = `social-card ${s.id}${s.stat ? ' has-stat' : ''}`;
      card.style.setProperty('--i', i);
      card.innerHTML = `
        <button class="sc-head" type="button" aria-expanded="false" aria-controls="panel-${s.id}" data-tap>
          <span class="sc-icon"><img src="assets/${esc(s.icon)}" alt="" width="30" height="30"></span>
          <span class="sc-text">
            <span class="sc-name">${esc(s.name)}</span>
            <span class="sc-user">${esc(s.user)}</span>
          </span>
          ${statMarkup(s.stat)}
          <span class="chev" aria-hidden="true">›</span>
        </button>
        <div class="expand" id="panel-${s.id}"><div class="expand-inner"></div></div>`;
      makeExpander(card, $('.sc-head', card), $('.expand', card), () => `
        <div class="qr-act">
          ${url ? `<div class="qr-box">${qrMarkup(url, `Código QR de ${s.name}`)}<small>Escanea para abrir</small></div>` : ''}
          <div class="acts">${actionsMarkup({ url, app: s.app, steamClient: s.steamClient, copy: s.copy })}</div>
        </div>
        ${s.note ? `<p class="note">${esc(s.note)}</p>` : ''}`);
      if (s.stat && s.stat.live === 'discord') discordCardStat = $('[data-live="discord"]', card);
      frag.appendChild(card);
    });
    grid.replaceChildren(frag);
    countUpStats(grid);
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

  /* Luces: los botones de juegos se encienden UNO POR UNO (izquierda → derecha,
     arriba → abajo) con el color propio de cada juego. Al cargar, una vez (no con
     "reducir movimiento"); desde la barra "Juegos", cada vez que se pulsa.
     Solo se anima opacidad y escala de una capa de luz (sin tirones). */
  let lightsT = 0;
  function lightUpChips({ nav = false } = {}) {
    const list = $('#gameChips');
    if (!list || (!nav && REDUCED.matches)) return;
    const items = $$('li', list);
    // Orden visual real (por filas y luego por columnas), sirve en PC y en celular.
    const ordered = items.map(li => ({ li, r: li.getBoundingClientRect() }))
      .sort((a, b) => (Math.abs(a.r.top - b.r.top) > 8 ? a.r.top - b.r.top : a.r.left - b.r.left));
    ordered.forEach(({ li }, k) => {
      const chip = $('.game-chip', li);
      li.style.setProperty('--k', k);
      li.style.setProperty('--xc', chip ? getComputedStyle(chip).getPropertyValue('--c').trim() || '#fff' : '#fff');
    });
    const cls = nav ? 'lights-nav' : 'lights', STEP = nav ? 160 : 230;
    const go = () => {
      clearTimeout(lightsT);
      list.classList.remove('lights', 'lights-nav'); void list.offsetWidth;   // reinicia si se pulsa de nuevo
      list.classList.add(cls);
      lightsT = setTimeout(() => list.classList.remove(cls), ordered.length * STEP + 1200);
    };
    if (nav) go(); else setTimeout(go, 2600);   // al cargar: cuando ya terminaron de aparecer los botones
  }

  function renderGames() {
    const games = CFG.games || [];
    // Botones con logotipos bajo mi nombre
    const chips = $('#gameChips');
    if (chips) chips.innerHTML = games.map((g, i) => `
      <li><button class="game-chip pressable" type="button" data-game="${esc(g.id)}" aria-pressed="false" style="--c:${esc(g.chipColor || g.accent || '#7fd6ff')};--i:${i}" title="${esc(g.name)}" aria-label="${esc(g.name)}">
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
    lightUpChips();

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
     DISCORD EN VIVO
     Fuente: API pública de invitaciones de Discord (sin claves ni tokens).
     Se consulta al cargar y cada "discordSeconds" mientras la página está a la vista.
     Nunca se muestran cifras inventadas: si falla, se avisa.
     ========================================================= */
  const STATS_CFG = Object.assign({ discordLive: true, discordSeconds: 60 }, CFG.stats);
  const POLL_MS = Math.max(30, Number(STATS_CFG.discordSeconds) || 60) * 1000;
  const nf = new Intl.NumberFormat('es-MX');
  const validNumber = v => typeof v === 'number' && Number.isFinite(v) && v >= 0;
  function timeAgo(ms) {
    const sec = Math.max(0, Math.round((Date.now() - ms) / 1000));
    if (sec < 60) return 'hace un momento';
    const min = Math.round(sec / 60);
    if (min < 60) return `hace ${min} min`;
    const h = Math.round(min / 60);
    return `hace ${h} h`;
  }

  /* Contador animado de Discord.
     - En CADA carga de la página, cuando llegan las cifras, los dos contadores suben
       juntos desde 0 hasta la cifra real en ~15 s (effects.counterSeconds), con un
       movimiento lento y continuo que frena suave al final.
     - Si llega una cifra nueva mientras cuentan, solo cambia la meta: siguen su curva
       y su tiempo (no se reinicia ni da saltos).
     - Después, los cambios pasan del número visible al nuevo en 1.5 s.
     - Al terminar siempre se ve la cifra exacta. No se guarda nada entre visitas. */
  const easeCount = t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;   // suave al empezar y al terminar
  const easeOut = t => 1 - Math.pow(1 - t, 3);
  let countClock = 0;   // los dos contadores comparten el mismo inicio (van coordinados)
  function countTo(el, value) {
    if (!el || !validNumber(value)) return;
    if (el._anim) { el._anim.to = value; return; }              // contando: solo cambia la meta
    if (el._target === value) { el.textContent = nf.format(value); return; }
    const first = !Number.isFinite(el._shown);
    const from = first ? 0 : el._shown;
    const secs = Math.min(30, Math.max(1, Number((CFG.effects || {}).counterSeconds) || 15));
    // Igual en celular y en computadora, y también con "reducir animaciones" activado
    // (contar números no es un movimiento en pantalla; antes ese modo lo acortaba a ~2 s).
    const dur = (first ? secs : 1.5) * 1000;
    const ease = first ? easeCount : easeOut;
    const anim = el._anim = { to: value };
    el.textContent = nf.format(from);
    const step = now => {
      if (!anim.t0) anim.t0 = first ? (countClock || (countClock = now)) : now;
      const t = Math.min(1, (now - anim.t0) / dur);
      if (t < 1) {
        const v = Math.round(from + (anim.to - from) * ease(t));
        if (v !== el._shown) { el._shown = v; el.textContent = nf.format(v); }   // solo toca el texto si cambia
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

  /* Estado del bloque de Discord.
     loading → conectando · ok → cifras reales · error → aviso claro (el botón para unirse sigue). */
  const hub = { state: 'loading', members: null, online: null, at: 0, tries: 0, failedRefresh: false };
  function renderHub() {
    const mEl = $('#hubMembers'), oEl = $('#hubOnline'), note = $('#hubNote'), box = $('#hubStats'), live = $('#hubLive');
    if (!box) return;
    const onlineBox = $('.hub-stat.online');
    box.dataset.state = hub.state;
    if (hub.state === 'ok') {
      countTo(mEl, hub.members);
      if (validNumber(hub.online)) { onlineBox.hidden = false; countTo(oEl, hub.online); }
      else onlineBox.hidden = true;
      note.textContent = '';
      if (hub.failedRefresh) { live.dataset.state = 'stale'; live.lastChild.textContent = `Sin conexión ahora · cifra de ${timeAgo(hub.at)}`; }
      else { live.dataset.state = 'live'; live.lastChild.textContent = 'Actualizado en tiempo real'; }
    } else if (hub.state === 'loading') {
      live.dataset.state = 'loading'; live.lastChild.textContent = 'Conectando con Discord…';
      note.textContent = '';
    } else {
      mEl.textContent = '—'; oEl.textContent = '—'; onlineBox.hidden = false;
      live.dataset.state = 'error'; live.lastChild.textContent = 'Sin conexión con Discord';
      note.innerHTML = 'No se pudieron cargar las cifras de Discord ahora. El botón para unirte funciona igual. <button type="button" class="hub-retry" id="hubRetry">Reintentar</button>';
    }
    // La tarjeta de Discord en "Mis redes" muestra la misma cifra real (sin animación).
    if (discordCardStat) discordCardStat.textContent = hub.state === 'ok' && validNumber(hub.members) ? nf.format(hub.members) : '—';
  }

  async function fetchJSON(url, timeout = 8000) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeout);
    try {
      const res = await fetch(url, { signal: ctrl.signal, cache: 'no-store', credentials: 'omit' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return await res.json();
    } finally { clearTimeout(t); }
  }
  async function loadDiscordLive() {
    if (!STATS_CFG.discordLive || !LINKS.discordInvite) { hub.state = 'error'; return; }
    const code = (LINKS.discordInvite.match(/discord(?:\.gg|(?:app)?\.com\/invite)\/([\w-]+)/i) || [])[1];
    if (!code) { hub.state = 'error'; return; }
    hub.tries++;
    try {
      const j = await fetchJSON(`https://discord.com/api/v10/invites/${encodeURIComponent(code)}?with_counts=true`, 8000);
      if (!(validNumber(j.approximate_member_count) && j.approximate_member_count > 0)) throw new Error('sin cifras');
      hub.members = j.approximate_member_count;
      hub.online = validNumber(j.approximate_presence_count) ? j.approximate_presence_count : null;
      hub.at = Date.now(); hub.state = 'ok'; hub.failedRefresh = false; hub.tries = 0;
    } catch (_) {
      if (hub.state === 'ok') hub.failedRefresh = true;            // se conservan las cifras reales ya mostradas
      else hub.state = 'error';
    }
  }
  let fetching = false, lastFetch = 0, retryTimer = 0;
  async function refreshDiscord() {
    if (fetching) return;                                         // nunca dos consultas a la vez
    fetching = true; lastFetch = Date.now();
    await loadDiscordLive();
    fetching = false;
    renderHub();
    clearTimeout(retryTimer);
    // Si falló al cargar, se reintenta solo (a los 20 s y a los 60 s).
    if (hub.state === 'error' && hub.tries < 3) retryTimer = setTimeout(refreshDiscord, hub.tries === 1 ? 20e3 : 60e3);
  }
  function startStats() {
    renderHub(); refreshDiscord();
    document.addEventListener('click', e => { if (e.target.closest('#hubRetry')) { hub.state = 'loading'; hub.tries = 0; renderHub(); refreshDiscord(); } });
    // Un solo temporizador: consulta de nuevo solo si la página está a la vista.
    setInterval(() => { if (document.visibilityState === 'visible') refreshDiscord(); else if (hub.state === 'ok') renderHub(); }, POLL_MS);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && Date.now() - lastFetch > POLL_MS) refreshDiscord();
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
        rot: Math.random() * 0.6 - 0.3, spr: sprites[i % sprites.length], base: 0.35 + Math.random() * 0.45,
        // Flotación: vaivén suave (px) + rumbo que cambia poco a poco cada pocos segundos.
        fa: 6 + Math.random() * 10, fp: Math.random() * 6.28, fs: 0.35 + Math.random() * 0.4,
        tvx: (Math.random() - 0.5) * 6, tvy: -1 - Math.random() * 3.5, nextTurn: 2 + Math.random() * 5
      };
    }
    function resize() {
      dpr = 1;   // las estrellas son difusas: con resolución normal se ven igual y cuestan menos (PC y celular)
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
        if ((s.nextTurn -= dt) <= 0) { s.tvx = (Math.random() - 0.5) * 6; s.tvy = -1 - Math.random() * 3.5; s.nextTurn = 3 + Math.random() * 5; }
        const ease = Math.min(1, dt * 0.4);   // el rumbo nuevo se alcanza en varios segundos (sin giros bruscos)
        s.vx += (s.tvx - s.vx) * ease; s.vy += (s.tvy - s.vy) * ease;
        s.x += (s.vx * dt) / w; s.y += (s.vy * (1 + boost * 0.6) * dt) / h; s.ph += s.tw * dt; s.fp += s.fs * dt;
        if (s.y < -0.05) { s.y = 1.05; s.x = Math.random(); }
        if (s.x < -0.05) s.x = 1.05; else if (s.x > 1.05) s.x = -0.05;
        const x = s.x * w + Math.sin(s.fp) * s.fa, y = s.y * h + Math.cos(s.fp * 0.8) * s.fa * 0.6;
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
      // Al girar el celular o cambiar el tamaño, se recalcula una sola vez (no en cada píxel).
      let rt = 0; window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(resize, 150); }, { passive: true });
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
    let analyser = null, data = null, raf = 0, wanted = false, running = false, lastSignal = 0, media = null;
    // ¿Está sonando DE VERDAD en este cuadro? Se lee del propio <audio> (no de un estado guardado),
    // así nunca se anima "como si hubiera música" en pausa, al buscar o mientras carga.
    const audible = () => wanted && media && !media.paused && !media.ended && !media.seeking && media.readyState >= 3;
    let bass = 0, mid = 0, tre = 0, avgBass = 0, lastHit = 0, hue = 0;
    // Medidas calculadas una sola vez (y al cambiar el tamaño), no en cada cuadro:
    // así el dibujo no obliga al navegador a recalcular el diseño 60 veces por segundo.
    let W = 0, H = 0, inner = 0, maxLen = 0, half = 0, bars = [], binHz = 0;
    let vals = new Float32Array(0), caps = new Float32Array(0), capV = new Float32Array(0);
    const waves = [];
    function size() {
      if (!canvas) return;
      const r = canvas.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      W = r.width; H = r.height;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const ring = wrap.querySelector('.rgb-ring');
      inner = (ring ? ring.offsetWidth : 150) / 2 + 7;
      maxLen = Math.max(16, Math.min(W, H) / 2 - inner - 4);
      half = SMALL.matches ? 22 : 34;
      if (vals.length !== half) { vals = new Float32Array(half); caps = new Float32Array(half); capV = new Float32Array(half); }
      bars = [];
      for (let k = 0; k < half; k++) {
        // Reparto logarítmico de frecuencias: 45 Hz (arriba) → 11 kHz (abajo), en espejo.
        const f0 = 45 * Math.pow(11000 / 45, k / half), f1 = 45 * Math.pow(11000 / 45, (k + 1) / half);
        const sides = [1, -1].map(side => { const a = -Math.PI / 2 + side * (k + 0.5) / half * (Math.PI * 0.94); return { cos: Math.cos(a), sin: Math.sin(a), hOff: (side > 0 ? k : half * 2 - k) * (360 / (half * 2)) }; });
        bars.push({ f0, f1, sides, boost: 1 + k / half * 0.9 });
      }
    }
    let resizeTimer = 0;
    window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(size, 150); }, { passive: true });
    function loop(t) {
      if (!analyser || !ctx) { raf = 0; return; }
      running = audible();
      analyser.getByteFrequencyData(data);
      const bin = hz => Math.max(1, Math.min(data.length - 1, Math.round(hz / binHz)));
      const band = (a, b) => { const i0 = bin(a), i1 = Math.max(i0, bin(b)); let sum = 0; for (let i = i0; i <= i1; i++) sum += data[i]; return sum / ((i1 - i0 + 1) * 255); };
      // Bandas reales: graves 40-180 Hz · medios 180 Hz-2.5 kHz · agudos 2.5-12 kHz
      const tb = running ? Math.pow(band(40, 180), 1.5) : 0;
      const tm = running ? Math.pow(band(180, 2500), 1.25) : 0;
      const tt = running ? Math.min(1, Math.pow(band(2500, 12000), 1.05) * 1.8) : 0;
      if (running && (tb + tm + tt) > 0.004) lastSignal = t;           // hay sonido real llegando al analizador
      // Bajada más rápida cuando no suena: al pausar o buscar, el espectro se apaga en ~0.4 s.
      const fall = running ? 1 : 2.6;
      bass += (tb - bass) * (tb > bass ? 0.35 : 0.07 * fall);
      mid += (tm - mid) * (tm > mid ? 0.22 : 0.06 * fall);
      tre += (tt - tre) * (tt > tre ? 0.32 : 0.08 * fall);
      avgBass += (tb - avgBass) * 0.03;
      wrap.style.setProperty('--bass', bass.toFixed(3));
      wrap.style.setProperty('--tre', tre.toFixed(3));
      Stars.setEnergy(running ? bass : 0);
      if (eq.length) {
        const lv = [bass, (bass + mid) / 2, mid, (mid + tre) / 2, tre];
        eq.forEach((b, i) => { b.style.transform = `scaleY(${(0.18 + lv[i] * 0.82).toFixed(3)})`; });
      }
      // Golpe de graves → onda de choque (máx. 3 a la vez, mín. 180 ms entre ondas).
      if (running && tb > 0.28 && tb > avgBass * 1.35 && t - lastHit > 180 && waves.length < 3) { waves.push({ r: 0, a: 0.6 }); lastHit = t; }

      const cx = W / 2, cy = H / 2;
      const seg = SMALL.matches ? 3.2 : 4, gap = SMALL.matches ? 1.8 : 2, step = seg + gap, segs = Math.max(4, Math.floor(maxLen / step));
      ctx.clearRect(0, 0, W, H);
      hue = (hue + 0.6 + tre * 2) % 360;
      for (let i = waves.length - 1; i >= 0; i--) {
        const wv = waves[i]; wv.r += 1.6 + bass * 2; wv.a *= 0.94;
        if (wv.a < 0.03 || wv.r > maxLen) { waves.splice(i, 1); continue; }
        ctx.setLineDash([]);
        ctx.strokeStyle = `hsla(${hue} 100% 70% / ${wv.a})`; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.arc(cx, cy, inner + wv.r, 0, 6.283); ctx.stroke();
      }
      ctx.lineCap = 'butt';
      ctx.lineWidth = SMALL.matches ? 3 : 3.6;
      let busy = wanted || bass > 0.004 || waves.length > 0;
      for (let k = 0; k < half; k++) {
        const b = bars[k];
        const target = running ? Math.min(1, Math.pow(band(b.f0, b.f1), 1.35) * b.boost) : 0;
        vals[k] += (target - vals[k]) * (target > vals[k] ? 0.45 : 0.08 * fall);
        if (vals[k] > caps[k]) { caps[k] = vals[k]; capV[k] = 0; } else { capV[k] += running ? 0.0009 : 0.004; caps[k] = Math.max(0, caps[k] - capV[k]); }
        if (vals[k] > 0.01 || caps[k] > 0.04) busy = true;
        const lit = Math.round(vals[k] * segs);
        for (const sd of b.sides) {
          const h = (hue + sd.hOff) % 360;
          // Cuerpo de la barra: UN trazo con guiones = segmentos LED (antes: un trazo por segmento).
          if (lit > 1) {
            ctx.setLineDash([seg, gap]);
            ctx.strokeStyle = `hsla(${h} 100% 58% / .62)`;
            ctx.beginPath(); ctx.moveTo(cx + sd.cos * inner, cy + sd.sin * inner);
            ctx.lineTo(cx + sd.cos * (inner + (lit - 1) * step - gap), cy + sd.sin * (inner + (lit - 1) * step - gap)); ctx.stroke();
          }
          ctx.setLineDash([]);
          if (lit > 0) {   // punta brillante (los agudos la aclaran)
            const r0 = inner + (lit - 1) * step;
            ctx.strokeStyle = `hsla(${h} 100% ${70 + tre * 25}% / .95)`;
            ctx.beginPath(); ctx.moveTo(cx + sd.cos * r0, cy + sd.sin * r0); ctx.lineTo(cx + sd.cos * (r0 + seg), cy + sd.sin * (r0 + seg)); ctx.stroke();
          }
          if (caps[k] > 0.04) {   // tapa que marca el pico y cae despacio
            const rc = inner + Math.round(caps[k] * segs) * step + 1;
            ctx.strokeStyle = `hsla(${h} 100% 85% / .9)`;
            ctx.beginPath(); ctx.moveTo(cx + sd.cos * rc, cy + sd.sin * rc); ctx.lineTo(cx + sd.cos * (rc + 1.6), cy + sd.sin * (rc + 1.6)); ctx.stroke();
          }
        }
      }
      if (busy) raf = requestAnimationFrame(loop);
      else {
        raf = 0; ctx.clearRect(0, 0, W, H);
        ['--bass', '--tre'].forEach(v => wrap.style.setProperty(v, '0'));
        eq.forEach(b => { b.style.transform = ''; });
        Stars.setEnergy(0);
      }
    }
    const wake = () => { if (analyser && ctx && !raf && !document.hidden) raf = requestAnimationFrame(loop); };   // nunca dos ciclos
    document.addEventListener('visibilitychange', () => { if (document.hidden) { cancelAnimationFrame(raf); raf = 0; } else if (wanted) wake(); });
    return {
      // Se conecta UNA sola vez; las repeticiones de la canción reutilizan el mismo analizador.
      attach(an, el) { if (analyser) return; analyser = an; media = el; data = new Uint8Array(an.frequencyBinCount); binHz = (an.context.sampleRate / 2) / data.length; size(); },
      get live() { return !!analyser; },
      get lastSignal() { return lastSignal; },
      get looping() { return !!raf; },
      get audible() { return audible(); },
      start() {
        wanted = true;
        wrap.classList.add('playing');
        if (analyser) wrap.classList.add('live');
        wake();
      },
      wake,                            // tras buscar, cargar o volver a la pestaña
      stop() {
        wanted = false;                // las barras bajan rápido y el aro vuelve a su giro normal
        wrap.classList.remove('playing', 'live');
      }
    };
  })();

  /* =========================================================
     REPRODUCTOR PROPIO (HTML5 Audio, archivos locales)
     - Nunca suena solo al cargar la página (lo exigen los navegadores y así lo quiero).
     - Un solo elemento <audio>, un solo AudioContext y un solo analizador.
     - En bucle (music.loop): al terminar vuelve al principio sola, sin cortes,
       hasta que se pause. Si se pausa, no se reanuda sola.
     - Empieza en "startSeconds" de cada canción (configurable).
     - Estados: listo, cargando, sonando, en pausa y error.
     ========================================================= */
  function setupPlayer() {
    const M = CFG.music || {};
    const audio = $('#audio');
    const player = $('#player');
    const playBtn = $('#playBtn'), seek = $('#seek'), seekWrap = $('#seekWrap'), msg = $('#playerMsg');
    const tCur = $('#timeCur'), tDur = $('#timeDur'), modeEl = $('#vizMode');
    const restartBtn = $('#restartBtn'), prevBtn = $('#prevBtn'), nextBtn = $('#nextBtn'), vol = $('#vol');
    const coverEl = $('#coverArt');
    const volume = Math.min(1, Math.max(0, M.volume == null ? 0.5 : Number(M.volume)));
    const tracks = (Array.isArray(M.tracks) && M.tracks.length ? M.tracks
      : [{ title: M.title, artist: M.artist, file: M.file, cover: M.cover, startSeconds: M.startSeconds != null ? M.startSeconds : M.startAt }])
      .filter(t => t && t.file);
    const loopOn = M.loop !== false;
    const fmtT = s => (!Number.isFinite(s) || s < 0) ? '--:--' : `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
    const say = t => { msg.textContent = t || ''; };
    const setState = st => { player.dataset.state = st; };
    let idx = 0, primed = false, playing = false, dragging = false, wantPlay = false, playSince = 0;
    let ac = null, gain = null, graphTried = false, analysing = false;
    vol.value = String(Math.round(volume * 100));

    function setProgress(frac) {
      const f = Math.min(1, Math.max(0, frac || 0));
      seekWrap.style.setProperty('--p', f.toFixed(4));
      if (!dragging) seek.value = String(Math.round(f * 1000));
    }
    // Indicador del espectro (siempre visible). Dice lo que pasa DE VERDAD:
    //  en vivo · en pausa · cargando · sin señal de audio · detenido · no disponible.
    const MODE_TIPS = {
      on: 'El aro y el espectro reaccionan a la música real',
      paused: 'La música está en pausa: el espectro está detenido',
      wait: 'El navegador está cargando o buscando esa parte de la canción',
      nosignal: 'Suena, pero el analizador no recibe sonido',
      error: 'No se puede analizar el audio en este navegador o desde un archivo local'
    };
    let modeWhy = '';
    function updateMode() {
      const now = performance.now();
      const ok = analysing && ac && ac.state === 'running';
      let txt, st;
      if (graphTried && !analysing) { txt = 'Espectro no disponible'; st = 'error'; }
      else if (!playing) { txt = 'Espectro en pausa'; st = 'paused'; }
      else if (graphTried && !ok) { txt = 'Espectro detenido'; st = 'error'; }
      else if (audio.seeking || audio.readyState < 3) { txt = 'Espectro cargando…'; st = 'wait'; }
      else if (now - Math.max(Viz.lastSignal, playSince) > 4000) { txt = 'Sin señal de audio'; st = 'nosignal'; }
      else { txt = 'Espectro en vivo'; st = 'on'; }
      if (modeEl.textContent !== txt) modeEl.textContent = txt;
      if (modeEl.dataset.state !== st) { modeEl.dataset.state = st; modeEl.title = modeWhy && st === 'error' ? modeWhy : MODE_TIPS[st]; }
    }
    function setPlaying(p) {
      if (p === playing) return;
      playing = p;
      if (p) playSince = performance.now();
      playBtn.classList.toggle('is-playing', p);
      playBtn.setAttribute('aria-label', p ? 'Pausar' : 'Reproducir');
      playBtn.setAttribute('aria-pressed', String(p));
      document.body.classList.toggle('music-on', p);
      if (p) Viz.start(); else Viz.stop();
      updateMode();
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
      artist.textContent = t.artist || '';
      artist.hidden = !t.artist;
      coverEl.setAttribute('aria-label', `Portada de ${t.title || 'la canción'}`);
      showCover(t.cover || (CFG.profile || {}).logo || '');
      tCur.textContent = fmtT(startOf(t)); tDur.textContent = '--:--'; setProgress(0); seek.disabled = true;
      restartBtn.disabled = true;
      say('');
      setState('idle');
      audio.loop = loopOn && tracks.length === 1;   // una sola canción: bucle nativo, sin cortes
      audio.preload = 'metadata';                   // solo los datos (duración), no la canción entera
      audio.src = t.file;
    }

    // Análisis real del audio (para el aro y el espectro). Se crea UNA vez.
    // Si no se puede, la música suena igual.
    function connectGraph() {
      if (graphTried) return Promise.resolve(analysing);
      graphTried = true;
      if (location.protocol === 'file:') {
        // Abierta como archivo local, el navegador bloquea el análisis (y silenciaría el audio).
        modeWhy = 'Abriste la página como archivo local: el navegador no deja analizar el audio. Ábrela con ABRIR-EITO-LOCAL.bat (o desde tu servidor) para ver el espectro.';
        console.info('[EITO] ' + modeWhy);
        updateMode();
        return Promise.resolve(false);
      }
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) { modeWhy = 'Este navegador no permite analizar el audio.'; updateMode(); return Promise.resolve(false); }
      try {
        ac = new AC();
        const src = ac.createMediaElementSource(audio);
        const an = ac.createAnalyser(); an.fftSize = 2048; an.smoothingTimeConstant = 0.72;
        gain = ac.createGain(); gain.gain.value = Number(vol.value) / 100;
        src.connect(an); an.connect(gain); gain.connect(ac.destination);
        audio.volume = 1;
        Viz.attach(an, audio);
        analysing = true;
        // Si el navegador suspende el contexto (llamada, otra app…) mientras suena, se intenta reanudar.
        ac.addEventListener('statechange', () => {
          updateMode();
          if (ac.state !== 'running' && !audio.paused) ac.resume().catch(() => {});
        });
      } catch (e) {
        gain = null; analysing = false;
        modeWhy = 'No se pudo iniciar el análisis del audio; la música suena normal.';
        updateMode();
        return Promise.resolve(false);
      }
      return Promise.race([ac.resume().then(() => ac.state === 'running'), new Promise(r => setTimeout(() => r(false), 1500))])
        .then(ok => { updateMode(); return ok; }, () => { updateMode(); return false; });
    }

    function play() {
      wantPlay = true;
      const t = tracks[idx];
      if (ac && ac.state !== 'running') ac.resume().catch(() => {});
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
        if (!audio.error) say(err && err.name === 'NotAllowedError' ? 'Toca reproducir para escuchar.' : 'No se pudo reproducir. Inténtalo otra vez.');
      });
      graph.then(() => { if (gain) gain.gain.value = Number(vol.value) / 100; });
    }
    function pause() { wantPlay = false; audio.pause(); }

    audio.addEventListener('loadedmetadata', () => {
      tDur.textContent = fmtT(audio.duration); seek.disabled = false; restartBtn.disabled = false;
      if (!audio.currentTime || audio.currentTime < 0.05) tCur.textContent = fmtT(Math.min(startOf(tracks[idx]), audio.duration || 0));
    });
    audio.addEventListener('play', () => { if (ac && ac.state !== 'running') ac.resume().catch(() => {}); });
    audio.addEventListener('playing', () => { setState('playing'); setPlaying(true); Viz.wake(); say(''); updateMode(); });
    audio.addEventListener('waiting', () => { if (wantPlay) setState('loading'); updateMode(); });
    // Al mover la barra: el espectro baja mientras busca y sigue el audio NUEVO al terminar.
    audio.addEventListener('seeking', updateMode);
    audio.addEventListener('seeked', () => { Viz.wake(); updateMode(); });
    // Al volver a la pestaña con música, se reanuda el análisis si el navegador lo había detenido.
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && !audio.paused && ac && ac.state !== 'running') ac.resume().catch(() => {});
    });
    audio.addEventListener('pause', () => { setPlaying(false); if (player.dataset.state !== 'error') setState('paused'); });
    // Sin bucle (o con varias canciones): al terminar pasa a la siguiente o se detiene.
    audio.addEventListener('ended', () => {
      setPlaying(false); setState('paused');
      if (tracks.length > 1 && (loopOn || idx < tracks.length - 1)) { load(idx + 1); play(); }
      else { primed = false; tCur.textContent = fmtT(startOf(tracks[idx])); setProgress(0); }
    });
    audio.addEventListener('error', () => {
      if (!audio.getAttribute('src')) return;
      wantPlay = false; audio.muted = false; setPlaying(false); setState('error'); primed = false;
      say(`No se pudo cargar el audio (${tracks[idx].file.split('/').pop()}). Revisa que el archivo esté en assets/audio/ y la ruta en js/config.js.`);
    });
    audio.addEventListener('timeupdate', () => {
      if (!audio.duration) return;
      if (!dragging) { tCur.textContent = fmtT(audio.currentTime); setProgress(audio.currentTime / audio.duration); }
      updateMode();
    });
    // Barra de progreso: se puede arrastrar (ratón o dedo) para avanzar o retroceder.
    seek.addEventListener('input', () => {
      dragging = true;
      const f = seek.value / 1000;
      seekWrap.style.setProperty('--p', f.toFixed(4));
      if (audio.duration) tCur.textContent = fmtT(f * audio.duration);
    });
    const commitSeek = () => {
      if (!dragging) return;
      dragging = false;
      if (audio.duration) { primed = true; audio.currentTime = (seek.value / 1000) * audio.duration; }
    };
    seek.addEventListener('change', commitSeek);
    seek.addEventListener('pointerup', commitSeek);
    seek.addEventListener('touchend', commitSeek, { passive: true });
    const volWrap = $('#volWrap');
    const setVol = () => {
      const v = Number(vol.value) / 100;
      if (gain) gain.gain.value = v; else audio.volume = v;
      volWrap.style.setProperty('--v', v.toFixed(3));
      vol.setAttribute('aria-valuetext', `${vol.value} %`);
      volWrap.classList.toggle('muted', v === 0);
    };
    vol.addEventListener('input', setVol);
    setVol();
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
    load(0);
    updateMode();
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
  /* Velocidad del aro RGB (igual en celular y computadora). Con "reducir animaciones"
     activado en el sistema (en Windows: Accesibilidad › Efectos visuales › Efectos de animación)
     se usa ringSecondsReduced: más calmado, pero sin dejar de girar de forma visible. */
  function applyRingSpeed() {
    const fx = CFG.effects || {};
    const t = REDUCED.matches ? (Number(fx.ringSecondsReduced) || 3) : (Number(fx.ringSeconds) || 1.5);
    document.documentElement.style.setProperty('--ring-time', `${Math.min(20, Math.max(0.6, t))}s`);
  }
  safe('aro', applyRingSpeed);
  if (REDUCED.addEventListener) REDUCED.addEventListener('change', () => safe('aro', applyRingSpeed));
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
  setTimeout(() => safe('paneles', prebuildPanels), 2600);   // después de la animación de entrada
  document.documentElement.classList.add('js-ready');
})();
