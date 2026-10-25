(function (window) {
  'use strict';

  var App = window.Dashboard || (window.Dashboard = {});
  var store = App.store;
  var STATE = store.STATE;
  var els = store.els;
  var CONFIG = App.config;
  var toastTimer = null;
  var hintTimer = null;

  function setStatus(message, isError, quiet) {
    STATE.status = message;
    STATE.statusError = !!isError;
    if (els.statusText) {
      els.statusText.textContent = message;
      els.statusText.className = 'status-text' + (isError ? ' error' : '');
    }
    if (!quiet) {
      void message;
    }
  }

  function showHintOnce() {
    var key = 'dashboard.hint.v1';
    var shown = false;
    try {
      shown = localStorage.getItem(key) === '1';
    } catch (error) {
      void error;
    }
    if (shown) {
      return;
    }
    els.hint.classList.add('visible');
    if (hintTimer) {
      clearTimeout(hintTimer);
    }
    hintTimer = setTimeout(function () {
      els.hint.classList.remove('visible');
    }, 6500);
    try {
      localStorage.setItem(key, '1');
    } catch (error) {
      void error;
    }
  }

  function toast(message) {
    if (!els.toast) {
      return;
    }
    els.toast.textContent = message;
    els.toast.classList.add('visible');
    if (toastTimer) {
      clearTimeout(toastTimer);
    }
    toastTimer = setTimeout(function () {
      els.toast.classList.remove('visible');
    }, 3000);
  }

  App.ui = {
    setStatus: setStatus,
    showHintOnce: showHintOnce,
    toast: toast
  };
})(window);
