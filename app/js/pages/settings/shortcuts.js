(function (window) {
  'use strict';

  var App = window.Dashboard || (window.Dashboard = {});
  var store = App.store;
  var STATE = store.STATE;
  var els = store.els;
  var CONFIG = App.config;
  var KEY = App.KEY;

  function focusContent() {
    STATE.settingsZone = STATE.shortcuts.length ? 'current' : 'add';
    STATE.currentIndex = App.utils.clamp(STATE.currentIndex, 0, Math.max(0, STATE.shortcuts.length - 1));
    STATE.addIndex = App.utils.clamp(STATE.addIndex, 0, Math.max(0, STATE.addItems.length - 1));
  }

  function buildAddItems() {
    var items = [];
    var knownApps = {};
    store.appCatalog.forEach(function (app) {
      knownApps[app.id] = true;
      items.push({ key: 'app:' + app.id, type: 'app', item: app });
    });
    STATE.shortcuts.forEach(function (shortcut) {
      if (shortcut.type === 'app' && !knownApps[shortcut.id]) {
        knownApps[shortcut.id] = true;
        items.push({
          key: 'app:' + shortcut.id,
          type: 'app',
          item: {
            id: shortcut.id,
            title: shortcut.title,
            icon: shortcut.icon,
            type: 'app',
            missing: true
          }
        });
      }
    });

    var knownInputs = {};
    store.inputCatalog.forEach(function (input) {
      knownInputs[input.id] = true;
      items.push({
        key: 'input:' + input.id,
        type: 'input',
        item: {
          id: input.id,
          title: input.title,
          kind: input.kind,
          number: input.number,
          type: 'input'
        }
      });
    });
    STATE.shortcuts.forEach(function (shortcut) {
      if (shortcut.type === 'input' && !knownInputs[shortcut.id]) {
        knownInputs[shortcut.id] = true;
        items.push({
          key: 'input:' + shortcut.id,
          type: 'input',
          item: {
            id: shortcut.id,
            title: shortcut.title,
            kind: shortcut.kind || 'input',
            type: 'input'
          }
        });
      }
    });

    items.push({
      key: 'system:return',
      type: 'system',
      action: 'return',
      item: { title: 'Voltar ao sair dos apps' }
    });
    items.push({
      key: 'system:autostart',
      type: 'system',
      action: 'autostart',
      item: { title: 'Abrir ao ligar ou acordar' }
    });
    items.push({
      key: 'system:refresh',
      type: 'system',
      action: 'refresh',
      item: { title: 'Atualizar apps e ícones' }
    });

    STATE.addItems = items;
    if (STATE.addIndex >= items.length) {
      STATE.addIndex = Math.max(0, items.length - 1);
    }
  }

  function renderCurrentList() {
    store.currentNodes = {};
    store.currentRows = [];
    els.currentList.innerHTML = '';

    if (!STATE.shortcuts.length) {
      var empty = document.createElement('div');
      empty.className = 'loading-row';
      empty.textContent = 'Nenhum atalho ainda';
      els.currentList.appendChild(empty);
      els.currentHint.textContent = 'Escolha apps na lista ao lado';
      return;
    }

    STATE.shortcuts.forEach(function (shortcut, index) {
      var row = document.createElement('div');
      row.className = 'row';
      row.setAttribute('data-current-index', String(index));
      if (STATE.moving && STATE.moving.index === index) {
        row.classList.add('moving');
      }

      var icon = document.createElement('div');
      icon.className = 'row-icon';
      App.icons.fillIconNode(icon, shortcut);

      var title = document.createElement('div');
      title.className = 'row-title';
      title.textContent = shortcut.title;

      var meta = document.createElement('div');
      meta.className = 'row-meta';
      meta.textContent = shortcut.type === 'input' ? 'Entrada' : '';

      row.appendChild(icon);
      row.appendChild(title);
      row.appendChild(meta);
      els.currentList.appendChild(row);
      store.currentNodes[shortcut.id] = icon;
      store.currentRows.push(row);
    });

    if (STATE.moving) {
      els.currentHint.textContent = 'Use ↑ ↓ para mover • OK solta • Voltar cancela';
    } else {
      els.currentHint.textContent = 'OK move o atalho';
    }
    App.icons.ensureIcons(STATE.shortcuts);
  }

  function renderAddList() {
    store.addNodes = {};
    store.addRows = [];
    els.addList.innerHTML = '';

    if (STATE.loading && !store.appCatalog.length) {
      var loading = document.createElement('div');
      loading.className = 'loading-row';
      var spinner = document.createElement('span');
      spinner.className = 'spinner';
      loading.appendChild(spinner);
      loading.appendChild(document.createTextNode('Carregando aplicativos'));
      els.addList.appendChild(loading);
    }

    var previousType = '';
    STATE.addItems.forEach(function (entry, index) {
      if (entry.type !== previousType) {
        var label = document.createElement('div');
        label.className = 'section-label' + (previousType === '' ? ' first' : '');
        if (entry.type === 'app') {
          label.textContent = 'Aplicativos';
        } else if (entry.type === 'input') {
          label.textContent = 'Entradas';
        } else {
          label.textContent = 'Sistema';
        }
        els.addList.appendChild(label);
        previousType = entry.type;
      }
      var row = createAddRow(entry, index);
      els.addList.appendChild(row);
      store.addRows.push(row);
      if (entry.type === 'app' && entry.item.icon) {
        store.addNodes[entry.key] = row.children[0];
      }
    });

    App.icons.ensureIcons(store.appCatalog);
  }

  function createAddRow(entry, index) {
    var row = document.createElement('div');
    row.className = 'row';
    row.setAttribute('data-add-index', String(index));

    var icon = document.createElement('div');
    icon.className = 'row-icon';

    var title = document.createElement('div');
    title.className = 'row-title';

    var meta = document.createElement('div');
    meta.className = 'row-meta';

    if (entry.type === 'app') {
      App.icons.fillIconNode(icon, entry.item);
      title.textContent = entry.item.title;
      if (entry.item.missing) {
        meta.textContent = 'Indisponível';
      }
      var check = document.createElement('div');
      check.className = 'row-check' + (App.shortcuts.shortcutExists(entry.item.id, 'app') ? ' added' : '');
      check.textContent = App.shortcuts.shortcutExists(entry.item.id, 'app') ? '✓' : '+';
      row.appendChild(icon);
      row.appendChild(title);
      row.appendChild(meta);
      row.appendChild(check);
    } else if (entry.type === 'input') {
      App.icons.fillIconNode(icon, entry.item);
      title.textContent = entry.item.title;
      meta.textContent = 'Entrada';
      var inputCheck = document.createElement('div');
      inputCheck.className = 'row-check' + (App.shortcuts.shortcutExists(entry.item.id, 'input') ? ' added' : '');
      inputCheck.textContent = App.shortcuts.shortcutExists(entry.item.id, 'input') ? '✓' : '+';
      row.appendChild(icon);
      row.appendChild(title);
      row.appendChild(meta);
      row.appendChild(inputCheck);
    } else {
      icon.appendChild(App.glyphs.systemGlyph(entry.action));
      title.textContent = entry.item.title;
      if (entry.action === 'autostart' || entry.action === 'return') {
        var toggleOn = entry.action === 'autostart' ? STATE.autostart : STATE.returnOnExit;
        if (entry.action === 'autostart' && !STATE.autostartSupported) {
          meta.textContent = 'Homebrew necessário';
        }
        var toggle = document.createElement('div');
        toggle.className = 'switch' + (toggleOn ? ' on' : '');
        row.appendChild(icon);
        row.appendChild(title);
        row.appendChild(meta);
        row.appendChild(toggle);
      } else {
        meta.textContent = 'Atualizar';
        row.appendChild(icon);
        row.appendChild(title);
        row.appendChild(meta);
      }
    }
    return row;
  }

  function refreshFocus() {
    if (!STATE.settingsOpen) {
      return;
    }
    store.currentRows.forEach(function (row, index) {
      var focused = STATE.settingsZone === 'current' && index === STATE.currentIndex;
      row.classList.toggle('focused', focused);
      if (focused) {
        App.dom.scrollRowIntoView(els.currentList, row);
      }
    });

    store.addRows.forEach(function (row, index) {
      var focused = STATE.settingsZone === 'add' && index === STATE.addIndex;
      row.classList.toggle('focused', focused);
      if (focused) {
        App.dom.scrollRowIntoView(els.addList, row);
      }
    });

    if (STATE.moving) {
      els.currentHint.textContent = 'Use ↑ ↓ para mover • OK solta • Voltar cancela';
    } else if (!STATE.shortcuts.length) {
      els.currentHint.textContent = 'Escolha apps na lista ao lado';
    } else {
      els.currentHint.textContent = 'OK move o atalho';
    }
  }

  function items() {
    return store.currentRows.concat(store.addRows);
  }

  function current() {
    if (STATE.settingsZone === 'current') {
      return store.currentRows[STATE.currentIndex] || null;
    }
    if (STATE.settingsZone === 'add') {
      return store.addRows[STATE.addIndex] || null;
    }
    return null;
  }

  function focusElement(element) {
    if (element.getAttribute('data-current-index') !== null) {
      STATE.settingsZone = 'current';
      STATE.currentIndex = Number(element.getAttribute('data-current-index'));
      return true;
    }
    if (element.getAttribute('data-add-index') !== null) {
      STATE.settingsZone = 'add';
      STATE.addIndex = Number(element.getAttribute('data-add-index'));
      return true;
    }
    return false;
  }

  function onKey(code) {
    if (STATE.settingsZone === 'current') {
      if (code === KEY.UP && STATE.currentIndex === 0) {
        STATE.settingsZone = 'tabs';
        STATE.tabIndex = 0;
        App.settings.refreshSettingsFocus();
        return true;
      }
      if (code === KEY.DOWN && STATE.currentIndex >= STATE.shortcuts.length - 1) {
        return true;
      }
      if (code === KEY.LEFT) {
        return true;
      }
    }

    if (STATE.settingsZone === 'add') {
      if (code === KEY.UP && STATE.addIndex === 0) {
        STATE.settingsZone = 'tabs';
        STATE.tabIndex = 0;
        App.settings.refreshSettingsFocus();
        return true;
      }
      if (code === KEY.DOWN && STATE.addIndex >= STATE.addItems.length - 1) {
        return true;
      }
      if (code === KEY.LEFT && !STATE.shortcuts.length) {
        STATE.settingsZone = 'done';
        App.settings.refreshSettingsFocus();
        return true;
      }
      if (code === KEY.RIGHT) {
        return true;
      }
    }

    return false;
  }

  function onCurrentHover(event) {
    if (STATE.moving || Date.now() < store.hoverLockUntil || !App.pointer.pointerActive()) {
      return;
    }
    var row = App.dom.closest(event.target, '[data-current-index]');
    if (!row) {
      return;
    }
    var index = Number(row.getAttribute('data-current-index'));
    if (STATE.settingsZone !== 'current' || STATE.currentIndex !== index) {
      STATE.settingsZone = 'current';
      STATE.currentIndex = index;
      App.settings.refreshSettingsFocus();
    }
  }

  function onCurrentClick(event) {
    var row = App.dom.closest(event.target, '[data-current-index]');
    if (!row) {
      return;
    }
    var index = Number(row.getAttribute('data-current-index'));
    STATE.settingsZone = 'current';
    if (STATE.moving) {
      moveShortcutTo(index);
      commitMove();
      return;
    }
    STATE.currentIndex = index;
    startMove();
  }

  function onAddHover(event) {
    if (STATE.moving || Date.now() < store.hoverLockUntil || !App.pointer.pointerActive()) {
      return;
    }
    var row = App.dom.closest(event.target, '[data-add-index]');
    if (!row) {
      return;
    }
    var index = Number(row.getAttribute('data-add-index'));
    if (STATE.settingsZone !== 'add' || STATE.addIndex !== index) {
      STATE.settingsZone = 'add';
      STATE.addIndex = index;
      App.settings.refreshSettingsFocus();
    }
  }

  function onAddClick(event) {
    if (STATE.moving) {
      App.ui.toast('Solte o atalho primeiro');
      return;
    }
    var row = App.dom.closest(event.target, '[data-add-index]');
    if (!row) {
      return;
    }
    STATE.settingsZone = 'add';
    STATE.addIndex = Number(row.getAttribute('data-add-index'));
    activateAddItem();
  }

  function handleMoveKey(code) {
    if (code === KEY.UP) {
      moveCurrent(-1);
    } else if (code === KEY.DOWN) {
      moveCurrent(1);
    } else if (code === KEY.ENTER) {
      commitMove();
    } else if (code === KEY.BACK || code === KEY.ESC) {
      cancelMove();
    }
  }

  function startMove() {
    if (!STATE.shortcuts.length) {
      return;
    }
    STATE.moving = {
      index: STATE.currentIndex,
      snapshot: STATE.shortcuts.slice()
    };
    renderCurrentList();
    App.settings.refreshSettingsFocus();
  }

  function moveCurrent(direction) {
    if (!STATE.moving) {
      return;
    }
    var from = STATE.moving.index;
    var to = from + direction;
    if (to < 0 || to >= STATE.shortcuts.length) {
      return;
    }
    var item = STATE.shortcuts.splice(from, 1)[0];
    STATE.shortcuts.splice(to, 0, item);
    STATE.moving.index = to;
    STATE.currentIndex = to;
    renderCurrentList();
    App.settings.refreshSettingsFocus();
  }

  function moveShortcutTo(targetIndex) {
    if (!STATE.moving) {
      return;
    }
    var from = STATE.moving.index;
    var to = App.utils.clamp(targetIndex, 0, STATE.shortcuts.length - 1);
    if (from === to) {
      STATE.moving.index = to;
      STATE.currentIndex = to;
      return;
    }
    var item = STATE.shortcuts.splice(from, 1)[0];
    STATE.shortcuts.splice(to, 0, item);
    STATE.moving.index = to;
    STATE.currentIndex = to;
    renderCurrentList();
    App.settings.refreshSettingsFocus();
  }

  function commitMove() {
    if (!STATE.moving) {
      return;
    }
    STATE.moving = null;
    STATE.userTouched = true;
    App.shortcuts.saveConfig();
    renderCurrentList();
    App.home.renderHome();
    App.settings.refreshSettingsFocus();
  }

  function cancelMove() {
    if (!STATE.moving) {
      return;
    }
    STATE.shortcuts = STATE.moving.snapshot;
    STATE.currentIndex = STATE.moving.index;
    STATE.moving = null;
    renderCurrentList();
    App.home.renderHome();
    App.settings.refreshSettingsFocus();
  }

  function activateAddItem() {
    var entry = STATE.addItems[STATE.addIndex];
    if (!entry) {
      return;
    }
    if (entry.type === 'app') {
      toggleShortcut(entry.item.id, 'app', function () {
        return App.shortcuts.makeAppShortcut(entry.item);
      });
    } else if (entry.type === 'input') {
      toggleShortcut(entry.item.id, 'input', function () {
        return App.shortcuts.makeInputShortcut(entry.item);
      });
    } else if (entry.action === 'return') {
      App.returnWatch.toggleReturnOnExit();
    } else if (entry.action === 'autostart') {
      App.autostart.toggleAutostart();
    } else if (entry.action === 'refresh') {
      App.catalog.refreshAll({ manual: true, force: true, fromUser: true });
    }
  }

  function toggleShortcut(id, type, factory) {
    var existing = App.shortcuts.findShortcutIndex(id, type);
    if (existing >= 0) {
      STATE.shortcuts.splice(existing, 1);
      STATE.userTouched = true;
      if (STATE.currentIndex >= STATE.shortcuts.length) {
        STATE.currentIndex = Math.max(0, STATE.shortcuts.length - 1);
      }
      if (!STATE.shortcuts.length && STATE.settingsZone === 'current') {
        STATE.settingsZone = 'add';
      }
      App.shortcuts.saveConfig();
      App.home.renderHome();
      App.settings.renderSettings();
      return;
    }
    if (STATE.shortcuts.length >= CONFIG.maxShortcuts) {
      App.ui.toast('Máximo de ' + CONFIG.maxShortcuts + ' atalhos');
      return;
    }
    STATE.shortcuts.push(factory());
    STATE.userTouched = true;
    STATE.currentIndex = STATE.shortcuts.length - 1;
    App.shortcuts.saveConfig();
    App.home.renderHome();
    App.settings.renderSettings();
  }

  App.settingsShortcuts = {
    focusContent: focusContent,
    buildAddItems: buildAddItems,
    renderCurrentList: renderCurrentList,
    renderAddList: renderAddList,
    createAddRow: createAddRow,
    refreshFocus: refreshFocus,
    items: items,
    current: current,
    focusElement: focusElement,
    onKey: onKey,
    onCurrentHover: onCurrentHover,
    onCurrentClick: onCurrentClick,
    onAddHover: onAddHover,
    onAddClick: onAddClick,
    handleMoveKey: handleMoveKey,
    startMove: startMove,
    moveCurrent: moveCurrent,
    moveShortcutTo: moveShortcutTo,
    commitMove: commitMove,
    cancelMove: cancelMove,
    activateAddItem: activateAddItem,
    toggleShortcut: toggleShortcut
  };
})(window);
