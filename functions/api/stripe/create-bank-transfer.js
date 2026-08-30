import {
  StripeRequestError,
  getStripeEnvironment,
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
    const environment = getStripeEnvironment(env);

    if (!offer) return jsonResponse({ error: "Offre inconnue." }, 400);
    if (!offer.bankTransfer || offer.recurring) {
      return jsonResponse({ error: "Le virement bancaire n’est pas disponible pour cette offre." }, 400);
    }
    if (!isValidEmail(body?.email)) {
      return jsonResponse({ error: "Saisissez une adresse e-mail valide." }, 400);
    }

    const customerParams = new URLSearchParams();
    customerParams.set("email", body.email.trim().toLowerCase());
    customerParams.set("metadata[source]", environment === "live" ? "alta_payment_live" : "alta_payment_sandbox");
    const customer = await stripeRequest(env, "/v1/customers", { method: "POST", params: customerParams });

    const origin = new URL(request.url).origin;
    const sessionParams = new URLSearchParams();
    sessionParams.set("mode", "payment");
    sessionParams.set("customer", customer.id);
    sessionParams.set("line_items[0][price]", offer.priceId);
    sessionParams.set("line_items[0][quantity]", "1");
    sessionParams.set("payment_method_types[0]", "customer_balance");
    sessionParams.set("payment_method_options[customer_balance][funding_type]", "bank_transfer");
    sessionParams.set("payment_method_options[customer_balance][bank_transfer][type]", "eu_bank_transfer");
    sessionParams.set("payment_method_options[customer_balance][bank_transfer][eu_bank_transfer][country]", "FR");
    sessionParams.set("success_url", `${origin}/paiement/retour/?session_id={CHECKOUT_SESSION_ID}`);
    sessionParams.set("cancel_url", `${origin}/paiement/?offre=${encodeURIComponent(offer.key)}`);
    sessionParams.set("metadata[offer_key]", offer.key);
    sessionParams.set("metadata[payment_flow]", "bank_transfer");
    sessionParams.set("payment_intent_data[metadata][offer_key]", offer.key);
    sessionParams.set("payment_intent_data[metadata][payment_flow]", "bank_transfer");
    sessionParams.set("locale", "fr");

    const session = await stripeRequest(env, "/v1/checkout/sessions", { method: "POST", params: sessionParams });
    if (!session.url) throw new StripeRequestError("Le virement bancaire n’est pas disponible actuellement.", 503);

    return jsonResponse({ url: session.url });
  } catch (error) {
    const status = error instanceof StripeRequestError && error.status < 500 ? error.status : 503;
    const message = status < 500 ? error.message : "Le virement bancaire n’est pas disponible actuellement.";
    return jsonResponse({ error: message }, status);
  }
}
