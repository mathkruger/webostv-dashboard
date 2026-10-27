(function (window) {
  'use strict';

  var App = window.Dashboard || (window.Dashboard = {});
  var store = App.store;
  var STATE = store.STATE;
  var els = store.els;
  var KEY = App.KEY;
  var wallpaperImageEntries = [];
  var wallpaperColorEntries = [];
  var wallpaperImageCards = [];
  var wallpaperColorCards = [];

  function findEntryIndex(entries, kind, id) {
    for (var i = 0; i < entries.length; i += 1) {
      if (entries[i].kind === kind && entries[i].id === id) {
        return i;
      }
    }
    return -1;
  }

  function entriesFor(column) {
    return column === 'colors' ? wallpaperColorEntries : wallpaperImageEntries;
  }

  function appearanceLength(column) {
    return entriesFor(column).length;
  }

  function appearanceIndex(column) {
    return column === 'colors' ? STATE.wallpaperColorIndex : STATE.wallpaperIndex;
  }

  function setAppearanceIndex(column, index) {
    if (column === 'colors') {
      STATE.wallpaperColorIndex = index;
    } else {
      STATE.wallpaperIndex = index;
    }
  }

  function clampAppearanceIndex(column) {
    var index = App.utils.clamp(appearanceIndex(column), 0, Math.max(0, appearanceLength(column) - 1));
    setAppearanceIndex(column, index);
  }

  function selectFromSetting() {
    var setting = STATE.wallpaper || { mode: 'random' };
    if (setting.mode === 'color') {
      var colorIndex = findEntryIndex(wallpaperColorEntries, 'color', setting.id);
      if (colorIndex >= 0) {
        STATE.appearanceColumn = 'colors';
        STATE.wallpaperColorIndex = colorIndex;
        return;
      }
    }
    STATE.appearanceColumn = 'images';
    STATE.wallpaperIndex = setting.mode === 'image'
      ? Math.max(0, findEntryIndex(wallpaperImageEntries, 'image', setting.id))
      : 0;
  }

  function focusContent() {
    STATE.settingsZone = 'appearance';
    selectFromSetting();
  }

  function renderWallpaperList() {
    if (!els.wallpaperImageList || !els.wallpaperColorList) {
      return;
    }
    wallpaperImageEntries = App.wallpaper.buildWallpaperImageEntries();
    wallpaperColorEntries = App.wallpaper.buildWallpaperColorEntries();
    wallpaperImageCards = [];
    wallpaperColorCards = [];
    els.wallpaperImageList.innerHTML = '';
    els.wallpaperColorList.innerHTML = '';

    renderWallpaperColumn(wallpaperImageEntries, wallpaperImageCards, els.wallpaperImageList, 'images');
    renderWallpaperColumn(wallpaperColorEntries, wallpaperColorCards, els.wallpaperColorList, 'colors');

    if (els.wallpaperImageCount) {
      els.wallpaperImageCount.textContent = String(wallpaperImageEntries.length);
    }
    if (els.wallpaperColorCount) {
      els.wallpaperColorCount.textContent = String(wallpaperColorEntries.length);
    }

    clampAppearanceIndex('images');
    clampAppearanceIndex('colors');
    refreshWallpaperFocus();
  }

  function renderWallpaperColumn(entries, cards, container, column) {
    entries.forEach(function (entry, index) {
      var card = document.createElement('div');
      card.className = 'wallpaper-card';
      card.setAttribute('data-wallpaper-col', column);
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
      var selected = entry.kind === 'random'
        ? setting.mode === 'random'
        : entry.kind === setting.mode && entry.id === setting.id;
      if (selected) {
        card.classList.add('selected');
      }

      container.appendChild(card);
      cards.push(card);
    });
  }

  function refreshWallpaperFocus() {
    if (!STATE.settingsOpen) {
      return;
    }
    wallpaperImageCards.forEach(function (card, index) {
      var focused = STATE.settingsTab === 'appearance' && STATE.settingsZone === 'appearance' && STATE.appearanceColumn === 'images' && index === STATE.wallpaperIndex;
      card.classList.toggle('focused', focused);
      if (focused) {
        App.dom.scrollRowIntoView(els.wallpaperImageList, card);
      }
    });
    wallpaperColorCards.forEach(function (card, index) {
      var focused = STATE.settingsTab === 'appearance' && STATE.settingsZone === 'appearance' && STATE.appearanceColumn === 'colors' && index === STATE.wallpaperColorIndex;
      card.classList.toggle('focused', focused);
      if (focused) {
        App.dom.scrollRowIntoView(els.wallpaperColorList, card);
      }
    });
  }

  function items() {
    return wallpaperImageCards.concat(wallpaperColorCards);
  }

  function current() {
    if (STATE.settingsZone !== 'appearance') {
      return null;
    }
    return STATE.appearanceColumn === 'colors'
      ? (wallpaperColorCards[STATE.wallpaperColorIndex] || null)
      : (wallpaperImageCards[STATE.wallpaperIndex] || null);
  }

  function focusElement(element) {
    if (element.getAttribute('data-wallpaper-col') === null) {
      return false;
    }
    var column = element.getAttribute('data-wallpaper-col') === 'colors' ? 'colors' : 'images';
    STATE.settingsZone = 'appearance';
    STATE.appearanceColumn = column;
    setAppearanceIndex(column, Number(element.getAttribute('data-wallpaper-index')));
    return true;
  }

  function onKey(code) {
    var column = STATE.appearanceColumn === 'colors' ? 'colors' : 'images';
    var index = appearanceIndex(column);
    var last = Math.max(0, appearanceLength(column) - 1);

    if (code === KEY.LEFT) {
      if (column === 'colors') {
        STATE.appearanceColumn = 'images';
        clampAppearanceIndex('images');
        App.settings.refreshSettingsFocus();
      } else {
        STATE.settingsZone = 'tabs';
        STATE.tabIndex = 1;
        App.settings.refreshSettingsFocus();
      }
      return true;
    }
    if (code === KEY.RIGHT) {
      if (column === 'images') {
        STATE.appearanceColumn = 'colors';
        clampAppearanceIndex('colors');
        App.settings.refreshSettingsFocus();
      }
      return true;
    }
    if (code === KEY.UP) {
      if (index === 0) {
        STATE.settingsZone = 'tabs';
        STATE.tabIndex = 1;
      } else {
        setAppearanceIndex(column, index - 1);
      }
      App.settings.refreshSettingsFocus();
      return true;
    }
    if (code === KEY.DOWN) {
      if (index < last) {
        setAppearanceIndex(column, index + 1);
        App.settings.refreshSettingsFocus();
      }
      return true;
    }
    return false;
  }

  function onWallpaperHover(event) {
    if (STATE.moving || STATE.settingsTab !== 'appearance' || Date.now() < store.hoverLockUntil || !App.pointer.pointerActive()) {
      return;
    }
    var card = App.dom.closest(event.target, '[data-wallpaper-col]');
    if (!card) {
      return;
    }
    var column = card.getAttribute('data-wallpaper-col') === 'colors' ? 'colors' : 'images';
    var index = Number(card.getAttribute('data-wallpaper-index'));
    if (STATE.settingsZone !== 'appearance' || STATE.appearanceColumn !== column || appearanceIndex(column) !== index) {
      STATE.settingsZone = 'appearance';
      STATE.appearanceColumn = column;
      setAppearanceIndex(column, index);
      App.settings.refreshSettingsFocus();
    }
  }

  function onWallpaperClick(event) {
    if (STATE.moving || STATE.settingsTab !== 'appearance') {
      return;
    }
    var card = App.dom.closest(event.target, '[data-wallpaper-col]');
    if (!card) {
      return;
    }
    var column = card.getAttribute('data-wallpaper-col') === 'colors' ? 'colors' : 'images';
    var index = Number(card.getAttribute('data-wallpaper-index'));
    STATE.settingsZone = 'appearance';
    STATE.appearanceColumn = column;
    setAppearanceIndex(column, index);
    App.wallpaper.selectWallpaper(entriesFor(column)[index]);
  }

  App.settingsAppearance = {
    focusContent: focusContent,
    selectFromSetting: selectFromSetting,
    renderWallpaperList: renderWallpaperList,
    refreshWallpaperFocus: refreshWallpaperFocus,
    items: items,
    current: current,
    focusElement: focusElement,
    onKey: onKey,
    onWallpaperHover: onWallpaperHover,
    onWallpaperClick: onWallpaperClick
  };
})(window);
