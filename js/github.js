// One fetch of the public repos for the whole page. Sections listen for `gh:data`
// (detail = { repos, source: 'live' | 'cache' | 'fallback', at: Date }) or read window.GH.
(() => {
  const USER = 'TopDarkFlames';
  const KEY = 'gh:repos:v1';
  const FRESH_MS = 5 * 60 * 1000;

  // Shown only when the API and the cache both fail. Descriptions as published on GitHub.
  // shortcut: hand-copied snapshot (Oct 2026), refresh it when repos change a lot.
  const day = 864e5, now = Date.now();
  const FALLBACK = [
    { name: 'TopDarkFlames.github.io', language: 'HTML', description: 'Este portfólio, publicado no GitHub Pages.', pushed_at: new Date(now - 0.1 * day).toISOString() },
    { name: 'hanabi-wallpapers', language: 'Python', description: 'Wallpaper Engine-style library browser for GNOME: apply your Steam Workshop video wallpapers with Hanabi, with 3D tilt, particles and live previews', pushed_at: new Date(now - 0.5 * day).toISOString() },
    { name: 'topdarkflames-old', language: null, description: null, pushed_at: new Date(now - 0.6 * day).toISOString() },
    { name: 'Vexely', language: 'TypeScript', description: "Free, open-source desktop board for AI coding agents. Run Claude Code, Codex, Gemini CLI and more in real terminals on one infinite canvas, see who's working or waiting for you, and resume sessions. Windows, Linux and macOS.", pushed_at: new Date(now - 3 * day).toISOString() },
    { name: 'dashboard-in-live', language: 'TypeScript', description: null, pushed_at: new Date(now - 23 * day).toISOString() },
    { name: 'flutter3git', language: 'Dart', description: null, pushed_at: new Date(now - 32 * day).toISOString() },
    { name: 'TopDarkFlames', language: 'Markdown', description: 'Repositório especial que alimenta o README do perfil.', pushed_at: new Date(now - 90 * day).toISOString() },
  ].map((r) => ({ stargazers_count: 0, fork: false, archived: false, topics: [], html_url: `https://github.com/${USER}/${r.name}`, ...r }));

  const clean = (list) => list
    .filter((r) => r && !r.archived && /^https:\/\/github\.com\//.test(r.html_url || ''))
    .map((r) => ({
      name: String(r.name), description: r.description ? String(r.description) : '',
      language: r.language ? String(r.language) : '', pushed_at: r.pushed_at, created_at: r.created_at || r.pushed_at,
      stars: Number(r.stargazers_count) || 0, url: r.html_url, fork: !!r.fork,
    }))
    .sort((a, b) => new Date(b.pushed_at) - new Date(a.pushed_at));

  const readCache = () => { try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; } };
  const writeCache = (repos) => { try { localStorage.setItem(KEY, JSON.stringify({ at: Date.now(), repos })); } catch {} };

  const emit = (repos, source, at) => {
    window.GH = { repos, source, at: new Date(at), user: USER };
    document.dispatchEvent(new CustomEvent('gh:data', { detail: window.GH }));
  };

  async function load() {
    const cache = readCache();
    if (cache && Date.now() - cache.at < FRESH_MS) return emit(cache.repos, 'live', cache.at);
    try {
      const res = await fetch(`https://api.github.com/users/${USER}/repos?sort=pushed&per_page=100`, { headers: { Accept: 'application/vnd.github+json' } });
      if (!res.ok) throw new Error('GitHub ' + res.status);
      const repos = clean(await res.json());
      writeCache(repos);
      emit(repos, 'live', Date.now());
    } catch {
      if (cache) emit(cache.repos, 'cache', cache.at);
      else emit(clean(FALLBACK), 'fallback', Date.now());
    }
  }

  // Shared helpers for the sections.
  window.GHUtil = {
    esc: (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])),
    ago(iso) {
      const s = Math.max(0, (Date.now() - new Date(iso)) / 1000);
      const u = [['ano', 'anos', 31536e3], ['mês', 'meses', 2592e3], ['dia', 'dias', 864e2], ['hora', 'horas', 3600], ['minuto', 'minutos', 60]];
      for (const [one, many, sec] of u) if (s >= sec) { const n = Math.floor(s / sec); return `há ${n} ${n === 1 ? one : many}`; }
      return 'agora';
    },
  };

  window.GHReady = (fn) => { if (window.GH) fn(window.GH); document.addEventListener('gh:data', (e) => fn(e.detail)); };
  load();
  setInterval(() => { if (!document.hidden) load(); }, FRESH_MS);
})();
