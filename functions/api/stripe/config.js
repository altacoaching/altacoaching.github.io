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

export function getStripeEnvironment(env) {
  const branch = typeof env.CF_PAGES_BRANCH === "string" ? env.CF_PAGES_BRANCH.trim() : "";
  if (!branch) {
    throw new StripeRequestError("Configuration Stripe incomplète.", 500, "configuration_error");
  }
  return branch === "main" || branch === "master" ? "live" : "test";
}

export function assertStripeEnvironment(env) {
  const environment = getStripeEnvironment(env);
  const secretPrefix = environment === "live" ? ["sk", "live"].join("_") + "_" : ["sk", "test"].join("_") + "_";
  const publishablePrefix = environment === "live" ? ["pk", "live"].join("_") + "_" : ["pk", "test"].join("_") + "_";

  if (
    typeof env.STRIPE_SECRET_KEY !== "string" ||
    !env.STRIPE_SECRET_KEY.startsWith(secretPrefix) ||
    typeof env.STRIPE_PUBLISHABLE_KEY !== "string" ||
    !env.STRIPE_PUBLISHABLE_KEY.startsWith(publishablePrefix)
  ) {
    throw new StripeRequestError("Configuration Stripe incohérente avec l’environnement.", 500, "configuration_error");
  }

  return environment;
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
  assertStripeEnvironment(env);

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
  let environment;
  try {
    environment = assertStripeEnvironment(env);
  } catch (error) {
    return jsonResponse({ error: "Configuration Stripe incomplète." }, error.status || 500);
  }

  return jsonResponse({ publishableKey: env.STRIPE_PUBLISHABLE_KEY, environment });
}
