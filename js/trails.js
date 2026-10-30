// Light trails behind the page: one continuous bundle routed through the sections (page coordinates),
// rendered at a smoothed scroll position. Each strand group is one public repo (window.GHReady).
// data-trail attributes are no longer read (kept harmless in the markup).
(() => {
  const cv = document.getElementById('trails');
  const ctx = cv && cv.getContext && cv.getContext('2d');
  const GLOW = 'rgb(67,200,255)'; // --glow #43c8ff
  if (!ctx) { window.Trails = { highlight() {}, burst() {}, colorOf: () => GLOW }; return; }
  Object.assign(cv.style, { position: 'fixed', inset: '0', width: '100%', height: '100%', pointerEvents: 'none', zIndex: cv.style.zIndex || '0' });

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const lerp = (a, b, t) => a + (b - a) * t;

  let W = 0, H = 0, N = 0;
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
    o, ph: Math.random() * 6.28, f: 0.6 + Math.random() * 1.4, u: Math.random(), gapK: 1.1 * (0.85 + Math.random() * 0.3),
    sp: 0.05 + Math.random() * 0.09, len: 0.08 + Math.random() * 0.12, bp: -1,
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
    if (n !== N) { N = n; build(); } // phone address-bar resizes keep the same strands
    bake();
    if (reduce) redraw();
  }

  // ---- The path: one continuous spine through the whole page, in document px. ----
  // Corners come from the real sections; a cubic B-spline over them (with extra control points every ~d)
  // turns each corner into a slow bend of roughly d of path, and keeps the runs between them straight.
  let STEP = 9, PN = 0, PX, PY, TX, TY, FAN, SPR; // baked polyline, uniform STEP px apart in arc length
  function corners() {
    const doc = document.documentElement.scrollHeight;
    const box = (sel, f0, f1) => {
      const e = document.querySelector(sel);
      if (!e) return { top: doc * f0, bot: doc * f1 };
      const b = e.getBoundingClientRect();
      return { top: b.top + scrollY, bot: b.bottom + scrollY };
    };
    const narrow = W < 700, X = (f) => f * W;
    const R1 = narrow ? 0.86 : 0.78, R2 = narrow ? 0.86 : 0.8, LEFT = narrow ? -0.25 : -0.06;
    const hero = box('#top', 0, 0.14), proj = box('#projetos', 0.14, 0.48), head = box('.num-head', 0.5, 0.53);
    const figs = box('.figs', 0.55, 0.57), jor = box('#jornada', 0.66, 0.79), card = box('.close-card', 0.82, 0.88);
    const yh = (head.bot + figs.top) / 2;           // under the numbers heading row
    const yu = (figs.bot + jor.top) / 2;            // behind the opaque number panels
    const yc1 = Math.max(jor.bot, yu + H), yc2 = Math.max((card.top + card.bot) / 2, yc1 + 0.45 * H);
    return [
      [X(1.05), -0.25 * H],
      [X(narrow ? 0.7 : 0.62), (hero.top + hero.bot) / 2],
      [X(R1), Math.min(proj.top + 0.25 * H, (proj.top + yh) / 2)],
      [X(R1), yh],                                  // vertical down the right, bends into a run right -> left
      [X(LEFT), yh],
      [X(LEFT), yu],                                // U-turn mostly off the left edge
      [X(R2), yu],
      [X(R2), yc1],                                 // vertical down the right through the journey
      [X(LEFT - 0.06), yc1],
      [X(LEFT - 0.06), yc2],                        // second U-turn off the left edge
      [X(0.5), Math.max(yc2 + 0.2 * H, card.bot + 0.1 * H)],
      [X(1.2), doc + 0.3 * H],                      // gentle descent behind the footer wordmark, exits right
    ];
  }
  function bake() {
    const narrow = W < 700, d = (narrow ? 0.42 : 0.5) * H;
    STEP = narrow ? 12 : 10;
    const C = corners(), cp = [C[0], C[0]];
    for (let i = 0; i < C.length - 1; i++) {
      const [x0, y0] = C[i], [x1, y1] = C[i + 1], k = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0) / d));
      for (let j = 0; j < k; j++) cp.push([lerp(x0, x1, j / k), lerp(y0, y1, j / k)]);
    }
    cp.push(C[C.length - 1], C[C.length - 1], C[C.length - 1]);
    // Dense uniform cubic B-spline samples, then resample by arc length.
    const dense = [];
    for (let i = 0; i + 3 < cp.length; i++) {
      const [a, b, c, e] = [cp[i], cp[i + 1], cp[i + 2], cp[i + 3]];
      for (let t = 0; t < 1; t += 1 / 48) {
        const t2 = t * t, t3 = t2 * t;
        const w0 = (1 - 3 * t + 3 * t2 - t3) / 6, w1 = (4 - 6 * t2 + 3 * t3) / 6, w2 = (1 + 3 * t + 3 * t2 - 3 * t3) / 6, w3 = t3 / 6;
        dense.push(w0 * a[0] + w1 * b[0] + w2 * c[0] + w3 * e[0], w0 * a[1] + w1 * b[1] + w2 * c[1] + w3 * e[1]);
      }
    }
    const out = [dense[0], dense[1]];
    let acc = 0;
    for (let i = 2; i < dense.length; i += 2) {
      const x0 = dense[i - 2], y0 = dense[i - 1], seg = Math.hypot(dense[i] - x0, dense[i + 1] - y0);
      let need = STEP - acc;
      while (seg - need >= 0 && seg > 0) { const f = need / seg; out.push(x0 + (dense[i] - x0) * f, y0 + (dense[i + 1] - y0) * f); need += STEP; }
      acc = seg - (need - STEP);
    }
    PN = out.length / 2;
    PX = new Float32Array(PN); PY = new Float32Array(PN); TX = new Float32Array(PN); TY = new Float32Array(PN);
    FAN = new Float32Array(PN); SPR = new Float32Array(PN);
    for (let i = 0; i < PN; i++) { PX[i] = out[i * 2]; PY[i] = out[i * 2 + 1]; }
    const base = (narrow ? 0.15 : 0.11) * W, period = 1.7 * H;
    // Put the bundle's pinch on the run between the numbers heading and the big figures, so they stay readable.
    const mx = (C[3][0] + C[4][0]) / 2, my = C[3][1];
    let pin = 0, pd = 1e18;
    for (let i = 0; i < PN; i++) { const dd = (PX[i] - mx) ** 2 + (PY[i] - my) ** 2; if (dd < pd) { pd = dd; pin = i; } }
    const phase = -Math.PI / 2 - (pin * STEP / period) * 6.283;
    for (let i = 0; i < PN; i++) {
      const a = Math.max(0, i - 2), b = Math.min(PN - 1, i + 2);
      let tx = PX[b] - PX[a], ty = PY[b] - PY[a]; const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
      TX[i] = tx; TY[i] = ty;
      // The bundle pinches and fans slowly along the path, a little wider on the horizontal runs.
      FAN[i] = 0.2 + 0.85 * Math.pow(0.5 + 0.5 * Math.sin((i * STEP / period) * 6.283 + phase), 1.6);
      SPR[i] = base * FAN[i] * (1 + 0.35 * Math.abs(tx));
    }
    pts = new Float32Array(PN * 2); vis = new Int32Array(PN); vx = new Float32Array(PN); vy = new Float32Array(PN);
  }

  const ptr = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5, on: 0, ton: 0 };
  addEventListener('pointermove', (e) => { ptr.tx = e.clientX / W; ptr.ty = e.clientY / H; ptr.ton = 1; }, { passive: true });
  document.addEventListener('pointerout', (e) => { if (!e.relatedTarget) ptr.ton = 0; });

  // Per frame: the visible slice of the path as runs of baked indices (the path re-enters the window).
  let pts = new Float32Array(0), vis = new Int32Array(0), vx = new Float32Array(0), vy = new Float32Array(0);
  let VN = 0, runs = [];
  function slice(viewY) {
    const y0 = viewY - 0.4 * H, y1 = viewY + 1.4 * H, cx = W / 2, cy = viewY + H / 2;
    VN = 0; runs = [];
    let open = -1, best = 1e18, bi = 0;
    for (let i = 0; i < PN; i++) {
      const y = PY[i];
      if (y >= y0 && y <= y1) {
        if (open < 0) { open = VN; runs.push([VN, 0, i]); }
        vis[VN] = i; vx[VN] = PX[i]; vy[VN] = y - viewY; VN++;
        const dd = (PX[i] - cx) ** 2 + (y - cy) ** 2; if (dd < best) { best = dd; bi = i; }
      } else if (open >= 0) { runs[runs.length - 1][1] = VN; open = -1; }
    }
    if (open >= 0) runs[runs.length - 1][1] = VN;
    return bi;
  }
  function strandPath(s, time) {
    const pull = ptr.on > 0.01, sig = 2 * (Math.max(W, H) * 0.18) ** 2, mx = ptr.x * W, my = ptr.y * H;
    const wk = (9 * s.f) / (Math.max(W, H) * 1.3), wa = 0.012 * W, ph = time * 0.7 + s.ph;
    for (let j = 0; j < VN; j++) {
      const i = vis[j], fan = FAN[i];
      const off = s.o * SPR[i] + Math.sin(i * STEP * wk + ph) * wa * (0.4 + fan);
      let px = vx[j] - TY[i] * off, py = vy[j] + TX[i] * off;
      if (pull) {
        const dx = mx - px, dy = my - py, f = ptr.on * 0.28 * Math.exp(-(dx * dx + dy * dy) / sig);
        px += dx * f; py += dy * f;
      }
      pts[j * 2] = px; pts[j * 2 + 1] = py;
    }
  }
  function traceAll() {
    ctx.beginPath();
    for (const [a, b] of runs) {
      if (b - a < 2) continue;
      ctx.moveTo(pts[a * 2], pts[a * 2 + 1]);
      for (let j = a + 1; j < b; j++) ctx.lineTo(pts[j * 2], pts[j * 2 + 1]);
    }
  }
  // Draw the arc-length range [lo, hi] (px) wherever it falls inside the visible runs.
  function traceArc(lo, hi) {
    let any = false;
    ctx.beginPath();
    for (const [a, b, i0] of runs) {
      const A = i0 * STEP, B = (i0 + b - a - 1) * STEP;
      if (hi <= A || lo >= B) continue;
      const j0 = a + Math.floor((Math.max(lo, A) - A) / STEP), j1 = a + Math.ceil((Math.min(hi, B) - A) / STEP);
      if (j1 <= j0) continue;
      ctx.moveTo(pts[j0 * 2], pts[j0 * 2 + 1]);
      for (let j = j0 + 1; j <= j1; j++) ctx.lineTo(pts[j * 2], pts[j * 2 + 1]);
      any = true;
    }
    return any;
  }
  function tail(s, head, len, alpha, width, core) {
    for (let k = 0; k < 5; k++) {
      if (traceArc(head - len * (k + 1) / 5, head - len * k / 5)) {
        ctx.strokeStyle = col(s, s.o * 0.6, (0.55 - k * 0.1) * (0.4 + core) * alpha);
        ctx.lineWidth = (1.6 - k * 0.2) * width; ctx.stroke();
      }
    }
  }
  // White-cyan core, the strand's own blue at the edges.
  function col(s, o, a) {
    const k = Math.min(1, Math.abs(o) * 1.4), e = s.edge;
    return `rgba(${Math.round(lerp(210, e[0], k))},${Math.round(lerp(240, e[1], k))},${Math.round(lerp(255, e[2], k))},${Math.min(1, a)})`;
  }
  const glowAt = { x: 0, y: 0, set: false };
  function haze(viewY) {
    const R = Math.max(W, H) * 0.55, x = glowAt.x, y = glowAt.y - viewY;
    const g = ctx.createRadialGradient(x, y, 0, x, y, R);
    g.addColorStop(0, 'rgba(42,107,255,0.22)'); g.addColorStop(0.45, 'rgba(20,50,160,0.08)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }

  let last = performance.now(), time = 0, raf = 0, viewY = scrollY;
  // Arc position of the path where it first enters the top of the window (for bursts).
  function arcAtTop() {
    for (let j = 0; j < VN; j++) if (vy[j] >= -0.05 * H && vx[j] > -0.1 * W && vx[j] < 1.1 * W) return vis[j] * STEP;
    return VN ? vis[0] * STEP : 0;
  }
  function draw(now = performance.now()) {
    raf = 0;
    const dt = reduce ? 0 : Math.min(0.05, (now - last) / 1000); last = now; time += dt;
    ptr.x += (ptr.tx - ptr.x) * 0.06; ptr.y += (ptr.ty - ptr.y) * 0.06; ptr.on += (ptr.ton - ptr.on) * 0.05;
    // The light glides after the page: ~0.12 per 60fps frame, frame-rate independent, settles exactly.
    const target = scrollY;
    if (reduce) viewY = target;
    else { viewY += (target - viewY) * (1 - Math.exp(-dt * 7.7)); if (Math.abs(target - viewY) < 0.25) viewY = target; }
    const k200 = reduce ? 1 : 1 - Math.exp(-dt / 0.07); // ~200ms to settle

    const near = slice(viewY);
    const kg = reduce || !glowAt.set ? 1 : 1 - Math.exp(-dt * 4);
    glowAt.x += (PX[near] - glowAt.x) * kg; glowAt.y += (PY[near] - glowAt.y) * kg; glowAt.set = true;

    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#02040b'; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';
    haze(viewY);
    ctx.lineCap = 'round';

    const S = Math.max(W, H) * 1.3, total = PN * STEP;
    for (const s of strands) {
      s.hl += (s.tgt - s.hl) * k200;
      s.boost = Math.max(0, s.boost - dt * 0.45);
      if (!VN) continue;
      strandPath(s, time);
      const core = 1 - Math.min(1, Math.abs(s.o)), a = s.hl, thick = 1 + Math.max(0, s.hl - 1) * 0.5;
      traceAll();
      ctx.strokeStyle = col(s, s.o, (0.035 + core * 0.05) * a); ctx.lineWidth = 5 * thick; ctx.stroke();
      ctx.strokeStyle = col(s, s.o, (0.10 + core * 0.22) * a); ctx.lineWidth = 0.9 * thick; ctx.stroke();
      // Regular pulses, ~1.1 viewport heights apart along the whole path, at the repo's speed.
      const gap = s.gapK * H, len = s.len * S, v = s.sp * S;
      s.u = (s.u + (v * dt) / gap) % 1;
      const r0 = runs[0][2] * STEP, lr = runs[runs.length - 1];
      const r1 = (lr[2] + lr[1] - lr[0]) * STEP + len;
      for (let k = Math.floor(r0 / gap - s.u); (k + s.u) * gap - len < r1 && k * gap < total + gap; k++) {
        const h = (k + s.u) * gap;
        if (h > 0) tail(s, h, len, a * s.lum, thick, core);
      }
      // The burst pulse: launched near the top of the window, brighter, faster.
      if (s.bp >= 0) {
        s.bp += v * 2.5 * dt + 260 * dt;
        if (s.boost <= 0 || s.bp - len > total) s.bp = -1;
        else tail(s, s.bp, len * 1.4, a * s.lum * (1 + s.boost * 2.2), thick * (1 + s.boost * 0.6), core);
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
    const at = arcAtTop();
    e.strands.forEach((s) => { s.bp = at - Math.random() * 80; s.boost = 1; });
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
  // Layout changes (fonts, data-filled lists) move the sections: re-route the path. viewY is kept, so nothing jumps.
  if ('ResizeObserver' in window) new ResizeObserver(() => { if (W) { bake(); if (reduce) redraw(); } }).observe(document.body);
  if (reduce) addEventListener('scroll', redraw, { passive: true });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { last = performance.now(); redraw(); } });
  resize();
  redraw();
})();
