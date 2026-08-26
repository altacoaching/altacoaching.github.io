/* ==============================
   CONFIGURATION ALTA COACHING
================================ */
const CONFIG = {
  email: "maxime.altacoaching@gmail.com",
  facebookUrl: "https://www.facebook.com/profile.php?id=61591944164231",
  instagramUrl: "https://www.instagram.com/maxime.altacoaching/",
  tiktokUrl: "https://www.tiktok.com/@maxime.altacoaching",
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
const isMobileReveal = window.matchMedia("(max-width: 430px)").matches;
const revealObserver = new IntersectionObserver((entries, observer) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add("is-visible");
    observer.unobserve(entry.target);
  });
}, isMobileReveal
  ? { threshold: 0.03, rootMargin: "0px 0px -10% 0px" }
  : { threshold: 0.12 });
document.querySelectorAll(".reveal, .qualification-reveal").forEach((element) => revealObserver.observe(element));

/* Mobile scroll rollover — one centred card per section */
const scrollActiveGroups = [
  [...document.querySelectorAll("#coaching .service-row")],
  [...document.querySelectorAll("#formules .price-card")]
].filter((group) => group.length);
const scrollActiveMedia = window.matchMedia("(max-width: 430px)");
let scrollActiveFrame = 0;

function updateScrollActiveGroups() {
  const enabled = scrollActiveMedia.matches && !prefersReducedMotion;
  const viewportCenter = window.innerHeight / 2;
  const activationDistance = window.innerHeight * 0.34;

  scrollActiveGroups.forEach((group) => {
    let closestCard = null;
    let closestDistance = Infinity;

    if (enabled) {
      group.forEach((card) => {
        const rect = card.getBoundingClientRect();
        const cardCenter = rect.top + rect.height / 2;
        const distance = Math.abs(cardCenter - viewportCenter);
        if (rect.bottom > 0 && rect.top < window.innerHeight && distance < closestDistance) {
          closestCard = card;
          closestDistance = distance;
        }
      });
    }

    group.forEach((card) => {
      card.classList.toggle("is-scroll-active", card === closestCard && closestDistance <= activationDistance);
    });
  });
}

function scheduleScrollActiveGroups() {
  if (scrollActiveFrame) return;
  scrollActiveFrame = window.requestAnimationFrame(() => {
    scrollActiveFrame = 0;
    updateScrollActiveGroups();
  });
}

if (scrollActiveGroups.length) {
  scheduleScrollActiveGroups();
  window.addEventListener("load", scheduleScrollActiveGroups, { once: true });
  window.addEventListener("pageshow", scheduleScrollActiveGroups);
  window.addEventListener("scroll", scheduleScrollActiveGroups, { passive: true });
  window.addEventListener("resize", scheduleScrollActiveGroups, { passive: true });
  window.addEventListener("orientationchange", scheduleScrollActiveGroups, { passive: true });
}

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

function openTally(formula = "", source = "site") {
  trackEvent("tally_open", formula ? { formula, source } : { source });
  if (window.Tally?.openPopup) {
    window.Tally.openPopup(CONFIG.tallyFormId, {
      layout: "modal",
      width: 700,
      hideTitle: true,
      hiddenFields: { formule: formula, source },
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
  button.addEventListener("click", () => openTally(button.dataset.formula || "", button.dataset.source || "site"));
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
  const blockedTargets = new Set();
  const mobileCtaObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) blockedTargets.add(entry.target);
      else blockedTargets.delete(entry.target);
    });
    mobileCta.classList.toggle("is-hidden", blockedTargets.size > 0);
  }, { threshold: 0.08 });
  [footer, document.querySelector("#questionnaire"), document.querySelector("#reservation")].filter(Boolean).forEach((element) => mobileCtaObserver.observe(element));
}

/* Qualifications tilt */
document.querySelectorAll("[data-tilt]").forEach((tiltCard) => {
  if (prefersReducedMotion || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
  tiltCard.addEventListener("pointermove", (event) => {
    const rect = tiltCard.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    tiltCard.style.transform = `rotateX(${-y * 2.5}deg) rotateY(${x * 3.5}deg) scale(1.008)`;
  });
  tiltCard.addEventListener("pointerleave", () => { tiltCard.style.transform = ""; });
});

/* Footer */
const year = document.querySelector("#year");
if (year) year.textContent = new Date().getFullYear();
