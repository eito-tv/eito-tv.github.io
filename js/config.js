/* =========================================================
   EITO · CONFIGURACIÓN
   Todo lo que probablemente cambiarás está aquí.
   No hace falta tocar index.html, css ni app.js.
   ========================================================= */
(() => {
  window.EITO_CONFIG = {

    /* ---------- Perfil ---------- */
    profile: {
      name: 'E I T O',
      subtitle: 'Página hecha por mí',
      tagline: 'GAMING · CONFIGURACIONES · COMUNIDAD',
      // Imagen superior dentro del aro RGB: el logo oficial de EITO (no se deforma).
      logo: 'assets/perfil/eito-logo.webp',
      // Opcional: una foto en lugar del logo. Vacío = se muestra el logo.
      photo: ''
    },

    /* ---------- Enlaces ---------- */
    links: {
      discordInvite: 'https://discord.gg/ReUtMYvgrx', // verificado: servidor "E I T O", invitación permanente
      youtube: 'https://www.youtube.com/@eito_ttv',
      tiktok: 'https://www.tiktok.com/@eito_mvp',
      instagram: 'https://www.instagram.com/edwin_eito/',
      twitch: 'https://www.twitch.tv/eito_ttv',
      steam: 'https://steamcommunity.com/profiles/76561199100788703/',
      xbox: 'https://www.xbox.com/es-MX/play/user/Eito%20TTV',
      // PlayStation: el enlace público profile.playstation.com/Eito-MVP mostraba "Algo ha salido mal"
      // al comprobarlo, así que la tarjeta solo copia el ID online. Si tienes un enlace que funcione, ponlo aquí.
      playstation: '',
      // GitHub: la cuenta de esta página (eito-tv.github.io). Si quieres que la tarjeta abra
      // directamente el repositorio del Autoexec, pon aquí su dirección completa en githubAutoexec.
      github: 'https://github.com/eito-tv',
      githubAutoexec: '',
      spotifyProfile: 'https://open.spotify.com/user/mwsxfj27v8s7nly1zycgg9m4a' // ya no se usa en el reproductor (queda como dato)
    },

    /* ---------- Discord (sección destacada) ---------- */
    discord: {
      serverName: 'E I T O',
      description: 'Comunidad gamer en español · L4D2 y mucho más',
      personalUser: 'eitotv' // tu usuario personal de Discord (se puede copiar)
    },

    /* ---------- Tarjetas de redes (en este orden) ----------
       app: true  → muestra "Abrir en la aplicación" en móvil.
       copy: lista de { label, value, msg } que se pueden copiar.
       stat: el dato que se ve a la derecha de la tarjeta (texto fijo, escrito a mano):
             { value: '600 mil', label: 'likes' }. Sin stat = no se muestra nada.
             Discord usa { live: 'discord' }: miembros reales del servidor, en vivo.
             icon: símbolo junto a la cifra (like, award, star, person, medal, trophy, members).
       Instagram ya no aparece en las tarjetas (su enlace sigue guardado en links). */
    socials: [
      { id: 'tiktok', name: 'TikTok', user: '@eito_mvp', icon: 'tiktok.svg', app: true,
        stat: { value: '600 mil', label: 'likes', icon: 'like' },
        copy: [{ label: 'Copiar usuario', value: '@eito_mvp', msg: 'Usuario de TikTok copiado' }] },
      { id: 'steam', name: 'Steam', user: 'E I T O TT', icon: 'steam.svg', steamClient: true,
        stat: { value: '8', label: 'premios de la comunidad', icon: 'award' },
        copy: [{ label: 'Copiar URL', value: 'link', msg: 'URL de Steam copiada' },
               { label: 'Copiar código de amigo', value: '1140522975', msg: 'Código de amigo de Steam copiado' }] },
      { id: 'github', name: 'GitHub', user: 'eito-tv', icon: 'github.svg', urlKey: 'github',
        stat: { value: '9', label: 'estrellas', title: '9 estrellas', icon: 'star' },
        copy: [{ label: 'Copiar usuario', value: 'eito-tv', msg: 'Usuario de GitHub copiado' }] },
      { id: 'youtube', name: 'YouTube', user: '@eito_ttv', icon: 'youtube.svg', app: true,
        stat: { value: '200', label: 'seguidores', icon: 'person' },
        copy: [{ label: 'Copiar identificador', value: '@eito_ttv', msg: 'Identificador de YouTube copiado' }] },
      { id: 'xbox', name: 'Xbox', user: 'Eito TTV', icon: 'xbox.svg',
        stat: { value: '1,200', label: 'seguidores', icon: 'medal' },
        note: 'Xbox pide iniciar sesión para ver perfiles.',
        copy: [{ label: 'Copiar gamertag', value: 'Eito TTV', msg: 'Gamertag de Xbox copiado' }] },
      { id: 'playstation', name: 'PlayStation', user: 'Eito-MVP', icon: 'playstation.svg',
        stat: { icon: 'trophy', title: 'Trofeos y comunidad de PlayStation' },
        copy: [{ label: 'Copiar ID online', value: 'Eito-MVP', msg: 'ID de PlayStation copiado' }] },
      { id: 'twitch', name: 'Twitch', user: 'eito_ttv', icon: 'twitch.svg', app: true,
        stat: { value: '50', label: 'seguidores', icon: 'person' },
        copy: [{ label: 'Copiar canal', value: 'eito_ttv', msg: 'Canal de Twitch copiado' }] },
      { id: 'discord', name: 'Discord', user: 'Servidor E I T O', icon: 'discord.svg', app: true, urlKey: 'discordInvite',
        stat: { live: 'discord', label: 'miembros', icon: 'members' },
        copy: [{ label: 'Copiar invitación', value: 'link', msg: 'Invitación de Discord copiada' },
               { label: 'Copiar mi usuario', value: 'eitotv', msg: 'Usuario de Discord copiado' }] }
    ],

    /* ---------- Perfiles de juegos ----------
       url: abre el perfil · copy: se copia al pulsar (ID, etiqueta o nombre).
       Sin url ni copy = "Perfil próximamente". */
    gameProfiles: [
      { name: 'Steam', detail: 'E I T O TT', url: 'https://steamcommunity.com/profiles/76561199100788703/', color: '#66c0f4', icon: 'steam.svg' },
      { name: 'Roblox', detail: 'えどうぃん愛', url: 'https://www.roblox.com/es/users/3318500847/profile', color: '#e8eaed', logo: 'assets/logos-juegos/roblox.svg', invert: true },
      { name: 'Epic Games', detail: 'E I T O 栄人', copy: 'E I T O 栄人', copyMsg: 'Nombre de Epic Games copiado', color: '#9d4dff', logo: 'assets/logos-juegos/fortnite.svg' },
      { name: 'Brawl Stars', detail: '#2RRROY98LY', copy: '#2RRROY98LY', copyMsg: 'Etiqueta de Brawl Stars copiada', color: '#ffc400', logo: 'assets/logos-juegos/brawlstars.webp' },
      { name: 'Xbox', detail: 'Eito TTV', url: 'https://www.xbox.com/es-MX/play/user/Eito%20TTV', color: '#2bd65a', icon: 'xbox.svg' },
      { name: 'PlayStation', detail: 'Eito-MVP', copy: 'Eito-MVP', copyMsg: 'ID online de PlayStation copiado', color: '#2f8cff', icon: 'playstation.svg' }
    ],

    /* ---------- Mis 7 juegos favoritos ----------
       logo: logotipo oficial (assets/logos-juegos/) · image: imagen oficial del juego.
       profile: mi perfil en ese juego (url para abrir, copy para copiar).
       Los botones bajo mi nombre (solo logotipo) y las tarjetas de la galería
       hacen LO MISMO: bajan despacio hasta la tarjeta del juego y abren su ficha.
       chipColor: color propio del botón bajo mi nombre (borde y luz suave). accent: galería y ficha. */
    games: [
      { id: 'l4d2', name: 'Left 4 Dead 2', short: 'L4D2', logo: 'assets/logos-juegos/l4d2.webp', image: 'assets/juegos/l4d2-pantano.webp', accent: '#d63a2f', chipColor: '#b3141c',
        profile: { label: 'Mi perfil de Steam', url: 'https://steamcommunity.com/profiles/76561199100788703/' }, resources: true },
      { id: 'minecraft', name: 'Minecraft', short: 'Minecraft', logo: 'assets/logos-juegos/minecraft.svg', image: 'assets/juegos/minecraft-bosque.webp', accent: '#5aa02c', chipColor: '#2e8b2e' },
      { id: 'warzone', name: 'Call of Duty: Warzone', short: 'Warzone', logo: 'assets/logos-juegos/warzone.webp', image: 'assets/juegos/warzone-ciudad.webp', accent: '#9bbf3b', chipColor: '#8f2d1c' },
      { id: 'fortnite', name: 'Fortnite', short: 'Fortnite', logo: 'assets/logos-juegos/fortnite.svg', image: 'assets/juegos/fortnite-cielo.webp', accent: '#9d4dff', chipColor: '#2f7dff',
        profile: { label: 'Nombre en Epic Games', copy: 'E I T O 栄人', msg: 'Nombre de Epic Games copiado' } },
      { id: 'overwatch', name: 'Overwatch 2', short: 'Overwatch 2', logo: 'assets/logos-juegos/overwatch.svg', image: 'assets/juegos/overwatch-base.webp', accent: '#f99e1a', chipColor: '#f28c12' },
      { id: 'roblox', name: 'Roblox', short: 'Roblox', logo: 'assets/logos-juegos/roblox.svg', logoInvert: true, image: 'assets/juegos/roblox-dragones.webp', accent: '#e8eaed', chipColor: '#c4c9d1',
        profile: { label: 'Mi perfil de Roblox', url: 'https://www.roblox.com/es/users/3318500847/profile' } },
      { id: 'brawlstars', name: 'Brawl Stars', short: 'Brawl Stars', logo: 'assets/logos-juegos/brawlstars.webp', image: 'assets/juegos/brawl-desierto.webp', accent: '#ffc400', chipColor: '#c99a06',
        profile: { label: 'Mi etiqueta', copy: '#2RRROY98LY', msg: 'Etiqueta de Brawl Stars copiada' } }
    ],

    /* ---------- Fondos del carrusel ----------
       PC (1280-1600 px) y móvil (576x1024) en assets/fondos/.
       Minecraft es el protagonista; Left 4 Dead 2 y Warzone aparecen de vez en cuando.
       Están ordenados por luz (día → atardecer → noche) para que el cambio sea suave.
       dim: oscurecimiento extra (0 a 0.4) para imágenes muy claras. */
    backgrounds: [
      { game: 'Minecraft', desktop: 'assets/fondos/mc-bosque-luz-pc.webp', mobile: 'assets/fondos/mc-bosque-luz-movil.webp', dim: 0.12 },
      { game: 'Minecraft', desktop: 'assets/fondos/mc-llanura-montanas-pc.webp', mobile: 'assets/fondos/mc-llanura-montanas-movil.webp', dim: 0.12 },
      { game: 'Minecraft', desktop: 'assets/fondos/mc-aldea-llanura-pc.webp', mobile: 'assets/fondos/mc-aldea-llanura-movil.webp', dim: 0.12 },
      { game: 'Minecraft', desktop: 'assets/fondos/minecraft-bosque-pc.webp', mobile: 'assets/fondos/minecraft-bosque-movil.webp' },
      { game: 'Minecraft', desktop: 'assets/fondos/mc-montanas-bosque-pc.webp', mobile: 'assets/fondos/mc-montanas-bosque-movil.webp', dim: 0.15 },
      { game: 'Call of Duty: Warzone', desktop: 'assets/fondos/warzone-ciudad-pc.webp', mobile: 'assets/fondos/warzone-ciudad-movil.webp' },
      { game: 'Minecraft', desktop: 'assets/fondos/mc-picos-nevados-pc.webp', mobile: 'assets/fondos/mc-picos-nevados-movil.webp', dim: 0.18 },
      { game: 'Minecraft', desktop: 'assets/fondos/mc-lago-helado-pc.webp', mobile: 'assets/fondos/mc-lago-helado-movil.webp', dim: 0.18 },
      { game: 'Minecraft', desktop: 'assets/fondos/mc-nieve-aldea-pc.webp', mobile: 'assets/fondos/mc-nieve-aldea-movil.webp', dim: 0.18 },
      { game: 'Minecraft', desktop: 'assets/fondos/mc-lago-montanas-pc.webp', mobile: 'assets/fondos/mc-lago-montanas-movil.webp', dim: 0.15 },
      { game: 'Minecraft', desktop: 'assets/fondos/mc-picos-rio-pc.webp', mobile: 'assets/fondos/mc-picos-rio-movil.webp', dim: 0.15 },
      { game: 'Call of Duty: Warzone', desktop: 'assets/fondos/warzone-nieve-pc.webp', mobile: 'assets/fondos/warzone-nieve-movil.webp' },
      { game: 'Minecraft', desktop: 'assets/fondos/mc-valle-frondoso-pc.webp', mobile: 'assets/fondos/mc-valle-frondoso-movil.webp', dim: 0.1 },
      { game: 'Minecraft', desktop: 'assets/fondos/mc-cueva-montana-pc.webp', mobile: 'assets/fondos/mc-cueva-montana-movil.webp' },
      { game: 'Minecraft', desktop: 'assets/fondos/mc-desierto-pc.webp', mobile: 'assets/fondos/mc-desierto-movil.webp', dim: 0.12 },
      { game: 'Minecraft', desktop: 'assets/fondos/mc-canal-jungla-pc.webp', mobile: 'assets/fondos/mc-canal-jungla-movil.webp' },
      { game: 'Minecraft', desktop: 'assets/fondos/mc-tundra-atardecer-pc.webp', mobile: 'assets/fondos/mc-tundra-atardecer-movil.webp' },
      { game: 'Minecraft', desktop: 'assets/fondos/mc-jungla-atardecer-pc.webp', mobile: 'assets/fondos/mc-jungla-atardecer-movil.webp' },
      { game: 'Minecraft', desktop: 'assets/fondos/mc-mesa-lago-pc.webp', mobile: 'assets/fondos/mc-mesa-lago-movil.webp' },
      { game: 'Minecraft', desktop: 'assets/fondos/mc-badlands-rio-pc.webp', mobile: 'assets/fondos/mc-badlands-rio-movil.webp' },
      { game: 'Minecraft', desktop: 'assets/fondos/mc-manglar-atardecer-pc.webp', mobile: 'assets/fondos/mc-manglar-atardecer-movil.webp' },
      { game: 'Left 4 Dead 2', desktop: 'assets/fondos/l4d2-pantano-pc.webp', mobile: 'assets/fondos/l4d2-pantano-movil.webp' },
      { game: 'Minecraft', desktop: 'assets/fondos/mc-cueva-frondosa-pc.webp', mobile: 'assets/fondos/mc-cueva-frondosa-movil.webp' },
      { game: 'Minecraft', desktop: 'assets/fondos/mc-aldea-noche-pc.webp', mobile: 'assets/fondos/mc-aldea-noche-movil.webp' },
      { game: 'Left 4 Dead 2', desktop: 'assets/fondos/l4d2-niebla-pc.webp', mobile: 'assets/fondos/l4d2-niebla-movil.webp' },
      { game: 'Minecraft', desktop: 'assets/fondos/mc-noche-pc.webp', mobile: 'assets/fondos/mc-noche-movil.webp' },
      { game: 'Left 4 Dead 2', desktop: 'assets/fondos/l4d2-puente-pc.webp', mobile: 'assets/fondos/l4d2-puente-movil.webp' }
    ],
    backgroundSeconds: 2,   // cada cuánto cambia el fondo (en segundos)
    backgroundFade: 1.2,    // duración del fundido cruzado (en segundos)

    /* ---------- Música (reproductor propio con archivos locales) ----------
       Pon tus canciones en assets/audio/ y añádelas a "tracks".
       Si hay más de una, aparecen los botones de anterior y siguiente.
       · startSeconds: segundo desde el que empieza al pulsar Reproducir
         (y al que vuelve el botón ↺). 0 = desde el principio.
       · cover: portada que se ve en el reproductor (solo ahí).
       · tag: etiqueta pequeña junto al artista (por ejemplo "Fragmento").
       Usa solo audio que tengas permiso de usar. Nunca suena sola al abrir la página. */
    music: {
      volume: 0.5,               // volumen inicial (0.5 = 50 %)
      loop: true,                // true = la canción se repite sin fin hasta que se pause
      tracks: [
        {
          title: 'CALL ME',
          artist: '90sFlav',
          file: 'assets/audio/call-me.mp3',
          startSeconds: 0,       // ← segundo desde el que empieza al pulsar Reproducir
          // Portada actual: el logo de EITO. Para usar la imagen de referencia de la
          // canción, cambia a: 'assets/audio/referencia-portada-call-me.jpg'
          cover: 'assets/audio/portada-eito.jpg'
        }
      ]
    },

    /* ---------- Recursos de Left 4 Dead 2 ----------
       file: archivo dentro del proyecto (botón Descargar, solo si existe).
       url: enlace externo (botón Abrir). Ambos vacíos = Próximamente. */
    resources: [
      { id: 'autoexec', title: 'Mi autoexec.cfg', short: 'Autoexec.cfg', desc: 'Mi configuración personal lista para copiar a la carpeta cfg.', file: '', url: '', tag: 'CFG', icon: 'cfg' },
      { title: 'Configuraciones competitivas', short: 'Competitivo', desc: 'Ajustes para versus y partidas competitivas.', file: '', url: '', tag: 'VERSUS', icon: 'target' },
      { title: 'Packs de mods', short: 'Mods', desc: 'Mods que uso y recomiendo.', file: '', url: '', tag: 'MODS', icon: 'crate' },
      { title: 'HUDs', short: 'HUDs', desc: 'Interfaces limpias y fáciles de leer.', file: '', url: '', tag: 'HUD', icon: 'hud' },
      { title: 'Optimizaciones', short: 'Optimización', desc: 'Más FPS y menos tirones en PC.', file: '', url: '', tag: 'FPS', icon: 'bolt' },
      { title: 'Guías y tutoriales', short: 'Guías', desc: 'Paso a paso, explicado fácil.', file: '', url: '', tag: 'GUÍA', icon: 'book' }
    ],
    // Otras guías (PC en general). url vacía = Próximamente.
    guides: [
      { title: 'WINDOWS', sub: 'Optimización', url: '' },
      { title: 'NVIDIA', sub: 'Configuración', url: '' },
      { title: 'GAMING', sub: 'FPS y ajustes', url: '' }
    ],

    /* ---------- Discord en vivo ----------
       Los miembros y los miembros en línea se piden a la API pública de Discord
       con la invitación de links.discordInvite (no necesita claves ni tokens).
       Las cifras de las demás redes son textos fijos (socials › stat). */
    stats: {
      discordLive: true,
      discordSeconds: 60     // cada cuánto se vuelve a consultar Discord (solo con la página a la vista)
    },

    /* ---------- Clips de mis partidas ----------
       Sección preparada al final de la página. Vacía = muestra "Próximamente".
       Cada clip: { title, game, thumb, video } o { title, game, thumb, url }
       · video: archivo propio (ej. 'assets/clips/clutch-l4d2.mp4') → se reproduce en la página.
       · url: enlace a YouTube/TikTok/Twitch → se abre en otra pestaña.
       · thumb: miniatura (ej. 'assets/clips/clutch-l4d2.webp'). Opcional.
       Ejemplo (bórrale las // para usarlo):
       // { title: 'Clutch en Versus', game: 'Left 4 Dead 2', thumb: 'assets/clips/clutch.webp', video: 'assets/clips/clutch.mp4' } */
    clips: [],

    /* ---------- Animaciones ---------- */
    effects: {
      goldStars: true,       // estrellas doradas de cuatro puntas (entre el fondo y el contenido)
      maxStarsDesktop: 34,   // v12: +30 %
      maxStarsMobile: 16,
      counterSeconds: 15,    // duración del conteo de Discord (de 0 a la cifra real, en cada carga)
      ringSeconds: 1.5,      // una vuelta del aro RGB del logo (celular y computadora)
      ringSecondsReduced: 3  // la misma vuelta si el sistema pide "reducir animaciones" (más calmado, pero gira)
    }
  };
})();
