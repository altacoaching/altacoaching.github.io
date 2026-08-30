import {
  StripeRequestError,
  getOffer,
  isValidEmail,
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
    if (offer.recurring) {
      return jsonResponse({ error: "Klarna n’est pas disponible pour cette offre." }, 400);
    }
    if (!isValidEmail(body?.email)) {
      return jsonResponse({ error: "Renseignez une adresse e-mail valide pour continuer." }, 400);
    }

    const origin = new URL(request.url).origin;
    const params = new URLSearchParams();
    params.set("mode", "payment");
    params.set("line_items[0][price]", offer.priceId);
    params.set("line_items[0][quantity]", "1");
    params.set("payment_method_types[0]", "klarna");
    params.set("customer_email", body.email.trim().toLowerCase());
    params.set("success_url", `${origin}/paiement/retour/?session_id={CHECKOUT_SESSION_ID}`);
    params.set("cancel_url", `${origin}/paiement/?offre=${encodeURIComponent(offer.key)}`);
    params.set("metadata[offer_key]", offer.key);
    params.set("metadata[payment_flow]", "klarna");
    params.set("payment_intent_data[metadata][offer_key]", offer.key);
    params.set("payment_intent_data[metadata][payment_flow]", "klarna");
    params.set("locale", "fr");

    const session = await stripeRequest(env, "/v1/checkout/sessions", { method: "POST", params });
    if (!session.url) throw new StripeRequestError("Klarna n’est pas disponible actuellement.", 503);

    return jsonResponse({ url: session.url });
  } catch (error) {
    const safeClientErrors = new Set(["invalid_content_type", "invalid_json", "preview_only", "sandbox_only"]);
    if (error instanceof StripeRequestError && safeClientErrors.has(error.code)) {
      return jsonResponse({ error: error.message }, error.status);
    }
    return jsonResponse({ error: "Klarna n’est pas disponible actuellement." }, 503);
  }
}
