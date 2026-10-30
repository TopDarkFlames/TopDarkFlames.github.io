// Shared: enables the reveal states and plays them once as elements enter.
document.documentElement.classList.add('js');

const revealObserver = 'IntersectionObserver' in window
  ? new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add('is-in');
        revealObserver.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -10% 0px' })
  : null;

window.observeReveals = () => {
  document.querySelectorAll('[data-reveal]:not(.is-in)').forEach((el) => {
    if (revealObserver) revealObserver.observe(el); else el.classList.add('is-in');
  });
};
window.observeReveals();
