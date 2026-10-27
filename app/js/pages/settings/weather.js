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
    return queryNodes(els.weatherSettingsList, '[data-weather-index]');
  }

  function focusContent() {
    STATE.settingsZone = 'weather';
    STATE.weatherIndex = App.utils.clamp(STATE.weatherIndex, 0, 2);
    render();
  }

  function render() {
    App.weather.renderWeatherSettings();
  }

  function refreshFocus() {
    if (!STATE.settingsOpen || !els.weatherSettingsList) {
      return;
    }
    var rows = nodes();
    for (var i = 0; i < rows.length; i += 1) {
      var index = Number(rows[i].getAttribute('data-weather-index'));
      rows[i].classList.toggle('focused', STATE.settingsTab === 'weather' && STATE.settingsZone === 'weather' && index === STATE.weatherIndex);
    }
  }

  function items() {
    return nodes();
  }

  function current() {
    if (STATE.settingsZone !== 'weather') {
      return null;
    }
    return nodes()[STATE.weatherIndex] || null;
  }

  function focusElement(element) {
    if (element.getAttribute('data-weather-index') === null) {
      return false;
    }
    STATE.settingsZone = 'weather';
    STATE.weatherIndex = Number(element.getAttribute('data-weather-index'));
    return true;
  }

  function onKey(code) {
    if (code === KEY.LEFT || code === KEY.RIGHT) {
      if (code === KEY.LEFT) {
        STATE.settingsZone = 'tabs';
        STATE.tabIndex = 2;
        App.settings.refreshSettingsFocus();
      }
      return true;
    }
    if (code === KEY.UP && STATE.weatherIndex === 0) {
      STATE.settingsZone = 'tabs';
      STATE.tabIndex = 2;
      App.settings.refreshSettingsFocus();
      return true;
    }
    if (code === KEY.DOWN && STATE.weatherIndex >= nodes().length - 1) {
      return true;
    }
    return false;
  }

  function activateRow() {
    if (STATE.weatherIndex === 0) {
      App.weather.setEnabled(!App.weather.isEnabled());
    } else if (STATE.weatherIndex === 1) {
      App.weather.startCityEdit();
    } else if (STATE.weatherIndex === 2) {
      App.weather.refreshWeather(true);
    }
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
      App.settings.refreshSettingsFocus();
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
      App.settings.refreshSettingsFocus();
      return;
    }
    STATE.settingsZone = 'weather';
    STATE.weatherIndex = Number(row.getAttribute('data-weather-index'));
    App.settings.refreshSettingsFocus();
    activateRow();
  }

  App.settingsWeather = {
    focusContent: focusContent,
    render: render,
    refreshFocus: refreshFocus,
    items: items,
    current: current,
    focusElement: focusElement,
    onKey: onKey,
    activateRow: activateRow,
    onWeatherHover: onWeatherHover,
    onWeatherClick: onWeatherClick
  };
})(window);
