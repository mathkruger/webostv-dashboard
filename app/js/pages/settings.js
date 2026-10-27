(function (window) {
  'use strict';

  var App = window.Dashboard || (window.Dashboard = {});
  var store = App.store;
  var STATE = store.STATE;
  var els = store.els;
  var KEY = App.KEY;
  var TABS = ['shortcuts', 'appearance', 'weather', 'news'];

  function openSettings() {
    if (STATE.settingsOpen) {
      return;
    }
    STATE.settingsOpen = true;
    STATE.screen = 'settings';
    STATE.moving = null;
    STATE.appsFocus = false;
    STATE.newsFocus = false;
    STATE.weatherFocus = false;
    STATE.settingsTab = 'shortcuts';
    STATE.tabIndex = 0;
    STATE.currentIndex = STATE.shortcuts.length ? App.utils.clamp(STATE.currentIndex, 0, STATE.shortcuts.length - 1) : 0;
    STATE.settingsZone = STATE.shortcuts.length ? 'current' : 'add';
    els.settings.classList.add('open');
    els.settings.setAttribute('aria-hidden', 'false');
    els.hint.classList.remove('visible');
    store.hoverLockUntil = Date.now() + 450;
    updateSettingsTabVisuals();
    App.settingsShortcuts.buildAddItems();
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
      App.settingsAppearance.renderWallpaperList();
      App.settingsAppearance.selectFromSetting();
    } else if (STATE.settingsTab === 'weather') {
      App.settingsWeather.render();
    } else if (STATE.settingsTab === 'news') {
      App.settingsNews.render();
    }
    refreshSettingsFocus();
  }

  function focusSettingsContent() {
    if (STATE.settingsTab === 'appearance') {
      App.settingsAppearance.focusContent();
    } else if (STATE.settingsTab === 'weather') {
      App.settingsWeather.focusContent();
    } else if (STATE.settingsTab === 'news') {
      App.settingsNews.focusContent();
    } else {
      App.settingsShortcuts.focusContent();
    }
    refreshSettingsFocus();
  }

  function renderSettings() {
    if (!STATE.settingsOpen) {
      return;
    }
    var currentScroll = els.currentList.scrollTop;
    var addScroll = els.addList.scrollTop;
    App.settingsShortcuts.buildAddItems();
    App.settingsShortcuts.renderCurrentList();
    App.settingsShortcuts.renderAddList();
    if (STATE.settingsTab === 'appearance') {
      App.settingsAppearance.renderWallpaperList();
    } else if (STATE.settingsTab === 'weather') {
      App.settingsWeather.render();
    } else if (STATE.settingsTab === 'news') {
      App.settingsNews.render();
    }
    els.currentCount.textContent = String(STATE.shortcuts.length);
    els.currentList.scrollTop = currentScroll;
    els.addList.scrollTop = addScroll;
    refreshSettingsFocus();
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

    App.settingsShortcuts.refreshFocus();
    App.settingsAppearance.refreshWallpaperFocus();
    App.settingsWeather.refreshFocus();
    App.settingsNews.refreshFocus();
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

  function settingsTabNodes() {
    if (!els.settingsTabs) {
      return [];
    }
    return Array.prototype.slice.call(els.settingsTabs.querySelectorAll('.settings-tab'));
  }

  function settingsItems() {
    var items = [els.settingsDone].concat(settingsTabNodes());
    if (STATE.settingsTab === 'shortcuts') {
      items = items.concat(App.settingsShortcuts.items());
    } else if (STATE.settingsTab === 'appearance') {
      items = items.concat(App.settingsAppearance.items());
    } else if (STATE.settingsTab === 'weather') {
      items = items.concat(App.settingsWeather.items());
    } else if (STATE.settingsTab === 'news') {
      items = items.concat(App.settingsNews.items());
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
    if (STATE.settingsZone === 'current' || STATE.settingsZone === 'add') {
      return App.settingsShortcuts.current();
    }
    if (STATE.settingsZone === 'appearance') {
      return App.settingsAppearance.current();
    }
    if (STATE.settingsZone === 'weather') {
      return App.settingsWeather.current();
    }
    if (STATE.settingsZone === 'news') {
      return App.settingsNews.current();
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
    } else {
      App.settingsShortcuts.focusElement(element);
      App.settingsAppearance.focusElement(element);
      App.settingsWeather.focusElement(element);
      App.settingsNews.focusElement(element);
    }
    refreshSettingsFocus();
  }

  function settingsKey(code) {
    if (STATE.moving) {
      App.settingsShortcuts.handleMoveKey(code);
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

    if (STATE.settingsZone === 'current' || STATE.settingsZone === 'add') {
      return App.settingsShortcuts.onKey(code);
    }
    if (STATE.settingsZone === 'appearance') {
      return App.settingsAppearance.onKey(code);
    }
    if (STATE.settingsZone === 'weather') {
      return App.settingsWeather.onKey(code);
    }
    if (STATE.settingsZone === 'news') {
      return App.settingsNews.onKey(code);
    }

    return false;
  }

  function renderWallpaperList() {
    App.settingsAppearance.renderWallpaperList();
  }

  function refreshWallpaperFocus() {
    App.settingsAppearance.refreshWallpaperFocus();
  }

  function refreshWeatherFocus() {
    App.settingsWeather.refreshFocus();
  }

  function refreshNewsFocus() {
    App.settingsNews.refreshFocus();
  }

  function buildAddItems() {
    App.settingsShortcuts.buildAddItems();
  }

  function renderCurrentList() {
    App.settingsShortcuts.renderCurrentList();
  }

  function renderAddList() {
    App.settingsShortcuts.renderAddList();
  }

  function createAddRow(entry, index) {
    return App.settingsShortcuts.createAddRow(entry, index);
  }

  function onCurrentHover(event) {
    App.settingsShortcuts.onCurrentHover(event);
  }

  function onCurrentClick(event) {
    App.settingsShortcuts.onCurrentClick(event);
  }

  function onAddHover(event) {
    App.settingsShortcuts.onAddHover(event);
  }

  function onAddClick(event) {
    App.settingsShortcuts.onAddClick(event);
  }

  function onWallpaperHover(event) {
    App.settingsAppearance.onWallpaperHover(event);
  }

  function onWallpaperClick(event) {
    App.settingsAppearance.onWallpaperClick(event);
  }

  function onWeatherHover(event) {
    App.settingsWeather.onWeatherHover(event);
  }

  function onWeatherClick(event) {
    App.settingsWeather.onWeatherClick(event);
  }

  function onNewsHover(event) {
    App.settingsNews.onNewsHover(event);
  }

  function onNewsClick(event) {
    App.settingsNews.onNewsClick(event);
  }

  function activateWeatherRow() {
    App.settingsWeather.activateRow();
  }

  function handleMoveKey(code) {
    App.settingsShortcuts.handleMoveKey(code);
  }

  function startMove() {
    App.settingsShortcuts.startMove();
  }

  function moveCurrent(direction) {
    App.settingsShortcuts.moveCurrent(direction);
  }

  function moveShortcutTo(targetIndex) {
    App.settingsShortcuts.moveShortcutTo(targetIndex);
  }

  function commitMove() {
    App.settingsShortcuts.commitMove();
  }

  function cancelMove() {
    App.settingsShortcuts.cancelMove();
  }

  function activateAddItem() {
    App.settingsShortcuts.activateAddItem();
  }

  function toggleShortcut(id, type, factory) {
    App.settingsShortcuts.toggleShortcut(id, type, factory);
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
