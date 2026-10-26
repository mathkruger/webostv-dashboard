(function (window) {
  'use strict';

  var App = window.Dashboard || (window.Dashboard = {});
  var store = App.store;
  var STATE = store.STATE;
  var els = store.els;
  var CONFIG = App.config;
  var KEY = App.KEY;

  function isTextInput(element) {
    return !!element && element.nodeType === 1 && element.tagName === 'INPUT' &&
      (element.type === 'text' || element.type === 'search');
  }

  function onKeyDown(event) {
    var code = event.keyCode;
    var active = document.activeElement;
    if (isTextInput(active)) {
      if (code === KEY.BACK || code === KEY.ESC) {
        event.preventDefault();
        if (active === els.newsFeedInput && App.news && App.news.cancelFeedEdit) {
          App.news.cancelFeedEdit();
        } else if (App.weather && App.weather.cancelCityEdit) {
          App.weather.cancelCityEdit();
        }
      }
      return;
    }
    if (code === KEY.LEFT || code === KEY.UP || code === KEY.RIGHT || code === KEY.DOWN || code === KEY.ENTER || code === KEY.BACK || code === KEY.ESC) {
      event.preventDefault();
    }
    App.focus.handleKey(STATE.screen, code);
  }

  App.keyboard = {
    onKeyDown: onKeyDown
  };
})(window);
