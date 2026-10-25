(function (window) {
  'use strict';

  var App = window.Dashboard || (window.Dashboard = {});
  var store = App.store;
  var STATE = store.STATE;
  var els = store.els;
  var CONFIG = App.config;
  var RETURN_SCRIPT_PATH = App.scripts.RETURN_SCRIPT_PATH;
  var RETURN_PID_FILE = App.scripts.RETURN_PID_FILE;
  var RETURN_ARMED_FILE = App.scripts.RETURN_ARMED_FILE;
  var RETURN_PREV_FILE = App.scripts.RETURN_PREV_FILE;
  var RETURN_LOG_PATH = App.scripts.RETURN_LOG_PATH;
  var RETURN_SETTING_KEY = App.scripts.RETURN_SETTING_KEY;
  var RETURN_SCRIPT_B64 = App.scripts.RETURN_SCRIPT_B64;

  function readReturnSetting() {
    try {
      var raw = localStorage.getItem(RETURN_SETTING_KEY);
      if (raw === null) {
        return true;
      }
      return raw === '1';
    } catch (error) {
      return true;
    }
  }

  function saveReturnSetting() {
    try {
      localStorage.setItem(RETURN_SETTING_KEY, STATE.returnOnExit ? '1' : '0');
    } catch (error) {
      void error;
    }
  }

  function startInAppReturnWatch(targetId) {
    cancelInAppReturnWatch();
    if (!window.webOS || !window.webOS.service || typeof window.webOS.service.request !== 'function') {
      return;
    }
    var seen = false;
    try {
      STATE.returnWatch = window.webOS.service.request(CONFIG.appManager, {
        method: 'getForegroundAppInfo',
        parameters: { subscribe: true },
        subscribe: true,
        onSuccess: function (response) {
          var appId = response && response.appId;
          if (!appId) {
            return;
          }
          if (appId === targetId) {
            seen = true;
            return;
          }
          if (!seen) {
            return;
          }
          if (appId === CONFIG.appId) {
            cancelInAppReturnWatch();
            return;
          }
          if (isReturnAppId(appId)) {
            cancelInAppReturnWatch();
            App.luna.lunaRequest(CONFIG.appManager, 'launch', { id: CONFIG.appId, params: {} }, 8000, false).catch(function () {
              void 0;
            });
          }
        },
        onFailure: function () {
          cancelInAppReturnWatch();
        }
      });
    } catch (error) {
      STATE.returnWatch = null;
    }
  }

  function isReturnAppId(appId) {
    return appId === 'com.webos.app.home' ||
      appId === 'com.webos.app.livetv' ||
      appId === 'com.webos.app.launcher' ||
      /^com\.webos\.app\.hdmi\d+$/.test(appId) ||
      appId.indexOf('com.webos.app.externalinput') === 0;
  }

  function cancelInAppReturnWatch() {
    if (STATE.returnWatch && typeof STATE.returnWatch.cancel === 'function') {
      try {
        STATE.returnWatch.cancel();
      } catch (error) {
        void error;
      }
    }
    STATE.returnWatch = null;
  }

  function installReturnScript() {
    var command = "W=" + App.luna.shellQuote(RETURN_SCRIPT_PATH) + "; N=" + App.luna.shellQuote(RETURN_SCRIPT_PATH + '.tmp') + "; " +
      "printf %s '" + RETURN_SCRIPT_B64 + "' | base64 -d > \"$N\" || { rm -f \"$N\"; echo error; exit 0; }; " +
      "chmod 755 \"$N\"; sh -n \"$N\" || { rm -f \"$N\"; echo badscript; exit 0; }; " +
      "mv \"$N\" \"$W\" || { rm -f \"$N\"; echo error; exit 0; }; echo ok";
    return App.luna.rootExec(command).then(function (output) {
      if (String(output || '').trim() !== 'ok') {
        throw new Error('Falha ao instalar o watcher de retorno');
      }
    });
  }

  function startReturnWatcher(restart) {
    var command = "W=" + App.luna.shellQuote(RETURN_SCRIPT_PATH) + "; P=" + App.luna.shellQuote(RETURN_PID_FILE) + "; " +
      "A=" + App.luna.shellQuote(RETURN_ARMED_FILE) + "; V=" + App.luna.shellQuote(RETURN_PREV_FILE) + "; " +
      "[ -x \"$W\" ] || { echo missing; exit 0; }; " +
      (restart ? "if [ -f \"$P\" ]; then p=$(cat \"$P\" 2>/dev/null); " +
        "if [ -n \"$p\" ] && grep -q 'dashboard-return.sh' \"/proc/$p/cmdline\" 2>/dev/null; then " +
        "kill -TERM -\"$p\" 2>/dev/null; kill -TERM \"$p\" 2>/dev/null; sleep 1; fi; fi; " +
        "rm -f \"$P\" \"$A\" \"$V\"; " : "") +
      "if [ -f \"$P\" ]; then p=$(cat \"$P\" 2>/dev/null); " +
      "if [ -n \"$p\" ] && grep -q 'dashboard-return.sh' \"/proc/$p/cmdline\" 2>/dev/null; then echo running; exit 0; fi; fi; " +
      "if command -v setsid >/dev/null 2>&1; then nohup setsid \"$W\" </dev/null >/dev/null 2>&1 & " +
      "else nohup \"$W\" </dev/null >/dev/null 2>&1 & fi; " +
      "sleep 1; if [ -f \"$P\" ]; then p=$(cat \"$P\" 2>/dev/null); " +
      "if [ -n \"$p\" ] && grep -q 'dashboard-return.sh' \"/proc/$p/cmdline\" 2>/dev/null; then echo started; exit 0; fi; fi; " +
      "echo failed; tail -n 4 " + App.luna.shellQuote(RETURN_LOG_PATH) + " 2>/dev/null";
    return App.luna.rootExec(command).then(function (output) {
      var text = String(output || '').trim();
      if (text.indexOf('running') === 0 || text.indexOf('started') === 0) {
        return;
      }
      throw new Error(text || 'Falha ao iniciar o watcher de retorno');
    });
  }

  function ensureReturnWatcher(forceInstall) {
    if (!STATE.returnOnExit || !STATE.rootOk) {
      return Promise.resolve();
    }
    var installed = false;
    var ready = Promise.resolve();
    if (forceInstall && !STATE.returnReady) {
      ready = installReturnScript().then(function () {
        STATE.returnReady = true;
        installed = true;
      });
    }
    return ready.then(function () {
      return startReturnWatcher(installed);
    }).catch(function (error) {
      if (installed && !STATE.returnErrorShown) {
        STATE.returnErrorShown = true;
        App.ui.setStatus('Não foi possível iniciar o watcher de retorno', true, true);
        App.ui.toast('Retorno automático indisponível');
      }
      void error;
    });
  }

  function stopReturnWatcher() {
    var command = "P=" + App.luna.shellQuote(RETURN_PID_FILE) + "; A=" + App.luna.shellQuote(RETURN_ARMED_FILE) + "; V=" + App.luna.shellQuote(RETURN_PREV_FILE) + "; W=" + App.luna.shellQuote(RETURN_SCRIPT_PATH) + "; " +
      "if [ -f \"$P\" ]; then p=$(cat \"$P\" 2>/dev/null); " +
      "if [ -n \"$p\" ] && grep -q 'dashboard-return.sh' \"/proc/$p/cmdline\" 2>/dev/null; then kill -TERM -\"$p\" 2>/dev/null; kill -TERM \"$p\" 2>/dev/null; fi; fi; " +
      "rm -f \"$P\" \"$A\" \"$V\" \"$W\"; echo ok";
    return App.luna.rootExec(command).then(function (output) {
      if (String(output || '').trim() !== 'ok') {
        throw new Error('Falha ao parar o watcher de retorno');
      }
    });
  }

  function toggleReturnOnExit() {
    STATE.returnOnExit = !STATE.returnOnExit;
    saveReturnSetting();
    if (STATE.returnOnExit) {
      App.ui.setStatus('Ao fechar um app, o Dashboard abre');
      App.ui.toast('Retorno ao Dashboard ativado');
      if (STATE.rootOk) {
        STATE.returnReady = false;
        installReturnScript().then(function () {
          STATE.returnReady = true;
          return startReturnWatcher(true);
        }).catch(function () {
          STATE.returnReady = false;
          App.ui.toast('Não foi possível ativar o retorno automático');
        });
      }
    } else {
      cancelInAppReturnWatch();
      STATE.returnReady = false;
      App.ui.setStatus('Retorno ao Dashboard desativado');
      App.ui.toast('Retorno ao Dashboard desativado');
      if (STATE.rootOk) {
        stopReturnWatcher().catch(function () {
          App.ui.toast('Não foi possível remover o watcher de retorno');
        });
      }
    }
    if (STATE.settingsOpen) {
      App.settings.renderSettings();
    }
  }

  App.returnWatch = {
    readReturnSetting: readReturnSetting,
    saveReturnSetting: saveReturnSetting,
    startInAppReturnWatch: startInAppReturnWatch,
    isReturnAppId: isReturnAppId,
    cancelInAppReturnWatch: cancelInAppReturnWatch,
    installReturnScript: installReturnScript,
    startReturnWatcher: startReturnWatcher,
    ensureReturnWatcher: ensureReturnWatcher,
    stopReturnWatcher: stopReturnWatcher,
    toggleReturnOnExit: toggleReturnOnExit
  };
})(window);
