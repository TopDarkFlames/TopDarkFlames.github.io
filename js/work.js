// Projetos: live GitHub repos, each drawn as a poster of the fluted-glass light.
(function () {
  var section = document.getElementById('projetos');
  if (!section) return;
  var list = section.querySelector('.work__list');
  var status = section.querySelector('.work__status');

  var USER = 'TopDarkFlames';
  var API = 'https://api.github.com/users/' + USER + '/repos?sort=pushed&per_page=100';
  var CACHE_KEY = 'work:repos';
  var REFRESH_MS = 5 * 60 * 1000; // unauthenticated API allows 60 requests/hour per IP
  var PLACES = ['a', 'b', 'c'];

  var fallbackRepos = [
    { name: 'TopDarkFlames.github.io', html_url: 'https://github.com/TopDarkFlames/TopDarkFlames.github.io', description: 'Este portfólio, publicado no GitHub Pages.', language: 'HTML', stargazers_count: 0, pushed_at: '2026-10-30T12:00:00Z' },
    { name: 'hanabi-wallpapers', html_url: 'https://github.com/TopDarkFlames/hanabi-wallpapers', description: 'Seletor de wallpapers para o GNOME com Hanabi.', language: 'Python', stargazers_count: 0, pushed_at: '2026-10-29T12:00:00Z' },
    { name: 'pixelmon-gts-signal', html_url: 'https://github.com/TopDarkFlames/pixelmon-gts-signal', description: 'Painel e automação para monitorar o GTS Global do Pixelmon em tempo real.', language: 'Ruby', stargazers_count: 0, pushed_at: '2026-07-29T12:22:07Z' },
    { name: 'TopDarkFlames', html_url: 'https://github.com/TopDarkFlames/TopDarkFlames', description: 'Repositório do perfil com stack, estudos e presença no GitHub.', language: 'Markdown', stargazers_count: 0, pushed_at: '2026-05-04T04:51:40Z' }
  ];

  function esc(v) {
    return String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }
  // Only links to github.com go into href.
  function safeUrl(u) { return /^https:\/\/github\.com\//.test(u || '') ? u : 'https://github.com/' + USER; }

  function relative(dateString) {
    var s = Math.max(1, Math.floor((Date.now() - new Date(dateString).getTime()) / 1000));
    var units = [['ano', 'anos', 31536000], ['mês', 'meses', 2592000], ['dia', 'dias', 86400], ['hora', 'horas', 3600], ['minuto', 'minutos', 60]];
    for (var i = 0; i < units.length; i++) {
      var n = Math.floor(s / units[i][2]);
      if (n >= 1) return 'atualizado há ' + n + ' ' + (n > 1 ? units[i][1] : units[i][0]);
    }
    return 'atualizado agora';
  }

  function describe(repo) {
    if (repo.description) return repo.description;
    if (repo.name === USER + '.github.io') return 'Este portfólio, publicado no GitHub Pages.';
    if (repo.name === USER) return 'Repositório especial que alimenta o README do perfil.';
    return 'Projeto público em andamento no GitHub.';
  }

  function seedFromName(name) { // FNV-1a
    var h = 2166136261;
    for (var i = 0; i < name.length; i++) { h ^= name.charCodeAt(i); h = Math.imul(h, 16777619); }
    return (h >>> 0) % 100000;
  }

  // "TopDarkFlames.github.io" -> ["TopDarkFlames.", "github.", "io"], max 3 lines.
  function nameLines(name) {
    var parts = name.match(/[^-_.]+[-_.]*/g) || [name];
    while (parts.length > 3) parts.splice(parts.length - 2, 2, parts[parts.length - 2] + parts[parts.length - 1]);
    return parts;
  }

  function pick(repos) {
    return repos.filter(function (r) { return !r.archived; })
      .sort(function (a, b) { return new Date(b.pushed_at) - new Date(a.pushed_at); })
      .slice(0, 6)
      .map(function (r) {
        return { name: r.name, html_url: r.html_url, description: r.description, language: r.language, stargazers_count: r.stargazers_count || 0, pushed_at: r.pushed_at };
      });
  }

  var remark = '<p class="work__remark" data-reveal>Tudo aqui é código aberto.<br>Pode olhar, copiar e melhorar.</p>';

  function projectHtml(repo, i) {
    var url = esc(safeUrl(repo.html_url));
    var meta = [repo.language, relative(repo.pushed_at)].filter(Boolean).map(esc).join(' · ');
    var lines = nameLines(repo.name).map(function (l) { return '<span>' + esc(l) + '</span>'; }).join('');
    // 6 posters: a,b,c,a,b,c. a+b share a grid row, c gets its own.
    var row = Math.floor(i / 3) * 2 + (i % 3 === 2 ? 2 : 1);
    return '<article class="proj proj--' + PLACES[i % 3] + '" style="--row:' + row + '">' +
      '<h3 class="work__sr">' + esc(repo.name) + '</h3>' +
      '<p class="proj__meta" data-reveal style="--i:0">' + meta + '</p>' +
      '<a class="proj__frame" href="' + url + '" target="_blank" rel="noreferrer" tabindex="-1" aria-hidden="true" data-reveal style="--i:1" data-seed="' + seedFromName(repo.name) + '">' +
        '<span class="proj__art"></span>' +
        '<svg class="proj__mark"><use href="#asterisk"/></svg>' +
        '<p class="proj__name">' + lines + '</p>' +
      '</a>' +
      '<p class="proj__desc" data-reveal style="--i:2">' + esc(describe(repo)) + '</p>' +
      '<p class="proj__foot" data-reveal style="--i:3"><span aria-label="' + esc(repo.stargazers_count) + ' estrelas">★ ' + esc(repo.stargazers_count) + '</span>' +
        '<a class="proj__link" href="' + url + '" target="_blank" rel="noreferrer">Ver no GitHub<span class="work__sr"> — ' + esc(repo.name) + '</span></a></p>' +
    '</article>';
  }

  // Font size in cqi so the longest line fills 88% of the poster width (and the block stays under ~62% of its height).
  function fitNames() {
    list.querySelectorAll('.proj__frame').forEach(function (frame) {
      var name = frame.querySelector('.proj__name');
      name.style.fontSize = '100px';
      var widest = 0;
      name.querySelectorAll('span').forEach(function (s) { widest = Math.max(widest, s.getBoundingClientRect().width); });
      if (!widest || !frame.clientWidth) return;
      var byWidth = 8800 / widest; // cqi, measured at 100px: independent of the box width
      var byHeight = 56 * (frame.clientHeight / frame.clientWidth) / (0.86 * name.children.length);
      name.style.fontSize = Math.min(byWidth, byHeight).toFixed(2) + 'cqi';
    });
  }

  var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { if (e.isIntersecting) { io.unobserve(e.target); paint(e.target); } });
  }, { rootMargin: '600px 0px' }) : null;

  function paint(frame) {
    if (!window.VFX || !window.VFX.still) return; // flat --ground-2 cover stays
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = Math.min(frame.clientWidth * dpr, 1600);
    var h = w * frame.clientHeight / frame.clientWidth;
    if (!w || !h) return;
    window.VFX.still(+frame.dataset.seed, w, h).then(function (url) {
      frame.querySelector('.proj__art').style.backgroundImage = 'url("' + url + '")';
    }).catch(function () {});
  }

  var shown = '';
  function render(repos) {
    var sig = JSON.stringify(repos);
    if (sig === shown) { // same list: refresh the relative dates only
      list.querySelectorAll('.proj').forEach(function (el, i) {
        el.querySelector('.proj__meta').textContent = [repos[i].language, relative(repos[i].pushed_at)].filter(Boolean).join(' · ');
      });
      return;
    }
    shown = sig;
    list.innerHTML = repos.map(projectHtml).join('') + (repos.length > 1 ? remark : '');
    fitNames();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitNames);
    list.querySelectorAll('.proj__frame').forEach(function (f) { if (io) io.observe(f); else paint(f); });
    if (window.observeReveals) window.observeReveals();
  }

  function time(d) { return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); }

  function readCache() {
    try { return JSON.parse(localStorage.getItem(CACHE_KEY)); } catch (e) { return null; }
  }

  var lastFetch = 0;
  function load() {
    lastFetch = Date.now();
    return fetch(API, { headers: { Accept: 'application/vnd.github+json' } })
      .then(function (r) { if (!r.ok) throw new Error('GitHub API ' + r.status); return r.json(); })
      .then(function (data) {
        if (!Array.isArray(data)) throw new Error('resposta inesperada');
        var repos = pick(data);
        try { localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), repos: repos })); } catch (e) {}
        render(repos);
        status.textContent = 'Atualizado agora pelo GitHub às ' + time(new Date()) + '.';
      })
      .catch(function () {
        var c = readCache();
        if (c && Array.isArray(c.repos) && c.repos.length) {
          render(c.repos);
          status.textContent = 'GitHub indisponível — mostrando a última lista salva (de ' + time(new Date(c.at)) + ').';
        } else {
          render(pick(fallbackRepos));
          status.textContent = 'GitHub indisponível — mostrando uma lista salva no site.';
        }
      });
  }

  // A fresh cache (< 5 min) is shown without calling the API, to stay under the rate limit.
  var cached = readCache();
  if (cached && Array.isArray(cached.repos) && cached.repos.length && Date.now() - cached.at < REFRESH_MS) {
    render(cached.repos);
    status.textContent = 'Atualizado pelo GitHub às ' + time(new Date(cached.at)) + '.';
    lastFetch = cached.at;
  } else {
    load();
  }

  function maybeRefresh() {
    if (document.visibilityState === 'visible' && Date.now() - lastFetch >= REFRESH_MS) load();
  }
  setInterval(maybeRefresh, 30000);
  document.addEventListener('visibilitychange', maybeRefresh);
})();
