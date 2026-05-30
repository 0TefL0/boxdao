/* =========================================================================
   brand-cube.js — мини-версия куба из hero (cube.js) для логотипа в шапке
   • Изометрическая сетка 2×2 маленьких кубов
   • Один акцентный куб (зелёный) плавно плавает вверх-вниз
   ========================================================================= */
(function () {
  'use strict';

  window.initBrandCube = function () {
    var mark = document.querySelector('.brand-mark');
    if (!mark) return;

    var DPR  = Math.min(window.devicePixelRatio || 1, 2);
    var DISP = 32;
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
    var LINE   = 'rgba(255,255,255,0.55)';

    var U  = 9;               /* размер одного куба */
    var A  = Math.PI / 6;
    var CA = Math.cos(A);
    var SA = Math.sin(A);
    var CX = DISP / 2 - 1;
    var CY = DISP / 2 + 3;

    function isoP(gx, gy, gz, oy) {
      return [
        CX + (gx - gy) * U * CA,
        CY + (gx + gy) * U * SA - gz * U + (oy || 0),
      ];
    }

    function drawFace(pts, stroke, strokeA, fill, fillA, lw) {
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
      ctx.closePath();
      if (fill && fillA > 0) {
        ctx.fillStyle = fill;
        ctx.globalAlpha = fillA;
        ctx.fill();
      }
      ctx.strokeStyle = stroke;
      ctx.lineWidth   = lw || 1.4;
      ctx.lineJoin    = 'round';
      ctx.globalAlpha = strokeA;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    function drawCube(gx, gy, gz, oy, isAccent) {
      oy = oy || 0;
      var col = isAccent ? ACCENT : LINE;

      var top = [
        isoP(gx,   gy,   gz+1, oy), isoP(gx+1, gy,   gz+1, oy),
        isoP(gx+1, gy+1, gz+1, oy), isoP(gx,   gy+1, gz+1, oy),
      ];
      var left = [
        isoP(gx,   gy+1, gz+1, oy), isoP(gx,   gy+1, gz, oy),
        isoP(gx+1, gy+1, gz,   oy), isoP(gx+1, gy+1, gz+1, oy),
      ];
      var right = [
        isoP(gx+1, gy,   gz+1, oy), isoP(gx+1, gy,   gz, oy),
        isoP(gx+1, gy+1, gz,   oy), isoP(gx+1, gy+1, gz+1, oy),
      ];

      if (isAccent) {
        drawFace(top,   col, 0.95, col, 0.18, 1.6);
        drawFace(left,  col, 0.95, col, 0.10, 1.6);
        drawFace(right, col, 0.95, col, 0.14, 1.6);
      } else {
        drawFace(top,   col, 0.75, null, 0, 1.3);
        drawFace(left,  col, 0.40, null, 0, 1.3);
        drawFace(right, col, 0.55, null, 0, 1.3);
      }
    }

    /* Сетка 2×2: позиции кубов */
    var grid = [
      [0, 0, 0], [1, 0, 0],
      [0, 1, 0], [1, 1, 0],
    ];
    /* Акцентный куб — правый верхний */
    var accentIdx = 1;

    function draw(time) {
      ctx.clearRect(0, 0, DISP, DISP);

      /* Плавное движение акцентного куба */
      var floatY = Math.sin(time * 0.002) * 1.8;

      grid.forEach(function (pos, idx) {
        var oy = (idx === accentIdx) ? floatY : 0;
        drawCube(pos[0], pos[1], pos[2], oy, idx === accentIdx);
      });

      requestAnimationFrame(draw);
    }

    requestAnimationFrame(draw);
  };

})();
