/* ============================================================================
   CausQ — Shared frontend behaviour
   Injects nav + footer, scroll reveals, count-ups, partner logos,
   and wires forms to the Rust API (graceful offline fallback).
============================================================================ */

const API_BASE = (location.protocol === 'file:') ? '' : ''; // same-origin when served by the Rust app

/* ----------------------------------------------------------------- NAV/FOOTER
   Shared markup is injected so every page stays in sync from one source.    */
const NAV_LINKS = [
  ['what-we-do.html',    'What we do'],
  ['what-we-think.html', 'What we think'],
  ['who-we-are.html',    'Who we are'],
  ['careers.html',       'Careers'],
];

function currentPage(){
  const p = location.pathname.split('/').pop();
  return p === '' ? 'index.html' : p;
}

function renderNav(){
  const here = currentPage();
  const links = NAV_LINKS.map(([href, label]) =>
    `<a href="${href}" class="${here === href ? 'active' : ''}">${label}</a>`).join('');
  return `
  <nav class="nav" id="nav">
    <div class="nav-inner">
      <a href="index.html" class="brand" aria-label="CausQ home"><span class="logo-lockup"><img class="logo-img" src="assets/img/causq-word-ink.png" alt="CausQ"><span class="rad"></span></span></a>
      <div class="nav-links" id="navLinks">
        ${links}
        <a href="contact.html" class="btn btn-dark">Let's talk <span class="arr">&rarr;</span></a>
      </div>
      <button class="menu-btn" id="menuBtn" aria-label="Menu"><span></span><span></span><span></span></button>
    </div>
  </nav>`;
}

function renderFooter(){
  const y = new Date().getFullYear();
  return `
  <footer class="footer">
    <div class="wrap">
      <div class="foot-top">
        <div>
          <img src="assets/img/causq-word-white.png" alt="CausQ" class="foot-logo" />
          <p class="blurb">Engineering AI, modern networks and quantum-era security for enterprises that
            can't afford for the infrastructure to blink. United States &amp; EMEA.</p>
        </div>
        <div class="foot-col">
          <h4>What we do</h4>
          <a href="what-we-do.html#ai">AI &amp; Intelligent Operations</a>
          <a href="what-we-do.html#network">Network Modernization</a>
          <a href="what-we-do.html#quantum">Quantum-era Security</a>
          <a href="what-we-do.html#cloud">Cloud &amp; Edge</a>
        </div>
        <div class="foot-col">
          <h4>Company</h4>
          <a href="who-we-are.html">Who we are</a>
          <a href="what-we-think.html">What we think</a>
          <a href="careers.html">Careers</a>
          <a href="contact.html">Contact</a>
        </div>
        <div class="foot-col">
          <h4>Reach us</h4>
          <a href="mailto:hello@causq.com">hello@causq.com</a>
          <a href="#">United States</a>
          <a href="#">EMEA</a>
          <a href="contact.html">Book a briefing</a>
        </div>
      </div>
      <div class="foot-bottom">
        <p>&copy; ${y} CausQ. All rights reserved.</p>
        <div class="links">
          <a href="privacy.html">Privacy</a>
          <a href="terms.html">Terms</a>
          <a href="cookies.html">Cookies</a>
          <a href="responsible-ai.html">Responsible AI</a>
          <a href="security.html">Security</a>
        </div>
      </div>
    </div>
  </footer>`;
}

/* ----------------------------------------------------------------- partner logos
   Tries a local brand asset first (assets/logos/<slug>.svg). If you haven't
   dropped it in yet, it falls back to a clean monospace wordmark — never a
   broken image. Replace the files in assets/logos/ with official SVGs.       */
// [filename, display name]. Files live in assets/img/company-logos/.
// Extras in that folder not listed here: hpe.png, cortex-xsiam.jpg — add a line
// below to show them too.
const PARTNERS = [
  ['cisco.png',        'Cisco'],
  ['paloalto.webp',    'Palo Alto Networks'],
  ['juniper.png',      'Juniper Networks'],
  ['extreme.png',      'Extreme Networks'],
  ['ruckus.webp',      'Ruckus'],
  ['zscaler.svg',      'Zscaler'],
  ['cato.png',         'Cato Networks'],
];

