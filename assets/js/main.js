/* ============================================================================
   CausQ — Shared frontend behaviour
   Injects nav + footer, scroll reveals, count-ups, partner logos,
   and wires forms to the Rust API (graceful offline fallback).
============================================================================ */

const API_BASE = (location.protocol === 'file:') ? '' : ''; // same-origin when served by the Rust app

// Cloudflare Turnstile (bot protection). Paste your widget's SITE key here to turn it
// on; leave empty and forms behave exactly as before. Pair it with the TURNSTILE_SECRET
// secret on the Worker. Get a key at: Cloudflare dashboard > Turnstile > Add widget.
const TURNSTILE_SITEKEY = '';

/* ----------------------------------------------------------------- NAV/FOOTER
   Shared markup is injected so every page stays in sync from one source.
   "What we do" is a Products & Services mega-menu: a hover panel on desktop,
   an inline expanded list inside the full-screen overlay on mobile.          */
const NAV = [
  { label:'What we do', href:'what-we-do.html', menu:[
    { group:'Capabilities', items:[
      ['what-we-do.html#ai',      'AI &amp; Intelligent Operations',  'Strategy to running systems'],
      ['what-we-do.html#network', 'Network Modernization',            'Software-defined, AI-ready fabric'],
      ['what-we-do.html#quantum', 'Quantum-era Security',             'Crypto-agility &amp; Zero Trust'],
      ['what-we-do.html#cloud',   'Cloud, Edge &amp; Managed',        'Run it, follow-the-sun'],
    ]},
    { group:'Products &amp; platforms', items:[
      ['xsiam-xsoar.html',        'Cortex XSIAM &amp; XSOAR',         'SecOps platform &amp; automation'],
    ]},
    { group:'Services', items:[
      ['consulting-advisory.html',          'Consulting &amp; Advisory',     'Strategy, surveys, migrations'],
      ['consulting-advisory.html#assess',   'Assessments &amp; Site Surveys','See the estate before you touch it'],
      ['consulting-advisory.html#migrate',  'Upgrades &amp; Migrations',     'Move and modernize, no outage'],
    ]},
  ]},
  { label:'What we think', href:'what-we-think.html' },
  { label:'Who we are',    href:'who-we-are.html' },
  { label:'Careers',       href:'careers.html' },
];

// pages that should light up the "What we do" parent as active
const WHAT_WE_DO_PAGES = ['what-we-do.html', 'xsiam-xsoar.html', 'consulting-advisory.html'];

function currentPage(){
  const p = location.pathname.split('/').pop();
  return p === '' ? 'index.html' : p;
}

const CHEVRON = '<svg class="nav-chev" viewBox="0 0 12 8" aria-hidden="true"><path d="M1 1l5 5 5-5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';

function renderNav(){
  const here = currentPage();
  const links = NAV.map(item => {
    if (!item.menu){
      return `<a href="${item.href}" class="${here === item.href ? 'active' : ''}">${item.label}</a>`;
    }
    const active = WHAT_WE_DO_PAGES.includes(here) ? ' active' : '';
    const cols = item.menu.map(col => `
        <div class="nm-col">
          <span class="nm-h">${col.group}</span>
          ${col.items.map(([href, label, desc]) => `
          <a href="${href}" class="nm-link">
            <span class="nm-t">${label}</span>
            <span class="nm-d">${desc}</span>
          </a>`).join('')}
        </div>`).join('');
    return `
      <div class="nav-item has-menu">
        <a href="${item.href}" class="nav-top${active}" aria-haspopup="true">${item.label} ${CHEVRON}</a>
        <div class="nav-menu" role="menu">
          <div class="nm-inner">${cols}</div>
          <a href="${item.href}" class="nm-all">See all capabilities <span class="arr">&rarr;</span></a>
        </div>
      </div>`;
  }).join('');
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
          <a href="xsiam-xsoar.html">Cortex XSIAM &amp; XSOAR</a>
          <a href="consulting-advisory.html">Consulting &amp; Advisory</a>
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

      <div class="foot-subscribe">
        <div class="fs-copy">
          <h4>The Brief, in your inbox</h4>
          <p>One considered email a month on AI, networks and quantum-era security. From the engineers doing the work. No noise.</p>
        </div>
        <div class="fs-form">
          <form data-endpoint="/api/subscribe" class="sub-form" novalidate>
            <label class="sr-only" for="footSubEmail">Work email</label>
            <input id="footSubEmail" name="email" type="email" placeholder="you@company.com" required>
            <button type="submit" class="btn btn-signal">Subscribe <span class="arr">&rarr;</span></button>
            <p class="sub-note" style="flex-basis:100%">No spam. Unsubscribe in one click.</p>
          </form>
          <div class="form-success sub-ok">
            <span class="dot-ok"><svg fill="none" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg></span>
            <span>You're on the list. Watch your inbox for The Brief.</span>
          </div>
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
    // close the overlay when a real destination link is tapped (but not the
    // "What we do" trigger, which only expands its submenu on mobile)
    document.querySelectorAll('#navLinks a:not(.nav-top)').forEach(a =>
      a.addEventListener('click', () => document.body.classList.remove('menu-open')));
  }

  // mega-menu: on mobile the "What we do" trigger expands its submenu inline
  // instead of navigating; on desktop it's a normal link with a hover panel.
  const megaMq = window.matchMedia('(max-width:940px)');
  document.querySelectorAll('.nav-item.has-menu > .nav-top').forEach(top => {
    top.addEventListener('click', (e) => {
      if (megaMq.matches){ e.preventDefault(); top.parentElement.classList.toggle('open'); }
    });
  });

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
        if (location.protocol === 'file:') {
          // Local preview opened from disk — there is no API. Keep the demo confirmation.
          console.warn('CausQ API unavailable (file:// preview) — showing local confirmation.', err);
          showSuccess(form);
        } else {
          // Live site: do NOT fake success. Surface a real error so submissions
          // are never silently dropped.
          console.error('CausQ form submit failed — request not delivered.', err);
          showError(form);
        }
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

  // ---- pages with a cinematic image hero / slider / dark stage get a light (transparent) nav up top
  if (document.querySelector('.phero-img, .hero-slider, .adv-hero')) document.body.classList.add('dark-hero');

  // ---- bot protection on all forms (no-op until TURNSTILE_SITEKEY is set)
  initTurnstile();

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

