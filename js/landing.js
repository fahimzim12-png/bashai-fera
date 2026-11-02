/* Bashai Fera — landing page behaviour (no dependencies) */
(function () {
  'use strict';

  // ---- Start button -----------------------------------------------------------------------------
  // GAME_READY = true  -> "খেলা শুরু করি / Start Journey" opens the game at game/
  // GAME_READY = false -> back to the old behaviour: just show the "coming soon" message.
  var GAME_READY = true;
  var GAME_URL = 'game/';          // relative on purpose: works under the GitHub Pages /bashai-fera/ path

  // Footer year
  var year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  // Sticky nav: add a border/shadow after scrolling a little
  var nav = document.getElementById('nav');
  function onScroll() {
    if (nav) nav.classList.toggle('is-scrolled', window.scrollY > 8);
  }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  // Scroll-reveal for elements with .reveal
  var items = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
    items.forEach(function (el) { io.observe(el); });
  } else {
    items.forEach(function (el) { el.classList.add('is-visible'); });
  }

  // Start buttons
  var toast = document.getElementById('toast');
  var timer = null;
  function showToast() {
    if (!toast) return;
    toast.classList.add('show');
    clearTimeout(timer);
    timer = setTimeout(function () { toast.classList.remove('show'); }, 3200);
  }
  document.querySelectorAll('[data-start]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      if (GAME_READY) window.location.href = GAME_URL;
      else showToast();
    });
  });
})();
