
// ═══════════════════════════════════════════════════════════
//  TASM SCROLL ENGINE
//  - Loader ends → Scene 0 (poster) visible IMMEDIATELY
//  - Scroll through 500vh → scenes 0→1→2→3 change
//  - Past 500vh → normal website scrolls
// ═══════════════════════════════════════════════════════════

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const eo = t => 1 - Math.pow(1 - t, 3);


// ── Scene breakpoints (Values kam ki hain taaki jaldi trigger ho) ──
const BREAKS = [
  { s: 0, e: 0.20 },  // Scene 0: Poster (0% se 20% scroll tak rukega)
  { s: 0.20, e: 0.50 },  // Scene 1: Electro GIF (20% se 50% tak)
  { s: 0.50, e: 0.80 },  // Scene 2: Moon GIF (50% se 80% tak)
  { s: 0.80, e: 1.00 },  // Scene 3: Final Image (80% se 100% tak)
];
const LABELS = ['// 01 — ORIGIN', '// 02 — AGILITY', '// 03 — THE LEAP', '// 04 — LEGEND'];

let raw = 0, smooth = 0, lastSc = -1;
const scrollRoot = document.getElementById('scroll-root');

// DOM
const layers = [0, 1, 2, 3].map(i => document.getElementById(`s${i}`));
const ovs = [0, 1, 2, 3].map(i => document.getElementById(`ov${i}`));
const pips = document.querySelectorAll('.pip');
const hcorns = document.querySelectorAll('.hc');
const progLine = document.getElementById('prog-line');
const scLabel = document.getElementById('scene-label');
const t1 = document.getElementById('t1');
const t2 = document.getElementById('t2');
const t3 = document.getElementById('t3');
const senseEl = document.getElementById('sense');
const shint = document.getElementById('shint');

function getScene(p) {
  for (let i = BREAKS.length - 1; i >= 0; i--)
    if (p >= BREAKS[i].s) return i;
  return 0;
}

// Cross-fade: returns 0..1 alpha for each layer
function layerAlpha(p, idx) {
  const b = BREAKS[idx];
  const dur = b.e - b.s;
  const local = clamp((p - b.s) / dur, 0, 1);
  const fadeIn = eo(clamp(local / 0.2, 0, 1));       // fast fade in
  // fade out only into next scene
  const fadeOut = idx < 3 ? eo(clamp((local - 0.8) / 0.2, 0, 1)) : 0;
  return fadeIn * (1 - fadeOut);
}

function updateFrame(p) {
  const sc = getScene(p);

  layers.forEach((l, i) => {
    const alpha = layerAlpha(p, i);
    l.style.opacity = alpha;

    // Visibility toggle zaroori hai taaki layers ek dusre ko block na karein
    if (alpha > 0.05) {
      l.style.visibility = 'visible';
      l.style.zIndex = Math.round(alpha * 10); // Active scene ko upar lata hai
    } else {
      l.style.visibility = 'hidden';
    }
  });

  // Overlays (ov0, ov1, etc.) ko force show karein
  ovs.forEach((o, i) => {
    if (i === sc) {
      o.classList.add('on');
      o.style.visibility = 'visible';
      o.style.opacity = "1";
    } else {
      o.classList.remove('on');
      o.style.opacity = "0";
      o.style.visibility = 'hidden';
    }
  });

  // Progress line
  progLine.style.width = (p * 100) + '%';

  // Pips
  pips.forEach((pip, i) => pip.classList.toggle('on', i === sc));

  // HUD corners: show after first scroll
  hcorns.forEach(c => c.classList.toggle('on', p > 0.01));

  // Scene label
  scLabel.textContent = LABELS[sc];
  scLabel.classList.toggle('on', p > 0.01);

  // Tints
  const b1 = BREAKS[1], b2 = BREAKS[2], b3 = BREAKS[3];
  t1.style.opacity = layerAlpha(p, 1).toFixed(3);
  t2.style.opacity = layerAlpha(p, 2).toFixed(3);
  t3.style.opacity = layerAlpha(p, 3).toFixed(3);

  // Scroll hint: hide after first scroll
  shint.classList.toggle('hide', p > 0.03);

  // Spider-sense on scene change
  if (sc !== lastSc && lastSc !== -1) spiderSense(sc);
  lastSc = sc;
}

