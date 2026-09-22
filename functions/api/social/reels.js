const GRAPH_API_VERSION = "v26.0";
const FRESH_TTL_MS = 30 * 60 * 1000;
const STALE_TTL_SECONDS = 24 * 60 * 60;
const META_TIMEOUT_MS = 8000;

class MetaRequestError extends Error {
  constructor(stage, code = null) {
    super(stage);
    this.stage = stage;
    this.code = code;
  }
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": status === 200
        ? "public, max-age=120, s-maxage=1800, stale-while-revalidate=86400"
        : "no-store",
      "X-Content-Type-Options": "nosniff"
    }
  });
}

function normalizeFacebookUrl(value) {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value, "https://www.facebook.com");
    if (url.protocol !== "https:" || !/(^|\.)facebook\.com$/i.test(url.hostname)) return null;
    return url.href;
  } catch {
    return null;
  }
}

function isVideoAttachment(attachment) {
  if (!attachment || typeof attachment !== "object") return false;
  const mediaType = String(attachment.media_type || "").toLowerCase();
  const type = String(attachment.type || "").toLowerCase();
  return mediaType.includes("video") || type.includes("video") || type.includes("reel");
}

function normalizeVideoPost(post) {
  if (!post || typeof post !== "object" || !post.id) return null;

  const attachments = Array.isArray(post?.attachments?.data) ? post.attachments.data : [];
  const videoAttachment = attachments.find(isVideoAttachment) || null;

  const candidates = [
    post.permalink_url,
    videoAttachment?.url,
    videoAttachment?.target?.url
  ];

  const permalink = candidates.map(normalizeFacebookUrl).find(Boolean);
  if (!permalink) return null;

  const looksLikeVideoUrl = /\/reel(?:s)?\//i.test(permalink) || /\/videos?\//i.test(permalink);
  if (!looksLikeVideoUrl && !videoAttachment) return null;

  return {
    id: String(post.id),
    platform: "facebook",
    type: /\/reel(?:s)?\//i.test(permalink) ? "reel" : "video",
    permalink,
    publishedAt: typeof post.created_time === "string" ? post.created_time : null
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

function cacheKeyFor(request) {
  const url = new URL(request.url);
  url.pathname = "/api/social/reels";
  url.search = "?source=facebook-v3";
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
  await cache.put(key, new Response(JSON.stringify(payload), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": `public, max-age=${STALE_TTL_SECONDS}`
    }
  }));
}

async function metaGet(url, stage) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), META_TIMEOUT_MS);
  try {
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal
    });

    let payload = null;
    try {
      payload = await response.json();
    } catch {
      throw new MetaRequestError(stage);
    }

    if (!response.ok || payload?.error) {
      throw new MetaRequestError(stage, payload?.error?.code ?? null);
    }

    return payload;
  } catch (error) {
    if (error instanceof MetaRequestError) throw error;
    throw new MetaRequestError(stage);
  } finally {
    clearTimeout(timeout);
  }
}

async function resolvePage(systemUserToken, preferredPageId) {
  const url = new URL(`https://graph.facebook.com/${GRAPH_API_VERSION}/me/accounts`);
  url.searchParams.set("fields", "id,name,access_token,tasks");
  url.searchParams.set("limit", "100");
  url.searchParams.set("access_token", systemUserToken);

  const payload = await metaGet(url, "page_lookup_failed");
  const pages = Array.isArray(payload?.data) ? payload.data : [];

  if (!pages.length) {
    throw new MetaRequestError("no_assigned_page");
  }

  let page = null;

  if (preferredPageId) {
    page = pages.find((item) => String(item?.id) === String(preferredPageId)) || null;
  }

  if (!page && pages.length === 1) {
    page = pages[0];
  }

  if (!page) {
    page = pages.find((item) =>
      typeof item?.name === "string" &&
      /maxime|alta|coach sportif/i.test(item.name)
    ) || null;
  }

  if (!page?.id) {
    throw new MetaRequestError("page_not_resolved");
  }

  if (typeof page.access_token !== "string" || !page.access_token.trim()) {
    throw new MetaRequestError("page_token_missing");
  }

  return {
    id: String(page.id),
    name: typeof page.name === "string" ? page.name : null,
    token: page.access_token.trim()
  };
}

async function fetchPageVideos(page) {
  const url = new URL(`https://graph.facebook.com/${GRAPH_API_VERSION}/${page.id}/posts`);
  url.searchParams.set(
    "fields",
    "id,created_time,permalink_url,attachments{media_type,type,url,target}"
  );
  url.searchParams.set("limit", "100");
  url.searchParams.set("access_token", page.token);

  const payload = await metaGet(url, "page_posts_failed");
  const posts = Array.isArray(payload?.data) ? payload.data : [];

  const items = sortNewestFirst(
    posts.map(normalizeVideoPost).filter(Boolean)
  ).slice(0, 6);

  return { items, postsChecked: posts.length };
}

export async function onRequest({ request, env, waitUntil }) {
  if (request.method !== "GET") {
    return new Response(null, { status: 405, headers: { Allow: "GET" } });
  }

  const systemUserToken = [
    env.META_SYSTEM_USER_TOKEN,
    env.META_PAGE_ACCESS_TOKEN
  ].find((value) => typeof value === "string" && value.trim())?.trim() || "";

  const preferredPageId =
    typeof env.FACEBOOK_PAGE_ID === "string" && /^\d{5,30}$/.test(env.FACEBOOK_PAGE_ID.trim())
      ? env.FACEBOOK_PAGE_ID.trim()
      : "";

  if (!systemUserToken) {
    return jsonResponse({
      items: [],
      source: "facebook",
      status: "not_configured"
    });
  }

  const cache = getCache();
  const cacheKey = cacheKeyFor(request);
  const cached = await readCached(cache, cacheKey);
  const cachedAt = Date.parse(cached?.cachedAt || "") || 0;

  if (cached?.items?.length && Date.now() - cachedAt < FRESH_TTL_MS) {
    return jsonResponse({ ...cached, status: "fresh_cache" });
  }

  try {
    const page = await resolvePage(systemUserToken, preferredPageId);
    const result = await fetchPageVideos(page);

    const payload = {
      items: result.items,
      source: "facebook",
      page: {
        id: page.id,
        name: page.name
      },
      postsChecked: result.postsChecked,
      cachedAt: new Date().toISOString(),
      status: result.items.length ? "live" : "empty"
    };

    const cacheWrite = writeCached(cache, cacheKey, payload);
    if (typeof waitUntil === "function") waitUntil(cacheWrite);
    else await cacheWrite;

    return jsonResponse(payload);
  } catch (error) {
    if (cached?.items?.length) {
      return jsonResponse({ ...cached, status: "stale_cache" });
    }

    return jsonResponse({
      items: [],
      source: "facebook",
      status: "unavailable",
      reason: error instanceof MetaRequestError ? error.stage : "unknown",
      metaCode: error instanceof MetaRequestError ? error.code : null
    });
  }
}
