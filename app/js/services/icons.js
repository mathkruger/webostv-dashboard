(function (window) {
  'use strict';

  var App = window.Dashboard || (window.Dashboard = {});
  var store = App.store;
  var STATE = store.STATE;
  var els = store.els;
  var CONFIG = App.config;
  var iconMemory = {};
  var iconPending = {};
  var iconFailed = {};
  var iconQueue = [];
  var iconActive = 0;
  var iconQuotaWarned = false;

  function clearIconCache() {
    iconMemory = {};
    iconFailed = {};
    try {
      var keys = [];
      for (var i = 0; i < localStorage.length; i += 1) {
        var key = localStorage.key(i);
        if (key && key.indexOf(CONFIG.iconCachePrefix) === 0) {
          keys.push(key);
        }
      }
      keys.forEach(function (key) {
        localStorage.removeItem(key);
      });
    } catch (error) {
      void error;
    }
  }

  function getCachedIcon(path) {
    if (!path) {
      return null;
    }
    if (iconMemory[path]) {
      return iconMemory[path];
    }
    try {
      var raw = localStorage.getItem(CONFIG.iconCachePrefix + path);
      if (!raw) {
        return null;
      }
      var entry = JSON.parse(raw);
      if (entry && entry.d && entry.t && Date.now() - entry.t < CONFIG.iconCacheMaxAge) {
        iconMemory[path] = entry.d;
        return entry.d;
      }
      localStorage.removeItem(CONFIG.iconCachePrefix + path);
    } catch (error) {
      void error;
    }
    return null;
  }

  function storeIcon(path, dataUrl) {
    iconMemory[path] = dataUrl;
    try {
      localStorage.setItem(CONFIG.iconCachePrefix + path, JSON.stringify({
        d: dataUrl,
        t: Date.now()
      }));
    } catch (error) {
      if (!iconQuotaWarned) {
        iconQuotaWarned = true;
        console.warn('Não foi possível salvar o cache de ícones', error);
      }
    }
  }

  function ensureIcons(items) {
    if (!STATE.rootOk || !items || !items.length) {
      return;
    }
    items.forEach(function (item) {
      if (!item || item.type !== 'app' || !item.icon) {
        return;
      }
      if (getCachedIcon(item.icon) || iconPending[item.icon] || iconFailed[item.icon]) {
        return;
      }
      enqueueIcon(item.icon);
    });
  }

  function enqueueIcon(path) {
    if (iconPending[path] || iconMemory[path]) {
      return;
    }
    iconPending[path] = true;
    iconQueue.push(path);
    pumpIconQueue();
  }

  function pumpIconQueue() {
    while (iconActive < 3 && iconQueue.length) {
      var path = iconQueue.shift();
      iconActive += 1;
      fetchIcon(path).then(function (dataUrl) {
        storeIcon(path, dataUrl);
        iconFailed[path] = false;
        updateAllIconNodes();
      }).catch(function () {
        iconFailed[path] = true;
      }).then(function () {
        iconActive -= 1;
        iconPending[path] = false;
        pumpIconQueue();
      });
    }
  }

  function fetchIcon(path) {
    var command;
    try {
      command = 'base64 ' + App.luna.shellQuote(path) + " 2>/dev/null | tr -d '\\n'";
    } catch (error) {
      return Promise.reject(error);
    }
    return App.luna.rootExec(command).then(function (output) {
      var base64 = String(output || '').replace(/\s+/g, '');
      if (base64.length < 16 || !/^[A-Za-z0-9+/=]+$/.test(base64)) {
        throw new Error('Ícone vazio');
      }
      return 'data:' + mimeFromBase64(base64) + ';base64,' + base64;
    });
  }

  function mimeFromBase64(base64) {
    if (base64.indexOf('iVBOR') === 0) {
      return 'image/png';
    }
    if (base64.indexOf('/9j/') === 0) {
      return 'image/jpeg';
    }
    if (base64.indexOf('R0lGOD') === 0) {
      return 'image/gif';
    }
    if (base64.indexOf('UklGR') === 0) {
      return 'image/webp';
    }
    if (base64.indexOf('PD94') === 0 || base64.indexOf('PHN2') === 0) {
      return 'image/svg+xml';
    }
    return 'image/png';
  }

  function updateAllIconNodes() {
    var maps = [store.tileNodes, store.currentNodes, store.addNodes, store.allAppNodes, store.allInputNodes];
    maps.forEach(function (map) {
      Object.keys(map).forEach(function (key) {
        var node = map[key];
        if (!node || !node.__iconPath) {
          return;
        }
        var dataUrl = iconMemory[node.__iconPath];
        if (dataUrl && node.__iconData !== dataUrl) {
          setNodeImage(node, dataUrl);
        }
      });
    });
  }

  function setNodeImage(node, dataUrl) {
    node.innerHTML = '';
    node.style.background = '';
    var image = document.createElement('img');
    image.src = dataUrl;
    image.alt = '';
    image.draggable = false;
    node.appendChild(image);
    node.__iconData = dataUrl;
  }

  function setNodeMonogram(node, item) {
    node.innerHTML = '';
    var span = document.createElement('span');
    span.className = 'monogram';
    span.textContent = App.utils.initialFor(item.title);
    node.appendChild(span);
    node.style.background = App.utils.tintFor(item.id);
    node.__iconData = null;
  }

  function fillIconNode(node, item) {
    if (!node) {
      return;
    }
    node.__iconPath = '';
    node.__iconData = null;
    if (item.type === 'input') {
      node.innerHTML = '';
      node.style.background = '';
      node.appendChild(App.glyphs.inputGlyph(item.kind, item.number));
      return;
    }
    node.__iconPath = item.icon || '';
    if (item.icon) {
      var cached = getCachedIcon(item.icon);
      if (cached) {
        setNodeImage(node, cached);
        return;
      }
    }
    setNodeMonogram(node, item);
  }

  App.icons = {
    clearIconCache: clearIconCache,
    getCachedIcon: getCachedIcon,
    storeIcon: storeIcon,
    ensureIcons: ensureIcons,
    enqueueIcon: enqueueIcon,
    pumpIconQueue: pumpIconQueue,
    fetchIcon: fetchIcon,
    mimeFromBase64: mimeFromBase64,
    updateAllIconNodes: updateAllIconNodes,
    setNodeImage: setNodeImage,
    setNodeMonogram: setNodeMonogram,
    fillIconNode: fillIconNode
  };
})(window);
