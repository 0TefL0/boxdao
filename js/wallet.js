/* =========================================================================
   wallet.js — подключение кошельков (MetaMask, Rabby, WalletConnect)
   ─────────────────────────────────────────────────────────────────────────
   • EIP-6963: автоматическое определение установленных кошельков
   • MetaMask / Rabby — через инжектированный провайдер
   • WalletConnect v2 — через CDN (нужен Project ID)
   • Авто-переподключение при перезагрузке страницы
   ─────────────────────────────────────────────────────────────────────────
   Получи бесплатный WalletConnect Project ID:
   https://cloud.walletconnect.com/
   ========================================================================= */
(function (global) {
  'use strict';

  /* ── ОДНОРАЗОВЫЙ СБРОС НИКНЕЙМОВ ── */
  try {
    if (!localStorage.getItem('dolefi_nick_reset_v1')) {
      var keysToRemove = [];
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && k.indexOf('dolefi_nick_') === 0) keysToRemove.push(k);
      }
      keysToRemove.forEach(function (k) { localStorage.removeItem(k); });
      localStorage.setItem('dolefi_nick_reset_v1', '1');
    }
  } catch (e) {}

  /* ── АВАТАРКА ПО АДРЕСУ (детерминированный SVG-градиент) ── */
  function addrAvatar(addr, size) {
    size = size || 36;
    var h    = (addr || '').toLowerCase().replace('0x', '').padEnd(40, '0');
    var hue1 = parseInt(h.slice(0, 4), 16) % 360;
    var hue2 = (hue1 + 40 + parseInt(h.slice(4, 6), 16) % 80) % 360;
    var sat  = 65 + parseInt(h.slice(6, 8), 16) % 20;
    var lit  = 45 + parseInt(h.slice(8, 10), 16) % 15;
    var uid  = 'av' + h.slice(0, 8);
    var r    = size / 2;
    return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '" xmlns="http://www.w3.org/2000/svg">'
      + '<defs><linearGradient id="' + uid + '" x1="0%" y1="0%" x2="100%" y2="100%">'
      + '<stop offset="0%" stop-color="hsl(' + hue1 + ',' + sat + '%,' + lit + '%)"/>'
      + '<stop offset="100%" stop-color="hsl(' + hue2 + ',' + (sat - 10) + '%,' + (lit + 12) + '%)"/>'
      + '</linearGradient></defs>'
      + '<circle cx="' + r + '" cy="' + r + '" r="' + r + '" fill="url(#' + uid + ')"/>'
      + '</svg>';
  }

  /* ── CONFIG ── */
  var WC_PROJECT_ID = '38f22bfb583dd189ac7075450b154467';

  /* ── ОПТИМИСТИЧНОЕ ВОССТАНОВЛЕНИЕ (до DOMContentLoaded) ──
     Читаем localStorage синхронно и сразу ставим WALLET.connected,
     чтобы renderHeader() в main.js видел кошелёк при первом рендере.
     Реальная верификация провайдера идёт в фоне через tryAutoReconnect. */
  (function initOptimistic() {
    var addr = '';
    var name = '';
    try { addr = localStorage.getItem('dolefi_wallet_addr') || ''; } catch (e) {}
    try { name = localStorage.getItem('dolefi_wallet_name') || ''; } catch (e) {}
    if (!addr) return;
    var nick = '';
    try { nick = localStorage.getItem('dolefi_nick_' + addr.toLowerCase()) || ''; } catch (e) {}
    global.WALLET = global.WALLET || {};
    global.WALLET.connected  = true;
    global.WALLET.address    = addr;
    global.WALLET.walletName = name;
    global.WALLET.nickname   = nick;
    global.WALLET.provider   = null; /* провайдер придёт после верификации */
  })();

  /* ── ICONS ── */
  var ICON_WC = '<svg viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg" width="32" height="32"><circle cx="150" cy="150" r="150" fill="#3B99FC"/><path fill="#fff" d="M93.5 117.4c31.3-30.6 82-30.6 113.3 0l3.8 3.7c1.6 1.5 1.6 4 0 5.6l-12.9 12.6c-.8.8-2.1.8-2.9 0l-5.2-5.1c-21.8-21.3-57.2-21.3-79 0l-5.6 5.5c-.8.8-2.1.8-2.9 0l-12.9-12.6c-1.6-1.5-1.6-4 0-5.6l4.3-4.1zm139.9 26.1 11.5 11.2c1.6 1.5 1.6 4 0 5.6l-51.8 50.7c-1.6 1.5-4.1 1.5-5.7 0l-36.8-36c-.4-.4-1-.4-1.4 0l-36.8 36c-1.6 1.5-4.1 1.5-5.7 0L55 160.3c-1.6-1.5-1.6-4 0-5.6l11.5-11.2c1.6-1.5 4.1-1.5 5.7 0l36.8 36c.4.4 1 .4 1.4 0l36.8-36c1.6-1.5 4.1-1.5 5.7 0l36.8 36c.4.4 1 .4 1.4 0l36.8-36c1.6-1.5 4.1-1.5 5.5 0z"/></svg>';

  var ICON_GENERIC = '<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" width="32" height="32"><circle cx="16" cy="16" r="16" fill="rgba(255,255,255,0.1)"/><path fill="rgba(255,255,255,0.5)" d="M16 8a3 3 0 1 1 0 6 3 3 0 0 1 0-6zm0 10c4.4 0 8 1.8 8 4v2H8v-2c0-2.2 3.6-4 8-4z"/></svg>';

  /* ── EIP-6963: ОПРЕДЕЛЕНИЕ КОШЕЛЬКОВ ── */
  var detectedProviders = {};

  window.addEventListener('eip6963:announceProvider', function (e) {
    var rdns = e.detail.info.rdns;
    detectedProviders[rdns] = e.detail;
    if (modalEl) refreshWalletList(); /* обновить модал если открыт */
  });
  window.dispatchEvent(new Event('eip6963:requestProvider'));

  /* ── МОДАЛ ── */
  var modalEl = null;

  function openWalletSelect() {
    if (modalEl) return;
    modalEl = document.createElement('div');
    modalEl.className = 'wm-overlay';
    var isEn = typeof LANG !== 'undefined' && LANG === 'en';
    modalEl.innerHTML =
      '<div class="wm-box" role="dialog" aria-modal="true">' +
        '<div class="wm-head">' +
          '<span class="wm-title">' + (isEn ? 'Connect Wallet' : 'Подключить кошелёк') + '</span>' +
          '<button class="wm-close" id="wm-close" aria-label="Close">&#x2715;</button>' +
        '</div>' +
        '<p class="wm-sub">' + (isEn ? 'Connect securely — your keys always stay with you' : 'Безопасное подключение — ключи всегда у тебя') + '</p>' +
        '<div class="wm-list" id="wm-list"></div>' +
        '<div class="wm-footer">' +
          '<a class="wm-learn" href="https://ethereum.org/en/wallets/" target="_blank" rel="noopener">' +
            '<svg width="14" height="14" viewBox="0 0 256 256" fill="none" stroke="currentColor" stroke-width="20" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg"><circle cx="128" cy="128" r="96"/><line x1="128" y1="120" x2="128" y2="176"/><circle cx="128" cy="84" r="8" fill="currentColor" stroke="none"/></svg>' +
            (isEn ? 'What is a wallet?' : 'Что такое кошелёк?') +
          '</a>' +
          '<p class="wm-terms">' +
            (isEn
              ? 'By connecting you agree to our <a href="#" target="_blank">Terms of Service</a>'
              : 'Подключаясь, вы принимаете <a href="#" target="_blank">Условия использования</a>') +
          '</p>' +
        '</div>' +
      '</div>';
    document.body.appendChild(modalEl);

    document.getElementById('wm-close').addEventListener('click', closeWalletSelect);
    modalEl.addEventListener('click', function (e) { if (e.target === modalEl) closeWalletSelect(); });

    document.addEventListener('keydown', onEsc);
    requestAnimationFrame(function () { modalEl.classList.add('open'); });

    refreshWalletList();
  }

  function closeWalletSelect() {
    if (!modalEl) return;
    document.removeEventListener('keydown', onEsc);
    modalEl.classList.remove('open');
    setTimeout(function () {
      if (modalEl) { modalEl.remove(); modalEl = null; }
    }, 280);
  }

  function onEsc(e) { if (e.key === 'Escape') closeWalletSelect(); }

  function refreshWalletList() {
    var list = document.getElementById('wm-list');
    if (!list) return;
    list.innerHTML = '';

    /* — EIP-6963 кошельки — */
    var providers = Object.values(detectedProviders);
    providers.forEach(function (detail) {
      list.appendChild(mkWalletBtn(
        detail.info.name,
        detail.info.icon ? '<img src="' + detail.info.icon + '" width="32" height="32" alt="">' : ICON_GENERIC,
        function () { connectInjected(detail.provider, detail.info.name); }
      ));
    });

    /* — Легаси: window.ethereum без EIP-6963 — */
    if (providers.length === 0 && window.ethereum) {
      var n = window.ethereum.isRabby ? 'Rabby'
            : window.ethereum.isMetaMask ? 'MetaMask'
            : 'Browser Wallet';
      list.appendChild(mkWalletBtn(n, ICON_GENERIC, function () {
        connectInjected(window.ethereum, n);
      }));
    }

    /* — WalletConnect — */
    list.appendChild(mkWalletBtn('WalletConnect', ICON_WC, connectWC, 'wc'));

    /* — More Wallet Options — */
    var moreBtn = document.createElement('button');
    moreBtn.className = 'wm-more-btn';
    var isEn = typeof LANG !== 'undefined' && LANG === 'en';
    moreBtn.textContent = isEn ? 'More Wallet Options' : 'Другие кошельки';
    moreBtn.addEventListener('click', function () { openMoreWallets(); });
    list.appendChild(moreBtn);
  }

  /* ── ЭКРАН «ДРУГИЕ КОШЕЛЬКИ» ── */
  function walletImg(src) {
    return '<img src="' + src + '" width="32" height="32" alt="" style="border-radius:8px;display:block;">';
  }

  var MORE_WALLETS = [
    {
      name: 'MetaMask',
      icon: walletImg('https://github.com/MetaMask.png?size=64'),
      rdns: 'io.metamask',
      url: 'https://metamask.io/download/',
    },
    {
      name: 'Phantom',
      icon: walletImg('https://github.com/phantom-labs.png?size=64'),
      rdns: null,
      check: function () { return window.phantom && window.phantom.ethereum; },
      connect: function () {
        if (window.phantom && window.phantom.ethereum) {
          connectInjected(window.phantom.ethereum, 'Phantom');
        } else { window.open('https://phantom.app/', '_blank'); clearLoading(); }
      },
      url: 'https://phantom.app/',
    },
    {
      name: 'Trust Wallet',
      icon: walletImg('https://github.com/trustwallet.png?size=64'),
      rdns: null,
      check: function () { return window.trustwallet; },
      connect: function () {
        if (window.trustwallet) {
          connectInjected(window.trustwallet, 'Trust Wallet');
        } else { window.open('https://trustwallet.com/', '_blank'); clearLoading(); }
      },
      url: 'https://trustwallet.com/',
    },
    {
      name: 'Rabby',
      icon: walletImg('https://github.com/RabbyHub.png?size=64'),
      rdns: 'io.rabby',
      url: 'https://rabby.io/',
    },
  ];

  function openMoreWallets() {
    var list = document.getElementById('wm-list');
    if (!list) return;
    var isEn = typeof LANG !== 'undefined' && LANG === 'en';

    list.innerHTML = '';

    /* — Кнопка «Назад» — */
    var backBtn = document.createElement('button');
    backBtn.className = 'wm-back-btn';
    backBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 256 256" fill="none" stroke="currentColor" stroke-width="20" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg"><polyline points="160,208 80,128 160,48"/></svg>'
      + (isEn ? 'Back' : 'Назад');
    backBtn.addEventListener('click', refreshWalletList);
    list.appendChild(backBtn);

    /* — Заголовок — */
    var title = document.createElement('p');
    title.className = 'wm-more-title';
    title.textContent = isEn ? 'More Wallet Options' : 'Выбери кошелёк';
    list.appendChild(title);

    /* — Список кошельков — */
    MORE_WALLETS.forEach(function (w) {
      /* Ищем провайдер по rdns */
      var detected = w.rdns && detectedProviders[w.rdns];
      var btn = mkWalletBtn(w.name, w.icon, function () {
        if (detected) {
          connectInjected(detected.provider, w.name);
        } else if (w.connect) {
          w.connect();
        } else {
          /* Не установлен — редирект на сайт */
          window.open(w.url, '_blank');
          clearLoading();
        }
      });
      list.appendChild(btn);
    });
  }

  function mkWalletBtn(name, iconHTML, onClick, extra) {
    var btn = document.createElement('button');
    btn.className = 'wm-btn' + (extra === 'wc' ? ' wm-btn--wc' : '');
    btn.innerHTML = '<span class="wm-btn-icon">' + iconHTML + '</span><span class="wm-btn-name">' + name + '</span>';
    btn.addEventListener('click', function () {
      setLoading(btn);
      onClick();
    });
    return btn;
  }

  function setLoading(btn) {
    document.querySelectorAll('.wm-btn').forEach(function (b) { b.disabled = true; b.style.opacity = '0.5'; });
    btn.style.opacity = '1';
    btn.innerHTML += '<span class="wm-spinner"></span>';
  }

  function clearLoading() {
    if (!modalEl) return;
    document.querySelectorAll('.wm-btn').forEach(function (b) { b.disabled = false; b.style.opacity = ''; });
    document.querySelectorAll('.wm-spinner').forEach(function (s) { s.remove(); });
  }

  /* ── ПОДКЛЮЧЕНИЕ — ИНЖЕКТИРОВАННЫЙ ПРОВАЙДЕР ── */
  function connectInjected(provider, walletName) {
    provider.request({ method: 'eth_requestAccounts' }).then(function (accounts) {
      if (accounts && accounts.length > 0) {
        onConnected(accounts[0], provider, walletName);
      } else {
        clearLoading();
      }
    }).catch(function (e) {
      clearLoading();
      if (e.code !== 4001) console.error('[wallet]', e);
    });
  }

  /* ── ПОДКЛЮЧЕНИЕ — WALLETCONNECT ── */
  function showWCLoading() {
    var box = modalEl && modalEl.querySelector('.wm-box');
    if (!box) return;
    var isEn = typeof LANG !== 'undefined' && LANG === 'en';
    box.innerHTML =
      '<div class="wm-head">' +
        '<span class="wm-title">' + (isEn ? 'Connect Wallet' : 'Подключить кошелёк') + '</span>' +
        '<button class="wm-close" id="wm-close" aria-label="Close">&#x2715;</button>' +
      '</div>' +
      '<div class="wm-wc-loading">' +
        '<div class="wm-wc-logo">' +
          '<svg viewBox="0 0 300 185" xmlns="http://www.w3.org/2000/svg" width="48" height="30"><path fill="#3B99FC" d="M61.4 36.3c48.9-47.9 128.3-47.9 177.2 0l5.9 5.8a6 6 0 0 1 0 8.7l-20.2 19.7a3.2 3.2 0 0 1-4.4 0l-8.1-7.9c-34.1-33.4-89.4-33.4-123.5 0l-8.7 8.5a3.2 3.2 0 0 1-4.4 0L75 51.4a6 6 0 0 1 0-8.7l-13.6-6.4zm218.8 40.8 18 17.6a6 6 0 0 1 0 8.7l-81.1 79.4a6.3 6.3 0 0 1-8.9 0l-57.5-56.3a1.6 1.6 0 0 0-2.2 0l-57.5 56.3a6.3 6.3 0 0 1-8.9 0L.9 103.4a6 6 0 0 1 0-8.7l18-17.6a6.3 6.3 0 0 1 8.9 0l57.5 56.3a1.6 1.6 0 0 0 2.2 0l57.5-56.3a6.3 6.3 0 0 1 8.9 0l57.5 56.3a1.6 1.6 0 0 0 2.2 0l57.5-56.3a6.3 6.3 0 0 1 8.9 0z"/></svg>' +
        '</div>' +
        '<div class="wm-wc-spinner-wrap">' +
          '<div class="wm-wc-arc"></div>' +
        '</div>' +
        '<p class="wm-wc-label">' + (isEn ? 'Loading WalletConnect…' : 'Загружаем WalletConnect…') + '</p>' +
        '<p class="wm-wc-sub">' + (isEn ? 'First load may take ~10 s' : 'Первый запуск займёт ~10 сек') + '</p>' +
      '</div>';
    document.getElementById('wm-close').addEventListener('click', closeWalletSelect);
  }

  function connectWC() {
    if (!WC_PROJECT_ID) {
      clearLoading();
      alert(typeof LANG !== 'undefined' && LANG === 'en'
        ? 'WalletConnect Project ID is not set. Add it to js/wallet.js (get free at cloud.walletconnect.com)'
        : 'WalletConnect Project ID не настроен. Добавь в js/wallet.js (бесплатно на cloud.walletconnect.com)');
      return;
    }

    /* Показываем экран загрузки внутри нашего модала */
    showWCLoading();

    /* Динамическая загрузка SDK */
    import('https://esm.sh/@walletconnect/ethereum-provider@2.13.3').then(function (m) {
      var EthProvider = m.EthereumProvider || m.default;
      return EthProvider.init({
        projectId: WC_PROJECT_ID,
        chains: [1],
        showQrModal: true,
        metadata: {
          name: 'DoleFi',
          description: 'DoleFi — NFT Co-Ownership Platform',
          url: window.location.origin,
          icons: [window.location.origin + '/assets/img/background.jpg'],
        },
      });
    }).then(function (provider) {
      /* SDK готов — закрываем наш модал, WalletConnect откроет свой */
      closeWalletSelect();
      return provider.enable().then(function () {
        var accounts = provider.accounts;
        if (accounts && accounts.length > 0) {
          onConnected(accounts[0], provider, 'WalletConnect');
        }
      });
    }).catch(function (e) {
      closeWalletSelect();
      if (e && e.message !== 'Connection request reset. Please try again.') {
        console.error('[wallet WC]', e);
      }
    });
  }

  /* ── МОДАЛ НИКНЕЙМА ── */
  var nickModalEl = null;
  var nickAnimId  = null;

  function openNicknameModal() {
    if (nickModalEl) return;
    var addr = global.WALLET && global.WALLET.address ? global.WALLET.address.toLowerCase() : '';
    try { if (localStorage.getItem('dolefi_nick_' + addr)) return; } catch (e) {}

    var isEn = typeof LANG !== 'undefined' && LANG === 'en';

    nickModalEl = document.createElement('div');
    nickModalEl.className = 'wm-overlay';
    nickModalEl.innerHTML =
      '<div class="wm-box nm-box" role="dialog" aria-modal="true">' +
        '<div class="nm-cube-wrap"><canvas id="nm-cube-canvas" style="display:block;"></canvas></div>' +
        '<h3 class="nm-title">' + (isEn ? 'Enter the login' : 'Укажите ваше имя') + '</h3>' +
        '<div class="nm-input-wrap">' +
          '<input type="text" class="nm-input" id="nm-input" placeholder="username" maxlength="24" autocomplete="off" spellcheck="false">' +
          '<span class="nm-avail" id="nm-avail"></span>' +
        '</div>' +
        '<label class="nm-terms-row">' +
          '<input type="checkbox" class="nm-check" id="nm-check">' +
          '<span>' + (isEn
            ? 'I agree to the <a href="#" onclick="return false;">Terms of Service</a>'
            : 'Принимаю <a href="#" onclick="return false;">условия использования</a>') +
          '</span>' +
        '</label>' +
        '<button class="btn btn-primary nm-continue" id="nm-continue" disabled>' + (isEn ? 'Continue' : 'Продолжить') + '</button>' +
      '</div>';

    document.body.appendChild(nickModalEl);
    requestAnimationFrame(function () { nickModalEl.classList.add('open'); });

    startNickCube();

    var input = document.getElementById('nm-input');
    var avail = document.getElementById('nm-avail');
    var check = document.getElementById('nm-check');
    var cont  = document.getElementById('nm-continue');

    function validate() {
      var val = input.value.replace(/[^a-zA-Z0-9_\-.]/g, '');
      input.value = val;
      if (val.length >= 3) {
        avail.textContent = isEn ? '✓ Username available' : '✓ Имя доступно';
        avail.className = 'nm-avail nm-avail--ok';
      } else if (val.length > 0) {
        avail.textContent = isEn ? 'Min 3 characters' : 'Минимум 3 символа';
        avail.className = 'nm-avail nm-avail--err';
      } else {
        avail.textContent = '';
        avail.className = 'nm-avail';
      }
      cont.disabled = !(val.length >= 3 && check.checked);
    }

    input.addEventListener('input', validate);
    check.addEventListener('change', validate);

    document.getElementById('nm-close') && document.getElementById('nm-close').addEventListener('click', closeNicknameModal);
    /* клик по оверлею не закрывает — ник обязателен */

    cont.addEventListener('click', function () {
      var val = input.value.trim();
      if (val.length < 3) return;
      try { localStorage.setItem('dolefi_nick_' + addr, val); } catch (e) {}
      global.WALLET.nickname = val;
      closeNicknameModal();
    });
  }

  function closeNicknameModal() {
    if (nickAnimId) { cancelAnimationFrame(nickAnimId); nickAnimId = null; }
    if (!nickModalEl) return;
    nickModalEl.classList.remove('open');
    var el = nickModalEl; nickModalEl = null;
    setTimeout(function () { if (el) el.remove(); }, 280);
  }

  function startNickCube() {
    var canvas = document.getElementById('nm-cube-canvas');
    if (!canvas) return;
    var DPR = Math.min(window.devicePixelRatio || 1, 2);
    var DISP = 56;
    canvas.width  = DISP * DPR;
    canvas.height = DISP * DPR;
    canvas.style.width  = DISP + 'px';
    canvas.style.height = DISP + 'px';

    var ctx = canvas.getContext('2d');
    ctx.scale(DPR, DPR);

    var css    = getComputedStyle(document.documentElement);
    var ACCENT = (css.getPropertyValue('--accent') || '#B8FF3C').trim();
    var LINE   = '#8A8A93';
    var U = 12, A = Math.PI / 6, CA = Math.cos(A), SA = Math.sin(A);
    var CX = DISP / 2, CY = DISP / 2 + 2;

    function isoP(gx, gy, gz, ox, oy) {
      return [CX + (gx - gy) * U * CA + (ox || 0), CY + (gx + gy) * U * SA - gz * U + (oy || 0)];
    }
    function face(pts, stroke, sa, fill, fa, lw) {
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
      ctx.closePath();
      if (fill && fa > 0) { ctx.fillStyle = fill; ctx.globalAlpha = fa; ctx.fill(); }
      ctx.strokeStyle = stroke; ctx.lineWidth = lw || 1.4; ctx.lineJoin = 'round';
      ctx.globalAlpha = sa; ctx.stroke(); ctx.globalAlpha = 1;
    }
    function cube(gx, gy, gz, oy, accent) {
      var col = accent ? ACCENT : LINE;
      var top   = [isoP(gx,gy,gz+1,0,oy),isoP(gx+1,gy,gz+1,0,oy),isoP(gx+1,gy+1,gz+1,0,oy),isoP(gx,gy+1,gz+1,0,oy)];
      var left  = [isoP(gx,gy+1,gz+1,0,oy),isoP(gx,gy+1,gz,0,oy),isoP(gx+1,gy+1,gz,0,oy),isoP(gx+1,gy+1,gz+1,0,oy)];
      var right = [isoP(gx+1,gy,gz+1,0,oy),isoP(gx+1,gy,gz,0,oy),isoP(gx+1,gy+1,gz,0,oy),isoP(gx+1,gy+1,gz+1,0,oy)];
      if (accent) { face(top,col,0.95,col,0.16,1.4); face(left,col,0.95,col,0.09,1.4); face(right,col,0.95,col,0.13,1.4); }
      else        { face(top,col,0.75,null,0,1.2);   face(left,col,0.42,null,0,1.2);   face(right,col,0.55,null,0,1.2);  }
    }

    var cubes = [];
    for (var gz = 0; gz <= 1; gz++)
      for (var gy = 0; gy <= 1; gy++)
        for (var gx = 0; gx <= 1; gx++)
          cubes.push({ gx: gx, gy: gy, gz: gz, accent: false });
    cubes[5].accent = true;

    var order = cubes.map(function (c, i) { return { i: i, d: c.gx + c.gy - c.gz }; })
      .sort(function (a, b) { return a.d - b.d; }).map(function (o) { return o.i; });

    function draw(t) {
      if (!document.getElementById('nm-cube-canvas')) return;
      ctx.clearRect(0, 0, DISP, DISP);
      var fy = Math.sin(t * 0.0018) * 2;
      for (var k = 0; k < order.length; k++) {
        var c = cubes[order[k]];
        cube(c.gx, c.gy, c.gz, c.accent ? fy : 0, c.accent);
      }
      nickAnimId = requestAnimationFrame(draw);
    }
    nickAnimId = requestAnimationFrame(draw);
  }

  /* ── ПОСЛЕ ПОДКЛЮЧЕНИЯ ── */
  function onConnected(address, provider, walletName) {
    global.WALLET = global.WALLET || {};
    global.WALLET.connected  = true;
    global.WALLET.address    = address;
    global.WALLET.provider   = provider;
    global.WALLET.walletName = walletName;

    try {
      var savedNick = localStorage.getItem('dolefi_nick_' + address.toLowerCase());
      if (savedNick) global.WALLET.nickname = savedNick;
    } catch (e) {}

    try { localStorage.setItem('dolefi_wallet_addr', address); } catch (e) {}
    try { localStorage.setItem('dolefi_wallet_name', walletName); } catch (e) {}

    closeWalletSelect();

    if (typeof renderHeader === 'function') renderHeader();
    if (typeof updateHeaderScroll === 'function') updateHeaderScroll();
    if (typeof setupLangToggle === 'function') setupLangToggle();

    /* Показываем модал никнейма если ещё не задан */
    setTimeout(openNicknameModal, 350);

    /* Слушатели изменений */
    if (provider.on) {
      provider.on('accountsChanged', function (accounts) {
        if (!accounts || accounts.length === 0) {
          global.disconnectWallet();
        } else {
          global.WALLET.address = accounts[0];
          try { localStorage.setItem('dolefi_wallet_addr', accounts[0]); } catch (e) {}
          if (typeof renderHeader === 'function') renderHeader();
          if (typeof updateHeaderScroll === 'function') updateHeaderScroll();
          if (typeof setupLangToggle === 'function') setupLangToggle();
        }
      });
      provider.on('disconnect', function () { global.disconnectWallet(); });
      provider.on('chainChanged', function () {
        /* при смене сети перезагружаем провайдер */
        provider.request({ method: 'eth_accounts' }).then(function (a) {
          if (a && a.length) {
            global.WALLET.address = a[0];
            if (typeof renderHeader === 'function') renderHeader();
          }
        });
      });
    }
  }

  /* ── ОТКЛЮЧЕНИЕ ── */
  global.disconnectWallet = function () {
    global.WALLET = global.WALLET || {};
    /* Явно разрываем сессию — критично для WalletConnect */
    var provider = global.WALLET.provider;
    if (provider) {
      try {
        if (typeof provider.disconnect === 'function') provider.disconnect();
      } catch (e) { /* игнорируем ошибки при дисконнекте */ }
    }
    global.WALLET.connected  = false;
    global.WALLET.address    = null;
    global.WALLET.provider   = null;
    global.WALLET.walletName = null;
    try { localStorage.removeItem('dolefi_wallet_addr'); } catch (e) {}
    try { localStorage.removeItem('dolefi_wallet_name'); } catch (e) {}
    window.location.reload();
  };

  /* ── АВТО-ПЕРЕПОДКЛЮЧЕНИЕ ── */
  function clearSavedWallet() {
    try { localStorage.removeItem('dolefi_wallet_addr'); } catch (e) {}
    try { localStorage.removeItem('dolefi_wallet_name'); } catch (e) {}
  }

  function tryAutoReconnect() {
    var savedAddr = '';
    var savedName = '';
    try { savedAddr = localStorage.getItem('dolefi_wallet_addr') || ''; } catch (e) {}
    try { savedName = localStorage.getItem('dolefi_wallet_name') || ''; } catch (e) {}
    if (!savedAddr) return;

    /* — WalletConnect: доверяем localStorage, не загружаем SDK при каждом открытии —
       SDK требует @walletconnect/modal даже с showQrModal:false, что ломает страницу.
       Адрес уже показан оптимистично; провайдер будет установлен при следующем
       реальном взаимодействии пользователя (нажал WC → SDK загрузится тогда). */
    if (savedName === 'WalletConnect') {
      return; /* адрес уже показан, верификация не нужна */
    }

    /* — Инжектированный провайдер (MetaMask / Rabby / …) — */
    setTimeout(function () {
      var list = Object.values(detectedProviders);
      var found = null;
      var foundName = savedName || 'Wallet';

      /* Ищем провайдер по сохранённому имени */
      if (savedName) {
        for (var i = 0; i < list.length; i++) {
          if (list[i].info.name === savedName) { found = list[i].provider; break; }
        }
      }
      /* Если не нашли по имени — берём первый или window.ethereum */
      if (!found) {
        if (list.length > 0) { found = list[0].provider; foundName = list[0].info.name; }
        else if (window.ethereum) { found = window.ethereum; }
      }
      if (!found) { clearSavedWallet(); return; }

      found.request({ method: 'eth_accounts' }).then(function (accounts) {
        if (accounts && accounts.length > 0 &&
            accounts[0].toLowerCase() === savedAddr.toLowerCase()) {
          /* Верификация прошла — просто обновляем провайдер (адрес уже показан) */
          global.WALLET.provider   = found;
          global.WALLET.walletName = foundName;
          /* Вешаем слушатели изменений */
          if (found.on) {
            found.on('accountsChanged', function (accs) {
              if (!accs || accs.length === 0) { global.disconnectWallet(); }
              else {
                global.WALLET.address = accs[0];
                try { localStorage.setItem('dolefi_wallet_addr', accs[0]); } catch (e) {}
                if (typeof renderHeader === 'function') renderHeader();
              }
            });
            found.on('disconnect', function () { global.disconnectWallet(); });
          }
        } else {
          /* Верификация провалилась — откатываем показанный адрес */
          global.disconnectWallet();
        }
      }).catch(function () { global.disconnectWallet(); });
    }, 600);
  }

  /* ── МЕНЮ АККАУНТА (попап при клике на адрес) ── */
  var menuEl = null;

  function openWalletMenu(anchor) {
    closeWalletMenu();
    var addr = global.WALLET && global.WALLET.address ? global.WALLET.address : '';
    var isEn = typeof LANG !== 'undefined' && LANG === 'en';
    var name = global.WALLET && global.WALLET.walletName ? global.WALLET.walletName : '';
    var short = addr.slice(0, 6) + '...' + addr.slice(-4);

    var ICO_COPY    = '<svg width="16" height="16" viewBox="0 0 256 256" fill="none" stroke="currentColor" stroke-width="18" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg"><rect x="40" y="88" width="128" height="128" rx="8"/><path d="M88 88V56a8 8 0 0 1 8-8h112a8 8 0 0 1 8 8v112a8 8 0 0 1-8 8h-32"/></svg>';
    var ICO_PROFILE = '<i class="ph ph-user-circle" style="font-size:17px;line-height:1;"></i>';
    var ICO_OUT     = '<svg width="16" height="16" viewBox="0 0 256 256" fill="none" stroke="currentColor" stroke-width="18" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg"><path d="M112 40H48a8 8 0 0 0-8 8v160a8 8 0 0 0 8 8h64"/><polyline points="168,96 216,128 168,160"/><line x1="104" y1="128" x2="216" y2="128"/></svg>';

    menuEl = document.createElement('div');
    menuEl.className = 'wm-account';
    menuEl.innerHTML =
      /* — Блок адреса — */
      '<div class="wm-ac-head">' +
        '<div class="wm-ac-avatar">' + addrAvatar(addr, 40) + '</div>' +
        '<div class="wm-ac-info">' +
          '<span class="wm-ac-addr">' + short + '</span>' +
          (name ? '<span class="wm-ac-wallet">' + name + '</span>' : '') +
        '</div>' +
      '</div>' +
      '<div class="wm-account-sep"></div>' +
      /* — Действия — */
      '<button class="wm-account-btn" id="wm-copy">' + ICO_COPY +
        '<span>' + (isEn ? 'Copy address' : 'Копировать адрес') + '</span>' +
      '</button>' +
      '<button class="wm-account-btn" id="wm-profile">' + ICO_PROFILE +
        '<span>' + (isEn ? 'Profile' : 'Профиль') + '</span>' +
      '</button>' +
      '<div class="wm-account-sep"></div>' +
      '<button class="wm-account-btn wm-account-btn--danger" id="wm-disconnect">' + ICO_OUT +
        '<span>' + (isEn ? 'Disconnect' : 'Отключить') + '</span>' +
      '</button>';

    document.body.appendChild(menuEl);

    /* Позиционирование под чипом — выравнивание по правому краю */
    var r   = anchor.getBoundingClientRect();
    var mw  = menuEl.offsetWidth;
    var top = r.bottom + window.scrollY + 8;
    var left = r.right - mw + window.scrollX;
    if (left < 8) left = 8;
    menuEl.style.top  = top + 'px';
    menuEl.style.left = left + 'px';

    requestAnimationFrame(function () { menuEl.classList.add('open'); });

    /* Копировать */
    document.getElementById('wm-copy').addEventListener('click', function () {
      navigator.clipboard.writeText(addr).then(function () {
        var btn = document.getElementById('wm-copy');
        if (btn) { btn.textContent = isEn ? 'Copied!' : 'Скопировано!'; }
        setTimeout(closeWalletMenu, 1200);
      });
    });

    /* Профиль */
    document.getElementById('wm-profile').addEventListener('click', function () {
      closeWalletMenu();
      window.location.href = 'profile';
    });

    /* Отключить */
    document.getElementById('wm-disconnect').addEventListener('click', function () {
      closeWalletMenu();
      if (typeof global.disconnectWallet === 'function') global.disconnectWallet();
    });

    /* Закрыть при клике вне */
    setTimeout(function () {
      document.addEventListener('click', onMenuOutside);
    }, 10);
  }

  function onMenuOutside(e) {
    if (menuEl && !menuEl.contains(e.target)) closeWalletMenu();
  }

  function closeWalletMenu() {
    document.removeEventListener('click', onMenuOutside);
    if (!menuEl) return;
    menuEl.classList.remove('open');
    var el = menuEl; menuEl = null;
    setTimeout(function () { if (el) el.remove(); }, 220);
  }

  /* ── ЭКСПОРТ ── */
  global.openWalletSelect  = openWalletSelect;
  global.closeWalletSelect = closeWalletSelect;
  global.openWalletMenu    = openWalletMenu;
  global.walletAddrAvatar  = addrAvatar;

  /* Инициализация */
  document.addEventListener('DOMContentLoaded', tryAutoReconnect);

})(window);
