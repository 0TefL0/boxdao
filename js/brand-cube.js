/* =========================================================================
   brand-cube.js — один изометрический куб в логотипе шапки
   • Три видимые грани (верх, лево, право) в цветах акцента
   • Плавное покачивание вверх-вниз
   ========================================================================= */
(function () {
  'use strict';

  window.initBrandCube = function () {
    var mark = document.querySelector('.brand-mark');
    if (!mark) return;

    var DPR  = Math.min(window.devicePixelRatio || 1, 2);
    var DISP = 34;
    var SIZE = DISP * DPR;

    var canvas = document.createElement('canvas');
    canvas.width  = SIZE;
    canvas.height = SIZE;
    canvas.style.cssText = 'display:block;width:' + DISP + 'px;height:' + DISP + 'px;';

    mark.innerHTML = '';
    mark.appendChild(canvas);

    var ctx = canvas.getContext('2d');
    ctx.scale(DPR, DPR);

    var css    = getComputedStyle(document.documentElement);
    var ACCENT = (css.getPropertyValue('--accent') || '#B8FF3C').trim();

    /* ── Параметры куба ── */
    var U  = 13;               /* размер куба в px */
    var A  = Math.PI / 6;      /* 30° — угол изометрии */
    var CA = Math.cos(A);      /* ≈ 0.866 */
    var SA = Math.sin(A);      /* 0.5 */

    /* Центр: куб x:[4..30], y:[3..29] в canvas 34×34 */
    var CX = 17;
    var CY = 16;

    /* Изометрическая проекция точки (gx,gy,gz) */
    function p(gx, gy, gz, oy) {
      return [
        CX + (gx - gy) * U * CA,
        CY + (gx + gy) * U * SA - gz * U + (oy || 0),
      ];
    }

    function face(pts, fillColor, fillAlpha, strokeColor, strokeAlpha, lw) {
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
      ctx.closePath();
      ctx.globalAlpha = fillAlpha;
      ctx.fillStyle   = fillColor;
      ctx.fill();
      ctx.globalAlpha = strokeAlpha;
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth   = lw;
      ctx.lineJoin    = 'round';
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    function draw(time) {
      ctx.clearRect(0, 0, DISP, DISP);

      var oy = Math.sin(time * 0.0018) * 1.8; /* плавное покачивание */

      /* ── Верхняя грань ── */
      face(
        [p(0,0,1,oy), p(1,0,1,oy), p(1,1,1,oy), p(0,1,1,oy)],
        ACCENT, 0.22,
        ACCENT, 0.95, 1.6
      );

      /* ── Левая грань (передняя левая) ── */
      face(
        [p(0,1,1,oy), p(0,1,0,oy), p(1,1,0,oy), p(1,1,1,oy)],
        ACCENT, 0.10,
        ACCENT, 0.65, 1.5
      );

      /* ── Правая грань (передняя правая) ── */
      face(
        [p(1,0,1,oy), p(1,0,0,oy), p(1,1,0,oy), p(1,1,1,oy)],
        ACCENT, 0.14,
        ACCENT, 0.80, 1.5
      );

      requestAnimationFrame(draw);
    }

    requestAnimationFrame(draw);
  };

})();
