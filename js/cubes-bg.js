/* =========================================================================
   cubes-bg.js — фон с плавающими изометрическими кубами DoleFi
   На основе assets/preview.html
   ========================================================================= */
(function () {
  'use strict';

  /* ── Создаём контейнер и canvas ── */
  var wrap = document.createElement('div');
  wrap.className = 'toxic-cubes-bg';
  wrap.setAttribute('aria-hidden', 'true');

  var canvas = document.createElement('canvas');
  canvas.id = 'toxic-cubes-canvas';
  wrap.appendChild(canvas);

  /* Вставляем первым элементом body */
  document.body.insertBefore(wrap, document.body.firstChild);

  var ctx = canvas.getContext('2d', { alpha: true });

  var TOXIC       = '#b8ff3c';
  var TOXIC_BRIGHT = '#39ff14';
  var LINE        = '#8a8a93';

  var width = 0, height = 0, dpr = 1;
  var cubes = [], particles = [];
  var mouse = { x: -9999, y: -9999, active: false };

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
    var sf         = Math.max(1, (width * height) / (1440 * 900));
    var cubeCount  = Math.round(Math.min(42, Math.max(24, 26 * sf)));
    var partCount  = Math.round(Math.min(130, Math.max(55, 75 * sf)));

    for (var i = 0; i < cubeCount; i++) {
      var size = rnd(9, 21);
      cubes.push({
        x: rnd(-120, width + 120), y: rnd(-120, height + 120),
        size: size,
        alpha: rnd(0.45, 1),
        vx: rnd(-0.34, 0.34), vy: rnd(-0.26, 0.26),
        floatRadiusX: rnd(20, 90), floatRadiusY: rnd(18, 74),
        floatSpeed: rnd(0.45, 1.15),
        spinSpeed: rnd(-0.18, 0.18),
        angle: rnd(0, Math.PI * 2),
        phase: rnd(0, Math.PI * 2),
        glow: Math.random() > 0.52,
        accentCube: Math.floor(rnd(0, 8)),
      });
    }
    for (var j = 0; j < partCount; j++) {
      particles.push({
        x: rnd(0, width), y: rnd(0, height),
        r: rnd(0.35, 1.25),
        alpha: rnd(0.035, 0.16),
        vx: rnd(-0.07, 0.07), vy: rnd(-0.08, 0.08),
        phase: rnd(0, Math.PI * 2),
      });
    }
  }

  function isoPoint(x, y, z, unit, ox, oy) {
    var a = Math.PI / 6;
    return [
      (x - y) * unit * Math.cos(a) + ox,
      (x + y) * unit * Math.sin(a) - z * unit + oy,
    ];
  }

  function drawFace(pts, stroke, strokeA, fill, fillA, lw) {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.closePath();
    if (fill) { ctx.globalAlpha = fillA; ctx.fillStyle = fill; ctx.fill(); }
    ctx.globalAlpha = strokeA; ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke();
    ctx.globalAlpha = 1;
  }

  function drawSmallCube(gx, gy, gz, unit, ox, oy, isAccent, alpha, t) {
    var top   = [isoPoint(gx,gy,gz+1,unit,ox,oy), isoPoint(gx+1,gy,gz+1,unit,ox,oy), isoPoint(gx+1,gy+1,gz+1,unit,ox,oy), isoPoint(gx,gy+1,gz+1,unit,ox,oy)];
    var left  = [isoPoint(gx,gy+1,gz+1,unit,ox,oy), isoPoint(gx,gy+1,gz,unit,ox,oy), isoPoint(gx+1,gy+1,gz,unit,ox,oy), isoPoint(gx+1,gy+1,gz+1,unit,ox,oy)];
    var right = [isoPoint(gx+1,gy,gz+1,unit,ox,oy), isoPoint(gx+1,gy,gz,unit,ox,oy), isoPoint(gx+1,gy+1,gz,unit,ox,oy), isoPoint(gx+1,gy+1,gz+1,unit,ox,oy)];

    if (isAccent) {
      var pulse = 0.75 + Math.sin(t * 2.2 + gx + gy + gz) * 0.25;
      ctx.shadowColor = TOXIC_BRIGHT; ctx.shadowBlur = 3.5 + pulse * 3;
      drawFace(top,   TOXIC, alpha,        TOXIC, 0.045 * alpha, 0.75);
      drawFace(left,  TOXIC, 0.74 * alpha, TOXIC, 0.02  * alpha, 0.75);
      drawFace(right, TOXIC, 0.84 * alpha, TOXIC, 0.032 * alpha, 0.75);
      ctx.shadowBlur = 0;
    } else {
      drawFace(top,   LINE, 0.7  * alpha, null, 0, 0.55);
      drawFace(left,  LINE, 0.34 * alpha, null, 0, 0.55);
      drawFace(right, LINE, 0.5  * alpha, null, 0, 0.55);
    }
  }

  function drawCubeGroup(cube, t) {
    cube.x += cube.vx; cube.y += cube.vy;
    cube.angle += cube.spinSpeed * 0.01;
    var margin = cube.size * 8;
    if (cube.x < -margin)        cube.x = width  + margin;
    if (cube.x > width  + margin) cube.x = -margin;
    if (cube.y < -margin)        cube.y = height + margin;
    if (cube.y > height + margin) cube.y = -margin;

    var orbitX = Math.sin(t * cube.floatSpeed + cube.phase) * cube.floatRadiusX;
    var orbitY = Math.cos(t * cube.floatSpeed * 0.77 + cube.phase) * cube.floatRadiusY;
    var dx = cube.x - mouse.x, dy = cube.y - mouse.y;
    var dist = Math.hypot(dx, dy);
    var push = mouse.active && dist < 220 ? (1 - dist / 220) * 32 : 0;
    var px = push ? (dx / (dist || 1)) * push : 0;
    var py = push ? (dy / (dist || 1)) * push : 0;

    ctx.save();
    ctx.translate(cube.x + orbitX + px, cube.y + orbitY + py);
    ctx.rotate(cube.angle + Math.sin(t * 0.38 + cube.phase) * 0.06);

    if (cube.glow) {
      var r = cube.size * 5.4;
      var g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
      g.addColorStop(0,    'rgba(184,255,60,0.045)');
      g.addColorStop(0.42, 'rgba(184,255,60,0.015)');
      g.addColorStop(1,    'rgba(184,255,60,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    }

    var units = [];
    for (var z = 0; z < 2; z++)
      for (var y = 0; y < 2; y++)
        for (var x = 0; x < 2; x++)
          units.push({ x: x, y: y, z: z, depth: x + y - z });
    units.sort(function (a, b) { return a.depth - b.depth; });

    units.forEach(function (part, idx) {
      var ag = Math.sin(t * 1.35 + cube.phase + idx) * cube.size * 0.16;
      drawSmallCube(part.x, part.y, part.z, cube.size, 0, cube.size * 1.25 + ag, idx === cube.accentCube, cube.alpha, t);
    });

    ctx.restore();
  }

  function drawParticles(t) {
    particles.forEach(function (p) {
      p.x += p.vx; p.y += p.vy;
      if (p.x < -10) p.x = width  + 10; if (p.x > width  + 10) p.x = -10;
      if (p.y < -10) p.y = height + 10; if (p.y > height + 10) p.y = -10;
      var flicker = 0.55 + Math.sin(t * 1.8 + p.phase) * 0.45;
      ctx.globalAlpha = p.alpha * flicker;
      ctx.fillStyle = TOXIC;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
    });
    ctx.globalAlpha = 1;
  }

  function animate(ms) {
    var t = ms / 1000;
    ctx.clearRect(0, 0, width, height);
    drawParticles(t);
    cubes.slice().sort(function (a, b) { return a.size - b.size; })
         .forEach(function (c) { drawCubeGroup(c, t); });
    requestAnimationFrame(animate);
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
