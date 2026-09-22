const GRAPH_API_VERSION = "v26.0";
const FRESH_TTL_MS = 10 * 60 * 1000;
const STALE_TTL_SECONDS = 30 * 60;
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
        ? "public, max-age=60, s-maxage=600, stale-while-revalidate=1800"
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

function normalizeHttpsUrl(value) {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

function normalizeVideoSource(value) {
  const url = normalizeHttpsUrl(value);
  if (!url) return null;
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    if (
      host === "facebook.com" ||
      host.endsWith(".facebook.com") ||
      host === "fbcdn.net" ||
      host.endsWith(".fbcdn.net")
    ) {
      return parsed.href;
    }
  } catch {
    // no-op
  }
  return null;
}

function isVideoAttachment(attachment) {
  if (!attachment || typeof attachment !== "object") return false;
  const mediaType = String(attachment.media_type || "").toLowerCase();
  const type = String(attachment.type || "").toLowerCase();
  return mediaType.includes("video") || type.includes("video") || type.includes("reel");
}

function videoAttachmentFor(post) {
  const attachments = Array.isArray(post?.attachments?.data) ? post.attachments.data : [];
  return attachments.find(isVideoAttachment) || null;
}

function looksLikeVideoPost(post) {
  if (videoAttachmentFor(post)) return true;
  const permalink = normalizeFacebookUrl(post?.permalink_url);
  return Boolean(permalink && (/\/reel(?:s)?\//i.test(permalink) || /\/videos?\//i.test(permalink)));
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
  url.search = "?source=facebook-v4";
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
  if (!pages.length) throw new MetaRequestError("no_assigned_page");

  let page = null;
  if (preferredPageId) {
    page = pages.find((item) => String(item?.id) === String(preferredPageId)) || null;
  }
  if (!page && pages.length === 1) page = pages[0];
  if (!page) {
    page = pages.find((item) =>
      typeof item?.name === "string" && /maxime|alta|coach sportif/i.test(item.name)
    ) || null;
  }

  if (!page?.id) throw new MetaRequestError("page_not_resolved");
  if (typeof page.access_token !== "string" || !page.access_token.trim()) {
    throw new MetaRequestError("page_token_missing");
  }

  return {
    id: String(page.id),
    name: typeof page.name === "string" ? page.name : null,
    token: page.access_token.trim()
  };
}

async function fetchCandidatePosts(page) {
  const url = new URL(`https://graph.facebook.com/${GRAPH_API_VERSION}/${page.id}/posts`);
  url.searchParams.set(
    "fields",
    "id,created_time,permalink_url,full_picture,attachments{media_type,type,url,target{id,url}}"
  );
  url.searchParams.set("limit", "30");
  url.searchParams.set("access_token", page.token);

  const payload = await metaGet(url, "page_posts_failed");
  const posts = Array.isArray(payload?.data) ? payload.data : [];
  return posts.filter(looksLikeVideoPost);
}

async function getObjectIdFromPost(postId, pageToken) {
  const url = new URL(`https://graph.facebook.com/${GRAPH_API_VERSION}/${postId}`);
  url.searchParams.set("fields", "object_id");
  url.searchParams.set("access_token", pageToken);
  try {
    const payload = await metaGet(url, "post_object_lookup_failed");
    return payload?.object_id ? String(payload.object_id) : null;
  } catch {
    return null;
  }
}

async function fetchVideoObject(videoId, pageToken) {
  if (!videoId) return null;
  const url = new URL(`https://graph.facebook.com/${GRAPH_API_VERSION}/${videoId}`);
  url.searchParams.set("fields", "id,source,picture,created_time");
  url.searchParams.set("access_token", pageToken);
  try {
    return await metaGet(url, "video_source_failed");
  } catch {
    return null;
  }
}

async function resolvePlayableItem(post, page) {
  const attachment = videoAttachmentFor(post);
  let videoId = attachment?.target?.id ? String(attachment.target.id) : null;
  let video = videoId ? await fetchVideoObject(videoId, page.token) : null;

  if (!normalizeVideoSource(video?.source)) {
    const objectId = await getObjectIdFromPost(post.id, page.token);
    if (objectId && objectId !== videoId) {
      videoId = objectId;
      video = await fetchVideoObject(videoId, page.token);
    }
  }

  const videoUrl = normalizeVideoSource(video?.source);
  if (!videoUrl) return null;

  const permalink =
    normalizeFacebookUrl(post.permalink_url) ||
    normalizeFacebookUrl(attachment?.url) ||
    normalizeFacebookUrl(attachment?.target?.url);

  const poster =
    normalizeHttpsUrl(video?.picture) ||
    normalizeHttpsUrl(post.full_picture);

  return {
    id: String(post.id),
    platform: "facebook",
    type: permalink && /\/reel(?:s)?\//i.test(permalink) ? "reel" : "video",
    permalink,
    videoUrl,
    poster,
    publishedAt:
      typeof post.created_time === "string"
        ? post.created_time
        : (typeof video?.created_time === "string" ? video.created_time : null)
  };
}

async function fetchPageVideos(page) {
  const candidates = await fetchCandidatePosts(page);
  const items = [];

  for (const post of candidates) {
    if (items.length >= 6) break;
    const item = await resolvePlayableItem(post, page);
    if (item) items.push(item);
  }

  return {
    items: sortNewestFirst(items).slice(0, 6),
    postsChecked: candidates.length
  };
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
    return jsonResponse({ items: [], source: "facebook", status: "not_configured" });
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
      page: { id: page.id, name: page.name },
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
