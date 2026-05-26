/* =========================================================================
   main.js - общая логика BoxDAO
   • Inline SVG (Phosphor-style)
   • i18n RU / EN (localStorage)
   • Header, Footer, Modal рендеринг
   • Scroll-aware header, button ripple
   ========================================================================= */

/* ══════════════════════════════════════════
   PHOSPHOR ICONS
══════════════════════════════════════════ */
var _SVG = 'xmlns="http://www.w3.org/2000/svg" width="1em" height="1em"'
  + ' viewBox="0 0 256 256" aria-hidden="true"'
  + ' style="display:inline-block;vertical-align:-0.15em;flex-shrink:0"';

function phS(i) { return '<svg ' + _SVG + ' fill="none" stroke="currentColor" stroke-width="16" stroke-linecap="round" stroke-linejoin="round">' + i + '</svg>'; }
function phF(i) { return '<svg ' + _SVG + ' fill="currentColor">' + i + '</svg>'; }
function phM(i) { return '<svg ' + _SVG + '>' + i + '</svg>'; }

var PH = {
  cube: phS('<polygon points="128,24 224,72 224,184 128,232 32,184 32,72"/><line x1="128" y1="24" x2="128" y2="128"/><line x1="32" y1="72" x2="128" y2="128"/><line x1="224" y1="72" x2="128" y2="128"/>'),
  wallet: phM('<path d="M40,64A16,16,0,0,1,56,48H192" fill="none" stroke="currentColor" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"/><path d="M40,64V192a16,16,0,0,0,16,16H216a8,8,0,0,0,8-8V88a8,8,0,0,0-8-8H56A16,16,0,0,1,40,64Z" fill="none" stroke="currentColor" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"/><circle cx="180" cy="140" r="10" fill="currentColor"/>'),
  xLogo:       phF('<polygon points="96,32 128,104 160,32 224,96 152,128 224,160 160,224 128,152 96,224 32,160 104,128 32,96"/>'),
  tiktokLogo:  phF('<path d="M224,72a48.05,48.05,0,0,1-48-48,8,8,0,0,0-8-8H120a8,8,0,0,0-8,8V156a20,20,0,1,1-28.57-18.08A8,8,0,0,0,88,130V88a8,8,0,0,0-8.94-7.94C50.91,83.9,24,109.39,24,143a88,88,0,0,0,176,0V80a8,8,0,0,0-8-8Z"/>'),
  discordLogo: phM('<path d="M90,68A120,120,0,0,0,32,136v36a16,16,0,0,0,16,16H60l10,20a56,56,0,0,0,116,0l10-20h12a16,16,0,0,0,16-16V136A120,120,0,0,0,166,68" fill="none" stroke="currentColor" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"/><line x1="90" y1="68" x2="76" y2="44" stroke="currentColor" stroke-width="16" stroke-linecap="round" fill="none"/><line x1="166" y1="68" x2="180" y2="44" stroke="currentColor" stroke-width="16" stroke-linecap="round" fill="none"/><circle cx="100" cy="144" r="14" fill="currentColor"/><circle cx="156" cy="144" r="14" fill="currentColor"/>'),
  telegramLogo: phF('<path d="M228,26.07,25.85,105.8a12,12,0,0,0,1.68,22.9L76,141.25V200a12,12,0,0,0,21.6,7.2L125,170l52.22,37.28A12,12,0,0,0,196,197.49L240,37.49A12,12,0,0,0,228,26.07ZM98.41,176.55V151.52l16.55,11.82ZM182.8,186.46l-83.8-59.81L221.71,53.26Z"/>'),
  githubLogo:  phF('<path d="M208.31,75.68A59.78,59.78,0,0,0,202.93,28,8,8,0,0,0,196,24a59.75,59.75,0,0,0-48,24H124A59.75,59.75,0,0,0,76,24a8,8,0,0,0-6.93,4,59.78,59.78,0,0,0-5.38,47.68A58.14,58.14,0,0,0,56,104v8a56.06,56.06,0,0,0,48.44,55.47A39.8,39.8,0,0,0,96,192v8H72a24,24,0,0,1-24-24,40,40,0,0,0-40-40,8,8,0,0,0,0,16,24,24,0,0,1,24,24,40,40,0,0,0,40,40H96v16a8,8,0,0,0,16,0V192a24,24,0,0,1,48,0v40a8,8,0,0,0,16,0V192a39.8,39.8,0,0,0-8.44-24.53A56.06,56.06,0,0,0,216,112v-8A58.14,58.14,0,0,0,208.31,75.68ZM200,112a40,40,0,0,1-40,40H112a40,40,0,0,1-40-40v-8a41.74,41.74,0,0,1,6.9-22.48,8,8,0,0,0,1.1-7.69,43.81,43.81,0,0,1,2-37.86,43.94,43.94,0,0,1,32.91,22.2,8,8,0,0,0,6.83,3.83h26.34a8,8,0,0,0,6.83-3.83,43.94,43.94,0,0,1,32.91-22.2,43.81,43.81,0,0,1,2,37.86,8,8,0,0,0,1.1,7.69A41.74,41.74,0,0,1,200,104Z"/>'),
  check: phS('<polyline points="40,136 96,192 216,72"/>'),
  globe: phS('<circle cx="128" cy="128" r="96"/><line x1="128" y1="32" x2="128" y2="224"/><ellipse cx="128" cy="128" rx="44" ry="96"/><line x1="32" y1="128" x2="224" y2="128"/><path d="M59,96H197"/><path d="M59,160H197"/>'),
};

