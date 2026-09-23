(() => {
  const section = document.querySelector("[data-google-reviews]");
  if (!section) return;

  const endpoint = "/api/google-reviews?v=6";
  const track = section.querySelector("[data-reviews-track]");
  const score = section.querySelector("[data-reviews-score]");
  const stars = section.querySelector("[data-reviews-stars]");
  const count = section.querySelector("[data-reviews-count]");
  const status = section.querySelector("[data-reviews-status]");
  const allReviewsLink = section.querySelector("[data-reviews-link]");
  const prev = section.querySelector("[data-reviews-prev]");
  const next = section.querySelector("[data-reviews-next]");
  const pagination = section.querySelector("[data-reviews-pagination]");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let loaded = false;
  let scrollFrame = 0;

  const safeHttpsUrl = (value) => {
    if (typeof value !== "string" || !value.trim()) return null;
    try {
      const url = new URL(value);
      return url.protocol === "https:" ? url.href : null;
    } catch { return null; }
  };

  const setText = (node, value) => { if (node) node.textContent = value; };
  const starsText = (rating) => {
    const rounded = Math.max(0, Math.min(5, Math.round(Number(rating) || 0)));
    return `${"★".repeat(rounded)}${"☆".repeat(5 - rounded)}`;
  };

  const visitLabel = (visitDate) => {
    const year = Number(visitDate?.year);
    const month = Number(visitDate?.month);
    if (!year || month < 1 || month > 12) return null;
    const date = new Date(Date.UTC(year, month - 1, 1));
    const formatted = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" }).format(date);
    return `Visite : ${formatted}`;
  };

  const makeLink = (href, label, className = "") => {
    const safe = safeHttpsUrl(href);
    if (!safe) return null;
    const link = document.createElement("a");
    link.href = safe;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = label;
    if (className) link.className = className;
    return link;
  };

  const createReview = (review) => {
    const article = document.createElement("article");
    article.className = "google-review-card";

    const top = document.createElement("div");
    top.className = "google-review-top";
    const reviewStars = document.createElement("span");
    reviewStars.className = "google-review-stars";
    reviewStars.setAttribute("aria-label", `${Number(review.rating) || 0} étoiles sur 5`);
    reviewStars.textContent = starsText(review.rating);
    const source = document.createElement("span");
    source.className = "google-review-source";
    source.translate = false;
    source.textContent = "Google Maps";
    top.append(reviewStars, source);

    const body = document.createElement("p");
    body.className = "google-review-text";
    body.textContent = review.text || "Avis publié sur Google Maps.";

    const author = document.createElement("div");
    author.className = "google-review-author";
    const avatarUrl = safeHttpsUrl(review.author?.photoUri);
    if (avatarUrl) {
      const avatar = document.createElement("img");
      avatar.className = "google-review-avatar";
      avatar.src = avatarUrl;
      avatar.alt = "";
      avatar.loading = "lazy";
      avatar.referrerPolicy = "no-referrer";
      author.appendChild(avatar);
    }

    const authorCopy = document.createElement("div");
    authorCopy.className = "google-review-author-copy";
    const authorName = makeLink(review.author?.uri, review.author?.displayName || "Auteur de l’avis", "google-review-author-name");
    if (authorName) authorCopy.appendChild(authorName);
    else {
      const name = document.createElement("strong");
      name.className = "google-review-author-name";
      name.textContent = review.author?.displayName || "Auteur de l’avis";
      authorCopy.appendChild(name);
    }

    const metaParts = [visitLabel(review.visitDate), review.relativePublishTimeDescription].filter(Boolean);
    if (metaParts.length) {
      const meta = document.createElement("span");
      meta.className = "google-review-meta";
      meta.textContent = metaParts.join(" · ");
      authorCopy.appendChild(meta);
    }
    author.appendChild(authorCopy);

    const links = document.createElement("div");
    links.className = "google-review-links";
    const sourceLink = makeLink(review.googleMapsUri, "Voir l’avis sur Google Maps");
    if (sourceLink) links.appendChild(sourceLink);
    const flagLink = makeLink(review.flagContentUri, "Signaler");
    if (flagLink) links.appendChild(flagLink);
    if (review.translated) {
      const translated = document.createElement("span");
      translated.className = "google-review-translation";
      translated.textContent = "Avis traduit par Google";
      links.appendChild(translated);
    }

    article.append(top, body, author);
    if (links.childNodes.length) article.appendChild(links);
    return article;
  };

  const updateActiveCard = () => {
    if (!track) return;
    const cards = [...track.querySelectorAll(".google-review-card")];
    if (!cards.length) return;

    let activeIndex = 0;
    const maxScroll = Math.max(0, track.scrollWidth - track.clientWidth);
    if (maxScroll > 4 && track.scrollLeft > 4) {
      const trackRect = track.getBoundingClientRect();
      const center = trackRect.left + trackRect.width / 2;
      let distance = Infinity;
      cards.forEach((card, index) => {
        const rect = card.getBoundingClientRect();
        const currentDistance = Math.abs((rect.left + rect.width / 2) - center);
        if (currentDistance < distance) {
          distance = currentDistance;
          activeIndex = index;
        }
      });
    }

    cards.forEach((card, index) => card.classList.toggle("is-active", index === activeIndex));
    if (pagination) {
      [...pagination.children].forEach((dot, index) => dot.classList.toggle("is-active", index === activeIndex));
    }
  };

  const updateControls = () => {
    if (track && prev && next) {
      const max = Math.max(0, track.scrollWidth - track.clientWidth);
      prev.disabled = track.scrollLeft <= 4;
      next.disabled = track.scrollLeft >= max - 4;
    }
    updateActiveCard();
  };

  const queueUpdate = () => {
    if (scrollFrame) cancelAnimationFrame(scrollFrame);
    scrollFrame = requestAnimationFrame(() => {
      scrollFrame = 0;
      updateControls();
    });
  };

  const scrollByCard = (direction) => {
    const card = track?.querySelector(".google-review-card");
    if (!track || !card) return;
    const gap = parseFloat(getComputedStyle(track).gap || "0") || 0;
    track.scrollBy({ left: direction * (card.getBoundingClientRect().width + gap), behavior: reducedMotion ? "auto" : "smooth" });
  };

  const setFallbackLink = (url) => {
    const safe = safeHttpsUrl(url);
    if (!allReviewsLink || !safe) return;
    allReviewsLink.href = safe;
    allReviewsLink.hidden = false;
  };

  const unavailable = (message, fallbackUrl = null) => {
    section.classList.add("is-unavailable");
    if (track) track.replaceChildren();
    setText(status, message || "Avis momentanément indisponibles.");
    setFallbackLink(fallbackUrl);
  };

  const render = (payload) => {
    section.classList.remove("is-unavailable");
    const reviews = Array.isArray(payload?.reviews) ? payload.reviews : [];
    setFallbackLink(payload?.googleMapsUri || payload?.fallbackGoogleMapsUri);
    if (!reviews.length) return unavailable("Consultez les avis directement sur Google Maps.", payload?.googleMapsUri || payload?.fallbackGoogleMapsUri);

    const rating = Number(payload.rating);
    if (Number.isFinite(rating)) {
      setText(score, rating.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }));
      setText(stars, starsText(rating));
      stars?.setAttribute("aria-label", `${rating.toLocaleString("fr-FR")} étoiles sur 5`);
    }
    const total = Number(payload.userRatingCount);
    if (Number.isFinite(total)) setText(count, `${total.toLocaleString("fr-FR")} avis Google`);

    const visibleReviews = reviews.slice(0, 5);
    const fragment = document.createDocumentFragment();
    visibleReviews.forEach((review) => fragment.appendChild(createReview(review)));
    track?.replaceChildren(fragment);

    if (pagination) {
      const dots = document.createDocumentFragment();
      visibleReviews.forEach((_, index) => {
        const dot = document.createElement("span");
        dot.className = `google-reviews-dot${index === 0 ? " is-active" : ""}`;
        dots.appendChild(dot);
      });
      pagination.replaceChildren(dots);
    }

    setText(status, "");
    requestAnimationFrame(updateControls);
  };

  const load = async () => {
    if (loaded) return;
    loaded = true;
    try {
      const response = await fetch(endpoint, { headers: { Accept: "application/json" }, cache: "no-store" });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload) throw Object.assign(new Error("reviews_unavailable"), { payload, httpStatus: response.status });
      render(payload);
    } catch (error) {
      const reason = error?.payload?.status || "network_error";
      section.dataset.reviewsError = reason;
      section.dataset.reviewsHttp = String(error?.httpStatus || "");
      if (error?.payload?.googleErrorStatus) section.dataset.googleError = error.payload.googleErrorStatus;
      console.warn("ALTA Google Reviews:", {
        status: reason,
        httpStatus: error?.httpStatus || null,
        googleHttpStatus: error?.payload?.googleHttpStatus || null,
        googleErrorStatus: error?.payload?.googleErrorStatus || null
      });
      unavailable("Avis momentanément indisponibles.", error?.payload?.fallbackGoogleMapsUri);
    }
  };

  prev?.addEventListener("click", () => scrollByCard(-1));
  next?.addEventListener("click", () => scrollByCard(1));
  track?.addEventListener("scroll", queueUpdate, { passive: true });
  window.addEventListener("resize", queueUpdate, { passive: true });

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      load();
    }, { rootMargin: "500px 0px" });
    observer.observe(section);
  } else load();
})();
