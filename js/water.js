/* =========================================================================
   water.js — видео-фон + height-map симуляция воды + ripple мышью
   ========================================================================= */
(function () {

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
    va.play().then(function () { va.style.opacity = '1'; hideLoader(); })
             .catch(hideLoader);
  }, { once: true });
  if (va.readyState >= 4) {
    clearTimeout(loaderFallback);
    va.play().then(function () { va.style.opacity = '1'; hideLoader(); }).catch(hideLoader);
  }

  /* ══════════════════════════════
     3. HEIGHT-MAP ВОДА
  ══════════════════════════════ */
  var SCALE = 4;     /* пикселей экрана на одну ячейку сетки */
  var DAMP  = 0.986; /* затухание волн */

  var canvas = document.createElement('canvas');
  canvas.style.cssText = [
    'position:fixed','inset:0',
    'z-index:-1',
    'pointer-events:none',
    /* CSS масштабирует маленький canvas на весь экран — получаем
       бесплатное билинейное размытие, волны выглядят мягко */
    'width:100%','height:100%',
    'image-rendering:auto',
  ].join(';');
  document.body.appendChild(canvas);

  var ctx = canvas.getContext('2d');
  var W, H;      /* размер экрана */
  var gW, gH;    /* размер сетки */
  var cur, prv;  /* ping-pong буферы высот */
  var imgData;

  function initMap() {
    W = window.innerWidth;
    H = window.innerHeight;
    gW = (W / SCALE | 0) + 2;
    gH = (H / SCALE | 0) + 2;
    canvas.width  = gW;
    canvas.height = gH;
    cur = new Float32Array(gW * gH);
    prv = new Float32Array(gW * gH);
    imgData = ctx.createImageData(gW, gH);
    /* Предзаполняем alpha=0 */
    for (var i = 3; i < imgData.data.length; i += 4) imgData.data[i] = 0;
  }

  window.addEventListener('resize', initMap);
  initMap();

  /* Возмущение в точке (px, py) силой str */
  function splash(px, py, str) {
    var gx = (px / SCALE | 0) + 1;
    var gy = (py / SCALE | 0) + 1;
    var r  = 3;
    for (var dy = -r; dy <= r; dy++) {
      for (var dx = -r; dx <= r; dx++) {
        var d = Math.sqrt(dx * dx + dy * dy);
        if (d > r) continue;
        var idx = (gy + dy) * gW + (gx + dx);
        if (idx >= 0 && idx < cur.length) {
          cur[idx] += str * (1 - d / r);
        }
      }
    }
  }

  /* Один шаг симуляции */
  function stepMap() {
    for (var y = 1; y < gH - 1; y++) {
      for (var x = 1; x < gW - 1; x++) {
        var i = y * gW + x;
        var v = (cur[i - 1] + cur[i + 1] + cur[i - gW] + cur[i + gW]) * 0.5 - prv[i];
        prv[i] = v * DAMP;
      }
    }
    var tmp = cur; cur = prv; prv = tmp;
  }

  /* Рендер нормалей как мягкий зелёный shimmer */
  function renderMap() {
    var d = imgData.data;
    for (var y = 1; y < gH - 1; y++) {
      for (var x = 1; x < gW - 1; x++) {
        var i  = y * gW + x;
        var nx = cur[i + 1]   - cur[i - 1];   /* горизонтальная нормаль */
        var ny = cur[i + gW]  - cur[i - gW];  /* вертикальная нормаль   */
        /* Свет падает сверху-слева */
        var light = Math.max(0, -nx * 0.6 - ny * 0.8);
        var alpha = Math.min(light * 90, 85) | 0;
        var pi = i * 4;
        d[pi]     = 184;   /* R акцента */
        d[pi + 1] = 255;   /* G */
        d[pi + 2] = 60;    /* B */
        d[pi + 3] = alpha;
      }
    }
    ctx.putImageData(imgData, 0, 0);
  }

  /* ══════════════════════════════
     4. СОБЫТИЯ МЫШИ
  ══════════════════════════════ */
  var lastMX = -999, lastMY = -999;

  document.addEventListener('mousemove', function (e) {
    var dx = e.clientX - lastMX, dy = e.clientY - lastMY;
    if (dx * dx + dy * dy < 225) return; /* мин. 15px */
    lastMX = e.clientX; lastMY = e.clientY;
    splash(e.clientX, e.clientY, 2.5);
  });

  document.addEventListener('click', function (e) {
    splash(e.clientX, e.clientY, 12);
  });

  /* ══════════════════════════════
     5. ANIMATION LOOP
  ══════════════════════════════ */
  var frame = 0;
  function loop() {
    frame++;
    /* Симуляцию обновляем каждый кадр, рендер тоже */
    stepMap();
    renderMap();
    requestAnimationFrame(loop);
  }
  loop();

})();
