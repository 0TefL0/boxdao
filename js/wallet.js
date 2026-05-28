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

  /* ── CONFIG ── */
  var WC_PROJECT_ID = ''; /* ← вставь Project ID с cloud.walletconnect.com */

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
    modalEl.innerHTML =
      '<div class="wm-box" role="dialog" aria-modal="true">' +
        '<div class="wm-head">' +
          '<span class="wm-title">' + (typeof LANG !== 'undefined' && LANG === 'en' ? 'Connect Wallet' : 'Подключить кошелёк') + '</span>' +
          '<button class="wm-close" id="wm-close" aria-label="Close">&#x2715;</button>' +
        '</div>' +
        '<div class="wm-list" id="wm-list"></div>' +
        '<p class="wm-hint">' + (typeof LANG !== 'undefined' && LANG === 'en' ? 'Choose your wallet to continue' : 'Выбери кошелёк для продолжения') + '</p>' +
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

    /* — Нет кошельков — */
    if (providers.length === 0 && !window.ethereum) {
      var msg = document.createElement('div');
      msg.className = 'wm-no-wallet';
      msg.innerHTML = typeof LANG !== 'undefined' && LANG === 'en'
        ? 'No wallet detected.<br><a href="https://metamask.io" target="_blank" rel="noopener">Install MetaMask ↗</a>'
        : 'Кошелёк не найден.<br><a href="https://metamask.io" target="_blank" rel="noopener">Установить MetaMask ↗</a>';
      list.appendChild(msg);
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
  function connectWC() {
    if (!WC_PROJECT_ID) {
      clearLoading();
      alert(typeof LANG !== 'undefined' && LANG === 'en'
        ? 'WalletConnect Project ID is not set. Add it to js/wallet.js (get free at cloud.walletconnect.com)'
        : 'WalletConnect Project ID не настроен. Добавь в js/wallet.js (бесплатно на cloud.walletconnect.com)');
      return;
    }

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
      return provider.enable().then(function () {
        var accounts = provider.accounts;
        if (accounts && accounts.length > 0) {
          onConnected(accounts[0], provider, 'WalletConnect');
        } else {
          clearLoading();
        }
      });
    }).catch(function (e) {
      clearLoading();
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
  function tryAutoReconnect() {
    var savedAddr = '';
    try { savedAddr = localStorage.getItem('dolefi_wallet_addr') || ''; } catch (e) {}
    if (!savedAddr) return;

    setTimeout(function () {
      var providers = Object.values(detectedProviders);
      var provider = providers.length > 0 ? providers[0].provider : window.ethereum;
      var name = providers.length > 0 ? providers[0].info.name : 'Wallet';
      if (!provider) return;

      provider.request({ method: 'eth_accounts' }).then(function (accounts) {
        if (accounts && accounts.length > 0 &&
            accounts[0].toLowerCase() === savedAddr.toLowerCase()) {
          onConnected(accounts[0], provider, name);
        } else {
          try { localStorage.removeItem('dolefi_wallet_addr'); } catch (e) {}
        }
      }).catch(function () {
        try { localStorage.removeItem('dolefi_wallet_addr'); } catch (e) {}
      });
    }, 600);
  }

  /* ── ЭКСПОРТ ── */
  global.openWalletSelect = openWalletSelect;
  global.closeWalletSelect = closeWalletSelect;

  /* Инициализация */
  document.addEventListener('DOMContentLoaded', tryAutoReconnect);

})(window);
