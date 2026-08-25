/* ==============================
   CONFIGURATION ALTA COACHING
   Modifier uniquement cette zone
================================ */
const CONFIG = {
  email: "VOTRE_EMAIL",
  tallyUrl: "",
  calUrl: "",
  instagramUrl: ""
};

const isValidUrl = (value) => {
  try { return /^https?:$/.test(new URL(value).protocol); } catch { return false; }
};

const makeFallback = (title, text, linkText, target) => {
  const wrapper = document.createElement("div");
  wrapper.className = "embed-placeholder";
  wrapper.innerHTML = `<h3>${title}</h3><p>${text}</p><a class="button button-primary" href="${target}">${linkText} <b>↗</b></a>`;
  return wrapper;
};

function setEmbed(containerId, url, fallback) {
  const container = document.getElementById(containerId);
  if (!container) return;
  if (!isValidUrl(url)) { container.append(fallback); return; }
  const frame = document.createElement("iframe");
  frame.src = url;
  frame.title = containerId === "tally-embed" ? "Questionnaire ALTA Coaching" : "Réserver un échange avec ALTA Coaching";
  frame.loading = "lazy";
  container.append(frame);
}

setEmbed("tally-embed", CONFIG.tallyUrl, makeFallback("QUESTIONNAIRE BIENTÔT DISPONIBLE", "En attendant, vous pouvez me parler de votre projet directement.", "M’écrire", "#contact"));
setEmbed("cal-embed", CONFIG.calUrl, makeFallback("AGENDA BIENTÔT DISPONIBLE", "Le lien de réservation sera disponible ici prochainement.", "M’écrire", "#contact"));

const header = document.querySelector(".site-header");
window.addEventListener("scroll", () => header.classList.toggle("scrolled", window.scrollY > 24), { passive: true });

const toggle = document.querySelector(".menu-toggle");
const menu = document.querySelector(".nav-links");
const closeMenu = () => { menu.classList.remove("open"); toggle.classList.remove("active"); toggle.setAttribute("aria-expanded", "false"); document.body.style.overflow = ""; };
toggle.addEventListener("click", () => {
  const open = menu.classList.toggle("open");
  toggle.classList.toggle("active", open);
  toggle.setAttribute("aria-expanded", String(open));
  document.body.style.overflow = open ? "hidden" : "";
});
menu.querySelectorAll("a").forEach(link => link.addEventListener("click", closeMenu));
document.addEventListener("keydown", event => { if (event.key === "Escape") closeMenu(); });

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add("visible"); observer.unobserve(entry.target); } });
}, { threshold: .12 });
document.querySelectorAll(".reveal").forEach(item => observer.observe(item));

document.getElementById("year").textContent = new Date().getFullYear();

const emailLink = document.querySelector('[data-config-link="email"]');
const instagramLink = document.querySelector('[data-config-link="instagram"]');
if (isValidUrl(CONFIG.instagramUrl)) instagramLink.href = CONFIG.instagramUrl;
else instagramLink.style.display = "none";
if (CONFIG.email && CONFIG.email !== "VOTRE_EMAIL") emailLink.href = `mailto:${CONFIG.email}`;

document.getElementById("contact-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const note = document.getElementById("form-note");
  if (!CONFIG.email || CONFIG.email === "VOTRE_EMAIL") {
    note.textContent = "Ajoutez votre adresse e-mail dans CONFIG pour activer l’envoi du message.";
    return;
  }
  const values = new FormData(event.currentTarget);
  const subject = encodeURIComponent(`Demande de contact ALTA — ${values.get("firstName")} ${values.get("lastName")}`);
  const body = encodeURIComponent(`Prénom : ${values.get("firstName")}\nNom : ${values.get("lastName")}\nEmail : ${values.get("email")}\nTéléphone : ${values.get("phone") || "Non renseigné"}\nObjectif : ${values.get("goal")}\n\nMessage :\n${values.get("message")}`);
  note.textContent = "Votre application e-mail va s’ouvrir pour envoyer ce message.";
  window.location.href = `mailto:${CONFIG.email}?subject=${subject}&body=${body}`;
});
