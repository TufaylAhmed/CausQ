/* ============================================================================
   CausQ Digital - /digital motion engine
   Scoped to digital/index.html only. Original implementation:
   1. Ink preloader: CausQ wordmark sweep + stepped % counter, curtain lift.
      Starts immediately, hard-fails open after 4.5s or on any script error.
   2. WebGL iridescent orb in the hero (own shader; CSS gradient fallback)
   3. Headline line-splitting with masked rise reveals
   4. Inertial smooth scrolling (desktop fine-pointer, wheel-driven lerp)
   5. Cursor dot that trails the pointer and grows over interactive elements
   6. Reveal / image-clip / counter triggers on IntersectionObserver
   Everything degrades to static under prefers-reduced-motion or no JS.
============================================================================ */
(function () {
  'use strict';

  var rm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var easeOut = function (t) { return 1 - Math.pow(1 - t, 3); };

  /* ------------------------------------------------ preloader */
  function runLoader(done) {
    var loader = document.getElementById('dg-loader');
    var finished = false;
    function finish() {
      if (finished) return;
      finished = true;
      document.body.classList.remove('dg-locked');
      if (loader) {
        loader.classList.add('done');
        loader.addEventListener('transitionend', function () { loader.remove(); }, { once: true });
        setTimeout(function () { if (loader.parentNode) loader.remove(); }, 1400);
      }
      done();
    }
    if (!loader || rm) { if (loader) loader.remove(); document.body.classList.remove('dg-locked'); done(); return; }

    setTimeout(finish, 4500);                       // never trap the page
    window.addEventListener('error', finish);       // fail open on any script error

    var num = loader.querySelector('.dg-load-num');
    var quick = false;
    try { quick = sessionStorage.getItem('dgSeen') === '1'; sessionStorage.setItem('dgSeen', '1'); } catch (e) {}
    loader.classList.add('tick');

    var p = 0;
    function step() {
      if (finished) return;
      p = Math.min(p + 5, 100);
      if (num) num.textContent = p + '%';
      if (p < 100) {
        var delay = p < 20 ? 85 : p > 85 ? 95 : 38;   // beat in, sprint, beat out
        setTimeout(step, quick ? 12 : delay);
      } else {
        setTimeout(finish, quick ? 70 : 240);
      }
    }
    setTimeout(step, quick ? 40 : 120);
  }

  /* ------------------------------------------------ WebGL orb */
  function initOrb() {
    var host = document.querySelector('.dg-sphere');
    if (!host) return;
    var canvas = document.createElement('canvas');
    var gl = canvas.getContext('webgl', { alpha: true, antialias: true, premultipliedAlpha: true });
    if (!gl) return;                                  // CSS gradient stays as fallback
    host.appendChild(canvas);

    var vsrc = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
    var fsrc =
      'precision mediump float;' +
      'uniform float uT;uniform vec2 uR;' +
      'vec3 Y=vec3(.980,.796,.055),P=vec3(.941,.420,.659),B=vec3(.471,.729,.902),W=vec3(1.);' +
      'vec3 ramp(float x){x=clamp(x,0.,1.);' +
      ' if(x<.35)return mix(Y,P,x/.35);' +
      ' if(x<.70)return mix(P,B,(x-.35)/.35);' +
      ' return mix(B,W,(x-.70)/.30);}' +
      'void main(){' +
      ' vec2 uv=(gl_FragCoord.xy/uR)*2.-1.;' +
      ' float r=length(uv);' +
      ' float edge=1.-smoothstep(.90,.995,r);' +
      ' if(edge<=0.){discard;}' +
      ' float t=uT*.14;' +
      ' float n=.47-.34*(uv.x*.55+uv.y*.62);' +          // yellow top-right, blue low-left
      ' n+=.17*sin(uv.x*1.9-uv.y*1.3+t*1.6);' +
      ' n+=.13*sin(uv.y*2.7+t*1.05);' +
      ' n+=.09*sin((uv.x+uv.y)*3.3-t*.72);' +
      ' vec3 col=ramp(n);' +
      ' col=mix(col,W,smoothstep(.45,.98,r)*.38);' +      // dissolve to white at the rim
      ' col+=.05*smoothstep(.6,.0,length(uv-vec2(.45,.5)));' + // soft top-right bloom
      ' gl_FragColor=vec4(col*edge,edge);}';

    function compile(type, src) {
      var s = gl.createShader(type);
      gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) return null;
      return s;
    }
    var vs = compile(gl.VERTEX_SHADER, vsrc), fs = compile(gl.FRAGMENT_SHADER, fsrc);
    if (!vs || !fs) { canvas.remove(); host.classList.remove('has-gl'); return; }
    var prog = gl.createProgram();
    gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { canvas.remove(); host.classList.remove('has-gl'); return; }
    gl.useProgram(prog);

    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    var uT = gl.getUniformLocation(prog, 'uT');
    var uR = gl.getUniformLocation(prog, 'uR');
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 0);

    function resize() {
      var d = Math.min(window.devicePixelRatio || 1, 1.5);
      var s = host.clientWidth;
      canvas.width = Math.round(s * d); canvas.height = Math.round(s * d);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uR, canvas.width, canvas.height);
    }
    resize();
    if ('ResizeObserver' in window) new ResizeObserver(resize).observe(host);

    var t0 = performance.now(), raf = 0, running = false;
    function draw(t) {
      gl.uniform1f(uT, t);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    // first frame immediately, then hand the circle over from CSS to WebGL
    draw(7);
    host.classList.add('has-gl');
    function frame(now) {
      raf = requestAnimationFrame(frame);
      draw(7 + (now - t0) / 1000);
    }
    function start() { if (!running && !rm) { running = true; raf = requestAnimationFrame(frame); } }
    function stop() { if (running) { running = false; cancelAnimationFrame(raf); } }

    if (rm) return;                                  // keep the still frame
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) { en[0].isIntersecting ? start() : stop(); },
        { threshold: 0 }).observe(host);
    } else start();
    document.addEventListener('visibilitychange', function () {
      document.hidden ? stop() : start();
    });
  }

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
    el.setAttribute('aria-label', text);
    lines.forEach(function (line, i) {
      var w = document.createElement('span'); w.className = 'dg-line-w';
      w.setAttribute('aria-hidden', 'true');
      var inner = document.createElement('span'); inner.className = 'dg-line';
      inner.style.setProperty('--l', i);
      inner.textContent = line.map(function (s) { return s.textContent; }).join(' ');
      w.appendChild(inner); el.appendChild(w);
    });
  }

  var splitDone = false;
  function initSplits() {
    if (rm || splitDone) return;
    splitDone = true;
    document.querySelectorAll('[data-split]').forEach(splitLines);
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
    }, { threshold: 0.12, rootMargin: '0px 0px -30px 0px' });
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
      if (e.ctrlKey) return;
      e.preventDefault();
      if (!animating) target = window.scrollY;
      target = Math.max(0, Math.min(max(), target + e.deltaY));
      if (!animating) { animating = true; requestAnimationFrame(loop); }
    }, { passive: false });
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

  /* ------------------------------------------------ boot: loader first, never blocked */
  runLoader(function () { document.body.classList.add('dg-ready'); });
  initOrb();
  initReveals();
  initCounters();
  initSmoothScroll();
  initCursor();
  initFaq();
  var y = document.getElementById('dg-year');
  if (y) y.textContent = new Date().getFullYear();

  // split once the display font is ready so line breaks measure true;
  // fall back after 1.2s so slow font loads never hold the page hostage
  if (document.fonts && document.fonts.ready && !rm) {
    document.fonts.ready.then(initSplits);
    setTimeout(initSplits, 1200);
  }
})();
