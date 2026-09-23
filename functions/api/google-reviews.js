const GOOGLE_PLACES_ENDPOINT = "https://places.googleapis.com/v1/places";
const REQUEST_TIMEOUT_MS = 7000;
const FIELD_MASK = "displayName,rating,userRatingCount,googleMapsUri,reviews";

// Cost guard. These are deliberately below Google's current 1,000/month
// free-usage cap for Place Details Enterprise + Atmosphere.
const DAILY_GOOGLE_CALL_LIMIT = 25;
const MONTHLY_GOOGLE_CALL_LIMIT = 750;
const BILLING_TIME_ZONE = "America/Los_Angeles"; // Google Maps free usage resets on Pacific time.
const GUARD_BINDING = "REVIEWS_GUARD";
// Public Place ID verified for the ALTA Coaching Google Maps listing.
// Keeping it as a server-side fallback removes one deployment variable without exposing a secret.
const DEFAULT_PLACE_ID = "ChIJl71pI8UkAGARNqUt91qW4jc";

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "private, no-store, max-age=0",
      "Pragma": "no-cache",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex, nofollow, noarchive",
      ...extraHeaders
    }
  });
}

function getEnv(env, names) {
  for (const name of names) {
    const value = env?.[name];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function fallbackGoogleMapsUri(placeId) {
  if (!placeId) return null;
  const url = new URL("https://www.google.com/maps/search/");
  url.searchParams.set("api", "1");
  url.searchParams.set("query", "ALTA Coaching");
  url.searchParams.set("query_place_id", placeId);
  return url.toString();
}

function normalizeReview(review) {
  const text = review?.text?.text || review?.originalText?.text || "";
  const textLanguage = review?.text?.languageCode || "";
  const originalLanguage = review?.originalText?.languageCode || "";
  return {
    rating: Number(review?.rating) || 0,
    text,
    originalText: review?.originalText?.text || "",
    relativePublishTimeDescription: review?.relativePublishTimeDescription || null,
    visitDate: review?.visitDate || null,
    googleMapsUri: review?.googleMapsUri || null,
    flagContentUri: review?.flagContentUri || null,
    translated: Boolean(textLanguage && originalLanguage && textLanguage !== originalLanguage),
    author: {
      displayName: review?.authorAttribution?.displayName || null,
      uri: review?.authorAttribution?.uri || null,
      photoUri: review?.authorAttribution?.photoUri || null
    }
  };
}

function billingKeys(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BILLING_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  const day = `${values.year}-${values.month}-${values.day}`;
  return { day, month: `${values.year}-${values.month}` };
}

async function consumeGoogleCallBudget(db) {
  if (!db || typeof db.prepare !== "function") {
    return { allowed: false, reason: "guard_not_configured" };
  }

  const { day, month } = billingKeys();
  const updatedAt = new Date().toISOString();

  // One atomic SQLite write. D1 serializes writes, so concurrent bot requests
  // cannot all read the same counter and slip past the cap.
  const statement = db.prepare(`
    INSERT INTO google_reviews_guard
      (id, day_key, day_count, month_key, month_count, updated_at)
    VALUES
      (1, ?1, 1, ?2, 1, ?3)
    ON CONFLICT(id) DO UPDATE SET
      day_count = CASE
        WHEN google_reviews_guard.day_key = excluded.day_key
          THEN google_reviews_guard.day_count + 1
        ELSE 1
      END,
      day_key = excluded.day_key,
      month_count = CASE
        WHEN google_reviews_guard.month_key = excluded.month_key
          THEN google_reviews_guard.month_count + 1
        ELSE 1
      END,
      month_key = excluded.month_key,
      updated_at = excluded.updated_at
    WHERE
      (CASE
        WHEN google_reviews_guard.day_key = excluded.day_key
          THEN google_reviews_guard.day_count
        ELSE 0
      END) < ?4
      AND
      (CASE
        WHEN google_reviews_guard.month_key = excluded.month_key
          THEN google_reviews_guard.month_count
        ELSE 0
      END) < ?5
    RETURNING day_count, month_count
  `).bind(day, month, updatedAt, DAILY_GOOGLE_CALL_LIMIT, MONTHLY_GOOGLE_CALL_LIMIT);

  const row = await statement.first();
  if (!row) return { allowed: false, reason: "limit_reached" };

  return {
    allowed: true,
    dayCount: Number(row.day_count) || 0,
    monthCount: Number(row.month_count) || 0
  };
}

export async function onRequest({ request, env }) {
  if (request.method !== "GET") {
    return new Response(null, { status: 405, headers: { Allow: "GET" } });
  }

  const apiKey = getEnv(env, ["GOOGLE_PLACES_API_KEY", "GOOGLE_MAPS_API_KEY", "GOOGLE_API_KEY", "GOOGLE_PLACES_KEY", "GOOGLE_REVIEWS_API_KEY", "GOOGLE_MAPS_KEY"]);
  const placeId = getEnv(env, ["GOOGLE_PLACE_ID", "ALTA_GOOGLE_PLACE_ID"]) || DEFAULT_PLACE_ID;
  const fallbackUri = fallbackGoogleMapsUri(placeId);

  // Safe health check: verifies bindings/configuration without calling Google
  // and therefore without consuming the protected Google request budget.
  const requestUrl = new URL(request.url);
  if (requestUrl.searchParams.get("health") === "1") {
    let guardReady = false;
    try {
      const db = env?.[GUARD_BINDING];
      if (db && typeof db.prepare === "function") {
        const row = await db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'google_reviews_guard'").first();
        guardReady = Boolean(row?.name);
      }
    } catch {}
    return json({
      status: apiKey && placeId && guardReady ? "ready" : "not_ready",
      apiKeyConfigured: Boolean(apiKey),
      placeIdConfigured: Boolean(placeId),
      guardConfigured: guardReady
    }, apiKey && placeId && guardReady ? 200 : 503);
  }

  if (!apiKey || !placeId) {
    return json({ status: "not_configured", fallbackGoogleMapsUri: fallbackUri }, 503);
  }

  // FAIL CLOSED: if D1 is absent, misconfigured, overloaded or unavailable,
  // Google is NOT contacted. This protects billing even during an attack.
  let guard;
  try {
    guard = await consumeGoogleCallBudget(env?.[GUARD_BINDING]);
  } catch {
    return json({ status: "guard_unavailable", fallbackGoogleMapsUri: fallbackUri }, 503);
  }

  if (!guard.allowed) {
    const status = guard.reason === "limit_reached" ? 429 : 503;
    return json(
      { status: guard.reason, fallbackGoogleMapsUri: fallbackUri },
      status,
      status === 429 ? { "Retry-After": "3600" } : {}
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const url = new URL(`${GOOGLE_PLACES_ENDPOINT}/${encodeURIComponent(placeId)}`);
  url.searchParams.set("languageCode", "fr");
  url.searchParams.set("regionCode", "FR");

  try {
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": FIELD_MASK
      },
      signal: controller.signal
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload) {
      console.error("ALTA Google Reviews upstream error", {
        httpStatus: response.status,
        googleStatus: payload?.error?.status || null
      });
      return json(
        {
          status: "google_unavailable",
          googleHttpStatus: response.status,
          googleErrorStatus: payload?.error?.status || null,
          fallbackGoogleMapsUri: fallbackUri
        },
        response.status >= 400 && response.status < 500 ? 502 : 503
      );
    }

    return json({
      status: "live",
      displayName: payload?.displayName?.text || "ALTA Coaching",
      rating: Number(payload?.rating) || null,
      userRatingCount: Number(payload?.userRatingCount) || 0,
      googleMapsUri: payload?.googleMapsUri || fallbackUri,
      fallbackGoogleMapsUri: fallbackUri,
      reviews: Array.isArray(payload?.reviews) ? payload.reviews.slice(0, 5).map(normalizeReview) : []
    });
  } catch {
    return json({ status: "unavailable", fallbackGoogleMapsUri: fallbackUri }, 503);
  } finally {
    clearTimeout(timeout);
  }
}
