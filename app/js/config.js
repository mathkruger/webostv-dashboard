(function (window) {
  'use strict';

  window.DASHBOARD_CONFIG = {
    appId: 'com.mathkruger.dashboard',
    maxShortcuts: 12,
    seedCount: 6,
    storageKey: 'dashboard.config.v1',
    iconCachePrefix: 'dashboard.icon.v1:',
    iconCacheMaxAge: 1209600000,
    wallpaperStorageKey: 'dashboard.wallpaper.v1',
    weatherStorageKey: 'dashboard.weather.v1',
    weatherCacheKey: 'dashboard.weather.cache.v1',
    weatherGeocodeUrl: 'https://geocoding-api.open-meteo.com/v1/search',
    weatherForecastUrl: 'https://api.open-meteo.com/v1/forecast',
    weatherTransportKey: 'dashboard.weather.transport.v1',
    weatherDefaultCity: 'São Paulo',
    weatherRefreshInterval: 900000,
    wallpapers: [
      { id: 'wallpaper-01', title: 'Wallpaper 1', src: 'assets/wallpapers/wallpaper-01.jpg', thumb: 'assets/wallpapers/thumbs/wallpaper-01.jpg' },
      { id: 'wallpaper-02', title: 'Wallpaper 2', src: 'assets/wallpapers/wallpaper-02.jpg', thumb: 'assets/wallpapers/thumbs/wallpaper-02.jpg' },
      { id: 'wallpaper-03', title: 'Wallpaper 3', src: 'assets/wallpapers/wallpaper-03.jpg', thumb: 'assets/wallpapers/thumbs/wallpaper-03.jpg' },
      { id: 'wallpaper-04', title: 'Wallpaper 4', src: 'assets/wallpapers/wallpaper-04.jpg', thumb: 'assets/wallpapers/thumbs/wallpaper-04.jpg' },
      { id: 'wallpaper-05', title: 'Wallpaper 5', src: 'assets/wallpapers/wallpaper-05.jpg', thumb: 'assets/wallpapers/thumbs/wallpaper-05.jpg' },
      { id: 'wallpaper-06', title: 'Wallpaper 6', src: 'assets/wallpapers/wallpaper-06.jpg', thumb: 'assets/wallpapers/thumbs/wallpaper-06.jpg' }
    ],
    wallpaperColors: [
      { id: 'color-graphite', title: 'Grafite', value: '#101418' },
      { id: 'color-ocean', title: 'Oceano', value: '#0d1b2a' },
      { id: 'color-plum', title: 'Ameixa', value: '#2a1c2e' },
      { id: 'color-moss', title: 'Musgo', value: '#1d2a1f' },
      { id: 'color-cocoa', title: 'Cacau', value: '#2e2118' }
    ],
    hbService: 'luna://org.webosbrew.hbchannel.service',
    appManager: 'luna://com.webos.applicationManager',
    eimService: 'luna://com.webos.service.eim',
    priority: [
      'netflix',
      'youtube.leanback.v4',
      'com.disney.disneyplus-prod',
      'amazon',
      'globoplaywebos',
      'spotify-beehive',
      'com.apple.appletv.web',
      'com.wbd.stream',
      'org.jellyfin.webos',
      'twitch.adamffdev.v1',
      'com.plutotv.app',
      'com.crunchyroll.webos'
    ],
    fallbackApps: [
      { id: 'netflix', title: 'Netflix' },
      { id: 'youtube.leanback.v4', title: 'YouTube' },
      { id: 'com.disney.disneyplus-prod', title: 'Disney+' },
      { id: 'amazon', title: 'Prime Video' },
      { id: 'globoplaywebos', title: 'Globoplay' },
      { id: 'spotify-beehive', title: 'Spotify' },
      { id: 'com.apple.appletv.web', title: 'Apple TV+' },
      { id: 'com.wbd.stream', title: 'HBO Max' },
      { id: 'org.jellyfin.webos', title: 'Jellyfin' },
      { id: 'twitch.adamffdev.v1', title: 'Twitch' },
      { id: 'com.plutotv.app', title: 'Pluto TV' },
      { id: 'com.crunchyroll.webos', title: 'Crunchyroll' },
      { id: 'com.maissbt.app', title: '+SBT' },
      { id: 'vivo', title: 'Vivo PLAY' },
      { id: 'tiva-1.0', title: 'Soul TV' },
      { id: 'lgchannels.br', title: 'LG Channels' },
      { id: 'com.webos.app.browser', title: 'Navegador' },
      { id: 'com.webos.app.discovery', title: 'LG Content Store' },
      { id: 'com.webos.app.photovideo', title: 'Fotos & Vídeos' },
      { id: 'com.webos.app.music', title: 'Música' },
      { id: 'org.webosbrew.hbchannel', title: 'Homebrew Channel' }
    ],
    fallbackInputs: [
      { id: 'com.webos.app.livetv', title: 'TV ao vivo', kind: 'tv' },
      { id: 'com.webos.app.hdmi1', title: 'HDMI 1', kind: 'hdmi', number: '1' },
      { id: 'com.webos.app.hdmi2', title: 'HDMI 2', kind: 'hdmi', number: '2' },
      { id: 'com.webos.app.hdmi3', title: 'HDMI 3', kind: 'hdmi', number: '3' },
      { id: 'com.webos.app.hdmi4', title: 'HDMI 4', kind: 'hdmi', number: '4' },
      { id: 'com.webos.app.externalinput.av1', title: 'AV', kind: 'av' },
      { id: 'com.webos.app.externalinput.component', title: 'Componente', kind: 'component' }
    ]
  };
})(window);
