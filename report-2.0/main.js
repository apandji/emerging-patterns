/* ═══════════════════════════════════════════════════════
   MAIN — sidebar scroll-spy, theme toggle, mobile nav,
   reading progress, reveal animations, stat count-ups.
═══════════════════════════════════════════════════════ */

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ── Theme toggle ── */
const themeBtn = document.getElementById("theme-btn");
function syncThemeLabel() {
  const dark = document.documentElement.dataset.theme === "dark";
  themeBtn.querySelector(".theme-btn-label").textContent = dark ? "Light mode" : "Dark mode";
}
themeBtn.addEventListener("click", () => {
  const dark = document.documentElement.dataset.theme === "dark";
  if (dark) delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = "dark";
  localStorage.setItem("theme-2", dark ? "light" : "dark");
  syncThemeLabel();
  window.renderCharts(); // re-paint SVG colors
});
syncThemeLabel();

/* ── Edition switcher dropdown ── */
const editionBtn = document.getElementById("edition-btn");
const editionMenu = document.getElementById("edition-menu");

function setEditionMenu(open) {
  editionMenu.hidden = !open;
  editionBtn.setAttribute("aria-expanded", String(open));
}
editionBtn.addEventListener("click", e => {
  e.stopPropagation();
  setEditionMenu(editionMenu.hidden);
});
document.addEventListener("click", e => {
  if (!editionMenu.hidden && !editionMenu.contains(e.target)) setEditionMenu(false);
});
document.addEventListener("keydown", e => {
  if (e.key === "Escape") setEditionMenu(false);
});

/* ── Mobile sidebar ── */
const sidebar = document.getElementById("sidebar");
const navToggle = document.getElementById("nav-toggle");
const navScrim = document.getElementById("nav-scrim");

function setNav(open) {
  sidebar.classList.toggle("is-open", open);
  navToggle.setAttribute("aria-expanded", String(open));
  navScrim.hidden = !open;
}
navToggle.addEventListener("click", () => setNav(!sidebar.classList.contains("is-open")));
navScrim.addEventListener("click", () => setNav(false));
sidebar.querySelectorAll(".chapter-link").forEach(a =>
  a.addEventListener("click", () => setNav(false))
);

/* ── Scroll-spy: highlight active chapter ── */
const chapterEls = Array.from(document.querySelectorAll("section[data-chapter]"));
const linkByChapter = new Map(
  Array.from(document.querySelectorAll(".chapter-link")).map(a => [a.dataset.chapter, a])
);

const spy = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (!e.isIntersecting) return;
    linkByChapter.forEach(a => a.classList.remove("is-active"));
    const link = linkByChapter.get(e.target.dataset.chapter);
    if (link) link.classList.add("is-active");
  });
}, { rootMargin: "-30% 0px -60% 0px" });
chapterEls.forEach(el => spy.observe(el));

/* ── Reading progress bar ── */
const progressFill = document.getElementById("progress-fill");
function updateProgress() {
  const doc = document.documentElement;
  const max = doc.scrollHeight - window.innerHeight;
  progressFill.style.width = `${max > 0 ? (window.scrollY / max) * 100 : 0}%`;
}
window.addEventListener("scroll", updateProgress, { passive: true });
window.addEventListener("resize", updateProgress);
updateProgress();

/* ── Reveal-on-scroll ── */
const revealEls = document.querySelectorAll(".reveal");
if (reduceMotion) {
  revealEls.forEach(el => el.classList.add("is-visible"));
} else {
  const ro = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.classList.add("is-visible");
      ro.unobserve(e.target);
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
  revealEls.forEach(el => ro.observe(el));
}

/* ── Stat count-ups ── */
const statEls = document.querySelectorAll(".stat-val[data-count]");
function animateStat(el) {
  const target = parseFloat(el.dataset.count);
  const decimals = String(el.dataset.count).includes(".") ? 1 : 0;
  const duration = 850;
  const start = performance.now();
  function tick(now) {
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    el.textContent = (target * eased).toFixed(decimals);
    if (t < 1) requestAnimationFrame(tick);
    else el.textContent = target.toFixed(decimals);
  }
  requestAnimationFrame(tick);
}
if (!reduceMotion && statEls.length) {
  const so = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      animateStat(e.target);
      so.unobserve(e.target);
    });
  }, { threshold: 0.6 });
  statEls.forEach(el => so.observe(el));
}
