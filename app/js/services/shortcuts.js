(function (window) {
  'use strict';

  var App = window.Dashboard || (window.Dashboard = {});
  var store = App.store;
  var STATE = store.STATE;
  var els = store.els;
  var CONFIG = App.config;

  function readConfig() {
    try {
      var raw = localStorage.getItem(CONFIG.storageKey);
      if (raw === null) {
        return { exists: false, shortcuts: [] };
      }
      var parsed = JSON.parse(raw);
      if (!parsed || !parsed.shortcuts || !parsed.shortcuts.length) {
        return { exists: true, shortcuts: [] };
      }
      var shortcuts = [];
      parsed.shortcuts.forEach(function (entry) {
        var normalized = normalizeShortcut(entry);
        if (normalized) {
          shortcuts.push(normalized);
        }
      });
      return { exists: true, shortcuts: shortcuts.slice(0, CONFIG.maxShortcuts) };
    } catch (error) {
      return { exists: false, shortcuts: [] };
    }
  }

  function normalizeShortcut(entry) {
    if (!entry || typeof entry !== 'object') {
      return null;
    }
    var id = typeof entry.id === 'string' ? entry.id : '';
    var launchId = typeof entry.launchId === 'string' ? entry.launchId : id;
    var title = typeof entry.title === 'string' ? entry.title : id;
    var type = entry.type === 'input' ? 'input' : 'app';
    if (!id || !launchId) {
      return null;
    }
    if (!/^[A-Za-z0-9._:-]+$/.test(id) || !/^[A-Za-z0-9._:-]+$/.test(launchId)) {
      return null;
    }
    var icon = typeof entry.icon === 'string' && entry.icon.charAt(0) === '/' ? entry.icon : '';
    return {
      id: id,
      launchId: launchId,
      title: title,
      type: type,
      kind: typeof entry.kind === 'string' ? entry.kind : '',
      icon: icon
    };
  }

  function saveConfig() {
    try {
      localStorage.setItem(CONFIG.storageKey, JSON.stringify({
        version: 1,
        shortcuts: STATE.shortcuts
      }));
    } catch (error) {
      void error;
    }
  }

  function seedFallback() {
    var seeded = [];
    CONFIG.priority.forEach(function (id) {
      if (seeded.length >= CONFIG.seedCount) {
        return;
      }
      var app = App.utils.findById(CONFIG.fallbackApps, id);
      if (app) {
        seeded.push(makeAppShortcut(app));
      }
    });
    if (seeded.length < CONFIG.seedCount) {
      CONFIG.fallbackApps.forEach(function (app) {
        if (seeded.length < CONFIG.seedCount && !shortcutExists(app.id, 'app', seeded)) {
          seeded.push(makeAppShortcut(app));
        }
      });
    }
    return seeded;
  }

  function seedFromCatalog(catalog) {
    var seeded = [];
    CONFIG.priority.forEach(function (id) {
      if (seeded.length >= CONFIG.seedCount) {
        return;
      }
      var app = App.utils.findById(catalog, id);
      if (app) {
        seeded.push(makeAppShortcut(app));
      }
    });
    if (seeded.length < CONFIG.seedCount) {
      catalog.forEach(function (app) {
        if (seeded.length < CONFIG.seedCount && !shortcutExists(app.id, 'app', seeded)) {
          seeded.push(makeAppShortcut(app));
        }
      });
    }
    return seeded;
  }

  function makeAppShortcut(app) {
    return {
      id: app.id,
      launchId: app.id,
      title: app.title || app.id,
      type: 'app',
      kind: '',
      icon: app.icon || ''
    };
  }

  function makeInputShortcut(input) {
    return {
      id: input.id,
      launchId: input.id,
      title: input.title || input.id,
      type: 'input',
      kind: input.kind || 'input',
      icon: ''
    };
  }

  function shortcutExists(id, type, list) {
    var target = list || STATE.shortcuts;
    for (var i = 0; i < target.length; i += 1) {
      if (target[i].id === id && target[i].type === type) {
        return true;
      }
    }
    return false;
  }

  function findShortcutIndex(id, type) {
    for (var i = 0; i < STATE.shortcuts.length; i += 1) {
      if (STATE.shortcuts[i].id === id && STATE.shortcuts[i].type === type) {
        return i;
      }
    }
    return -1;
  }

  App.shortcuts = {
    readConfig: readConfig,
    normalizeShortcut: normalizeShortcut,
    saveConfig: saveConfig,
    seedFallback: seedFallback,
    seedFromCatalog: seedFromCatalog,
    makeAppShortcut: makeAppShortcut,
    makeInputShortcut: makeInputShortcut,
    shortcutExists: shortcutExists,
    findShortcutIndex: findShortcutIndex
  };
})(window);
