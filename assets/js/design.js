/* ============================================================================
   CausQ Studio - /design landing page behaviors
   Scoped to design/index.html only. No dependency on main.js.
   1. Reveal-on-scroll (IntersectionObserver, stagger via --i)
   2. FAQ accordion (one open at a time)
   3. Dotted surface hero (vanilla port of the shadcn DottedSurface component,
      three.js UMD from CDN). Pauses offscreen + when the tab is hidden,
      renders a single static frame under prefers-reduced-motion.
============================================================================ */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ------------------------------------------------ reveal on scroll */
  (function () {
    var els = document.querySelectorAll('.dz-rv');
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

  /* ------------------------------------------------ FAQ accordion */
  (function () {
    var items = Array.prototype.slice.call(document.querySelectorAll('.dz-faq-item'));
    items.forEach(function (item) {
      var btn = item.querySelector('.dz-faq-q');
      if (!btn) return;
      btn.addEventListener('click', function () {
        var isOpen = item.classList.contains('open');
        items.forEach(function (other) {
          other.classList.remove('open');
          var b = other.querySelector('.dz-faq-q');
          if (b) b.setAttribute('aria-expanded', 'false');
        });
        if (!isOpen) {
          item.classList.add('open');
          btn.setAttribute('aria-expanded', 'true');
        }
      });
    });
  })();

  /* ------------------------------------------------ dotted surface hero */
  (function () {
    var container = document.getElementById('dz-canvas');
    if (!container || typeof THREE === 'undefined') return;

    var SEPARATION = 150, AMOUNTX = 40, AMOUNTY = 60;

    var scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x0b0b0d, 2000, 10000);

    var camera = new THREE.PerspectiveCamera(
      60, container.clientWidth / container.clientHeight, 1, 10000
    );
    camera.position.set(0, 355, 1220);

    var renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setClearColor(0x0b0b0d, 0);
    container.appendChild(renderer.domElement);

    var positions = [], colors = [];
    var teal = new THREE.Color(0x06b6d4), slate = new THREE.Color(0x8b98a5);
    for (var ix = 0; ix < AMOUNTX; ix++) {
      for (var iy = 0; iy < AMOUNTY; iy++) {
        positions.push(
          ix * SEPARATION - (AMOUNTX * SEPARATION) / 2,
          0,
          iy * SEPARATION - (AMOUNTY * SEPARATION) / 2
        );
        // depth-graded color: teal near camera fading to slate far away
        var c = teal.clone().lerp(slate, iy / AMOUNTY);
        colors.push(c.r, c.g, c.b);
      }
    }

    var geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    var material = new THREE.PointsMaterial({
      size: 7, vertexColors: true, transparent: true,
      opacity: 0.65, sizeAttenuation: true
    });
    scene.add(new THREE.Points(geometry, material));

    var count = 0, rafId = 0, running = false;

    function renderWave() {
      var attr = geometry.attributes.position, arr = attr.array, i = 0;
      for (var x = 0; x < AMOUNTX; x++) {
        for (var y = 0; y < AMOUNTY; y++) {
          arr[i * 3 + 1] =
            Math.sin((x + count) * 0.3) * 50 +
            Math.sin((y + count) * 0.5) * 50;
          i++;
        }
      }
      attr.needsUpdate = true;
      renderer.render(scene, camera);
      count += 0.08;
    }

    function loop() { rafId = requestAnimationFrame(loop); renderWave(); }
    function start() { if (!running && !reduceMotion) { running = true; loop(); } }
    function stop() { if (running) { running = false; cancelAnimationFrame(rafId); } }

    function resize() {
      var w = container.clientWidth, h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      if (reduceMotion) renderWave();
    }
    if ('ResizeObserver' in window) {
      new ResizeObserver(resize).observe(container);
    } else {
      window.addEventListener('resize', resize);
    }

    if (reduceMotion) {
      renderWave(); // one static frame, no loop
    } else {
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (entries) {
          entries[0].isIntersecting ? start() : stop();
        }, { threshold: 0 }).observe(container);
      } else {
        start();
      }
      document.addEventListener('visibilitychange', function () {
        document.hidden ? stop() : start();
      });
    }
  })();

  /* ------------------------------------------------ footer year */
  var y = document.getElementById('dz-year');
  if (y) y.textContent = new Date().getFullYear();
})();
