(function (window) {
  'use strict';

  var App = window.Dashboard || (window.Dashboard = {});

  var CONFIG = window.DASHBOARD_CONFIG;
  var KEY = {
    LEFT: 37,
    UP: 38,
    RIGHT: 39,
    DOWN: 40,
    ENTER: 13,
    BACK: 461,
    ESC: 27
  };
  var PALETTE = [
    ['#3a3a3e', '#1b1b1f'],
    ['#2e3a44', '#171e24'],
    ['#44332e', '#221a18'],
    ['#2d3a30', '#171f19'],
    ['#3b3147', '#1e1925'],
    ['#43382a', '#221c15'],
    ['#2b3744', '#151c23'],
    ['#3e2f3c', '#201820']
  ];
  var WALLPAPER_COLUMNS = 4;

  App.config = CONFIG;
  App.KEY = KEY;
  App.PALETTE = PALETTE;
  App.WALLPAPER_COLUMNS = WALLPAPER_COLUMNS;
})(window);