// ── SCROLL HANDLER ──
window.addEventListener('scroll', () => {
  const maxS = scrollRoot.offsetHeight - window.innerHeight;
  // Only track within the scroll-root zone
  const pos = clamp(window.scrollY, 0, maxS);
  raw = maxS > 0 ? pos / maxS : 0;
}, { passive: true });

// ── SMOOTH RAF LOOP ──
; (function loop() {
  smooth += (raw - smooth) * 0.08;
  updateFrame(smooth);
  requestAnimationFrame(loop);
})();

// ── PIP CLICK: jump to scene ──
function jumpTo(idx) {
  const maxS = scrollRoot.offsetHeight - window.innerHeight;
  const targetScroll = BREAKS[idx].s * maxS + 10;
  window.scrollTo({ top: targetScroll, behavior: 'smooth' });
}

// ── SPIDER-SENSE ──
function spiderSense(sc) {
  const cx = [50, 68, 32, 50][sc], cy = [50, 48, 52, 50][sc];
  senseEl.innerHTML = '';
  for (let i = 0; i < 3; i++) {
    const r = document.createElement('div');
    r.className = 'sring';
    r.style.cssText = `left:${cx}%;top:${cy}%;width:60px;height:60px;animation-delay:${i * 0.38}s`;
    senseEl.appendChild(r);
  }
  setTimeout(() => senseEl.innerHTML = '', 2500);
}

// ── CURSOR ──
const curEl = document.getElementById('cur');
const curDot = document.getElementById('cur-dot');
let mx = -200, my = -200, cx2 = -200, cy2 = -200;
if (window.matchMedia('(hover:hover)').matches) {
  document.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; });
  document.querySelectorAll('button,.cbtn,.pip,#watch-btn').forEach(el => {
    el.addEventListener('mouseenter', () => curEl.classList.add('big'));
    el.addEventListener('mouseleave', () => curEl.classList.remove('big'));
  });
  (function cl() {
    cx2 += (mx - cx2) * .13; cy2 += (my - cy2) * .13;
    curEl.style.left = cx2 + 'px'; curEl.style.top = cy2 + 'px';
    curDot.style.left = mx + 'px'; curDot.style.top = my + 'px';
    requestAnimationFrame(cl);
  })();
}

// ── LOADER ──
const ldfill = document.getElementById('ldfill');
const ldtxt = document.getElementById('ldtxt');
const ldEl = document.getElementById('loader');
const steps = [
  [12, 'LOADING SUIT ASSETS...'],
  [30, 'CALIBRATING SPIDER-SENSE...'],
  [55, 'SYNCING HUD...'],
  [75, 'MOUNTING GIF LAYERS...'],
  [94, 'ACTIVATING WEB-SHOOTERS...'],
  [100, 'SUIT ONLINE.'],
];
let si = 0;
const ltick = setInterval(() => {
  if (si >= steps.length) return;
  const [pct, msg] = steps[si++];
  ldfill.style.width = pct + '%';
  ldtxt.textContent = msg;
  if (pct === 100) {
    clearInterval(ltick);
    setTimeout(() => {
      ldEl.classList.add('out');
      // Scene 0 already has opacity:1 via CSS — visible immediately
    }, 600);
  }
}, 300);

// ── CTA ──
document.getElementById('watch-btn').addEventListener('click', () => {
  window.open('assets/vid3.gif', '_blank');
});

// ── SCROLL REVEAL ──
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('active');
    }
  });
}, { threshold: 0.15, rootMargin: "0px 0px -50px 0px" });

document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
