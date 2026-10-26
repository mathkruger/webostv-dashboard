(function (window) {
  'use strict';

  var App = window.Dashboard || (window.Dashboard = {});

  var STATE = {
    screen: 'home',
    shortcuts: [],
    homeFocus: 0,
    gearFocus: false,
    appsFocus: false,
    emptyFocus: false,
    newsFocus: false,
    newsOpen: false,
    newsZone: 'list',
    newsIndex: 0,
    newsPage: 0,
    newsActionIndex: 0,
    newsEditing: false,
    newsSettingsIndex: 0,
    allOpen: false,
    allFocus: 0,
    allZone: 'list',
    allItems: [],
    settingsOpen: false,
    settingsTab: 'shortcuts',
    tabIndex: 0,
    settingsZone: 'current',
    currentIndex: 0,
    addIndex: 0,
    addItems: [],
    wallpaper: null,
    wallpaperIndex: 0,
    weatherEditing: false,
    weatherIndex: 0,
    moving: null,
    loading: false,
    launching: false,
    rootOk: false,
    appsSource: 'fallback',
    autostart: false,
    autostartSupported: false,
    returnOnExit: true,
    returnReady: false,
    returnWatch: null,
    returnErrorShown: false,
    status: 'Pronto',
    statusError: false,
    userTouched: false,
    allowSeed: false,
    lastRefresh: 0
  };

  App.store = {
    STATE: STATE,
    els: {},
    appCatalog: [],
    inputCatalog: [],
    tileNodes: {},
    currentNodes: {},
    addNodes: {},
    currentRows: [],
    addRows: [],
    allRows: [],
    allNodes: {},
    hoverLockUntil: 0
  };
})(window);
