/* =========================================================================
   brand-cube.js - мини 3D куб в логотипе (canvas, изометрия + вращение)
   Вызывается из main.js после renderHeader() через window.initBrandCube().
   ========================================================================= */
(function () {
  'use strict';

  window.initBrandCube = function () {
    var mark = document.querySelector('.brand-mark');
    if (!mark) return;

    /* ── Размер холста ── */
    var DPR  = Math.min(window.devicePixelRatio || 1, 2);
    var DISP = 30;           /* отображаемый размер, px */
    var SIZE = DISP * DPR;  /* физический размер холста */

    var canvas = document.createElement('canvas');
    canvas.width  = SIZE;
    canvas.height = SIZE;
    canvas.style.cssText = 'display:block;width:' + DISP + 'px;height:' + DISP + 'px';

    mark.innerHTML = '';
    mark.appendChild(canvas);

    var ctx = canvas.getContext('2d');
    ctx.scale(DPR, DPR);

    /* ── 8 вершин единичного куба ── */
    var V = [
      [-0.5,  0.5, -0.5], [ 0.5,  0.5, -0.5],
      [ 0.5,  0.5,  0.5], [-0.5,  0.5,  0.5],
      [-0.5, -0.5, -0.5], [ 0.5, -0.5, -0.5],
      [ 0.5, -0.5,  0.5], [-0.5, -0.5,  0.5],
    ];

    /* ── 6 граней: индексы вершин + нормаль ── */
    var FACES = [
      { idx: [0,1,2,3], n: [ 0, 1, 0] }, /* верх    */
      { idx: [7,6,5,4], n: [ 0,-1, 0] }, /* низ     */
      { idx: [3,2,6,7], n: [ 0, 0, 1] }, /* перед   */
      { idx: [4,5,1,0], n: [ 0, 0,-1] }, /* зад     */
      { idx: [2,1,5,6], n: [ 1, 0, 0] }, /* право   */
      { idx: [0,3,7,4], n: [-1, 0, 0] }, /* лево    */
    ];

    /* ── Параметры проекции ── */
    var CX    = DISP / 2;
    var CY    = DISP / 2 + 1;
    var SCALE = DISP * 0.31;
    var ISO   = Math.PI / 6;          /* 30° - угол изометрии */
    var CA    = Math.cos(ISO);
    var SA    = Math.sin(ISO);

    /* ── Вектор взгляда (изометрия: сверху-справа-спереди) ── */
    var VIEW = [CA, 0.5, -CA];
    var vl   = Math.hypot(VIEW[0], VIEW[1], VIEW[2]);
    VIEW = [VIEW[0]/vl, VIEW[1]/vl, VIEW[2]/vl];

    function dot(a, b) { return a[0]*b[0] + a[1]*b[1] + a[2]*b[2]; }

    /* Вращение вокруг Y */
    function rotY(v, t) {
      return [
         v[0] * Math.cos(t) + v[2] * Math.sin(t),
         v[1],
        -v[0] * Math.sin(t) + v[2] * Math.cos(t),
      ];
    }

    /* Изометрическая проекция */
    function project(v) {
      return [
        CX + (v[0] - v[2]) * SCALE * CA,
        CY + (v[0] + v[2]) * SCALE * SA - v[1] * SCALE,
      ];
    }

    /* ── Цикл анимации ── */
    function draw(time) {
      var t  = time * 0.001 * 0.65; /* ~9.7 сек / оборот */
      ctx.clearRect(0, 0, DISP, DISP);

      /* Повернуть все вершины */
      var rv = V.map(function (v) { return rotY(v, t); });

      /* Вычислить видимость и глубину граней */
      var visible = FACES.map(function (f) {
        var rn  = rotY(f.n, t);
        var vis = dot(rn, VIEW);
        var avgZ = f.idx.reduce(function (s, i) { return s + rv[i][2]; }, 0) / 4;
        return { f: f, vis: vis, avgZ: avgZ };
      }).filter(function (d) {
        return d.vis > 0;
      }).sort(function (a, b) {
        return a.avgZ - b.avgZ; /* painter: дальние сначала */
      });

      visible.forEach(function (d) {
        var pts = d.f.idx.map(function (i) { return project(rv[i]); });

        ctx.beginPath();
        ctx.moveTo(pts[0][0], pts[0][1]);
        for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
        ctx.closePath();

        /* Заливка: янтарь с яркостью по нормали */
        var fillA = 0.06 + d.vis * 0.20;
        ctx.fillStyle   = 'rgba(7,117,13,' + fillA.toFixed(2) + ')';
        ctx.fill();

        /* Рёбра: яркие, янтарные */
        var edgeA = 0.45 + d.vis * 0.50;
        ctx.strokeStyle = 'rgba(7,117,13,' + edgeA.toFixed(2) + ')';
        ctx.lineWidth   = 1.3;
        ctx.lineJoin    = 'round';
        ctx.stroke();
      });

      requestAnimationFrame(draw);
    }

    requestAnimationFrame(draw);
  };

})();
