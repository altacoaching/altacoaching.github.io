/* ==============================
   CONFIGURATION ALTA COACHING
   Modifier uniquement cette zone
================================ */
const CONFIG = {
  email: "levilain.maxime@gmail.com",
  phone: "+33640736546",
  tallyUrl: "https://tally.so/r/eqWMpl",
  tallyFormId: "eqWMpl",
  calUrl: "https://cal.com/maxime-alta-coaching-ghihbc/15min",
  instagramUrl: "",
  analyticsEnabled: false
};

function trackEvent(name, params = {}) {
  if (!CONFIG.analyticsEnabled) return;
  window.dispatchEvent(new CustomEvent("alta:track", { detail: { name, params } }));
}

const validUrl = (value) => { try { return /^https?:$/.test(new URL(value).protocol); } catch { return false; } };
const placeholder = (title, text, href, label) => `<div class="embed-placeholder"><h3>${title}</h3><p>${text}</p><a class="button button-primary" href="${href}">${label} ↗</a></div>`;

function initTally() {
  const shell = document.getElementById("tally-embed");
  if (!shell) return;
  if (!validUrl(CONFIG.tallyUrl)) { shell.innerHTML = placeholder("QUESTIONNAIRE BIENTÔT DISPONIBLE", "Écrivez-moi directement pour parler de votre projet.", `mailto:${CONFIG.email}`, "M’écrire"); return; }
  const frame = document.createElement("iframe");
  frame.src = CONFIG.tallyUrl;
  frame.title = "Questionnaire ALTA Coaching";
  frame.loading = "lazy";
  frame.setAttribute("data-tally-embed", "1");
  shell.append(frame);
  document.querySelectorAll("[data-tally-open]").forEach(link => link.addEventListener("click", (event) => {
    const formula = link.dataset.formula;
    trackEvent("tally_open", formula ? { formula } : {});
    if (!window.Tally?.openPopup || !CONFIG.tallyFormId) return;
    event.preventDefault();
    window.Tally.openPopup(CONFIG.tallyFormId, { layout: "modal", width: 700, hideTitle: true, hiddenFields: formula ? { formule: formula } : {} });
  }));
}

function initCal() {
  const shell = document.getElementById("cal-embed");
  if (!shell) return;
  if (!validUrl(CONFIG.calUrl)) { shell.innerHTML = placeholder("AGENDA BIENTÔT DISPONIBLE", "Vous pouvez me contacter directement pour convenir d’un échange.", `mailto:${CONFIG.email}`, "M’écrire"); return; }
  const frame = document.createElement("iframe");
  frame.src = CONFIG.calUrl;
  frame.title = "Réserver un échange avec ALTA Coaching";
  frame.loading = "lazy";
  shell.append(frame);
}

document.querySelectorAll("[data-track]").forEach(link => link.addEventListener("click", () => trackEvent(link.dataset.track)));
document.querySelectorAll('[data-config-link="email"]').forEach(link => { link.href = `mailto:${CONFIG.email}`; });
document.querySelectorAll('[data-config-link="phone"]').forEach(link => { link.href = `tel:${CONFIG.phone}`; });
document.querySelectorAll('[data-config-link="instagram"]').forEach(link => { if (validUrl(CONFIG.instagramUrl)) link.href = CONFIG.instagramUrl; else link.remove(); });

const header = document.querySelector(".site-header");
window.addEventListener("scroll", () => header.classList.toggle("scrolled", window.scrollY > 24), { passive: true });
const toggle = document.querySelector(".menu-toggle");
const menu = document.querySelector(".nav-links");
const closeMenu = () => { menu.classList.remove("open"); toggle.classList.remove("active"); toggle.setAttribute("aria-expanded", "false"); document.body.style.overflow = ""; };
toggle.addEventListener("click", () => { const open = menu.classList.toggle("open"); toggle.classList.toggle("active", open); toggle.setAttribute("aria-expanded", String(open)); document.body.style.overflow = open ? "hidden" : ""; });
menu.querySelectorAll("a").forEach(link => link.addEventListener("click", closeMenu));
document.addEventListener("keydown", event => { if (event.key === "Escape") closeMenu(); });

const observer = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add("visible"); observer.unobserve(entry.target); } }), { threshold: .12 });
document.querySelectorAll(".reveal").forEach(item => observer.observe(item));
document.getElementById("year").textContent = new Date().getFullYear();
initTally(); initCal();
