// Year
document.getElementById('year').textContent = new Date().getFullYear();

// Theme toggle (remembered per browser)
const root = document.documentElement;
try { const t = localStorage.getItem('theme'); if (t) root.dataset.theme = t; } catch (e) {}
document.querySelector('.theme-toggle').addEventListener('click', () => {
  const dark = root.dataset.theme
    ? root.dataset.theme === 'dark'
    : matchMedia('(prefers-color-scheme: dark)').matches;
  root.dataset.theme = dark ? 'light' : 'dark';
  try { localStorage.setItem('theme', root.dataset.theme); } catch (e) {}
});

// Mobile nav
const toggle = document.querySelector('.nav-toggle');
const links = document.querySelector('.nav-links');
toggle.addEventListener('click', () => {
  const open = links.classList.toggle('open');
  toggle.setAttribute('aria-expanded', open);
});
links.addEventListener('click', e => { if (e.target.tagName === 'A') links.classList.remove('open'); });

// Media fallbacks: show a placeholder until the video / 3D model files exist
function showPlaceholder(frameId) {
  const frame = document.getElementById(frameId);
  frame.querySelector('.media-placeholder').hidden = false;
}
function checkMedia(el, url, frameId) {
  const fail = () => { el.hidden = true; showPlaceholder(frameId); };
  el.addEventListener('error', fail);
  fetch(url, { method: 'HEAD' }).then(r => { if (!r.ok) fail(); }).catch(fail);
}
const video = document.getElementById('system-video');
checkMedia(video, video.querySelector('source').getAttribute('src'), 'video-frame');
const model = document.getElementById('system-model');
checkMedia(model, model.getAttribute('src'), 'model-frame');

// Hero: a few satellites orbiting a central body
const canvas = document.getElementById('orbit');
const ctx = canvas.getContext('2d');
const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
const orbits = [
  { a: 150, e: 0.0, w: 0.0, speed: 0.6 },
  { a: 240, e: 0.35, w: 0.6, speed: 0.35 },
  { a: 340, e: 0.15, w: -0.4, speed: 0.22 },
];
function size() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = canvas.offsetWidth * dpr;
  canvas.height = canvas.offsetHeight * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
function draw(t) {
  const w = canvas.offsetWidth, h = canvas.offsetHeight;
  const styles = getComputedStyle(root);
  const line = styles.getPropertyValue('--orbit').trim();
  const accent = styles.getPropertyValue('--accent').trim();
  const accent2 = styles.getPropertyValue('--accent-2').trim();
  ctx.clearRect(0, 0, w, h);
  const cx = w > 900 ? w * 0.78 : w * 0.85, cy = h * 0.5;
  const s = Math.min(1, w / 1100);
  ctx.fillStyle = accent2;
  ctx.beginPath(); ctx.arc(cx, cy, 7 * s + 3, 0, Math.PI * 2); ctx.fill();
  orbits.forEach((o, i) => {
    const a = o.a * s, b = a * Math.sqrt(1 - o.e * o.e), c = a * o.e;
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(o.w);
    ctx.strokeStyle = line; ctx.lineWidth = 1.3; ctx.setLineDash([4, 6]);
    ctx.beginPath(); ctx.ellipse(-c, 0, a, b, 0, 0, Math.PI * 2); ctx.stroke();
    const th = (t / 1000) * o.speed + i * 2;
    ctx.fillStyle = accent; ctx.setLineDash([]);
    ctx.beginPath(); ctx.arc(-c + a * Math.cos(th), b * Math.sin(th), 4, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  });
  if (!still) requestAnimationFrame(draw);
}
size(); addEventListener('resize', size);
requestAnimationFrame(draw);

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
    lbImg.src = img.currentSrc || img.src;
    lbImg.alt = img.alt;
    const cap = img.closest('figure')?.querySelector('figcaption');
    lbCap.textContent = cap ? cap.textContent : img.alt;
    lightbox.showModal();
  };
  img.addEventListener('click', open);
  img.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
});
// Any click closes it (backdrop, image or the × button); Esc is handled by <dialog>
lightbox.addEventListener('click', () => lightbox.close());
