/* =========================================================================
   water.js — WebGL интерактивный анимированный фон (имитация воды)
   ─────────────────────────────────────────────────────────────────────────
   • Height-map симуляция полностью на GPU (GLSL шейдеры).
   • Два floating-point буфера (ping-pong): R = текущая высота,
     G = предыдущая высота — один проход за кадр.
   • background.jpg преломляется через нормали воды (refraction).
   • Янтарные блики на гребнях волн.
   • Симуляция на половинном разрешении → рендер в полном (bilinear upscale).
   ========================================================================= */
(function () {
  'use strict';

  /* ── CONFIG ── */
  const SIM_SCALE = 2;     // симуляция = viewport / SIM_SCALE (GPU быстрый, можно 1)
  const DAMPING   = 0.988; // затухание
  const REFRACT   = 3.2;   // сила преломления (в пикселях симуляции)
  const DARK      = 0.42;  // затемнение фона

  /* ── CANVAS ── */
  const canvas = document.createElement('canvas');
  canvas.id = 'water-canvas';
  canvas.style.cssText = [
    'position:fixed', 'top:0', 'left:0',
    'width:100%',     'height:100%',
    'z-index:-2',     'pointer-events:none'
  ].join(';');
  document.body.prepend(canvas);

  /* ── WebGL context (WebGL2 → WebGL1 fallback) ── */
  const gl = canvas.getContext('webgl2') ||
             canvas.getContext('webgl')  ||
             canvas.getContext('experimental-webgl');
  if (!gl) return;

  const isGL2 = typeof WebGL2RenderingContext !== 'undefined'
             && gl instanceof WebGL2RenderingContext;

  /* Floating-point texture negotiation + render-to-float check */
  let intFmt, texFmt, texType;
  let ready = false;

  if (isGL2) {
    /* WebGL2: нужно расширение для рендера в float-буфер */
    if (gl.getExtension('EXT_color_buffer_float') ||
        gl.getExtension('EXT_color_buffer_half_float')) {
      intFmt  = gl.RGBA16F;
      texFmt  = gl.RGBA;
      texType = gl.HALF_FLOAT;
      ready   = true;
    }
  }

  if (!ready) {
    /* WebGL1 fallback */
    const hf = gl.getExtension('OES_texture_half_float');
    if (hf) gl.getExtension('OES_texture_half_float_linear');
    const fl = !hf && gl.getExtension('OES_texture_float');
    if (fl) gl.getExtension('OES_texture_float_linear');
    if      (hf) { intFmt = gl.RGBA; texFmt = gl.RGBA; texType = hf.HALF_FLOAT_OES; ready = true; }
    else if (fl) { intFmt = gl.RGBA; texFmt = gl.RGBA; texType = gl.FLOAT;           ready = true; }
  }

  if (!ready) return; // нет поддержки float текстур — выходим

  /* ── VERTEX SHADER (общий) ── */
  const VS = `\
attribute vec2 aPos;
varying vec2 vUv;
void main(){
  vUv = aPos*0.5+0.5;
  gl_Position = vec4(aPos,0.0,1.0);
}`;

  /* ── СИМУЛЯЦИЯ: R=текущая высота, G=предыдущая (ping-pong) ── */
  const SIM_FS = `\
precision highp float;
uniform sampler2D uSim;
uniform vec2  uPx;
uniform float uDamp;
uniform vec2  uDropUV;
uniform float uDropR;
uniform float uDropStr;
varying vec2 vUv;
void main(){
  float cur  = texture2D(uSim, vUv).r;
  float prev = texture2D(uSim, vUv).g;
  float l = texture2D(uSim, vUv - vec2(uPx.x, 0.0)).r;
  float r = texture2D(uSim, vUv + vec2(uPx.x, 0.0)).r;
  float u = texture2D(uSim, vUv - vec2(0.0, uPx.y)).r;
  float d = texture2D(uSim, vUv + vec2(0.0, uPx.y)).r;
  float nxt = ((l + r + u + d) * 0.5 - prev) * uDamp;
  if(uDropStr > 0.0){
    float dist = distance(vUv, uDropUV);
    if(dist < uDropR) nxt += uDropStr * (1.0 - dist / uDropR);
  }
  gl_FragColor = vec4(nxt, cur, 0.0, 1.0);
}`;

  /* ── РЕНДЕР: фон + преломление + янтарный блик ── */
  const RENDER_FS = `\
precision highp float;
uniform sampler2D uSim;
uniform sampler2D uBg;
uniform vec2  uPx;
uniform vec2  uRef;
uniform float uDark;
varying vec2 vUv;
void main(){
  float h  = texture2D(uSim, vUv).r;
  float lh = texture2D(uSim, vUv - vec2(uPx.x, 0.0)).r;
  float rh = texture2D(uSim, vUv + vec2(uPx.x, 0.0)).r;
  float uh = texture2D(uSim, vUv - vec2(0.0, uPx.y)).r;
  float dh = texture2D(uSim, vUv + vec2(0.0, uPx.y)).r;
  vec2 grad  = vec2(rh - lh, dh - uh) * 0.5;
  vec2 refUv = clamp(vUv + grad * uRef, 0.0, 1.0);
  vec3 col   = texture2D(uBg, refUv).rgb * uDark;
  /* Янтарный блик: AMBER=[7,117,13]/255, weights=[0.30,0.17,0.07] */
  float spec = max(h, 0.0) * 0.068;
  col.r += spec * (7.0   / 255.0) * 0.30;
  col.g += spec * (117.0 / 255.0) * 0.17;
  col.b += spec * (13.0  / 255.0) * 0.07;
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`;

  /* ── КОМПИЛЯЦИЯ / ЛИНКОВКА ── */
  function mkSh(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return s;
  }
  function mkProg(fsSrc) {
    const p = gl.createProgram();
    gl.attachShader(p, mkSh(gl.VERTEX_SHADER, VS));
    gl.attachShader(p, mkSh(gl.FRAGMENT_SHADER, fsSrc));
    gl.linkProgram(p);
    return p;
  }

  const simProg    = mkProg(SIM_FS);
  const renderProg = mkProg(RENDER_FS);

  /* Кэш uniform-локаций */
  const U = {
    s: {
      sim:     gl.getUniformLocation(simProg, 'uSim'),
      px:      gl.getUniformLocation(simProg, 'uPx'),
      damp:    gl.getUniformLocation(simProg, 'uDamp'),
      dropUV:  gl.getUniformLocation(simProg, 'uDropUV'),
      dropR:   gl.getUniformLocation(simProg, 'uDropR'),
      dropStr: gl.getUniformLocation(simProg, 'uDropStr'),
    },
    r: {
      sim:  gl.getUniformLocation(renderProg, 'uSim'),
      bg:   gl.getUniformLocation(renderProg, 'uBg'),
      px:   gl.getUniformLocation(renderProg, 'uPx'),
      ref:  gl.getUniformLocation(renderProg, 'uRef'),
      dark: gl.getUniformLocation(renderProg, 'uDark'),
    }
  };

  /* ── FULLSCREEN QUAD ── */
  const quadBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
  gl.bufferData(gl.ARRAY_BUFFER,
    new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);

  function bindQuad(prog) {
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
    const a = gl.getAttribLocation(prog, 'aPos');
    gl.enableVertexAttribArray(a);
    gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0);
  }

  /* ── ТЕКСТУРЫ И FBO ── */
  let SW = 0, SH = 0;
  let texA, texB, fboA, fboB;
  let bgTex = null;
  let ping  = true; // true → читаем texA, пишем в fboB

  function mkSimTex(w, h) {
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, intFmt, w, h, 0, texFmt, texType, null);
    return t;
  }

  function mkFBO(tex) {
    const fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0,
                            gl.TEXTURE_2D, tex, 0);
    const ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    if (!ok) { gl.deleteFramebuffer(fb); return null; }
    return fb;
  }

  /* ── RESIZE ── */
  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    SW = Math.max(4, Math.ceil(window.innerWidth  / SIM_SCALE));
    SH = Math.max(4, Math.ceil(window.innerHeight / SIM_SCALE));
    if (texA) gl.deleteTexture(texA);
    if (texB) gl.deleteTexture(texB);
    texA = mkSimTex(SW, SH);
    texB = mkSimTex(SW, SH);
    fboA = mkFBO(texA);
    fboB = mkFBO(texB);
    if (!fboA || !fboB) return; // FBO не поддерживается — тихо выходим
    ping = true;
    if (bgImg.complete && bgImg.naturalWidth) uploadBg();
  }

  window.addEventListener('resize', resize);

  /* ── ФОНОВАЯ ТЕКСТУРА ── */
  const bgImg = new Image();
  bgImg.src   = 'assets/img/background.jpg';
  bgImg.onload = uploadBg;

  function uploadBg() {
    if (!SW) return;
    if (!bgTex) bgTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, bgTex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bgImg);
    gl.generateMipmap(gl.TEXTURE_2D);
  }

  resize();

  /* ── РЯБЬ ── */
  let drop = null;

  function addDrop(nx, ny, r, str) {
    /* ny флипнут: WebGL UV начинается снизу */
    drop = { x: nx, y: 1.0 - ny, r: r, str: str };
  }

  /* ── МЫШЬ ── */
  let lastMouse = 0;
  document.addEventListener('mousemove', function (e) {
    const now = performance.now();
    if (now - lastMouse < 38) return;
    lastMouse = now;
    addDrop(
      e.clientX / window.innerWidth,
      e.clientY / window.innerHeight,
      2 / SW, 7
    );
  });

  document.addEventListener('click', function (e) {
    addDrop(
      e.clientX / window.innerWidth,
      e.clientY / window.innerHeight,
      8 / SW, 22
    );
  });

  /* ── ФОНОВЫЕ КАПЛИ (дождь) ── */
  function rain() {
    addDrop(
      Math.random(), Math.random(),
      (1 + Math.random() * 2) / SW,
      1.2 + Math.random() * 2.8
    );
    setTimeout(rain, 700 + Math.random() * 2200);
  }
  rain();

  /* ── ГЛАВНЫЙ ЦИКЛ ── */
  function tick() {
    if (!SW || !bgTex) { requestAnimationFrame(tick); return; }

    /* — Шаг симуляции — */
    const readTex  = ping ? texA : texB;
    const writeFBO = ping ? fboB : fboA;

    gl.bindFramebuffer(gl.FRAMEBUFFER, writeFBO);
    gl.viewport(0, 0, SW, SH);
    gl.useProgram(simProg);
    bindQuad(simProg);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, readTex);
    gl.uniform1i(U.s.sim,  0);
    gl.uniform2f(U.s.px,   1 / SW, 1 / SH);
    gl.uniform1f(U.s.damp, DAMPING);

    if (drop) {
      gl.uniform2f(U.s.dropUV,  drop.x, drop.y);
      gl.uniform1f(U.s.dropR,   drop.r);
      gl.uniform1f(U.s.dropStr, drop.str);
      drop = null;
    } else {
      gl.uniform1f(U.s.dropStr, 0.0);
    }

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    ping = !ping;

    /* — Рендер на экран — */
    const simTex = ping ? texA : texB; // текстура, в которую только что записали

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.useProgram(renderProg);
    bindQuad(renderProg);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, simTex);
    gl.uniform1i(U.r.sim, 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, bgTex);
    gl.uniform1i(U.r.bg,   1);

    gl.uniform2f(U.r.px,   1 / SW, 1 / SH);
    gl.uniform2f(U.r.ref,  REFRACT / SW, REFRACT / SH);
    gl.uniform1f(U.r.dark, DARK);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
})();
