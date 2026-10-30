/* =========================================================
   EITO · ARRANQUE
   Los datos se cambian en js/config.js. Cada bloque está aislado:
   si uno falla (estadísticas, música, fondos), el resto sigue funcionando.
   Orden de los archivos (index.html): nucleo → contenido → navegacion → discord →
   estrellas → espectro → reproductor → app.
   ========================================================= */
(() => {
  'use strict';
  const E = window.EITO;
  if (!E || !E.safe) { document.documentElement.classList.add('js-ready'); return; }
  const { CFG, REDUCED, safe, prebuildPanels, renderProfile, bindActions, setupTapGuard, renderDiscordHub, renderSocials,
    renderResources, renderGames, renderClips, setupNav, setupPlayer, startBackgrounds, startStats } = E;

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
  /* Rendimiento: las animaciones continuas de la portada, el reproductor y Discord (aro,
     brillos RGB, reflejos) se pausan cuando su bloque sale de la pantalla y siguen al volver.
     Un solo IntersectionObserver; empieza cuando ya terminó la entrada de la página. */
  function pauseOffscreen() {
    if (!('IntersectionObserver' in window)) return;
    const blocks = ['#inicio', '#player', '#comunidad'].map(s => document.querySelector(s)).filter(Boolean);
    const io = new IntersectionObserver(entries => entries.forEach(en => en.target.classList.toggle('is-off', !en.isIntersecting)));
    blocks.forEach(b => io.observe(b));
  }

  if (E.LITE) document.documentElement.classList.add('lite');
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
  setTimeout(() => safe('pausa fuera de pantalla', pauseOffscreen), 3200);
  // La entrada terminó: desde aquí las animaciones de entrada ya no se aplican, así los brillos
  // temporales (botón de Discord, tarjetas de juegos) no las reinician al terminar.
  setTimeout(() => document.documentElement.classList.add('entered'), 3600);
  document.documentElement.classList.add('js-ready');
})();
