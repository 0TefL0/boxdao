/* =========================================================================
   brand-cube.js — мини-версия hero-куба (cube.js) для логотипа в шапке
   • 2×2×2 кубов, один акцентный зелёный (как на главной)
   • Плавное покачивание акцентного куба
   ========================================================================= */
(function () {
  'use strict';

  window.initBrandCube = function () {
    var mark = document.querySelector('.brand-mark');
    if (!mark) return;

    var DPR  = Math.min(window.devicePixelRatio || 1, 2);
    var DISP = 44;
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
    var LINE   = '#8A8A93';

    /* ── Геометрия (масштаб cube.js × ~0.156) ── */
    var U  = 10;
    var A  = Math.PI / 6;
    var CA = Math.cos(A);
    var SA = Math.sin(A);
    var CX = 22;
    var CY = 22;

    function isoP(gx, gy, gz, ox, oy) {
      return [
        CX + (gx - gy) * U * CA + (ox || 0),
        CY + (gx + gy) * U * SA - gz * U + (oy || 0),
      ];
    }

    function drawFace(pts, stroke, strokeAlpha, fill, fillAlpha, lw) {
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
      ctx.closePath();
      if (fill && fillAlpha > 0) {
        ctx.fillStyle = fill; ctx.globalAlpha = fillAlpha; ctx.fill();
      }
      ctx.strokeStyle = stroke;
      ctx.lineWidth   = lw || 1.6;
      ctx.lineJoin    = 'round';
      ctx.globalAlpha = strokeAlpha;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    function drawCube(gx, gy, gz, ox, oy, isAccent) {
      ox = ox || 0; oy = oy || 0;
      var col = isAccent ? ACCENT : LINE;

      var top = [
        isoP(gx,   gy,   gz+1, ox, oy), isoP(gx+1, gy,   gz+1, ox, oy),
        isoP(gx+1, gy+1, gz+1, ox, oy), isoP(gx,   gy+1, gz+1, ox, oy),
      ];
      var left = [
        isoP(gx,   gy+1, gz+1, ox, oy), isoP(gx,   gy+1, gz, ox, oy),
        isoP(gx+1, gy+1, gz,   ox, oy), isoP(gx+1, gy+1, gz+1, ox, oy),
      ];
      var right = [
        isoP(gx+1, gy,   gz+1, ox, oy), isoP(gx+1, gy,   gz, ox, oy),
        isoP(gx+1, gy+1, gz,   ox, oy), isoP(gx+1, gy+1, gz+1, ox, oy),
      ];

      if (isAccent) {
        drawFace(top,   col, 0.95, col, 0.16, 1.4);
        drawFace(left,  col, 0.95, col, 0.09, 1.4);
        drawFace(right, col, 0.95, col, 0.13, 1.4);
      } else {
        drawFace(top,   col, 0.80, null, 0, 1.2);
        drawFace(left,  col, 0.45, null, 0, 1.2);
        drawFace(right, col, 0.60, null, 0, 1.2);
      }
    }

    /* ── 2×2×2 = 8 кубов, акцентный — gx=1, gy=0, gz=1 (как в cube.js) ── */
    var ACCENT_IDX = 5;
    var cubes = [];
    for (var gz = 0; gz <= 1; gz++)
      for (var gy = 0; gy <= 1; gy++)
        for (var gx = 0; gx <= 1; gx++)
          cubes.push({ gx: gx, gy: gy, gz: gz, isAccent: false });
    cubes[ACCENT_IDX].isAccent = true;

    /* Порядок back-to-front */
    var drawOrder = cubes
      .map(function (c, i) { return { i: i, depth: c.gx + c.gy - c.gz }; })
      .sort(function (a, b) { return a.depth - b.depth; })
      .map(function (o) { return o.i; });

    function draw(time) {
      ctx.clearRect(0, 0, DISP, DISP);

      /* Плавное вертикальное покачивание акцентного куба */
      var floatY = Math.sin(time * 0.0018) * 1.8;

      for (var k = 0; k < drawOrder.length; k++) {
        var idx = drawOrder[k];
        var c   = cubes[idx];
        drawCube(c.gx, c.gy, c.gz, 0, c.isAccent ? floatY : 0, c.isAccent);
      }

      requestAnimationFrame(draw);
    }

    requestAnimationFrame(draw);
  };

})();
