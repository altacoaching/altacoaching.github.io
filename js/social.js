(() => {
  const section = document.querySelector("[data-social-feed]");
  if (!section) return;

  const endpoint = "/api/social/reels";
  const track = section.querySelector("[data-social-track]");
  const status = section.querySelector("[data-social-status]");
  const prev = section.querySelector("[data-social-prev]");
  const next = section.querySelector("[data-social-next]");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let loaded = false;

  const safeFacebookPermalink = (value) => {
    if (typeof value !== "string" || !value.trim()) return null;
    try {
      const url = new URL(value, "https://www.facebook.com");
      if (url.protocol !== "https:" || !/(^|\.)facebook\.com$/i.test(url.hostname)) return null;
      return url.href;
    } catch {
      return null;
    }
  };

  const setStatus = (message) => {
    if (status) status.textContent = message;
  };

  const hideSection = () => {
    section.hidden = true;
    setStatus("Les Reels Facebook ne sont pas disponibles pour le moment.");
  };

  const playerUrl = (permalink) => {
    const url = new URL("https://www.facebook.com/plugins/video.php");
    url.searchParams.set("href", permalink);
    url.searchParams.set("show_text", "false");
    url.searchParams.set("width", "430");
    url.searchParams.set("autoplay", "false");
    return url.href;
  };

  const createReel = (item) => {
    const permalink = safeFacebookPermalink(item?.permalink);
    if (!permalink) return null;

    const article = document.createElement("article");
    article.className = "social-reel";

    const player = document.createElement("div");
    player.className = "social-reel-player";
    player.dataset.embedSrc = playerUrl(permalink);

    const iframe = document.createElement("iframe");
    iframe.title = "Reel Facebook ALTA Coaching";
    iframe.loading = "lazy";
    iframe.scrolling = "no";
    iframe.allow = "autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share";
    iframe.allowFullscreen = true;
    iframe.referrerPolicy = "strict-origin-when-cross-origin";
    player.appendChild(iframe);
    article.appendChild(player);
    return article;
  };

  const activatePlayers = () => {
    const players = [...section.querySelectorAll(".social-reel-player[data-embed-src]")];
    if (!players.length) return;

    const loadPlayer = (player) => {
      const iframe = player.querySelector("iframe");
      if (!iframe || iframe.src) return;
      iframe.src = player.dataset.embedSrc;
    };

    if (!("IntersectionObserver" in window)) {
      players.forEach(loadPlayer);
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        loadPlayer(entry.target);
        observer.unobserve(entry.target);
      });
    }, { root: track, rootMargin: "0px 80% 0px 80%", threshold: .01 });
    players.forEach((player) => observer.observe(player));
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
    setStatus(`${reels.length} Reels Facebook chargés.`);
    activatePlayers();
    requestAnimationFrame(updateControls);
  };

  const load = async () => {
    if (loaded) return;
    loaded = true;
    setStatus("Chargement des derniers Reels Facebook.");
    try {
      const response = await fetch(endpoint, {
        headers: { Accept: "application/json" },
        cache: "no-cache"
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
    }, { rootMargin: "600px 0px" });
    observer.observe(section);
  } else {
    load();
  }
})();
