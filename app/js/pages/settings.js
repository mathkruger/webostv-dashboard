(function (window) {
  'use strict';

  var App = window.Dashboard || (window.Dashboard = {});
  var store = App.store;
  var STATE = store.STATE;
  var els = store.els;
  var KEY = App.KEY;
  var WALLPAPER_COLUMNS = App.WALLPAPER_COLUMNS;
  var TABS = ['shortcuts', 'appearance', 'weather', 'news'];
  var wallpaperEntries = [];
  var wallpaperCards = [];

  function openSettings() {
    if (STATE.settingsOpen) {
      return;
    }
    STATE.settingsOpen = true;
    STATE.screen = 'settings';
    STATE.moving = null;
    STATE.appsFocus = false;
    STATE.newsFocus = false;
    STATE.settingsTab = 'shortcuts';
    STATE.tabIndex = 0;
    STATE.currentIndex = STATE.shortcuts.length ? App.utils.clamp(STATE.currentIndex, 0, STATE.shortcuts.length - 1) : 0;
    STATE.settingsZone = STATE.shortcuts.length ? 'current' : 'add';
    els.settings.classList.add('open');
    els.settings.setAttribute('aria-hidden', 'false');
    els.hint.classList.remove('visible');
    store.hoverLockUntil = Date.now() + 450;
    updateSettingsTabVisuals();
    buildAddItems();
    renderSettings();
    if (!store.appCatalog.length && !STATE.loading) {
      App.catalog.refreshAll({ manual: false });
    } else if (store.appCatalog.length && Date.now() - STATE.lastRefresh > 600000) {
      App.catalog.refreshAll({ manual: false });
    }
  }

  function closeSettings() {
    if (STATE.moving) {
      commitMove();
    }
    if (STATE.weatherEditing) {
      App.weather.finishCityEdit(false);
    }
    if (STATE.newsEditing) {
      App.news.finishFeedEdit(false);
    }
    STATE.settingsOpen = false;
    STATE.screen = 'home';
    els.settings.classList.remove('open');
    els.settings.setAttribute('aria-hidden', 'true');
    App.home.refreshHomeFocus();
  }

  function updateSettingsTabVisuals() {
    if (!els.settingsTabs) {
      return;
    }
    var tabs = els.settingsTabs.querySelectorAll('.settings-tab');
    for (var i = 0; i < tabs.length; i += 1) {
      var tab = tabs[i].getAttribute('data-tab');
      tabs[i].classList.toggle('active', tab === STATE.settingsTab);
    }
    if (els.settingsBodyShortcuts) {
      els.settingsBodyShortcuts.classList.toggle('hidden', STATE.settingsTab !== 'shortcuts');
    }
    if (els.settingsBodyAppearance) {
      els.settingsBodyAppearance.classList.toggle('hidden', STATE.settingsTab !== 'appearance');
    }
    if (els.settingsBodyWeather) {
      els.settingsBodyWeather.classList.toggle('hidden', STATE.settingsTab !== 'weather');
    }
    if (els.settingsBodyNews) {
      els.settingsBodyNews.classList.toggle('hidden', STATE.settingsTab !== 'news');
    }
  }

  function setSettingsTab(tab) {
    if (TABS.indexOf(tab) < 0) {
      tab = 'shortcuts';
    }
    STATE.settingsTab = tab;
    STATE.tabIndex = TABS.indexOf(tab);
    updateSettingsTabVisuals();
    if (STATE.settingsTab === 'appearance') {
      STATE.wallpaperIndex = App.wallpaper.wallpaperSelectedIndex();
      renderWallpaperList();
    } else if (STATE.settingsTab === 'weather') {
      App.weather.renderWeatherSettings();
    } else if (STATE.settingsTab === 'news') {
      App.news.renderNewsSettings();
    }
    refreshSettingsFocus();
  }

  function focusSettingsContent() {
    if (STATE.settingsTab === 'appearance') {
      STATE.settingsZone = 'appearance';
      STATE.wallpaperIndex = App.utils.clamp(STATE.wallpaperIndex, 0, Math.max(0, wallpaperEntries.length - 1));
    } else if (STATE.settingsTab === 'weather') {
      STATE.settingsZone = 'weather';
      STATE.weatherIndex = App.utils.clamp(STATE.weatherIndex, 0, 2);
      App.weather.renderWeatherSettings();
    } else if (STATE.settingsTab === 'news') {
      STATE.settingsZone = 'news';
      STATE.newsSettingsIndex = App.utils.clamp(STATE.newsSettingsIndex, 0, 2);
      App.news.renderNewsSettings();
    } else {
      STATE.settingsZone = STATE.shortcuts.length ? 'current' : 'add';
      STATE.currentIndex = App.utils.clamp(STATE.currentIndex, 0, Math.max(0, STATE.shortcuts.length - 1));
      STATE.addIndex = App.utils.clamp(STATE.addIndex, 0, Math.max(0, STATE.addItems.length - 1));
    }
    refreshSettingsFocus();
  }

  function renderWallpaperList() {
    if (!els.wallpaperGrid) {
      return;
    }
    wallpaperEntries = App.wallpaper.buildWallpaperEntries();
    wallpaperCards = [];
    els.wallpaperGrid.innerHTML = '';

    wallpaperEntries.forEach(function (entry, index) {
      var card = document.createElement('div');
      card.className = 'wallpaper-card';
      card.setAttribute('data-wallpaper-index', String(index));

      var preview = document.createElement('div');
      preview.className = 'wallpaper-preview';
      if (entry.kind === 'image') {
        preview.style.backgroundImage = 'url("' + entry.thumb + '")';
      } else if (entry.kind === 'color') {
        preview.style.backgroundColor = entry.value;
      } else {
        preview.className = 'wallpaper-preview random';
        preview.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16 3h5v5"></path><path d="M4 20 21 3"></path><path d="M21 16v5h-5"></path><path d="M15 15l6 6"></path><path d="M4 4l5 5"></path></svg>';
      }

      var badge = document.createElement('span');
      badge.className = 'wallpaper-badge';
      badge.textContent = '✓';
      preview.appendChild(badge);

      var label = document.createElement('div');
      label.className = 'wallpaper-label';

      var name = document.createElement('span');
      name.className = 'wallpaper-name';
      name.textContent = entry.title;

      var kind = document.createElement('span');
      kind.className = 'wallpaper-kind';
      kind.textContent = entry.meta;

      label.appendChild(name);
      label.appendChild(kind);
      card.appendChild(preview);
      card.appendChild(label);

      var setting = STATE.wallpaper || { mode: 'random' };
      var selected = setting.mode === 'random'
        ? entry.kind === 'random'
        : entry.kind === setting.mode && entry.id === setting.id;
      if (selected) {
        card.classList.add('selected');
      }

      els.wallpaperGrid.appendChild(card);
      wallpaperCards.push(card);
    });
    refreshWallpaperFocus();
  }

  function refreshWallpaperFocus() {
    if (!STATE.settingsOpen) {
      return;
    }
    wallpaperCards.forEach(function (card, index) {
      var focused = STATE.settingsTab === 'appearance' && STATE.settingsZone === 'appearance' && index === STATE.wallpaperIndex;
      card.classList.toggle('focused', focused);
      if (focused) {
        App.dom.scrollRowIntoView(els.wallpaperGrid, card);
      }
    });
  }

  function refreshWeatherFocus() {
    if (!STATE.settingsOpen || !els.weatherSettingsList) {
      return;
    }
    var rows = els.weatherSettingsList.querySelectorAll('[data-weather-index]');
    for (var i = 0; i < rows.length; i += 1) {
      var index = Number(rows[i].getAttribute('data-weather-index'));
      rows[i].classList.toggle('focused', STATE.settingsTab === 'weather' && STATE.settingsZone === 'weather' && index === STATE.weatherIndex);
    }
  }

  function refreshNewsFocus() {
    if (!STATE.settingsOpen || !els.newsSettingsList) {
      return;
    }
    var rows = els.newsSettingsList.querySelectorAll('[data-news-index]');
    for (var i = 0; i < rows.length; i += 1) {
      var index = Number(rows[i].getAttribute('data-news-index'));
      rows[i].classList.toggle('focused', STATE.settingsTab === 'news' && STATE.settingsZone === 'news' && index === STATE.newsSettingsIndex);
    }
  }

  function renderSettings() {
    if (!STATE.settingsOpen) {
      return;
    }
    var currentScroll = els.currentList.scrollTop;
    var addScroll = els.addList.scrollTop;
    buildAddItems();
    renderCurrentList();
    renderAddList();
    if (STATE.settingsTab === 'appearance') {
      renderWallpaperList();
    } else if (STATE.settingsTab === 'weather') {
      App.weather.renderWeatherSettings();
    } else if (STATE.settingsTab === 'news') {
      App.news.renderNewsSettings();
    }
    els.currentCount.textContent = String(STATE.shortcuts.length);
    els.currentList.scrollTop = currentScroll;
    els.addList.scrollTop = addScroll;
    refreshSettingsFocus();
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

  function refreshSettingsFocus() {
    if (!STATE.settingsOpen) {
      return;
    }
    els.settingsDone.classList.toggle('focused', STATE.settingsZone === 'done');

    if (els.settingsTabs) {
      var tabs = els.settingsTabs.querySelectorAll('.settings-tab');
      for (var t = 0; t < tabs.length; t += 1) {
        tabs[t].classList.toggle('focused', STATE.settingsZone === 'tabs' && t === STATE.tabIndex);
      }
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

    refreshWallpaperFocus();
    refreshWeatherFocus();
    refreshNewsFocus();

    if (STATE.moving) {
      els.currentHint.textContent = 'Use ↑ ↓ para mover • OK solta • Voltar cancela';
    } else if (!STATE.shortcuts.length) {
      els.currentHint.textContent = 'Escolha apps na lista ao lado';
    } else {
      els.currentHint.textContent = 'OK move o atalho';
    }
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
      refreshSettingsFocus();
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
      refreshSettingsFocus();
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

  function onTabClick(event) {
    if (STATE.moving) {
      App.ui.toast('Solte o atalho primeiro');
      return;
    }
    var tab = App.dom.closest(event.target, '[data-tab]');
    if (!tab) {
      return;
    }
    STATE.settingsZone = 'tabs';
    setSettingsTab(tab.getAttribute('data-tab'));
  }

  function onTabHover(event) {
    if (STATE.moving || Date.now() < store.hoverLockUntil || !App.pointer.pointerActive()) {
      return;
    }
    var tab = App.dom.closest(event.target, '[data-tab]');
    if (!tab) {
      return;
    }
    var tabName = tab.getAttribute('data-tab');
    var index = TABS.indexOf(tabName);
    if (index < 0) {
      index = 0;
    }
    if (STATE.settingsZone !== 'tabs' || STATE.tabIndex !== index) {
      STATE.settingsZone = 'tabs';
      STATE.tabIndex = index;
      refreshSettingsFocus();
    }
  }

  function onWallpaperHover(event) {
    if (STATE.moving || STATE.settingsTab !== 'appearance' || Date.now() < store.hoverLockUntil || !App.pointer.pointerActive()) {
      return;
    }
    var card = App.dom.closest(event.target, '[data-wallpaper-index]');
    if (!card) {
      return;
    }
    var index = Number(card.getAttribute('data-wallpaper-index'));
    if (STATE.settingsZone !== 'appearance' || STATE.wallpaperIndex !== index) {
      STATE.settingsZone = 'appearance';
      STATE.wallpaperIndex = index;
      refreshSettingsFocus();
    }
  }

  function onWallpaperClick(event) {
    if (STATE.moving || STATE.settingsTab !== 'appearance') {
      return;
    }
    var card = App.dom.closest(event.target, '[data-wallpaper-index]');
    if (!card) {
      return;
    }
    STATE.settingsZone = 'appearance';
    STATE.wallpaperIndex = Number(card.getAttribute('data-wallpaper-index'));
    App.wallpaper.selectWallpaper(wallpaperEntries[STATE.wallpaperIndex]);
  }

  function onWeatherHover(event) {
    if (STATE.moving || STATE.settingsTab !== 'weather' || Date.now() < store.hoverLockUntil || !App.pointer.pointerActive()) {
      return;
    }
    var row = App.dom.closest(event.target, '[data-weather-index]');
    if (!row) {
      return;
    }
    var index = Number(row.getAttribute('data-weather-index'));
    if (STATE.settingsZone !== 'weather' || STATE.weatherIndex !== index) {
      STATE.settingsZone = 'weather';
      STATE.weatherIndex = index;
      refreshSettingsFocus();
    }
  }

  function onWeatherClick(event) {
    if (STATE.moving || STATE.settingsTab !== 'weather') {
      return;
    }
    var row = App.dom.closest(event.target, '[data-weather-index]');
    if (!row) {
      return;
    }
    if (event.target === els.weatherCityInput) {
      STATE.settingsZone = 'weather';
      STATE.weatherIndex = 1;
      refreshSettingsFocus();
      return;
    }
    STATE.settingsZone = 'weather';
    STATE.weatherIndex = Number(row.getAttribute('data-weather-index'));
    refreshSettingsFocus();
    activateWeatherRow();
  }

  function onNewsHover(event) {
    if (STATE.moving || STATE.settingsTab !== 'news' || Date.now() < store.hoverLockUntil || !App.pointer.pointerActive()) {
      return;
    }
    var row = App.dom.closest(event.target, '[data-news-index]');
    if (!row) {
      return;
    }
    var index = Number(row.getAttribute('data-news-index'));
    if (STATE.settingsZone !== 'news' || STATE.newsSettingsIndex !== index) {
      STATE.settingsZone = 'news';
      STATE.newsSettingsIndex = index;
      refreshSettingsFocus();
    }
  }

  function onNewsClick(event) {
    if (STATE.moving || STATE.settingsTab !== 'news') {
      return;
    }
    var row = App.dom.closest(event.target, '[data-news-index]');
    if (!row) {
      return;
    }
    if (event.target === els.newsFeedInput) {
      STATE.settingsZone = 'news';
      STATE.newsSettingsIndex = 0;
      refreshSettingsFocus();
      return;
    }
    STATE.settingsZone = 'news';
    STATE.newsSettingsIndex = Number(row.getAttribute('data-news-index'));
    refreshSettingsFocus();
    activateNewsRow();
  }

  function activateNewsRow() {
    App.news.activateNewsRow();
  }

  function settingsTabNodes() {
    if (!els.settingsTabs) {
      return [];
    }
    return Array.prototype.slice.call(els.settingsTabs.querySelectorAll('.settings-tab'));
  }

  function queryNodes(root, selector) {
    if (!root) {
      return [];
    }
    return Array.prototype.slice.call(root.querySelectorAll(selector));
  }

  function settingsWeatherNodes() {
    return queryNodes(els.weatherSettingsList, '[data-weather-index]');
  }

  function settingsNewsNodes() {
    return queryNodes(els.newsSettingsList, '[data-news-index]');
  }

  function settingsItems() {
    var items = [els.settingsDone].concat(settingsTabNodes());
    if (STATE.settingsTab === 'shortcuts') {
      items = items.concat(store.currentRows, store.addRows);
    } else if (STATE.settingsTab === 'appearance') {
      items = items.concat(wallpaperCards);
    } else if (STATE.settingsTab === 'weather') {
      items = items.concat(settingsWeatherNodes());
    } else if (STATE.settingsTab === 'news') {
      items = items.concat(settingsNewsNodes());
    }
    return items;
  }

  function settingsCurrent() {
    if (STATE.settingsZone === 'done') {
      return els.settingsDone;
    }
    if (STATE.settingsZone === 'tabs') {
      return settingsTabNodes()[STATE.tabIndex] || null;
    }
    if (STATE.settingsZone === 'current') {
      return store.currentRows[STATE.currentIndex] || null;
    }
    if (STATE.settingsZone === 'add') {
      return store.addRows[STATE.addIndex] || null;
    }
    if (STATE.settingsZone === 'appearance') {
      return wallpaperCards[STATE.wallpaperIndex] || null;
    }
    if (STATE.settingsZone === 'weather') {
      return settingsWeatherNodes()[STATE.weatherIndex] || null;
    }
    if (STATE.settingsZone === 'news') {
      return settingsNewsNodes()[STATE.newsSettingsIndex] || null;
    }
    return null;
  }

  function settingsFocusElement(element) {
    if (element === els.settingsDone) {
      STATE.settingsZone = 'done';
    } else if (element.getAttribute('data-tab')) {
      var tabIndex = TABS.indexOf(element.getAttribute('data-tab'));
      STATE.settingsZone = 'tabs';
      STATE.tabIndex = tabIndex < 0 ? 0 : tabIndex;
    } else if (element.getAttribute('data-current-index') !== null) {
      STATE.settingsZone = 'current';
      STATE.currentIndex = Number(element.getAttribute('data-current-index'));
    } else if (element.getAttribute('data-add-index') !== null) {
      STATE.settingsZone = 'add';
      STATE.addIndex = Number(element.getAttribute('data-add-index'));
    } else if (element.getAttribute('data-wallpaper-index') !== null) {
      STATE.settingsZone = 'appearance';
      STATE.wallpaperIndex = Number(element.getAttribute('data-wallpaper-index'));
    } else if (element.getAttribute('data-weather-index') !== null) {
      STATE.settingsZone = 'weather';
      STATE.weatherIndex = Number(element.getAttribute('data-weather-index'));
    } else if (element.getAttribute('data-news-index') !== null) {
      STATE.settingsZone = 'news';
      STATE.newsSettingsIndex = Number(element.getAttribute('data-news-index'));
    }
    refreshSettingsFocus();
  }

  function settingsKey(code) {
    if (STATE.moving) {
      handleMoveKey(code);
      return true;
    }

    if (STATE.settingsZone === 'done') {
      if (code === KEY.LEFT) {
        STATE.settingsZone = 'tabs';
        STATE.tabIndex = TABS.indexOf(STATE.settingsTab);
        if (STATE.tabIndex < 0) {
          STATE.tabIndex = 0;
        }
        refreshSettingsFocus();
        return true;
      }
      if (code === KEY.DOWN) {
        focusSettingsContent();
        return true;
      }
    }

    if (STATE.settingsZone === 'tabs') {
      if (code === KEY.LEFT) {
        STATE.tabIndex = Math.max(0, STATE.tabIndex - 1);
        setSettingsTab(TABS[STATE.tabIndex]);
        return true;
      }
      if (code === KEY.RIGHT) {
        STATE.tabIndex = Math.min(TABS.length - 1, STATE.tabIndex + 1);
        setSettingsTab(TABS[STATE.tabIndex]);
        return true;
      }
      if (code === KEY.UP) {
        STATE.settingsZone = 'done';
        refreshSettingsFocus();
        return true;
      }
      if (code === KEY.DOWN || code === KEY.ENTER) {
        setSettingsTab(TABS[STATE.tabIndex]);
        focusSettingsContent();
        return true;
      }
      return false;
    }

    if (STATE.settingsZone === 'current') {
      if (code === KEY.UP && STATE.currentIndex === 0) {
        STATE.settingsZone = 'tabs';
        STATE.tabIndex = 0;
        refreshSettingsFocus();
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
        refreshSettingsFocus();
        return true;
      }
      if (code === KEY.DOWN && STATE.addIndex >= STATE.addItems.length - 1) {
        return true;
      }
      if (code === KEY.LEFT && !STATE.shortcuts.length) {
        STATE.settingsZone = 'done';
        refreshSettingsFocus();
        return true;
      }
      if (code === KEY.RIGHT) {
        return true;
      }
    }

    if (STATE.settingsZone === 'appearance') {
      var wallCount = wallpaperEntries.length;
      var wallIndex = STATE.wallpaperIndex;
      if (code === KEY.LEFT && wallIndex % WALLPAPER_COLUMNS === 0) {
        return true;
      }
      if (code === KEY.RIGHT && !(wallIndex % WALLPAPER_COLUMNS < WALLPAPER_COLUMNS - 1 && wallIndex + 1 < wallCount)) {
        return true;
      }
      if (code === KEY.UP && wallIndex < WALLPAPER_COLUMNS) {
        STATE.settingsZone = 'tabs';
        STATE.tabIndex = 1;
        refreshSettingsFocus();
        return true;
      }
      if (code === KEY.DOWN && wallIndex + WALLPAPER_COLUMNS >= wallCount) {
        return true;
      }
    }

    if (STATE.settingsZone === 'weather' && (code === KEY.LEFT || code === KEY.RIGHT)) {
      if (code === KEY.LEFT) {
        STATE.settingsZone = 'tabs';
        STATE.tabIndex = 2;
        refreshSettingsFocus();
      }
      return true;
    }

    if (STATE.settingsZone === 'news' && (code === KEY.LEFT || code === KEY.RIGHT)) {
      if (code === KEY.LEFT) {
        STATE.settingsZone = 'tabs';
        STATE.tabIndex = 3;
        refreshSettingsFocus();
      }
      return true;
    }

    if (STATE.settingsZone === 'weather') {
      if (code === KEY.UP && STATE.weatherIndex === 0) {
        STATE.settingsZone = 'tabs';
        STATE.tabIndex = 2;
        refreshSettingsFocus();
        return true;
      }
      if (code === KEY.DOWN && STATE.weatherIndex >= settingsWeatherNodes().length - 1) {
        return true;
      }
    }

    if (STATE.settingsZone === 'news') {
      if (code === KEY.UP && STATE.newsSettingsIndex === 0) {
        STATE.settingsZone = 'tabs';
        STATE.tabIndex = 3;
        refreshSettingsFocus();
        return true;
      }
      if (code === KEY.DOWN && STATE.newsSettingsIndex >= settingsNewsNodes().length - 1) {
        return true;
      }
    }

    return false;
  }

  function activateWeatherRow() {
    if (STATE.weatherIndex === 0) {
      App.weather.setEnabled(!App.weather.isEnabled());
    } else if (STATE.weatherIndex === 1) {
      App.weather.startCityEdit();
    } else if (STATE.weatherIndex === 2) {
      App.weather.refreshWeather(true);
    }
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
    refreshSettingsFocus();
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
    refreshSettingsFocus();
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
    refreshSettingsFocus();
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
    refreshSettingsFocus();
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
    refreshSettingsFocus();
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
      renderSettings();
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
    renderSettings();
  }

  App.settings = {
    openSettings: openSettings,
    closeSettings: closeSettings,
    updateSettingsTabVisuals: updateSettingsTabVisuals,
    setSettingsTab: setSettingsTab,
    focusSettingsContent: focusSettingsContent,
    renderWallpaperList: renderWallpaperList,
    refreshWallpaperFocus: refreshWallpaperFocus,
    refreshWeatherFocus: refreshWeatherFocus,
    refreshNewsFocus: refreshNewsFocus,
    renderSettings: renderSettings,
    buildAddItems: buildAddItems,
    renderCurrentList: renderCurrentList,
    renderAddList: renderAddList,
    createAddRow: createAddRow,
    refreshSettingsFocus: refreshSettingsFocus,
    onCurrentHover: onCurrentHover,
    onCurrentClick: onCurrentClick,
    onAddHover: onAddHover,
    onAddClick: onAddClick,
    onTabClick: onTabClick,
    onTabHover: onTabHover,
    onWallpaperHover: onWallpaperHover,
    onWallpaperClick: onWallpaperClick,
    onWeatherHover: onWeatherHover,
    onWeatherClick: onWeatherClick,
    onNewsHover: onNewsHover,
    onNewsClick: onNewsClick,
    activateWeatherRow: activateWeatherRow,
    handleMoveKey: handleMoveKey,
    startMove: startMove,
    moveCurrent: moveCurrent,
    moveShortcutTo: moveShortcutTo,
    commitMove: commitMove,
    cancelMove: cancelMove,
    activateAddItem: activateAddItem,
    toggleShortcut: toggleShortcut
  };

  App.focus.register('settings', {
    items: settingsItems,
    current: settingsCurrent,
    onFocus: settingsFocusElement,
    onKey: settingsKey,
    onBack: closeSettings
  });
})(window);
