(function (window) {
  'use strict';

  var App = window.Dashboard || (window.Dashboard = {});
  var store = App.store;
  var STATE = store.STATE;
  var els = store.els;
  var CONFIG = App.config;

  function findWallpaperEntry(kind, id) {
    var list = kind === 'color' ? CONFIG.wallpaperColors : CONFIG.wallpapers;
    if (!list) {
      return null;
    }
    for (var i = 0; i < list.length; i += 1) {
      if (list[i].id === id) {
        return list[i];
      }
    }
    return null;
  }

  function normalizeWallpaperSetting(value) {
    if (!value || typeof value !== 'object') {
      return { mode: 'random' };
    }
    if (value.mode === 'random') {
      return { mode: 'random' };
    }
    if (value.mode === 'image' && findWallpaperEntry('image', value.id)) {
      return { mode: 'image', id: value.id };
    }
    if (value.mode === 'color' && findWallpaperEntry('color', value.id)) {
      return { mode: 'color', id: value.id };
    }
    return { mode: 'random' };
  }

  function readWallpaperSetting() {
    try {
      var raw = localStorage.getItem(CONFIG.wallpaperStorageKey);
      if (!raw) {
        return { mode: 'random' };
      }
      return normalizeWallpaperSetting(JSON.parse(raw));
    } catch (error) {
      return { mode: 'random' };
    }
  }

  function saveWallpaperSetting() {
    try {
      localStorage.setItem(CONFIG.wallpaperStorageKey, JSON.stringify(STATE.wallpaper));
    } catch (error) {
      void error;
    }
  }

  function buildWallpaperEntries() {
    var entries = [{
      kind: 'random',
      title: 'Aleatório',
      meta: 'Cada abertura'
    }];
    (CONFIG.wallpapers || []).forEach(function (wallpaper) {
      entries.push({
        kind: 'image',
        id: wallpaper.id,
        title: wallpaper.title,
        src: wallpaper.src,
        thumb: wallpaper.thumb || wallpaper.src,
        meta: 'Imagem'
      });
    });
    (CONFIG.wallpaperColors || []).forEach(function (color) {
      entries.push({
        kind: 'color',
        id: color.id,
        title: color.title,
        value: color.value,
        meta: 'Cor sólida'
      });
    });
    return entries;
  }

  function applyWallpaper() {
    if (!els.wallpaper) {
      return;
    }
    var setting = STATE.wallpaper || { mode: 'random' };
    var entry = null;
    if (setting.mode === 'random') {
      var list = CONFIG.wallpapers || [];
      if (list.length) {
        entry = list[Math.floor(Math.random() * list.length)];
      }
    } else {
      entry = findWallpaperEntry(setting.mode, setting.id);
    }

    if (!entry) {
      els.wallpaper.style.backgroundImage = 'none';
      els.wallpaper.style.backgroundColor = '#050506';
    } else if (setting.mode === 'color') {
      els.wallpaper.style.backgroundImage = 'none';
      els.wallpaper.style.backgroundColor = entry.value;
    } else {
      els.wallpaper.style.backgroundColor = '#050506';
      els.wallpaper.style.backgroundImage = 'url("' + entry.src + '")';
    }
    updateWallpaperLabel();
  }

  function updateWallpaperLabel() {
    if (!els.wallpaperCurrent) {
      return;
    }
    var setting = STATE.wallpaper || { mode: 'random' };
    if (setting.mode === 'random') {
      els.wallpaperCurrent.textContent = 'Aleatório';
      return;
    }
    var entry = findWallpaperEntry(setting.mode, setting.id);
    els.wallpaperCurrent.textContent = entry ? entry.title : '';
  }

  function wallpaperSelectedIndex() {
    var setting = STATE.wallpaper || { mode: 'random' };
    if (setting.mode === 'random') {
      return 0;
    }
    var entries = buildWallpaperEntries();
    for (var i = 0; i < entries.length; i += 1) {
      if (entries[i].kind === setting.mode && entries[i].id === setting.id) {
        return i;
      }
    }
    return 0;
  }

  function selectWallpaper(entry) {
    if (!entry) {
      return;
    }
    if (entry.kind === 'random') {
      STATE.wallpaper = { mode: 'random' };
    } else if (entry.kind === 'image') {
      STATE.wallpaper = { mode: 'image', id: entry.id };
    } else {
      STATE.wallpaper = { mode: 'color', id: entry.id };
    }
    saveWallpaperSetting();
    applyWallpaper();
    App.settings.renderWallpaperList();
    App.settings.refreshSettingsFocus();
    App.ui.toast(entry.kind === 'random' ? 'Wallpaper aleatório ativado' : entry.title + ' aplicado');
  }

  App.wallpaper = {
    findWallpaperEntry: findWallpaperEntry,
    normalizeWallpaperSetting: normalizeWallpaperSetting,
    readWallpaperSetting: readWallpaperSetting,
    saveWallpaperSetting: saveWallpaperSetting,
    buildWallpaperEntries: buildWallpaperEntries,
    applyWallpaper: applyWallpaper,
    updateWallpaperLabel: updateWallpaperLabel,
    wallpaperSelectedIndex: wallpaperSelectedIndex,
    selectWallpaper: selectWallpaper
  };
})(window);
