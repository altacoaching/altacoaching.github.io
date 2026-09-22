(() => {
  const section = document.querySelector("[data-social-feed]");
  if (!section) return;

  const endpoint = "/api/social/reels?v=4";
  const track = section.querySelector("[data-social-track]");
  const status = section.querySelector("[data-social-status]");
  const prev = section.querySelector("[data-social-prev]");
  const next = section.querySelector("[data-social-next]");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let loaded = false;

  const safeMediaUrl = (value) => {
    if (typeof value !== "string" || !value.trim()) return null;
    try {
      const url = new URL(value);
      if (url.protocol !== "https:") return null;
      const host = url.hostname.toLowerCase();
      if (
        host === "facebook.com" ||
        host.endsWith(".facebook.com") ||
        host === "fbcdn.net" ||
        host.endsWith(".fbcdn.net")
      ) return url.href;
      return null;
    } catch {
      return null;
    }
  };

  const safeHttpsUrl = (value) => {
    if (typeof value !== "string" || !value.trim()) return null;
    try {
      const url = new URL(value);
      return url.protocol === "https:" ? url.href : null;
    } catch {
      return null;
    }
  };

  const setStatus = (message) => {
    if (status) status.textContent = message;
  };

  const hideSection = () => {
    section.hidden = true;
    setStatus("Les vidéos Facebook ne sont pas disponibles pour le moment.");
  };

  const removeBrokenCard = (article) => {
    article.remove();
    const remaining = track?.querySelectorAll(".social-reel").length || 0;
    if (!remaining) hideSection();
    requestAnimationFrame(updateControls);
  };

  const createReel = (item) => {
    const videoUrl = safeMediaUrl(item?.videoUrl);
    if (!videoUrl) return null;

    const article = document.createElement("article");
    article.className = "social-reel";

    const video = document.createElement("video");
    video.className = "social-reel-video";
    video.controls = true;
    video.playsInline = true;
    video.preload = "metadata";
    video.src = videoUrl;
    video.setAttribute("controlsList", "nodownload");

    const poster = safeHttpsUrl(item?.poster);
    if (poster) video.poster = poster;

    video.addEventListener("error", () => removeBrokenCard(article), { once: true });

    article.appendChild(video);
    return article;
  };

  const scrollByCard = (direction) => {
    const card = track?.querySelector(".social-reel");
    if (!track || !card) return;
    const styles = getComputedStyle(track);
    const gap = parseFloat(styles.columnGap || styles.gap || "0") || 0;
    track.scrollBy({
      left: direction * (card.getBoundingClientRect().width + gap),
      behavior: reducedMotion ? "auto" : "smooth"
    });
  };

  const updateControls = () => {
    if (!track || !prev || !next) return;
    const max = Math.max(0, track.scrollWidth - track.clientWidth);
    prev.disabled = track.scrollLeft <= 4;
    next.disabled = track.scrollLeft >= max - 4;
  };

  const renderItems = (items) => {
    if (!track || !Array.isArray(items)) return hideSection();
    const reels = items.slice(0, 6).map(createReel).filter(Boolean);
    if (!reels.length) return hideSection();

    const fragment = document.createDocumentFragment();
    reels.forEach((reel) => fragment.appendChild(reel));
    track.replaceChildren(fragment);
    section.hidden = false;
    setStatus(`${reels.length} vidéos Facebook chargées.`);
    requestAnimationFrame(updateControls);
  };

  const load = async () => {
    if (loaded) return;
    loaded = true;
    setStatus("Chargement des dernières vidéos Facebook.");

    try {
      const response = await fetch(endpoint, {
        headers: { Accept: "application/json" },
        cache: "no-store"
      });
      if (!response.ok) throw new Error("social_feed_unavailable");
      const payload = await response.json();
      renderItems(payload.items);
    } catch {
      hideSection();
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
    }, { rootMargin: "500px 0px" });
    observer.observe(section);
  } else {
    load();
  }
})();
