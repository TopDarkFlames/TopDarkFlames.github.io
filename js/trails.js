// Light trails behind the page. Each strand group is one public repo (window.GHReady);
// sections pick the bundle's shape with data-trail="s|curtain|mist|wave".
(() => {
  const cv = document.getElementById('trails');
  const ctx = cv && cv.getContext && cv.getContext('2d');
  const GLOW = 'rgb(67,200,255)'; // --glow #43c8ff
  if (!ctx) { window.Trails = { highlight() {}, burst() {}, colorOf: () => GLOW }; return; }
  Object.assign(cv.style, { position: 'fixed', inset: '0', width: '100%', height: '100%', pointerEvents: 'none', zIndex: cv.style.zIndex || '0' });

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = (t) => t * t * (3 - 2 * t);
  const clamp01 = (t) => Math.max(0, Math.min(1, t));

  // Spines (cubic Bézier, viewport-normalised) from the approved prototype; mist is wide and faint so figures read over it.
  const SHAPES = {
    s: { p: [[0.3, 1.1], [0.62, 0.95], [0.5, 0.1], [1.1, 0.18]], spread: 0.11, knot: 0.45, alpha: 1 },
    curtain: { p: [[0.62, -0.1], [1.05, 0.3], [0.5, 0.7], [0.98, 1.1]], spread: 0.15, knot: 0.5, alpha: 1 },
    mist: { p: [[-0.1, 1.05], [0.35, 0.75], [0.6, 0.3], [1.1, -0.05]], spread: 0.35, knot: 0.5, alpha: 0.55 },
    wave: { p: [[-0.1, 0.62], [0.3, 0.35], [0.7, 0.95], [1.1, 0.7]], spread: 0.09, knot: 0.55, alpha: 1 },
  };

  let W = 0, H = 0, N = 0, SAMPLES = 96;
  let strands = [], repos = [], hlKey = null, fired = false;
  const byKey = new Map(); // lowercase repo name -> { rgb, strands }

  // Quantile -> offset across the bundle: dense in the core, sparse at the edges (like the prototype's ~gaussian).
  const spreadOf = (q) => { const x = 2 * q - 1; return 0.55 * x + 0.45 * x * x * x; };
  const hash = (s) => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return (h >>> 0) / 4294967296; };
  const hsl = (h, s, l) => { // -> [r,g,b]
    const a = s * Math.min(l, 1 - l), f = (n) => { const k = (n + h / 30) % 12; return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); };
    return [f(0), f(8), f(4)].map((v) => Math.round(v * 255));
  };

  const strand = (o, extra) => ({
    o, ph: Math.random() * 6.28, f: 0.6 + Math.random() * 1.4, p: Math.random(),
    sp: 0.05 + Math.random() * 0.09, len: 0.08 + Math.random() * 0.12,
    key: null, edge: [30, 95, 255], lum: 1, hl: 1, tgt: 1, boost: 0, ...extra,
  });

  function build() {
    byKey.clear();
    const list = repos.slice(0, 12);
    if (!list.length) { // anonymous strands, exactly like the prototype
      strands = Array.from({ length: N }, () => strand((Math.random() + Math.random() + Math.random()) / 1.5 - 1));
      return;
    }
    const now = Date.now();
    const rec = list.map((r) => 1 / (1 + Math.max(0, now - new Date(r.pushed_at)) / 864e5 / 14));
    // Min 3 strands each, the rest by recency weight (largest remainder).
    const free = Math.max(0, N - 3 * list.length), sum = rec.reduce((a, b) => a + b, 0);
    const raw = rec.map((w) => (free * w) / sum), count = raw.map((v) => 3 + Math.floor(v));
    let left = N - count.reduce((a, b) => a + b, 0);
    raw.map((v, i) => [v - Math.floor(v), i]).sort((a, b) => b[0] - a[0]).forEach(([, i]) => { if (left-- > 0) count[i]++; });
    // Bands across the bundle, newest in the bright core, older ones alternating outward.
    const order = [];
    list.forEach((_, i) => (i % 2 ? order.push(i) : order.unshift(i)));
    const total = count.reduce((a, b) => a + b, 0);
    strands = [];
    let q = 0;
    for (const i of order) {
      const r = list[i], key = r.name.toLowerCase(), hue = 200 + hash(key) * 25;
      const edge = hsl(hue, 1, 0.56), entry = { key, rgb: `rgb(${hsl(hue, 1, 0.66).join(',')})`, strands: [], rank: i };
      for (let k = 0; k < count[i]; k++) {
        const s = strand(spreadOf(q + ((k + 0.2 + Math.random() * 0.6) / count[i]) * (count[i] / total)), {
          key, edge, lum: 0.55 + 0.6 * rec[i], sp: (0.04 + Math.random() * 0.05) * (0.6 + 1.2 * rec[i]),
        });
        strands.push(s); entry.strands.push(s);
      }
      q += count[i] / total;
      byKey.set(key, entry);
    }
    setTargets();
  }

  function resize() {
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    W = innerWidth; H = innerHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = W < 700 ? 46 : 96;
    SAMPLES = W < 700 ? 64 : 96;
    if (n !== N) { N = n; build(); } // phone address-bar resizes keep the same strands
    measure();
    if (reduce) draw();
  }

  // Scenes: absolute section tops, recomputed on resize / DOM size changes.
  let scenes = [];
  function measure() {
    scenes = [...document.querySelectorAll('[data-trail]')]
      .map((el) => ({ top: el.getBoundingClientRect().top + scrollY, sh: SHAPES[el.dataset.trail] || SHAPES.s }));
  }
  function mix(A, B, t) {
    t = ease(clamp01(t));
    return { p: A.p.map((pt, k) => [lerp(pt[0], B.p[k][0], t), lerp(pt[1], B.p[k][1], t)]),
      spread: lerp(A.spread, B.spread, t), knot: lerp(A.knot, B.knot, t), alpha: lerp(A.alpha, B.alpha, t) };
  }
  function shapeNow() {
    if (!scenes.length) return SHAPES.s;
    const c = scrollY + H / 2;
    let i = 0;
    while (i + 1 < scenes.length && scenes[i + 1].top <= c) i++;
    const cur = scenes[i], next = scenes[i + 1], prev = scenes[i - 1];
    // Morph across a viewport-tall zone centred on each boundary.
    if (next && c > next.top - H / 2) return mix(cur.sh, next.sh, (c - (next.top - H / 2)) / H);
    if (prev && c < cur.top + H / 2) return mix(prev.sh, cur.sh, (c - (cur.top - H / 2)) / H);
    return cur.sh;
  }

  const ptr = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5, on: 0, ton: 0 };
  addEventListener('pointermove', (e) => { ptr.tx = e.clientX / W; ptr.ty = e.clientY / H; ptr.ton = 1; }, { passive: true });
  document.addEventListener('pointerout', (e) => { if (!e.relatedTarget) ptr.ton = 0; });

  const bez = (p, t) => {
    const m = 1 - t, a = m * m * m, b = 3 * m * m * t, c = 3 * m * t * t, d = t * t * t;
    return [a * p[0][0] + b * p[1][0] + c * p[2][0] + d * p[3][0], a * p[0][1] + b * p[1][1] + c * p[2][1] + d * p[3][1]];
  };

  // The spine is shared by every strand: evaluate it once per frame.
  let spine = new Float32Array(0), pts = new Float32Array(0);
  function buildSpine(sh) {
    if (spine.length !== (SAMPLES + 1) * 5) { spine = new Float32Array((SAMPLES + 1) * 5); pts = new Float32Array((SAMPLES + 1) * 2); }
    for (let j = 0; j <= SAMPLES; j++) {
      const t = j / SAMPLES, [x, y] = bez(sh.p, t), [x2, y2] = bez(sh.p, Math.min(1, t + 0.01));
      let nx = -(y2 - y), ny = x2 - x; const nl = Math.hypot(nx, ny) || 1;
      spine.set([x, y, nx / nl, ny / nl, 0.18 + Math.pow(Math.abs(t - sh.knot) * 1.6, 1.4)], j * 5);
    }
  }
  function strandPath(sh, s, time) {
    const pull = ptr.on > 0.01, sig = 2 * (Math.max(W, H) * 0.18) ** 2, mx = ptr.x * W, my = ptr.y * H, asp = W / H;
    for (let j = 0; j <= SAMPLES; j++) {
      const t = j / SAMPLES, b = j * 5, fan = spine[b + 4];
      const off = s.o * sh.spread * fan + Math.sin(t * 9 * s.f + time * 0.7 + s.ph) * 0.012 * (0.4 + fan);
      let px = (spine[b] + spine[b + 2] * off) * W, py = (spine[b + 1] + spine[b + 3] * off * asp) * H;
      if (pull) {
        const dx = mx - px, dy = my - py, f = ptr.on * 0.28 * Math.exp(-(dx * dx + dy * dy) / sig);
        px += dx * f; py += dy * f;
      }
      pts[j * 2] = px; pts[j * 2 + 1] = py;
    }
  }
  function drawRange(a, b) {
    const j0 = Math.max(0, Math.floor(a * SAMPLES)), j1 = Math.min(SAMPLES, Math.ceil(b * SAMPLES));
    if (j1 - j0 < 1) return false;
    ctx.beginPath(); ctx.moveTo(pts[j0 * 2], pts[j0 * 2 + 1]);
    for (let j = j0 + 1; j <= j1; j++) ctx.lineTo(pts[j * 2], pts[j * 2 + 1]);
    return true;
  }
  // White-cyan core, the strand's own blue at the edges.
  function col(s, o, a) {
    const k = Math.min(1, Math.abs(o) * 1.4), e = s.edge;
    return `rgba(${Math.round(lerp(210, e[0], k))},${Math.round(lerp(240, e[1], k))},${Math.round(lerp(255, e[2], k))},${Math.min(1, a)})`;
  }
  function haze(sh) {
    const [kx, ky] = bez(sh.p, sh.knot), R = Math.max(W, H) * 0.55;
    const g = ctx.createRadialGradient(kx * W, ky * H, 0, kx * W, ky * H, R);
    g.addColorStop(0, `rgba(42,107,255,${0.22 * sh.alpha})`); g.addColorStop(0.45, `rgba(20,50,160,${0.08 * sh.alpha})`); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }

  let last = performance.now(), time = 0, raf = 0;
  function draw(now = performance.now()) {
    raf = 0;
    const dt = reduce ? 0 : Math.min(0.05, (now - last) / 1000); last = now; time += dt;
    ptr.x += (ptr.tx - ptr.x) * 0.06; ptr.y += (ptr.ty - ptr.y) * 0.06; ptr.on += (ptr.ton - ptr.on) * 0.05;
    const sh = shapeNow(), A = sh.alpha, k200 = reduce ? 1 : 1 - Math.exp(-dt / 0.07); // ~200ms to settle
    buildSpine(sh);

    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#02040b'; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';
    haze(sh);
    ctx.lineCap = 'round';

    for (const s of strands) {
      s.hl += (s.tgt - s.hl) * k200;
      s.boost = Math.max(0, s.boost - dt * 0.45);
      strandPath(sh, s, time);
      const core = 1 - Math.min(1, Math.abs(s.o)), a = A * s.hl, thick = 1 + Math.max(0, s.hl - 1) * 0.5;
      if (drawRange(0, 1)) {
        ctx.strokeStyle = col(s, s.o, (0.035 + core * 0.05) * a); ctx.lineWidth = 5 * thick; ctx.stroke();
        ctx.strokeStyle = col(s, s.o, (0.10 + core * 0.22) * a); ctx.lineWidth = 0.9 * thick; ctx.stroke();
      }
      s.p += s.sp * dt * (1 + s.boost * 1.5);
      if (s.p > 1 + s.len) s.p = -Math.random() * 0.4;
      const pa = a * s.lum * (1 + s.boost * 2.2);
      for (let k = 0; k < 5; k++) {
        const lo = s.p - s.len * (k + 1) / 5, hi = s.p - s.len * k / 5;
        if (hi <= 0 || lo >= 1) continue;
        if (drawRange(Math.max(0, lo), Math.min(1, hi))) {
          ctx.strokeStyle = col(s, s.o * 0.6, (0.55 - k * 0.1) * (0.4 + core) * pa);
          ctx.lineWidth = (1.6 - k * 0.2) * thick * (1 + s.boost * 0.6); ctx.stroke();
        }
      }
    }
    if (!reduce && !document.hidden) raf = requestAnimationFrame(draw);
  }
  const redraw = () => { if (!raf && !document.hidden) raf = requestAnimationFrame(draw); };

  function setTargets() {
    for (const s of strands) s.tgt = !hlKey ? 1 : s.key === hlKey ? 1.6 : 0.25;
    if (reduce) { strands.forEach((s) => { s.hl = s.tgt; }); redraw(); }
  }
  function burst(name) {
    const e = name && byKey.get(String(name).toLowerCase());
    if (!e || reduce) return;
    e.strands.forEach((s) => { s.p = -Math.random() * 0.06; s.boost = 1; });
  }

  window.Trails = {
    highlight(name) {
      const key = name ? String(name).toLowerCase() : null;
      hlKey = key && byKey.has(key) ? key : null; // unknown repos (beyond the 12 drawn) leave the bundle as is
      setTargets();
    },
    burst,
    colorOf(name) { const e = name && byKey.get(String(name).toLowerCase()); return e ? e.rgb : GLOW; },
  };

  if (window.GHReady) window.GHReady((d) => {
    const next = (d && d.repos) || [];
    const sig = (l) => l.slice(0, 12).map((r) => r.name).join('|');
    if (sig(next) === sig(repos) && strands.length) return; // periodic refresh, same repos: keep strands steady
    repos = next;
    build();
    if (fired || !byKey.size) return;
    fired = true; // the one orchestrated load moment: repo by repo, newest first
    [...byKey.values()].sort((a, b) => a.rank - b.rank).forEach((e, i) => setTimeout(() => burst(e.key), i * 120));
  });

  addEventListener('resize', resize);
  if ('ResizeObserver' in window) new ResizeObserver(() => { measure(); if (reduce) redraw(); }).observe(document.body);
  if (reduce) addEventListener('scroll', redraw, { passive: true });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { last = performance.now(); redraw(); } });
  resize();
  redraw();
})();
