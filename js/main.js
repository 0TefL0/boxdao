/* =========================================================================
   main.js - общая логика DoleFi
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

/* Brand icons — viewBox 0 0 24 24, official Simple Icons paths */
var _BSVG = 'xmlns="http://www.w3.org/2000/svg" width="1em" height="1em"'
  + ' viewBox="0 0 24 24" aria-hidden="true"'
  + ' style="display:inline-block;vertical-align:-0.15em;flex-shrink:0"'
  + ' fill="currentColor"';
function phBrand(i) { return '<svg ' + _BSVG + '>' + i + '</svg>'; }

var PH = {
  cube: phS('<polygon points="128,24 224,72 224,184 128,232 32,184 32,72"/><line x1="128" y1="24" x2="128" y2="128"/><line x1="32" y1="72" x2="128" y2="128"/><line x1="224" y1="72" x2="128" y2="128"/>'),
  wallet: phM('<path d="M40,64A16,16,0,0,1,56,48H192" fill="none" stroke="currentColor" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"/><path d="M40,64V192a16,16,0,0,0,16,16H216a8,8,0,0,0,8-8V88a8,8,0,0,0-8-8H56A16,16,0,0,1,40,64Z" fill="none" stroke="currentColor" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"/><circle cx="180" cy="140" r="10" fill="currentColor"/>'),
  /* Official brand icons (Simple Icons) */
  xLogo:       phBrand('<path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z"/>'),
  telegramLogo: phBrand('<path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>'),
  tiktokLogo:  phBrand('<path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>'),
  discordLogo: phM('<path d="M90,68A120,120,0,0,0,32,136v36a16,16,0,0,0,16,16H60l10,20a56,56,0,0,0,116,0l10-20h12a16,16,0,0,0,16-16V136A120,120,0,0,0,166,68" fill="none" stroke="currentColor" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"/><line x1="90" y1="68" x2="76" y2="44" stroke="currentColor" stroke-width="16" stroke-linecap="round" fill="none"/><line x1="166" y1="68" x2="180" y2="44" stroke="currentColor" stroke-width="16" stroke-linecap="round" fill="none"/><circle cx="100" cy="144" r="14" fill="currentColor"/><circle cx="156" cy="144" r="14" fill="currentColor"/>'),
  githubLogo:  phF('<path d="M208.31,75.68A59.78,59.78,0,0,0,202.93,28,8,8,0,0,0,196,24a59.75,59.75,0,0,0-48,24H124A59.75,59.75,0,0,0,76,24a8,8,0,0,0-6.93,4,59.78,59.78,0,0,0-5.38,47.68A58.14,58.14,0,0,0,56,104v8a56.06,56.06,0,0,0,48.44,55.47A39.8,39.8,0,0,0,96,192v8H72a24,24,0,0,1-24-24,40,40,0,0,0-40-40,8,8,0,0,0,0,16,24,24,0,0,1,24,24,40,40,0,0,0,40,40H96v16a8,8,0,0,0,16,0V192a24,24,0,0,1,48,0v40a8,8,0,0,0,16,0V192a39.8,39.8,0,0,0-8.44-24.53A56.06,56.06,0,0,0,216,112v-8A58.14,58.14,0,0,0,208.31,75.68ZM200,112a40,40,0,0,1-40,40H112a40,40,0,0,1-40-40v-8a41.74,41.74,0,0,1,6.9-22.48,8,8,0,0,0,1.1-7.69,43.81,43.81,0,0,1,2-37.86,43.94,43.94,0,0,1,32.91,22.2,8,8,0,0,0,6.83,3.83h26.34a8,8,0,0,0,6.83-3.83,43.94,43.94,0,0,1,32.91-22.2,43.81,43.81,0,0,1,2,37.86,8,8,0,0,0,1.1,7.69A41.74,41.74,0,0,1,200,104Z"/>'),
  check: phS('<polyline points="40,136 96,192 216,72"/>'),
  globe: phS('<circle cx="128" cy="128" r="96"/><line x1="128" y1="32" x2="128" y2="224"/><ellipse cx="128" cy="128" rx="44" ry="96"/><line x1="32" y1="128" x2="224" y2="128"/><path d="M59,96H197"/><path d="M59,160H197"/>'),
};

