/* =========================================================================
   cube.js - изометрический логотип BoxDAO (canvas, 2×2×2)
   --------------------------------------------------------------------------
   • Восемь юнит-кубов рисуются в изометрии (back-to-front).
   • Один куб «акцентный» (ACCENT_IDX) - реагирует на курсор: отталкивается
     с пружинным возвратом на место.
   • Остальные кубы при приближении курсора независимо вибрируют.
   • Цвета берутся из CSS-переменных (--accent и т.д.) - менять там.

   Подключение: на странице должен быть <canvas id="cube-canvas"></canvas>.
   ========================================================================= */

(function () {
  const canvas = document.getElementById("cube-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  /* --- Цвета из CSS-переменных (единый источник истины) --- */
  const css = getComputedStyle(document.documentElement);
  const ACCENT = (css.getPropertyValue("--accent") || "#E3B341").trim();
  const LINE   = "#8A8A93";  // нейтральный цвет каркасных кубов

  /* --- Геометрия изометрии --- */
  const SIZE = 420;          // размер холста (px)
  const U = 64;              // длина ребра юнит-куба
  const A = Math.PI / 6;     // угол изометрии (30°)
  const CA = Math.cos(A), SA = Math.sin(A);
  const CX = SIZE / 2 - 4;   // центр по X (лёгкий сдвиг для оптической центровки)
  const CY = SIZE / 2 + 12;  // центр по Y

  canvas.width = SIZE; canvas.height = SIZE;
  canvas.style.width = SIZE + "px";
  canvas.style.height = SIZE + "px";

  /* Перевод координат сетки (gx,gy,gz) в экранную точку, с офсетом (ox,oy) */
  function isoP(gx, gy, gz, ox, oy) {
    return [
      CX + (gx - gy) * U * CA + (ox || 0),
      CY + (gx + gy) * U * SA - gz * U + (oy || 0),
    ];
  }

  /* Рисуем одну грань (заливка + обводка) */
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

  /* Рисуем один юнит-куб (3 видимые грани: верх, левая, правая) */
  function drawCube(gx, gy, gz, ox, oy, isAccent) {
    ox = ox || 0; oy = oy || 0;
    const col = isAccent ? ACCENT : LINE;

    const top = [
      isoP(gx, gy, gz + 1, ox, oy), isoP(gx + 1, gy, gz + 1, ox, oy),
      isoP(gx + 1, gy + 1, gz + 1, ox, oy), isoP(gx, gy + 1, gz + 1, ox, oy),
    ];
    const left = [
      isoP(gx, gy + 1, gz + 1, ox, oy), isoP(gx, gy + 1, gz, ox, oy),
      isoP(gx + 1, gy + 1, gz, ox, oy), isoP(gx + 1, gy + 1, gz + 1, ox, oy),
    ];
    const right = [
      isoP(gx + 1, gy, gz + 1, ox, oy), isoP(gx + 1, gy, gz, ox, oy),
      isoP(gx + 1, gy + 1, gz, ox, oy), isoP(gx + 1, gy + 1, gz + 1, ox, oy),
    ];

    if (isAccent) {
      drawFace(top,   col, 0.95, col, 0.16, 2);
      drawFace(left,  col, 0.95, col, 0.09, 2);
      drawFace(right, col, 0.95, col, 0.13, 2);
    } else {
      drawFace(top,   col, 0.80, null, 0, 1.6);
      drawFace(left,  col, 0.45, null, 0, 1.6);
      drawFace(right, col, 0.60, null, 0, 1.6);
    }
  }

  /* --- Определение 8 кубов (2×2×2). Акцентный = верхний-передний-правый --- */
  const ACCENT_IDX = 7;
  const cubes = [];
  for (let gz = 0; gz <= 1; gz++)
    for (let gy = 0; gy <= 1; gy++)
      for (let gx = 0; gx <= 1; gx++)
        cubes.push({ gx, gy, gz, isAccent: false });
  cubes[ACCENT_IDX].isAccent = true;

  /* Порядок отрисовки: дальние кубы раньше (back-to-front) */
  const drawOrder = cubes
    .map((c, i) => ({ i, depth: c.gx + c.gy - c.gz }))
    .sort((a, b) => a.depth - b.depth)
    .map((o) => o.i);

  /* Состояние акцентного куба (пружина) и вибраций остальных */
  const spring = { dx: 0, dy: 0, vx: 0, vy: 0 };
  const vib = cubes.map(() => ({
    dx: 0, dy: 0, amp: 0,
    freq:  0.5 + Math.random() * 1.5,
    freqY: 0.5 + Math.random() * 1.5,
    phase:  Math.random() * Math.PI * 2,
    phaseY: Math.random() * Math.PI * 2,
  }));

  /* Позиция мыши относительно холста */
  const mouse = { x: -9999, y: -9999, inside: false };
  canvas.addEventListener("mousemove", (e) => {
    const r = canvas.getBoundingClientRect();
    mouse.x = e.clientX - r.left;
    mouse.y = e.clientY - r.top;
    mouse.inside = true;
  });
  canvas.addEventListener("mouseleave", () => { mouse.inside = false; });

  /* --------------------------- ЦИКЛ АНИМАЦИИ --------------------------- */
  function animate(time) {
    const t = (time || 0) / 1000;
    ctx.clearRect(0, 0, SIZE, SIZE);

    /* 1) Акцентный куб отталкивается от курсора */
    const ac = cubes[ACCENT_IDX];
    const [acx, acy] = isoP(ac.gx + 0.5, ac.gy + 0.5, ac.gz + 0.5);
    const dx = (acx + spring.dx) - mouse.x;
    const dy = (acy + spring.dy) - mouse.y;
    const dist = Math.hypot(dx, dy);

    if (mouse.inside && dist < 200) {
      const force = (1 - dist / 200) * 5;       // сила тем больше, чем ближе курсор
      const len = dist || 1;
      // лёгкий диагональный «характер» отскока
      const bx = -0.5, by = -0.5;
      const blen = Math.hypot(dx / len + bx, dy / len + by) || 1;
      spring.vx += ((dx / len + bx) / blen) * force;
      spring.vy += ((dy / len + by) / blen) * force;
    }
    // Пружинный возврат на место + затухание
    spring.vx += -spring.dx * 0.07;
    spring.vy += -spring.dy * 0.07;
    spring.vx *= 0.80; spring.vy *= 0.80;
    spring.dx += spring.vx; spring.dy += spring.vy;

    /* 2) Остальные кубы вибрируют рядом с курсором */
    for (let i = 0; i < cubes.length; i++) {
      if (i === ACCENT_IDX) continue;
      const c = cubes[i], v = vib[i];
      const [cx2, cy2] = isoP(c.gx + 0.5, c.gy + 0.5, c.gz + 0.5);
      const d = Math.hypot(cx2 - mouse.x, cy2 - mouse.y);
      const target = (mouse.inside && d < 210) ? (1 - d / 210) * 3.5 : 0;
      v.amp += (target - v.amp) * 0.1;          // плавное нарастание/затухание
      v.dx = Math.sin(t * v.freq  + v.phase)  * v.amp;
      v.dy = Math.cos(t * v.freqY + v.phaseY) * v.amp * 0.55;
    }

    /* 3) Рисуем back-to-front */
    for (const idx of drawOrder) {
      const c = cubes[idx];
      if (c.isAccent) drawCube(c.gx, c.gy, c.gz, spring.dx, spring.dy, true);
      else            drawCube(c.gx, c.gy, c.gz, vib[idx].dx, vib[idx].dy, false);
    }

    requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);
})();
