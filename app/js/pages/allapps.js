(function (window) {
  'use strict';

  var App = window.Dashboard || (window.Dashboard = {});
  var store = App.store;
  var STATE = store.STATE;
  var els = store.els;

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
    STATE.allZone = 'list';
    STATE.appsFocus = true;
    STATE.gearFocus = false;
    STATE.emptyFocus = false;
    STATE.newsFocus = false;
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
    STATE.allZone = 'list';
    STATE.screen = 'home';
    els.allapps.classList.remove('open');
    els.allapps.setAttribute('aria-hidden', 'true');
    els.allappsDone.classList.remove('focused');
    App.home.refreshHomeFocus();
  }

  function buildAllItems() {
    var items = [];
    store.appCatalog.forEach(function (app) {
      items.push({ key: 'app:' + app.id, type: 'app', item: app });
    });
    store.inputCatalog.forEach(function (input) {
      items.push({ key: 'input:' + input.id, type: 'input', item: input });
    });
    return items;
  }

  function renderAllApps() {
    if (!STATE.allOpen) {
      return;
    }
    var scroll = els.allappsList.scrollTop;
    store.allRows = [];
    store.allNodes = {};
    els.allappsList.innerHTML = '';
    STATE.allItems = buildAllItems();
    els.allappsCount.textContent = String(STATE.allItems.length);

    if (STATE.loading && !STATE.allItems.length) {
      var loading = document.createElement('div');
      loading.className = 'loading-row';
      var spinner = document.createElement('span');
      spinner.className = 'spinner';
      loading.appendChild(spinner);
      loading.appendChild(document.createTextNode('Carregando aplicativos'));
      els.allappsList.appendChild(loading);
    } else if (!STATE.allItems.length) {
      var empty = document.createElement('div');
      empty.className = 'loading-row';
      empty.textContent = 'Nenhum app disponível';
      els.allappsList.appendChild(empty);
    }

    var previousType = '';
    STATE.allItems.forEach(function (entry, index) {
      if (entry.type !== previousType) {
        var label = document.createElement('div');
        label.className = 'section-label' + (previousType === '' ? ' first' : '');
        label.textContent = entry.type === 'app' ? 'Aplicativos' : 'Entradas';
        els.allappsList.appendChild(label);
        previousType = entry.type;
      }
      var row = createAllRow(entry, index);
      els.allappsList.appendChild(row);
      store.allRows.push(row);
      if (entry.type === 'app' && entry.item.icon) {
        store.allNodes[entry.key] = row.children[0];
      }
    });

    if (STATE.allFocus >= STATE.allItems.length) {
      STATE.allFocus = Math.max(0, STATE.allItems.length - 1);
    }
    els.allappsList.scrollTop = scroll;
    refreshAllAppsFocus();
    App.icons.ensureIcons(store.appCatalog);
  }

  function createAllRow(entry, index) {
    var row = document.createElement('div');
    row.className = 'row';
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
    store.allRows.forEach(function (row, index) {
      var focused = STATE.allZone === 'list' && index === STATE.allFocus;
      row.classList.toggle('focused', focused);
      if (focused) {
        App.dom.scrollRowIntoView(els.allappsList, row);
      }
    });
  }

  function onAllHover(event) {
    if (Date.now() < store.hoverLockUntil || !App.pointer.pointerActive()) {
      return;
    }
    var row = App.dom.closest(event.target, '[data-all-index]');
    if (!row) {
      return;
    }
    var index = Number(row.getAttribute('data-all-index'));
    if (STATE.allFocus !== index || STATE.allZone !== 'list') {
      STATE.allZone = 'list';
      STATE.allFocus = index;
      refreshAllAppsFocus();
    }
  }

  function onAllClick(event) {
    var row = App.dom.closest(event.target, '[data-all-index]');
    if (!row) {
      return;
    }
    STATE.allZone = 'list';
    STATE.allFocus = Number(row.getAttribute('data-all-index'));
    refreshAllAppsFocus();
    launchAllItem();
  }

  function launchAllItem() {
    var entry = STATE.allItems[STATE.allFocus];
    if (!entry) {
      return;
    }
    var shortcut = entry.type === 'input' ? App.shortcuts.makeInputShortcut(entry.item) : App.shortcuts.makeAppShortcut(entry.item);
    STATE.appsFocus = false;
    closeAllApps();
    App.launcher.launchShortcut(shortcut, null);
  }

  function allAppsItems() {
    var items = [els.allappsDone];
    return items.concat(store.allRows);
  }

  function allAppsCurrent() {
    if (STATE.allZone === 'done') {
      return els.allappsDone;
    }
    return store.allRows[STATE.allFocus] || null;
  }

  function allAppsFocusElement(element) {
    if (element === els.allappsDone) {
      STATE.allZone = 'done';
    } else {
      var index = Number(element.getAttribute('data-all-index'));
      STATE.allZone = 'list';
      STATE.allFocus = isNaN(index) ? 0 : index;
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
    onBack: closeAllApps
  });
})(window);
