/* ==========================================================================
   CausQ Marketing — /marketing
   Boot counter, scroll-driven oscilloscope mark, reveals, FAQ.
   Standalone: does not depend on main.js.
   ========================================================================== */

(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ------------------------------------------------------------------ */
  /* Analytics (GA4). Skipped on file:// so local previews stay clean.   */
  /* ------------------------------------------------------------------ */
  function initAnalytics() {
    if (location.protocol === 'file:') return;
    var ID = 'G-9E2P7FB4HZ';
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + ID;
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', ID);
  }

  /* ------------------------------------------------------------------ */
  /* Boot sequence: mono BUILD counter, then hand off to the page.       */
  /* Never blocks: hard timeout releases the page regardless of state.   */
  /* ------------------------------------------------------------------ */
  function initBoot() {
    var boot = document.querySelector('.mk-boot');
    if (!boot) return;

    var pctEl = boot.querySelector('.mk-boot-pct');
    var barEl = boot.querySelector('.mk-boot-bar span');
    var done = false;

    function release() {
      if (done) return;
      done = true;
      boot.classList.add('is-done');
      document.body.classList.remove('is-loading');
      window.setTimeout(function () {
        if (boot.parentNode) boot.parentNode.removeChild(boot);
      }, 800);
    }

    if (reduce) { release(); return; }

    // Kept deliberately short: this is a lead capture page, and every
    // extra second in front of the headline costs enquiries.
    var pct = 0;
    var timer = window.setInterval(function () {
      pct = Math.min(100, pct + Math.random() * 16 + 11);
      var v = Math.round(pct);
      if (pctEl) pctEl.textContent = v < 10 ? '00' + v : v < 100 ? '0' + v : '100';
      if (barEl) barEl.style.right = (100 - pct) + '%';
      if (pct >= 100) {
        window.clearInterval(timer);
        window.setTimeout(release, 160);
      }
    }, 60);

    // Safety net: never trap the visitor behind the loader.
    window.setTimeout(function () { window.clearInterval(timer); release(); }, 1400);
  }

  /* ------------------------------------------------------------------ */
  /* Signature: oscilloscope Q.                                          */
  /* Waveform amplitude and frequency track scroll depth, so the mark    */
  /* literally reads the page. Ring + tail form the Q.                   */
  /* ------------------------------------------------------------------ */
  function initScope() {
    var wave = document.getElementById('mk-wave');
    var sweep = document.getElementById('mk-sweep');
    if (!wave) return;

    var CX = 200, CY = 200;
    var SPAN = 250;          // horizontal extent of the trace inside the ring
    var STEPS = 40;          // enough to read as a smooth trace, cheap to rebuild
    var progress = 0;        // 0..1 scroll depth
    var eased = 0;
    var t = 0;
    var last = 0;
    var FRAME = 1000 / 30;   // ambient motion, 30fps is plenty

    function points(amp, freq, phase) {
      var out = [];
      for (var i = 0; i <= STEPS; i++) {
        var u = i / STEPS;
        var x = CX - SPAN / 2 + u * SPAN;
        // Taper the ends so the trace fades into the ring instead of clipping.
        var taper = Math.sin(u * Math.PI);
        var y = CY
          + Math.sin(u * freq * Math.PI * 2 + phase) * amp * taper
          + Math.sin(u * freq * Math.PI * 5.3 + phase * 1.7) * amp * 0.22 * taper;
        out.push(x.toFixed(1) + ',' + y.toFixed(1));
      }
      return out.join(' ');
    }

    function readProgress() {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      progress = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    }

    function frame(now) {
      window.requestAnimationFrame(frame);
      if (now - last < FRAME) return;
      last = now;

      eased += (progress - eased) * 0.14;
      t += 0.033;
      // Flat line at the top of the page, resolving into a strong signal as
      // the visitor moves down: the page's own argument, drawn.
      var amp = 3 + eased * 52;
      var freq = 1.1 + eased * 2.6;
      wave.setAttribute('points', points(amp, freq, t * 1.5));
      if (sweep) {
        sweep.setAttribute('points', points(amp * 0.42, freq * 0.6, -t * 0.9 + 1.2));
      }
    }

    readProgress();
    window.addEventListener('scroll', readProgress, { passive: true });
    window.addEventListener('resize', readProgress);

    if (reduce) {
      wave.setAttribute('points', points(26, 2.2, 0));
      if (sweep) sweep.setAttribute('points', points(11, 1.3, 1.2));
      return;
    }
    window.requestAnimationFrame(frame);
  }

  /* ------------------------------------------------------------------ */
  /* Readout under the mark: current section + scroll depth.             */
  /* ------------------------------------------------------------------ */
  function initReadout() {
    var label = document.getElementById('mk-read-label');
    var pct = document.getElementById('mk-read-pct');
    if (!label && !pct) return;

    var secs = Array.prototype.slice.call(document.querySelectorAll('[data-scope]'));

    function tick() {
      if (pct) {
        var max = document.documentElement.scrollHeight - window.innerHeight;
        var p = max > 0 ? Math.round((window.scrollY / max) * 100) : 0;
        pct.textContent = (p < 10 ? '0' : '') + p + '%';
      }
      if (label && secs.length) {
        var mid = window.innerHeight * 0.5;
        var current = secs[0];
        for (var i = 0; i < secs.length; i++) {
          if (secs[i].getBoundingClientRect().top <= mid) current = secs[i];
        }
        var next = current.getAttribute('data-scope');
        if (label.textContent !== next) label.textContent = next;
      }
    }

    tick();
    window.addEventListener('scroll', tick, { passive: true });
    window.addEventListener('resize', tick);
  }

  /* ------------------------------------------------------------------ */
  /* Reveal on scroll                                                    */
  /* ------------------------------------------------------------------ */
  /* A scroll sweep rather than an IntersectionObserver. An observer only
     reports a *change* in intersection, so an element that goes from below
     the viewport to above it never leaves ratio 0 and never fires. Anyone
     who presses End, drags the scrollbar or follows a deep link would leave
     whole sections stuck at opacity 0. A sweep cannot miss. */
  function initReveal() {
    var items = document.querySelectorAll('.mk-rise');
    if (!items.length) return;

    if (reduce) {
      Array.prototype.forEach.call(items, function (el) { el.classList.add('is-in'); });
      return;
    }

    var queue = Array.prototype.slice.call(items);
    var ticking = false;

    function sweep() {
      ticking = false;
      var limit = window.innerHeight * 0.92;

      for (var i = queue.length - 1; i >= 0; i--) {
        var el = queue[i];
        if (el.getBoundingClientRect().top >= limit) continue;

        var delay = parseFloat(el.getAttribute('data-delay') || '0');
        (function (node, d) {
          window.setTimeout(function () { node.classList.add('is-in'); }, d * 1000);
        })(el, delay);
        queue.splice(i, 1);
      }

      if (!queue.length) {
        window.removeEventListener('scroll', request);
        window.removeEventListener('resize', request);
      }
    }

    function request() {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(sweep);
    }

    sweep();
    window.addEventListener('scroll', request, { passive: true });
    window.addEventListener('resize', request);
    return;
  }

  /* ------------------------------------------------------------------ */
  /* FAQ: one open at a time                                             */
  /* ------------------------------------------------------------------ */
  function initFaq() {
    var items = document.querySelectorAll('.mk-faq-item');
    if (!items.length) return;

    Array.prototype.forEach.call(items, function (item) {
      var btn = item.querySelector('.mk-faq-q');
      var panel = item.querySelector('.mk-faq-a');
      if (!btn || !panel) return;

      btn.addEventListener('click', function () {
        var isOpen = item.classList.contains('is-open');

        Array.prototype.forEach.call(items, function (other) {
          other.classList.remove('is-open');
          var op = other.querySelector('.mk-faq-a');
          var ob = other.querySelector('.mk-faq-q');
          if (op) op.style.maxHeight = null;
          if (ob) ob.setAttribute('aria-expanded', 'false');
        });

        if (!isOpen) {
          item.classList.add('is-open');
          panel.style.maxHeight = panel.scrollHeight + 'px';
          btn.setAttribute('aria-expanded', 'true');
        }
      });
    });
  }

  /* ------------------------------------------------------------------ */
  function boot() {
    initAnalytics();
    initBoot();
    initScope();
    initReadout();
    initReveal();
    initFaq();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
