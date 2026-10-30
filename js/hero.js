// Hero: top bar state, GitHub status line, live repo feed wired to the trails.
(() => {
  const bar = document.getElementById('bar');
  const list = document.getElementById('feed-list');
  if (!bar || !list) return;

  const T = (fn, ...a) => window.Trails && typeof Trails[fn] === 'function' ? Trails[fn](...a) : undefined;
  const touch = matchMedia('(hover: none)').matches;
  if (touch) document.getElementById('feed-hint').textContent = 'Toque num repositório para acender o fio dele.';

  const onScroll = () => bar.classList.toggle('is-scrolled', scrollY > 40);
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const status = bar.querySelector('.bar__status');
  const statusText = status.querySelector('.bar__status-text');
  const LABEL = { live: 'GitHub sincronizado', cache: 'Lista salva do GitHub', fallback: 'GitHub indisponível agora' };
  const atEl = document.getElementById('feed-at');

  const { esc, ago } = window.GHUtil || {};
  if (!esc) return;

  function render({ repos, source, at }) {
    statusText.textContent = LABEL[source] || LABEL.fallback;
    status.classList.toggle('is-off', source === 'fallback');
    atEl.textContent = 'atualizado às ' + new Date(at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    list.innerHTML = repos.slice(0, 6).map((r) => {
      const color = T('colorOf', r.name) || 'var(--glow)';
      return `<li class="feed__row"><a class="feed__link" href="${esc(r.url)}" target="_blank" rel="noreferrer" data-repo="${esc(r.name)}">
        <span class="feed__dot" style="background:${esc(color)}" aria-hidden="true"></span>
        <span class="feed__name">${esc(r.name)}</span>
        <span class="feed__lang">${esc(r.language)}</span>
        <span class="feed__ago">${esc(ago(r.pushed_at))}</span></a></li>`;
    }).join('') || '<li class="feed__empty">Nenhum repositório público ainda.</li>';
  }

  // Delegated so re-renders keep working.
  const repoOf = (e) => e.target.closest && e.target.closest('[data-repo]');
  const on = (e) => { const a = repoOf(e); if (a) T('highlight', a.dataset.repo); };
  const off = (e) => { const a = repoOf(e); if (a && !a.contains(e.relatedTarget)) T('highlight', null); };
  list.addEventListener('mouseover', on);
  list.addEventListener('mouseout', off);
  list.addEventListener('focusin', on);
  list.addEventListener('focusout', off);
  list.addEventListener('pointerdown', (e) => {
    const a = repoOf(e);
    if (a && e.pointerType !== 'mouse') { T('highlight', a.dataset.repo); T('burst', a.dataset.repo); }
  });

  window.GHReady(render);
})();