// Inject a Turnstile widget into every API-backed form and load the script.
// Turnstile adds a hidden `cf-turnstile-response` input to the enclosing form,
// which then rides along in the JSON payload for the Worker to verify.
function initTurnstile(){
  if (!TURNSTILE_SITEKEY) return;
  const forms = document.querySelectorAll('form[data-endpoint]');
  if (!forms.length) return;
  forms.forEach(form => {
    if (form.querySelector('.cf-turnstile')) return;
    const w = document.createElement('div');
    w.className = 'cf-turnstile';
    w.setAttribute('data-sitekey', TURNSTILE_SITEKEY);
    w.style.margin = '14px 0 4px';
    const btn = form.querySelector('button[type=submit]');
    if (btn) form.insertBefore(w, btn); else form.appendChild(w);
  });
  if (!document.getElementById('cf-turnstile-script')){
    const s = document.createElement('script');
    s.id = 'cf-turnstile-script';
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
    s.async = true; s.defer = true;
    document.head.appendChild(s);
  }
}

function showError(form){
  let el = form.querySelector('.form-error');
  if (!el){
    el = document.createElement('p');
    el.className = 'form-error';
    el.setAttribute('role', 'alert');
    form.appendChild(el);
  }
  el.innerHTML = 'We couldn&rsquo;t send that just now. Please email ' +
    '<a href="mailto:hello@causq.com">hello@causq.com</a> and we&rsquo;ll jump right on it.';
  el.style.display = 'block';
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
    // ——— security operations first: Cortex XSIAM + XSOAR ———
    '§ Cortex XSIAM · integrations + onboarding',
    '$ xsiam broker-vm register --name dc-broker-01 --ha active',
    '$ xsiam collector add syslog --port 514 --vendor "PAN-OS"',
    '$ xsiam dataset create panw_ngfw_traffic_raw --type firewall',
    '$ xsiam integration enable "AWS CloudTrail" "Okta" "Azure AD"',
    '$ xsiam parsing-rule apply okta_sso_raw --ruleset okta-sso',
    '$ xsiam content-pack install Core PAN-OS Okta Identity-Analytics',
    '✓ 312 sources · 1.2 TB/day ingest · 41 datasets live',
    '',
    '# XQL — hunt encoded PowerShell spawned by Office',
    '$ dataset = xdr_data',
    '$ | filter action_process_image_name = "powershell.exe"',
    '$ | filter action_process_image_command_line contains "-enc"',
    '$ | fields _time, agent_hostname, actor_effective_username',
    '✓ 7 hits · 2 hosts · promoted to correlation rule',
    '',
    '§ Cortex XSOAR · integrations + playbook commands',
    '$ !ip ip=185.220.101.4 using-brand="VirusTotal"',
    '$ !url url=${Email.URLs} using-brand="URLScan"',
    '$ !setIncident severity=3 owner="soc-tier2"',
    '$ !ad-disable-account username="j.doe"',
    '$ !panorama-block-ip ip=${IP.Address}',
    '$ !closeInvestigation closeReason="Resolved - Malicious"',
    '✓ playbook "Phishing Triage v4" · 26 tasks · MTTR 4m12s',
    '',
    '§ AI datacenter fabric · spine / leaf',
    '$ nv set interface swp1-32 link speed 400G',
    '$ nv set interface swp1-32 link fec rs',
    '$ nv set evpn enable on',
    '$ nv set nve vxlan source address 10.0.0.1',
    '$ nv set router bgp autonomous-system 65101',
    '$ nv config apply -y',
    '✓ applied · 32 links up @ 400G · evpn type-2/5',
    '',
    '§ RoCEv2 · lossless RDMA (PFC + ECN)',
    '$ nv set qos roce enable on mode lossless',
    '$ nv set interface swp1-32 qos pfc tx enable on rx enable on',
    '$ nv set qos congestion-control ecn enable on',
    '✓ pfc prio 3 · ecn 0xc8 · headroom ok',
    '',
    '§ InfiniBand · NDR 400G',
    '$ ibstat | grep -E "State|Rate"',
    '    State: Active        Rate: 400 (4X NDR)',
    '$ opensm -B --routing-engine ar_updn',
    '✓ SM MASTER · lid 0x1 · 2048 ports active',
    '$ ibdiagnet --pc --get_phy_info',
    '✓ 0 symbol-err · 0 link-down · ber < 1e-15',
    '',
    '§ GPU collective · NCCL over fabric',
    '$ all_reduce_perf -b 8 -e 16G -f 2 -g 8',
    '✓ busbw 391.4 GB/s   algbw 48.9 GB/s   (peak 400)',
    '',
    '§ Palo Alto · PAN-OS / Prisma Access',
    '$ set zone fabric network layer3 [ ethernet1/1 ethernet1/2 ]',
    '$ set rulebase security rules allow-fabric from fabric to dc',
    '$ set network virtual-router vr1 protocol bgp enable yes',
    '$ set ssl-decrypt forward-trust profile pqc-hybrid',
    '$ commit description "ai-fabric cutover"',
    '✓ threat-prevention + wildfire active',
    '✓ tunnel: ML-KEM-768 + X25519 — quantum-safe',
    '',
    '# estate ready ▸ SOC + fabric · 8 spine · 32 leaf · 4096 GPU',
  ];

  const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const fmt = t => {
    if (t.startsWith('§')) return `<span class="sec"><span class="sb"></span>${esc(t.slice(1).trim())}</span>`;
    if (t.startsWith('$')) return `<span class="kw">$</span><span class="p">${esc(t.slice(1))}</span>`;
    const cls = t.startsWith('#') ? 'cmt' : (t.startsWith('✓') ? 'ok' : 'out');
    return `<span class="${cls}">${esc(t)}</span>`;
  };
  const cursor = '<span class="hero-cursor"></span>';

  // Committed lines live in their own block elements. We only ever *append*,
  // never rewrite — so a freshly-inserted section divider gets to play its
  // entrance animation exactly once instead of restarting every keystroke.
  el.innerHTML = '';
  const doneEl = document.createElement('div'); doneEl.className = 'term-done';
  const typeEl = document.createElement('div'); typeEl.className = 'cl term-type';
  el.appendChild(doneEl); el.appendChild(typeEl);

  function commit(line){
    const div = document.createElement('div');
    div.className = line.startsWith('§') ? 'cl cl-sec' : 'cl';
    div.innerHTML = line === '' ? '&nbsp;' : fmt(line);
    doneEl.appendChild(div);
  }
  function reflow(){
    const cs = getComputedStyle(root);
    const vis = root.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    const over = Math.max(0, inner.scrollHeight - vis);
    inner.style.transform = over > 0 ? `translateY(${-over}px)` : 'none';
  }

  if (reduce){ L.forEach(commit); typeEl.remove(); reflow(); return; }

  // pause after a line: dividers linger so the sweep reads; ✓ results hold a beat
  const pause = line => line.startsWith('§') ? 560 : (line.startsWith('✓') ? 170 : (line === '' ? 90 : 80));
  let li = 0, ci = 0;
  function tick(){
    if (li >= L.length){ setTimeout(reset, 4200); return; }
    const line = L[li];
    // section dividers + blank separators drop in whole — no character typing
    if (line.startsWith('§') || line === ''){
      commit(line); typeEl.innerHTML = cursor;
      li++; ci = 0; reflow();
      setTimeout(tick, pause(line));
      return;
    }
    if (ci <= line.length){
      typeEl.innerHTML = fmt(line.slice(0, ci)) + cursor;
      ci++;
      setTimeout(tick, 13 + Math.random() * 32);
    } else {
      commit(line); typeEl.innerHTML = cursor;
      li++; ci = 0; reflow();
      setTimeout(tick, pause(line));
    }
  }
  function reset(){
    doneEl.innerHTML = ''; typeEl.innerHTML = cursor;
    inner.style.transform = 'none';
    li = 0; ci = 0; tick();
  }
  tick();
}