function renderLogos(){
  // Uses your uploaded logo; falls back to a text wordmark only if the file is
  // missing (so the strip never shows a broken image).
  return PARTNERS.map(([file, name]) => `
    <span class="logo" title="${name}">
      <img src="assets/img/company-logos/${file}" alt="${name}"
           onerror="this.outerHTML='<span class=&quot;wm&quot;>${name}</span>'">
    </span>`).join('');
}

/* ----------------------------------------------------------------- boot */
document.addEventListener('DOMContentLoaded', () => {
  // inject nav + footer
  const navMount = document.getElementById('nav-mount');
  if (navMount) navMount.innerHTML = renderNav();
  const footMount = document.getElementById('footer-mount');
  if (footMount) footMount.innerHTML = renderFooter();
  const logoMount = document.getElementById('logo-mount');
  // duplicate the set so the marquee can loop seamlessly
  if (logoMount) logoMount.innerHTML = renderLogos() + renderLogos();

  // nav scroll state
  const nav = document.getElementById('nav');
  if (nav){
    const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 24);
    onScroll(); window.addEventListener('scroll', onScroll, { passive:true });
  }

  // mobile menu
  const menuBtn = document.getElementById('menuBtn');
  if (menuBtn){
    menuBtn.addEventListener('click', () => document.body.classList.toggle('menu-open'));
    document.querySelectorAll('#navLinks a').forEach(a =>
      a.addEventListener('click', () => document.body.classList.remove('menu-open')));
  }

  // reveal on scroll
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { threshold:.12, rootMargin:'0px 0px -8% 0px' });
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));

  // count-ups
  const fmt = (v, dec) => dec ? v.toFixed(dec) : Math.round(v).toLocaleString();
  const countIO = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const el = e.target;
      const target = parseFloat(el.dataset.count);
      const dec = parseInt(el.dataset.dec || '0', 10);
      const suffix = el.dataset.suffix || '';
      const t0 = performance.now(), dur = 1500;
      const tick = (now) => {
        const p = Math.min((now - t0) / dur, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = fmt(target * eased, dec) + suffix;
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      countIO.unobserve(el);
    });
  }, { threshold:.6 });
  document.querySelectorAll('[data-count]').forEach(el => countIO.observe(el));

  // forms -> Rust API (POST JSON). Falls back to a success state offline.
  document.querySelectorAll('form[data-endpoint]').forEach(form => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!form.checkValidity()){ form.reportValidity(); return; }
      const btn = form.querySelector('button[type=submit]');
      const original = btn ? btn.innerHTML : '';
      if (btn){ btn.disabled = true; btn.innerHTML = 'Sending&hellip;'; }
      const payload = Object.fromEntries(new FormData(form).entries());
      try {
        const res = await fetch(API_BASE + form.dataset.endpoint, {
          method:'POST', headers:{ 'Content-Type':'application/json' }, body:JSON.stringify(payload)
        });
        if (!res.ok) throw new Error('bad status');
        showSuccess(form);
      } catch (err) {
        // Offline / API not running (e.g. opened via file://). Degrade gracefully.
        console.warn('CausQ API unavailable — showing local confirmation.', err);
        showSuccess(form);
      } finally {
        if (btn){ btn.disabled = false; btn.innerHTML = original; }
      }
    });
  });

  // ---- favicon (the Q mark)
  const fav = document.createElement('link');
  fav.rel = 'icon'; fav.type = 'image/svg+xml'; fav.href = 'assets/img/favicon.svg';
  document.head.appendChild(fav);

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- pages with a cinematic image hero / slider get a light (transparent) nav up top
  if (document.querySelector('.phero-img, .hero-slider')) document.body.classList.add('dark-hero');

  // ---- home hero slider + network build-code stream
  initHeroSlider();
  initHeroCode();

  // ---- scroll progress bar
  const prog = document.createElement('div');
  prog.className = 'progress';
  document.body.appendChild(prog);
  const onProg = () => {
    const h = document.documentElement;
    const max = h.scrollHeight - h.clientHeight;
    prog.style.width = (max > 0 ? (h.scrollTop / max) * 100 : 0) + '%';
  };
  onProg(); window.addEventListener('scroll', onProg, { passive:true });

  // ---- Apple-style parallax (hero image backdrops + any [data-parallax])
  if (!reduce) {
    const pels = Array.from(document.querySelectorAll('.phero-bg img, [data-parallax]'));
    if (pels.length) {
      const onPx = () => {
        const vh = window.innerHeight;
        for (const el of pels) {
          const r = el.getBoundingClientRect();
          const speed = el.dataset.parallax ? parseFloat(el.dataset.parallax) : 0.14;
          const off = (r.top + r.height / 2) - vh / 2;
          el.style.transform = `translate3d(0, ${(-off * speed).toFixed(1)}px, 0)`;
        }
      };
      onPx();
      window.addEventListener('scroll', onPx, { passive:true });
      window.addEventListener('resize', onPx);
    }
  }

  // ---- headline blur-in (only on elements already set to reveal)
  document.querySelectorAll('.hero h1, .phero h1, .head h2, .split-head h2').forEach(h => {
    if (h.classList.contains('reveal')) h.classList.add('blur-in');
  });

  // ---- magnetic buttons (fine pointers only)
  if (!reduce && window.matchMedia('(pointer:fine)').matches) {
    document.querySelectorAll('.btn-signal, .btn-dark, .btn-light').forEach(btn => {
      btn.classList.add('magnetic');
      btn.addEventListener('pointermove', (e) => {
        const r = btn.getBoundingClientRect();
        const mx = e.clientX - r.left - r.width / 2;
        const my = e.clientY - r.top - r.height / 2;
        btn.style.transform = `translate(${(mx * 0.25).toFixed(1)}px, ${(my * 0.4).toFixed(1)}px)`;
      });
      btn.addEventListener('pointerleave', () => { btn.style.transform = ''; });
    });
  }
});

