// Year
document.getElementById('year').textContent = new Date().getFullYear();

const root = document.documentElement;
const darkQuery = matchMedia('(prefers-color-scheme: dark)');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const isDark = () => root.dataset.theme ? root.dataset.theme === 'dark' : darkQuery.matches;

// Theme toggle (remembered per browser)
const themeToggle = document.querySelector('.theme-toggle');
const syncToggle = () => themeToggle.setAttribute('aria-pressed', isDark());
try { const t = localStorage.getItem('theme'); if (t) root.dataset.theme = t; } catch (e) {}
syncToggle();
themeToggle.addEventListener('click', () => {
  root.dataset.theme = isDark() ? 'light' : 'dark';
  try { localStorage.setItem('theme', root.dataset.theme); } catch (e) {}
  syncToggle();
});
darkQuery.addEventListener('change', syncToggle);

// Mobile nav
const toggle = document.querySelector('.nav-toggle');
const links = document.querySelector('.nav-links');
toggle.addEventListener('click', () => {
  const open = links.classList.toggle('open');
  toggle.setAttribute('aria-expanded', open);
});
links.addEventListener('click', e => { if (e.target.tagName === 'A') links.classList.remove('open'); });

// Highlight the nav link of the section currently in view
const navLinks = [...links.querySelectorAll('a[href^="#"]')];
const sections = navLinks.map(a => document.querySelector(a.getAttribute('href'))).filter(Boolean);
const sectionObserver = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (!e.isIntersecting) return;
    navLinks.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + e.target.id));
  });
}, { rootMargin: '-45% 0px -50% 0px' });
sections.forEach(s => sectionObserver.observe(s));

// Media: show a placeholder if a file fails to load
function showPlaceholder(frameId) {
  document.getElementById(frameId).querySelector('.media-placeholder').hidden = false;
}
// Video: placeholder with a download link if it fails; chapter buttons seek and play
const video = document.getElementById('system-video');
video.addEventListener('error', () => { video.hidden = true; showPlaceholder('video-frame'); }, true);
document.querySelectorAll('.chapters button').forEach(btn => {
  btn.addEventListener('click', () => {
    video.currentTime = +btn.dataset.t;
    video.play().catch(() => {});
  });
});
// Mark the chapter currently playing
video.addEventListener('timeupdate', () => {
  const buttons = [...document.querySelectorAll('.chapters button')];
  const current = buttons.filter(b => +b.dataset.t <= video.currentTime + 0.25).pop();
  buttons.forEach(b => b.classList.toggle('current', b === current));
});

// 3D viewer: load the model-viewer library (~1 MB) only when the model is about to scroll into view.
// If the viewer can't run (no WebGL, page opened from disk, script blocked), show a still render instead.
const model = document.getElementById('system-model');
const modelFrame = document.getElementById('model-frame');
const showStill = () => {
  model.hidden = true;
  modelFrame.querySelector('.media-fallback').hidden = false;
};
if (reducedMotion) model.removeAttribute('auto-rotate');
model.addEventListener('error', showStill);
const hasWebGL = (() => {
  try { return !!document.createElement('canvas').getContext('webgl2'); } catch (e) { return false; }
})();
if (location.protocol === 'file:' || !hasWebGL) {
  showStill();
} else {
  const modelObserver = new IntersectionObserver(entries => {
    if (!entries[0].isIntersecting) return;
    modelObserver.disconnect();
    const script = document.createElement('script');
    script.type = 'module';
    script.src = 'https://unpkg.com/@google/model-viewer@3.5.0/dist/model-viewer.min.js';
    script.onerror = showStill;
    document.head.appendChild(script);
  }, { rootMargin: '600px 0px' });
  modelObserver.observe(model);
}

