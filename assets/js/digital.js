/* ============================================================================
   CausQ Digital - /digital landing page behaviors
   Scoped to digital/index.html only. No dependency on main.js.
   1. Reveal-on-scroll (IntersectionObserver, stagger via --i)
   2. Count-up numbers ([data-count] elements, eased, reduced-motion aware)
   3. Donut center percentage counter (fills alongside the CSS conic sweep)
   4. FAQ accordion (one open at a time)
   Gallery column parallax is pure CSS (animation-timeline: view()).
============================================================================ */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var easeOut = function (t) { return 1 - Math.pow(1 - t, 3); };

  /* ------------------------------------------------ reveal on scroll */
  (function () {
    var els = document.querySelectorAll('.dg-rv');
    if (!('IntersectionObserver' in window) || reduceMotion) {
      els.forEach(function (el) { el.classList.add('in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
    els.forEach(function (el) { io.observe(el); });
  })();

  /* ------------------------------------------------ count-up numbers */
  function countUp(el, target, suffix, duration) {
    if (reduceMotion) { el.textContent = target + suffix; return; }
    var start = null;
    function tick(ts) {
      if (start === null) start = ts;
      var p = Math.min((ts - start) / duration, 1);
      el.textContent = Math.round(easeOut(p) * target) + suffix;
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  (function () {
    var els = document.querySelectorAll('[data-count]');
    if (!els.length) return;
    var fire = function (el) {
      countUp(el, parseInt(el.getAttribute('data-count'), 10),
        el.getAttribute('data-suffix') || '', 1100);
    };
    if (!('IntersectionObserver' in window)) { els.forEach(fire); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { fire(e.target); io.unobserve(e.target); }
      });
    }, { threshold: 0.4 });
    els.forEach(function (el) { io.observe(el); });
  })();

  /* ------------------------------------------------ FAQ accordion */
  (function () {
    var items = Array.prototype.slice.call(document.querySelectorAll('.dg-faq-item'));
    items.forEach(function (item) {
      var btn = item.querySelector('.dg-faq-q');
      if (!btn) return;
      btn.addEventListener('click', function () {
        var isOpen = item.classList.contains('open');
        items.forEach(function (other) {
          other.classList.remove('open');
          var b = other.querySelector('.dg-faq-q');
          if (b) b.setAttribute('aria-expanded', 'false');
        });
        if (!isOpen) {
          item.classList.add('open');
          btn.setAttribute('aria-expanded', 'true');
        }
      });
    });
  })();

  /* ------------------------------------------------ footer year */
  var y = document.getElementById('dg-year');
  if (y) y.textContent = new Date().getFullYear();
})();
