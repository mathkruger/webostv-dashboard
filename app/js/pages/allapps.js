(function (window) {
  'use strict';

  var App = window.Dashboard || (window.Dashboard = {});
  var store = App.store;
  var STATE = store.STATE;
  var els = store.els;
  var KEY = App.KEY;
  var appItems = [];
  var inputItems = [];

  function openAllApps() {
    if (STATE.allOpen) {
      return;
    }
    if (STATE.settingsOpen) {
      App.settings.closeSettings();
    }
    STATE.allOpen = true;
    STATE.screen = 'allapps';
    STATE.allFocus = 0;
    STATE.allInputFocus = 0;
    STATE.allZone = 'apps';
    STATE.appsFocus = true;
    STATE.gearFocus = false;
    STATE.emptyFocus = false;
    STATE.newsFocus = false;
    STATE.weatherFocus = false;
    els.allapps.classList.add('open');
    els.allapps.setAttribute('aria-hidden', 'false');
    els.hint.classList.remove('visible');
    store.hoverLockUntil = Date.now() + 450;
    renderAllApps();
    if (!store.appCatalog.length && !STATE.loading) {
      App.catalog.refreshAll({ manual: false });
    } else if (store.appCatalog.length && Date.now() - STATE.lastRefresh > 600000) {
      App.catalog.refreshAll({ manual: false });
    }
  }

  function closeAllApps() {
    if (!STATE.allOpen) {
      return;
    }
    STATE.allOpen = false;
    STATE.allZone = 'apps';
    STATE.screen = 'home';
    els.allapps.classList.remove('open');
    els.allapps.setAttribute('aria-hidden', 'true');
    els.allappsDone.classList.remove('focused');
    App.home.refreshHomeFocus();
  }

  function buildAppItems() {
    var items = [];
    store.appCatalog.forEach(function (app) {
      items.push({ key: 'app:' + app.id, type: 'app', item: app });
    });
    return items;
  }

  function buildInputItems() {
    var items = [];
    store.inputCatalog.forEach(function (input) {
      items.push({ key: 'input:' + input.id, type: 'input', item: input });
    });
    return items;
  }

  function buildAllItems() {
    return buildAppItems().concat(buildInputItems());
  }

  function appendMessage(container, text, loading) {
    var row = document.createElement('div');
    row.className = 'loading-row';
    if (loading) {
      var spinner = document.createElement('span');
      spinner.className = 'spinner';
      row.appendChild(spinner);
    }
    row.appendChild(document.createTextNode(text));
    container.appendChild(row);
  }

  function renderAllApps() {
    if (!STATE.allOpen) {
      return;
    }
    var appsScroll = els.allappsAppsList.scrollTop;
    var inputsScroll = els.allappsInputsList.scrollTop;
    store.allAppRows = [];
    store.allInputRows = [];
    store.allAppNodes = {};
    store.allInputNodes = {};
    els.allappsAppsList.innerHTML = '';
    els.allappsInputsList.innerHTML = '';

    appItems = buildAppItems();
    inputItems = buildInputItems();

    els.allappsAppsCount.textContent = String(appItems.length);
    els.allappsInputsCount.textContent = String(inputItems.length);

    if (STATE.loading && !appItems.length) {
      appendMessage(els.allappsAppsList, 'Carregando aplicativos', true);
    } else if (!appItems.length) {
      appendMessage(els.allappsAppsList, 'Nenhum app disponível', false);
    }

    if (!inputItems.length) {
      appendMessage(els.allappsInputsList, 'Nenhuma entrada disponível', false);
    }

    appItems.forEach(function (entry, index) {
      var row = createAllRow(entry, index, 'apps');
      els.allappsAppsList.appendChild(row);
      store.allAppRows.push(row);
      if (entry.item.icon) {
        store.allAppNodes[entry.key] = row.children[0];
      }
    });

    inputItems.forEach(function (entry, index) {
      var row = createAllRow(entry, index, 'inputs');
      els.allappsInputsList.appendChild(row);
      store.allInputRows.push(row);
      if (entry.item.icon) {
        store.allInputNodes[entry.key] = row.children[0];
      }
    });

    if (STATE.allFocus >= store.allAppRows.length) {
      STATE.allFocus = Math.max(0, store.allAppRows.length - 1);
    }
    if (STATE.allInputFocus >= store.allInputRows.length) {
      STATE.allInputFocus = Math.max(0, store.allInputRows.length - 1);
    }
    normalizeAllZone();
    els.allappsAppsList.scrollTop = appsScroll;
    els.allappsInputsList.scrollTop = inputsScroll;
    refreshAllAppsFocus();
    App.icons.ensureIcons(store.appCatalog);
  }

  function normalizeAllZone() {
    if (STATE.allZone === 'apps' && !store.allAppRows.length && store.allInputRows.length) {
      STATE.allZone = 'inputs';
    } else if (STATE.allZone === 'inputs' && !store.allInputRows.length && store.allAppRows.length) {
      STATE.allZone = 'apps';
    }
  }

  function createAllRow(entry, index, column) {
    var row = document.createElement('div');
    row.className = 'row';
    row.setAttribute('data-all-col', column);
    row.setAttribute('data-all-index', String(index));

    var icon = document.createElement('div');
    icon.className = 'row-icon';

    var title = document.createElement('div');
    title.className = 'row-title';

    var meta = document.createElement('div');
    meta.className = 'row-meta';

    App.icons.fillIconNode(icon, entry.item);
    title.textContent = entry.item.title;
    meta.textContent = entry.type === 'input' ? 'Entrada' : '';

    row.appendChild(icon);
    row.appendChild(title);
    row.appendChild(meta);
    return row;
  }

  function refreshAllAppsFocus() {
    if (!STATE.allOpen) {
      return;
    }
    els.allappsDone.classList.toggle('focused', STATE.allZone === 'done');
    store.allAppRows.forEach(function (row, index) {
      var focused = STATE.allZone === 'apps' && index === STATE.allFocus;
      row.classList.toggle('focused', focused);
      if (focused) {
        App.dom.scrollRowIntoView(els.allappsAppsList, row);
      }
    });
    store.allInputRows.forEach(function (row, index) {
      var focused = STATE.allZone === 'inputs' && index === STATE.allInputFocus;
      row.classList.toggle('focused', focused);
      if (focused) {
        App.dom.scrollRowIntoView(els.allappsInputsList, row);
      }
    });
  }

  function allColumnFromRow(row) {
    return row.getAttribute('data-all-col') === 'inputs' ? 'inputs' : 'apps';
  }

  function onAllHover(event) {
    if (Date.now() < store.hoverLockUntil || !App.pointer.pointerActive()) {
      return;
    }
    var row = App.dom.closest(event.target, '[data-all-col]');
    if (!row) {
      return;
    }
    var column = allColumnFromRow(row);
    var index = Number(row.getAttribute('data-all-index'));
    var current = column === 'inputs' ? STATE.allInputFocus : STATE.allFocus;
    if (STATE.allZone !== column || current !== index) {
      STATE.allZone = column;
      if (column === 'inputs') {
        STATE.allInputFocus = index;
      } else {
        STATE.allFocus = index;
      }
      refreshAllAppsFocus();
    }
  }

  function onAllClick(event) {
    var row = App.dom.closest(event.target, '[data-all-col]');
    if (!row) {
      return;
    }
    var column = allColumnFromRow(row);
    var index = Number(row.getAttribute('data-all-index'));
    STATE.allZone = column;
    if (column === 'inputs') {
      STATE.allInputFocus = index;
    } else {
      STATE.allFocus = index;
    }
    refreshAllAppsFocus();
    launchAllItem();
  }

  function currentAllEntry() {
    if (STATE.allZone === 'apps') {
      return appItems[STATE.allFocus] || null;
    }
    if (STATE.allZone === 'inputs') {
      return inputItems[STATE.allInputFocus] || null;
    }
    return null;
  }

  function launchAllItem() {
    var entry = currentAllEntry();
    if (!entry) {
      return;
    }
    var shortcut = entry.type === 'input' ? App.shortcuts.makeInputShortcut(entry.item) : App.shortcuts.makeAppShortcut(entry.item);
    STATE.appsFocus = false;
    closeAllApps();
    App.launcher.launchShortcut(shortcut, null);
  }

  function focusAllContent() {
    if (store.allAppRows.length) {
      STATE.allZone = 'apps';
    } else if (store.allInputRows.length) {
      STATE.allZone = 'inputs';
    }
    refreshAllAppsFocus();
  }

  function allAppsKey(code) {
    if (!store.allAppRows.length && !store.allInputRows.length) {
      if (code === KEY.ENTER) {
        return true;
      }
      if (code === KEY.DOWN || code === KEY.UP) {
        return true;
      }
    }

    if (STATE.allZone === 'done') {
      if (code === KEY.DOWN) {
        focusAllContent();
        return true;
      }
      return false;
    }

    if (STATE.allZone === 'inputs') {
      if (!store.allInputRows.length) {
        if (code === KEY.UP) {
          STATE.allZone = 'done';
          refreshAllAppsFocus();
          return true;
        }
        if ((code === KEY.DOWN || code === KEY.LEFT) && store.allAppRows.length) {
          STATE.allZone = 'apps';
          refreshAllAppsFocus();
        }
        return code === KEY.RIGHT;
      }
      if (code === KEY.UP) {
        if (STATE.allInputFocus === 0) {
          STATE.allZone = 'done';
        } else {
          STATE.allInputFocus -= 1;
        }
        refreshAllAppsFocus();
        return true;
      }
      if (code === KEY.DOWN) {
        if (STATE.allInputFocus < store.allInputRows.length - 1) {
          STATE.allInputFocus += 1;
          refreshAllAppsFocus();
        }
        return true;
      }
      if (code === KEY.LEFT) {
        if (store.allAppRows.length) {
          STATE.allZone = 'apps';
          refreshAllAppsFocus();
        }
        return true;
      }
      if (code === KEY.RIGHT) {
        return true;
      }
      return false;
    }

    if (!store.allAppRows.length) {
      if (code === KEY.UP) {
        STATE.allZone = 'done';
        refreshAllAppsFocus();
        return true;
      }
      if ((code === KEY.DOWN || code === KEY.RIGHT) && store.allInputRows.length) {
        STATE.allZone = 'inputs';
        refreshAllAppsFocus();
      }
      return code === KEY.LEFT;
    }

    if (code === KEY.UP) {
      if (STATE.allFocus === 0) {
        STATE.allZone = 'done';
      } else {
        STATE.allFocus -= 1;
      }
      refreshAllAppsFocus();
      return true;
    }
    if (code === KEY.DOWN) {
      if (STATE.allFocus < store.allAppRows.length - 1) {
        STATE.allFocus += 1;
        refreshAllAppsFocus();
      }
      return true;
    }
    if (code === KEY.RIGHT) {
      if (store.allInputRows.length) {
        STATE.allZone = 'inputs';
        refreshAllAppsFocus();
      }
      return true;
    }
    if (code === KEY.LEFT) {
      return true;
    }
    return false;
  }

  function allAppsItems() {
    return [els.allappsDone].concat(store.allAppRows, store.allInputRows);
  }

  function allAppsCurrent() {
    if (STATE.allZone === 'done') {
      return els.allappsDone;
    }
    if (STATE.allZone === 'inputs') {
      return store.allInputRows[STATE.allInputFocus] || null;
    }
    return store.allAppRows[STATE.allFocus] || null;
  }

  function allAppsFocusElement(element) {
    if (element === els.allappsDone) {
      STATE.allZone = 'done';
    } else if (element.getAttribute('data-all-col') !== null) {
      var column = allColumnFromRow(element);
      var index = Number(element.getAttribute('data-all-index'));
      STATE.allZone = column;
      if (column === 'inputs') {
        STATE.allInputFocus = isNaN(index) ? 0 : index;
      } else {
        STATE.allFocus = isNaN(index) ? 0 : index;
      }
    }
    refreshAllAppsFocus();
  }

  App.allApps = {
    openAllApps: openAllApps,
    closeAllApps: closeAllApps,
    buildAllItems: buildAllItems,
    renderAllApps: renderAllApps,
    createAllRow: createAllRow,
    refreshAllAppsFocus: refreshAllAppsFocus,
    onAllHover: onAllHover,
    onAllClick: onAllClick,
    launchAllItem: launchAllItem
  };

  App.focus.register('allapps', {
    items: allAppsItems,
    current: allAppsCurrent,
    onFocus: allAppsFocusElement,
    onKey: allAppsKey,
    onBack: closeAllApps
  });
})(window);
