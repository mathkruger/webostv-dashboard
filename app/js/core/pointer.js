(function (window) {
  'use strict';

  var App = window.Dashboard || (window.Dashboard = {});
  var store = App.store;
  var STATE = store.STATE;
  var els = store.els;
  var CONFIG = App.config;
  var pointerTimer = null;
  var pointerHidden = false;
  var lastPointerMove = 0;

  function pointerActive() {
    return lastPointerMove > 0 && Date.now() - lastPointerMove < 1500;
  }

  function onMouseMove() {
    var now = Date.now();
    if (now - lastPointerMove < 120) {
      return;
    }
    lastPointerMove = now;
    if (pointerHidden) {
      setPointerHidden(false);
    }
    if (pointerTimer) {
      clearTimeout(pointerTimer);
    }
    pointerTimer = setTimeout(function () {
      if (!STATE.settingsOpen) {
        setPointerHidden(true);
      }
    }, 2800);
  }

  function setPointerHidden(hidden) {
    pointerHidden = hidden;
    try {
      if (window.webOSSystem && typeof window.webOSSystem.setCursorHidden === 'function') {
        window.webOSSystem.setCursorHidden(hidden);
      }
    } catch (error) {
      void error;
    }
  }

  App.pointer = {
    pointerActive: pointerActive,
    onMouseMove: onMouseMove,
    setPointerHidden: setPointerHidden
  };
})(window);
