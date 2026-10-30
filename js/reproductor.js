/* =========================================================
   EITO · REPRODUCTOR
   Reproductor propio: un <audio>, un AudioContext y un analizador.
   ========================================================= */
(() => {
  'use strict';
  const E = window.EITO = window.EITO || {};
  const { CFG, LINKS, $, $$, esc, IS_ANDROID, IS_IOS, IS_MOBILE, IN_APP_BROWSER, mq, REDUCED, SMALL, safe, ICON, toast, copyText, showManualCopy, openInApp, qrMarkup, actionsMarkup, bindActions, expanders, makeExpander, idle, prebuildPanels, pulseBlock, flash, glideTo, navOffset, Viz } = E;

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


  Object.assign(E, { setupPlayer });
})();
