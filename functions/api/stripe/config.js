const STRIPE_API_VERSION = "2026-08-26.dahlia";

const OFFERS = Object.freeze({
  programme: Object.freeze({ priceEnv: "PROGRAMME_PRICE_ID", mode: "subscription", label: "Programme", recurring: true, bankTransfer: false }),
  essentielle: Object.freeze({ priceEnv: "ESSENTIELLE_PRICE_ID", mode: "subscription", label: "Essentielle", recurring: true, bankTransfer: false }),
  performance: Object.freeze({ priceEnv: "PERFORMANCE_PRICE_ID", mode: "subscription", label: "Performance", recurring: true, bankTransfer: false }),
  bilan: Object.freeze({ priceEnv: "BILAN_INITIAL_PRICE_ID", mode: "payment", label: "Bilan initial à la carte", recurring: false, bankTransfer: true }),
  seance: Object.freeze({ priceEnv: "SEANCE_INDIVIDUELLE_PRICE_ID", mode: "payment", label: "Séance individuelle", recurring: false, bankTransfer: true }),
  pack5: Object.freeze({ priceEnv: "PACK_5_PRICE_ID", mode: "payment", label: "Pack 5 séances", recurring: false, bankTransfer: true }),
  pack10: Object.freeze({ priceEnv: "PACK_10_PRICE_ID", mode: "payment", label: "Pack 10 séances", recurring: false, bankTransfer: true })
});

export class StripeRequestError extends Error {
  constructor(message, status = 502, code = "stripe_error") {
    super(message);
    this.name = "StripeRequestError";
    this.status = status;
    this.code = code;
  }
}

export function jsonResponse(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      ...extraHeaders
    }
  });
}

export function methodNotAllowed(allowed) {
  return jsonResponse({ error: "Méthode non autorisée." }, 405, { Allow: allowed });
}

function assertPreviewSandbox(env) {
  if (env.CF_PAGES_BRANCH === "main" || env.CF_PAGES_BRANCH === "master") {
    throw new StripeRequestError("Le paiement sandbox est désactivé sur la branche de production.", 403, "preview_only");
  }

  const secretPrefix = ["sk", "test"].join("_") + "_";
  if (env.STRIPE_SECRET_KEY && !env.STRIPE_SECRET_KEY.startsWith(secretPrefix)) {
    throw new StripeRequestError("Seules les clés Stripe sandbox sont autorisées.", 403, "sandbox_only");
  }
}

export function getOffer(env, offerKey) {
  const definition = OFFERS[offerKey];
  if (!definition) return null;

  const priceId = env[definition.priceEnv];
  if (!priceId) {
    throw new StripeRequestError("Configuration Stripe incomplète.", 500, "configuration_error");
  }

  return { key: offerKey, ...definition, priceId };
}

export function isValidSessionId(value) {
  return typeof value === "string" && /^cs_(?:test_|live_)?[A-Za-z0-9]{8,240}$/.test(value);
}

export function isValidEmail(value) {
  if (typeof value !== "string" || value.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
}

export async function readJson(request) {
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new StripeRequestError("Le corps de la requête doit être au format JSON.", 415, "invalid_content_type");
  }

  try {
    return await request.json();
  } catch {
    throw new StripeRequestError("Corps JSON invalide.", 400, "invalid_json");
  }
}

export async function stripeRequest(env, path, { method = "GET", params } = {}) {
  if (!env.STRIPE_SECRET_KEY) {
    throw new StripeRequestError("Configuration Stripe incomplète.", 500, "configuration_error");
  }

  assertPreviewSandbox(env);

  const headers = {
    Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
    "Stripe-Version": STRIPE_API_VERSION
  };

  const init = { method, headers };
  if (params) {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
    init.body = params.toString();
  }

  const response = await fetch(`https://api.stripe.com${path}`, init);
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new StripeRequestError(
      payload?.error?.message || "Stripe n’a pas pu traiter la demande.",
      response.status,
      payload?.error?.code || "stripe_error"
    );
  }

  return payload;
}

export async function onRequest({ request, env }) {
  if (request.method !== "GET") return methodNotAllowed("GET");
  try {
    assertPreviewSandbox(env);
  } catch (error) {
    return jsonResponse({ error: error.message }, error.status || 403);
  }
  if (!env.STRIPE_PUBLISHABLE_KEY) {
    return jsonResponse({ error: "Configuration Stripe incomplète." }, 500);
  }

  const publishablePrefix = ["pk", "test"].join("_") + "_";
  if (!env.STRIPE_PUBLISHABLE_KEY.startsWith(publishablePrefix)) {
    return jsonResponse({ error: "Seules les clés Stripe sandbox sont autorisées." }, 403);
  }

  return jsonResponse({ publishableKey: env.STRIPE_PUBLISHABLE_KEY });
}
