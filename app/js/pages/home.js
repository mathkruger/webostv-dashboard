(function (window) {
  'use strict';

  var App = window.Dashboard || (window.Dashboard = {});
  var store = App.store;
  var STATE = store.STATE;
  var els = store.els;
  var KEY = App.KEY;

  function renderHome() {
    store.tileNodes = {};
    els.grid.innerHTML = '';
    els.grid.classList.remove('hidden');

    if (!STATE.shortcuts.length) {
      els.grid.classList.add('hidden');
      els.empty.classList.add('visible');
      STATE.emptyFocus = true;
      STATE.gearFocus = false;
      STATE.appsFocus = false;
      STATE.newsFocus = false;
      STATE.weatherFocus = false;
      refreshHomeFocus();
      return;
    }

    els.empty.classList.remove('visible');
    STATE.emptyFocus = false;
    if (STATE.homeFocus >= STATE.shortcuts.length) {
      STATE.homeFocus = STATE.shortcuts.length - 1;
    }
    if (STATE.homeFocus < 0) {
      STATE.homeFocus = 0;
    }

    STATE.shortcuts.forEach(function (shortcut, index) {
      var tile = document.createElement('div');
      tile.className = 'tile';
      tile.setAttribute('data-index', String(index));
      tile.setAttribute('data-id', shortcut.id);

      var icon = document.createElement('div');
      icon.className = 'tile-icon';
      App.icons.fillIconNode(icon, shortcut);

      var label = document.createElement('div');
      label.className = 'tile-label';
      label.textContent = shortcut.title;

      tile.appendChild(icon);
      tile.appendChild(label);
      els.grid.appendChild(tile);
      store.tileNodes[shortcut.id] = icon;
    });

    refreshHomeFocus();
    App.icons.ensureIcons(STATE.shortcuts);
  }

  function refreshHomeFocus() {
    var tiles = els.grid.children;
    for (var i = 0; i < tiles.length; i += 1) {
      var tile = tiles[i];
      var focused = !STATE.gearFocus && !STATE.appsFocus && !STATE.emptyFocus && !STATE.newsFocus && !STATE.weatherFocus && Number(tile.getAttribute('data-index')) === STATE.homeFocus;
      tile.classList.toggle('focused', focused);
    }
    els.settingsButton.classList.toggle('focused', STATE.gearFocus);
    els.appsButton.classList.toggle('focused', STATE.appsFocus);
    els.emptyAction.classList.toggle('focused', STATE.emptyFocus && !STATE.gearFocus && !STATE.appsFocus && !STATE.newsFocus && !STATE.weatherFocus);
    if (els.news) {
      els.news.classList.toggle('focused', STATE.newsFocus && !STATE.gearFocus && !STATE.appsFocus && !STATE.emptyFocus && !STATE.weatherFocus);
    }
    if (els.weather) {
      els.weather.classList.toggle('focused', STATE.weatherFocus && !STATE.gearFocus && !STATE.appsFocus && !STATE.emptyFocus && !STATE.newsFocus);
    }
  }

  function onGridHover(event) {
    if (STATE.screen !== 'home' || !App.pointer.pointerActive()) {
      return;
    }
    var tile = App.dom.closest(event.target, '.tile');
    if (!tile) {
      return;
    }
    var index = Number(tile.getAttribute('data-index'));
    if (STATE.homeFocus !== index || STATE.gearFocus || STATE.appsFocus || STATE.newsFocus || STATE.weatherFocus) {
      STATE.homeFocus = index;
      STATE.gearFocus = false;
      STATE.appsFocus = false;
      STATE.emptyFocus = false;
      STATE.newsFocus = false;
      STATE.weatherFocus = false;
      refreshHomeFocus();
    }
  }

  function onGridClick(event) {
    if (STATE.screen !== 'home') {
      return;
    }
    var tile = App.dom.closest(event.target, '.tile');
    if (!tile) {
      return;
    }
    var index = Number(tile.getAttribute('data-index'));
    STATE.homeFocus = index;
    STATE.gearFocus = false;
    STATE.appsFocus = false;
    STATE.newsFocus = false;
    STATE.weatherFocus = false;
    refreshHomeFocus();
    App.launcher.launchShortcut(STATE.shortcuts[index], tile);
  }

  function homeTiles() {
    return Array.prototype.slice.call(els.grid.children);
  }

  function homeItems() {
    var items = homeTiles();
    items.push(els.weather, els.news, els.appsButton, els.settingsButton, els.emptyAction);
    return items;
  }

  function homeCurrent() {
    if (STATE.weatherFocus) {
      return els.weather;
    }
    if (STATE.newsFocus) {
      return els.news;
    }
    if (STATE.appsFocus) {
      return els.appsButton;
    }
    if (STATE.gearFocus) {
      return els.settingsButton;
    }
    if (STATE.emptyFocus) {
      return els.emptyAction;
    }
    return homeTiles()[STATE.homeFocus] || null;
  }

  function homeFocusElement(element) {
    STATE.weatherFocus = element === els.weather;
    STATE.newsFocus = element === els.news;
    STATE.appsFocus = element === els.appsButton;
    STATE.gearFocus = element === els.settingsButton;
    STATE.emptyFocus = element === els.emptyAction;
    if (element.getAttribute('data-index') !== null) {
      STATE.homeFocus = Number(element.getAttribute('data-index'));
    }
    refreshHomeFocus();
  }

  function homeKey(code) {
    var current = homeCurrent();
    if (!current) {
      return false;
    }
    if (current === els.emptyAction) {
      if (code === KEY.UP) {
        homeFocusElement(els.news);
        return true;
      }
      if (code === KEY.LEFT) {
        homeFocusElement(els.appsButton);
        return true;
      }
    }
    if (!STATE.shortcuts.length && code === KEY.DOWN &&
      (current === els.news || current === els.appsButton || current === els.settingsButton || current === els.weather)) {
      homeFocusElement(els.emptyAction);
      return true;
    }
    if (code === KEY.UP && current.getAttribute('data-index') !== null) {
      var index = Number(current.getAttribute('data-index'));
      var columns = Math.min(6, homeTiles().length);
      if (index < columns) {
        homeFocusElement(els.news);
        return true;
      }
    }
    return false;
  }

  App.home = {
    renderHome: renderHome,
    refreshHomeFocus: refreshHomeFocus,
    onGridHover: onGridHover,
    onGridClick: onGridClick
  };

  App.focus.register('home', {
    items: homeItems,
    current: homeCurrent,
    onFocus: homeFocusElement,
    onKey: homeKey,
    onBack: function () {
      App.settings.openSettings();
    }
  });
})(window);
