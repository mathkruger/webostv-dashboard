(function (window) {
  'use strict';

  var App = window.Dashboard || (window.Dashboard = {});
  var store = App.store;
  var STATE = store.STATE;
  var els = store.els;
  var CONFIG = App.config;

  function lunaRequest(uri, method, params, timeoutMs, subscribe) {
    return new Promise(function (resolve, reject) {
      var finished = false;
      var request = null;
      var timer = setTimeout(function () {
        if (finished) {
          return;
        }
        finished = true;
        if (request && typeof request.cancel === 'function') {
          request.cancel();
        }
        reject(new Error('Tempo esgotado'));
      }, timeoutMs || 8000);

      function finishError(error) {
        if (finished) {
          return;
        }
        finished = true;
        clearTimeout(timer);
        if (request && typeof request.cancel === 'function') {
          request.cancel();
        }
        reject(error || new Error('Falha na chamada Luna'));
      }

      function finishSuccess(result) {
        if (finished) {
          return;
        }
        finished = true;
        clearTimeout(timer);
        if (subscribe && request && typeof request.cancel === 'function') {
          request.cancel();
        }
        resolve(result);
      }

      try {
        if (!window.webOS || !window.webOS.service || typeof window.webOS.service.request !== 'function') {
          throw new Error('webOS service bridge indisponível');
        }
        request = window.webOS.service.request(uri, {
          method: method,
          parameters: params || {},
          subscribe: !!subscribe,
          onSuccess: finishSuccess,
          onFailure: finishError
        });
      } catch (error) {
        finishError(error);
      }
    });
  }

  function rootExec(command) {
    return lunaRequest(CONFIG.hbService, 'exec', { command: command }, 15000, true).then(function (response) {
      if (!response) {
        throw new Error('Sem resposta do Homebrew Channel');
      }
      if (response.returnValue === false) {
        var error = new Error(response.errorText || response.stderrString || 'Comando recusado');
        error.payload = response;
        throw error;
      }
      return typeof response.stdoutString === 'string' ? response.stdoutString : '';
    });
  }

  function shellQuote(value) {
    var text = String(value);
    if (text.charAt(0) !== '/' || /[\r\n\0]/.test(text)) {
      throw new Error('Caminho inválido');
    }
    return "'" + text.replace(/'/g, "'\\''") + "'";
  }

  App.luna = {
    lunaRequest: lunaRequest,
    rootExec: rootExec,
    shellQuote: shellQuote
  };
})(window);
