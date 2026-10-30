/* =========================================================
   EITO · ESTRELLAS DEL FONDO
   Canvas de estrellas doradas entre el fondo y el contenido.
   ========================================================= */
(() => {
  'use strict';
  const E = window.EITO = window.EITO || {};
  const { CFG, LINKS, $, $$, esc, IS_ANDROID, IS_IOS, IS_MOBILE, IN_APP_BROWSER, mq, REDUCED, SMALL, safe, ICON, toast, copyText, showManualCopy, openInApp, qrMarkup, actionsMarkup, bindActions, expanders, makeExpander, idle, prebuildPanels, pulseBlock, flash, glideTo, navOffset } = E;

  /* =========================================================
     ESTRELLAS DORADAS (un solo canvas entre el fondo y el contenido)
     - Estrellas de cuatro puntas en tonos amarillos y dorados, repartidas por zonas
       (rejilla con variación) para que siempre haya en todo el fondo, sin amontonarse.
     - Dos animaciones independientes por estrella:
         · brillo: sube y baja despacio, cada una con su velocidad y su retraso;
         · movimiento: sube y baja unos pocos píxeles alrededor de su sitio.
     - El contenido va por encima (z-index): nunca tapan botones ni textos.
     - ~30 cuadros por segundo; se detiene con la pestaña oculta. Menos en modo ligero.
     ========================================================= */
  const Stars = (() => {
    const fx = CFG.effects || {};
    const canvas = $('#goldStars');
    const ctx = canvas && canvas.getContext ? canvas.getContext('2d') : null;
    const enabled = !!ctx && fx.goldStars !== false;
    let stars = [], raf = 0, last = 0, w = 0, h = 0, energy = 0, boost = 0, avoid = null, lastAvoid = 0, playing = false;
    const COLORS = ['#ffd84a', '#ffc21f', '#fff0a6', '#ffb000', '#ffe27a'];
    const count = () => {
      let n = SMALL.matches ? (fx.maxStarsMobile || 22) : (fx.maxStarsDesktop || 46);
      if (E.LITE) n = Math.round(n * 0.7);   // navegador integrado o equipo modesto
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
    const rnd = (a, b) => a + Math.random() * (b - a);
    // Reparto por zonas: una rejilla de celdas (cols × filas ≈ n) y cada estrella en una celda
    // al azar dentro de ella. Así quedan distribuidas por todo el fondo.
    function layout(n) {
      const cols = Math.max(2, Math.round(Math.sqrt(n * (w / Math.max(1, h))))), rows = Math.ceil(n / cols);
      const cells = [];
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) cells.push([c, r]);
      cells.sort(() => Math.random() - 0.5);
      return Array.from({ length: n }, (_, i) => {
        const [c, r] = cells[i % cells.length];
        return { x: (c + rnd(0.15, 0.85)) / cols, y: (r + rnd(0.15, 0.85)) / rows };
      });
    }
    function make(i, home) {
      return {
        x: home.x, y: home.y,
        size: (SMALL.matches ? 7 : 9) + Math.random() * (SMALL.matches ? 8 : 12),
        rot: rnd(-0.3, 0.3), spr: sprites[i % sprites.length], base: rnd(0.45, 0.85),
        // v13 · Pausa: unas 3 de cada 10 llegan a apagarse del todo en su ciclo (floor 0).
        floor: Math.random() < 0.3 ? 0 : rnd(0.18, 0.32),
        // v13 · Con música: 1 de cada 4 es de reserva (solo aparece sonando, cada una a su tiempo)
        // y la mitad sigue además la intensidad del audio.
        reserve: i % 4 === 3, th: rnd(0, 0.75), react: Math.random() < 0.5,
        // Brillo: su propia velocidad (ciclos de ~4 a ~14 s) y su propio retraso (fase).
        tw: rnd(0.45, 1.5), ph: Math.random() * 6.283,
        // Movimiento: sube y baja despacio (6-14 px, ciclos de ~10 a ~25 s) con un leve vaivén lateral.
        ba: rnd(6, 14), bs: rnd(0.25, 0.6), bp: Math.random() * 6.283, sa: rnd(2, 5)
      };
    }
    function resize() {
      w = window.innerWidth; h = window.innerHeight;
      canvas.width = w; canvas.height = h;   // resolución normal: son difusas y así cuestan menos
      const n = count(), homes = layout(n);
      stars = homes.map((p, i) => make(i, p));
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
      boost += ((playing ? 1 : 0) - boost) * Math.min(1, dt * 0.8);   // ~2 s para pasar de pausa a música
      const av = avoidRect(t);
      const still = REDUCED.matches;                                   // movimiento reducido: solo brillo, sin desplazarse
      for (const s of stars) {
        // Con música todo va un poco más vivo (el cambio entra suave con boost, de 0 a 1).
        s.ph += s.tw * dt * (1 + boost * 0.35); s.bp += s.bs * dt * (1 + boost * 0.45);
        const amp = 1 + boost * 0.25;
        const x = s.x * w + (still ? 0 : Math.sin(s.bp * 0.7) * s.sa * amp);
        const y = s.y * h + (still ? 0 : Math.sin(s.bp) * s.ba * amp);
        const glow = 0.5 + 0.5 * Math.sin(s.ph);                       // 0 = tenue · 1 = brillante
        // Las de reserva aparecen poco a poco al sonar la música (cada una con su umbral).
        const show = s.reserve ? Math.min(1, Math.max(0, (boost - s.th) / 0.25)) : 1;
        if (show <= 0) continue;
        const pulse = s.react ? energy * 0.32 : energy * 0.08;          // parte del brillo sigue a los graves
        let a = show * s.base * (s.floor + (1 - s.floor) * glow) * (0.85 + boost * 0.12 + pulse);
        if (av) { const d = Math.hypot(x - av.x, y - av.y); if (d < av.r) a *= Math.max(0, (d - av.r * 0.55) / (av.r * 0.45)); }
        if (a <= 0.03) continue;
        const sz = s.size * (0.86 + 0.14 * glow) * (1 + (s.react ? energy * 0.16 : energy * 0.05));
        ctx.globalAlpha = Math.min(1, a);
        ctx.setTransform(1, 0, 0, 1, x, y); ctx.rotate(s.rot);
        ctx.drawImage(s.spr, -sz, -sz, sz * 2, sz * 2);
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1;
    }
    // ~30 cuadros por segundo: suficiente para un movimiento tan lento y ahorra batería.
    function frame(t) {
      raf = requestAnimationFrame(frame);
      if (t - last < (REDUCED.matches ? 64 : 32)) return;
      const dt = Math.min(0.1, (t - (last || t)) / 1000); last = t;
      draw(dt, t);
    }
    // Con movimiento reducido siguen brillando (sin desplazarse) a ~15 cuadros por segundo.
    function run() { if (!raf && !document.hidden) { last = 0; raf = requestAnimationFrame(frame); } }
    function halt() { cancelAnimationFrame(raf); raf = 0; }
    if (enabled) {
      resize(); run();
      // Al girar el celular o cambiar el tamaño, se recalcula una sola vez (no en cada píxel).
      // En celular la barra del navegador cambia la altura al desplazarse: solo se rehace si cambia el ancho
      // o la altura más de 120 px (así las estrellas no "saltan" de sitio al hacer scroll).
      let rt = 0; window.addEventListener('resize', () => {
        clearTimeout(rt);
        rt = setTimeout(() => { if (window.innerWidth !== w || Math.abs(window.innerHeight - h) > 120) resize(); }, 150);
      }, { passive: true });
      document.addEventListener('visibilitychange', () => (document.hidden ? halt() : run()));
    } else if (canvas) canvas.hidden = true;
    return {
      setEnergy(e) { energy = e; },
      setPlaying(p) { playing = !!p; },
      get count() { return stars.length; },
      get running() { return !!raf; }
    };
  })();


  Object.assign(E, { Stars });
})();