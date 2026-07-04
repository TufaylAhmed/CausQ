/* ============================================================================
   CausQ — Home (context-grid edition) behaviour
   Capability catalog tabs, engagement carousel, FAQ, CTA word rotor,
   copy-to-clipboard, and the hand-built blueprint SVG line art.
   Loaded only by index.html.
============================================================================ */
(function(){
  'use strict';

  /* ------------------------------------------------ blueprint SVG library
     White line-art on the teal catalog card; teal line-art on light tiles.
     Every glyph is drawn on a 200x140 grid with 1.5px strokes.            */
  function svg(body, stroke, accent){
    /* each glyph is a chain of elements written to sit between an opening
       `<path d="` and a closing `"/>`; S and A are colour placeholders */
    return '<svg viewBox="0 0 200 140" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="' +
      body.replaceAll('S', stroke).replaceAll('A', accent) + '"/></svg>';
  }
  var W = 'rgba(255,255,255,.85)', WA = '#67E8F9';           /* on teal card */
  var T = 'rgba(14,116,144,.75)',  TA = '#06B6D4';           /* on light tile */

  var GLYPHS = {
    /* neural mesh: nodes converging on a core */
    ai: 'M100 70h0"/><circle cx="100" cy="70" r="16" stroke="A" stroke-width="2"/><rect x="92" y="62" width="16" height="16" stroke="A" stroke-width="1.5"/><circle cx="30" cy="24" r="7" stroke="S" stroke-width="1.5"/><circle cx="170" cy="24" r="7" stroke="S" stroke-width="1.5"/><circle cx="30" cy="116" r="7" stroke="S" stroke-width="1.5"/><circle cx="170" cy="116" r="7" stroke="S" stroke-width="1.5"/><circle cx="100" cy="14" r="5" stroke="S" stroke-width="1.5"/><circle cx="100" cy="126" r="5" stroke="S" stroke-width="1.5"/><path d="M36 29l48 33M164 29l-48 33M36 111l48-33M164 111l-48-33M100 19v35M100 91v30" stroke="S" stroke-width="1.2" stroke-dasharray="4 4"/><path d="M84 70h-20M136 70h-20" stroke="A" stroke-width="1.5',
    /* spine-leaf fabric */
    network: 'M0 0h0"/><rect x="30" y="14" width="34" height="18" stroke="S" stroke-width="1.5"/><rect x="83" y="14" width="34" height="18" stroke="S" stroke-width="1.5"/><rect x="136" y="14" width="34" height="18" stroke="S" stroke-width="1.5"/><rect x="16" y="106" width="34" height="18" stroke="A" stroke-width="1.5"/><rect x="70" y="106" width="34" height="18" stroke="S" stroke-width="1.5"/><rect x="124" y="106" width="34" height="18" stroke="S" stroke-width="1.5"/><rect x="152" y="106" width="0" height="0"/><path d="M47 32l-14 74M47 32l40 74M47 32l94 74M100 32l-67 74M100 32l-13 74M100 32l41 74M153 32l-120 74M153 32l-66 74M153 32l-12 74" stroke="S" stroke-width="1" stroke-dasharray="3 4"/><path d="M47 32l40 74" stroke="A" stroke-width="1.5',
    /* shield + lattice */
    quantum: 'M0 0h0"/><path d="M100 12l52 18v34c0 32-22 56-52 66-30-10-52-34-52-66V30z" stroke="S" stroke-width="1.5"/><path d="M100 12v118M48 46h104M60 88h80" stroke="S" stroke-width="1" stroke-dasharray="4 4"/><path d="M78 66l16 16 30-32" stroke="A" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round',
    /* radar sweep */
    soc: 'M0 0h0"/><circle cx="100" cy="70" r="56" stroke="S" stroke-width="1.5"/><circle cx="100" cy="70" r="37" stroke="S" stroke-width="1" stroke-dasharray="4 4"/><circle cx="100" cy="70" r="18" stroke="S" stroke-width="1"/><path d="M100 70L145 32" stroke="A" stroke-width="2"/><path d="M100 14v112M44 70h112" stroke="S" stroke-width="1" stroke-dasharray="3 5"/><circle cx="128" cy="92" r="4" fill="A"/><circle cx="72" cy="46" r="4" fill="A',
    /* cloud edge + tunnels */
    sase: 'M0 0h0"/><path d="M64 60a22 22 0 0 1 43-7 17 17 0 0 1 29 12 14 14 0 0 1-4 27H72a18 18 0 0 1-8-32z" stroke="S" stroke-width="1.5"/><rect x="22" y="108" width="26" height="16" stroke="S" stroke-width="1.5"/><rect x="87" y="108" width="26" height="16" stroke="S" stroke-width="1.5"/><rect x="152" y="108" width="26" height="16" stroke="S" stroke-width="1.5"/><path d="M35 108V88h65M100 108V92M165 108V88h-65" stroke="A" stroke-width="1.5" stroke-dasharray="5 4',
    /* fingerprint / identity rings */
    identity: 'M0 0h0"/><circle cx="100" cy="56" r="20" stroke="S" stroke-width="1.5"/><path d="M58 122c4-26 20-38 42-38s38 12 42 38" stroke="S" stroke-width="1.5"/><path d="M100 36v-16M100 76v10M80 56H58M142 56h-22" stroke="A" stroke-width="1.5" stroke-dasharray="4 4"/><rect x="88" y="46" width="24" height="20" stroke="A" stroke-width="1.5',
    /* isometric racks */
    datacenter: 'M0 0h0"/><path d="M100 16l52 26-52 26-52-26z" stroke="S" stroke-width="1.5"/><path d="M48 42v56l52 26V68M152 42v56l-52 26" stroke="S" stroke-width="1.5"/><path d="M100 68l52-26M100 68L48 42" stroke="S" stroke-width="1"/><path d="M66 60l17 9M66 74l17 9M134 60l-17 9M134 74l-17 9" stroke="A" stroke-width="2" stroke-linecap="round',
    /* compass + route */
    advisory: 'M0 0h0"/><circle cx="100" cy="70" r="52" stroke="S" stroke-width="1.5"/><path d="M100 18v10M100 112v10M48 70h10M142 70h10" stroke="S" stroke-width="1.5"/><path d="M122 48L108 82l-30 10 14-34z" stroke="A" stroke-width="1.8" stroke-linejoin="round"/><circle cx="100" cy="70" r="4" fill="A'
  };

  var CATALOG = [
    { key:'ai',        kick:'01 · AI',         title:'AI & Intelligent Operations',
      desc:'From strategy to running systems. We put AI to work across the enterprise and the network itself, grounded in your data, with the governance to do it responsibly.',
      href:'what-we-do.html#ai' },
    { key:'network',   kick:'02 · Network',    title:'Network Modernization',
      desc:'Campus, data center, cloud and edge re-architected as automated, software-defined fabric, built for the demands of AI-scale workloads.',
      href:'what-we-do.html#network' },
    { key:'quantum',   kick:'03 · Quantum',    title:'Quantum-era Security',
      desc:'Crypto-agility, post-quantum readiness and Zero Trust. Protection against the threats of today and the decryption of tomorrow.',
      href:'what-we-do.html#quantum' },
    { key:'soc',       kick:'04 · SecOps',     title:'Cybersecurity & SOC',
      desc:'SIEM, SOAR and detection engineering. Security operations replatformed for automation-first response.',
      href:'what-we-do.html#soc' },
    { key:'sase',      kick:'05 · SASE',       title:'SASE & Secure Access',
      desc:'SD-WAN, ZTNA, SWG and CASB converged into one secure edge, managed and observable.',
      href:'what-we-do.html#sase' },
    { key:'identity',  kick:'06 · Identity',   title:'Identity & Zero Trust',
      desc:'IAM, MFA, PAM and continuous verification. Identity-first access from the core to the furthest edge.',
      href:'what-we-do.html#identity' },
    { key:'datacenter',kick:'07 · Fabric',     title:'Data Center & AI Fabric',
      desc:'Spine-leaf architectures and lossless RDMA fabrics engineered for training and inference at scale.',
      href:'what-we-do.html#datacenter' },
    { key:'advisory',  kick:'08 · Advisory',   title:'Consulting & Advisory',
      desc:'Assessments, site surveys, roadmaps and migrations. Strategy from people who still build.',
      href:'consulting-advisory.html' }
  ];

  function mountCatalog(){
    var list = document.getElementById('catList');
    var viz  = document.getElementById('catViz');
    if (!list || !viz) return;
    var kick = document.getElementById('catKick'),
        title= document.getElementById('catTitle'),
        desc = document.getElementById('catDesc'),
        link = document.getElementById('catLink');
    function show(i){
      var c = CATALOG[i];
      viz.innerHTML = svg(GLYPHS[c.key], W, WA);
      kick.textContent = c.kick; title.textContent = c.title;
      desc.textContent = c.desc; link.setAttribute('href', c.href);
      list.querySelectorAll('button').forEach(function(b){
        b.classList.toggle('is-on', +b.dataset.cat === i);
      });
    }
    list.addEventListener('click', function(e){
      var b = e.target.closest('button[data-cat]');
      if (b) show(+b.dataset.cat);
    });
    show(0);
  }

  /* step + mode + spec tiles reuse the same library in teal */
  function mountTiles(){
    var map = {
      '.sv-assess':   'soc',       '.sv-architect':'datacenter',
      '.sv-build':    'network',   '.sv-handover': 'advisory',
      '.mv-advisory': 'advisory',  '.mv-delivery': 'network',
      '.mv-managed':  'soc',       '.sv-quality':  'quantum',
      '.sv-speed':    'ai'
    };
    Object.keys(map).forEach(function(sel){
      var el = document.querySelector(sel);
      if (el) el.innerHTML = svg(GLYPHS[map[sel]], T, TA);
    });
  }

  /* engagement carousel arrows */
  function mountCarousel(){
    var track = document.getElementById('ucTrack');
    if (!track) return;
    var step = 356;
    var prev = document.querySelector('[data-uc-prev]'),
        next = document.querySelector('[data-uc-next]');
    if (prev) prev.addEventListener('click', function(){ track.scrollBy({ left: -step, behavior: 'smooth' }); });
    if (next) next.addEventListener('click', function(){ track.scrollBy({ left:  step, behavior: 'smooth' }); });
  }

  /* CTA word rotor */
  function mountRotor(){
    var el = document.getElementById('rotorWord');
    if (!el) return;
    var words = ['network', 'SOC', 'AI stack', 'data center', 'enterprise'], i = 0;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    setInterval(function(){
      i = (i + 1) % words.length;
      el.classList.add('swap');
      setTimeout(function(){ el.innerHTML = '&#9642; ' + words[i]; }, 240);
      setTimeout(function(){ el.classList.remove('swap'); }, 520);
    }, 2600);
  }

  /* copy email */
  function mountCopy(){
    document.querySelectorAll('[data-copy]').forEach(function(btn){
      btn.addEventListener('click', function(){
        var t = btn.getAttribute('data-copy');
        (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject())
          .catch(function(){})
          .finally(function(){
            btn.classList.add('copied');
            setTimeout(function(){ btn.classList.remove('copied'); }, 1600);
          });
      });
    });
  }

  /* keep only one FAQ open at a time */
  function mountFaq(){
    var items = document.querySelectorAll('.sq-faq-item');
    items.forEach(function(d){
      d.addEventListener('toggle', function(){
        if (d.open) items.forEach(function(o){ if (o !== d) o.removeAttribute('open'); });
      });
    });
  }

  document.addEventListener('DOMContentLoaded', function(){
    mountCatalog(); mountTiles(); mountCarousel(); mountRotor(); mountCopy(); mountFaq();
  });
})();
