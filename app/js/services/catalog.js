(function (window) {
  'use strict';

  var App = window.Dashboard || (window.Dashboard = {});
  var store = App.store;
  var STATE = store.STATE;
  var els = store.els;
  var CONFIG = App.config;

  function loadApps() {
    return appsFromRoot().then(function (apps) {
      STATE.appsSource = 'live';
      STATE.rootOk = true;
      return apps;
    }).catch(function () {
      STATE.rootOk = false;
      return appsFromLuna().then(function (apps) {
        STATE.appsSource = 'live';
        return apps;
      });
    }).then(function (apps) {
      if (!apps || !apps.length) {
        throw new Error('Lista vazia');
      }
      return apps;
    }).catch(function () {
      STATE.appsSource = 'fallback';
      return CONFIG.fallbackApps.map(function (app) {
        return {
          id: app.id,
          title: app.title,
          icon: '',
          type: 'app'
        };
      }).sort(compareApps);
    });
  }

  function appsFromRoot() {
    return App.luna.rootExec("luna-send -n 1 luna://com.webos.applicationManager/listLaunchPoints '{}'").then(function (output) {
      return normalizeLaunchPoints(JSON.parse(output));
    });
  }

  function appsFromLuna() {
    return App.luna.lunaRequest(CONFIG.appManager, 'listLaunchPoints', {}, 7000, false).then(function (result) {
      return normalizeLaunchPoints(result);
    }).catch(function () {
      return App.luna.lunaRequest(CONFIG.appManager, 'listApps', {}, 7000, false).then(function (result) {
        return normalizeApps(result);
      });
    });
  }

  function normalizeLaunchPoints(result) {
    var points = (result && result.launchPoints) || [];
    var apps = [];
    var seen = {};
    points.forEach(function (point) {
      var app = normalizeAppEntry(point);
      if (app && !seen[app.id]) {
        seen[app.id] = true;
        apps.push(app);
      }
    });
    return apps.sort(compareApps);
  }

  function normalizeApps(result) {
    var entries = (result && result.apps) || [];
    var apps = [];
    var seen = {};
    entries.forEach(function (entry) {
      var app = normalizeAppEntry(entry);
      if (app && !seen[app.id]) {
        seen[app.id] = true;
        apps.push(app);
      }
    });
    return apps.sort(compareApps);
  }

  function normalizeAppEntry(entry) {
    if (!entry || !entry.id || entry.id === CONFIG.appId) {
      return null;
    }
    if (entry.id === 'com.webos.app.home') {
      return null;
    }
    var icon = entry.largeIcon || entry.mediumLargeIcon || entry.icon || '';
    if (icon && icon.charAt(0) !== '/' && entry.folderPath) {
      icon = entry.folderPath.replace(/\/$/, '') + '/' + icon;
    }
    if (!icon || icon.charAt(0) !== '/') {
      icon = '';
    }
    return {
      id: entry.id,
      title: entry.title || entry.id,
      icon: icon,
      type: 'app'
    };
  }

  function compareApps(a, b) {
    var left = String(a.title || '').toLowerCase();
    var right = String(b.title || '').toLowerCase();
    if (left < right) {
      return -1;
    }
    if (left > right) {
      return 1;
    }
    return 0;
  }

  function loadInputs() {
    return App.luna.lunaRequest(CONFIG.eimService, 'getAllInputStatus', {}, 7000, false).then(function (result) {
      return normalizeInputs(result);
    }).catch(function () {
      return App.luna.rootExec("luna-send -n 1 luna://com.webos.service.eim/getAllInputStatus '{}'").then(function (output) {
        return normalizeInputs(JSON.parse(output));
      });
    }).catch(function () {
      return CONFIG.fallbackInputs.slice();
    });
  }

  function normalizeInputs(result) {
    var devices = (result && result.devices) || [];
    var inputs = [{ id: 'com.webos.app.livetv', title: 'TV ao vivo', kind: 'tv' }];
    var seen = { 'com.webos.app.livetv': true };
    devices.forEach(function (device) {
      if (!device || !device.appId || seen[device.appId]) {
        return;
      }
      var kind = 'input';
      var number = '';
      if (device.appId.indexOf('com.webos.app.hdmi') === 0) {
        kind = 'hdmi';
        number = String(device.port || '');
      } else if (device.appId.indexOf('com.webos.app.externalinput.av') === 0) {
        kind = 'av';
      } else if (device.appId.indexOf('com.webos.app.externalinput.component') === 0) {
        kind = 'component';
      }
      seen[device.appId] = true;
      inputs.push({
        id: device.appId,
        title: device.label || device.appId,
        kind: kind,
        number: number
      });
    });
    return inputs;
  }

  function refreshAll(options) {
    var opts = options || {};
    if (STATE.loading && !opts.force) {
      return Promise.resolve();
    }
    STATE.loading = true;
    App.ui.setStatus('Carregando apps…', false, true);

    return Promise.all([loadApps(), loadInputs()]).then(function (results) {
      var apps = results[0];
      var inputs = results[1];
      store.appCatalog = apps;
      store.inputCatalog = inputs;

      if (!opts.keepIcons) {
        if (opts.manual) {
          App.icons.clearIconCache();
        }
      }

      if (STATE.allowSeed && !STATE.userTouched) {
        var seeded = STATE.appsSource === 'live' ? App.shortcuts.seedFromCatalog(store.appCatalog) : App.shortcuts.seedFallback();
        STATE.allowSeed = false;
        if (seeded.length) {
          STATE.shortcuts = seeded;
          App.shortcuts.saveConfig();
        }
      } else if (STATE.appsSource === 'live' && !STATE.userTouched) {
        mergeCatalogMetadata();
      }

      STATE.loading = false;
      STATE.lastRefresh = Date.now();
      App.ui.setStatus(STATE.appsSource === 'live' ? 'Pronto' : 'Usando lista básica (Homebrew Channel indisponível)', STATE.appsSource !== 'live', true);
      App.home.renderHome();
      if (STATE.settingsOpen) {
        App.settings.renderSettings();
      }
      if (STATE.allOpen) {
        App.allApps.renderAllApps();
      }
      App.icons.ensureIcons(STATE.shortcuts);
      setTimeout(function () {
        App.icons.ensureIcons(store.appCatalog);
      }, 1200);
      App.autostart.checkAutostart();
      App.returnWatch.ensureReturnWatcher(true);
      if (opts.manual) {
        App.ui.toast('Lista atualizada');
      }
    }).catch(function () {
      STATE.loading = false;
      App.ui.setStatus('Não foi possível carregar a lista de apps', true, true);
      if (opts.manual) {
        App.ui.toast('Não foi possível atualizar a lista');
      }
    });
  }

  function mergeCatalogMetadata() {
    var index = {};
    store.appCatalog.forEach(function (app) {
      index[app.id] = app;
    });
    var next = [];
    var changed = false;
    STATE.shortcuts.forEach(function (shortcut) {
      if (shortcut.type !== 'app') {
        next.push(shortcut);
        return;
      }
      var app = index[shortcut.id];
      if (!app) {
        changed = true;
        return;
      }
      if (app.icon !== shortcut.icon || app.title !== shortcut.title) {
        shortcut.icon = app.icon;
        shortcut.title = app.title;
        changed = true;
      }
      next.push(shortcut);
    });
    if (next.length !== STATE.shortcuts.length || changed) {
      STATE.shortcuts = next;
      App.shortcuts.saveConfig();
    }
  }

  App.catalog = {
    loadApps: loadApps,
    appsFromRoot: appsFromRoot,
    appsFromLuna: appsFromLuna,
    normalizeLaunchPoints: normalizeLaunchPoints,
    normalizeApps: normalizeApps,
    normalizeAppEntry: normalizeAppEntry,
    compareApps: compareApps,
    loadInputs: loadInputs,
    normalizeInputs: normalizeInputs,
    refreshAll: refreshAll,
    mergeCatalogMetadata: mergeCatalogMetadata
  };
})(window);