/* ══════════════════════════════════════════
   i18n
══════════════════════════════════════════ */
var LANG = localStorage.getItem('boxdao_lang') || 'ru';

var T = {
  ru: {
    navHome:       'Главная',
    navAbout:      'О проекте',
    navStaking:    'Стейкинг',
    navDao:        'DAO',
    connectWallet: 'Подключить кошелёк',
    modalEyebrow:  'Demo mode',
    modalHeading:  'Подключение кошелька отключено',
    modalText:     'Это тестовая версия сайта. Реальное подключение к кошельку и блокчейн-транзакции здесь не выполняются.',
    modalBtn:      'Понятно',
    footerDemo:    'Demo / тестовая версия',
    socialX:       'Twitter / X',
    socialDiscord: 'Discord',
    socialTg:      'Telegram',
    socialGh:      'GitHub',
    socialTk:      'TikTok',
  },
  en: {
    navHome:       'Home',
    navAbout:      'About',
    navStaking:    'Staking',
    navDao:        'DAO',
    connectWallet: 'Connect Wallet',
    modalEyebrow:  'Demo mode',
    modalHeading:  'Wallet connection disabled',
    modalText:     'This is a test version of the site. Real wallet connections and blockchain transactions are not performed here.',
    modalBtn:      'Got it',
    footerDemo:    'Demo / test version',
    socialX:       'Twitter / X',
    socialDiscord: 'Discord',
    socialTg:      'Telegram',
    socialGh:      'GitHub',
    socialTk:      'TikTok',
  }
};

function t(key) {
  return (T[LANG] || T.ru)[key] || key;
}

/* ══════════════════════════════════════════
   NAV CONFIG
══════════════════════════════════════════ */
var NAV_KEYS = [
  { href: './',     key: 'navHome'  },
  { href: 'about',  key: 'navAbout' },
  { href: 'dao',    key: 'navDao'   },
];

var FOOTER_ITEMS = [
  { href: 'https://x.com/boxdaoorg',                key: 'socialX',  icon: PH.xLogo       },
  { href: 'https://t.me/boxdaoorg',                 key: 'socialTg', icon: PH.telegramLogo },
  { href: 'https://www.tiktok.com/@boxdao.org',     key: 'socialTk', icon: PH.tiktokLogo  },
];

function currentPage() {
  var p = window.location.pathname.split('/').pop();
  p = p.replace(/\.html$/, '');
  return p === '' ? './' : p;
}

