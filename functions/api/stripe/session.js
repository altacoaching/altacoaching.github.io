import {
  StripeRequestError,
  isValidSessionId,
  jsonResponse,
  methodNotAllowed,
  stripeRequest
} from "./config.js";

export async function onRequest({ request, env }) {
  if (request.method !== "GET") return methodNotAllowed("GET");

  const sessionId = new URL(request.url).searchParams.get("session_id");
  if (!isValidSessionId(sessionId)) {
    return jsonResponse({ error: "Identifiant de session invalide." }, 400);
  }

  try {
    const session = await stripeRequest(env, `/v1/checkout/sessions/${encodeURIComponent(sessionId)}`);
    const isPendingBankTransfer =
      session.metadata?.payment_flow === "bank_transfer" &&
      session.status === "complete" &&
      session.payment_status !== "paid";

    return jsonResponse({
      id: session.id,
      status: isPendingBankTransfer ? "bank_transfer_pending" : session.status,
      paymentStatus: session.payment_status,
      mode: session.mode,
      customerEmail: session.customer_details?.email || session.customer_email || null,
      offerKey: session.metadata?.offer_key || null
    });
  } catch (error) {
    const status = error instanceof StripeRequestError && error.status === 404 ? 404 : 502;
    const message = status === 404 ? "Session de paiement introuvable." : "Impossible de vérifier le paiement actuellement.";
    return jsonResponse({ error: message }, status);
  }
}
