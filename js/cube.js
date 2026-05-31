/* =========================================================================
   cube.js - изометрический логотип DoleFi (canvas, 2×2×2)
   • Статичный изометрический куб (оригинальный вид)
   • Акцентный куб (зелёный) плавно парит вверх-вниз сам по себе
   • При наведении мыши / таче - отскакивает и возвращается обратно
   • Остальные кубы вибрируют при приближении курсора
   ========================================================================= */

(function () {
  const canvas = document.getElementById("cube-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  /* --- Цвета из CSS-переменных --- */
  const css    = getComputedStyle(document.documentElement);
  const ACCENT = (css.getPropertyValue("--accent") || "#B8FF3C").trim();
  const LINE   = "#c8c8d4";

  /* --- Геометрия --- */
  const SIZE = 420;
  const U    = 64;
  const A    = Math.PI / 6;
  const CA   = Math.cos(A), SA = Math.sin(A);
  const CX   = SIZE / 2 - 4;
  const CY   = SIZE / 2 + 12;

  canvas.width  = SIZE; canvas.height = SIZE;
  canvas.style.width  = SIZE + "px";
  canvas.style.height = SIZE + "px";

  /* Изометрическая проекция */
  function isoP(gx, gy, gz, ox, oy) {
    return [
      CX + (gx - gy) * U * CA + (ox || 0),
      CY + (gx + gy) * U * SA - gz * U + (oy || 0),
    ];
  }

  /* Грань */
  function drawFace(pts, stroke, strokeAlpha, fill, fillAlpha, lw) {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.closePath();
    if (fill && fillAlpha > 0) {
      ctx.fillStyle = fill; ctx.globalAlpha = fillAlpha; ctx.fill();
    }
    ctx.strokeStyle = stroke; ctx.lineWidth = lw || 1.8;
    ctx.globalAlpha = strokeAlpha; ctx.stroke();
    ctx.globalAlpha = 1;
  }

  /* Юнит-куб */
  function drawCube(gx, gy, gz, ox, oy, isAccent) {
    ox = ox || 0; oy = oy || 0;
    const col = isAccent ? ACCENT : LINE;

    const top = [
      isoP(gx,   gy,   gz+1, ox, oy), isoP(gx+1, gy,   gz+1, ox, oy),
      isoP(gx+1, gy+1, gz+1, ox, oy), isoP(gx,   gy+1, gz+1, ox, oy),
    ];
    const left = [
      isoP(gx,   gy+1, gz+1, ox, oy), isoP(gx,   gy+1, gz, ox, oy),
      isoP(gx+1, gy+1, gz,   ox, oy), isoP(gx+1, gy+1, gz+1, ox, oy),
    ];
    const right = [
      isoP(gx+1, gy,   gz+1, ox, oy), isoP(gx+1, gy,   gz, ox, oy),
      isoP(gx+1, gy+1, gz,   ox, oy), isoP(gx+1, gy+1, gz+1, ox, oy),
    ];

    if (isAccent) {
      drawFace(top,   col, 0.95, col, 0.16, 2);
      drawFace(left,  col, 0.95, col, 0.09, 2);
      drawFace(right, col, 0.95, col, 0.13, 2);
    } else {
      drawFace(top,   col, 0.95, null, 0, 2.0);
      drawFace(left,  col, 0.70, null, 0, 2.0);
      drawFace(right, col, 0.82, null, 0, 2.0);
    }
  }

  /* --- 8 кубов (2×2×2) --- */
  const ACCENT_IDX = 5; /* gx=1, gy=0, gz=1 — правый верхний куб */
  const cubes = [];
  for (let gz = 0; gz <= 1; gz++)
    for (let gy = 0; gy <= 1; gy++)
      for (let gx = 0; gx <= 1; gx++)
        cubes.push({ gx, gy, gz, isAccent: false });
  cubes[ACCENT_IDX].isAccent = true;

  /* Порядок back-to-front */
  const drawOrder = cubes
    .map((c, i) => ({ i, depth: c.gx + c.gy - c.gz }))
    .sort((a, b) => a.depth - b.depth)
    .map(o => o.i);

  /* --- Состояние пружины и вибраций --- */
  const spring = { dx: 0, dy: 0, vx: 0, vy: 0 };
  const vib = cubes.map(() => ({
    dx: 0, dy: 0, amp: 0,
    freq:  0.5 + Math.random() * 1.5,
    freqY: 0.5 + Math.random() * 1.5,
    phase:  Math.random() * Math.PI * 2,
    phaseY: Math.random() * Math.PI * 2,
  }));

  /* --- Мышь: глобальное отслеживание по всему окну --- */
  const mouse   = { x: -9999, y: -9999, inside: false };
  const gmouse  = { x: 0, y: 0, active: false }; /* глобальные координаты */

  function setMouse(clientX, clientY) {
    const r = canvas.getBoundingClientRect();
    mouse.x = (clientX - r.left) * (SIZE / r.width);
    mouse.y = (clientY - r.top)  * (SIZE / r.height);
    mouse.inside = true;
  }

  /* Глобальный трекинг — для вертикального подъёма зелёного куба */
  window.addEventListener("mousemove", e => {
    gmouse.x = e.clientX;
    gmouse.y = e.clientY;
    gmouse.active = true;
  });
  window.addEventListener("mouseleave", () => { gmouse.active = false; });

  canvas.addEventListener("mousemove",  e => setMouse(e.clientX, e.clientY));
  canvas.addEventListener("mouseleave", () => { mouse.inside = false; });
  canvas.addEventListener("touchmove",  e => {
    e.preventDefault();
    setMouse(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: false });
  canvas.addEventListener("touchend", () => { mouse.inside = false; });

  /* --- Плавное следование курсора (spring к позиции мыши) --- */
  const cursor = { tx: 0, ty: 0, dx: 0, dy: 0, vx: 0, vy: 0 };

  /* --- АНИМАЦИЯ --- */
  function animate(time) {
    ctx.clearRect(0, 0, SIZE, SIZE);

    /* Зелёный куб: всегда вверх по вертикали
       Чем дальше курсор от центра экрана — тем выше куб.
       Используем глобальные координаты окна. */
    /* Зелёный куб: движется по правой вертикали изометрии (вверх-вправо, 30°) */
    const MAX_SHIFT = 36;
    if (gmouse.active) {
      const nx   = (gmouse.x / window.innerWidth)  * 2 - 1;
      const ny   = (gmouse.y / window.innerHeight) * 2 - 1;
      const dist = Math.min(Math.hypot(nx, ny), 1);
      cursor.tx =  dist * MAX_SHIFT * 0.866; /* вправо (cos 30°) */
      cursor.ty = -dist * MAX_SHIFT * 0.5;   /* вверх  (sin 30°) */
    } else {
      cursor.tx = 0;
      cursor.ty = 0;
    }

    /* Плавная пружина к целевой позиции */
    cursor.vx += (cursor.tx - cursor.dx) * 0.07;
    cursor.vy += (cursor.ty - cursor.dy) * 0.07;
    cursor.vx *= 0.82;
    cursor.vy *= 0.82;
    cursor.dx += cursor.vx;
    cursor.dy += cursor.vy;

    /* Отрисовка back-to-front:
       — белые кубы: статичны (без вибрации, без смещения)
       — зелёный куб: следует за курсором */
    for (const idx of drawOrder) {
      const c = cubes[idx];
      if (c.isAccent) {
        drawCube(c.gx, c.gy, c.gz, cursor.dx, cursor.dy, true);
      } else {
        drawCube(c.gx, c.gy, c.gz, 0, 0, false);
      }
    }

    requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);
})();
