(() => {
  const section = document.querySelector("[data-social-feed]");
  if (!section) return;

  const endpoint = "/api/social/reels";
  const facebookPageUrl = "https://www.facebook.com/profile.php?id=61591944164231";
  const track = section.querySelector("[data-social-track]");
  const fallback = section.querySelector("[data-social-fallback]");
  const status = section.querySelector("[data-social-status]");
  const prev = section.querySelector("[data-social-prev]");
  const next = section.querySelector("[data-social-next]");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let loaded = false;

  const safeUrl = (value) => {
    if (typeof value !== "string") return null;
    try {
      const url = new URL(value);
      return url.protocol === "https:" ? url.href : null;
    } catch {
      return null;
    }
  };

  const formatDate = (value) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" }).format(date);
  };

  const setStatus = (message) => {
    if (status) status.textContent = message;
  };

  const scrollByCard = (direction) => {
    const card = track?.querySelector(".social-card");
    if (!track || !card) return;
    const styles = getComputedStyle(track);
    const gap = parseFloat(styles.columnGap || styles.gap || "0") || 0;
    track.scrollBy({ left: direction * (card.getBoundingClientRect().width + gap), behavior: reducedMotion ? "auto" : "smooth" });
  };

  const updateControls = () => {
    if (!track || !prev || !next) return;
    const max = Math.max(0, track.scrollWidth - track.clientWidth);
    prev.disabled = track.scrollLeft <= 4;
    next.disabled = track.scrollLeft >= max - 4;
  };

  const createCard = (item) => {
    const article = document.createElement("article");
    article.className = "social-card";

    const media = document.createElement("div");
    media.className = "social-card-media";
    const thumbnail = safeUrl(item.thumbnail);
    if (thumbnail) {
      const image = document.createElement("img");
      image.src = thumbnail;
      image.loading = "lazy";
      image.decoding = "async";
      image.alt = "Aperçu d’un Reel Facebook ALTA Coaching";
      image.addEventListener("error", () => image.remove(), { once: true });
      media.appendChild(image);
    }
    const placeholder = document.createElement("div");
    placeholder.className = "social-card-media-placeholder";
    placeholder.innerHTML = "<strong>ALTA</strong><span>REEL FACEBOOK</span>";
    media.appendChild(placeholder);

    const body = document.createElement("div");
    body.className = "social-card-body";
    const meta = document.createElement("div");
    meta.className = "social-card-meta";
    const platform = document.createElement("span");
    platform.className = "social-card-platform";
    platform.textContent = "FACEBOOK";
    const date = document.createElement("time");
    const dateText = formatDate(item.publishedAt);
    date.textContent = dateText;
    if (item.publishedAt) date.dateTime = item.publishedAt;
    meta.append(platform, date);
    body.appendChild(meta);

    if (typeof item.titleOrCaption === "string" && item.titleOrCaption.trim()) {
      const caption = document.createElement("p");
      caption.className = "social-card-caption";
      caption.textContent = item.titleOrCaption.trim();
      body.appendChild(caption);
    }

    const link = document.createElement("a");
    link.className = "social-card-link";
    link.href = safeUrl(item.permalink) || facebookPageUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "VOIR LE REEL ↗";
    body.appendChild(link);

    article.append(media, body);
    return article;
  };

  const showFallback = () => {
    if (track) track.replaceChildren();
    if (fallback) fallback.hidden = false;
    if (prev) prev.hidden = true;
    if (next) next.hidden = true;
    setStatus("Les contenus sociaux ne sont pas disponibles pour le moment.");
  };

  const renderItems = (items) => {
    if (!track || !Array.isArray(items) || !items.length) {
      showFallback();
      return;
    }
    const fragment = document.createDocumentFragment();
    items.slice(0, 6).forEach((item) => fragment.appendChild(createCard(item)));
    track.replaceChildren(fragment);
    if (fallback) fallback.hidden = true;
    if (prev) prev.hidden = false;
    if (next) next.hidden = false;
    setStatus(`${Math.min(items.length, 6)} contenus chargés.`);
    requestAnimationFrame(updateControls);
  };

  const load = async () => {
    if (loaded) return;
    loaded = true;
    setStatus("Chargement des derniers contenus ALTA.");
    try {
      const response = await fetch(endpoint, { headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error("social_feed_unavailable");
      const payload = await response.json();
      renderItems(payload.items);
    } catch {
      showFallback();
    }
  };

  prev?.addEventListener("click", () => scrollByCard(-1));
  next?.addEventListener("click", () => scrollByCard(1));
  track?.addEventListener("scroll", () => requestAnimationFrame(updateControls), { passive: true });
  track?.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") { event.preventDefault(); scrollByCard(-1); }
    if (event.key === "ArrowRight") { event.preventDefault(); scrollByCard(1); }
  });
  window.addEventListener("resize", updateControls, { passive: true });

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      load();
    }, { rootMargin: "600px 0px" });
    observer.observe(section);
  } else {
    load();
  }
})();
