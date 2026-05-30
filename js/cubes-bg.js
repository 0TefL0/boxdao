/* =========================================================================
   cubes-bg.js — плавающие кубы со слиянием (из assets/preview.html)
   ========================================================================= */
(function () {
  'use strict';

  /* ── Вставляем контейнер и canvas ── */
  var wrap = document.createElement('div');
  wrap.className = 'toxic-cubes-bg';
  wrap.setAttribute('aria-hidden', 'true');
  var canvas = document.createElement('canvas');
  canvas.id = 'toxic-cubes-canvas';
  wrap.appendChild(canvas);
  document.body.insertBefore(wrap, document.body.firstChild);

  var ctx = canvas.getContext('2d', { alpha: true });

  var TOXIC        = '#b8ff3c';
  var TOXIC_BRIGHT = '#39ff14';
  var LINE         = '#7dff4d';

  var CUBE_SIZE       = 23;
  var MERGE_DURATION  = 1100;
  var FADE_IN         = 2600;
  var MIN_CUBES       = 24;
  var MAX_CUBES       = 34;

  var width = 0, height = 0, dpr = 1;
  var cubes = [], particles = [], merges = [];
  var cubeId = 0, lastTime = 0;

  var mouse = { x: -9999, y: -9999, active: false };

  function rnd(a, b) { return a + Math.random() * (b - a); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function smooth(p) { return p * p * (3 - 2 * p); }

  function chooseSpawn(side) {
    if (side === undefined) side = Math.floor(rnd(0, 4));
    var padX = width * 0.26, padY = height * 0.26;
    if (side === 0) return { side: side, x: rnd(-padX, width + padX),  y: rnd(-padY, -70) };
    if (side === 1) return { side: side, x: rnd(width + 70, width + padX), y: rnd(-padY, height + padY) };
    if (side === 2) return { side: side, x: rnd(-padX, width + padX),  y: rnd(height + 70, height + padY) };
    return { side: side, x: rnd(-padX, -70), y: rnd(-padY, height + padY) };
  }

  function targetFromSide(side) {
    var opp = (side + 2) % 4;
    var ts = Math.random() > 0.78 ? (side + (Math.random() > 0.5 ? 1 : 3)) % 4 : opp;
    return chooseSpawn(ts);
  }

  function makeCube(start, target, now) {
    now = now || 0;
    var dx = target.x - start.x, dy = target.y - start.y;
    var len = Math.sqrt(dx*dx + dy*dy) || 1;
    var spd = rnd(0.014, 0.032);
    return {
      id: cubeId++,
      x: start.x, y: start.y,
      vx: (dx / len) * spd, vy: (dy / len) * spd,
      angle: rnd(0, Math.PI * 2),
      spinSpeed: rnd(-0.00011, 0.00011),
      phase: rnd(0, Math.PI * 2),
      floatRadiusX: rnd(10, 30), floatRadiusY: rnd(8, 26),
      floatSpeed: rnd(0.13, 0.28),
      baseAlpha: rnd(0.44, 0.82),
      bornAt: now,
      mergeCooldownUntil: now + 2200,
      glow: Math.random() > 0.72,
      bright: Math.random() > 0.80,
      screenX: start.x, screenY: start.y,
      screenAlpha: 0, screenScale: 1,
    };
  }

  function spawnCube(now) {
    var s = chooseSpawn();
    return makeCube(s, targetFromSide(s.side), now);
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth; height = window.innerHeight;
    canvas.width  = Math.floor(width  * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width  = width  + 'px';
    canvas.style.height = height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    createScene();
  }

  function createScene() {
    cubes = []; particles = []; merges = [];
    var sf = Math.max(1, (width * height) / (1440 * 900));
    var cc = Math.round(Math.min(MAX_CUBES, Math.max(MIN_CUBES, 26 * sf)));
    var pc = Math.round(Math.min(95, Math.max(36, 52 * sf)));

    for (var i = 0; i < cc; i++) {
      var c = spawnCube(-rnd(0, 28000));
      c.x = rnd(-width * 0.18, width * 1.18);
      c.y = rnd(-height * 0.18, height * 1.18);
      c.bornAt = -rnd(FADE_IN, 14000);
      c.mergeCooldownUntil = rnd(0, 2200);
      cubes.push(c);
    }
    for (var j = 0; j < pc; j++) {
      particles.push({
        x: rnd(0, width), y: rnd(0, height),
        r: rnd(0.22, 0.95), alpha: rnd(0.02, 0.09),
        vx: rnd(-0.018, 0.018), vy: rnd(-0.02, 0.02),
        phase: rnd(0, Math.PI * 2),
      });
    }
  }

  function isoPoint(x, y, z, unit, ox, oy) {
    var a = Math.PI / 6;
    return [(x - y) * unit * Math.cos(a) + ox, (x + y) * unit * Math.sin(a) - z * unit + oy];
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

  function drawSingleCube(unit, alpha, bright, t) {
    var ox = 0, oy = unit * 0.65;
    var top   = [isoPoint(0,0,1,unit,ox,oy), isoPoint(1,0,1,unit,ox,oy), isoPoint(1,1,1,unit,ox,oy), isoPoint(0,1,1,unit,ox,oy)];
    var left  = [isoPoint(0,1,1,unit,ox,oy), isoPoint(0,1,0,unit,ox,oy), isoPoint(1,1,0,unit,ox,oy), isoPoint(1,1,1,unit,ox,oy)];
    var right = [isoPoint(1,0,1,unit,ox,oy), isoPoint(1,0,0,unit,ox,oy), isoPoint(1,1,0,unit,ox,oy), isoPoint(1,1,1,unit,ox,oy)];
    var pulse = 0.75 + Math.sin(t * 1.1) * 0.25;
    var stroke = bright ? TOXIC : LINE;
    if (bright) { ctx.shadowColor = TOXIC_BRIGHT; ctx.shadowBlur = 1.7 + pulse * 1.6; }
    drawFace(top,   stroke, 0.70 * alpha, TOXIC, 0.035 * alpha, 0.72);
    drawFace(left,  stroke, 0.36 * alpha, TOXIC, 0.012 * alpha, 0.72);
    drawFace(right, stroke, 0.52 * alpha, TOXIC, 0.020 * alpha, 0.72);
    ctx.shadowBlur = 0;
  }

  function renderCube(x, y, alpha, angle, bright, glow, t, scale) {
    if (alpha <= 0.01) return;
    scale = scale || 1;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.scale(scale, scale);
    if (glow) {
      var r = CUBE_SIZE * 2.65;
      var g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
      g.addColorStop(0,    'rgba(184,255,60,0.021)');
      g.addColorStop(0.45, 'rgba(184,255,60,0.007)');
      g.addColorStop(1,    'rgba(184,255,60,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    }
    drawSingleCube(CUBE_SIZE, alpha, bright, t);
    ctx.restore();
  }

  function edgeFade(x, y) {
    var m = 120;
    var fx = Math.min(clamp((x + m) / m, 0, 1), clamp((width  + m - x) / m, 0, 1));
    var fy = Math.min(clamp((y + m) / m, 0, 1), clamp((height + m - y) / m, 0, 1));
    return Math.min(fx, fy);
  }

  function updateCube(cube, dt, timeMs, t) {
    cube.x += cube.vx * dt; cube.y += cube.vy * dt;
    cube.angle += cube.spinSpeed * dt;
    var wx = Math.sin(t * cube.floatSpeed + cube.phase) * cube.floatRadiusX;
    var wy = Math.cos(t * cube.floatSpeed * 0.82 + cube.phase) * cube.floatRadiusY;
    var x = cube.x + wx, y = cube.y + wy;
    var dx = x - mouse.x, dy = y - mouse.y;
    var dist = Math.sqrt(dx*dx + dy*dy);
    var push = mouse.active && dist < 88 ? (1 - dist / 88) * 2 : 0;
    if (push > 0) { x += (dx / (dist || 1)) * push; y += (dy / (dist || 1)) * push; }
    var fadeIn = clamp((timeMs - cube.bornAt) / FADE_IN, 0, 1);
    var fade = smooth(fadeIn) * edgeFade(x, y);
    cube.screenX = x; cube.screenY = y;
    cube.screenAlpha = cube.baseAlpha * fade;
    var off = 260;
    if (x < -off || x > width + off || y < -off || y > height + off) {
      var ns = spawnCube(timeMs);
      Object.keys(ns).forEach(function (k) { cube[k] = ns[k]; });
    }
  }

  function startMerge(a, b, timeMs) {
    var mx = (a.screenX + b.screenX) / 2, my = (a.screenY + b.screenY) / 2;
    var merged = {
      id: cubeId++, x: mx, y: my,
      vx: (a.vx + b.vx) / 2 || rnd(-0.012, 0.012),
      vy: (a.vy + b.vy) / 2 || rnd(-0.012, 0.012),
      angle: (a.angle + b.angle) / 2,
      spinSpeed: (a.spinSpeed + b.spinSpeed) / 2,
      phase: (a.phase + b.phase) / 2,
      floatRadiusX: (a.floatRadiusX + b.floatRadiusX) / 2,
      floatRadiusY: (a.floatRadiusY + b.floatRadiusY) / 2,
      floatSpeed: Math.min(a.floatSpeed, b.floatSpeed),
      baseAlpha: clamp(Math.max(a.baseAlpha, b.baseAlpha) * 0.98, 0.42, 0.86),
      bornAt: timeMs - FADE_IN,
      mergeCooldownUntil: timeMs + 1800,
      glow: a.glow || b.glow, bright: a.bright || b.bright,
      screenX: mx, screenY: my,
      screenAlpha: Math.max(a.screenAlpha, b.screenAlpha), screenScale: 1,
    };
    merges.push({
      startTime: timeMs, duration: MERGE_DURATION, midX: mx, midY: my,
      a: { x: a.screenX, y: a.screenY, alpha: a.screenAlpha, angle: a.angle, bright: a.bright, glow: a.glow },
      b: { x: b.screenX, y: b.screenY, alpha: b.screenAlpha, angle: b.angle, bright: b.bright, glow: b.glow },
      merged: merged,
    });
  }

  function detectMerges(timeMs) {
    for (var i = 0; i < cubes.length; i++) {
      var a = cubes[i];
      if (!a || a.screenAlpha < 0.18 || timeMs < a.mergeCooldownUntil) continue;
      for (var j = i + 1; j < cubes.length; j++) {
        var b = cubes[j];
        if (!b || b.screenAlpha < 0.18 || timeMs < b.mergeCooldownUntil) continue;
        var dx = a.screenX - b.screenX, dy = a.screenY - b.screenY;
        if (Math.sqrt(dx*dx + dy*dy) > CUBE_SIZE * 1.25) continue;
        startMerge(a, b, timeMs);
        cubes.splice(j, 1); cubes.splice(i, 1);
        return;
      }
    }
  }

  function drawMerges(timeMs, t) {
    var alive = [];
    for (var k = 0; k < merges.length; k++) {
      var m = merges[k];
      var p = clamp((timeMs - m.startTime) / m.duration, 0, 1);
      var pull     = smooth(p);
      var dissolve = smooth(clamp((p - 0.12) / 0.82, 0, 1));
      var appear   = smooth(clamp((p - 0.20) / 0.78, 0, 1));
      renderCube(lerp(m.a.x, m.midX, pull), lerp(m.a.y, m.midY, pull), m.a.alpha*(1-dissolve), m.a.angle + Math.sin(t*0.12)*0.018, m.a.bright, m.a.glow, t, lerp(1, 0.72, dissolve));
      renderCube(lerp(m.b.x, m.midX, pull), lerp(m.b.y, m.midY, pull), m.b.alpha*(1-dissolve), m.b.angle - Math.sin(t*0.12)*0.018, m.b.bright, m.b.glow, t, lerp(1, 0.72, dissolve));
      renderCube(m.midX, m.midY, m.merged.baseAlpha*appear, m.merged.angle + Math.sin(t*0.10+m.merged.phase)*0.014, m.merged.bright, m.merged.glow, t, lerp(0.72, 1, appear));
      if (p < 1) { alive.push(m); } else {
        m.merged.x = m.midX; m.merged.y = m.midY;
        m.merged.screenX = m.midX; m.merged.screenY = m.midY;
        m.merged.screenAlpha = m.merged.baseAlpha;
        cubes.push(m.merged);
      }
    }
    merges = alive;
  }

  function keepPopulation(timeMs) {
    if (cubes.length + merges.length < MIN_CUBES) cubes.push(spawnCube(timeMs));
  }

  function drawParticles(t, dt) {
    ctx.fillStyle = TOXIC;
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.x < -10) p.x = width + 10; if (p.x > width + 10) p.x = -10;
      if (p.y < -10) p.y = height + 10; if (p.y > height + 10) p.y = -10;
      ctx.globalAlpha = p.alpha * (0.55 + Math.sin(t * 1.1 + p.phase) * 0.45);
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.2832); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function animate(timeMs) {
    var dt = lastTime ? Math.min(34, timeMs - lastTime) : 16;
    lastTime = timeMs;
    var t = timeMs / 1000;
    ctx.clearRect(0, 0, width, height);
    drawParticles(t, dt);
    for (var i = 0; i < cubes.length; i++) updateCube(cubes[i], dt, timeMs, t);
    detectMerges(timeMs);
    cubes.slice().sort(function (a, b) { return a.screenAlpha - b.screenAlpha; })
      .forEach(function (c) { renderCube(c.screenX, c.screenY, c.screenAlpha, c.angle + Math.sin(t*0.18+c.phase)*0.032, c.bright, c.glow, t, 1); });
    drawMerges(timeMs, t);
    keepPopulation(timeMs);
    requestAnimationFrame(animate);
  }

  /* Обновляем CSS фона согласно новому preview */
  var style = document.createElement('style');
  style.textContent = '.toxic-cubes-bg{background:radial-gradient(circle at 18% 18%,rgba(184,255,60,.035),transparent 24%),radial-gradient(circle at 82% 72%,rgba(57,255,20,.026),transparent 28%),radial-gradient(circle at 50% 50%,rgba(184,255,60,.018),transparent 34%),linear-gradient(145deg,#050705 0%,#000 54%,#020302 100%)}#toxic-cubes-canvas{filter:drop-shadow(0 0 4px rgba(184,255,60,.03))}';
  document.head.appendChild(style);

  window.addEventListener('resize', resize);
  window.addEventListener('mousemove', function (e) { mouse.x = e.clientX; mouse.y = e.clientY; mouse.active = true; });
  window.addEventListener('mouseleave', function () { mouse.active = false; });
  window.addEventListener('touchmove', function (e) { if (!e.touches[0]) return; mouse.x = e.touches[0].clientX; mouse.y = e.touches[0].clientY; mouse.active = true; }, { passive: true });
  window.addEventListener('touchend', function () { mouse.active = false; });

  resize();
  requestAnimationFrame(animate);
})();
