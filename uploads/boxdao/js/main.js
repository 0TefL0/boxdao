/* =========================================================================
   main.js - общая логика для всех страниц
   --------------------------------------------------------------------------
   • Вставляет одинаковые ШАПКУ и ФУТЕР на каждой странице (без дублирования
     разметки в HTML). Достаточно положить <div id="header"></div> и
     <div id="footer"></div> на странице - этот скрипт их наполнит.
   • Подсвечивает активный пункт меню по имени файла.
   • Заглушка «Подключить кошелёк» → модалка Demo mode.
   • Переключатель языка RU/EN (заготовка под локализацию).
   ========================================================================= */

/* --- Пункты меню. Добавляешь новую страницу - добавляешь строку сюда. --- */
const NAV_ITEMS = [
  { href: "index.html",   label: "Главная"   },
  { href: "about.html",   label: "О проекте" },
  { href: "staking.html", label: "Стейкинг"  },
  { href: "dao.html",     label: "DAO"       },
  { href: "cabinet.html", label: "Кабинет"   },
];

const FOOTER_LINKS = [
  { href: "#", label: "Twitter / X" },
  { href: "#", label: "Discord"     },
  { href: "#", label: "Telegram"    },
  { href: "#", label: "GitHub"      },
];

/* Текущая страница (для подсветки активного пункта) */
function currentPage() {
  const path = window.location.pathname.split("/").pop();
  return path === "" ? "index.html" : path;
}

/* ----------------------------- ШАПКА ----------------------------- */
function renderHeader() {
  const mount = document.getElementById("header");
  if (!mount) return;

  const active = currentPage();
  const navHTML = NAV_ITEMS.map(
    (i) => `<a href="${i.href}" class="${i.href === active ? "active" : ""}">${i.label}</a>`
  ).join("");

  mount.innerHTML = `
    <header class="site-header">
      <a class="brand" href="index.html">
        <span class="brand-mark">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2 3 7v10l9 5 9-5V7z"/><path d="M3 7l9 5 9-5M12 12v10"/>
          </svg>
        </span>
        Box<b>DAO</b>
      </a>

      <nav class="nav">${navHTML}</nav>

      <div class="header-right">
        <div class="lang">
          <button class="on" data-lang="ru">RU</button>
          <button data-lang="en">EN</button>
        </div>
        <button class="btn btn-wallet" id="connect-wallet">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20M16 14h.01"/>
          </svg>
          Подключить кошелёк
        </button>
      </div>
    </header>`;
}

/* ----------------------------- ФУТЕР ----------------------------- */
function renderFooter() {
  const mount = document.getElementById("footer");
  if (!mount) return;

  const links = FOOTER_LINKS.map((l) => `<a href="${l.href}">${l.label}</a>`).join("");
  const year = new Date().getFullYear();

  mount.innerHTML = `
    <footer class="site-footer">
      <div class="container footer-inner">
        <div class="footer-links">${links}</div>
        <div class="footer-copy">© ${year} BoxDAO · Demo / тестовая версия</div>
      </div>
    </footer>`;
}

/* --------------------- МОДАЛКА: подключение кошелька --------------------- */
function setupWalletModal() {
  // Создаём модалку один раз и добавляем в конец body
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.id = "wallet-modal";
  overlay.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true">
      <span class="eyebrow">Demo mode</span>
      <h3>Подключение кошелька отключено</h3>
      <p>Это тестовая версия сайта. Реальное подключение к кошельку
         и блокчейн-транзакции здесь не выполняются.</p>
      <button class="btn btn-primary" data-close>Понятно</button>
    </div>`;
  document.body.appendChild(overlay);

  const open  = () => overlay.classList.add("open");
  const close = () => overlay.classList.remove("open");

  // Кнопка в шапке (она появляется после renderHeader)
  document.getElementById("connect-wallet")?.addEventListener("click", open);

  // Закрытие: по фону, по кнопке, по Esc
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay || e.target.hasAttribute("data-close")) close();
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
}

/* --------------------- ПЕРЕКЛЮЧАТЕЛЬ ЯЗЫКА (заготовка) --------------------- */
function setupLangToggle() {
  document.querySelectorAll(".lang button").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".lang button").forEach((b) => b.classList.remove("on"));
      btn.classList.add("on");
      // TODO: здесь подключишь реальную смену языка (i18n)
      // const lang = btn.dataset.lang;
    });
  });
}

/* ----------------------------- ИНИЦИАЛИЗАЦИЯ ----------------------------- */
document.addEventListener("DOMContentLoaded", () => {
  renderHeader();
  renderFooter();
  setupWalletModal();
  setupLangToggle();
});
