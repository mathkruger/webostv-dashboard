(function (window) {
  'use strict';

  var App = window.Dashboard || (window.Dashboard = {});
  var store = App.store;
  var STATE = store.STATE;
  var els = store.els;
  var CONFIG = App.config;

  function $(id) {
    return document.getElementById(id);
  }

  function cacheElements() {
    els.app = $('app');
    els.wallpaper = $('wallpaper');
    els.time = $('time');
    els.date = $('date');
    els.weather = $('weather');
    els.weatherIcon = $('weather-icon');
    els.weatherTemp = $('weather-temp');
    els.weatherDesc = $('weather-desc');
    els.weatherCity = $('weather-city');
    els.news = $('news');
    els.newsCardSource = $('news-card-source');
    els.newsCardMeta = $('news-card-meta');
    els.newsCardTitle = $('news-card-title');
    els.newsCardDots = $('news-card-dots');
    els.settingsButton = $('settings-button');
    els.appsButton = $('apps-button');
    els.home = $('home');
    els.grid = $('grid');
    els.empty = $('empty');
    els.emptyAction = $('empty-action');
    els.hint = $('hint');
    els.toast = $('toast');
    els.settings = $('settings');
    els.settingsDone = $('settings-done');
    els.settingsTabs = $('settings-tabs');
    els.settingsBodyShortcuts = $('settings-body-shortcuts');
    els.settingsBodyAppearance = $('settings-body-appearance');
    els.settingsBodyWeather = $('settings-body-weather');
    els.settingsBodyNews = $('settings-body-news');
    els.newsSettingsList = $('news-settings-list');
    els.newsFeedInput = $('news-feed-input');
    els.newsFeedMeta = $('news-feed-meta');
    els.newsRefreshMeta = $('news-refresh-meta');
    els.newsSettingsStatus = $('news-settings-status');
    els.newsSettingsHint = $('news-settings-hint');
    els.weatherSettingsList = $('weather-settings-list');
    els.weatherToggleSwitch = $('weather-toggle-switch');
    els.weatherToggleMeta = $('weather-toggle-meta');
    els.weatherCityInput = $('weather-city-input');
    els.weatherCityMeta = $('weather-city-meta');
    els.weatherRefreshMeta = $('weather-refresh-meta');
    els.weatherStatus = $('weather-status');
    els.weatherHint = $('weather-hint');
    els.wallpaperImageList = $('wallpaper-image-list');
    els.wallpaperColorList = $('wallpaper-color-list');
    els.wallpaperImageCount = $('wallpaper-image-count');
    els.wallpaperColorCount = $('wallpaper-color-count');
    els.wallpaperCurrent = $('wallpaper-current');
    els.currentList = $('current-list');
    els.addList = $('add-list');
    els.currentCount = $('current-count');
    els.currentHint = $('current-hint');
    els.statusText = $('status-text');
    els.allapps = $('allapps');
    els.allappsDone = $('allapps-done');
    els.allappsAppsList = $('allapps-apps-list');
    els.allappsInputsList = $('allapps-inputs-list');
    els.allappsAppsCount = $('allapps-apps-count');
    els.allappsInputsCount = $('allapps-inputs-count');
    els.allappsStatus = $('allapps-status');
    els.newsPage = $('news-page');
    els.newsDone = $('news-done');
    els.newsRefresh = $('news-refresh');
    els.newsPrev = $('news-prev');
    els.newsNext = $('news-next');
    els.newsPageLabel = $('news-page-label');
    els.newsCount = $('news-count');
    els.newsSource = $('news-source');
    els.newsList = $('news-list');
    els.newsStatus = $('news-status');
  }

  function closest(element, selector) {
    while (element && element !== document) {
      if (element.nodeType === 1 && element.matches && element.matches(selector)) {
        return element;
      }
      element = element.parentNode;
    }
    return null;
  }

  function scrollRowIntoView(container, row) {
    if (!container || !row) {
      return;
    }
    var containerRect = container.getBoundingClientRect();
    var rowRect = row.getBoundingClientRect();
    var top = rowRect.top - containerRect.top + container.scrollTop;
    var bottom = top + rowRect.height;
    if (top < container.scrollTop + 8) {
      container.scrollTop = Math.max(0, top - 8);
    } else if (bottom > container.scrollTop + container.clientHeight - 8) {
      container.scrollTop = bottom - container.clientHeight + 8;
    }
  }

  App.dom = {
    $: $,
    cacheElements: cacheElements,
    closest: closest,
    scrollRowIntoView: scrollRowIntoView
  };
})(window);
