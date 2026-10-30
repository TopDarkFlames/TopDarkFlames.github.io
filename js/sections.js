/* Sections: mount the Stack and footer light, fit the footer wordmark to the margins. */
(function () {
  'use strict';

  if (window.VFX) {
    var stackCanvas = document.querySelector('.stack__canvas');
    var footCanvas = document.querySelector('.foot__canvas');
    if (stackCanvas) VFX.mount(stackCanvas, { seed: 41, ribs: 14, intensity: 0.9, interactive: false });
    if (footCanvas) VFX.mount(footCanvas, { seed: 3, ribs: 28, intensity: 0.6, interactive: false });
  } else {
    document.querySelectorAll('.stack__pic, .foot__light').forEach(function (el) { el.classList.add('vfx-fallback'); });
  }

  // Crop each wordmark's viewBox to its glyph box so the word runs margin to margin.
  function fit() {
    document.querySelectorAll('.wordmark').forEach(function (svg) {
      if (!svg.getClientRects().length) return; // hidden variant: getBBox would be 0
      var b = svg.querySelector('text').getBBox();
      // Width from the measured box; height fixed to cap height (0.73em at font-size 100, baseline y=100)
      // so the baseline sits on the SVG's bottom edge — getBBox height would include descender space.
      if (b.width) svg.setAttribute('viewBox', b.x.toFixed(1) + ' 27 ' + b.width.toFixed(1) + ' 73');
    });
  }
  fit();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
  var mq = matchMedia('(max-width: 640px)');
  if (mq.addEventListener) mq.addEventListener('change', fit);
})();
