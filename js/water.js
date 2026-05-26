/* =========================================================================
   water.js — интерактивный анимированный фон (имитация воды)
   --------------------------------------------------------------------------
   • Height-map симуляция на сетке SCALE раз меньше вьюпорта.
   • Мышь создаёт рябь, клик — большую волну.
   • Фоновое изображение (background.jpg) преломляется через нормали воды
     (эффект refraction), придавая реалистичное ощущение движения воды.
   • Янтарные блики на гребнях волн — акцент проекта.
   ========================================================================= */
(function () {
  'use strict';

  /* ── CONFIG ── */
  const SCALE   = 12;    /* разрешение = viewport / SCALE */
  const DAMPING = 0.988; /* затухание (1 = бесконечно, 0 = мгновенно) */
  const REFRACT = 3.2;   /* сила преломления (пиксели сетки) */
  const DARK    = 0.42;  /* затемнение фона (0 = чёрный, 1 = оригинал) */
  const AMBER = [7, 117, 13];

  /* ── STATE ── */
  var W, H, len;
  var cur, prev, nxt; /* три буфера высот */
  var imgData, pix;   /* пиксельный вывод */
  var bgPix  = null;  /* пиксели фона при текущем разрешении */
  var bgImg  = null;  /* исходное изображение (нужно при ресайзе) */

  /* ── CANVASES ── */

  /* Основной: фиксированный, на весь вьюпорт */
  var display = document.createElement('canvas');
  display.id = 'water-canvas';
  display.style.cssText = [
    'position:fixed', 'top:0', 'left:0',
    'width:100%', 'height:100%',
    'z-index:-2', 'pointer-events:none'
  ].join(';');
  document.body.prepend(display);
  var dCtx = display.getContext('2d');

  /* Симуляционный: рабочий холст разрешения W×H */
  var sim  = document.createElement('canvas');
  var sCtx = sim.getContext('2d', { willReadFrequently: true });

  /* Фоновый: хранит background.jpg в масштабе симуляции */
  var bgCvs = document.createElement('canvas');
  var bgCx  = bgCvs.getContext('2d');

  /* ── RESIZE ── */
  function resize() {
    display.width  = window.innerWidth;
    display.height = window.innerHeight;

    /* Сглаживание при масштабировании пиксельного буфера */
    dCtx.imageSmoothingEnabled = true;
    dCtx.imageSmoothingQuality = 'high';

    W = Math.max(4, Math.ceil(window.innerWidth  / SCALE));
    H = Math.max(4, Math.ceil(window.innerHeight / SCALE));
    len = W * H;

    sim.width   = W; sim.height   = H;
    bgCvs.width = W; bgCvs.height = H;

    cur  = new Float32Array(len);
    prev = new Float32Array(len);
    nxt  = new Float32Array(len);

    imgData = sCtx.createImageData(W, H);
    pix = imgData.data;
    /* pre-fill alpha = 255 */
    for (var a = 3; a < pix.length; a += 4) pix[a] = 255;

    /* Перерисовать фон при новом размере */
    if (bgImg && bgImg.complete && bgImg.naturalWidth) {
      drawBg();
    }
  }

  window.addEventListener('resize', resize);
  resize();

  /* ── ЗАГРУЗКА ФОНА — contain (16:9 вписать целиком) ── */
  function drawBg() {
    bgCx.drawImage(bgImg, 0, 0, W, H);
    bgPix = bgCx.getImageData(0, 0, W, H).data;
  }

  bgImg = new Image();
  bgImg.src = 'assets/img/background.jpg';
  bgImg.onload = drawBg;

  /* ── РЯБЬ ── */
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

  /* ── ВВОД (мышь) ── */
  var lastMouse = 0;
  document.addEventListener('mousemove', function (e) {
    var now = performance.now();
    if (now - lastMouse < 38) return;
    lastMouse = now;
    addRipple(
      Math.floor(e.clientX / SCALE),
      Math.floor(e.clientY / SCALE),
      2, 7
    );
  });
  document.addEventListener('click', function (e) {
    addRipple(
      Math.floor(e.clientX / SCALE),
      Math.floor(e.clientY / SCALE),
      8, 22
    );
  });

  /* ── ФОНОВЫЕ КАПЛИ ── */
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

  /* ── СИМУЛЯЦИЯ ── */
  function step() {
    var i, x, y;
    for (y = 1; y < H - 1; y++) {
      for (x = 1; x < W - 1; x++) {
        i = y * W + x;
        nxt[i] = ((cur[i - 1] + cur[i + 1] + cur[i - W] + cur[i + W]) * 0.5 - prev[i]) * DAMPING;
      }
    }
    /* Вращаем буферы: prev ← cur ← nxt ← (старый prev) */
    var tmp = prev; prev = cur; cur = nxt; nxt = tmp;
  }

  /* ── РЕНДЕР ── */
  function render() {
    var Wm = W - 1, Hm = H - 1;
    var i, x, y, pi, si, sx, sy, gx, gy, h, spec, r, g, b;

    for (y = 1; y < Hm; y++) {
      for (x = 1; x < Wm; x++) {
        i = y * W + x;
        h  = cur[i];

        /* Градиент → нормаль поверхности */
        gx = (cur[i + 1] - cur[i - 1]) * 0.5;
        gy = (cur[i + W] - cur[i - W]) * 0.5;

        /* Смещение выборки = имитация преломления */
        sx = (x + gx * REFRACT + 0.5) | 0;
        sy = (y + gy * REFRACT + 0.5) | 0;
        if (sx < 0) sx = 0; else if (sx > Wm) sx = Wm;
        if (sy < 0) sy = 0; else if (sy > Hm) sy = Hm;

        if (bgPix) {
          si = (sy * W + sx) << 2;
          r = bgPix[si]     * DARK;
          g = bgPix[si + 1] * DARK;
          b = bgPix[si + 2] * DARK;
        } else {
          r = 10; g = 10; b = 12;
        }

        /* Янтарный блик на гребнях */
        spec = h > 0 ? h * 0.068 : 0;
        r += spec * AMBER[0] * 0.30;
        g += spec * AMBER[1] * 0.17;
        b += spec * AMBER[2] * 0.07;

        pi = i << 2;
        pix[pi]     = r < 255 ? r : 255;
        pix[pi + 1] = g < 255 ? g : 255;
        pix[pi + 2] = b < 255 ? b : 255;
      }
    }

    sCtx.putImageData(imgData, 0, 0);
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
