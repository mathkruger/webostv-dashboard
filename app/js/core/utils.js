(function (window) {
  'use strict';

  var App = window.Dashboard || (window.Dashboard = {});
  var store = App.store;
  var STATE = store.STATE;
  var els = store.els;
  var CONFIG = App.config;
  var PALETTE = App.PALETTE;

  function pad(value) {
    return value < 10 ? '0' + value : String(value);
  }

  function findById(list, id) {
    for (var i = 0; i < list.length; i += 1) {
      if (list[i].id === id) {
        return list[i];
      }
    }
    return null;
  }

  function clamp(value, min, max) {
    if (value < min) {
      return min;
    }
    if (value > max) {
      return max;
    }
    return value;
  }

  function initialFor(title) {
    var text = String(title || '').replace(/^[^0-9A-Za-zÀ-ÿ]+/, '').trim();
    return (text.charAt(0) || '?').toUpperCase();
  }

  function tintFor(id) {
    var hash = 0;
    var text = String(id || '');
    for (var i = 0; i < text.length; i += 1) {
      hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
    }
    var index = Math.abs(hash) % PALETTE.length;
    var pair = PALETTE[index];
    return 'linear-gradient(145deg, ' + pair[0] + ', ' + pair[1] + ')';
  }

  App.utils = {
    pad: pad,
    findById: findById,
    clamp: clamp,
    initialFor: initialFor,
    tintFor: tintFor
  };
})(window);
