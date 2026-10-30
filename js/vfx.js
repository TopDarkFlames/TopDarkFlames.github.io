/* VFX — cold blue light behind vertical fluted glass.
   window.VFX.mount(canvas, opts) -> { setPointer(x, y), destroy() }
   window.VFX.still(seed, w, h, opts) -> Promise<dataURL jpeg> */
(function () {
  'use strict';

  var VERT = 'attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}';

  var FRAG = [
    '#ifdef GL_FRAGMENT_PRECISION_HIGH',
    'precision highp float;',
    '#else',
    'precision mediump float;',
    '#endif',
    'uniform vec2 uRes;uniform float uTime;uniform vec2 uCenter;',
    'uniform vec4 uSeed;', // x: flow rotation, y: cyan balance, z/w: shape offsets
    'uniform float uRibs;uniform float uInt;',
    'float h21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}',
    'float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);',
    ' return mix(mix(h21(i),h21(i+vec2(1,0)),f.x),mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x),f.y);}',
    'float fbm(vec2 p){float v=0.,a=.5;mat2 m=mat2(1.6,1.2,-1.2,1.6);',
    ' for(int i=0;i<4;i++){v+=a*noise(p);p=m*p;a*=.5;}return v;}',
    // Light field in aspect-corrected space: a warped blob plus a sweeping arm.
    'float light(vec2 p){',
    ' float t=uTime*.2;', // ~30 s per drift cycle
    ' vec2 q=p-uCenter*vec2(uRes.x/uRes.y,1.);',
    ' float c=cos(uSeed.x),s=sin(uSeed.x);q=mat2(c,-s,s,c)*q;',
    ' vec2 w=vec2(fbm(q*1.3+uSeed.zw+t),fbm(q*1.3-uSeed.wz-t*.8+5.2));',
    ' q+=(w-.5)*.9;',
    ' float d=length(q*vec2(1.,.62));',
    ' float body=exp(-d*d*6.);',
    ' float arm=exp(-pow(q.x+.3*sin(q.y*2.4+t*1.3+uSeed.z),2.)*14.)*exp(-q.y*q.y*2.2);',
    ' float v=max(body,arm*.8)*(.55+.75*fbm(q*2.2+t*.6));',
    ' return v;}',
    'vec3 ramp(float v){',
    ' vec3 deep=vec3(.043,.122,.471),blue=vec3(.165,.42,1.),cyan=vec3(.263,.784,1.);',
    ' vec3 col=mix(vec3(.012,.02,.047),deep,smoothstep(.06,.45,v));',
    ' col=mix(col,blue,smoothstep(.35,.75,v));',
    ' col=mix(col,cyan,smoothstep(.7+.2*(1.-uSeed.y),1.1,v));',
    ' col=mix(col,vec3(.9,.97,1.),smoothstep(1.35,2.,v));',
    ' return col;}',
    'void main(){',
    ' vec2 uv=gl_FragCoord.xy/uRes;',
    ' float a=uRes.x/uRes.y;',
    ' float x=uv.x*uRibs,f=fract(x),id=floor(x);',
    ' float r=h21(vec2(id,uSeed.z));',
    // Each rib acts like a cylindrical lens: offset grows across it, flipping the light inside.
    ' float off=(f-.5)*(1.6+r*.8)/uRibs;',
    ' vec2 sp=vec2((uv.x+off)*a,(uv.y-.5)*.82+.5);',
    ' float v=light(sp)*(.9+.2*r);',
    ' v*=.82+.18*sin(f*3.1416);', // slight darkening at rib seams
    ' v*=uInt;vec3 col=ramp(v*v*1.5+v*.3);', // contrast curve: dark falloff, hot core
    ' float edge=smoothstep(.88,.985,f)*(1.-smoothstep(.985,1.,f));',
    ' col+=edge*(.035+.22*v)*vec3(.55,.8,1.);',
    ' col*=.97+.05*noise(vec2(x*7.,uv.y*.5));', // fine vertical streaks inside ribs
    ' vec2 vg=uv-.5;col*=1.-dot(vg,vg)*1.3;',
    ' col=mix(col,col+vec3(.006,.012,.035),1.-uv.y);', // field lifts toward #050a1e at the bottom
    ' col+=(h21(gl_FragCoord.xy+fract(uTime)*91.)-.5)*.035;',
    ' gl_FragColor=vec4(col,1.);}'
  ].join('\n');

  function rand(seed) { // mulberry32: same seed -> same params
    var s = (seed >>> 0) || 1;
    return function () {
      s = (s + 0x6d2b79f5) | 0;
      var t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function params(seed) {
    var r = rand(Math.floor(seed * 9973) + 7);
    return {
      home: [0.3 + r() * 0.45, 0.35 + r() * 0.35],
      seed: [r() * 6.283, r(), r() * 40, r() * 40],
      t0: r() * 200
    };
  }

  function makeGL(canvas, extra) {
    var o = { alpha: false, antialias: false, depth: false, stencil: false, powerPreference: 'low-power' };
    for (var k in extra) o[k] = extra[k];
    var gl;
    try { gl = canvas.getContext('webgl', o) || canvas.getContext('experimental-webgl', o); } catch (e) { gl = null; }
    if (!gl) return null;
    function sh(type, src) {
      var s = gl.createShader(type);
      gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS) && !gl.isContextLost()) throw new Error(gl.getShaderInfoLog(s));
      return s;
    }
    var p = gl.createProgram();
    gl.attachShader(p, sh(gl.VERTEX_SHADER, VERT));
    gl.attachShader(p, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.bindAttribLocation(p, 0, 'a');
    gl.linkProgram(p);
    gl.useProgram(p);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW); // one full-screen triangle
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    var u = {};
    ['uRes', 'uTime', 'uCenter', 'uSeed', 'uRibs', 'uInt'].forEach(function (n) { u[n] = gl.getUniformLocation(p, n); });
    return {
      gl: gl,
      draw: function (w, h, time, center, prm, ribs, intensity) {
        gl.viewport(0, 0, w, h);
        gl.uniform2f(u.uRes, w, h);
        gl.uniform1f(u.uTime, time);
        gl.uniform2f(u.uCenter, center[0], center[1]);
        gl.uniform4fv(u.uSeed, prm.seed);
        gl.uniform1f(u.uRibs, ribs);
        gl.uniform1f(u.uInt, intensity);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      }
    };
  }

  function opt(opts) {
    opts = opts || {};
    return {
      seed: opts.seed == null ? 1 : +opts.seed,
      ribs: opts.ribs || 22,
      intensity: opts.intensity == null ? 1 : Math.max(0, Math.min(1, +opts.intensity)),
      interactive: !!opts.interactive
    };
  }

  var noop = { setPointer: function () {}, destroy: function () {} };
  var MAX_PX = 1.6e6;

  function mount(canvas, opts) {
    var o = opt(opts), prm = params(o.seed), r;
    try { r = makeGL(canvas); } catch (e) { r = null; }
    if (!r) { if (canvas.parentElement) canvas.parentElement.classList.add('vfx-fallback'); return noop; }

    var reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    var center = prm.home.slice(), target = prm.home.slice();
    var w = 1, h = 1, raf = 0, visible = true, lost = false, dead = false, start = performance.now();
    var host = canvas.parentElement || canvas;

    function frame(now) {
      raf = 0;
      if (lost || dead) return;
      center[0] += (target[0] - center[0]) * 0.06;
      center[1] += (target[1] - center[1]) * 0.06;
      r.draw(w, h, prm.t0 + (now - start) / 1000, center, prm, o.ribs, o.intensity);
      schedule();
    }
    function schedule() {
      if (!raf && !reduced && visible && !document.hidden && !lost && !dead) raf = requestAnimationFrame(frame);
    }
    function drawOnce() { if (!lost && !dead) r.draw(w, h, prm.t0, center, prm, o.ribs, o.intensity); }

    function resize() {
      var rect = canvas.getBoundingClientRect();
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      var cw = Math.max(1, rect.width * dpr), ch = Math.max(1, rect.height * dpr);
      var k = Math.min(1, Math.sqrt(MAX_PX / (cw * ch))); // the light is soft, so a lower internal res is invisible
      w = canvas.width = Math.round(cw * k);
      h = canvas.height = Math.round(ch * k);
      if (reduced || !raf) drawOnce(); // a resize clears the buffer
    }

    var ro = window.ResizeObserver ? new ResizeObserver(resize) : null;
    if (ro) ro.observe(canvas); else window.addEventListener('resize', resize);
    var io = window.IntersectionObserver ? new IntersectionObserver(function (es) {
      visible = es[es.length - 1].isIntersecting; schedule();
    }) : null;
    if (io) io.observe(canvas);
    function onVis() { schedule(); }
    document.addEventListener('visibilitychange', onVis);

    function onLost(e) { e.preventDefault(); lost = true; if (raf) cancelAnimationFrame(raf); raf = 0; }
    function onRestored() {
      try { r = makeGL(canvas) || r; } catch (e) { return; }
      lost = false; drawOnce(); schedule();
    }
    canvas.addEventListener('webglcontextlost', onLost);
    canvas.addEventListener('webglcontextrestored', onRestored);

    function setPointer(x, y) { target[0] = x; target[1] = y; }
    function onMove(e) {
      var b = canvas.getBoundingClientRect(), p = e.touches ? e.touches[0] : e;
      if (!p || !b.width) return;
      setPointer((p.clientX - b.left) / b.width, 1 - (p.clientY - b.top) / b.height); // GL y is up
    }
    function onLeave() { setPointer(prm.home[0], prm.home[1]); }
    if (o.interactive && !reduced) {
      host.addEventListener('pointermove', onMove);
      host.addEventListener('pointerleave', onLeave);
      host.addEventListener('touchmove', onMove, { passive: true });
      host.addEventListener('touchend', onLeave);
    }

    resize();
    schedule();

    return {
      setPointer: setPointer,
      destroy: function () {
        dead = true;
        if (raf) cancelAnimationFrame(raf);
        if (ro) ro.disconnect(); else window.removeEventListener('resize', resize);
        if (io) io.disconnect();
        document.removeEventListener('visibilitychange', onVis);
        canvas.removeEventListener('webglcontextlost', onLost);
        canvas.removeEventListener('webglcontextrestored', onRestored);
        host.removeEventListener('pointermove', onMove);
        host.removeEventListener('pointerleave', onLeave);
        host.removeEventListener('touchmove', onMove);
        host.removeEventListener('touchend', onLeave);
      }
    };
  }

  // 2D approximation so covers never break without WebGL.
  function still2d(prm, w, h, o) {
    var a = document.createElement('canvas'), b = document.createElement('canvas');
    a.width = b.width = w; a.height = b.height = h;
    var x = a.getContext('2d'), y = b.getContext('2d');
    x.fillStyle = '#03050c'; x.fillRect(0, 0, w, h);
    var cx = prm.home[0] * w, cy = (1 - prm.home[1]) * h, rad = Math.max(w, h) * 0.55;
    var g = x.createRadialGradient(cx, cy, 0, cx, cy, rad);
    g.addColorStop(0, prm.seed[1] > 0.5 ? '#bfeaff' : '#43c8ff');
    g.addColorStop(0.2, '#2a6bff');
    g.addColorStop(0.55, '#0b1f78');
    g.addColorStop(1, 'rgba(3,5,12,0)');
    x.globalAlpha = o.intensity; x.fillStyle = g; x.fillRect(0, 0, w, h);
    y.fillStyle = '#03050c'; y.fillRect(0, 0, w, h);
    var sw = w / o.ribs;
    for (var i = 0; i < o.ribs; i++) { // each strip shows a horizontally squeezed, mirrored-ish slice: the rib look
      var sx = Math.max(0, i * sw - sw * 0.6);
      y.drawImage(a, sx, 0, sw * 2.2, h, i * sw, 0, Math.ceil(sw), h);
      y.fillStyle = 'rgba(140,200,255,0.08)'; y.fillRect(i * sw + sw - 2, 0, 1.5, h);
    }
    return b.toDataURL('image/jpeg', 0.86);
  }

  var shared = null, sharedFailed = false, queue = Promise.resolve();

  function still(seed, width, height, opts) {
    var o = opt(opts), prm = params(seed);
    var w = Math.max(1, Math.round(width)), h = Math.max(1, Math.round(height));
    var job = queue.then(function () {
      if (!shared && !sharedFailed) {
        var c = document.createElement('canvas');
        try { shared = makeGL(c, { preserveDrawingBuffer: true }); } catch (e) { shared = null; }
        if (shared) shared.canvas = c; else sharedFailed = true;
      }
      if (!shared || shared.gl.isContextLost()) return still2d(prm, w, h, o);
      shared.canvas.width = w; shared.canvas.height = h;
      shared.draw(w, h, prm.t0, prm.home, prm, o.ribs, o.intensity);
      return shared.canvas.toDataURL('image/jpeg', 0.86);
    });
    queue = job.catch(function () {});
    return job;
  }

  window.VFX = { mount: mount, still: still };
})();