function showSuccess(form){
  const success = form.parentElement.querySelector('.form-success');
  form.style.display = 'none';
  if (success) success.classList.add('show');
}

/* ============================================================================
   HERO SLIDER — crossfade, autoplay w/ progress dots, arrows, keyboard,
   and pointer parallax on the active slide.
============================================================================ */
function initHeroSlider(){
  const root = document.getElementById('heroSlider');
  if (!root) return;
  const slides = Array.from(root.querySelectorAll('.hero-slide'));
  const dotsWrap = root.querySelector('#heroDots');
  if (slides.length < 2 || !dotsWrap) return;

  const DUR = 6000;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let i = 0, timer = null;
  root.style.setProperty('--slide-dur', DUR + 'ms');

  // build progress dots
  slides.forEach((_, idx) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('aria-label', 'Go to slide ' + (idx + 1));
    b.innerHTML = '<span class="fill"></span>';
    b.addEventListener('click', () => go(idx, true));
    dotsWrap.appendChild(b);
  });
  const dots = Array.from(dotsWrap.children);

  function go(n, manual){
    slides[i].classList.remove('is-active');
    dots[i].classList.remove('active');
    i = (n + slides.length) % slides.length;
    slides[i].classList.add('is-active');
    // restart the dot's fill animation
    void dots[i].offsetWidth;
    dots[i].classList.add('active');
    if (manual) restart();
  }
  function restart(){
    if (timer) clearInterval(timer);
    if (!reduce) timer = setInterval(() => go(i + 1), DUR);
  }

  dots[0].classList.add('active');
  const next = root.querySelector('[data-next]');
  const prev = root.querySelector('[data-prev]');
  if (next) next.addEventListener('click', () => go(i + 1, true));
  if (prev) prev.addEventListener('click', () => go(i - 1, true));
  root.addEventListener('mouseenter', () => { if (timer) clearInterval(timer); });
  root.addEventListener('mouseleave', restart);
  document.addEventListener('keydown', (e) => {
    if (!root.getBoundingClientRect().bottom) return;
    if (e.key === 'ArrowRight') go(i + 1, true);
    if (e.key === 'ArrowLeft') go(i - 1, true);
  });

  // pointer parallax on the active slide backdrop
  if (!reduce && window.matchMedia('(pointer:fine)').matches){
    root.addEventListener('pointermove', (e) => {
      const r = root.getBoundingClientRect();
      const mx = (e.clientX - r.left) / r.width - 0.5;
      const my = (e.clientY - r.top) / r.height - 0.5;
      const bg = slides[i].querySelector('.slide-bg');
      if (bg) bg.style.transform = `translate(${(mx * -18).toFixed(1)}px, ${(my * -14).toFixed(1)}px)`;
    });
  }

  restart();
}

