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
    renderWeatherSettings();
  }

  function fetchForecast(token) {
    var url = CONFIG.weatherForecastUrl +
      '?latitude=' + encodeURIComponent(weather.latitude) +
      '&longitude=' + encodeURIComponent(weather.longitude) +
      '&current=temperature_2m,weather_code,is_day' +
      '&daily=temperature_2m_max,temperature_2m_min' +
      '&forecast_days=1&timezone=auto';
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
      weather.high = null;
      weather.low = null;
      if (data.daily && data.daily.temperature_2m_max && isFiniteNumber(data.daily.temperature_2m_max[0])) {
        weather.high = Math.round(data.daily.temperature_2m_max[0]);
      }
      if (data.daily && data.daily.temperature_2m_min && isFiniteNumber(data.daily.temperature_2m_min[0])) {
        weather.low = Math.round(data.daily.temperature_2m_min[0]);
      }
      weather.updatedAt = Date.now();
      weather.loading = false;
      weather.error = '';
      retryDelay = 5000;
      clearRetry();
      saveCache();
      renderWeather();
      renderWeatherSettings();
    });
  }

  function refreshWeather(force) {
    if (!weather.enabled) {
      renderWeather();
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
      return;
    }
    if (!force && weather.lastAttempt && now - weather.lastAttempt < 30000) {
      return;
    }

    weather.loading = true;
    weather.error = '';
    weather.lastAttempt = now;
    var token = requestId + 1;
    requestId = token;
    renderWeather();
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
    weather.updatedAt = 0;
    weather.error = '';
    weather.loading = false;
    requestId += 1;
    retryDelay = 5000;
    clearRetry();
    clearCache();
    saveState();
    renderWeather();
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
    renderWeatherSettings: renderWeatherSettings,
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
})(window);
