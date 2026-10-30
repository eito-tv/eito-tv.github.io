/* =========================================================
   EITO · CONTENIDO
   Perfil, fondos, redes, recursos, juegos, clips y toques.
   ========================================================= */
(() => {
  'use strict';
  const E = window.EITO = window.EITO || {};
  const { CFG, LINKS, $, $$, esc, IS_ANDROID, IS_IOS, IS_MOBILE, IN_APP_BROWSER, mq, REDUCED, SMALL, safe, ICON, toast, copyText, showManualCopy, openInApp, qrMarkup, actionsMarkup, bindActions, expanders, makeExpander, idle, prebuildPanels, pulseBlock, flash, glideTo, navOffset } = E;

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
    // En modo ligero el fondo cambia con menos frecuencia (cada cambio decodifica una imagen grande).
    const seconds = Math.min(15, Math.max(1.5, Number(CFG.backgroundSeconds) || 2)) * (REDUCED.matches ? 2.5 : 1) * (E.LITE ? 2 : 1);
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
    playlist: '<path d="M3 5.5h12v2.2H3zM3 10h12v2.2H3zM3 14.5h7.5v2.2H3z"/><path d="M17.2 4.2v9.9a2.9 2.9 0 1 0 2.2 2.8V8.1l2.4-.8V5z"/>',
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
      const inside = `
          <span class="sc-icon"><img src="assets/${esc(s.icon)}" alt="" width="30" height="30"></span>
          <span class="sc-text">
            <span class="sc-name">${esc(s.name)}</span>
            <span class="sc-user">${esc(s.user)}</span>
          </span>
          ${statMarkup(s.stat)}
          <span class="chev" aria-hidden="true">›</span>`;
      // direct: toda la tarjeta es un enlace al perfil (mismo diseño, sin panel desplegable).
      if (s.direct && url) {
        card.classList.add('direct');
        card.innerHTML = `<a class="sc-head" href="${esc(url)}" target="_blank" rel="noopener noreferrer" aria-label="Abrir mi perfil de ${esc(s.name)} (${esc(s.user)})" data-tap>${inside}</a>`;
        frag.appendChild(card);
        return;
      }
      card.innerHTML = `
        <button class="sc-head" type="button" aria-expanded="false" aria-controls="panel-${s.id}" data-tap>${inside}
        </button>
        <div class="expand" id="panel-${s.id}"><div class="expand-inner"></div></div>`;
      makeExpander(card, $('.sc-head', card), $('.expand', card), () => `
        <div class="qr-act">
          ${url ? `<div class="qr-box">${qrMarkup(url, `Código QR de ${s.name}`)}<small>Escanea para abrir</small></div>` : ''}
          <div class="acts">${actionsMarkup({ url, app: s.app, appLabel: s.appLabel, appUri: s.appUri, steamClient: s.steamClient, copy: s.copy })}</div>
        </div>
        ${s.note ? `<p class="note">${esc(s.note)}</p>` : ''}`);
      if (s.stat && s.stat.live === 'discord') E.discordCardStat = discordCardStat = $('[data-live="discord"]', card);
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
     CLIPS (sección preparada; se llena desde config.js › clips)
     ========================================================= */
  /* Dónde va la sección de clips:
     - Computadora: en el espacio libre bajo "Mis redes" (columna izquierda).
     - Tableta y celular (una columna): después de "Mis juegos favoritos", para descubrir
       las secciones en orden: redes → recursos → perfiles → juegos → clips. */
  const ONE_COLUMN = mq('(max-width: 1060px)');
  function placeClips() {
    const clips = $('#clips'), col = $('#mainCol'), games = $('#juegos');
    if (!clips || !col || !games) return;
    if (ONE_COLUMN.matches) { if (games.nextElementSibling !== clips) games.after(clips); }
    else if (clips.parentElement !== col) col.appendChild(clips);
  }
  function renderClips() {
    placeClips();
    if (ONE_COLUMN.addEventListener) ONE_COLUMN.addEventListener('change', placeClips);
    const grid = $('#clipGrid');
    if (!grid) return;
    const clips = (CFG.clips || []).filter(c => c && (c.video || c.url));
    if (!clips.length) {
      // Un solo contenedor discreto, con forma de pantalla lista para videos (sin videos inventados).
      grid.innerHTML = `<div class="clip-empty panel">
        <span class="clip-frame" aria-hidden="true"><i></i><svg viewBox="0 0 24 24"><path d="M8 5.5v13l11-6.5z"/></svg><i></i></span>
        <div><span class="soon-tag">PRÓXIMAMENTE</span><b>Mis mejores jugadas</b><span>Próximamente encontrarás aquí mis mejores jugadas.</span></div></div>`;
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

  Object.assign(E, { renderProfile, startBackgrounds, renderDiscordHub, renderSocials, renderResources, renderGames, renderClips, setupTapGuard, lightUpChips, selectGame });
})();
