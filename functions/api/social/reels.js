const GRAPH_API_VERSION = "v26.0";
const DEFAULT_PAGE_ID = "61591944164231";
const FACEBOOK_PAGE_URL = "https://www.facebook.com/profile.php?id=61591944164231";
const FRESH_TTL_MS = 30 * 60 * 1000;
const STALE_TTL_SECONDS = 24 * 60 * 60;
const META_TIMEOUT_MS = 7000;
const META_FIELDS = "id,created_time,description,name,picture,embed_html";

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": status === 200
        ? "public, max-age=300, s-maxage=1800, stale-while-revalidate=86400"
        : "no-store",
      "X-Content-Type-Options": "nosniff"
    }
  });
}

function normalizePageId(value) {
  const candidate = typeof value === "string" && value.trim() ? value.trim() : DEFAULT_PAGE_ID;
  return /^\d{5,30}$/.test(candidate) ? candidate : DEFAULT_PAGE_ID;
}

function decodeHtmlUrl(value) {
  return String(value || "").replaceAll("&amp;", "&").replaceAll("&#x3D;", "=").replaceAll("&#61;", "=");
}

function isFacebookUrl(value) {
  if (typeof value !== "string" || !value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && /(^|\.)facebook\.com$/i.test(url.hostname);
  } catch {
    return false;
  }
}

function permalinkFromOfficialEmbed(embedHtml) {
  if (typeof embedHtml !== "string" || !embedHtml) return null;
  const attrMatches = [...embedHtml.matchAll(/(?:href|src)=["']([^"']+)["']/gi)];
  for (const match of attrMatches) {
    const candidate = decodeHtmlUrl(match[1]);
    if (!isFacebookUrl(candidate)) continue;
    try {
      const url = new URL(candidate);
      const nested = url.searchParams.get("href");
      if (nested && isFacebookUrl(nested)) return nested;
      if (!url.pathname.startsWith("/plugins/")) return url.href;
    } catch {
      // Ignore malformed values returned inside embed HTML.
    }
  }
  return null;
}

function normalizeReel(video) {
  if (!video || typeof video !== "object" || !video.id) return null;
  const publishedAt = typeof video.created_time === "string" ? video.created_time : null;
  const titleOrCaption = [video.description, video.name].find((value) => typeof value === "string" && value.trim()) || null;
  const thumbnail = typeof video.picture === "string" && /^https:\/\//i.test(video.picture) ? video.picture : null;
  const permalink = permalinkFromOfficialEmbed(video.embed_html);

  return {
    id: String(video.id),
    platform: "facebook",
    type: "reel",
    permalink,
    publishedAt,
    titleOrCaption,
    thumbnail,
    embedData: null
  };
}

function sortNewestFirst(items) {
  return items.sort((a, b) => {
    const aTime = Date.parse(a.publishedAt || "") || 0;
    const bTime = Date.parse(b.publishedAt || "") || 0;
    return bTime - aTime;
  });
}

function getCache() {
  return typeof caches !== "undefined" && caches.default ? caches.default : null;
}

function cacheKeyFor(request, pageId) {
  const url = new URL(request.url);
  url.pathname = "/api/social/reels";
  url.search = `?source=facebook-v1&page=${encodeURIComponent(pageId)}`;
  return new Request(url.toString(), { method: "GET" });
}

async function readCached(cache, key) {
  if (!cache) return null;
  const response = await cache.match(key);
  if (!response) return null;
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function writeCached(cache, key, payload) {
  if (!cache) return;
  const response = new Response(JSON.stringify(payload), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": `public, max-age=${STALE_TTL_SECONDS}`
    }
  });
  await cache.put(key, response);
}

async function fetchMetaReels(pageId, token) {
  const url = new URL(`https://graph.facebook.com/${GRAPH_API_VERSION}/${pageId}/video_reels`);
  url.searchParams.set("fields", META_FIELDS);
  url.searchParams.set("limit", "12");
  url.searchParams.set("access_token", token);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), META_TIMEOUT_MS);
  try {
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal
    });
    if (!response.ok) throw new Error("meta_request_failed");
    const payload = await response.json();
    const source = Array.isArray(payload?.data) ? payload.data : [];
    const items = sortNewestFirst(source.map(normalizeReel).filter(Boolean)).slice(0, 6);
    return items;
  } finally {
    clearTimeout(timeout);
  }
}

export async function onRequest({ request, env, waitUntil }) {
  if (request.method !== "GET") {
    return new Response(null, { status: 405, headers: { Allow: "GET" } });
  }

  const token = typeof env.META_PAGE_ACCESS_TOKEN === "string" ? env.META_PAGE_ACCESS_TOKEN.trim() : "";
  const pageId = normalizePageId(env.FACEBOOK_PAGE_ID);

  if (!token) {
    return jsonResponse({
      items: [],
      source: "facebook",
      pageUrl: FACEBOOK_PAGE_URL,
      status: "not_configured"
    });
  }

  const cache = getCache();
  const cacheKey = cacheKeyFor(request, pageId);
  const cached = await readCached(cache, cacheKey);
  const cachedAt = Date.parse(cached?.cachedAt || "") || 0;

  if (cached?.items && Date.now() - cachedAt < FRESH_TTL_MS) {
    return jsonResponse({ ...cached, status: "fresh_cache" });
  }

  try {
    const items = await fetchMetaReels(pageId, token);
    const payload = {
      items,
      source: "facebook",
      pageUrl: FACEBOOK_PAGE_URL,
      cachedAt: new Date().toISOString(),
      status: items.length ? "live" : "empty"
    };
    const cacheWrite = writeCached(cache, cacheKey, payload);
    if (typeof waitUntil === "function") waitUntil(cacheWrite);
    else await cacheWrite;
    return jsonResponse(payload);
  } catch {
    if (cached?.items?.length) {
      return jsonResponse({ ...cached, status: "stale_cache" });
    }
    return jsonResponse({
      items: [],
      source: "facebook",
      pageUrl: FACEBOOK_PAGE_URL,
      status: "unavailable"
    });
  }
}
