(function (window) {
  'use strict';

  var App = window.Dashboard || (window.Dashboard = {});
  var store = App.store;
  var STATE = store.STATE;
  var els = store.els;
  var CONFIG = App.config;

  function launchShortcut(shortcut, tile) {
    if (!shortcut || STATE.launching) {
      return;
    }
    STATE.launching = true;
    if (tile) {
      tile.classList.add('pressed');
    }
    setTimeout(function () {
      if (STATE.returnOnExit && !STATE.rootOk) {
        App.returnWatch.startInAppReturnWatch(shortcut.launchId);
      }
      App.luna.lunaRequest(CONFIG.appManager, 'launch', { id: shortcut.launchId }, 8000, false).then(function () {
        setTimeout(function () {
          STATE.launching = false;
          if (tile) {
            tile.classList.remove('pressed');
          }
        }, 700);
      }).catch(function () {
        STATE.launching = false;
        if (tile) {
          tile.classList.remove('pressed');
        }
        App.ui.toast('Não foi possível abrir ' + shortcut.title);
      });
    }, 130);
  }

  App.launcher = {
    launchShortcut: launchShortcut
  };
})(window);
