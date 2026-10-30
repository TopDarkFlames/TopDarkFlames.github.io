// Hero: mounts the two light canvases, swaps the pointer hint for touch, scales the panorama in on scroll.
// The name/copy reveal is CSS (hero.css, gated on html.js) so content can never be stranded hidden.
(() => {
  const heroCanvas = document.querySelector('.hero-vfx');
  const panoCanvas = document.querySelector('.intro-vfx');
  const narrow = matchMedia('(max-width: 640px)').matches;

  if (window.VFX) {
    if (heroCanvas) VFX.mount(heroCanvas, { seed: 7, ribs: narrow ? 12 : 22, intensity: 1, interactive: true });
    if (panoCanvas) VFX.mount(panoCanvas, { seed: 23, ribs: 34, intensity: 0.85, interactive: false });
  }

  const hint = document.querySelector('.hero-hint');
  if (hint && matchMedia('(hover: none)').matches) hint.textContent = 'Toque e arraste: a luz segue você.';

  if (!panoCanvas || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const frame = panoCanvas.parentElement;
  let queued = false;
  const update = () => {
    queued = false;
    const r = frame.getBoundingClientRect();
    // 0 when the frame's top meets the viewport bottom, 1 once its top reaches 30% of the viewport
    const p = Math.min(1, Math.max(0, (innerHeight - r.top) / (innerHeight * 0.7)));
    panoCanvas.style.transform = `scale(${1.08 - 0.08 * p})`;
  };
  const onScroll = () => { if (!queued) { queued = true; requestAnimationFrame(update); } };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  update();
})();