/* ══════════════════════════════════════════
   i18n
══════════════════════════════════════════ */
var LANG = localStorage.getItem('dolefi_lang') || localStorage.getItem('boxdao_lang') || 'ru';

var T = {
  ru: {
    nav_sections:  'Разделы',
    notifications: 'Уведомления',
    noNotif:       'Уведомлений пока нет',
    noNotifSub:    'Здесь будут появляться уведомления.',
    navHome:       'Главная',
    navAbout:      'О проекте',
    navProjects:   'Проекты',
    navStaking:    'Стейкинг',
    navDao:        'DAO',
    connectWallet: 'Подключить кошелёк',
    modalHeading:  'Подключение кошелька',
    modalText:     'Нажмите кнопку ниже для подключения.',
    modalBtn:      'Подключить',
    socialX:       'Twitter / X',
    socialDiscord: 'Discord',
    socialTg:      'Telegram',
    socialGh:      'GitHub',
    socialTk:      'TikTok',

    idea_label: 'Идея проекта',
    idea_title: 'Совладение реальным бизнесом <span class="acc">через NFT</span>',
    idea_body:  'DoleFi — платформа цифрового совладения реальными проектами. Мы берём оборудование, бизнес или идею и дробим её на NFT-доли. Каждый NFT — часть проекта. Держи в стейкинге и получай выплаты в GEM с дохода проекта.',
    idea_p1: 'одна идея = коллекция из N-кол NFT',
    idea_p2: 'Стейкинг на Ethereum',
    idea_p3: 'Выплаты в GEM ежедневно',
    idea_p4: '1 NFT = 1 голос в DAO',
    idea_p5: 'Вход = подключение кошелька',

    mech_label: 'Механика',
    mech_title: 'Как это работает',
    mech_s1t: 'Купил NFT',
    mech_s1d: 'Покупаешь NFT-долю — часть реального проекта на сайте или на OpenSea.',
    mech_s2t: 'Положил в стейкинг',
    mech_s2d: 'Подключаешь кошелёк и выбираешь режим стейкинга. Режимы и условия выплат формирует автор проекта — он сам рассчитывает финансовую модель под свою идею.',
    mech_s3t: 'Проект генерирует доход',
    mech_s3d: 'Бизнес работает. Система отслеживает доходность и автоматически считает долю каждого NFT-холдера по заданной автором модели.',
    mech_s4t: 'Получаешь GEM',
    mech_s4d: 'Скрипт считает твою долю, конвертирует в GEM и начисляет баланс.',

    stk_label: 'Стейкинг',
    stk_title: 'Как ты зарабатываешь <span class="acc">с NFT</span>',
    stk_body1: 'Стейкинг — это то, за счёт чего твой NFT приносит деньги. Ты размещаешь NFT в смарт-контракте и начинаешь получать выплаты в GEM — ежедневно, пропорционально своей доле в проекте. Ты не продаёшь NFT, он остаётся твоим.',
    stk_body2: 'Проще говоря: купил NFT → положил в стейкинг → проект работает и генерирует доход → ты получаешь свою часть в GEM каждый день.',
    stk_r1: 'NFT остаётся твоим — ты в любой момент можешь его продать или вывести',
    stk_r2: 'Доход начисляется в GEM ежедневно — без ручных действий',
    stk_r3: 'Конкретные условия стейкинга у каждого проекта свои — их задаёт автор идеи',

    crt_label: 'Для авторов',
    crt_title: 'Запусти свой проект <span class="acc">на платформе</span>',
    crt_body:  'У тебя есть идея, бизнес или оборудование? Выложи проект на DoleFi — и привлеки инвесторов через NFT. Ты сам определяешь все условия.',
    crt_s1t: 'Описываешь проект',
    crt_s1d: 'Рассказываешь что за идея, бизнес или оборудование. Показываешь финансовую модель: сколько стоит NFT-доля, сколько долей, как считается доход.',
    crt_s2t: 'Настраиваешь стейкинг',
    crt_s2d: 'Выбираешь режимы выплат: Fixed, Flexible, или оба. Устанавливаешь проценты, сроки блокировки, количество уровней — всё под твою модель.',
    crt_s3t: 'Запускаешь коллекцию',
    crt_s3d: 'NFT-ячейки уходят в продажу — на сайте и на OpenSea. Инвесторы покупают доли, получают GEM, участвуют в DAO-голосованиях.',

    dao_label: 'Для владельцев',
    dao_title: 'DAO — <span class="acc">Управление</span>',
    dao_body:  'DoleFi - настоящая децентрализованная организация. Каждый NFT даёт право голоса. Сообщество NFT-холдеров совместно управляет каждым проектом - никто не может продавить решение в одиночку.',
    dao_r1: '1 NFT = 1 голос - у кого 2 NFT, у того 2 голоса',
    dao_r2: 'Порог принятия решения: 51% = минимум 11 голосов',
    dao_r3: 'Владелец один не может принять решение',
    dao_r4: 'Инвесторы без владельца тоже не могут',
    dao_vt: 'Дополнительные преференции NFT-холдера',
    dao_vs: 'Каждый держатель NFT получает персональное влияние на развитие проекта и его изменения — отдельно для каждого холдера.',
    dao_v1t: 'Право голоса по каждому изменению',
    dao_v1d: 'Любое изменение параметров проекта — только через голосование холдеров',
    dao_v2t: 'Персональный вес голоса',
    dao_v2d: 'Чем больше NFT у держателя — тем сильнее его влияние на решения',
    dao_v3t: 'Инициатива изменений',
    dao_v3d: 'Каждый холдер может вынести любой вопрос на голосование сообщества',
    dao_v4t: 'Влияние на условия новых коллекций',
    dao_v4d: 'Холдеры участвуют в формировании параметров следующих проектов на платформе',
    dao_v5t: 'Защита интересов',
    dao_v5d: 'Ни один участник не может изменить проект в одностороннем порядке без согласия сообщества',

    dao_ey: 'Governance',
    dao_h2: 'DAO и голосования',
    dao_p:  'Это заготовка страницы «DAO». Наполни её своим контентом — структура, стили и навигация уже готовы.',
    dao_ph: 'Контент страницы «DAO» - добавь сюда',

    proj_ey:     'Каталог',
    proj_title:  'Проекты <span class="acc">на платформе</span>',
    proj_sub:    'Здесь будут отображаться все активные проекты — с описанием, условиями стейкинга и доходностью.',
    proj_soon_h: 'Скоро',
    proj_soon_p: 'Первые проекты появятся здесь после запуска платформы. Следи за обновлениями.',
  },
  en: {
    nav_sections:  'Sections',
    notifications: 'Notifications',
    noNotif:       'No notifications yet',
    noNotifSub:    'Notifications will appear here.',
    navHome:       'Home',
    navAbout:      'About',
    navProjects:   'Projects',
    navStaking:    'Staking',
    navDao:        'DAO',
    connectWallet: 'Connect Wallet',
    modalHeading:  'Connect Wallet',
    modalText:     'Click the button below to connect.',
    modalBtn:      'Connect',
    socialX:       'Twitter / X',
    socialDiscord: 'Discord',
    socialTg:      'Telegram',
    socialGh:      'GitHub',
    socialTk:      'TikTok',

    idea_label: 'Project Idea',
    idea_title: 'Real business co-ownership <span class="acc">through NFT</span>',
    idea_body:  'DoleFi is a platform for digital co-ownership of real projects. We take equipment, a business, or an idea and split it into NFT shares. Each NFT is a piece of the project. Stake it and receive daily GEM payouts from the project\'s income.',
    idea_p1: 'one idea = collection of N NFTs',
    idea_p2: 'Staking on Ethereum',
    idea_p3: 'Daily payouts in GEM',
    idea_p4: '1 NFT = 1 vote in DAO',
    idea_p5: 'Entry = connect wallet',

    mech_label: 'How it works',
    mech_title: 'How it works',
    mech_s1t: 'Buy NFT',
    mech_s1d: 'Buy an NFT share — a piece of a real project on our site or on OpenSea.',
    mech_s2t: 'Stake it',
    mech_s2d: 'Connect your wallet and choose a staking mode. Modes and payout terms are set by the project creator — they design the financial model for their idea.',
    mech_s3t: 'Project generates income',
    mech_s3d: 'The business runs. The system tracks revenue and automatically calculates each NFT holder\'s share according to the creator\'s model.',
    mech_s4t: 'Earn GEM',
    mech_s4d: 'The script calculates your share, converts to GEM and credits your balance.',

    stk_label: 'Staking',
    stk_title: 'How you earn <span class="acc">with NFT</span>',
    stk_body1: 'Staking is how your NFT makes money. You place your NFT in a smart contract and start receiving GEM payouts — daily, proportional to your share in the project. You don\'t sell the NFT, it stays yours.',
    stk_body2: 'Simply put: buy NFT → stake it → project runs and generates income → you get your share in GEM every day.',
    stk_r1: 'NFT stays yours — you can sell or withdraw it at any time',
    stk_r2: 'Income is accrued in GEM daily — no manual actions needed',
    stk_r3: 'Exact staking terms differ per project — set by the project creator',

    crt_label: 'For creators',
    crt_title: 'Launch your project <span class="acc">on the platform</span>',
    crt_body:  'Have an idea, business, or equipment? List your project on DoleFi — and attract investors through NFT. You set all the terms.',
    crt_s1t: 'Describe your project',
    crt_s1d: 'Tell us about your idea, business, or equipment. Show the financial model: NFT share price, number of shares, how income is calculated.',
    crt_s2t: 'Set up staking',
    crt_s2d: 'Choose payout modes: Fixed, Flexible, or both. Set percentages, lock-up periods, number of levels — all tailored to your model.',
    crt_s3t: 'Launch the collection',
    crt_s3d: 'NFT shares go on sale — on the site and on OpenSea. Investors buy shares, earn GEM, and participate in DAO votes.',

    dao_label: 'For Owners',
    dao_title: 'DAO — <span class="acc">Governance</span>',
    dao_body:  'DoleFi is a true decentralized organization. Every NFT gives a vote. The community of NFT holders jointly governs each project — no one can push through a decision alone.',
    dao_r1: '1 NFT = 1 vote — 2 NFTs = 2 votes',
    dao_r2: 'Decision threshold: 51% = minimum 11 votes',
    dao_r3: 'The owner alone cannot make a decision',
    dao_r4: 'Investors without the owner cannot either',
    dao_vt: 'Additional NFT holder privileges',
    dao_vs: 'Every NFT holder gets personal influence over the project\'s development and changes — individually for each holder.',
    dao_v1t: 'Voting right on every change',
    dao_v1d: 'Any change to project parameters — only through holder voting',
    dao_v2t: 'Personal voting weight',
    dao_v2d: 'The more NFTs a holder has — the stronger their influence on decisions',
    dao_v3t: 'Right to initiate changes',
    dao_v3d: 'Any holder can put any issue to a community vote',
    dao_v4t: 'Influence on new collection terms',
    dao_v4d: 'Holders participate in shaping parameters of upcoming projects on the platform',
    dao_v5t: 'Interest protection',
    dao_v5d: 'No participant can change the project unilaterally without community consent',

    dao_ey: 'Governance',
    dao_h2: 'DAO & Governance',
    dao_p:  'This is a draft of the "DAO" page. Fill it with your content — the structure, styles, and navigation are already set up.',
    dao_ph: 'DAO page content — add yours here',

    proj_ey:     'Catalogue',
    proj_title:  'Projects <span class="acc">on the platform</span>',
    proj_sub:    'All active projects will be listed here — with descriptions, staking terms, and yield details.',
    proj_soon_h: 'Coming soon',
    proj_soon_p: 'The first projects will appear here after the platform launches. Stay tuned.',
  }
};

