(function (window) {
  'use strict';

  var App = window.Dashboard || (window.Dashboard = {});
  var store = App.store;
  var STATE = store.STATE;
  var els = store.els;
  var KEY = App.KEY;

  function queryNodes(root, selector) {
    if (!root) {
      return [];
    }
    return Array.prototype.slice.call(root.querySelectorAll(selector));
  }

  function nodes() {
    return queryNodes(els.newsSettingsList, '[data-news-index]');
  }

  function focusContent() {
    STATE.settingsZone = 'news';
    STATE.newsSettingsIndex = App.utils.clamp(STATE.newsSettingsIndex, 0, 2);
    render();
  }

  function render() {
    App.news.renderNewsSettings();
  }

  function refreshFocus() {
    if (!STATE.settingsOpen || !els.newsSettingsList) {
      return;
    }
    var rows = nodes();
    for (var i = 0; i < rows.length; i += 1) {
      var index = Number(rows[i].getAttribute('data-news-index'));
      rows[i].classList.toggle('focused', STATE.settingsTab === 'news' && STATE.settingsZone === 'news' && index === STATE.newsSettingsIndex);
    }
  }

  function items() {
    return nodes();
  }

  function current() {
    if (STATE.settingsZone !== 'news') {
      return null;
    }
    return nodes()[STATE.newsSettingsIndex] || null;
  }

  function focusElement(element) {
    if (element.getAttribute('data-news-index') === null) {
      return false;
    }
    STATE.settingsZone = 'news';
    STATE.newsSettingsIndex = Number(element.getAttribute('data-news-index'));
    return true;
  }

  function onKey(code) {
    if (code === KEY.LEFT || code === KEY.RIGHT) {
      if (code === KEY.LEFT) {
        STATE.settingsZone = 'tabs';
        STATE.tabIndex = 3;
        App.settings.refreshSettingsFocus();
      }
      return true;
    }
    if (code === KEY.UP && STATE.newsSettingsIndex === 0) {
      STATE.settingsZone = 'tabs';
      STATE.tabIndex = 3;
      App.settings.refreshSettingsFocus();
      return true;
    }
    if (code === KEY.DOWN && STATE.newsSettingsIndex >= nodes().length - 1) {
      return true;
    }
    return false;
  }

  function activateRow() {
    App.news.activateNewsRow();
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
      App.settings.refreshSettingsFocus();
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
      App.settings.refreshSettingsFocus();
      return;
    }
    STATE.settingsZone = 'news';
    STATE.newsSettingsIndex = Number(row.getAttribute('data-news-index'));
    App.settings.refreshSettingsFocus();
    activateRow();
  }

  App.settingsNews = {
    focusContent: focusContent,
    render: render,
    refreshFocus: refreshFocus,
    items: items,
    current: current,
    focusElement: focusElement,
    onKey: onKey,
    activateRow: activateRow,
    onNewsHover: onNewsHover,
    onNewsClick: onNewsClick
  };
})(window);
