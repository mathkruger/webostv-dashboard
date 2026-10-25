(function (window) {
  'use strict';

  var App = window.Dashboard || (window.Dashboard = {});
  var store = App.store;
  var STATE = store.STATE;
  var els = store.els;
  var CONFIG = App.config;
  var AUTOSTART_BEGIN = App.scripts.AUTOSTART_BEGIN;
  var AUTOSTART_END = App.scripts.AUTOSTART_END;
  var WAKE_SCRIPT_PATH = App.scripts.WAKE_SCRIPT_PATH;
  var WAKE_SCRIPT_B64 = App.scripts.WAKE_SCRIPT_B64;

  function checkAutostart() {
    if (!STATE.rootOk) {
      STATE.autostartSupported = false;
      STATE.autostart = false;
      return Promise.resolve();
    }
    var command = "F=/var/lib/webosbrew/startup.sh; if [ -f \"$F\" ]; then if grep -q '^# >>> dashboard-autostart >>>$' \"$F\"; then echo enabled; else echo disabled; fi; else echo unsupported; fi";
    return App.luna.rootExec(command).then(function (output) {
      var text = String(output || '').trim();
      if (text === 'enabled') {
        STATE.autostartSupported = true;
        STATE.autostart = true;
      } else if (text === 'disabled') {
        STATE.autostartSupported = true;
        STATE.autostart = false;
      } else {
        STATE.autostartSupported = false;
        STATE.autostart = false;
      }
      if (STATE.settingsOpen) {
        App.settings.renderSettings();
      }
    }).catch(function () {
      STATE.autostartSupported = false;
      STATE.autostart = false;
    });
  }

  function installWakeScript() {
    var command = "W=" + App.luna.shellQuote(WAKE_SCRIPT_PATH) + "; " +
      "printf %s '" + WAKE_SCRIPT_B64 + "' | base64 -d > \"$W\" || { echo error; exit 0; }; " +
      "chmod 755 \"$W\"; sh -n \"$W\" || { echo badscript; exit 0; }; echo ok";
    return App.luna.rootExec(command).then(function (output) {
      if (String(output || '').trim() !== 'ok') {
        throw new Error('Falha ao instalar o watcher de wake');
      }
    });
  }

  function autostartBlock() {
    return AUTOSTART_BEGIN + '\n' +
      "(sleep 25; /usr/bin/luna-send -n 1 luna://com.webos.applicationManager/launch '{\"id\":\"" + CONFIG.appId + "\",\"params\":{}}' >/dev/null 2>&1) &\n" +
      "if command -v setsid >/dev/null 2>&1; then nohup setsid " + WAKE_SCRIPT_PATH + " </dev/null >/dev/null 2>&1 & else nohup " + WAKE_SCRIPT_PATH + " </dev/null >/dev/null 2>&1 & fi\n" +
      AUTOSTART_END + '\n';
  }

  function toggleAutostart() {
    if (!STATE.autostartSupported) {
      App.ui.toast('Homebrew Channel necessário para o autostart');
      return;
    }
    App.ui.setStatus('Alterando autostart…');

    var removeBlock = "if grep -q '^# >>> dashboard-autostart >>>$' \"$F\" || grep -q '^# <<< dashboard-autostart <<<$' \"$F\"; then " +
      "if grep -q '^# >>> dashboard-autostart >>>$' \"$F\" && grep -q '^# <<< dashboard-autostart <<<$' \"$F\"; then " +
      "sed -i '/^# >>> dashboard-autostart >>>$/,/^# <<< dashboard-autostart <<<$/d' \"$F\" || { echo error; exit 0; }; " +
      "else echo error; exit 0; fi; " +
      "fi; ";
    var base = "F=/var/lib/webosbrew/startup.sh; W=" + App.luna.shellQuote(WAKE_SCRIPT_PATH) + "; " +
      "[ -f \"$F\" ] || { echo unsupported; exit 0; }; ";
    var stopWatcher = "P=/var/run/dashboard-wake.pid; " +
      "if [ -f \"$P\" ]; then p=$(cat \"$P\" 2>/dev/null); if [ -n \"$p\" ] && grep -q 'dashboard-wake.sh' \"/proc/$p/cmdline\" 2>/dev/null; then kill -TERM -\"$p\" 2>/dev/null; kill -TERM \"$p\" 2>/dev/null; fi; fi; " +
      "rm -f \"$P\"; ";

    function handle(output) {
      var text = String(output || '').trim();
      if (text === 'unsupported') {
        STATE.autostartSupported = false;
        STATE.autostart = false;
        App.ui.setStatus('Homebrew Channel necessário', true);
        App.ui.toast('Autostart indisponível neste aparelho');
      } else if (text === 'enabled') {
        STATE.autostart = true;
        App.ui.setStatus('Autostart ativado');
        App.ui.toast('Abre ao ligar e ao acordar a TV');
      } else if (text === 'disabled') {
        STATE.autostart = false;
        App.ui.setStatus('Autostart desativado');
        App.ui.toast('Autostart desativado');
      } else {
        App.ui.setStatus('Falha ao alterar o autostart', true);
        App.ui.toast('Não foi possível alterar o autostart');
      }
      if (STATE.settingsOpen) {
        App.settings.renderSettings();
      }
    }

    if (STATE.autostart) {
      var disable = base + stopWatcher +
        "rm -f \"$W\"; " +
        removeBlock +
        "sync; grep -q '^# >>> dashboard-autostart >>>$' \"$F\" && echo enabled || echo disabled";
      App.luna.rootExec(disable).then(handle).catch(function () {
        App.ui.setStatus('Falha ao alterar o autostart', true);
        App.ui.toast('Não foi possível alterar o autostart');
      });
      return;
    }

    var encoded;
    try {
      encoded = window.btoa(autostartBlock());
    } catch (error) {
      App.ui.toast('Não foi possível preparar o autostart');
      return;
    }
    var enable = base +
      "if [ ! -f \"$F.dashboard.bak\" ]; then cp \"$F\" \"$F.dashboard.bak\" || { echo error; exit 0; }; fi; " +
      removeBlock +
      "printf %s '" + encoded + "' | base64 -d >> \"$F\" || { echo error; exit 0; }; " +
      stopWatcher +
      "nohup setsid \"$W\" >/dev/null 2>&1 & " +
      "sync; grep -q '^# >>> dashboard-autostart >>>$' \"$F\" && echo enabled || echo disabled";
    installWakeScript().then(function () {
      return App.luna.rootExec(enable);
    }).then(handle).catch(function () {
      App.ui.setStatus('Falha ao alterar o autostart', true);
      App.ui.toast('Não foi possível alterar o autostart');
    });
  }

  App.autostart = {
    checkAutostart: checkAutostart,
    installWakeScript: installWakeScript,
    autostartBlock: autostartBlock,
    toggleAutostart: toggleAutostart
  };
})(window);
