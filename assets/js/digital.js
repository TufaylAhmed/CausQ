/* ============================================================================
   CausQ Digital - /digital motion engine
   Scoped to digital/index.html only. Original implementation of the page's
   motion system:
   1. Ink preloader: CausQ wordmark sweep + stepped % counter, curtain lift
   2. Headline line-splitting with masked rise reveals
   3. Inertial smooth scrolling (desktop fine-pointer, wheel-driven lerp)
   4. Cursor dot that trails the pointer and grows over interactive elements
   5. Reveal / image-clip / counter triggers on IntersectionObserver
   Everything degrades to static under prefers-reduced-motion.
============================================================================ */
(function () {
  'use strict';

  var rm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var easeOut = function (t) { return 1 - Math.pow(1 - t, 3); };

  /* ------------------------------------------------ line splitter */
  function splitLines(el) {
    var text = el.textContent.trim();
    var words = text.split(/\s+/);
    el.textContent = '';
    var probes = words.map(function (w) {
      var s = document.createElement('span');
      s.style.display = 'inline-block';
      s.textContent = w;
      el.appendChild(s);
      el.appendChild(document.createTextNode(' '));
      return s;
    });
    var lines = [], current = [], top = null;
    probes.forEach(function (s) {
      if (top === null || Math.abs(s.offsetTop - top) > 2) {
        if (current.length) lines.push(current);
        current = [s]; top = s.offsetTop;
      } else current.push(s);
    });
    if (current.length) lines.push(current);
    el.textContent = '';
    el.setAttribute('aria-label', text);  // lines are visual only
    lines.forEach(function (line, i) {
      var w = document.createElement('span'); w.className = 'dg-line-w';
      w.setAttribute('aria-hidden', 'true');
      var inner = document.createElement('span'); inner.className = 'dg-line';
      inner.style.setProperty('--l', i);
      inner.textContent = line.map(function (s) { return s.textContent; }).join(' ');
      w.appendChild(inner); el.appendChild(w);
    });
  }

  function initSplits() {
    if (rm) return;
    document.querySelectorAll('[data-split]').forEach(splitLines);
  }

  /* ------------------------------------------------ preloader */
  function runLoader(done) {
    var loader = document.getElementById('dg-loader');
    if (!loader || rm) {
      if (loader) loader.remove();
      document.body.classList.remove('dg-locked');
      done();
      return;
    }
    var num = loader.querySelector('.dg-load-num');
    var quick = false;
    try { quick = sessionStorage.getItem('dgSeen') === '1'; sessionStorage.setItem('dgSeen', '1'); } catch (e) {}
    loader.classList.add('tick');

    var p = 0;
    function step() {
      p = Math.min(p + 5, 100);
      if (num) num.textContent = p + '%';
      if (p < 100) {
        // fast ramp with a beat at the start and end, stepped in fives
        var delay = p < 20 ? 90 : p > 85 ? 100 : 40;
        setTimeout(step, quick ? 12 : delay);
      } else {
        setTimeout(function () {
          loader.classList.add('done');
          document.body.classList.remove('dg-locked');
          done();
          loader.addEventListener('transitionend', function () { loader.remove(); }, { once: true });
        }, quick ? 80 : 260);
      }
    }
    setTimeout(step, quick ? 50 : 350);
  }

  /* ------------------------------------------------ reveal observers */
  function initReveals() {
    var targets = document.querySelectorAll('.dg-rv, .dg-sec-head, .dg-foot-cta, .dg-gridpaper');
    if (!('IntersectionObserver' in window) || rm) {
      targets.forEach(function (el) { el.classList.add('in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
    targets.forEach(function (el) { io.observe(el); });
  }

  /* ------------------------------------------------ count-up numbers */
  function countUp(el, target, suffix, duration) {
    if (rm) { el.textContent = target + suffix; return; }
    var start = null;
    function tick(ts) {
      if (start === null) start = ts;
      var p = Math.min((ts - start) / duration, 1);
      el.textContent = Math.round(easeOut(p) * target) + suffix;
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  function initCounters() {
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
  }

  /* ------------------------------------------------ inertial smooth scroll */
  function initSmoothScroll() {
    if (rm || !finePointer) return;
    var target = 0, animating = false;
    function max() { return document.documentElement.scrollHeight - window.innerHeight; }
    function loop() {
      var current = window.scrollY;
      var next = current + (target - current) * 0.11;
      if (Math.abs(target - next) < 0.5) {
        window.scrollTo(0, target);
        animating = false;
        return;
      }
      window.scrollTo(0, next);
      requestAnimationFrame(loop);
    }
    window.addEventListener('wheel', function (e) {
      if (e.ctrlKey) return;               // pinch-zoom stays native
      e.preventDefault();
      if (!animating) target = window.scrollY;
      target = Math.max(0, Math.min(max(), target + e.deltaY));
      if (!animating) { animating = true; requestAnimationFrame(loop); }
    }, { passive: false });
    // anchor jumps and keyboard scrolling stay native; resync on those scrolls
    window.addEventListener('scroll', function () {
      if (!animating) target = window.scrollY;
    }, { passive: true });
  }

  /* ------------------------------------------------ cursor dot */
  function initCursor() {
    if (rm || !finePointer) return;
    var dot = document.createElement('div');
    dot.className = 'dg-cursor';
    document.body.appendChild(dot);
    var x = 0, y = 0, cx = 0, cy = 0, shown = false;
    document.addEventListener('mousemove', function (e) {
      x = e.clientX; y = e.clientY;
      if (!shown) { shown = true; cx = x; cy = y; dot.classList.add('on'); tick(); }
    });
    function tick() {
      cx += (x - cx) * 0.18; cy += (y - cy) * 0.18;
      dot.style.transform = 'translate(' + cx + 'px,' + cy + 'px) translate(-50%,-50%)';
      requestAnimationFrame(tick);
    }
    document.addEventListener('mouseover', function (e) {
      dot.classList.toggle('lk', !!(e.target.closest && e.target.closest('a, button')));
    });
    document.addEventListener('mouseleave', function () { dot.classList.remove('on'); shown = false; });
    document.addEventListener('mouseenter', function () { dot.classList.add('on'); shown = true; });
  }

  /* ------------------------------------------------ FAQ accordion */
  function initFaq() {
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
  }

  /* ------------------------------------------------ boot */
  function boot() {
    initSplits();
    runLoader(function () {
      document.body.classList.add('dg-ready');
      initReveals();
      initCounters();
    });
    initSmoothScroll();
    initCursor();
    initFaq();
    var y = document.getElementById('dg-year');
    if (y) y.textContent = new Date().getFullYear();
  }

  // Split lines only after the display font is in, so line breaks measure true.
  // fonts.ready can stall behind slow networks; a 1.5s fallback boots anyway.
  var booted = false;
  function bootOnce() { if (!booted) { booted = true; boot(); } }
  if (document.fonts && document.fonts.ready && !rm) {
    document.fonts.ready.then(bootOnce);
    setTimeout(bootOnce, 1500);
  } else {
    bootOnce();
  }
})();
