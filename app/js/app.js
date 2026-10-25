(function (window, document) {
  'use strict';

  var App = window.Dashboard || (window.Dashboard = {});
  var store = App.store;
  var STATE = store.STATE;
  var els = store.els;

  function bindEvents() {
    document.addEventListener('keydown', App.keyboard.onKeyDown, false);
    window.addEventListener('resize', function () {
      App.home.refreshHomeFocus();
      App.settings.refreshSettingsFocus();
    }, false);
    document.addEventListener('visibilitychange', onVisibilityChange, false);
    window.addEventListener('webOSRelaunch', function () {
      if (STATE.settingsOpen) {
        App.settings.closeSettings();
      }
      if (STATE.allOpen) {
        App.allApps.closeAllApps();
      }
      if (STATE.newsOpen) {
        App.news.closeNews();
      }
      App.returnWatch.ensureReturnWatcher(false);
      App.clock.updateClock();
      App.wallpaper.applyWallpaper();
      App.weather.refreshWeather(false);
      App.news.refreshNews(false);
      App.home.renderHome();
    }, false);

    els.appsButton.addEventListener('click', function (event) {
      event.stopPropagation();
      App.allApps.openAllApps();
    }, false);
    els.appsButton.addEventListener('mouseover', function () {
      STATE.appsFocus = true;
      STATE.gearFocus = false;
      STATE.emptyFocus = false;
      STATE.newsFocus = false;
      App.home.refreshHomeFocus();
    }, false);

    els.settingsButton.addEventListener('click', function (event) {
      event.stopPropagation();
      App.settings.openSettings();
    }, false);
    els.settingsButton.addEventListener('mouseover', function () {
      STATE.gearFocus = true;
      STATE.appsFocus = false;
      STATE.emptyFocus = false;
      STATE.newsFocus = false;
      App.home.refreshHomeFocus();
    }, false);

    els.allappsDone.addEventListener('click', function () {
      App.allApps.closeAllApps();
    }, false);
    els.allappsList.addEventListener('mouseover', App.allApps.onAllHover, false);
    els.allappsList.addEventListener('click', App.allApps.onAllClick, false);

    els.emptyAction.addEventListener('click', App.settings.openSettings, false);
    els.emptyAction.addEventListener('mouseover', function () {
      STATE.gearFocus = false;
      STATE.emptyFocus = true;
      STATE.newsFocus = false;
      App.home.refreshHomeFocus();
    }, false);

    els.settingsDone.addEventListener('click', function () {
      if (STATE.moving) {
        App.settings.commitMove();
      }
      App.settings.closeSettings();
    }, false);
    els.settingsDone.addEventListener('mouseover', function () {
      if (Date.now() < store.hoverLockUntil || !App.pointer.pointerActive()) {
        return;
      }
      STATE.settingsZone = 'done';
      App.settings.refreshSettingsFocus();
    }, false);

    els.settingsTabs.addEventListener('click', App.settings.onTabClick, false);
    els.settingsTabs.addEventListener('mouseover', App.settings.onTabHover, false);
    els.wallpaperGrid.addEventListener('mouseover', App.settings.onWallpaperHover, false);
    els.wallpaperGrid.addEventListener('click', App.settings.onWallpaperClick, false);
    els.weatherSettingsList.addEventListener('mouseover', App.settings.onWeatherHover, false);
    els.weatherSettingsList.addEventListener('click', App.settings.onWeatherClick, false);
    els.newsSettingsList.addEventListener('mouseover', App.settings.onNewsHover, false);
    els.newsSettingsList.addEventListener('click', App.settings.onNewsClick, false);

    els.news.addEventListener('click', App.news.onNewsCardClick, false);
    els.news.addEventListener('mouseover', App.news.onNewsCardHover, false);
    els.newsDone.addEventListener('click', App.news.onNewsDoneClick, false);
    els.newsDone.addEventListener('mouseover', App.news.onNewsDoneHover, false);
    els.newsRefresh.addEventListener('mouseover', App.news.onNewsActionHover, false);
    els.newsRefresh.addEventListener('click', App.news.onNewsActionClick, false);
    els.newsPrev.addEventListener('mouseover', App.news.onNewsActionHover, false);
    els.newsPrev.addEventListener('click', App.news.onNewsActionClick, false);
    els.newsNext.addEventListener('mouseover', App.news.onNewsActionHover, false);
    els.newsNext.addEventListener('click', App.news.onNewsActionClick, false);
    els.newsList.addEventListener('mouseover', App.news.onNewsItemHover, false);
    els.newsList.addEventListener('click', App.news.onNewsItemClick, false);

    els.grid.addEventListener('mouseover', App.home.onGridHover, false);
    els.grid.addEventListener('click', App.home.onGridClick, false);
    els.currentList.addEventListener('mouseover', App.settings.onCurrentHover, false);
    els.currentList.addEventListener('click', App.settings.onCurrentClick, false);
    els.addList.addEventListener('mouseover', App.settings.onAddHover, false);
    els.addList.addEventListener('click', App.settings.onAddClick, false);
    document.addEventListener('mousemove', App.pointer.onMouseMove, false);
  }

  function onVisibilityChange() {
    if (!document.hidden) {
      App.returnWatch.cancelInAppReturnWatch();
      App.returnWatch.ensureReturnWatcher(false);
      STATE.launching = false;
      var tiles = els.grid.children;
      for (var i = 0; i < tiles.length; i += 1) {
        tiles[i].classList.remove('pressed');
      }
      App.clock.updateClock();
      App.weather.refreshWeather(false);
      App.news.refreshNews(false);
      if (STATE.allOpen && !STATE.launching) {
        App.allApps.closeAllApps();
      }
      if (!STATE.settingsOpen) {
        App.home.refreshHomeFocus();
      }
    }
  }

  function init() {
    App.dom.cacheElements();
    bindEvents();
    App.clock.startClock();
    App.pointer.setPointerHidden(true);

    var config = App.shortcuts.readConfig();
    if (config.exists) {
      STATE.shortcuts = config.shortcuts;
      STATE.allowSeed = false;
    } else {
      STATE.shortcuts = App.shortcuts.seedFallback();
      STATE.allowSeed = true;
      App.shortcuts.saveConfig();
    }

    STATE.returnOnExit = App.returnWatch.readReturnSetting();
    STATE.wallpaper = App.wallpaper.readWallpaperSetting();
    App.wallpaper.applyWallpaper();
    App.weather.startWeather();
    App.news.startNews();

    App.home.renderHome();
    App.ui.showHintOnce();
    App.catalog.refreshAll({ fromUser: false });
    try {
      if (localStorage.getItem('dashboard.debug') === '1') {
        window.__dashboardDebug = {
          STATE: STATE,
          appCatalog: function () {
            return store.appCatalog;
          },
          inputCatalog: function () {
            return store.inputCatalog;
          }
        };
      }
    } catch (error) {
      void error;
    }

    setTimeout(function () {
      App.pointer.setPointerHidden(true);
    }, 2600);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, false);
  } else {
    init();
  }
})(window, document);
