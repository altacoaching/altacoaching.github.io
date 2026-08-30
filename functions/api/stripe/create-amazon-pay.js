import {
  StripeRequestError,
  getOffer,
  jsonResponse,
  methodNotAllowed,
  readJson,
  stripeRequest
} from "./config.js";

export async function onRequest({ request, env }) {
  if (request.method !== "POST") return methodNotAllowed("POST");

  try {
    const body = await readJson(request);
    const offer = getOffer(env, body?.offerKey);
    if (!offer) return jsonResponse({ error: "Offre inconnue." }, 400);

    const origin = new URL(request.url).origin;
    const params = new URLSearchParams();
    params.set("mode", offer.mode);
    params.set("line_items[0][price]", offer.priceId);
    params.set("line_items[0][quantity]", "1");
    params.set("payment_method_types[0]", "amazon_pay");
    params.set("success_url", `${origin}/paiement/retour/?session_id={CHECKOUT_SESSION_ID}`);
    params.set("cancel_url", `${origin}/paiement/?offre=${encodeURIComponent(offer.key)}`);
    params.set("metadata[offer_key]", offer.key);
    params.set("metadata[payment_flow]", "amazon_pay");
    params.set("locale", "fr");

    if (offer.mode === "subscription") {
      params.set("subscription_data[metadata][offer_key]", offer.key);
      params.set("subscription_data[metadata][payment_flow]", "amazon_pay");
    } else {
      params.set("payment_intent_data[metadata][offer_key]", offer.key);
      params.set("payment_intent_data[metadata][payment_flow]", "amazon_pay");
    }

    const session = await stripeRequest(env, "/v1/checkout/sessions", { method: "POST", params });
    if (!session.url) throw new StripeRequestError("Amazon Pay n’est pas disponible actuellement.", 503);

    return jsonResponse({ url: session.url });
  } catch (error) {
    const safeClientErrors = new Set(["invalid_content_type", "invalid_json", "preview_only", "sandbox_only"]);
    if (error instanceof StripeRequestError && safeClientErrors.has(error.code)) {
      return jsonResponse({ error: error.message }, error.status);
    }
    return jsonResponse({ error: "Amazon Pay n’est pas disponible actuellement." }, 503);
  }
}
