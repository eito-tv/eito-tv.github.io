/* =========================================================
   EITO · NÚCLEO
   Utilidades compartidas: selectores, avisos, copiar, enlaces, QR, paneles,
   resaltados y desplazamiento suave. Lo usan todos los demás archivos.
   ========================================================= */
(() => {
  'use strict';
  const E = window.EITO = window.EITO || {};

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
  /* Modo ligero: navegadores integrados (Instagram, TikTok, Facebook), "ahorro de datos"
     o equipos modestos. Mismo diseño con menos trabajo (ver responsive.css › .lite). */
  const conn = navigator.connection || {};
  E.LITE = IN_APP_BROWSER || conn.saveData === true
    || (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4;

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

  Object.assign(E, { CFG, LINKS, $, $$, esc, IS_ANDROID, IS_IOS, IS_MOBILE, IN_APP_BROWSER, mq, REDUCED, SMALL, safe, ICON, toast, copyText, showManualCopy, openInApp, qrMarkup, actionsMarkup, bindActions, expanders, makeExpander, idle, prebuildPanels, pulseBlock, flash, glideTo, navOffset });
})();