// Hero: a few satellites orbiting a central body
const canvas = document.getElementById('orbit');
const ctx = canvas.getContext('2d');
const orbits = [
  { a: 150, e: 0.0, w: 0.0, speed: 0.6 },
  { a: 240, e: 0.35, w: 0.6, speed: 0.35 },
  { a: 340, e: 0.15, w: -0.4, speed: 0.22 },
];
let colors = {};
function readColors() {
  const st = getComputedStyle(root);
  colors = {
    line: st.getPropertyValue('--orbit').trim(),
    accent: st.getPropertyValue('--accent').trim(),
    accent2: st.getPropertyValue('--accent-2').trim(),
  };
}
function size() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = canvas.offsetWidth * dpr;
  canvas.height = canvas.offsetHeight * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
let heroVisible = true, frame = 0;
function draw(t = 0) {
  const w = canvas.offsetWidth, h = canvas.offsetHeight;
  ctx.clearRect(0, 0, w, h);
  const cx = w > 900 ? w * 0.78 : w * 0.85, cy = h * 0.5;
  const s = Math.min(1, w / 1100);
  ctx.fillStyle = colors.accent2;
  ctx.beginPath(); ctx.arc(cx, cy, 7 * s + 3, 0, Math.PI * 2); ctx.fill();
  orbits.forEach((o, i) => {
    const a = o.a * s, b = a * Math.sqrt(1 - o.e * o.e), c = a * o.e;
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(o.w);
    ctx.strokeStyle = colors.line; ctx.lineWidth = 1.3; ctx.setLineDash([4, 6]);
    ctx.beginPath(); ctx.ellipse(-c, 0, a, b, 0, 0, Math.PI * 2); ctx.stroke();
    const th = (t / 1000) * o.speed + i * 2;
    ctx.fillStyle = colors.accent; ctx.setLineDash([]);
    ctx.beginPath(); ctx.arc(-c + a * Math.cos(th), b * Math.sin(th), 4, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  });
  frame = 0;
  if (!reducedMotion && heroVisible && !document.hidden) frame = requestAnimationFrame(draw);
}
const resume = () => { if (!frame && !reducedMotion && heroVisible && !document.hidden) frame = requestAnimationFrame(draw); };
// Pause the animation while the hero is off screen or the tab is in the background
new IntersectionObserver(e => { heroVisible = e[0].isIntersecting; resume(); }).observe(canvas);
document.addEventListener('visibilitychange', resume);
// Re-read colours when the theme changes
const recolor = () => { readColors(); if (reducedMotion) draw(); };
new MutationObserver(recolor).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
darkQuery.addEventListener('change', recolor);
readColors(); size();
addEventListener('resize', () => { size(); if (reducedMotion) draw(); });
draw();

// Lightbox: click a figure to view it full size
const lightbox = document.createElement('dialog');
lightbox.className = 'lightbox';
lightbox.innerHTML = '<button class="lightbox-close" aria-label="Close">×</button><figure><img alt=""><figcaption></figcaption></figure>';
document.body.appendChild(lightbox);
const lbImg = lightbox.querySelector('img');
const lbCap = lightbox.querySelector('figcaption');
document.querySelectorAll('.card img, .plot img, .gallery img').forEach(img => {
  img.classList.add('zoomable');
  img.tabIndex = 0;
  img.setAttribute('role', 'button');
  const open = () => {
    lbImg.src = img.getAttribute('src');  // always the full-resolution file
    lbImg.alt = img.alt;
    const cap = img.closest('figure')?.querySelector('figcaption');
    lbCap.textContent = cap ? cap.textContent : img.alt;
    lightbox.showModal();
    root.classList.add('no-scroll');
  };
  img.addEventListener('click', open);
  img.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
});
// Any click closes it (backdrop, image or the × button); Esc is handled by <dialog>
lightbox.addEventListener('click', () => lightbox.close());
lightbox.addEventListener('close', () => root.classList.remove('no-scroll'));

// Performance envelope: maximum acceleration vs. load mass (thesis Fig. 2.4).
// The thesis curve follows a = F / m with F ≈ 954 N (fit to the published plot).
(function accelChart() {
  const el = document.getElementById('accel-chart');
  if (!el) return;
  const F = 954, mMin = 10, mMax = 200, yMax = 100;
  const accel = m => F / m;

  const rows = [10, 25, 50, 75, 100, 150, 200]
    .map(m => `<tr><td>${m}</td><td>${accel(m).toFixed(1)}</td></tr>`).join('');
  document.getElementById('accel-table').innerHTML = rows;

  const NS = 'http://www.w3.org/2000/svg';
  const mk = (tag, attrs, parent) => {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    parent && parent.appendChild(n);
    return n;
  };
  const tip = document.createElement('div');
  tip.className = 'chart-tip'; tip.hidden = true; el.appendChild(tip);

  function draw() {
    el.querySelector('svg')?.remove();
    const W = el.clientWidth, H = el.clientHeight;
    const pad = { l: 34, r: 8, t: 8, b: 30 };
    const pw = W - pad.l - pad.r, ph = H - pad.t - pad.b;
    const x = m => pad.l + (m / mMax) * pw;
    const y = a => pad.t + (1 - a / yMax) * ph;
    const svg = mk('svg', { viewBox: `0 0 ${W} ${H}`, 'aria-hidden': 'true' });
    el.insertBefore(svg, tip);

    for (const a of [0, 25, 50, 75, 100]) {
      mk('line', { class: a ? 'grid' : 'axis', x1: pad.l, x2: W - pad.r, y1: y(a), y2: y(a) }, svg);
      mk('text', { class: 'tick', x: pad.l - 6, y: y(a) + 4, 'text-anchor': 'end' }, svg).textContent = a;
    }
    for (const m of [0, 50, 100, 150, 200]) {
      mk('text', { class: 'tick', x: x(m), y: H - pad.b + 15, 'text-anchor': 'middle' }, svg).textContent = m;
    }
    mk('text', { class: 'label', x: W - pad.r, y: H - 2, 'text-anchor': 'end' }, svg).textContent = 'Load mass (kg)';

    let d = '';
    for (let m = mMin; m <= mMax; m += 0.5) d += (d ? 'L' : 'M') + x(m).toFixed(1) + ',' + y(accel(m)).toFixed(1);
    mk('path', { class: 'series', d }, svg);

    const cross = mk('line', { class: 'crosshair', y1: pad.t, y2: H - pad.b, visibility: 'hidden' }, svg);
    const dot = mk('circle', { class: 'dot', r: 5, visibility: 'hidden' }, svg);
    // Transparent hit area covering the whole plot, larger than the line itself
    const hit = mk('rect', { x: pad.l, y: 0, width: pw, height: H, fill: 'transparent' }, svg);

    const show = e => {
      const r = svg.getBoundingClientRect();
      const m = Math.round(Math.min(mMax, Math.max(mMin, ((e.clientX - r.left - pad.l) / pw) * mMax)));
      const px = x(m), py = y(accel(m));
      cross.setAttribute('x1', px); cross.setAttribute('x2', px); cross.setAttribute('visibility', 'visible');
      dot.setAttribute('cx', px); dot.setAttribute('cy', py); dot.setAttribute('visibility', 'visible');
      tip.innerHTML = `<b>${accel(m).toFixed(1)} m/s²</b> at ${m} kg`;
      tip.style.left = Math.min(W - 60, Math.max(60, px)) + 'px';
      tip.style.top = py + 'px';
      tip.hidden = false;
    };
    const hide = () => { cross.setAttribute('visibility', 'hidden'); dot.setAttribute('visibility', 'hidden'); tip.hidden = true; };
    hit.addEventListener('pointermove', show);
    hit.addEventListener('pointerdown', show);
    hit.addEventListener('pointerleave', hide);
  }
  draw();
  new ResizeObserver(draw).observe(el);
})();
