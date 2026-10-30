/* =========================================================
   EITO · DISCORD EN VIVO
   Cifras reales de la API pública de invitaciones y contadores animados.
   ========================================================= */
(() => {
  'use strict';
  const E = window.EITO = window.EITO || {};
  const { CFG, LINKS, $, $$, esc, IS_ANDROID, IS_IOS, IS_MOBILE, IN_APP_BROWSER, mq, REDUCED, SMALL, safe, ICON, toast, copyText, showManualCopy, openInApp, qrMarkup, actionsMarkup, bindActions, expanders, makeExpander, idle, prebuildPanels, pulseBlock, flash, glideTo, navOffset } = E;

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
    // El primer conteo empieza cuando el contador se VE de verdad (en celular queda más abajo
    // y antes terminaba sin que nadie lo viera). Si la pestaña está oculta, espera a que se vea.
    const go = () => requestAnimationFrame(step);
    const whenTabVisible = fn => {
      if (!document.hidden) return fn();
      document.addEventListener('visibilitychange', function v() { if (!document.hidden) { document.removeEventListener('visibilitychange', v); fn(); } });
    };
    if (first) whenOnScreen(() => whenTabVisible(go)); else whenTabVisible(go);
  }
  /* Un solo IntersectionObserver para el bloque de cifras: avisa una vez cuando entra
     en pantalla y luego se desconecta. Sin soporte (navegadores viejos), arranca enseguida. */
  let onScreen = false, onScreenQueue = [];
  function whenOnScreen(fn) {
    if (onScreen) return fn();
    onScreenQueue.push(fn);
    if (onScreenQueue.length > 1) return;
    const box = $('#hubStats');
    const fire = () => { onScreen = true; countClock = 0; const q = onScreenQueue; onScreenQueue = []; q.forEach(f => f()); };
    if (!box || !('IntersectionObserver' in window)) return fire();
    const io = new IntersectionObserver(entries => {
      if (!entries.some(en => en.isIntersecting)) return;
      io.disconnect(); fire();
    }, { threshold: 0.5 });
    io.observe(box);
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
      else { live.dataset.state = 'live'; live.lastChild.textContent = `Actualizado en tiempo real · ${hhmm(hub.at)}`; }
    } else if (hub.state === 'loading') {
      live.dataset.state = 'loading'; live.lastChild.textContent = 'Conectando con Discord…';
      note.textContent = '';
    } else {
      mEl.textContent = '—'; oEl.textContent = '—'; onlineBox.hidden = false;
      live.dataset.state = 'error'; live.lastChild.textContent = 'Sin conexión con Discord';
      note.innerHTML = 'No se pudieron cargar las cifras de Discord ahora. El botón para unirte funciona igual. <button type="button" class="hub-retry" id="hubRetry">Reintentar</button>';
    }
    // La tarjeta de Discord en "Mis redes" muestra la misma cifra real (sin animación).
    if (E.discordCardStat) E.discordCardStat.textContent = hub.state === 'ok' && validNumber(hub.members) ? nf.format(hub.members) : '—';
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
  const hhmm = ms => new Date(ms).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

  /* Botón pequeño "actualizar" junto a "Actualizado en tiempo real".
     Una consulta a la vez (el botón se desactiva mientras tanto) y un giro mientras consulta.
     Si Discord no responde, se avisa y se conservan las cifras reales anteriores. */
  async function manualRefresh(btn) {
    if (fetching || btn.disabled) return;
    btn.disabled = true; btn.classList.add('spinning'); btn.removeAttribute('data-state');
    const before = hub.at, t0 = Date.now();
    await refreshDiscord();
    // El giro dura al menos una vuelta, para que se note que se consultó.
    setTimeout(() => {
      btn.classList.remove('spinning'); btn.disabled = false;
      const ok = hub.at > before;
      btn.dataset.state = ok ? 'ok' : 'error';
      btn.setAttribute('aria-label', ok ? 'Cifras de Discord actualizadas. Actualizar otra vez' : 'No se pudo actualizar. Reintentar');
      if (!ok) E.toast('Discord no respondió. Se mantienen las últimas cifras reales.', 'info', 3200);
    }, Math.max(0, 700 - (Date.now() - t0)));
  }

  function startStats() {
    renderHub(); refreshDiscord();
    document.addEventListener('click', e => {
      if (e.target.closest('#hubRetry')) { hub.state = 'loading'; hub.tries = 0; renderHub(); refreshDiscord(); return; }
      const rb = e.target.closest('#hubRefresh');
      if (rb) manualRefresh(rb);
    });
    // Un solo temporizador: consulta de nuevo solo si la página está a la vista.
    setInterval(() => { if (document.visibilityState === 'visible') refreshDiscord(); else if (hub.state === 'ok') renderHub(); }, POLL_MS);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && Date.now() - lastFetch > POLL_MS) refreshDiscord();
    });
  }


  Object.assign(E, { startStats });
})();
