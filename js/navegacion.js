/* =========================================================
   EITO · NAVEGACIÓN
   Barra superior: desplazamiento, efectos al llegar y sección activa.
   ========================================================= */
(() => {
  'use strict';
  const E = window.EITO = window.EITO || {};
  const { CFG, LINKS, $, $$, esc, IS_ANDROID, IS_IOS, IS_MOBILE, IN_APP_BROWSER, mq, REDUCED, SMALL, safe, ICON, toast, copyText, showManualCopy, openInApp, qrMarkup, actionsMarkup, bindActions, expanders, makeExpander, idle, prebuildPanels, pulseBlock, flash, glideTo, navOffset, lightUpChips } = E;

  /* =========================================================
     NAVEGACIÓN con resaltado del destino
     ========================================================= */
  // Qué se resalta al llegar a cada sección desde la barra (se repite en cada pulsación).
  const NAV_EFFECTS = {
    // Recursos: los botones se iluminan uno después de otro (nunca todos a la vez).
    recursos: () => flash('#recursos .res-tile, #recursos .guide-chip', { cls: 'seq-flash', step: 140 }),
    // Juegos: los botones de juegos se encienden del primero al último con el color de cada juego.
    juegos: () => lightUpChips({ nav: true }),
    // Comunidad: solo el botón "Únete al servidor".
    comunidad: () => pulseBlock('#joinBtn', 'join-glow')
  };

  /* Inicio = recargar la página (solo cuando la persona lo pulsa).
     Antes de recargar se quita el #ancla y se pide no restaurar el desplazamiento:
     la página vuelve arriba, repite la entrada y pide cifras nuevas a Discord. */
  function reloadHome() {
    try { history.scrollRestoration = 'manual'; } catch (_) { /* navegadores sin soporte */ }
    history.replaceState(null, '', location.pathname + location.search);
    window.scrollTo(0, 0);
    window.location.reload();
  }
  // Tras esa recarga se devuelve el comportamiento normal del navegador (F5 sí restaura).
  if ('scrollRestoration' in history && history.scrollRestoration === 'manual') {
    window.scrollTo(0, 0);
    window.addEventListener('load', () => { history.scrollRestoration = 'auto'; }, { once: true });
  }

  /* Celular: indicador discreto "desliza" al pie de la portada. Desaparece en cuanto la
     persona empieza a desplazarse (y no vuelve). Sin ventanas ni textos invasivos. */
  function setupScrollHint() {
    const hint = $('#scrollHint');
    if (!hint) return;
    const hide = () => {
      hint.classList.add('gone');
      window.removeEventListener('scroll', onScroll);
      setTimeout(() => { hint.hidden = true; }, 600);
    };
    const onScroll = () => { if (window.scrollY > 40) hide(); };
    if (window.scrollY > 40) { hint.hidden = true; return; }
    window.addEventListener('scroll', onScroll, { passive: true });
    setTimeout(() => { if (!hint.hidden) hide(); }, 9000);   // tampoco se queda para siempre (no molesta)
    hint.addEventListener('click', () => {
      const t = $('#redes');
      if (t) glideTo(t.getBoundingClientRect().top + window.scrollY - navOffset());
    });
  }

  /* Al llegar a una sección (desplazándose a mano), su título se revela con un fundido corto.
     Un solo IntersectionObserver; cada título se observa una vez y luego se deja de observar. */
  function setupSectionReveal() {
    const titles = $$('.section-title, .side-head');
    if (!titles.length || REDUCED.matches || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(entries => entries.forEach(en => {
      if (!en.isIntersecting) return;
      en.target.classList.add('seen');
      io.unobserve(en.target);
    }), { rootMargin: '0px 0px -12% 0px' });
    titles.forEach(t => {
      // Lo que ya se ve al cargar no se oculta (sin saltos).
      if (t.getBoundingClientRect().top < window.innerHeight) return;
      t.classList.add('reveal'); io.observe(t);
    });
  }

  let navLock = 0;
  function setupNav() {
    const nav = $('.topnav');
    const links = $$('[data-nav]');
    links.forEach(a => a.addEventListener('click', e => {
      const key = a.dataset.nav;
      if (key === 'inicio') { e.preventDefault(); reloadHome(); return; }
      // "Juegos" lleva a los botones de juegos (bajo mi nombre), que son los que se iluminan.
      const chips = key === 'juegos' ? $('#gameChips') : null;
      const target = chips || document.getElementById(key);
      if (!target) return;
      e.preventDefault();
      // La barra es fija: se deja su altura + un margen para que no tape el título.
      const r = target.getBoundingClientRect();
      const top = chips ? Math.min(r.top + window.scrollY - navOffset(), r.top + window.scrollY - (window.innerHeight - r.height) / 2)
        : r.top + window.scrollY - navOffset();
      navLock = Date.now() + 2000;   // mientras se desplaza, queda marcada la opción pulsada
      glideTo(top, () => { navLock = Date.now() + 250; (NAV_EFFECTS[key] || (() => {}))(); });
      history.replaceState(null, '', `#${key}`);
      a.classList.remove('pulse'); void a.offsetWidth; a.classList.add('pulse');
      $$('.nav-links a').forEach(x => x.classList.toggle('active', x.dataset.nav === key));
    }));

    // Marca en la barra la sección visible (también al desplazarse a mano).
    const ids = ['inicio', 'comunidad', 'recursos', 'juegos'];   // los clips no están en la barra
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
    setupScrollHint();
    setupSectionReveal();
  }

  Object.assign(E, { setupNav });
})();
