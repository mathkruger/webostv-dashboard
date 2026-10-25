(function (window) {
  'use strict';

  var App = window.Dashboard || (window.Dashboard = {});
  var store = App.store;
  var STATE = store.STATE;
  var els = store.els;
  var CONFIG = App.config;

  function startClock() {
    updateClock();
    setInterval(updateClock, 15000);
  }

  function updateClock() {
    var now = new Date();
    var hours = now.getHours();
    var minutes = now.getMinutes();
    var weekdays = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
    var months = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
    els.time.textContent = App.utils.pad(hours) + ':' + App.utils.pad(minutes);
    els.date.textContent = weekdays[now.getDay()] + ', ' + now.getDate() + ' de ' + months[now.getMonth()];
  }

  App.clock = {
    startClock: startClock,
    updateClock: updateClock
  };
})(window);
