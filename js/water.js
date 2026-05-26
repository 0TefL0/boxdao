/* =========================================================================
   water.js — видео-фон + плавный зацикленный loop + ripple-эффект мыши
   1. Два видео-элемента — crossfade перед концом, склейка не видна
   2. object-fit:contain — фон дальше, весь кадр виден
   3. Preloader: сайт показывается только когда видео готово
   4. Canvas ripple — круги при движении мыши и клике
   ========================================================================= */
(function () {

  /* ══════════════════════════════
     1. PRELOADER
  ══════════════════════════════ */
  var loader = document.createElement('div');
  loader.style.cssText = [
    'position:fixed', 'inset:0',
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

  /* Страховка: если видео долго грузится — убрать лоадер через 6 сек */
  var loaderFallback = setTimeout(hideLoader, 6000);

  /* ══════════════════════════════
     2. ВИДЕО × 2 — плавный loop
  ══════════════════════════════ */
  var FADE_BEFORE = 1.4;   /* секунд до конца — начать crossfade */
  var FADE_MS     = 1200;  /* длительность кроссфейда, мс */

  function makeVideo(opacity) {
    var v = document.createElement('video');
    v.src        = 'assets/bg.mp4';
    v.muted      = true;
    v.playsInline = true;
    v.setAttribute('playsinline', '');
    v.preload    = 'auto';
    v.style.cssText = [
      'position:fixed', 'inset:0',
      'width:100%', 'height:100%',
      'object-fit:contain',       /* весь кадр, не обрезан — фон «дальше» */
      'background:#0a0a0c',
      'z-index:-2',
      'pointer-events:none',
      'opacity:' + (opacity || 0),
      'transition:opacity ' + (FADE_MS / 1000) + 's ease',
    ].join(';');
    document.body.appendChild(v);
    return v;
  }

  var va = makeVideo(0);
  var vb = makeVideo(0);

  var active   = va;
  var standby  = vb;
  var crossing = false;

  function crossfade() {
    if (crossing) return;
    crossing = true;

    standby.currentTime = 0;
    standby.play().catch(function(){});

    /* Плавно меняем opacity */
    active.style.opacity  = '0';
    standby.style.opacity = '1';

    setTimeout(function () {
      active.pause();
      /* меняем местами */
      var tmp = active;
      active  = standby;
      standby = tmp;
      crossing = false;
    }, FADE_MS);
  }

  function onTimeUpdate() {
    if (!this.duration || this.duration === Infinity) return;
    if (this !== active) return;
    if ((this.duration - this.currentTime) <= FADE_BEFORE) {
      crossfade();
    }
  }

  va.addEventListener('timeupdate', onTimeUpdate);
  vb.addEventListener('timeupdate', onTimeUpdate);

  /* Запуск: ждём canplaythrough → показываем */
  va.addEventListener('canplaythrough', function () {
    clearTimeout(loaderFallback);
    va.play().then(function () {
      va.style.opacity = '1';
      hideLoader();
    }).catch(function () {
      hideLoader();
    });
  }, { once: true });

  /* Если canplaythrough уже было до навешивания обработчика */
  if (va.readyState >= 4) {
    clearTimeout(loaderFallback);
    va.play().then(function () { va.style.opacity = '1'; hideLoader(); }).catch(hideLoader);
  }

  /* ══════════════════════════════
     3. CANVAS RIPPLE — эффект мыши
  ══════════════════════════════ */
  var canvas = document.createElement('canvas');
  canvas.style.cssText = [
    'position:fixed', 'inset:0',
    'width:100%', 'height:100%',
    'z-index:-1',
    'pointer-events:none',
  ].join(';');
  document.body.appendChild(canvas);

  var ctx = canvas.getContext('2d');
  var W, H;

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resize);
  resize();

  /* Пул рипплов */
  var ripples = [];

  function addRipple(x, y, maxR, speed, alpha) {
    ripples.push({ x: x, y: y, r: 0, maxR: maxR, speed: speed, alpha: alpha });
  }

  var lastMX = -999, lastMY = -999;
  document.addEventListener('mousemove', function (e) {
    var dx = e.clientX - lastMX, dy = e.clientY - lastMY;
    if (dx * dx + dy * dy < 400) return; /* минимальный сдвиг 20px */
    lastMX = e.clientX; lastMY = e.clientY;
    addRipple(e.clientX, e.clientY, 55, 1.2, 0.18);
  });

  document.addEventListener('click', function (e) {
    addRipple(e.clientX, e.clientY, 130, 2.8, 0.55);
    addRipple(e.clientX, e.clientY,  80, 1.8, 0.35);
    addRipple(e.clientX, e.clientY,  40, 1.2, 0.20);
  });

  /* Акцентный цвет проекта */
  var ACCENT = '184,255,60';

  function frame() {
    ctx.clearRect(0, 0, W, H);

    for (var i = ripples.length - 1; i >= 0; i--) {
      var rp = ripples[i];
      rp.r += rp.speed;
      var t = rp.r / rp.maxR;          /* 0..1 */
      var op = rp.alpha * (1 - t);     /* затухание */

      if (op < 0.004) { ripples.splice(i, 1); continue; }

      ctx.beginPath();
      ctx.arc(rp.x, rp.y, rp.r, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(' + ACCENT + ',' + op.toFixed(3) + ')';
      ctx.lineWidth   = 1.5 * (1 - t * 0.5);
      ctx.stroke();
    }

    requestAnimationFrame(frame);
  }

  frame();

})();