/* ══════════════════════════════════════════
   РЕНДЕР ШАПКИ
══════════════════════════════════════════ */
function renderHeader() {
  var mount = document.getElementById('header');
  if (!mount) return;

  var active  = currentPage();
  var navHTML = NAV_KEYS.map(function (i) {
    return '<a href="' + i.href + '" class="' + (i.href === active ? 'active' : '') + '">' + t(i.key) + '</a>';
  }).join('');

  mount.innerHTML = '<header class="site-header">'
    + '<a class="brand" href="./"><span class="brand-mark">' + PH.cube + '</span>Box<b>DAO</b></a>'
    + '<nav class="nav">' + navHTML + '</nav>'
    + '<div class="header-right">'
    +   '<button class="btn btn-wallet" id="connect-wallet">' + PH.wallet + ' ' + t('connectWallet') + '</button>'
    +   '<button class="lang-globe" id="lang-toggle" title="Switch language">'
    +     PH.globe + '<span class="lang-code">' + LANG.toUpperCase() + '</span>'
    +   '</button>'
    +   '<button class="burger" id="nav-burger" aria-label="Menu" aria-expanded="false">'
    +     '<span></span><span></span><span></span>'
    +   '</button>'
    + '</div>'
    + '</header>';

  renderMobileNav();
  setupBurger();
}

/* ══════════════════════════════════════════
   МОБИЛЬНОЕ МЕНЮ
══════════════════════════════════════════ */
function renderMobileNav() {
  var old = document.getElementById('mobile-nav');
  if (old) old.remove();

  var active  = currentPage();
  var navHTML = NAV_KEYS.map(function (i) {
    return '<a href="' + i.href + '" class="' + (i.href === active ? 'active' : '') + '">'
      + '<span class="mobile-nav-dot"></span>' + t(i.key) + '</a>';
  }).join('');

  var div = document.createElement('div');
  div.className = 'mobile-nav';
  div.id = 'mobile-nav';
  div.innerHTML = navHTML
    + '<div class="mobile-nav-footer">'
    +   '<button class="btn btn-primary" id="mobile-connect-wallet">' + PH.wallet + ' ' + t('connectWallet') + '</button>'
    +   '<button class="lang-globe lang-globe--mobile" id="mobile-lang-toggle">'
    +     PH.globe + '<span class="lang-code">' + LANG.toUpperCase() + '</span>'
    +   '</button>'
    + '</div>';

  document.body.appendChild(div);

  /* Клик по ссылке - закрыть меню */
  div.querySelectorAll('a').forEach(function (a) {
    a.addEventListener('click', closeMobileNav);
  });

  /* Кнопка кошелька в меню */
  var mw = document.getElementById('mobile-connect-wallet');
  if (mw) mw.addEventListener('click', function () {
    closeMobileNav();
    var overlay = document.getElementById('wallet-modal');
    if (overlay) overlay.classList.add('open');
  });
}

function openMobileNav() {
  var nav    = document.getElementById('mobile-nav');
  var burger = document.getElementById('nav-burger');
  if (nav)    nav.classList.add('open');
  if (burger) { burger.classList.add('open'); burger.setAttribute('aria-expanded', 'true'); }
  document.body.style.overflow = 'hidden';
}

function closeMobileNav() {
  var nav    = document.getElementById('mobile-nav');
  var burger = document.getElementById('nav-burger');
  if (nav)    nav.classList.remove('open');
  if (burger) { burger.classList.remove('open'); burger.setAttribute('aria-expanded', 'false'); }
  document.body.style.overflow = '';
}

function setupBurger() {
  var burger = document.getElementById('nav-burger');
  if (!burger) return;
  burger.addEventListener('click', function () {
    var nav = document.getElementById('mobile-nav');
    if (nav && nav.classList.contains('open')) {
      closeMobileNav();
    } else {
      openMobileNav();
    }
  });
}

