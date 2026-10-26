(function (window) {
  'use strict';

  var App = window.Dashboard || (window.Dashboard = {});
  var store = App.store;
  var STATE = store.STATE;
  var els = store.els;
  var CONFIG = App.config;
  var KEY = App.KEY;

  var weather = {
    enabled: true,
    city: CONFIG.weatherDefaultCity || '',
    latitude: null,
    longitude: null,
    resolvedName: '',
    country: '',
    temperature: null,
    weatherCode: null,
    isDay: true,
    high: null,
    low: null,
    currentWind: null,
    days: [],
    updatedAt: 0,
    loading: false,
    error: '',
    lastAttempt: 0
  };

  var requestId = 0;
  var refreshTimer = null;
  var retryTimer = null;
  var retryDelay = 5000;
  var uiBound = false;
  var useHttp = false;
  var weatherRows = [];

  var ICONS = {
    clear: '<circle cx="12" cy="12" r="4.1"/><path d="M12 2.4v2.2M12 19.4v2.2M2.4 12h2.2M19.4 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6"/>',
    clearNight: '<path d="M20 14.4A8.3 8.3 0 0 1 9.6 4a8.3 8.3 0 1 0 10.4 10.4z"/>',
    partly: '<circle cx="8.8" cy="8.8" r="3.1"/><path d="M8.8 2.7v1.7M2.7 8.8H4.4M4.5 4.5l1.2 1.2M13.1 4.5l-1.2 1.2M4.5 13.1l1.2-1.2"/><path d="M10 19.4h7.7a3 3 0 0 0 .3-6 4.3 4.3 0 0 0-8.2 1.2 2.4 2.4 0 0 0 .2 4.8z"/>',
    partlyNight: '<path d="M17.8 12.4A6.8 6.8 0 0 1 9.2 4a6.8 6.8 0 1 0 8.6 8.4z"/><path d="M10 19.4h7.7a3 3 0 0 0 .3-6 4.3 4.3 0 0 0-8.2 1.2 2.4 2.4 0 0 0 .2 4.8z"/>',
    cloudy: '<path d="M7.2 18.6h9.6a3.6 3.6 0 0 0 .3-7.2 5 5 0 0 0-9.6 1.5 2.9 2.9 0 0 0-.3 5.7z"/>',
    fog: '<path d="M7.2 13.9h9.6a3.4 3.4 0 0 0 .2-6.8 4.8 4.8 0 0 0-9.2 1.4 2.7 2.7 0 0 0-.6 5.4z"/><path d="M5 17.8h14M7.6 20.8h8.8"/>',
    rain: '<path d="M7.2 14.8h9.6a3.5 3.5 0 0 0 .3-7 4.9 4.9 0 0 0-9.4 1.5 2.8 2.8 0 0 0-.5 5.5z"/><path d="M8.6 17.6l-1 2.5M12 17.6l-1 2.5M15.4 17.6l-1 2.5"/>',
    snow: '<path d="M7.2 14.8h9.6a3.5 3.5 0 0 0 .3-7 4.9 4.9 0 0 0-9.4 1.5 2.8 2.8 0 0 0-.5 5.5z"/><path d="M8.5 17.8v2.7M7.3 19.1l2.4 1.1M9.7 19.1l-2.4 1.1M12 17.8v2.7M10.8 19.1l2.4 1.1M13.2 19.1l-2.4 1.1M15.5 17.8v2.7M14.3 19.1l2.4 1.1M16.7 19.1l-2.4 1.1"/>',
    thunder: '<path d="M7.2 14.2h9.6a3.5 3.5 0 0 0 .3-7 4.9 4.9 0 0 0-9.4 1.5 2.8 2.8 0 0 0-.5 5.5z"/><path d="M12.8 15.2l-2.6 4.2h2.7l-1.3 3.4 3.8-4.8h-2.7z"/>'
  };

  var LABELS = {
    0: 'Céu limpo',
    1: 'Predomínio de sol',
    2: 'Parcialmente nublado',
    3: 'Nublado',
    45: 'Nevoeiro',
    48: 'Nevoeiro',
    51: 'Garoa',
    53: 'Garoa',
    55: 'Garoa forte',
    56: 'Garoa congelante',
    57: 'Garoa congelante',
    61: 'Chuva fraca',
    63: 'Chuva',
    65: 'Chuva forte',
    66: 'Chuva congelante',
    67: 'Chuva congelante',
    71: 'Neve fraca',
    73: 'Neve',
    75: 'Neve forte',
    77: 'Grãos de neve',
    80: 'Pancadas de chuva',
    81: 'Pancadas de chuva',
    82: 'Pancadas fortes',
    85: 'Pancadas de neve',
    86: 'Pancadas de neve',
    95: 'Trovoada',
    96: 'Trovoada com granizo',
    99: 'Trovoada com granizo'
  };

  function readJson(key) {
    try {
      var raw = localStorage.getItem(key);
      if (!raw) {
        return null;
      }
      return JSON.parse(raw);
    } catch (error) {
      return null;
    }
  }

  function writeJson(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      void error;
    }
  }

  function removeKey(key) {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      void error;
    }
  }

  function isFiniteNumber(value) {
    return typeof value === 'number' && isFinite(value);
  }

  function normalizeDay(entry) {
    if (!entry || typeof entry !== 'object') {
      return null;
    }
    if (typeof entry.date !== 'string' || !entry.date) {
      return null;
    }
    return {
      date: entry.date,
      code: isFiniteNumber(entry.code) ? entry.code : null,
      high: isFiniteNumber(entry.high) ? Math.round(entry.high) : null,
      low: isFiniteNumber(entry.low) ? Math.round(entry.low) : null,
      rain: isFiniteNumber(entry.rain) ? Math.round(entry.rain) : null,
      wind: isFiniteNumber(entry.wind) ? Math.round(entry.wind) : null
    };
  }

  function normalizeDays(list) {
    var days = [];
    if (!list || !list.length) {
      return days;
    }
    for (var i = 0; i < list.length; i += 1) {
      var day = normalizeDay(list[i]);
      if (day) {
        days.push(day);
      }
    }
    return days;
  }

  function loadState() {
    var stored = readJson(CONFIG.weatherStorageKey);
    if (!stored || typeof stored !== 'object') {
      return;
    }
    weather.enabled = stored.enabled === true;
    if (typeof stored.city === 'string' && stored.city.trim()) {
      weather.city = stored.city.trim();
    }
    if (isFiniteNumber(stored.latitude) && isFiniteNumber(stored.longitude)) {
      weather.latitude = stored.latitude;
      weather.longitude = stored.longitude;
    }
    if (typeof stored.resolvedName === 'string') {
      weather.resolvedName = stored.resolvedName;
    }
    if (typeof stored.country === 'string') {
      weather.country = stored.country;
    }
  }

  function saveState() {
    writeJson(CONFIG.weatherStorageKey, {
      enabled: weather.enabled,
      city: weather.city,
      latitude: weather.latitude,
      longitude: weather.longitude,
      resolvedName: weather.resolvedName,
      country: weather.country
    });
  }

  function loadCache() {
    var cache = readJson(CONFIG.weatherCacheKey);
    if (!cache || typeof cache !== 'object' || cache.city !== weather.city) {
      return;
    }
    if (weather.latitude === null && isFiniteNumber(cache.latitude) && isFiniteNumber(cache.longitude)) {
      weather.latitude = cache.latitude;
      weather.longitude = cache.longitude;
      weather.resolvedName = cache.resolvedName || weather.resolvedName;
      weather.country = cache.country || weather.country;
      saveState();
    }
    if (cache.latitude !== weather.latitude || cache.longitude !== weather.longitude) {
      return;
    }
    if (isFiniteNumber(cache.temperature)) {
      weather.temperature = Math.round(cache.temperature);
      weather.weatherCode = isFiniteNumber(cache.weatherCode) ? cache.weatherCode : null;
      weather.isDay = cache.isDay !== false;
      weather.high = isFiniteNumber(cache.high) ? Math.round(cache.high) : null;
      weather.low = isFiniteNumber(cache.low) ? Math.round(cache.low) : null;
      weather.currentWind = isFiniteNumber(cache.currentWind) ? Math.round(cache.currentWind) : null;
      weather.days = normalizeDays(cache.days);
      weather.updatedAt = isFiniteNumber(cache.updatedAt) ? cache.updatedAt : 0;
    }
  }

  function saveCache() {
    writeJson(CONFIG.weatherCacheKey, {
      city: weather.city,
      latitude: weather.latitude,
      longitude: weather.longitude,
      resolvedName: weather.resolvedName,
      country: weather.country,
      temperature: weather.temperature,
      weatherCode: weather.weatherCode,
      isDay: weather.isDay,
      high: weather.high,
      low: weather.low,
      currentWind: weather.currentWind,
      days: weather.days,
      updatedAt: weather.updatedAt
    });
  }

  function clearCache() {
    removeKey(CONFIG.weatherCacheKey);
  }

  function loadTransport() {
    try {
      useHttp = localStorage.getItem(CONFIG.weatherTransportKey) === 'http';
    } catch (error) {
      useHttp = false;
    }
  }

  function saveTransport() {
    try {
      localStorage.setItem(CONFIG.weatherTransportKey, useHttp ? 'http' : 'https');
    } catch (error) {
      void error;
    }
  }

  function toHttp(url) {
    return url.replace(/^https:\/\//, 'http://');
  }

  function performRequest(url, callback) {
    var xhr = new XMLHttpRequest();
    var finished = false;

    function finish(error, data) {
      if (finished) {
        return;
      }
      finished = true;
      callback(error, data);
    }

    try {
      xhr.open('GET', url, true);
    } catch (error) {
      finish(error);
      return;
    }

    xhr.timeout = 12000;
    xhr.onreadystatechange = function () {
      if (xhr.readyState !== 4) {
        return;
      }
      if (xhr.status < 200 || xhr.status >= 300) {
        finish(new Error('HTTP ' + xhr.status));
        return;
      }
      var data;
      try {
        data = JSON.parse(xhr.responseText);
      } catch (error) {
        finish(error);
        return;
      }
      finish(null, data);
    };
    xhr.onerror = function () {
      finish(new Error('network'));
    };
    xhr.ontimeout = function () {
      finish(new Error('timeout'));
    };
    try {
      xhr.send();
    } catch (error) {
      finish(error);
    }
  }

  function requestJson(url, callback) {
    var secure = /^https:\/\//.test(url);
    if (useHttp && secure) {
      performRequest(toHttp(url), callback);
      return;
    }
    performRequest(url, function (error, data) {
      if (!error || !secure) {
        callback(error, data);
        return;
      }
      performRequest(toHttp(url), function (httpError, httpData) {
        if (httpError) {
          callback(error);
          return;
        }
        useHttp = true;
        saveTransport();
        callback(null, httpData);
      });
    });
  }

  function placeLabel(place) {
    if (!place) {
      return '';
    }
    var name = place.name || '';
    var admin = place.admin1 || '';
    if (admin && admin !== name) {
      name += ', ' + admin;
    }
    return name;
  }

  function buildCityQueries(city) {
    var base = String(city || '').replace(/\s+/g, ' ').trim();
    var queries = [];

    function add(value) {
      value = String(value || '').replace(/\s+/g, ' ').trim();
      if (value && queries.indexOf(value) < 0) {
        queries.push(value);
      }
    }

    add(base);
    add(base.replace(/\s*[\/\-]\s*/g, ', ').replace(/\s*,\s*/g, ', '));
    var match = base.match(/^(.*?)[\s,]+([A-Za-z]{2})$/);
    if (match) {
      add(match[1] + ', ' + match[2].toUpperCase());
      add(match[1]);
    }
    return queries;
  }

  function geocode(city, callback) {
    var queries = buildCityQueries(city);
    var index = 0;

    function attempt() {
      if (index >= queries.length) {
        callback('Cidade não encontrada');
        return;
      }
      var query = queries[index];
      index += 1;
      var url = CONFIG.weatherGeocodeUrl +
        '?name=' + encodeURIComponent(query) +
        '&count=1&language=pt&format=json';
      requestJson(url, function (error, data) {
        if (error) {
          callback('Sem conexão com o serviço de clima', true);
          return;
        }
        if (!data || !data.results || !data.results.length) {
          attempt();
          return;
        }
        var place = data.results[0];
        callback(null, {
          latitude: place.latitude,
          longitude: place.longitude,
          name: placeLabel(place),
          country: place.country || ''
        });
      });
    }

    attempt();
  }

  function categoryFor(code, isDay) {
    if (code === 0) {
      return isDay ? 'clear' : 'clearNight';
    }
    if (code === 1 || code === 2) {
      return isDay ? 'partly' : 'partlyNight';
    }
    if (code === 3) {
      return 'cloudy';
    }
    if (code === 45 || code === 48) {
      return 'fog';
    }
    if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) {
      return 'rain';
    }
    if ((code >= 71 && code <= 77) || code === 85 || code === 86) {
      return 'snow';
    }
    if (code >= 95) {
      return 'thunder';
    }
    return 'cloudy';
  }

  function labelFor(code) {
    return LABELS[code] || 'Tempo variável';
  }

  function iconNode(category) {
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '1.6');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.innerHTML = ICONS[category] || ICONS.cloudy;
    return svg;
  }

  function renderIcon() {
    if (!els.weatherIcon) {
      return;
    }
    els.weatherIcon.innerHTML = '';
    var category = weather.temperature === null
      ? 'cloudy'
      : categoryFor(weather.weatherCode, weather.isDay);
    els.weatherIcon.appendChild(iconNode(category));
  }

  var WEEKDAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

  function parseDayDate(value) {
    var parts = String(value || '').split('-');
    if (parts.length !== 3) {
      return null;
    }
    var date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    if (isNaN(date.getTime())) {
      return null;
    }
    return date;
  }

  function dayNameFor(day, index) {
    if (index === 0) {
      return 'Hoje';
    }
    if (index === 1) {
      return 'Amanhã';
    }
    var date = parseDayDate(day.date);
    return date ? WEEKDAYS[date.getDay()] : '';
  }

  function dayDateFor(day) {
    var date = parseDayDate(day.date);
    if (!date) {
      return '';
    }
    return App.utils.pad(date.getDate()) + '/' + App.utils.pad(date.getMonth() + 1);
  }

  function statGlyph(kind) {
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '1.8');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.setAttribute('class', 'weather-day-glyph');
    if (kind === 'wind') {
      svg.innerHTML = '<path d="M4 8h9a2.5 2.5 0 1 0-2.4-3.2"/><path d="M4 12h13a2.5 2.5 0 1 1-2.4 3.2"/><path d="M4 16h6"/>';
    } else {
      svg.innerHTML = '<path d="M12 3.5c3.2 4 5.2 6.4 5.2 9a5.2 5.2 0 0 1-10.4 0c0-2.6 2-5 5.2-9z"/>';
    }
    return svg;
  }

  function formatPercent(value) {
    return isFiniteNumber(value) ? Math.round(value) + '%' : '--';
  }

  function formatWind(value) {
    return isFiniteNumber(value) ? Math.round(value) + ' km/h' : '--';
  }

  function buildWeatherDays() {
    weatherRows = [];
    if (!els.weatherDaysList) {
      return;
    }
    els.weatherDaysList.innerHTML = '';

    if (!weather.days.length) {
      var empty = document.createElement('div');
      empty.className = 'loading-row';
      if (weather.loading) {
        var spinner = document.createElement('span');
        spinner.className = 'spinner';
        empty.appendChild(spinner);
        empty.appendChild(document.createTextNode('Carregando previsão'));
      } else {
        empty.textContent = weather.error || 'Nenhuma previsão disponível';
      }
      els.weatherDaysList.appendChild(empty);
      return;
    }

    weather.days.forEach(function (day, index) {
      var card = document.createElement('div');
      card.className = 'weather-day-card';
      card.setAttribute('data-weather-day', String(index));

      var top = document.createElement('div');
      top.className = 'weather-day-top';

      var name = document.createElement('span');
      name.className = 'weather-day-name';
      name.textContent = dayNameFor(day, index);

      var date = document.createElement('span');
      date.className = 'weather-day-date';
      date.textContent = dayDateFor(day);

      top.appendChild(name);
      top.appendChild(date);

      var dayIcon = document.createElement('div');
      dayIcon.className = 'weather-day-icon';
      dayIcon.setAttribute('aria-hidden', 'true');
      dayIcon.appendChild(iconNode(categoryFor(day.code, true)));

      var condition = document.createElement('div');
      condition.className = 'weather-day-condition';
      condition.textContent = labelFor(day.code);

      var temps = document.createElement('div');
      temps.className = 'weather-day-temps';

      var high = document.createElement('span');
      high.className = 'weather-day-high';
      high.textContent = isFiniteNumber(day.high) ? day.high + '°' : '--°';

      var low = document.createElement('span');
      low.className = 'weather-day-low';
      low.textContent = isFiniteNumber(day.low) ? day.low + '°' : '--°';

      temps.appendChild(high);
      temps.appendChild(low);

      var info = document.createElement('div');
      info.className = 'weather-day-info';
      info.appendChild(temps);
      info.appendChild(condition);

      var main = document.createElement('div');
      main.className = 'weather-day-main';
      main.appendChild(dayIcon);
      main.appendChild(info);

      var stats = document.createElement('div');
      stats.className = 'weather-day-stats';

      var rain = document.createElement('span');
      rain.className = 'weather-day-stat';
      rain.appendChild(statGlyph('rain'));
      rain.appendChild(document.createTextNode(formatPercent(day.rain)));

      var wind = document.createElement('span');
      wind.className = 'weather-day-stat';
      wind.appendChild(statGlyph('wind'));
      wind.appendChild(document.createTextNode(formatWind(day.wind)));

      stats.appendChild(rain);
      stats.appendChild(wind);

      card.appendChild(top);
      card.appendChild(main);
      card.appendChild(stats);
      els.weatherDaysList.appendChild(card);
      weatherRows.push(card);
    });
  }

  function refreshWeatherPageFocus() {
    if (!STATE.weatherOpen) {
      return;
    }
    if (els.weatherDone) {
      els.weatherDone.classList.toggle('focused', STATE.weatherZone === 'done');
    }
    weatherRows.forEach(function (card, index) {
      var focused = STATE.weatherZone === 'days' && index === STATE.weatherIndex;
      card.classList.toggle('focused', focused);
      if (focused) {
        App.dom.scrollRowIntoView(els.weatherDaysList, card);
      }
    });
  }

  function renderWeatherPage() {
    if (!STATE.weatherOpen || !els.weatherPage) {
      return;
    }
    if (els.weatherPageCity) {
      els.weatherPageCity.textContent = weather.resolvedName ||
        (weather.city ? weather.city : 'Cidade não definida');
    }

    if (els.weatherHeroIcon) {
      els.weatherHeroIcon.innerHTML = '';
      var category = weather.temperature === null
        ? 'cloudy'
        : categoryFor(weather.weatherCode, weather.isDay);
      els.weatherHeroIcon.appendChild(iconNode(category));
    }

    var today = weather.days.length ? weather.days[0] : null;

    if (weather.temperature === null) {
      els.weatherHeroTemp.textContent = '--°';
      els.weatherHeroDesc.textContent = weather.loading ? 'Carregando' : (weather.error ? 'Indisponível' : 'Sem dados');
      els.weatherHeroMeta.textContent = '';
      els.weatherHeroRain.textContent = '--%';
      els.weatherHeroWind.textContent = '--';
    } else {
      els.weatherHeroTemp.textContent = weather.temperature + '°';
      els.weatherHeroDesc.textContent = labelFor(weather.weatherCode);
      var meta = [];
      if (isFiniteNumber(weather.high) && isFiniteNumber(weather.low)) {
        meta.push('Máx ' + weather.high + '°');
        meta.push('Mín ' + weather.low + '°');
      }
      if (weather.updatedAt) {
        meta.push('Atualizado ' + timeAgo(weather.updatedAt).toLowerCase());
      }
      els.weatherHeroMeta.textContent = meta.join(' · ');
      els.weatherHeroRain.textContent = formatPercent(today ? today.rain : null);
      els.weatherHeroWind.textContent = formatWind(weather.currentWind);
    }

    if (els.weatherPageUpdated) {
      els.weatherPageUpdated.textContent = weather.days.length
        ? weather.days.length + (weather.days.length === 1 ? ' dia' : ' dias')
        : '';
    }

    if (els.weatherPageStatus) {
      if (weather.loading) {
        els.weatherPageStatus.textContent = 'Atualizando previsão…';
      } else if (weather.error) {
        els.weatherPageStatus.textContent = weather.error + ' • Voltar fecha';
      } else {
        els.weatherPageStatus.textContent = 'Use as setas para navegar • Voltar fecha';
      }
      els.weatherPageStatus.classList.toggle('error', !!weather.error);
    }

    buildWeatherDays();
    if (STATE.weatherZone === 'days' && STATE.weatherIndex >= weatherRows.length) {
      STATE.weatherIndex = Math.max(0, weatherRows.length - 1);
    }
    refreshWeatherPageFocus();
  }

  function renderWeather() {
    if (!els.weather) {
      return;
    }
    if (!weather.enabled) {
      els.weather.classList.add('hidden');
      els.weather.setAttribute('aria-hidden', 'true');
      return;
    }

    els.weather.classList.remove('hidden');
    els.weather.setAttribute('aria-hidden', 'false');
    renderIcon();

    if (weather.temperature === null) {
      els.weatherTemp.textContent = '--°';
      els.weatherDesc.textContent = weather.loading ? 'Carregando' : (weather.error ? 'Indisponível' : 'Sem dados');
      els.weatherCity.textContent = weather.resolvedName || weather.city;
      return;
    }

    var description = labelFor(weather.weatherCode);
    if (weather.low !== null && weather.high !== null) {
      description += ' · ' + weather.low + '° / ' + weather.high + '°';
    }
    els.weatherTemp.textContent = weather.temperature + '°';
    els.weatherDesc.textContent = description;
    els.weatherCity.textContent = weather.resolvedName || weather.city;
  }

  function timeAgo(timestamp) {
    if (!timestamp) {
      return 'Agora';
    }
    var diff = Date.now() - timestamp;
    if (diff < 60000) {
      return 'Agora';
    }
    var minutes = Math.floor(diff / 60000);
    if (minutes < 60) {
      return 'Há ' + minutes + ' min';
    }
    var hours = Math.floor(minutes / 60);
    return 'Há ' + hours + ' h';
  }

  function renderWeatherSettings() {
    if (!els.weatherToggleSwitch) {
      return;
    }
    els.weatherToggleSwitch.classList.toggle('on', weather.enabled);
    els.weatherToggleMeta.textContent = weather.enabled ? 'Ligado' : 'Desligado';

    if (!STATE.weatherEditing && els.weatherCityInput) {
      els.weatherCityInput.value = weather.city || '';
    }

    if (els.weatherStatus) {
      if (!weather.enabled) {
        els.weatherStatus.textContent = 'Desativado';
      } else if (weather.loading) {
        els.weatherStatus.textContent = 'Atualizando';
      } else if (weather.error) {
        els.weatherStatus.textContent = 'Erro';
      } else {
        els.weatherStatus.textContent = 'Ativo';
      }
    }

    if (els.weatherCityMeta) {
      if (weather.error && weather.latitude === null) {
        els.weatherCityMeta.textContent = weather.error;
      } else if (weather.latitude !== null) {
        els.weatherCityMeta.textContent = weather.resolvedName +
          (weather.country ? ' · ' + weather.country : '');
      } else {
        els.weatherCityMeta.textContent = 'Não definida';
      }
    }

    if (els.weatherRefreshMeta) {
      els.weatherRefreshMeta.textContent = weather.loading ? 'Buscando' : timeAgo(weather.updatedAt);
    }

    if (els.weatherHint) {
      if (STATE.weatherEditing) {
        els.weatherHint.textContent = 'Digite a cidade no teclado da TV • OK aplica • Voltar cancela';
      } else if (weather.error) {
        els.weatherHint.textContent = weather.error + ' • OK em Atualizar agora tenta de novo';
      } else {
        els.weatherHint.textContent = 'A previsão é atualizada a cada 15 minutos';
      }
    }

    if (App.settings && App.settings.refreshWeatherFocus) {
      App.settings.refreshWeatherFocus();
    }
  }

  function clearRetry() {
    if (retryTimer) {
      clearTimeout(retryTimer);
      retryTimer = null;
    }
  }

  function scheduleRetry() {
    if (!weather.enabled) {
      return;
    }
    clearRetry();
    var delay = retryDelay;
    retryTimer = setTimeout(function () {
      retryTimer = null;
      if (!weather.enabled) {
        return;
      }
      weather.lastAttempt = 0;
      refreshWeather(true);
    }, delay);
    retryDelay = Math.min(retryDelay * 2, 60000);
  }

  function finishError(message, retry) {
    weather.loading = false;
    weather.error = message;
    if (retry) {
      scheduleRetry();
    } else {
      clearRetry();
    }
    renderWeather();
    renderWeatherPage();
    renderWeatherSettings();
  }

  function fetchForecast(token) {
    var url = CONFIG.weatherForecastUrl +
      '?latitude=' + encodeURIComponent(weather.latitude) +
      '&longitude=' + encodeURIComponent(weather.longitude) +
      '&current=temperature_2m,weather_code,is_day,wind_speed_10m' +
      '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max' +
      '&forecast_days=15&timezone=auto';
    requestJson(url, function (error, data) {
      if (token !== requestId) {
        return;
      }
      if (error) {
        finishError('Sem conexão com o serviço de clima', true);
        return;
      }
      var current = data && data.current;
      if (!current || !isFiniteNumber(current.temperature_2m)) {
        finishError('Resposta inválida do serviço de clima', false);
        return;
      }
      weather.temperature = Math.round(current.temperature_2m);
      weather.weatherCode = isFiniteNumber(current.weather_code) ? current.weather_code : null;
      weather.isDay = current.is_day !== 0;
      weather.currentWind = isFiniteNumber(current.wind_speed_10m) ? Math.round(current.wind_speed_10m) : null;
      weather.high = null;
      weather.low = null;
      weather.days = [];
      var daily = data.daily;
      if (daily && daily.time && daily.time.length) {
        for (var i = 0; i < daily.time.length && i < 15; i += 1) {
          var day = {
            date: daily.time[i],
            code: daily.weather_code && isFiniteNumber(daily.weather_code[i]) ? daily.weather_code[i] : null,
            high: daily.temperature_2m_max && isFiniteNumber(daily.temperature_2m_max[i]) ? daily.temperature_2m_max[i] : null,
            low: daily.temperature_2m_min && isFiniteNumber(daily.temperature_2m_min[i]) ? daily.temperature_2m_min[i] : null,
            rain: daily.precipitation_probability_max && isFiniteNumber(daily.precipitation_probability_max[i]) ? daily.precipitation_probability_max[i] : null,
            wind: daily.wind_speed_10m_max && isFiniteNumber(daily.wind_speed_10m_max[i]) ? daily.wind_speed_10m_max[i] : null
          };
          weather.days.push(normalizeDay(day));
        }
      }
      if (weather.days.length) {
        weather.high = weather.days[0].high;
        weather.low = weather.days[0].low;
      }
      weather.updatedAt = Date.now();
      weather.loading = false;
      weather.error = '';
      retryDelay = 5000;
      clearRetry();
      saveCache();
      renderWeather();
      renderWeatherPage();
      renderWeatherSettings();
    });
  }

  function refreshWeather(force) {
    if (!weather.enabled) {
      renderWeather();
      renderWeatherPage();
      return;
    }
    if (!weather.city) {
      finishError('Informe uma cidade', false);
      return;
    }
    if (weather.loading) {
      return;
    }
    var now = Date.now();
    if (!force && weather.updatedAt && now - weather.updatedAt < CONFIG.weatherRefreshInterval) {
      renderWeather();
      renderWeatherPage();
      return;
    }
    if (!force && weather.lastAttempt && now - weather.lastAttempt < 30000) {
      renderWeatherPage();
      return;
    }

    weather.loading = true;
    weather.error = '';
    weather.lastAttempt = now;
    var token = requestId + 1;
    requestId = token;
    renderWeather();
    renderWeatherPage();
    renderWeatherSettings();

    if (weather.latitude === null || weather.longitude === null) {
      geocode(weather.city, function (error, place, retry) {
        if (token !== requestId) {
          return;
        }
        if (error) {
          finishError(error, retry);
          return;
        }
        weather.latitude = place.latitude;
        weather.longitude = place.longitude;
        weather.resolvedName = place.name;
        weather.country = place.country;
        saveState();
        fetchForecast(token);
      });
      return;
    }

    fetchForecast(token);
  }

  function setEnabled(enabled) {
    weather.enabled = !!enabled;
    saveState();
    if (weather.enabled) {
      retryDelay = 5000;
      clearRetry();
      refreshWeather(true);
    } else {
      clearRetry();
      renderWeather();
      renderWeatherPage();
    }
    renderWeatherSettings();
    App.ui.toast(weather.enabled ? 'Previsão do tempo ativada' : 'Previsão do tempo desativada');
  }

  function setCity(value) {
    var city = String(value || '').replace(/\s+/g, ' ').trim();
    if (!city) {
      App.ui.toast('Informe uma cidade');
      renderWeatherSettings();
      return false;
    }
    if (city === weather.city && weather.latitude !== null) {
      renderWeatherSettings();
      return true;
    }

    weather.city = city;
    weather.latitude = null;
    weather.longitude = null;
    weather.resolvedName = '';
    weather.country = '';
    weather.temperature = null;
    weather.weatherCode = null;
    weather.high = null;
    weather.low = null;
    weather.currentWind = null;
    weather.days = [];
    weather.updatedAt = 0;
    weather.error = '';
    weather.loading = false;
    requestId += 1;
    retryDelay = 5000;
    clearRetry();
    clearCache();
    saveState();
    renderWeather();
    renderWeatherPage();
    if (weather.enabled) {
      App.ui.toast('Buscando clima em ' + city);
      refreshWeather(true);
    } else {
      App.ui.toast('Cidade salva: ' + city);
    }
    renderWeatherSettings();
    return true;
  }

  function startCityEdit() {
    if (!els.weatherCityInput) {
      return;
    }
    STATE.weatherEditing = true;
    STATE.settingsZone = 'weather';
    STATE.weatherIndex = 1;
    els.weatherCityInput.value = weather.city || '';
    try {
      els.weatherCityInput.focus();
      els.weatherCityInput.select();
    } catch (error) {
      void error;
    }
    renderWeatherSettings();
  }

  function finishCityEdit(commit) {
    if (!STATE.weatherEditing) {
      return;
    }
    var input = els.weatherCityInput;
    var value = input ? input.value : weather.city;
    STATE.weatherEditing = false;
    if (input) {
      input.blur();
    }
    if (!commit) {
      if (input) {
        input.value = weather.city;
      }
      renderWeatherSettings();
      return;
    }
    if (!value || !String(value).trim()) {
      if (input) {
        input.value = weather.city;
      }
      App.ui.toast('Informe uma cidade');
      renderWeatherSettings();
      return;
    }
    setCity(value);
  }

  function cancelCityEdit() {
    finishCityEdit(false);
  }

  function bindUi() {
    if (uiBound || !els.weatherCityInput) {
      return;
    }
    uiBound = true;

    els.weatherCityInput.addEventListener('focus', function () {
      STATE.weatherEditing = true;
      STATE.settingsZone = 'weather';
      STATE.weatherIndex = 1;
      if (App.settings && App.settings.refreshSettingsFocus) {
        App.settings.refreshSettingsFocus();
      }
      renderWeatherSettings();
    }, false);

    els.weatherCityInput.addEventListener('blur', function () {
      if (STATE.weatherEditing) {
        finishCityEdit(true);
      }
    }, false);

    els.weatherCityInput.addEventListener('keydown', function (event) {
      if (event.keyCode === KEY.ENTER) {
        event.preventDefault();
        event.stopPropagation();
        finishCityEdit(true);
      } else if (event.keyCode === KEY.BACK || event.keyCode === KEY.ESC) {
        event.preventDefault();
        event.stopPropagation();
        finishCityEdit(false);
      }
    }, false);
  }

  function openWeather() {
    if (STATE.weatherOpen) {
      return;
    }
    if (!weather.enabled) {
      App.ui.toast('Previsão do tempo desativada');
      return;
    }
    if (STATE.settingsOpen) {
      App.settings.closeSettings();
    }
    if (STATE.allOpen) {
      App.allApps.closeAllApps();
    }
    if (STATE.newsOpen) {
      App.news.closeNews();
    }
    STATE.weatherOpen = true;
    STATE.screen = 'weather';
    STATE.weatherFocus = false;
    STATE.gearFocus = false;
    STATE.appsFocus = false;
    STATE.emptyFocus = false;
    STATE.newsFocus = false;
    STATE.weatherZone = 'days';
    STATE.weatherIndex = 0;
    els.weatherPage.classList.add('open');
    els.weatherPage.setAttribute('aria-hidden', 'false');
    els.hint.classList.remove('visible');
    store.hoverLockUntil = Date.now() + 450;
    renderWeatherPage();
    refreshWeather(!weather.days.length);
  }

  function closeWeather() {
    if (!STATE.weatherOpen) {
      return;
    }
    STATE.weatherOpen = false;
    STATE.screen = 'home';
    STATE.weatherFocus = true;
    els.weatherPage.classList.remove('open');
    els.weatherPage.setAttribute('aria-hidden', 'true');
    App.home.refreshHomeFocus();
  }

  function weatherItems() {
    return [els.weatherDone].concat(weatherRows);
  }

  function weatherCurrent() {
    if (STATE.weatherZone === 'done') {
      return els.weatherDone;
    }
    return weatherRows[STATE.weatherIndex] || null;
  }

  function weatherFocusElement(element) {
    if (element === els.weatherDone) {
      STATE.weatherZone = 'done';
    } else {
      var index = Number(element.getAttribute('data-weather-day'));
      STATE.weatherZone = 'days';
      STATE.weatherIndex = isNaN(index) ? 0 : index;
    }
    refreshWeatherPageFocus();
  }

  function weatherKey(code) {
    if (STATE.weatherZone === 'done' && code === KEY.DOWN) {
      STATE.weatherZone = 'days';
      STATE.weatherIndex = 0;
      refreshWeatherPageFocus();
      return true;
    }
    if (STATE.weatherZone === 'days' && code === KEY.UP && STATE.weatherIndex < 5) {
      STATE.weatherZone = 'done';
      refreshWeatherPageFocus();
      return true;
    }
    return false;
  }

  function onWeatherCardClick(event) {
    if (event) {
      event.stopPropagation();
    }
    openWeather();
  }

  function onWeatherCardHover() {
    STATE.weatherFocus = true;
    STATE.gearFocus = false;
    STATE.appsFocus = false;
    STATE.emptyFocus = false;
    STATE.newsFocus = false;
    App.home.refreshHomeFocus();
  }

  function onWeatherDoneClick() {
    closeWeather();
  }

  function onWeatherDoneHover() {
    if (Date.now() < store.hoverLockUntil || !App.pointer.pointerActive()) {
      return;
    }
    STATE.weatherZone = 'done';
    refreshWeatherPageFocus();
  }

  function onWeatherDayHover(event) {
    if (Date.now() < store.hoverLockUntil || !App.pointer.pointerActive()) {
      return;
    }
    var card = App.dom.closest(event.target, '[data-weather-day]');
    if (!card) {
      return;
    }
    var index = Number(card.getAttribute('data-weather-day'));
    if (isNaN(index)) {
      return;
    }
    STATE.weatherZone = 'days';
    STATE.weatherIndex = index;
    refreshWeatherPageFocus();
  }

  function onWeatherDayClick(event) {
    var card = App.dom.closest(event.target, '[data-weather-day]');
    if (!card) {
      return;
    }
    var index = Number(card.getAttribute('data-weather-day'));
    if (isNaN(index)) {
      return;
    }
    STATE.weatherZone = 'days';
    STATE.weatherIndex = index;
    refreshWeatherPageFocus();
  }

  function startWeather() {
    loadState();
    loadCache();
    loadTransport();
    bindUi();
    renderWeather();
    renderWeatherSettings();
    if (weather.enabled) {
      refreshWeather(false);
    }
    if (!refreshTimer) {
      refreshTimer = setInterval(function () {
        if (weather.enabled) {
          refreshWeather(false);
        }
      }, CONFIG.weatherRefreshInterval);
    }
  }

  App.weather = {
    startWeather: startWeather,
    refreshWeather: refreshWeather,
    renderWeather: renderWeather,
    renderWeatherPage: renderWeatherPage,
    renderWeatherSettings: renderWeatherSettings,
    openWeather: openWeather,
    closeWeather: closeWeather,
    onWeatherCardClick: onWeatherCardClick,
    onWeatherCardHover: onWeatherCardHover,
    onWeatherDoneClick: onWeatherDoneClick,
    onWeatherDoneHover: onWeatherDoneHover,
    onWeatherDayHover: onWeatherDayHover,
    onWeatherDayClick: onWeatherDayClick,
    setEnabled: setEnabled,
    setCity: setCity,
    startCityEdit: startCityEdit,
    finishCityEdit: finishCityEdit,
    cancelCityEdit: cancelCityEdit,
    isEnabled: function () {
      return weather.enabled;
    },
    getCity: function () {
      return weather.city;
    },
    getResolvedName: function () {
      return weather.resolvedName;
    },
    getError: function () {
      return weather.error;
    },
    isLoading: function () {
      return weather.loading;
    }
  };

  App.focus.register('weather', {
    items: weatherItems,
    current: weatherCurrent,
    onFocus: weatherFocusElement,
    onKey: weatherKey,
    onBack: closeWeather
  });
})(window);
