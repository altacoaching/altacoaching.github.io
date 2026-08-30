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
    params.set("ui_mode", "elements");
    params.set("mode", offer.mode);
    params.set("line_items[0][price]", offer.priceId);
    params.set("line_items[0][quantity]", "1");
    params.set("return_url", `${origin}/paiement/retour/?session_id={CHECKOUT_SESSION_ID}`);
    params.set("metadata[offer_key]", offer.key);
    params.set("locale", "fr");

    if (offer.mode === "subscription") {
      params.set("subscription_data[metadata][offer_key]", offer.key);
    } else {
      params.set("payment_intent_data[metadata][offer_key]", offer.key);
    }

    const session = await stripeRequest(env, "/v1/checkout/sessions", { method: "POST", params });

    return jsonResponse({
      clientSecret: session.client_secret,
      offer: {
        key: offer.key,
        label: offer.label,
        amount: session.amount_total,
        currency: session.currency || "eur",
        recurring: offer.recurring
      }
    });
  } catch (error) {
    const status = error instanceof StripeRequestError ? error.status : 500;
    const message = status >= 500 ? "Le paiement sécurisé est temporairement indisponible." : error.message;
    return jsonResponse({ error: message }, status);
  }
}