/* ══════════════════════════════════════════
   РЕНДЕР ФУТЕРА
══════════════════════════════════════════ */
function renderFooter() {
  var mount = document.getElementById('footer');
  if (!mount) return;

  var links = FOOTER_ITEMS.map(function (l) {
    return '<a href="' + l.href + '" target="_blank" rel="noopener noreferrer">' + l.icon + t(l.key) + '</a>';
  }).join('');

  mount.innerHTML = '<footer class="site-footer">'
    + '<div class="container footer-inner">'
    +   '<div class="footer-links">' + links + '</div>'
    + ''
    + '</div>'
    + '</footer>';
}

/* ══════════════════════════════════════════
   МОДАЛКА
══════════════════════════════════════════ */
function setupWalletModal() {
  var old = document.getElementById('wallet-modal');
  if (old) old.remove();

  var overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'wallet-modal';
  overlay.innerHTML = '<div class="modal" role="dialog" aria-modal="true">'
    + '<span class="eyebrow">' + t('modalEyebrow') + '</span>'
    + '<h3>' + t('modalHeading') + '</h3>'
    + '<p>' + t('modalText') + '</p>'
    + '<button class="btn btn-primary" data-close>' + PH.check + ' ' + t('modalBtn') + '</button>'
    + '</div>';
  document.body.appendChild(overlay);

  function open()  { overlay.classList.add('open'); }
  function close() { overlay.classList.remove('open'); }

  var wb = document.getElementById('connect-wallet');
  if (wb) wb.addEventListener('click', open);

  overlay.addEventListener('click', function (e) {
    if (e.target === overlay || e.target.hasAttribute('data-close')) close();
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
}

/* ══════════════════════════════════════════
   ПЕРЕКЛЮЧАТЕЛЬ ЯЗЫКА
══════════════════════════════════════════ */
function switchLang() {
  LANG = LANG === 'ru' ? 'en' : 'ru';
  localStorage.setItem('boxdao_lang', LANG);
  closeMobileNav();
  renderHeader();
  if (typeof window.initBrandCube === 'function') window.initBrandCube();
  renderFooter();
  setupWalletModal();
  setupLangToggle();
  setupButtonRipple();
}

function setupLangToggle() {
  var btn  = document.getElementById('lang-toggle');
  var btnM = document.getElementById('mobile-lang-toggle');
  if (btn)  btn.addEventListener('click', switchLang);
  if (btnM) btnM.addEventListener('click', switchLang);
}

/* ══════════════════════════════════════════
   SCROLL - прозрачный → тёмный header
══════════════════════════════════════════ */
(function () {
  function updateScroll() {
    var h = document.querySelector('.site-header');
    if (h) h.classList.toggle('scrolled', window.scrollY > 24);
  }
  window.addEventListener('scroll', updateScroll, { passive: true });
  document.addEventListener('DOMContentLoaded', updateScroll);
})();

/* ══════════════════════════════════════════
   RIPPLE НА КНОПКАХ
══════════════════════════════════════════ */
function setupButtonRipple() {
  /* Используем единый делегированный слушатель - добавляем только один раз */
  if (document._rippleReady) return;
  document._rippleReady = true;

  document.addEventListener('click', function (e) {
    var btn = e.target.closest('.btn');
    if (!btn) return;
    var rect = btn.getBoundingClientRect();
    var size = Math.max(rect.width, rect.height) * 2;
    var span = document.createElement('span');
    span.className = 'btn-ripple-fx';
    span.style.cssText = 'width:' + size + 'px;height:' + size + 'px;'
      + 'left:' + (e.clientX - rect.left - size / 2) + 'px;'
      + 'top:'  + (e.clientY - rect.top  - size / 2) + 'px';
    btn.appendChild(span);
    span.addEventListener('animationend', function () { span.remove(); }, { once: true });
  }, true);
}

/* ══════════════════════════════════════════
   INIT
══════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', function () {
  renderHeader();
  if (typeof window.initBrandCube === 'function') window.initBrandCube();
  renderFooter();
  setupWalletModal();
  setupLangToggle();
  setupButtonRipple();
});
