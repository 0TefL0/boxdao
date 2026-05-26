/* =========================================================================
   water.js — видео-фон + оригинальная height-map симуляция воды
   • Симуляция 1:1 как в оригинале (три буфера, DAMPING, rain)
   • Рендер — shimmer поверх видео вместо рефракции background.jpg
   • Чувствительность мыши снижена
   ========================================================================= */
(function () {
  'use strict';

  /* ── CONFIG ── */
  var SCALE   = 3;
  var DAMPING = 0.988;

  /* ══════════════════════════════
     1. PRELOADER
  ══════════════════════════════ */
  var loader = document.createElement('div');
  loader.style.cssText = [
    'position:fixed','inset:0',
    'background:#0a0a0c',
    'z-index:9999',
    'transition:opacity 0.9s ease',
    'pointer-events:none',
  ].join(';');
  document.body.appendChild(loader);

  function hideLoader() {
    if (!loader.parentNode) return;
    loader.style.opacity = '0';
    setTimeout(function () { if (loader.parentNode) loader.remove(); }, 950);
  }
  var loaderFallback = setTimeout(hideLoader, 6000);

  /* ══════════════════════════════
     2. ВИДЕО × 2 — плавный loop
  ══════════════════════════════ */
  var FADE_BEFORE = 1.4;
  var FADE_MS     = 1200;

  function makeVideo(op) {
    var v = document.createElement('video');
    v.src         = 'assets/bg.mp4';
    v.muted       = true;
    v.playsInline = true;
    v.setAttribute('playsinline', '');
    v.preload     = 'auto';
    v.style.cssText = [
      'position:fixed','inset:0',
      'width:100%','height:100%',
      'object-fit:cover',
      'transform:rotate(180deg)',
      'background:#0a0a0c',
      'z-index:-2',
      'pointer-events:none',
      'opacity:' + (op || 0),
      'transition:opacity ' + (FADE_MS / 1000) + 's ease',
    ].join(';');
    document.body.appendChild(v);
    return v;
  }

  var va = makeVideo(0), vb = makeVideo(0);
  var active = va, standby = vb, crossing = false;

  function crossfade() {
    if (crossing) return;
    crossing = true;
    standby.currentTime = 0;
    standby.play().catch(function(){});
    active.style.opacity  = '0';
    standby.style.opacity = '1';
    setTimeout(function () {
      active.pause();
      var tmp = active; active = standby; standby = tmp;
      crossing = false;
    }, FADE_MS);
  }

  function onTimeUpdate() {
    if (this !== active || !this.duration || this.duration === Infinity) return;
    if ((this.duration - this.currentTime) <= FADE_BEFORE) crossfade();
  }
  va.addEventListener('timeupdate', onTimeUpdate);
  vb.addEventListener('timeupdate', onTimeUpdate);

  va.addEventListener('canplaythrough', function () {
    clearTimeout(loaderFallback);
    va.play().then(function () { va.style.opacity = '1'; hideLoader(); }).catch(hideLoader);
  }, { once: true });
  if (va.readyState >= 4) {
    clearTimeout(loaderFallback);
    va.play().then(function () { va.style.opacity = '1'; hideLoader(); }).catch(hideLoader);
  }

  /* ══════════════════════════════
     3. WATER SIMULATION (оригинал)
  ══════════════════════════════ */
  var W, H, len;
  var cur, prev, nxt;
  var imgData, pix;

  /* Display canvas — поверх видео, прозрачный */
  var display = document.createElement('canvas');
  display.style.cssText = [
    'position:fixed','top:0','left:0',
    'width:100%','height:100%',
    'z-index:-1','pointer-events:none',
  ].join(';');
  document.body.appendChild(display);
  var dCtx = display.getContext('2d');

  /* Sim canvas — рабочий, маленький */
  var sim  = document.createElement('canvas');
  var sCtx = sim.getContext('2d', { willReadFrequently: true });

  function resize() {
    display.width  = window.innerWidth;
    display.height = window.innerHeight;
    dCtx.imageSmoothingEnabled = true;
    dCtx.imageSmoothingQuality = 'high';

    W   = Math.max(4, Math.ceil(window.innerWidth  / SCALE));
    H   = Math.max(4, Math.ceil(window.innerHeight / SCALE));
    len = W * H;

    sim.width  = W;
    sim.height = H;

    cur  = new Float32Array(len);
    prev = new Float32Array(len);
    nxt  = new Float32Array(len);

    imgData = sCtx.createImageData(W, H);
    pix = imgData.data;
    /* alpha = 0 по умолчанию (прозрачно) */
  }
  window.addEventListener('resize', resize);
  resize();

  /* ── РЯБЬ (оригинальная функция) ── */
  function addRipple(cx, cy, r, str) {
    var r2 = r * r;
    for (var dy = -r; dy <= r; dy++) {
      for (var dx = -r; dx <= r; dx++) {
        var x = cx + dx, y = cy + dy;
        if (x < 1 || x >= W - 1 || y < 1 || y >= H - 1) continue;
        var d2 = dx * dx + dy * dy;
        if (d2 <= r2) cur[y * W + x] += str * (1 - Math.sqrt(d2) / r);
      }
    }
  }

  /* ── ВВОД (мышь) — чувствительность снижена ── */
  var lastMouse = 0;
  document.addEventListener('mousemove', function (e) {
    var now = performance.now();
    if (now - lastMouse < 150) return;
    lastMouse = now;
    addRipple(
      Math.floor(e.clientX / SCALE),
      Math.floor(e.clientY / SCALE),
      1, 1.2
    );
  });
  document.addEventListener('click', function (e) {
    addRipple(
      Math.floor(e.clientX / SCALE),
      Math.floor(e.clientY / SCALE),
      5, 9
    );
  });

  /* ── ФОНОВЫЕ КАПЛИ (оригинал) ── */
  function dropRain() {
    addRipple(
      1 + Math.floor(Math.random() * (W - 2)),
      1 + Math.floor(Math.random() * (H - 2)),
      1 + Math.floor(Math.random() * 2),
      1.2 + Math.random() * 2.8
    );
    setTimeout(dropRain, 700 + Math.random() * 2200);
  }
  dropRain();

  /* ── СИМУЛЯЦИЯ (оригинал) ── */
  function step() {
    var i, x, y;
    for (y = 1; y < H - 1; y++) {
      for (x = 1; x < W - 1; x++) {
        i = y * W + x;
        nxt[i] = ((cur[i - 1] + cur[i + 1] + cur[i - W] + cur[i + W]) * 0.5 - prev[i]) * DAMPING;
      }
    }
    var tmp = prev; prev = cur; cur = nxt; nxt = tmp;
  }

  /* ── РЕНДЕР — shimmer поверх видео ── */
  /* Акцентный цвет проекта (B8FF3C) */
  var AR = 184, AG = 255, AB = 60;

  function render() {
    var Wm = W - 1, Hm = H - 1;
    var i, x, y, pi, gx, gy, h, light, alpha;

    /* Очищаем буфер */
    for (var a = 0; a < pix.length; a++) pix[a] = 0;

    for (y = 1; y < Hm; y++) {
      for (x = 1; x < Wm; x++) {
        i = y * W + x;
        h  = cur[i];
        if (h < 0.08 && h > -0.08) continue; /* пропускаем плоские зоны */

        gx = (cur[i + 1] - cur[i - 1]) * 0.5;
        gy = (cur[i + W] - cur[i - W]) * 0.5;

        /* Блик — свет сверху-слева */
        light = Math.max(0, -gx * 0.65 - gy * 0.75);
        /* Гребни волн */
        var crest = h > 0 ? h * 0.045 : 0;

        alpha = ((light * 0.55 + crest) * 160) | 0;
        if (alpha < 3) continue;
        if (alpha > 72) alpha = 72;

        pi = i << 2;
        pix[pi]     = AR;
        pix[pi + 1] = AG;
        pix[pi + 2] = AB;
        pix[pi + 3] = alpha;
      }
    }

    sCtx.clearRect(0, 0, W, H);
    sCtx.putImageData(imgData, 0, 0);
    dCtx.clearRect(0, 0, display.width, display.height);
    dCtx.drawImage(sim, 0, 0, display.width, display.height);
  }

  /* ── ЦИКЛ ── */
  function tick() {
    step();
    render();
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

})();
