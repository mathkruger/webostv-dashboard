(function (window) {
  'use strict';

  var App = window.Dashboard || (window.Dashboard = {});
  var store = App.store;
  var STATE = store.STATE;
  var els = store.els;
  var CONFIG = App.config;
  var KEY = App.KEY;

  var news = {
    feedUrl: CONFIG.newsDefaultFeed,
    title: '',
    items: [],
    updatedAt: 0,
    loading: false,
    error: '',
    lastAttempt: 0
  };

  var requestId = 0;
  var refreshTimer = null;
  var retryTimer = null;
  var retryDelay = 15000;
  var rotateTimer = null;
  var rotateIndex = 0;
  var uiBound = false;
  var newsRows = [];
  var pageStart = 0;
  var pageItems = [];

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

  function normalizeFeedUrl(value) {
    var url = String(value || '').replace(/[\r\n\t]+/g, ' ').trim();
    if (!url) {
      return '';
    }
    if (!/^https?:\/\//i.test(url)) {
      if (/^[a-z][a-z0-9+.-]*:\/\//i.test(url)) {
        return '';
      }
      url = 'https://' + url;
    }
    if (/[\s<>"']/.test(url)) {
      return '';
    }
    if (!/^https?:\/\/[^\s/]+/i.test(url)) {
      return '';
    }
    return url;
  }

  function hostOf(url) {
    try {
      var anchor = document.createElement('a');
      anchor.href = url;
      return String(anchor.hostname || '').replace(/^www\./i, '');
    } catch (error) {
      return '';
    }
  }

  function displayTitle() {
    if (news.feedUrl === CONFIG.newsDefaultFeed) {
      return CONFIG.newsDefaultTitle || 'Notícias';
    }
    return news.title || hostOf(news.feedUrl) || 'Notícias';
  }

  function loadState() {
    var stored = readJson(CONFIG.newsStorageKey);
    if (!stored || typeof stored !== 'object') {
      return;
    }
    var url = normalizeFeedUrl(stored.feedUrl);
    if (url) {
      news.feedUrl = url;
    }
  }

  function saveState() {
    writeJson(CONFIG.newsStorageKey, { feedUrl: news.feedUrl });
  }

  function normalizeItem(entry) {
    if (!entry || typeof entry !== 'object') {
      return null;
    }
    var title = typeof entry.title === 'string' ? entry.title.replace(/\s+/g, ' ').trim() : '';
    var link = typeof entry.link === 'string' ? entry.link.trim() : '';
    if (!title || !link) {
      return null;
    }
    return {
      title: title,
      link: link,
      time: isFiniteNumber(entry.time) ? entry.time : 0,
      dateText: typeof entry.dateText === 'string' ? entry.dateText : '',
      source: typeof entry.source === 'string' ? entry.source : ''
    };
  }

  function loadCache() {
    var cache = readJson(CONFIG.newsCacheKey);
    if (!cache || typeof cache !== 'object' || cache.feedUrl !== news.feedUrl) {
      return;
    }
    var items = [];
    if (cache.items && cache.items.length) {
      for (var i = 0; i < cache.items.length; i += 1) {
        var item = normalizeItem(cache.items[i]);
        if (item) {
          items.push(item);
        }
      }
    }
    news.items = items;
    news.title = typeof cache.title === 'string' ? cache.title : '';
    news.updatedAt = isFiniteNumber(cache.updatedAt) ? cache.updatedAt : 0;
  }

  function saveCache() {
    writeJson(CONFIG.newsCacheKey, {
      feedUrl: news.feedUrl,
      title: news.title,
      updatedAt: news.updatedAt,
      items: news.items
    });
  }

  function parseDate(text) {
    if (!text) {
      return 0;
    }
    var time = Date.parse(text);
    return isFinite(time) ? time : 0;
  }

  function childText(node, names) {
    if (!node) {
      return '';
    }
    for (var i = 0; i < node.childNodes.length; i += 1) {
      var child = node.childNodes[i];
      if (child.nodeType !== 1) {
        continue;
      }
      var full = String(child.nodeName || '').toLowerCase();
      var local = String(child.localName || full.split(':').pop()).toLowerCase();
      for (var j = 0; j < names.length; j += 1) {
        if (full === names[j] || local === names[j]) {
          var value = String(child.textContent || '').replace(/\s+/g, ' ').trim();
          if (value) {
            return value;
          }
        }
      }
    }
    return '';
  }

  function linkOf(node) {
    var fallback = '';
    for (var i = 0; i < node.childNodes.length; i += 1) {
      var child = node.childNodes[i];
      if (child.nodeType !== 1) {
        continue;
      }
      var local = String(child.localName || child.nodeName || '').toLowerCase();
      if (local !== 'link') {
        continue;
      }
      var href = child.getAttribute('href');
      if (href) {
        var rel = child.getAttribute('rel');
        if (!rel || rel === 'alternate') {
          return href.trim();
        }
        if (!fallback) {
          fallback = href.trim();
        }
      } else {
        var text = String(child.textContent || '').trim();
        if (text) {
          return text;
        }
      }
    }
    return fallback;
  }

  function parseFeed(text) {
    var doc;
    try {
      doc = new DOMParser().parseFromString(text, 'text/xml');
    } catch (error) {
      throw new Error('Feed inválido');
    }
    if (!doc || !doc.documentElement) {
      throw new Error('Feed inválido');
    }
    if (doc.getElementsByTagName('parsererror').length) {
      throw new Error('Feed inválido');
    }

    var channel = doc.getElementsByTagName('channel')[0] ||
      doc.getElementsByTagName('feed')[0] ||
      doc.documentElement;
    var feedTitle = childText(channel, ['title']);
    var nodes = doc.getElementsByTagName('item');
    if (!nodes.length) {
      nodes = doc.getElementsByTagName('entry');
    }
    if (!nodes.length) {
      throw new Error('Feed sem notícias');
    }

    var items = [];
    for (var i = 0; i < nodes.length; i += 1) {
      var node = nodes[i];
      var title = childText(node, ['title']);
      var link = linkOf(node);
      if (!title || !link) {
        continue;
      }
      var dateText = childText(node, ['pubdate', 'published', 'updated', 'date']);
      items.push({
        title: title,
        link: link,
        time: parseDate(dateText),
        dateText: dateText,
        source: feedTitle,
        order: i
      });
    }
    if (!items.length) {
      throw new Error('Feed sem notícias');
    }

    items.sort(function (a, b) {
      var at = a.time || 0;
      var bt = b.time || 0;
      if (at !== bt) {
        return bt - at;
      }
      return a.order - b.order;
    });

    return { title: feedTitle, items: items };
  }

  function requestText(url, callback) {
    var xhr = new XMLHttpRequest();
    var finished = false;

    function finish(error, text) {
      if (finished) {
        return;
      }
      finished = true;
      callback(error, text);
    }

    try {
      xhr.open('GET', url, true);
    } catch (error) {
      finish(error);
      return;
    }

    xhr.timeout = 15000;
    xhr.onreadystatechange = function () {
      if (xhr.readyState !== 4) {
        return;
      }
      if (xhr.status < 200 || xhr.status >= 300) {
        finish(new Error('HTTP ' + xhr.status));
        return;
      }
      finish(null, xhr.responseText || '');
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

  function shellArg(value) {
    return "'" + String(value).replace(/'/g, "'\\''") + "'";
  }

  function caBundlePath() {
    try {
      var pathname = decodeURIComponent(window.location.pathname || '');
      if (pathname.charAt(0) !== '/') {
        return '';
      }
      var slash = pathname.lastIndexOf('/');
      if (slash <= 0) {
        return '';
      }
      return pathname.slice(0, slash) + '/certs/cacert.pem';
    } catch (error) {
      return '';
    }
  }

  function rootFetch(url, callback) {
    if (!App.luna || typeof App.luna.rootExec !== 'function') {
      callback(new Error('root'));
      return;
    }
    var arg = shellArg(url);
    var ca = caBundlePath();
    var first;
    if (ca) {
      var caArg = shellArg(ca);
      first = 'if [ -f ' + caArg + ' ]; then ' +
        'curl -fsSL --max-time 12 --compressed --cacert ' + caArg + ' ' + arg + ' 2>/dev/null; ' +
        'else curl -fsSL --max-time 12 --compressed ' + arg + ' 2>/dev/null; fi';
    } else {
      first = 'curl -fsSL --max-time 12 --compressed ' + arg + ' 2>/dev/null';
    }
    var command = first +
      ' || curl -kfsSL --max-time 12 --compressed ' + arg + ' 2>/dev/null' +
      ' || wget -q -O - --timeout=12 ' + arg + ' 2>/dev/null';
    App.luna.rootExec(command).then(function (output) {
      if (!output || !String(output).trim()) {
        callback(new Error('vazio'));
        return;
      }
      callback(null, output);
    }).catch(function (error) {
      callback(error || new Error('root'));
    });
  }

  function timeAgo(timestamp) {
    if (!timestamp) {
      return '';
    }
    var diff = Date.now() - timestamp;
    if (diff < 60000) {
      return 'agora';
    }
    var minutes = Math.floor(diff / 60000);
    if (minutes < 60) {
      return 'há ' + minutes + ' min';
    }
    var hours = Math.floor(minutes / 60);
    if (hours < 24) {
      return 'há ' + hours + ' h';
    }
    var days = Math.floor(hours / 24);
    if (days < 7) {
      return 'há ' + days + ' d';
    }
    return shortDate(timestamp);
  }

  function shortDate(timestamp) {
    if (!timestamp) {
      return '';
    }
    var date = new Date(timestamp);
    if (isNaN(date.getTime())) {
      return '';
    }
    return App.utils.pad(date.getDate()) + '/' + App.utils.pad(date.getMonth() + 1) +
      ' · ' + App.utils.pad(date.getHours()) + ':' + App.utils.pad(date.getMinutes());
  }

  function cardPool() {
    return news.items.slice(0, CONFIG.newsCardLimit);
  }

  function renderDots(pool, active) {
    if (!els.newsCardDots) {
      return;
    }
    els.newsCardDots.innerHTML = '';
    for (var i = 0; i < pool.length; i += 1) {
      var dot = document.createElement('span');
      dot.className = 'news-dot' + (i === active ? ' active' : '');
      els.newsCardDots.appendChild(dot);
    }
  }

  function renderNewsCard() {
    if (!els.news) {
      return;
    }
    var pool = cardPool();
    if (rotateIndex >= pool.length) {
      rotateIndex = 0;
    }
    var item = pool[rotateIndex];

    if (item) {
      els.newsCardSource.textContent = displayTitle();
      els.newsCardTitle.textContent = item.title;
      els.newsCardMeta.textContent = timeAgo(item.time);
    } else if (news.loading) {
      els.newsCardSource.textContent = displayTitle();
      els.newsCardTitle.textContent = 'Carregando notícias…';
      els.newsCardMeta.textContent = '';
    } else if (news.error) {
      els.newsCardSource.textContent = displayTitle();
      els.newsCardTitle.textContent = 'Não foi possível carregar as notícias';
      els.newsCardMeta.textContent = 'OK abre as notícias';
    } else {
      els.newsCardSource.textContent = displayTitle();
      els.newsCardTitle.textContent = 'Nenhuma notícia disponível';
      els.newsCardMeta.textContent = '';
    }
    renderDots(pool, rotateIndex);
  }

  function startRotation() {
    if (rotateTimer) {
      return;
    }
    rotateTimer = setInterval(function () {
      var pool = cardPool();
      if (pool.length < 2) {
        return;
      }
      rotateIndex = (rotateIndex + 1) % pool.length;
      renderNewsCard();
    }, CONFIG.newsRotateInterval);
  }

  function totalPages() {
    return Math.max(1, Math.ceil(news.items.length / CONFIG.newsPageSize));
  }

  function renderNewsPage() {
    if (!STATE.newsOpen || !els.newsPage) {
      return;
    }
    var total = totalPages();
    if (STATE.newsPage >= total) {
      STATE.newsPage = total - 1;
    }
    if (STATE.newsPage < 0) {
      STATE.newsPage = 0;
    }

    pageStart = STATE.newsPage * CONFIG.newsPageSize;
    pageItems = news.items.slice(pageStart, pageStart + CONFIG.newsPageSize);

    if (els.newsSource) {
      var sourceText = displayTitle();
      if (news.updatedAt) {
        sourceText += ' · atualizado ' + timeAgo(news.updatedAt);
      }
      els.newsSource.textContent = sourceText;
    }
    if (els.newsCount) {
      els.newsCount.textContent = news.items.length + (news.items.length === 1 ? ' notícia' : ' notícias');
    }
    if (els.newsPageLabel) {
      els.newsPageLabel.textContent = 'Página ' + (STATE.newsPage + 1) + ' de ' + total;
    }
    if (els.newsPrev) {
      els.newsPrev.classList.toggle('disabled', STATE.newsPage <= 0);
    }
    if (els.newsNext) {
      els.newsNext.classList.toggle('disabled', STATE.newsPage >= total - 1);
    }
    if (els.newsStatus) {
      if (news.loading) {
        els.newsStatus.textContent = 'Atualizando notícias…';
      } else if (news.error) {
        els.newsStatus.textContent = news.error + ' • use Atualizar para tentar de novo';
      } else {
        els.newsStatus.textContent = 'OK abre no navegador • ← → trocam de página • Voltar fecha';
      }
    }

    newsRows = [];
    els.newsList.innerHTML = '';

    if (!pageItems.length) {
      var empty = document.createElement('div');
      empty.className = 'loading-row';
      if (news.loading) {
        var spinner = document.createElement('span');
        spinner.className = 'spinner';
        empty.appendChild(spinner);
        empty.appendChild(document.createTextNode('Carregando notícias'));
      } else {
        empty.textContent = news.error || 'Nenhuma notícia disponível';
      }
      els.newsList.appendChild(empty);
    }

    pageItems.forEach(function (item, index) {
      var row = document.createElement('div');
      row.className = 'row news-item';
      row.setAttribute('data-news-item', String(pageStart + index));

      var icon = document.createElement('div');
      icon.className = 'row-icon';
      icon.appendChild(App.glyphs.newsGlyph());

      var title = document.createElement('div');
      title.className = 'row-title';
      title.textContent = item.title;

      var meta = document.createElement('div');
      meta.className = 'row-meta';
      meta.textContent = item.time ? timeAgo(item.time) : (item.source || '');

      row.appendChild(icon);
      row.appendChild(title);
      row.appendChild(meta);
      els.newsList.appendChild(row);
      newsRows.push(row);
    });

    if (STATE.newsIndex >= pageItems.length) {
      STATE.newsIndex = Math.max(0, pageItems.length - 1);
    }
    refreshNewsFocus();
  }

  function newsActions() {
    return [els.newsRefresh, els.newsPrev, els.newsNext];
  }

  function refreshNewsFocus() {
    if (!STATE.newsOpen) {
      return;
    }
    if (els.newsDone) {
      els.newsDone.classList.toggle('focused', STATE.newsZone === 'done');
    }
    var actions = newsActions();
    for (var i = 0; i < actions.length; i += 1) {
      if (actions[i]) {
        actions[i].classList.toggle('focused', STATE.newsZone === 'actions' && STATE.newsActionIndex === i);
      }
    }
    newsRows.forEach(function (row, index) {
      var focused = STATE.newsZone === 'list' && index === STATE.newsIndex;
      row.classList.toggle('focused', focused);
      if (focused) {
        App.dom.scrollRowIntoView(els.newsList, row);
      }
    });
  }

  function renderNewsSettings() {
    if (!els.newsSettingsStatus) {
      return;
    }
    if (!STATE.newsEditing && els.newsFeedInput) {
      els.newsFeedInput.value = news.feedUrl || '';
    }
    if (els.newsSettingsStatus) {
      if (news.loading) {
        els.newsSettingsStatus.textContent = 'Atualizando';
      } else if (news.error) {
        els.newsSettingsStatus.textContent = 'Erro';
      } else {
        els.newsSettingsStatus.textContent = news.items.length + ' notícias';
      }
    }
    if (els.newsFeedMeta) {
      if (news.error && !news.items.length) {
        els.newsFeedMeta.textContent = news.error;
      } else {
        els.newsFeedMeta.textContent = displayTitle() + (news.items.length ? ' · ' + news.items.length + ' itens' : '');
      }
    }
    if (els.newsRefreshMeta) {
      els.newsRefreshMeta.textContent = news.loading ? 'Buscando' : (news.updatedAt ? timeAgo(news.updatedAt) : 'Agora');
    }
    if (els.newsSettingsHint) {
      if (STATE.newsEditing) {
        els.newsSettingsHint.textContent = 'Digite o endereço do feed RSS • OK aplica • Voltar cancela';
      } else if (news.error) {
        els.newsSettingsHint.textContent = news.error + ' • OK em Atualizar agora tenta de novo';
      } else {
        els.newsSettingsHint.textContent = 'As notícias são atualizadas a cada 1 hora';
      }
    }
    if (App.settings && App.settings.refreshNewsFocus) {
      App.settings.refreshNewsFocus();
    }
  }

  function clearRetry() {
    if (retryTimer) {
      clearTimeout(retryTimer);
      retryTimer = null;
    }
  }

  function scheduleRetry() {
    clearRetry();
    var delay = retryDelay;
    retryTimer = setTimeout(function () {
      retryTimer = null;
      news.lastAttempt = 0;
      refreshNews(true);
    }, delay);
    retryDelay = Math.min(retryDelay * 2, 300000);
  }

  function finishError(message) {
    news.loading = false;
    news.error = message;
    scheduleRetry();
    renderNewsCard();
    renderNewsPage();
    renderNewsSettings();
  }

  function applyFeed(text) {
    var parsed;
    try {
      parsed = parseFeed(text);
    } catch (error) {
      finishError(error && error.message ? error.message : 'Feed inválido');
      return;
    }
    news.items = parsed.items;
    news.title = parsed.title;
    news.updatedAt = Date.now();
    news.loading = false;
    news.error = '';
    news.lastAttempt = news.updatedAt;
    rotateIndex = 0;
    retryDelay = 15000;
    clearRetry();
    saveCache();
    renderNewsCard();
    renderNewsPage();
    renderNewsSettings();
  }

  function fetchFeed() {
    var token = requestId + 1;
    requestId = token;
    news.loading = true;
    news.error = '';
    news.lastAttempt = Date.now();
    renderNewsCard();
    renderNewsPage();
    renderNewsSettings();

    var url = news.feedUrl;
    requestText(url, function (error, text) {
      if (token !== requestId) {
        return;
      }
      if (!error) {
        applyFeed(text);
        return;
      }
      rootFetch(url, function (rootError, rootText) {
        if (token !== requestId) {
          return;
        }
        if (!rootError && rootText) {
          applyFeed(rootText);
          return;
        }
        finishError('Não foi possível carregar as notícias');
      });
    });
  }

  function refreshNews(force) {
    if (news.loading) {
      return;
    }
    var now = Date.now();
    if (!force && news.updatedAt && now - news.updatedAt < CONFIG.newsRefreshInterval) {
      renderNewsCard();
      renderNewsPage();
      renderNewsSettings();
      return;
    }
    if (!force && news.lastAttempt && now - news.lastAttempt < 30000) {
      return;
    }
    fetchFeed();
  }

  function openNews() {
    if (STATE.newsOpen) {
      return;
    }
    if (STATE.settingsOpen) {
      App.settings.closeSettings();
    }
    if (STATE.allOpen) {
      App.allApps.closeAllApps();
    }
    STATE.newsOpen = true;
    STATE.screen = 'news';
    STATE.newsFocus = false;
    STATE.weatherFocus = false;
    STATE.gearFocus = false;
    STATE.appsFocus = false;
    STATE.emptyFocus = false;
    STATE.newsZone = 'list';
    STATE.newsIndex = 0;
    STATE.newsPage = 0;
    els.newsPage.classList.add('open');
    els.newsPage.setAttribute('aria-hidden', 'false');
    els.hint.classList.remove('visible');
    store.hoverLockUntil = Date.now() + 450;
    renderNewsPage();
    refreshNews(false);
  }

  function closeNews() {
    if (!STATE.newsOpen) {
      return;
    }
    STATE.newsOpen = false;
    STATE.screen = 'home';
    els.newsPage.classList.remove('open');
    els.newsPage.setAttribute('aria-hidden', 'true');
    App.home.refreshHomeFocus();
  }

  function changePage(delta) {
    var total = totalPages();
    var next = App.utils.clamp(STATE.newsPage + delta, 0, total - 1);
    if (next === STATE.newsPage) {
      return;
    }
    STATE.newsPage = next;
    STATE.newsIndex = 0;
    renderNewsPage();
  }

  function activateNewsAction() {
    if (STATE.newsActionIndex === 0) {
      refreshNews(true);
    } else if (STATE.newsActionIndex === 1) {
      changePage(-1);
    } else if (STATE.newsActionIndex === 2) {
      changePage(1);
    }
  }

  function openArticle(item) {
    if (!item || !item.link) {
      App.ui.toast('Notícia sem link');
      return;
    }
    if (STATE.launching) {
      return;
    }
    STATE.launching = true;
    if (STATE.returnOnExit && !STATE.rootOk) {
      App.returnWatch.startInAppReturnWatch('com.webos.app.browser');
    }
    App.luna.lunaRequest(CONFIG.appManager, 'launch', {
      id: 'com.webos.app.browser',
      params: { target: item.link }
    }, 8000, false).then(function (response) {
      setTimeout(function () {
        STATE.launching = false;
      }, 700);
      if (response && response.returnValue === false) {
        App.returnWatch.cancelInAppReturnWatch();
        App.ui.toast('Não foi possível abrir o navegador');
      }
    }).catch(function () {
      STATE.launching = false;
      App.returnWatch.cancelInAppReturnWatch();
      App.ui.toast('Não foi possível abrir o navegador');
    });
  }

  function newsItems() {
    var items = [els.newsDone].concat(newsActions());
    return items.concat(newsRows);
  }

  function newsCurrent() {
    if (STATE.newsZone === 'done') {
      return els.newsDone;
    }
    if (STATE.newsZone === 'actions') {
      return newsActions()[STATE.newsActionIndex] || null;
    }
    return newsRows[STATE.newsIndex] || null;
  }

  function newsFocusElement(element) {
    if (element === els.newsDone) {
      STATE.newsZone = 'done';
    } else if (newsActions().indexOf(element) >= 0) {
      STATE.newsZone = 'actions';
      STATE.newsActionIndex = newsActions().indexOf(element);
    } else {
      var index = Number(element.getAttribute('data-news-item'));
      STATE.newsZone = 'list';
      STATE.newsIndex = isNaN(index) ? 0 : index - pageStart;
    }
    refreshNewsFocus();
  }

  function newsKey(code) {
    if (STATE.newsZone === 'list' && (code === KEY.LEFT || code === KEY.RIGHT)) {
      changePage(code === KEY.LEFT ? -1 : 1);
      return true;
    }
    if (STATE.newsZone === 'done' && code === KEY.DOWN) {
      STATE.newsZone = 'actions';
      STATE.newsActionIndex = 0;
      refreshNewsFocus();
      return true;
    }
    if (STATE.newsZone === 'actions' && code === KEY.UP) {
      STATE.newsZone = 'done';
      refreshNewsFocus();
      return true;
    }
    return false;
  }

  function onNewsCardClick(event) {
    if (event) {
      event.stopPropagation();
    }
    openNews();
  }

  function onNewsCardHover() {
    STATE.newsFocus = true;
    STATE.gearFocus = false;
    STATE.appsFocus = false;
    STATE.emptyFocus = false;
    STATE.weatherFocus = false;
    App.home.refreshHomeFocus();
  }

  function onNewsDoneClick() {
    closeNews();
  }

  function onNewsDoneHover() {
    if (Date.now() < store.hoverLockUntil || !App.pointer.pointerActive()) {
      return;
    }
    STATE.newsZone = 'done';
    refreshNewsFocus();
  }

  function actionIndexFor(name) {
    if (name === 'refresh') {
      return 0;
    }
    if (name === 'prev') {
      return 1;
    }
    return 2;
  }

  function onNewsActionHover(event) {
    if (Date.now() < store.hoverLockUntil || !App.pointer.pointerActive()) {
      return;
    }
    var button = App.dom.closest(event.target, '[data-news-action]');
    if (!button) {
      return;
    }
    STATE.newsZone = 'actions';
    STATE.newsActionIndex = actionIndexFor(button.getAttribute('data-news-action'));
    refreshNewsFocus();
  }

  function onNewsActionClick(event) {
    var button = App.dom.closest(event.target, '[data-news-action]');
    if (!button) {
      return;
    }
    STATE.newsZone = 'actions';
    STATE.newsActionIndex = actionIndexFor(button.getAttribute('data-news-action'));
    activateNewsAction();
    refreshNewsFocus();
  }

  function onNewsItemHover(event) {
    if (Date.now() < store.hoverLockUntil || !App.pointer.pointerActive()) {
      return;
    }
    var row = App.dom.closest(event.target, '[data-news-item]');
    if (!row) {
      return;
    }
    var globalIndex = Number(row.getAttribute('data-news-item'));
    var localIndex = globalIndex - pageStart;
    if (localIndex < 0) {
      return;
    }
    STATE.newsZone = 'list';
    STATE.newsIndex = localIndex;
    refreshNewsFocus();
  }

  function onNewsItemClick(event) {
    if (event) {
      event.stopPropagation();
    }
    var row = App.dom.closest(event.target, '[data-news-item]');
    if (!row) {
      return;
    }
    var globalIndex = Number(row.getAttribute('data-news-item'));
    var item = news.items[globalIndex];
    if (!item) {
      return;
    }
    STATE.newsIndex = globalIndex - pageStart;
    stateListFocus();
    openArticle(item);
  }

  function stateListFocus() {
    STATE.newsZone = 'list';
    refreshNewsFocus();
  }

  function activateNewsRow() {
    if (STATE.newsSettingsIndex === 0) {
      startFeedEdit();
    } else if (STATE.newsSettingsIndex === 1) {
      refreshNews(true);
    } else if (STATE.newsSettingsIndex === 2) {
      restoreDefaultFeed();
    }
  }

  function setFeedUrl(value) {
    var url = normalizeFeedUrl(value);
    if (!url) {
      App.ui.toast('Endereço de feed inválido');
      renderNewsSettings();
      return false;
    }
    if (url === news.feedUrl) {
      renderNewsSettings();
      return true;
    }
    news.feedUrl = url;
    news.title = '';
    news.items = [];
    news.updatedAt = 0;
    news.error = '';
    news.loading = false;
    news.lastAttempt = 0;
    rotateIndex = 0;
    requestId += 1;
    retryDelay = 15000;
    clearRetry();
    removeKey(CONFIG.newsCacheKey);
    saveState();
    renderNewsCard();
    renderNewsPage();
    App.ui.toast('Buscando notícias');
    refreshNews(true);
    renderNewsSettings();
    return true;
  }

  function restoreDefaultFeed() {
    if (setFeedUrl(CONFIG.newsDefaultFeed)) {
      App.ui.toast('Feed padrão restaurado');
    }
  }

  function startFeedEdit() {
    if (!els.newsFeedInput) {
      return;
    }
    STATE.newsEditing = true;
    STATE.settingsZone = 'news';
    STATE.newsSettingsIndex = 0;
    els.newsFeedInput.value = news.feedUrl || '';
    try {
      els.newsFeedInput.focus();
      els.newsFeedInput.select();
    } catch (error) {
      void error;
    }
    renderNewsSettings();
  }

  function finishFeedEdit(commit) {
    if (!STATE.newsEditing) {
      return;
    }
    var input = els.newsFeedInput;
    var value = input ? input.value : news.feedUrl;
    STATE.newsEditing = false;
    if (input) {
      input.blur();
    }
    if (!commit) {
      if (input) {
        input.value = news.feedUrl;
      }
      renderNewsSettings();
      return;
    }
    if (!normalizeFeedUrl(value)) {
      if (input) {
        input.value = news.feedUrl;
      }
      App.ui.toast('Endereço de feed inválido');
      renderNewsSettings();
      return;
    }
    setFeedUrl(value);
  }

  function cancelFeedEdit() {
    finishFeedEdit(false);
  }

  function bindUi() {
    if (uiBound || !els.newsFeedInput) {
      return;
    }
    uiBound = true;

    els.newsFeedInput.addEventListener('focus', function () {
      STATE.newsEditing = true;
      STATE.settingsZone = 'news';
      STATE.newsSettingsIndex = 0;
      if (App.settings && App.settings.refreshSettingsFocus) {
        App.settings.refreshSettingsFocus();
      }
      renderNewsSettings();
    }, false);

    els.newsFeedInput.addEventListener('blur', function () {
      if (STATE.newsEditing) {
        finishFeedEdit(true);
      }
    }, false);

    els.newsFeedInput.addEventListener('keydown', function (event) {
      if (event.keyCode === KEY.ENTER) {
        event.preventDefault();
        event.stopPropagation();
        finishFeedEdit(true);
      } else if (event.keyCode === KEY.BACK || event.keyCode === KEY.ESC) {
        event.preventDefault();
        event.stopPropagation();
        finishFeedEdit(false);
      }
    }, false);
  }

  function startNews() {
    loadState();
    loadCache();
    bindUi();
    renderNewsCard();
    renderNewsPage();
    renderNewsSettings();
    startRotation();
    if (!news.updatedAt || Date.now() - news.updatedAt >= CONFIG.newsRefreshInterval) {
      refreshNews(false);
    }
    if (!refreshTimer) {
      refreshTimer = setInterval(function () {
        refreshNews(false);
      }, CONFIG.newsRefreshInterval);
    }
  }

  App.news = {
    startNews: startNews,
    refreshNews: refreshNews,
    renderNewsCard: renderNewsCard,
    renderNewsPage: renderNewsPage,
    renderNewsSettings: renderNewsSettings,
    refreshNewsFocus: refreshNewsFocus,
    openNews: openNews,
    closeNews: closeNews,
    openArticle: openArticle,
    activateNewsRow: activateNewsRow,
    onNewsCardClick: onNewsCardClick,
    onNewsCardHover: onNewsCardHover,
    onNewsDoneClick: onNewsDoneClick,
    onNewsDoneHover: onNewsDoneHover,
    onNewsActionHover: onNewsActionHover,
    onNewsActionClick: onNewsActionClick,
    onNewsItemHover: onNewsItemHover,
    onNewsItemClick: onNewsItemClick,
    setFeedUrl: setFeedUrl,
    restoreDefaultFeed: restoreDefaultFeed,
    startFeedEdit: startFeedEdit,
    finishFeedEdit: finishFeedEdit,
    cancelFeedEdit: cancelFeedEdit,
    getFeedUrl: function () {
      return news.feedUrl;
    },
    getError: function () {
      return news.error;
    },
    isLoading: function () {
      return news.loading;
    }
  };

  App.focus.register('news', {
    items: newsItems,
    current: newsCurrent,
    onFocus: newsFocusElement,
    onKey: newsKey,
    onBack: closeNews
  });
})(window);