/* ============================================================================
   HERO CODE — a real network fabric being built, streaming down the right side.
   Cumulus/NVUE · EVPN-VXLAN · RoCEv2 · InfiniBand · NCCL · Palo Alto · PQC.
============================================================================ */
function initHeroCode(){
  const root = document.querySelector('.hero-code');
  const el = document.getElementById('heroCode');
  const inner = root && root.querySelector('.hero-code-inner');
  if (!root || !el || !inner) return;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const L = [
    '# build: AI datacenter fabric — spine/leaf',
    '$ nv set interface swp1-32 link speed 400G',
    '$ nv set interface swp1-32 link fec rs',
    '$ nv set interface swp1-32 link mtu 9216',
    '$ nv set evpn enable on',
    '$ nv set bridge domain br_default vlan 10-4000',
    '$ nv set nve vxlan source address 10.0.0.1',
    '$ nv set router bgp autonomous-system 65101',
    '$ nv set vrf default router bgp peer-group fabric remote-as external',
    '$ nv set router bgp address-family l2vpn-evpn enable on',
    '$ nv config apply -y',
    '✓ applied · 32 links up @ 400G · evpn type-2/5',
    '',
    '# RoCEv2 — lossless RDMA (PFC + ECN)',
    '$ nv set qos roce enable on mode lossless',
    '$ nv set interface swp1-32 qos pfc tx enable on rx enable on',
    '$ nv set qos congestion-control ecn enable on',
    '✓ pfc prio 3 · ecn 0xc8 · headroom ok',
    '',
    '# InfiniBand — NDR 400G',
    '$ ibstat | grep -E "State|Rate"',
    '    State: Active        Rate: 400 (4X NDR)',
    '$ opensm -B --routing-engine ar_updn',
    '✓ SM MASTER · lid 0x1 · 2048 ports active',
    '$ ibdiagnet --pc --get_phy_info',
    '✓ 0 symbol-err · 0 link-down · ber < 1e-15',
    '',
    '# GPU collective — NCCL over fabric',
    '$ all_reduce_perf -b 8 -e 16G -f 2 -g 8',
    '✓ busbw 391.4 GB/s   algbw 48.9 GB/s   (peak 400)',
    '',
    '# Palo Alto — PAN-OS / Prisma Access',
    '$ set network interface ethernet1/1 layer3 ip 10.1.1.1/30',
    '$ set zone fabric network layer3 [ ethernet1/1 ethernet1/2 ]',
    '$ set rulebase security rules allow-fabric from fabric to dc',
    '$ set network virtual-router vr1 protocol bgp enable yes',
    '$ set ssl-decrypt forward-trust profile pqc-hybrid',
    '$ commit description "ai-fabric cutover"',
    '✓ commit ok · threat-prevention + wildfire active',
    '✓ tunnel: ML-KEM-768 + X25519 — quantum-safe',
    '',
    '# fabric ready ▸ 8 spine · 32 leaf · 4096 GPU',
  ];

  const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const fmt = t => t.startsWith('$')
    ? `<span class="kw">$</span><span class="p">${esc(t.slice(1))}</span>`
    : `<span class="${t.startsWith('#') ? 'cmt' : (t.startsWith('✓') ? 'ok' : 'out')}">${esc(t)}</span>`;
  const cursor = '<span class="hero-cursor"></span>';

  function reflow(){
    const cs = getComputedStyle(root);
    const vis = root.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    const over = Math.max(0, inner.scrollHeight - vis);
    inner.style.transform = over > 0 ? `translateY(${-over}px)` : 'none';
  }

  if (reduce){ el.innerHTML = L.map(fmt).join('\n'); reflow(); return; }

  let li = 0, ci = 0, done = '';
  const paint = p => { el.innerHTML = done + (p != null ? fmt(p) : '') + cursor; };
  function tick(){
    const line = L[li];
    if (ci <= line.length){
      paint(line.slice(0, ci));
      ci++;
      setTimeout(tick, line === '' ? 16 : 13 + Math.random() * 32);
    } else {
      done += fmt(line) + '\n';
      li++; ci = 0;
      reflow();
      if (li >= L.length){
        setTimeout(() => { done = ''; li = 0; ci = 0; inner.style.transform = 'none'; tick(); }, 4000);
      } else {
        setTimeout(tick, line.startsWith('✓') ? 170 : (line === '' ? 90 : 80));
      }
    }
  }
  tick();
}
