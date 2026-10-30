/* =========================================================
   EITO · ESPECTRO DE AUDIO
   Barras alrededor del aro y reacción del aro RGB (AnalyserNode real).
   ========================================================= */
(() => {
  'use strict';
  const E = window.EITO = window.EITO || {};
  const { CFG, LINKS, $, $$, esc, IS_ANDROID, IS_IOS, IS_MOBILE, IN_APP_BROWSER, mq, REDUCED, SMALL, safe, ICON, toast, copyText, showManualCopy, openInApp, qrMarkup, actionsMarkup, bindActions, expanders, makeExpander, idle, prebuildPanels, pulseBlock, flash, glideTo, navOffset, Stars } = E;

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
    let bass = 0, mid = 0, tre = 0, avgBass = 0, lastHit = 0, hue = 0, ring = 0, lastRing = -1;
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
      // Aro RGB reactivo: intensidad de la música (graves + un poco de medios) con un suavizado
      // extra (sube en ~0.2 s y baja en ~0.6 s): respira con el ritmo sin movimientos bruscos.
      const ringT = Math.min(1, bass * 0.8 + mid * 0.45);
      ring += (ringT - ring) * (ringT > ring ? 0.16 : 0.05);
      wrap.style.setProperty('--bass', bass.toFixed(3));
      wrap.style.setProperty('--tre', tre.toFixed(3));
      // Solo se escribe si cambió de verdad (menos recálculos de estilo por cuadro).
      if (Math.abs(ring - lastRing) > 0.004) { lastRing = ring; wrap.style.setProperty('--ring', ring.toFixed(3)); }
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
      let busy = wanted || bass > 0.004 || ring > 0.01 || waves.length > 0;   // el aro vuelve a reposo suave
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
        ['--bass', '--tre', '--ring'].forEach(v => wrap.style.setProperty(v, '0')); ring = 0; lastRing = -1;
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


  Object.assign(E, { Viz });
})();
