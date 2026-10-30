// #projetos: paints the Hanabi thumbnails, tilts them, renders the repo list and links everything to the trails.
(() => {
  const section = document.getElementById('projetos');
  if (!section) return;
  const T = () => window.Trails;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;

  // Repo hover/focus → trails. `el` may hold several children; leave only counts when focus/pointer exits el.
  function wire(el, name) {
    el.addEventListener('mouseenter', () => T() && T().highlight(name));
    el.addEventListener('mouseleave', () => T() && T().highlight(null));
    el.addEventListener('focusin', () => T() && T().highlight(name));
    el.addEventListener('focusout', (e) => { if (!el.contains(e.relatedTarget)) T() && T().highlight(null); });
    el.addEventListener('pointerdown', (e) => { if (e.pointerType === 'touch') T() && T().burst(name); });
  }
  section.querySelectorAll('.feat').forEach((f) => {
    const frag = f.querySelector('[data-repo]');
    if (frag) wire(f, frag.dataset.repo);
  });

  // ---- Hanabi thumbnails: still frames of video wallpapers, drawn once in the page palette.
  const rnd = (seed) => () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const glow = (c, x, y, r, col, a) => {
    const g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${col},${a})`); g.addColorStop(1, `rgba(${col},0)`);
    c.fillStyle = g; c.fillRect(0, 0, 400, 250);
  };
  const CY = '216,255,90', BL = '150,220,40', WH = '242,247,232';
  const stars = (c, r, n, maxA) => { for (let i = 0; i < n; i++) { c.fillStyle = `rgba(${WH},${r() * maxA})`; c.fillRect(r() * 400, r() * 250, 1.2, 1.2); } };
  const curve = (c, pts, col, w, a) => { c.strokeStyle = `rgba(${col},${a})`; c.lineWidth = w; c.beginPath(); c.moveTo(...pts[0]); c.bezierCurveTo(...pts[1], ...pts[2], ...pts[3]); c.stroke(); };
  const SCENES = {
    rain(c, r) {
      glow(c, 200, 260, 260, BL, 0.5);
      for (let i = 0; i < 90; i++) { const x = r() * 420, y = r() * 250, l = 10 + r() * 30; c.strokeStyle = `rgba(${r() > 0.5 ? CY : WH},${0.15 + r() * 0.5})`; c.lineWidth = 1; c.beginPath(); c.moveTo(x, y); c.lineTo(x - l * 0.25, y + l); c.stroke(); }
      for (let i = 0; i < 6; i++) { const x = 30 + i * 65; c.fillStyle = `rgba(${BL},0.35)`; c.fillRect(x, 150 + r() * 40, 40, 120); }
    },
    aurora(c, r) {
      stars(c, r, 120, 0.8);
      for (let k = 0; k < 4; k++) for (let x = 0; x < 400; x += 2) {
        const y = 80 + k * 22 + Math.sin(x / 50 + k) * 25, h = 60 + Math.sin(x / 30 + k * 2) * 25;
        const g = c.createLinearGradient(0, y - h, 0, y); g.addColorStop(0, `rgba(${k % 2 ? BL : CY},0)`); g.addColorStop(1, `rgba(${k % 2 ? BL : CY},0.22)`);
        c.fillStyle = g; c.fillRect(x, y - h, 2, h);
      }
      c.fillStyle = '#050605'; c.beginPath(); c.moveTo(0, 250); for (let x = 0; x <= 400; x += 40) c.lineTo(x, 205 + Math.sin(x / 37) * 14); c.lineTo(400, 250); c.fill();
    },
    drive(c, r) {
      glow(c, 200, 120, 160, CY, 0.25);
      c.fillStyle = '#080a07'; c.beginPath(); c.moveTo(0, 250); c.lineTo(185, 120); c.lineTo(215, 120); c.lineTo(400, 250); c.fill();
      for (let i = 0; i < 14; i++) { const t = i / 14, w = 1 + t * 3; c.strokeStyle = `rgba(${WH},${0.2 + t * 0.6})`; c.lineWidth = w; c.beginPath(); c.moveTo(200, 125 + t * t * 125); c.lineTo(200, 125 + t * t * 125 + 4 + t * 10); c.stroke(); }
      for (let i = 0; i < 5; i++) { curve(c, [[192 - i, 122], [140, 160], [60, 220], [-20 - i * 20, 250]], BL, 1 + i * 0.5, 0.5); curve(c, [[208 + i, 122], [260, 160], [340, 220], [420 + i * 20, 250]], CY, 1 + i * 0.5, 0.6); }
    },
    city(c, r) {
      glow(c, 200, 230, 240, CY, 0.35);
      stars(c, r, 50, 0.5);
      for (let x = 0; x < 400;) { const w = 18 + r() * 34, h = 50 + r() * 130; c.fillStyle = '#0b0e09'; c.fillRect(x, 250 - h, w - 3, h);
        for (let wy = 250 - h + 8; wy < 245; wy += 9) for (let wx = x + 4; wx < x + w - 7; wx += 7) if (r() > 0.6) { c.fillStyle = `rgba(${r() > 0.3 ? CY : WH},${0.3 + r() * 0.5})`; c.fillRect(wx, wy, 3, 4); }
        x += w; }
    },
    trails(c, r) {
      for (let i = 0; i < 26; i++) { const o = (i - 13) * 3; curve(c, [[-20, 200 + o], [120, 40 + o * 2], [260, 260 - o], [420, 60 + o]], i % 5 ? CY : WH, i % 5 ? 1 : 1.6, 0.18 + r() * 0.5); }
      glow(c, 200, 140, 120, CY, 0.18);
    },
    orbit(c, r) {
      stars(c, r, 140, 0.9);
      glow(c, 200, 125, 90, CY, 0.55);
      c.fillStyle = '#050605'; c.beginPath(); c.arc(200, 125, 46, 0, 7); c.fill();
      c.strokeStyle = `rgba(${CY},0.9)`; c.lineWidth = 2; c.beginPath(); c.arc(200, 125, 47, 0, 7); c.stroke();
      c.strokeStyle = `rgba(${WH},0.5)`; c.lineWidth = 1.2; c.beginPath(); c.ellipse(200, 125, 120, 22, -0.25, 0, 7); c.stroke();
    },
    tide(c, r) {
      glow(c, 300, 40, 200, BL, 0.35);
      for (let k = 0; k < 18; k++) { c.strokeStyle = `rgba(${k % 3 ? CY : WH},${0.1 + k / 30})`; c.lineWidth = 1; c.beginPath();
        for (let x = 0; x <= 400; x += 8) c.lineTo(x, 110 + k * 8 + Math.sin(x / 40 + k * 0.6) * (10 - k * 0.3)); c.stroke(); }
    },
    stars(c, r) {
      for (let i = 0; i < 160; i++) { const a = r() * 6.28, d = 10 + r() * 230, l = d * 0.12; c.strokeStyle = `rgba(${r() > 0.4 ? WH : CY},${0.2 + (d / 240) * 0.7})`; c.lineWidth = 1; c.beginPath(); c.moveTo(200 + Math.cos(a) * d, 125 + Math.sin(a) * d); c.lineTo(200 + Math.cos(a) * (d + l), 125 + Math.sin(a) * (d + l)); c.stroke(); }
      glow(c, 200, 125, 70, CY, 0.4);
    },
    grid(c, r) {
      glow(c, 200, 120, 220, BL, 0.4);
      stars(c, r, 60, 0.6);
      c.fillStyle = '#080a07'; c.fillRect(0, 130, 400, 120);
      c.strokeStyle = `rgba(${CY},0.55)`; c.lineWidth = 1;
      for (let i = -12; i <= 12; i++) { c.beginPath(); c.moveTo(200 + i * 6, 130); c.lineTo(200 + i * 60, 250); c.stroke(); }
      for (let k = 1; k < 9; k++) { const y = 130 + (k * k) * 1.6; c.beginPath(); c.moveTo(0, y); c.lineTo(400, y); c.stroke(); }
      c.fillStyle = `rgba(${WH},0.95)`; c.fillRect(0, 129, 400, 1.5);
    },
  };
  section.querySelectorAll('.hb canvas[data-scene]').forEach((cv, i) => {
    const c = cv.getContext('2d'), draw = SCENES[cv.dataset.scene];
    if (!c || !draw) return;
    c.fillStyle = '#0a0c08'; c.fillRect(0, 0, 400, 250);
    draw(c, rnd(97 + i * 131));
  });

  // Hanabi's 3D tilt: the thumbnail under the pointer follows it, max 10°.
  if (finePointer && !reduced) {
    section.querySelectorAll('.hb__thumb').forEach((th) => {
      const cv = th.querySelector('canvas');
      th.addEventListener('pointermove', (e) => {
        const b = cv.getBoundingClientRect();
        const x = (e.clientX - b.left) / b.width - 0.5, y = (e.clientY - b.top) / b.height - 0.5;
        cv.style.transition = 'transform 80ms linear';
        cv.style.transform = `rotateX(${(-y * 20).toFixed(2)}deg) rotateY(${(x * 20).toFixed(2)}deg) scale(1.04)`;
      });
      th.addEventListener('pointerleave', () => { cv.style.transition = ''; cv.style.transform = ''; });
    });
  }

  // ---- All repositories, from the shared GitHub feed.
  const list = section.querySelector('.repos__list');
  const status = section.querySelector('.repos__status');
  const FEATURED = new Set(['vexely', 'hanabi-wallpapers']);
  const { esc, ago } = window.GHUtil || {};
  if (!list || !window.GHReady || !esc) return;

  window.GHReady(({ repos, source }) => {
    const rows = repos.filter((r) => !FEATURED.has(r.name.toLowerCase())).slice(0, 10);
    status.textContent = source === 'fallback' ? 'O GitHub não respondeu agora; esta é a última lista conhecida.' : '';
    list.innerHTML = rows.map((r, i) => {
      const color = (T() && T().colorOf(r.name)) || 'var(--glow)';
      const meta = [r.language, ago(r.pushed_at)].filter(Boolean).map(esc).join(' · ');
      return `<li data-reveal style="--i:${i}"><a href="${esc(r.url)}" data-name="${esc(r.name)}">
        <span class="repos__dot" style="background:${esc(color)}" aria-hidden="true"></span>
        <span class="repos__name">${esc(r.name)}</span>
        <span class="repos__meta">${meta}</span>
        <span class="repos__desc${r.description ? '' : ' is-empty'}">${r.description ? esc(r.description) : 'Sem descrição ainda.'}</span>
      </a></li>`;
    }).join('');
    list.querySelectorAll('a').forEach((a) => wire(a, a.dataset.name));
    window.observeReveals && window.observeReveals();
  });
})();
