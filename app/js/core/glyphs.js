(function (window) {
  'use strict';

  var App = window.Dashboard || (window.Dashboard = {});
  var store = App.store;
  var STATE = store.STATE;
  var els = store.els;
  var CONFIG = App.config;

  function inputGlyph(kind, number) {
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '1.6');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.setAttribute('class', 'input-glyph');
    var content = '';
    if (kind === 'hdmi') {
      content = '<path d="M4 7.2h16v6.6l-2.8 3.4H6.8L4 13.8z"/><path d="M8 11h8"/>' + (number ? '<text x="12" y="10.6" text-anchor="middle" font-size="5" fill="currentColor" stroke="none" font-family="Arial, sans-serif">' + number + '</text>' : '');
    } else if (kind === 'tv') {
      content = '<rect x="3.5" y="7" width="17" height="11" rx="2"/><path d="M8 4l4 3 4-3"/><path d="M9 21h6"/>';
    } else if (kind === 'av') {
      content = '<rect x="3.5" y="6.5" width="17" height="11" rx="2"/><circle cx="8" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="16" cy="12" r="1.2"/>';
    } else if (kind === 'component') {
      content = '<rect x="3.5" y="6.5" width="17" height="11" rx="2"/><circle cx="7.5" cy="10.5" r="1"/><circle cx="12" cy="10.5" r="1"/><circle cx="16.5" cy="10.5" r="1"/><circle cx="7.5" cy="14.5" r="1"/><circle cx="12" cy="14.5" r="1"/><circle cx="16.5" cy="14.5" r="1"/>';
    } else {
      content = '<path d="M4 12h12"/><path d="M12 8l4 4-4 4"/><rect x="18" y="5" width="2" height="14" rx="1"/>';
    }
    svg.innerHTML = content;
    return svg;
  }

  function systemGlyph(action) {
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '1.6');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.setAttribute('class', 'input-glyph');
    if (action === 'autostart') {
      svg.innerHTML = '<path d="M12 3v9"/><path d="M7.2 6.3a8 8 0 1 0 9.6 0"/>';
    } else if (action === 'return') {
      svg.innerHTML = '<path d="M14 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><path d="M9 17l-5-5 5-5"/><path d="M4 12h11"/>';
    } else {
      svg.innerHTML = '<path d="M20 11a8 8 0 1 0-2.3 6.7"/><path d="M20 5v6h-6"/>';
    }
    return svg;
  }

  App.glyphs = {
    inputGlyph: inputGlyph,
    systemGlyph: systemGlyph
  };
})(window);
