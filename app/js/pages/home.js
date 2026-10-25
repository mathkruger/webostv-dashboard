(function (window) {
  'use strict';

  var App = window.Dashboard || (window.Dashboard = {});
  var store = App.store;
  var STATE = store.STATE;
  var els = store.els;
  var CONFIG = App.config;
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
      var focused = !STATE.gearFocus && !STATE.appsFocus && !STATE.emptyFocus && !STATE.newsFocus && Number(tile.getAttribute('data-index')) === STATE.homeFocus;
      tile.classList.toggle('focused', focused);
    }
    els.settingsButton.classList.toggle('focused', STATE.gearFocus);
    els.appsButton.classList.toggle('focused', STATE.appsFocus);
    els.emptyAction.classList.toggle('focused', STATE.emptyFocus && !STATE.gearFocus && !STATE.appsFocus && !STATE.newsFocus);
    if (els.news) {
      els.news.classList.toggle('focused', STATE.newsFocus && !STATE.gearFocus && !STATE.appsFocus && !STATE.emptyFocus);
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
    if (STATE.homeFocus !== index || STATE.gearFocus || STATE.appsFocus || STATE.newsFocus) {
      STATE.homeFocus = index;
      STATE.gearFocus = false;
      STATE.appsFocus = false;
      STATE.emptyFocus = false;
      STATE.newsFocus = false;
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
    refreshHomeFocus();
    App.launcher.launchShortcut(STATE.shortcuts[index], tile);
  }

  function handleHomeKey(code) {
    if (code === KEY.BACK || code === KEY.ESC) {
      App.settings.openSettings();
      return;
    }
    if (!STATE.shortcuts.length) {
      if (STATE.newsFocus) {
        if (code === KEY.ENTER) {
          App.news.openNews();
        } else if (code === KEY.DOWN) {
          STATE.newsFocus = false;
          STATE.emptyFocus = true;
          refreshHomeFocus();
        } else if (code === KEY.RIGHT) {
          STATE.newsFocus = false;
          STATE.appsFocus = true;
          refreshHomeFocus();
        }
        return;
      }
      if (STATE.appsFocus) {
        if (code === KEY.ENTER) {
          App.allApps.openAllApps();
        } else if (code === KEY.RIGHT) {
          STATE.appsFocus = false;
          STATE.gearFocus = true;
          refreshHomeFocus();
        } else if (code === KEY.DOWN) {
          STATE.appsFocus = false;
          STATE.emptyFocus = true;
          refreshHomeFocus();
        }
        return;
      }
      if (STATE.gearFocus) {
        if (code === KEY.ENTER) {
          App.settings.openSettings();
        } else if (code === KEY.LEFT) {
          STATE.gearFocus = false;
          STATE.appsFocus = true;
          refreshHomeFocus();
        } else if (code === KEY.DOWN) {
          STATE.gearFocus = false;
          STATE.emptyFocus = true;
          refreshHomeFocus();
        }
        return;
      }
      if (code === KEY.ENTER) {
        App.settings.openSettings();
      } else if (code === KEY.UP) {
        STATE.emptyFocus = false;
        STATE.newsFocus = true;
        refreshHomeFocus();
      } else if (code === KEY.LEFT) {
        STATE.emptyFocus = false;
        STATE.appsFocus = true;
        refreshHomeFocus();
      }
      return;
    }

    if (STATE.newsFocus) {
      if (code === KEY.ENTER) {
        App.news.openNews();
      } else if (code === KEY.DOWN) {
        STATE.newsFocus = false;
        STATE.homeFocus = App.utils.clamp(STATE.homeFocus, 0, STATE.shortcuts.length - 1);
        refreshHomeFocus();
      } else if (code === KEY.RIGHT) {
        STATE.newsFocus = false;
        STATE.appsFocus = true;
        refreshHomeFocus();
      }
      return;
    }

    if (STATE.appsFocus) {
      if (code === KEY.ENTER) {
        App.allApps.openAllApps();
      } else if (code === KEY.RIGHT) {
        STATE.appsFocus = false;
        STATE.gearFocus = true;
        refreshHomeFocus();
      } else if (code === KEY.DOWN) {
        STATE.appsFocus = false;
        STATE.homeFocus = App.utils.clamp(STATE.homeFocus, 0, STATE.shortcuts.length - 1);
        refreshHomeFocus();
      }
      return;
    }

    if (STATE.gearFocus) {
      if (code === KEY.DOWN) {
        STATE.gearFocus = false;
        STATE.homeFocus = App.utils.clamp(STATE.homeFocus, 0, STATE.shortcuts.length - 1);
        refreshHomeFocus();
      } else if (code === KEY.LEFT) {
        STATE.gearFocus = false;
        STATE.appsFocus = true;
        refreshHomeFocus();
      } else if (code === KEY.ENTER) {
        App.settings.openSettings();
      }
      return;
    }

    var count = STATE.shortcuts.length;
    var columns = Math.min(6, count);
    var index = STATE.homeFocus;

    if (code === KEY.LEFT) {
      if (index % columns > 0) {
        STATE.homeFocus = index - 1;
      }
    } else if (code === KEY.RIGHT) {
      if (index % columns < columns - 1 && index + 1 < count) {
        STATE.homeFocus = index + 1;
      }
    } else if (code === KEY.UP) {
      if (index >= columns) {
        STATE.homeFocus = index - columns;
      } else {
        STATE.newsFocus = true;
      }
    } else if (code === KEY.DOWN) {
      if (index + columns < count) {
        STATE.homeFocus = index + columns;
      }
    } else if (code === KEY.ENTER) {
      App.launcher.launchShortcut(STATE.shortcuts[index], els.grid.children[index]);
      return;
    }
    refreshHomeFocus();
  }

  App.home = {
    renderHome: renderHome,
    refreshHomeFocus: refreshHomeFocus,
    onGridHover: onGridHover,
    onGridClick: onGridClick,
    handleHomeKey: handleHomeKey
  };
})(window);
