/* =========================================================================
   cubes-bg.js — фон с плавающими изометрическими кубами DoleFi
   Оптимизирован: без shadowBlur, меньше объектов, throttle 30fps
   ========================================================================= */
(function () {
  'use strict';

  var wrap = document.createElement('div');
  wrap.className = 'toxic-cubes-bg';
  wrap.setAttribute('aria-hidden', 'true');

  var canvas = document.createElement('canvas');
  canvas.id = 'toxic-cubes-canvas';
  wrap.appendChild(canvas);
  document.body.insertBefore(wrap, document.body.firstChild);

  var ctx = canvas.getContext('2d', { alpha: true });

  var TOXIC = '#b8ff3c';
  var CA    = Math.cos(Math.PI / 6);
  var SA    = Math.sin(Math.PI / 6);

  var width = 0, height = 0, dpr = 1;
  var cubes = [], particles = [];
  var mouse = { x: -9999, y: -9999, active: false };

  /* Throttle: рендерим ~30fps вместо 60 */
  var lastTime = 0;
  var FRAME_MS = 1000 / 30;

  function rnd(min, max) { return min + Math.random() * (max - min); }

  function resize() {
    dpr    = Math.min(window.devicePixelRatio || 1, 2);
    width  = window.innerWidth;
    height = window.innerHeight;
    canvas.width  = Math.floor(width  * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width  = width  + 'px';
    canvas.style.height = height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    createScene();
  }

  function createScene() {
    cubes = []; particles = [];

    /* Меньше кубов — меньше нагрузки */
    var cubeCount = Math.round(Math.min(18, Math.max(10, 12 * (width * height) / (1440 * 900))));
    var partCount = Math.round(Math.min(40, Math.max(15, 25 * (width * height) / (1440 * 900))));

    for (var i = 0; i < cubeCount; i++) {
      var size = rnd(10, 20);
      cubes.push({
        x: rnd(-80, width + 80), y: rnd(-80, height + 80),
        size: size,
        alpha: rnd(0.35, 0.85),
        vx: rnd(-0.25, 0.25), vy: rnd(-0.2, 0.2),
        floatRadiusX: rnd(15, 60), floatRadiusY: rnd(12, 50),
        floatSpeed: rnd(0.3, 0.8),
        angle: rnd(0, Math.PI * 2),
        spinSpeed: rnd(-0.12, 0.12),
        phase: rnd(0, Math.PI * 2),
        /* Предрасcчитываем порядок отрисовки 2×2×2 раз и навсегда */
        units: makeUnits(),
      });
    }

    for (var j = 0; j < partCount; j++) {
      particles.push({
        x: rnd(0, width), y: rnd(0, height),
        r: rnd(0.4, 1.1),
        alpha: rnd(0.04, 0.14),
        vx: rnd(-0.06, 0.06), vy: rnd(-0.07, 0.07),
        phase: rnd(0, Math.PI * 2),
      });
    }
  }

  /* Порядок back-to-front считается один раз */
  function makeUnits() {
    var arr = [];
    for (var z = 0; z < 2; z++)
      for (var y = 0; y < 2; y++)
        for (var x = 0; x < 2; x++)
          arr.push({ x: x, y: y, z: z, depth: x + y - z });
    arr.sort(function (a, b) { return a.depth - b.depth; });
    return arr;
  }

  /* Быстрая изометрическая точка — без new Array, напрямую в переменные */
  function ip(gx, gy, gz, u, ox, oy, out) {
    out[0] = (gx - gy) * u * CA + ox;
    out[1] = (gx + gy) * u * SA - gz * u + oy;
  }

  /* Переиспользуемые буферы точек — не создаём массивы каждый кадр */
  var _p = [[0,0],[0,0],[0,0],[0,0]];

  function drawFace(p0,p1,p2,p3, strokeA, fillA, lw) {
    ctx.beginPath();
    ctx.moveTo(p0[0], p0[1]);
    ctx.lineTo(p1[0], p1[1]);
    ctx.lineTo(p2[0], p2[1]);
    ctx.lineTo(p3[0], p3[1]);
    ctx.closePath();
    if (fillA > 0) {
      ctx.globalAlpha = fillA;
      ctx.fillStyle = TOXIC;
      ctx.fill();
    }
    ctx.globalAlpha = strokeA;
    ctx.strokeStyle = TOXIC;
    ctx.lineWidth = lw;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  var _t0=[0,0],_t1=[0,0],_t2=[0,0],_t3=[0,0];
  var _l0=[0,0],_l1=[0,0],_l2=[0,0],_l3=[0,0];
  var _r0=[0,0],_r1=[0,0],_r2=[0,0],_r3=[0,0];

  function drawSmallCube(gx, gy, gz, u, ox, oy, alpha) {
    /* Top */
    ip(gx,   gy,   gz+1, u, ox, oy, _t0);
    ip(gx+1, gy,   gz+1, u, ox, oy, _t1);
    ip(gx+1, gy+1, gz+1, u, ox, oy, _t2);
    ip(gx,   gy+1, gz+1, u, ox, oy, _t3);
    /* Left */
    ip(gx,   gy+1, gz+1, u, ox, oy, _l0);
    ip(gx,   gy+1, gz,   u, ox, oy, _l1);
    ip(gx+1, gy+1, gz,   u, ox, oy, _l2);
    ip(gx+1, gy+1, gz+1, u, ox, oy, _l3);
    /* Right */
    ip(gx+1, gy,   gz+1, u, ox, oy, _r0);
    ip(gx+1, gy,   gz,   u, ox, oy, _r1);
    ip(gx+1, gy+1, gz,   u, ox, oy, _r2);
    ip(gx+1, gy+1, gz+1, u, ox, oy, _r3);

    drawFace(_t0,_t1,_t2,_t3, alpha,        0.045 * alpha, 0.65);
    drawFace(_l0,_l1,_l2,_l3, 0.5 * alpha,  0.016 * alpha, 0.65);
    drawFace(_r0,_r1,_r2,_r3, 0.7 * alpha,  0.028 * alpha, 0.65);
  }

  function drawCubeGroup(cube, t) {
    cube.x += cube.vx; cube.y += cube.vy;
    cube.angle += cube.spinSpeed * 0.01;
    var m = cube.size * 6;
    if (cube.x < -m)       cube.x = width  + m;
    if (cube.x > width + m) cube.x = -m;
    if (cube.y < -m)       cube.y = height + m;
    if (cube.y > height + m) cube.y = -m;

    var orbitX = Math.sin(t * cube.floatSpeed + cube.phase) * cube.floatRadiusX;
    var orbitY = Math.cos(t * cube.floatSpeed * 0.77 + cube.phase) * cube.floatRadiusY;

    /* Отталкивание мышью */
    var dx = cube.x - mouse.x, dy = cube.y - mouse.y;
    var dist = Math.sqrt(dx*dx + dy*dy) || 1;
    var push = mouse.active && dist < 200 ? (1 - dist / 200) * 28 : 0;

    ctx.save();
    ctx.translate(
      cube.x + orbitX + (push ? dx/dist*push : 0),
      cube.y + orbitY + (push ? dy/dist*push : 0)
    );
    ctx.rotate(cube.angle);

    var u = cube.size;
    var oy = u * 1.25;
    var units = cube.units;
    for (var k = 0; k < units.length; k++) {
      var part = units[k];
      var ag = Math.sin(t * 1.3 + cube.phase + k) * u * 0.14;
      drawSmallCube(part.x, part.y, part.z, u, 0, oy + ag, cube.alpha);
    }

    ctx.restore();
  }

  function drawParticles(t) {
    ctx.fillStyle = TOXIC;
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      p.x += p.vx; p.y += p.vy;
      if (p.x < -5) p.x = width  + 5; if (p.x > width  + 5) p.x = -5;
      if (p.y < -5) p.y = height + 5; if (p.y > height + 5) p.y = -5;
      var flicker = 0.55 + Math.sin(t * 1.8 + p.phase) * 0.45;
      ctx.globalAlpha = p.alpha * flicker;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, 6.2832);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function animate(ms) {
    requestAnimationFrame(animate);
    if (ms - lastTime < FRAME_MS) return; /* пропускаем лишние кадры */
    lastTime = ms;

    var t = ms / 1000;
    ctx.clearRect(0, 0, width, height);
    drawParticles(t);
    for (var i = 0; i < cubes.length; i++) drawCubeGroup(cubes[i], t);
  }

  window.addEventListener('resize', resize);
  window.addEventListener('mousemove', function (e) { mouse.x = e.clientX; mouse.y = e.clientY; mouse.active = true; });
  window.addEventListener('mouseleave', function () { mouse.active = false; });
  window.addEventListener('touchmove', function (e) {
    if (!e.touches[0]) return;
    mouse.x = e.touches[0].clientX; mouse.y = e.touches[0].clientY; mouse.active = true;
  }, { passive: true });
  window.addEventListener('touchend', function () { mouse.active = false; });

  resize();
  requestAnimationFrame(animate);
})();