function t(key) {
  return (T[LANG] || T.ru)[key] || key;
}

/* ══════════════════════════════════════════
   NAV CONFIG
══════════════════════════════════════════ */
var NAV_KEYS = [
  { href: './',        key: 'navHome'     },
  { href: 'about',     key: 'navAbout'   },
  { href: 'projects',  key: 'navProjects' },
  { href: 'dao',       key: 'navDao'     },
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
   WALLET STATE
   Не перезаписываем если wallet.js уже восстановил состояние из localStorage
══════════════════════════════════════════ */
if (!window.WALLET) {
  window.WALLET = { connected: false, address: null };
}
var WALLET = window.WALLET;

function fmtAddress(addr) {
  return addr.slice(0, 6) + '...' + addr.slice(-4);
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

  var ICO_BELL = '<svg width="18" height="18" viewBox="0 0 256 256" fill="none" stroke="currentColor" stroke-width="16" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg"><path d="M96 192a32 32 0 0 0 64 0"/><path d="M208 192H48a16 16 0 0 1-12.8-25.6C49.6 147.2 64 130.1 64 96a64 64 0 0 1 128 0c0 34.1 14.4 51.2 28.8 70.4A16 16 0 0 1 208 192z"/></svg>';

  var bellHTML = WALLET.connected
    ? '<button class="notif-bell" id="notif-bell" aria-label="' + t('notifications') + '">' + ICO_BELL + '</button>'
    : '';

  var walletHTML = WALLET.connected
    ? '<button class="wallet-address" id="wallet-chip" title="' + WALLET.address + '">'
        + '<span class="wallet-chip-av">'
          + (typeof walletAddrAvatar === 'function' ? walletAddrAvatar(WALLET.address, 20) : '<span class="wallet-dot"></span>')
        + '</span>'
        + fmtAddress(WALLET.address)
      + '</button>'
    : '<button class="btn btn-wallet" id="connect-wallet">' + PH.wallet + ' ' + t('connectWallet') + '</button>';

  mount.innerHTML = '<header class="site-header">'
    + '<a class="brand" href="./"><span class="brand-mark">' + PH.cube + '</span>Dole<b>Fi</b></a>'
    + '<nav class="nav">' + navHTML + '</nav>'
    + '<div class="header-right">'
    +   bellHTML
    +   walletHTML
    +   '<button class="burger" id="nav-burger" aria-label="Menu" aria-expanded="false">'
    +     '<span></span><span></span><span></span>'
    +   '</button>'
    + '</div>'
    + '</header>';

  renderMobileNav();
  setupBurger();
  updateHeaderScroll(); // восстановить класс scrolled после перерисовки

  /* Кнопка «Подключить кошелёк» — открываем wallet.js модал */
  var wb = document.getElementById('connect-wallet');
  if (wb) wb.addEventListener('click', function () {
    if (typeof openWalletSelect === 'function') openWalletSelect();
  });

  /* Чип адреса — открываем wallet.js меню аккаунта */
  var chip = document.getElementById('wallet-chip');
  if (chip) chip.addEventListener('click', function () {
    if (typeof openWalletMenu === 'function') openWalletMenu(chip);
  });

  /* Колокольчик — дропдаун уведомлений */
  var bell = document.getElementById('notif-bell');
  if (bell) bell.addEventListener('click', function () { toggleNotifPanel(bell); });
}

/* Уведомления */
var notifPanelEl = null;

function toggleNotifPanel(anchor) {
  if (notifPanelEl) { closeNotifPanel(); return; }

  notifPanelEl = document.createElement('div');
  notifPanelEl.className = 'notif-panel';
  notifPanelEl.innerHTML =
    '<div class="notif-head">' + t('notifications') + '</div>'
    + '<div class="notif-empty">'
    +   '<svg width="36" height="36" viewBox="0 0 256 256" fill="none" stroke="currentColor" stroke-width="12" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg" style="opacity:.3"><path d="M96 192a32 32 0 0 0 64 0"/><path d="M208 192H48a16 16 0 0 1-12.8-25.6C49.6 147.2 64 130.1 64 96a64 64 0 0 1 128 0c0 34.1 14.4 51.2 28.8 70.4A16 16 0 0 1 208 192z"/></svg>'
    +   '<p class="notif-empty-title">' + t('noNotif') + '</p>'
    +   '<p class="notif-empty-sub">' + t('noNotifSub') + '</p>'
    + '</div>';

  document.body.appendChild(notifPanelEl);

  var r   = anchor.getBoundingClientRect();
  var pw  = notifPanelEl.offsetWidth;
  var left = r.right - pw + window.scrollX;
  if (left < 8) left = 8;
  notifPanelEl.style.top  = (r.bottom + window.scrollY + 8) + 'px';
  notifPanelEl.style.left = left + 'px';

  requestAnimationFrame(function () { notifPanelEl && notifPanelEl.classList.add('open'); });

  setTimeout(function () {
    document.addEventListener('click', onNotifOutside);
  }, 10);
}

function closeNotifPanel() {
  document.removeEventListener('click', onNotifOutside);
  if (!notifPanelEl) return;
  notifPanelEl.classList.remove('open');
  var el = notifPanelEl;
  setTimeout(function () { if (el) el.remove(); }, 200);
  notifPanelEl = null;
}

function onNotifOutside(e) {
  if (notifPanelEl && !notifPanelEl.contains(e.target)
      && e.target.id !== 'notif-bell') {
    closeNotifPanel();
  }
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
    if (typeof openWalletSelect === 'function') openWalletSelect();
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
    +   '<button class="lang-globe" id="lang-toggle" title="Switch language">'
    +     PH.globe + '<span class="lang-code">' + LANG.toUpperCase() + '</span>'
    +   '</button>'
    +   '<div class="footer-links">' + links + '</div>'
    + '</div>'
    + '</footer>';
}

/* ══════════════════════════════════════════
   ПЕРЕКЛЮЧАТЕЛЬ ЯЗЫКА
══════════════════════════════════════════ */
function switchLang() {
  LANG = LANG === 'ru' ? 'en' : 'ru';
  localStorage.setItem('dolefi_lang', LANG);
  closeMobileNav();
  renderHeader();
  if (typeof window.initBrandCube === 'function') window.initBrandCube();
  renderFooter();
  setupLangToggle();
  setupButtonRipple();
  applyTranslations();
}

function setupLangToggle() {
  /* lang-toggle теперь в футере (bottom-left) */
  var btn  = document.getElementById('lang-toggle');
  var btnM = document.getElementById('mobile-lang-toggle');
  if (btn)  btn.addEventListener('click', switchLang);
  if (btnM) btnM.addEventListener('click', switchLang);
}

/* ══════════════════════════════════════════
   SCROLL - прозрачный → тёмный header
══════════════════════════════════════════ */
function updateHeaderScroll() {
  var h = document.querySelector('.site-header');
  if (h) h.classList.toggle('scrolled', window.scrollY > 24);
}

(function () {
  window.addEventListener('scroll', updateHeaderScroll, { passive: true });
  document.addEventListener('DOMContentLoaded', updateHeaderScroll);
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
   APPLY TRANSLATIONS TO PAGE CONTENT
══════════════════════════════════════════ */
function applyTranslations() {
  document.documentElement.lang = LANG;

  // Update page title
  var pg = currentPage();
  var titles = {
    ru: { './': 'DoleFi', 'about': 'DoleFi — О проекте', 'projects': 'DoleFi — Проекты', 'dao': 'DoleFi — DAO' },
    en: { './': 'DoleFi', 'about': 'DoleFi — About',      'projects': 'DoleFi — Projects', 'dao': 'DoleFi — DAO' }
  };
  var langTitles = titles[LANG] || titles.ru;
  if (langTitles[pg]) document.title = langTitles[pg];

  // Plain text replacement
  document.querySelectorAll('[data-i18n]').forEach(function (el) {
    var key = el.getAttribute('data-i18n');
    var val = t(key);
    if (val !== key) el.textContent = val;
  });

  // HTML replacement (for elements with <span class="acc"> etc)
  document.querySelectorAll('[data-i18n-html]').forEach(function (el) {
    var key = el.getAttribute('data-i18n-html');
    var val = t(key);
    if (val !== key) el.innerHTML = val;
  });
}

/* ══════════════════════════════════════════
   INIT
══════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', function () {
  renderHeader();
  if (typeof window.initBrandCube === 'function') window.initBrandCube();
  renderFooter();
  setupLangToggle();
  setupButtonRipple();
  applyTranslations();
});
