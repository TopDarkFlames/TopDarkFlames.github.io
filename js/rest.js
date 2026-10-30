// #numeros figures + charts from GH data, and the fitted footer wordmark.
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => window.GHUtil ? GHUtil.esc(s) : String(s ?? '');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const DAYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
  const DAYS_LONG = ['no domingo', 'na segunda', 'na terça', 'na quarta', 'na quinta', 'na sexta', 'no sábado'];

  const figs = $('.figs');
  if (figs) {
    let seen = false, counted = false, last = null;

    const setFig = (key, n) => { const el = $(`[data-fig="${key}"]`); if (el) el.textContent = n; };
    const count = (vals) => {
      const t0 = performance.now();
      const step = (t) => {
        const k = Math.min(1, (t - t0) / 700), e = 1 - (1 - k) ** 3;
        for (const [key, n] of Object.entries(vals)) setFig(key, Math.round(n * e));
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    // Keep "—" until the row is on screen, then count once; later refreshes just set the numbers.
    const show = () => {
      if (!last || !seen) return;
      if (counted || reduce) for (const [k, n] of Object.entries(last)) setFig(k, n);
      else { counted = true; count(last); }
    };
    // Count once when the row is on screen; until then keep "—" so the count-up is visible.
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { seen = true; io.disconnect(); show(); } });
      io.observe(figs);
    } else seen = true;

    const link = $('[data-fig-link]');
    let newest = null;
    if (link) {
      link.addEventListener('mouseenter', () => newest && window.Trails && Trails.highlight(newest));
      link.addEventListener('focusin', () => newest && window.Trails && Trails.highlight(newest));
      link.addEventListener('mouseleave', () => window.Trails && Trails.highlight(null));
      link.addEventListener('focusout', () => window.Trails && Trails.highlight(null));
      link.addEventListener('click', () => { if (newest && matchMedia('(hover: none)').matches && window.Trails) Trails.burst(newest); });
    }

    window.GHReady && GHReady(({ repos }) => {
      const langs = new Map();
      repos.forEach((r) => r.language && langs.set(r.language, (langs.get(r.language) || 0) + 1));
      const sorted = [...langs].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

      // Last push: hours under 48h, else days.
      const top = repos[0];
      const unit = $('[data-fig-unit]'), cap = $('[data-fig-cap="push"]');
      let push = 0;
      if (top) {
        const h = Math.max(0, (Date.now() - new Date(top.pushed_at)) / 36e5);
        if (h < 48) { push = Math.floor(h); unit.textContent = ' h'; cap.textContent = 'desde o último push'; }
        else { push = Math.floor(h / 24); unit.textContent = ''; cap.textContent = `${push === 1 ? 'dia' : 'dias'} desde o último push`; }
        newest = top.name;
        link.href = top.url; link.target = '_blank'; link.rel = 'noreferrer';
        link.setAttribute('aria-label', `${push}${unit.textContent} ${cap.textContent}: ${top.name}`);
        link.title = top.name;
      } else { unit.textContent = ''; cap.textContent = 'desde o último push'; link.removeAttribute('href'); newest = null; }
      last = { repos: repos.length, langs: langs.size };
      if (top) last.push = push; else setFig('push', '—');
      show();

      // Language bars
      const list = $('[data-langs]'), meta = $('[data-langs-meta]');
      const max = sorted.length ? sorted[0][1] : 1;
      meta.textContent = repos.length ? `${repos.length} ${repos.length === 1 ? 'repositório' : 'repositórios'}` : '';
      list.innerHTML = sorted.length
        ? sorted.map(([l, n]) => `<li class="langbar"><span class="langbar-name">${esc(l)}</span><span class="langbar-track" aria-hidden="true"><i style="--w:${(n / max) * 100}%"></i></span><span class="langbar-n">${n}</span></li>`).join('')
        : '<li class="ui-empty">Nenhuma linguagem para contar ainda.</li>';

      // Weekday of each repo's last push (viewer's local time zone).
      const wk = [0, 0, 0, 0, 0, 0, 0];
      repos.forEach((r) => { const d = new Date(r.pushed_at); if (!isNaN(d)) wk[d.getDay()]++; });
      const wmax = Math.max(...wk), box = $('[data-week]'), find = $('[data-week-find]');
      if (!wmax) { box.innerHTML = '<p class="ui-empty">Sem pushes para contar ainda.</p>'; find.textContent = ''; return; }
      box.setAttribute('role', 'img');
      box.setAttribute('aria-label', wk.map((n, i) => `${DAYS[i]}: ${n}`).join(', '));
      box.innerHTML = wk.map((n, i) => `<div class="wk${n === wmax ? ' wk--top' : ''}"><span class="wk-n">${n}</span><span class="wk-col"><i style="--h:${(n / wmax) * 100}%"></i></span><span class="wk-d">${DAYS[i]}</span></div>`).join('');
      const tops = wk.map((n, i) => (n === wmax ? i : -1)).filter((i) => i >= 0);
      find.textContent = tops.length === 1 ? `Mais pushes ${DAYS_LONG[tops[0]]}.`
        : tops.length === 7 ? 'Pushes espalhados por igual na semana.'
        : `Empate: mais pushes ${tops.slice(0, -1).map((i) => DAYS_LONG[i]).join(', ')} e ${DAYS_LONG[tops.at(-1)]}.`;
    });
  }

  // Wordmark: scale font so each line fills the container width.
  const mark = $('.foot-mark');
  if (mark) {
    // Each span (one line on desktop, two stacked on phone) is scaled to the container width.
    const fit = () => {
      const w = mark.clientWidth, spans = [...mark.children];
      const stacked = getComputedStyle(spans[0]).display === 'block';
      mark.style.fontSize = '100px'; spans.forEach((s) => { s.style.fontSize = ''; });
      if (stacked) spans.forEach((s) => { s.style.fontSize = `${(100 * w * 0.99) / s.offsetWidth}px`; });
      else mark.style.fontSize = `${(100 * w * 0.99) / spans.reduce((a, s) => a + s.offsetWidth, 0)}px`;
    };
    fit();
    document.fonts && document.fonts.ready.then(fit);
    addEventListener('resize', fit);
  }
})();
