/* =========================================================================
   water.js - видео-фон
   Заменяет canvas-анимацию на fullscreen MP4 видео (autoplay, loop, muted).
   ========================================================================= */
(function () {
  var video = document.createElement('video');
  video.src        = 'assets/bg.mp4';
  video.autoplay   = true;
  video.loop       = true;
  video.muted      = true;
  video.playsInline = true;
  video.setAttribute('playsinline', '');
  video.style.cssText = [
    'position:fixed',
    'inset:0',
    'width:100%',
    'height:100%',
    'object-fit:cover',
    'z-index:-2',
    'pointer-events:none',
  ].join(';');

  document.body.appendChild(video);

  /* Страховка: если автовоспроизведение заблокировано — просто скроем */
  video.play().catch(function () {
    video.style.display = 'none';
  });
})();
