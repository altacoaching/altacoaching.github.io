/* ==============================
   CONFIGURATION ALTA COACHING
================================ */
const CONFIG = {
  email: "levilain.maxime@gmail.com",
  phone: "+33640736546",
  tallyFormId: "eqWMpl",
  calLink: "maxime-alta-coaching-ghihbc/15min",
  analyticsEnabled: false
};

/* Utilities */
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* Analytics - inactive until configured */
function trackEvent(name, params = {}) {
  if (!CONFIG.analyticsEnabled) return;
  window.dispatchEvent(new CustomEvent("alta:track", { detail: { name, params } }));
}

document.querySelectorAll("[data-track]").forEach((element) => {
  element.addEventListener("click", () => trackEvent(element.dataset.track));
});

/* Header */
const header = document.querySelector(".site-header");
if (header) {
  if (!header.classList.contains("is-secondary")) {
    const updateHeader = () => header.classList.toggle("is-scrolled", window.scrollY > 24);
    updateHeader();
    window.addEventListener("scroll", updateHeader, { passive: true });
  }
}

/* Navigation */
const menuButton = document.querySelector(".menu-toggle");
const menu = document.querySelector(".nav-links");
let previousFocus = null;

function closeMenu() {
  if (!menuButton || !menu) return;
  menu.classList.remove("is-open");
  menuButton.classList.remove("is-open");
  menuButton.setAttribute("aria-expanded", "false");
  document.body.classList.remove("menu-open");
}

if (menuButton && menu) {
  menuButton.addEventListener("click", () => {
    const isOpen = !menu.classList.contains("is-open");
    previousFocus = document.activeElement;
    menu.classList.toggle("is-open", isOpen);
    menuButton.classList.toggle("is-open", isOpen);
    menuButton.setAttribute("aria-expanded", String(isOpen));
    document.body.classList.toggle("menu-open", isOpen);
    if (isOpen) menu.querySelector("a, button")?.focus();
    else previousFocus?.focus();
  });
  menu.querySelectorAll("a, button").forEach((item) => item.addEventListener("click", closeMenu));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && menu.classList.contains("is-open")) {
      closeMenu();
      menuButton.focus();
    }
    if (event.key === "Tab" && menu.classList.contains("is-open")) {
      const focusable = [menuButton, ...menu.querySelectorAll("a, button")];
      const first = focusable[0];
      const last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });
}

/* Reveal animations */
const revealObserver = new IntersectionObserver((entries, observer) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add("is-visible");
    observer.unobserve(entry.target);
  });
}, { threshold: 0.12 });
document.querySelectorAll(".reveal, .qualification-reveal").forEach((element) => revealObserver.observe(element));

/* Tally - official embed loader */
function loadTallyEmbeds() {
  const documentRef = document;
  const scriptUrl = "https://tally.so/widgets/embed.js";
  const load = () => {
    if (typeof window.Tally !== "undefined") {
      window.Tally.loadEmbeds();
    } else {
      documentRef.querySelectorAll("iframe[data-tally-src]:not([src])").forEach((frame) => {
        frame.src = frame.dataset.tallySrc;
      });
    }
  };
  if (typeof window.Tally !== "undefined") load();
  else if (!documentRef.querySelector(`script[src="${scriptUrl}"]`)) {
    const script = documentRef.createElement("script");
    script.src = scriptUrl;
    script.onload = load;
    script.onerror = load;
    documentRef.body.appendChild(script);
  }
}

function openTally(formula = "") {
  trackEvent("tally_open", formula ? { formula } : {});
  if (window.Tally?.openPopup) {
    window.Tally.openPopup(CONFIG.tallyFormId, {
      layout: "modal",
      width: 700,
      hideTitle: true,
      hiddenFields: formula ? { formule: formula, source: "site" } : { source: "site" },
      onSubmit: () => trackEvent("tally_submit")
    });
    return;
  }
  const questionnaire = document.querySelector("#questionnaire");
  if (questionnaire) {
    questionnaire.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth" });
    return;
  }
  window.location.href = `https://tally.so/r/${CONFIG.tallyFormId}`;
}

document.querySelectorAll("[data-tally-popup]").forEach((button) => {
  button.addEventListener("click", () => openTally(button.dataset.formula || ""));
});
loadTallyEmbeds();

/* Cal.com - official inline embed */
function loadCal() {
  if (!document.querySelector("#my-cal-inline-15min")) return;
  (function (C, A, L) {
    const push = (api, args) => api.q.push(args);
    const documentRef = C.document;
    C.Cal = C.Cal || function () {
      const cal = C.Cal;
      const args = arguments;
      if (!cal.loaded) {
        cal.ns = {};
        cal.q = cal.q || [];
        documentRef.head.appendChild(documentRef.createElement("script")).src = A;
        cal.loaded = true;
      }
      if (args[0] === L) {
        const api = function () { push(api, arguments); };
        const namespace = args[1];
        api.q = api.q || [];
        if (typeof namespace === "string") {
          cal.ns[namespace] = cal.ns[namespace] || api;
          push(cal.ns[namespace], args);
          push(cal, ["initNamespace", namespace]);
        } else push(cal, args);
        return;
      }
      push(cal, args);
    };
  })(window, "https://app.cal.com/embed/embed.js", "init");

  window.Cal("init", "15min", { origin: "https://app.cal.com" });
  window.Cal.config = window.Cal.config || {};
  window.Cal.config.forwardQueryParams = true;
  window.Cal.ns["15min"]("inline", {
    elementOrSelector: "#my-cal-inline-15min",
    config: { layout: "month_view", useSlotsViewOnSmallScreen: "true" },
    calLink: CONFIG.calLink
  });
  window.Cal.ns["15min"]("ui", {
    cssVarsPerTheme: { light: { "cal-brand": "#004aad" } },
    hideEventTypeDetails: false,
    layout: "month_view"
  });
}
loadCal();

/* Mobile CTA */
const mobileCta = document.querySelector(".mobile-cta");
const footer = document.querySelector(".footer");
if (mobileCta && footer) {
  const footerObserver = new IntersectionObserver(([entry]) => mobileCta.classList.toggle("is-hidden", entry.isIntersecting));
  footerObserver.observe(footer);
}

/* Qualifications tilt */
const tiltCard = document.querySelector("[data-tilt]");
if (tiltCard && !prefersReducedMotion && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
  tiltCard.addEventListener("pointermove", (event) => {
    const rect = tiltCard.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    tiltCard.style.transform = `rotateX(${-y * 3}deg) rotateY(${x * 4}deg) scale(1.01)`;
  });
  tiltCard.addEventListener("pointerleave", () => { tiltCard.style.transform = ""; });
}

/* Footer */
const year = document.querySelector("#year");
if (year) year.textContent = new Date().getFullYear();
