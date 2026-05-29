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
    global.WALLET = global.WALLET || {};
    global.WALLET.connected  = true;
    global.WALLET.address    = addr;
    global.WALLET.walletName = name;
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

  /* ── ПОСЛЕ ПОДКЛЮЧЕНИЯ ── */
  function onConnected(address, provider, walletName) {
    global.WALLET = global.WALLET || {};
    global.WALLET.connected  = true;
    global.WALLET.address    = address;
    global.WALLET.provider   = provider;
    global.WALLET.walletName = walletName;

    try { localStorage.setItem('dolefi_wallet_addr', address); } catch (e) {}
    try { localStorage.setItem('dolefi_wallet_name', walletName); } catch (e) {}

    closeWalletSelect();

    if (typeof renderHeader === 'function') renderHeader();
    if (typeof updateHeaderScroll === 'function') updateHeaderScroll();
    if (typeof setupLangToggle === 'function') setupLangToggle();

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
    if (typeof renderHeader === 'function') renderHeader();
    if (typeof updateHeaderScroll === 'function') updateHeaderScroll();
    if (typeof setupLangToggle === 'function') setupLangToggle();
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

    /* — WalletConnect: восстанавливаем сессию тихо — */
    if (savedName === 'WalletConnect') {
      if (!WC_PROJECT_ID) { clearSavedWallet(); return; }
      import('https://esm.sh/@walletconnect/ethereum-provider@2.13.3').then(function (m) {
        var EthProvider = m.EthereumProvider || m.default;
        return EthProvider.init({
          projectId: WC_PROJECT_ID,
          chains: [1],
          showQrModal: false, /* не показываем QR — только восстанавливаем сессию */
          metadata: {
            name: 'DoleFi',
            description: 'DoleFi — NFT Co-Ownership Platform',
            url: window.location.origin,
            icons: [window.location.origin + '/assets/img/background.jpg'],
          },
        });
      }).then(function (provider) {
        var accounts = provider.accounts;
        if (accounts && accounts.length > 0 &&
            accounts[0].toLowerCase() === savedAddr.toLowerCase()) {
          /* Сессия жива — только обновляем провайдер, адрес уже показан */
          global.WALLET.provider = provider;
        } else {
          global.disconnectWallet();
        }
      }).catch(function () { global.disconnectWallet(); });
      return;
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

    var ICO_COPY = '<svg width="16" height="16" viewBox="0 0 256 256" fill="none" stroke="currentColor" stroke-width="18" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg"><rect x="40" y="88" width="128" height="128" rx="8"/><path d="M88 88V56a8 8 0 0 1 8-8h112a8 8 0 0 1 8 8v112a8 8 0 0 1-8 8h-32"/></svg>';
    var ICO_OUT  = '<svg width="16" height="16" viewBox="0 0 256 256" fill="none" stroke="currentColor" stroke-width="18" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg"><path d="M112 40H48a8 8 0 0 0-8 8v160a8 8 0 0 0 8 8h64"/><polyline points="168,96 216,128 168,160"/><line x1="104" y1="128" x2="216" y2="128"/></svg>';

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
