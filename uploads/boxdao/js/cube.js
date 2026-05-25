/* =========================================================================
   cube.js - изометрический логотип BoxDAO (canvas, 2×2×2)
   • Медленное вращение вокруг вертикальной оси
   • Плавное покачивание вверх-вниз
   • Акцентный куб реагирует на курсор / тач (пружинный отскок)
   • Остальные кубы вибрируют при приближении
   ========================================================================= */

(function () {
  const canvas = document.getElementById("cube-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  /* --- Цвета --- */
  const css    = getComputedStyle(document.documentElement);
  const ACCENT = (css.getPropertyValue("--accent") || "#07750d").trim();
  const LINE   = "#8A8A93";

  /* --- Размер холста --- */
  const SIZE = 420;
  const U    = 62;             // длина ребра
  const CX   = SIZE / 2;
  const CY   = SIZE / 2 + 12;

  canvas.width  = SIZE; canvas.height = SIZE;
  canvas.style.width  = SIZE + "px";
  canvas.style.height = SIZE + "px";

  /* --- Изометрическая проекция ---
     Координатная система: gx = вправо-вперёд, gy = влево-вперёд, gz = вверх */
  const ISO = Math.PI / 6;
  const CA  = Math.cos(ISO), SA = Math.sin(ISO);

  function project(gx, gy, gz, floatY) {
    return [
      CX + (gx - gy) * U * CA,
      CY + (gx + gy) * U * SA - gz * U + (floatY || 0),
    ];
  }

  /* --- Вращение вокруг gz (вертикальная ось), центр в (1,1) --- */
  function rotGZ(gx, gy, gz, angle) {
    const cx = gx - 1, cy = gy - 1;
    const c  = Math.cos(angle), s = Math.sin(angle);
    return [cx * c - cy * s + 1, cx * s + cy * c + 1, gz];
  }

  /* Экранная точка сетки с учётом вращения и покачивания */
  function gP(gx, gy, gz, angle, floatY) {
    const [rx, ry, rz] = rotGZ(gx, gy, gz, angle);
    return project(rx, ry, rz, floatY);
  }

  /* --- Отрисовка грани --- */
  function drawFace(pts, stroke, sAlpha, fill, fAlpha, lw) {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.closePath();
    if (fill && fAlpha > 0) {
      ctx.fillStyle = fill; ctx.globalAlpha = fAlpha; ctx.fill();
    }
    ctx.strokeStyle = stroke; ctx.lineWidth = lw || 1.8;
    ctx.globalAlpha = sAlpha; ctx.stroke();
    ctx.globalAlpha = 1;
  }

  /* --- Видимость грани по нормали (с учётом вращения) ---
     Камера в изометрии смотрит из направления (1,1,1) в сетке */
  function faceVisible(nx, ny, nz, angle) {
    const c   = Math.cos(angle), s = Math.sin(angle);
    const rnx = nx * c - ny * s;
    const rny = nx * s + ny * c;
    return rnx + rny + nz > 0.01;
  }

  /* --- Отрисовка одного юнит-куба --- */
  function drawCube(gx, gy, gz, angle, floatY, sox, soy, isAccent) {
    sox = sox || 0; soy = soy || 0;
    const col = isAccent ? ACCENT : LINE;

    function p(dx, dy, dz) {
      const [sx, sy] = gP(gx + dx, gy + dy, gz + dz, angle, floatY);
      return [sx + sox, sy + soy];
    }

    /* 6 граней: нормаль, вершины, яркость */
    const faces = [
      { n: [0,0,1],  pts: [p(0,0,1),p(1,0,1),p(1,1,1),p(0,1,1)], sA: 0.92, fA: isAccent ? 0.16 : 0 },
      { n: [1,0,0],  pts: [p(1,0,0),p(1,0,1),p(1,1,1),p(1,1,0)], sA: 0.70, fA: isAccent ? 0.12 : 0 },
      { n: [0,1,0],  pts: [p(0,1,0),p(0,1,1),p(1,1,1),p(1,1,0)], sA: 0.50, fA: isAccent ? 0.08 : 0 },
      { n: [-1,0,0], pts: [p(0,0,0),p(0,0,1),p(0,1,1),p(0,1,0)], sA: 0.55, fA: isAccent ? 0.06 : 0 },
      { n: [0,-1,0], pts: [p(0,0,0),p(0,0,1),p(1,0,1),p(1,0,0)], sA: 0.68, fA: isAccent ? 0.08 : 0 },
      { n: [0,0,-1], pts: [p(0,0,0),p(1,0,0),p(1,1,0),p(0,1,0)], sA: 0.30, fA: 0                   },
    ];

    /* Сортируем грани по глубине для корректного перекрытия */
    for (const f of faces) {
      if (!faceVisible(f.n[0], f.n[1], f.n[2], angle)) continue;
      const lw  = isAccent ? 2 : 1.6;
      const fFill = fAlpha => isAccent ? col : null;
      drawFace(f.pts, col, f.sA, isAccent ? col : null, f.fA, lw);
    }
  }

  /* --- 8 юнит-кубов (2×2×2) --- */
  const ACCENT_IDX = 7;
  const cubes = [];
  for (let gz = 0; gz <= 1; gz++)
    for (let gy = 0; gy <= 1; gy++)
      for (let gx = 0; gx <= 1; gx++)
        cubes.push({ gx, gy, gz, isAccent: false });
  cubes[ACCENT_IDX].isAccent = true;

  /* --- Пружина акцентного куба и вибрации остальных --- */
  const spring = { dx: 0, dy: 0, vx: 0, vy: 0 };
  const vib = cubes.map(() => ({
    dx: 0, dy: 0, amp: 0,
    freq:  0.5 + Math.random() * 1.5,
    freqY: 0.5 + Math.random() * 1.5,
    phase:  Math.random() * Math.PI * 2,
    phaseY: Math.random() * Math.PI * 2,
  }));

  /* --- Курсор / тач --- */
  const mouse = { x: -9999, y: -9999, inside: false };

  function setMouse(clientX, clientY) {
    const r = canvas.getBoundingClientRect();
    mouse.x = (clientX - r.left) * (SIZE / r.width);
    mouse.y = (clientY - r.top)  * (SIZE / r.height);
    mouse.inside = true;
  }

  canvas.addEventListener("mousemove",  e => setMouse(e.clientX, e.clientY));
  canvas.addEventListener("mouseleave", () => { mouse.inside = false; });
  canvas.addEventListener("touchmove",  e => {
    e.preventDefault();
    setMouse(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: false });
  canvas.addEventListener("touchend",   () => { mouse.inside = false; });

  /* --- Глубина куба для сортировки (painter's algorithm) --- */
  function cubeDepth(gx, gy, gz, angle) {
    const cx = gx + 0.5 - 1, cy = gy + 0.5 - 1;
    const c  = Math.cos(angle), s = Math.sin(angle);
    return (cx * c - cy * s + 1) + (cx * s + cy * c + 1) - gz;
  }

  /* --- ЦИКЛ АНИМАЦИИ --- */
  function animate(time) {
    const t = (time || 0) / 1000;

    /* Медленное вращение (~18 сек / оборот) */
    const rotAngle = t * 0.35;

    /* Плавное покачивание вверх-вниз */
    const floatY = Math.sin(t * 0.9) * 8;

    ctx.clearRect(0, 0, SIZE, SIZE);

    /* 1) Пружина акцентного куба */
    const ac = cubes[ACCENT_IDX];
    const [acx, acy] = gP(ac.gx + 0.5, ac.gy + 0.5, ac.gz + 0.5, rotAngle, floatY);
    const dx   = (acx + spring.dx) - mouse.x;
    const dy   = (acy + spring.dy) - mouse.y;
    const dist = Math.hypot(dx, dy);

    if (mouse.inside && dist < 200) {
      const force = (1 - dist / 200) * 5;
      const len   = dist || 1;
      const bx = -0.5, by = -0.5;
      const blen = Math.hypot(dx / len + bx, dy / len + by) || 1;
      spring.vx += ((dx / len + bx) / blen) * force;
      spring.vy += ((dy / len + by) / blen) * force;
    }
    spring.vx += -spring.dx * 0.07;
    spring.vy += -spring.dy * 0.07;
    spring.vx *= 0.80; spring.vy *= 0.80;
    spring.dx += spring.vx; spring.dy += spring.vy;

    /* 2) Вибрации остальных кубов */
    for (let i = 0; i < cubes.length; i++) {
      if (i === ACCENT_IDX) continue;
      const c = cubes[i], v = vib[i];
      const [cx2, cy2] = gP(c.gx + 0.5, c.gy + 0.5, c.gz + 0.5, rotAngle, floatY);
      const d      = Math.hypot(cx2 - mouse.x, cy2 - mouse.y);
      const target = (mouse.inside && d < 210) ? (1 - d / 210) * 3.5 : 0;
      v.amp += (target - v.amp) * 0.1;
      v.dx   = Math.sin(t * v.freq  + v.phase)  * v.amp;
      v.dy   = Math.cos(t * v.freqY + v.phaseY) * v.amp * 0.55;
    }

    /* 3) Сортировка и отрисовка back-to-front */
    const sorted = cubes
      .map((c, i) => ({ i, depth: cubeDepth(c.gx, c.gy, c.gz, rotAngle) }))
      .sort((a, b) => a.depth - b.depth)
      .map(o => o.i);

    for (const idx of sorted) {
      const c = cubes[idx];
      if (c.isAccent) {
        drawCube(c.gx, c.gy, c.gz, rotAngle, floatY, spring.dx, spring.dy, true);
      } else {
        drawCube(c.gx, c.gy, c.gz, rotAngle, floatY, vib[idx].dx, vib[idx].dy, false);
      }
    }

    requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);
})();
