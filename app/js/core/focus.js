(function (window) {
  'use strict';

  var App = window.Dashboard || (window.Dashboard = {});
  var KEY = App.KEY;

  var adapters = {};

  function register(screen, adapter) {
    adapters[screen] = adapter;
  }

  function adapterFor(screen) {
    return adapters[screen] || adapters.home || null;
  }

  function isVisible(element) {
    if (!element || element.nodeType !== 1 || !element.getBoundingClientRect) {
      return false;
    }
    var rect = element.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      return false;
    }
    var style = window.getComputedStyle ? window.getComputedStyle(element) : null;
    if (style) {
      if (style.display === 'none' || style.visibility === 'hidden') {
        return false;
      }
      if (element.offsetParent === null && style.position !== 'fixed') {
        return false;
      }
    }
    return true;
  }

  function itemsOf(adapter) {
    var candidates = adapter && adapter.items ? adapter.items() : [];
    var items = [];
    for (var i = 0; i < candidates.length; i += 1) {
      var element = candidates[i];
      if (!element || items.indexOf(element) >= 0 || !isVisible(element)) {
        continue;
      }
      items.push(element);
    }
    return items;
  }

  function currentOf(adapter) {
    var element = adapter && adapter.current ? adapter.current() : null;
    if (!element || !isVisible(element)) {
      return null;
    }
    return element;
  }

  function centerOf(rect) {
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2
    };
  }

  function overlapLength(startA, endA, startB, endB) {
    return Math.max(0, Math.min(endA, endB) - Math.max(startA, startB));
  }

  function findTarget(items, from, code) {
    var fromRect = from.getBoundingClientRect();
    var fromCenter = centerOf(fromRect);
    var best = null;
    var bestScore = Infinity;

    for (var i = 0; i < items.length; i += 1) {
      var element = items[i];
      if (element === from) {
        continue;
      }
      var rect = element.getBoundingClientRect();
      var center = centerOf(rect);
      var dx = center.x - fromCenter.x;
      var dy = center.y - fromCenter.y;
      var primary;
      var secondary;
      var overlap;

      if (code === KEY.LEFT) {
        primary = -dx;
        secondary = Math.abs(dy);
        overlap = overlapLength(fromRect.top, fromRect.bottom, rect.top, rect.bottom);
      } else if (code === KEY.RIGHT) {
        primary = dx;
        secondary = Math.abs(dy);
        overlap = overlapLength(fromRect.top, fromRect.bottom, rect.top, rect.bottom);
      } else if (code === KEY.UP) {
        primary = -dy;
        secondary = Math.abs(dx);
        overlap = overlapLength(fromRect.left, fromRect.right, rect.left, rect.right);
      } else {
        primary = dy;
        secondary = Math.abs(dx);
        overlap = overlapLength(fromRect.left, fromRect.right, rect.left, rect.right);
      }

      if (primary <= 1) {
        continue;
      }

      var score = primary + secondary * (overlap > 0 ? 3 : 8);
      if (overlap <= 0) {
        score += 1000000;
      }
      if (score < bestScore) {
        bestScore = score;
        best = element;
      }
    }

    return best;
  }

  function select(adapter, element) {
    if (adapter.onFocus) {
      adapter.onFocus(element);
    }
    return true;
  }

  function move(screen, code) {
    var adapter = adapterFor(screen);
    if (!adapter) {
      return false;
    }
    var items = itemsOf(adapter);
    if (!items.length) {
      return false;
    }
    var current = currentOf(adapter);
    if (!current || items.indexOf(current) < 0) {
      return select(adapter, items[0]);
    }
    var target = findTarget(items, current, code);
    if (!target) {
      return false;
    }
    return select(adapter, target);
  }

  function activate(screen) {
    var adapter = adapterFor(screen);
    if (!adapter) {
      return false;
    }
    var element = currentOf(adapter) || itemsOf(adapter)[0];
    if (!element) {
      return false;
    }
    if (adapter.activate) {
      adapter.activate(element);
    } else {
      element.click();
    }
    return true;
  }

  function handleKey(screen, code) {
    var adapter = adapterFor(screen);
    if (!adapter) {
      return false;
    }
    if (adapter.onKey && adapter.onKey(code) === true) {
      return true;
    }
    if (code === KEY.LEFT || code === KEY.UP || code === KEY.RIGHT || code === KEY.DOWN) {
      return move(screen, code);
    }
    if (code === KEY.ENTER) {
      return activate(screen);
    }
    if (code === KEY.BACK || code === KEY.ESC) {
      if (adapter.onBack) {
        adapter.onBack();
      }
      return true;
    }
    return false;
  }

  App.focus = {
    register: register,
    handleKey: handleKey,
    move: move,
    activate: activate,
    isVisible: isVisible
  };
})(window);
