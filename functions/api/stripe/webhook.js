import {
  StripeRequestError,
  getStripeEnvironment,
  jsonResponse,
  methodNotAllowed
} from "./config.js";

const SIGNATURE_TOLERANCE_SECONDS = 300;
const HANDLED_EVENTS = new Set([
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  "checkout.session.async_payment_failed",
  "payment_intent.partially_funded"
]);

function hexToBytes(value) {
  if (typeof value !== "string" || !/^[a-f0-9]{64}$/i.test(value)) return null;
  const bytes = new Uint8Array(value.length / 2);
  for (let index = 0; index < value.length; index += 2) {
    bytes[index / 2] = Number.parseInt(value.slice(index, index + 2), 16);
  }
  return bytes;
}

function constantTimeEqual(left, right) {
  if (!(left instanceof Uint8Array) || !(right instanceof Uint8Array) || left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left[index] ^ right[index];
  return difference === 0;
}

function parseSignatureHeader(header) {
  let timestamp = null;
  const signatures = [];

  for (const part of String(header || "").split(",")) {
    const separator = part.indexOf("=");
    if (separator < 1) continue;
    const key = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    if (key === "t" && /^\d+$/.test(value)) timestamp = Number(value);
    if (key === "v1") signatures.push(value);
  }

  return { timestamp, signatures };
}

export async function verifyStripeSignature(rawBody, signatureHeader, secret, nowSeconds = Math.floor(Date.now() / 1000)) {
  const { timestamp, signatures } = parseSignatureHeader(signatureHeader);
  if (!Number.isSafeInteger(timestamp) || signatures.length === 0) return false;
  if (Math.abs(nowSeconds - timestamp) > SIGNATURE_TOLERANCE_SECONDS) return false;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const expected = new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(`${timestamp}.${rawBody}`)));

  return signatures.some((signature) => {
    const received = hexToBytes(signature);
    return received ? constantTimeEqual(expected, received) : false;
  });
}

function minimalEventLog(event, status) {
  const object = event.data.object;
  const metadata = object.metadata || {};
  const log = {
    stripeEventId: event.id,
    type: event.type,
    objectId: object.id || null,
    offerKey: metadata.offer_key || null,
    paymentFlow: metadata.payment_flow || null,
    status
  };

  if (event.type === "payment_intent.partially_funded") {
    if (Number.isInteger(object.amount_remaining)) log.amountRemaining = object.amount_remaining;
    if (typeof object.currency === "string") log.currency = object.currency;
  }

  return log;
}

function getEventStatus(event) {
  const object = event.data.object;
  if (event.type === "checkout.session.completed") {
    if (object.metadata?.payment_flow === "bank_transfer" && object.payment_status !== "paid") {
      return "bank_transfer_pending";
    }
    return object.payment_status === "paid" ? "paid" : "completed";
  }
  if (event.type === "checkout.session.async_payment_succeeded") return "payment_succeeded";
  if (event.type === "checkout.session.async_payment_failed") return "payment_failed";
  return "partially_funded";
}

export async function onRequest({ request, env }) {
  if (request.method !== "POST") return methodNotAllowed("POST");
  if (typeof env.STRIPE_WEBHOOK_SECRET !== "string" || !env.STRIPE_WEBHOOK_SECRET) {
    return jsonResponse({ error: "configuration_error" }, 503);
  }

  let environment;
  try {
    environment = getStripeEnvironment(env);
  } catch (error) {
    const status = error instanceof StripeRequestError ? error.status : 500;
    return jsonResponse({ error: "configuration_error" }, status === 500 ? 503 : status);
  }

  const signatureHeader = request.headers.get("Stripe-Signature");
  if (!signatureHeader) return jsonResponse({ error: "invalid_signature" }, 400);

  const rawBody = await request.text();
  let signatureIsValid = false;
  try {
    signatureIsValid = await verifyStripeSignature(rawBody, signatureHeader, env.STRIPE_WEBHOOK_SECRET);
  } catch {
    signatureIsValid = false;
  }
  if (!signatureIsValid) return jsonResponse({ error: "invalid_signature" }, 400);

  let event;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return jsonResponse({ error: "invalid_event" }, 400);
  }

  if (!event?.id || !event?.type || !event?.data?.object) {
    return jsonResponse({ error: "invalid_event" }, 400);
  }
  if (event.livemode !== (environment === "live")) {
    return jsonResponse({ error: "environment_mismatch" }, 400);
  }
  if (!HANDLED_EVENTS.has(event.type)) {
    return jsonResponse({ received: true, ignored: true });
  }

  const status = getEventStatus(event);
  const log = minimalEventLog(event, status);
  if (status === "payment_failed") console.warn("Stripe webhook", log);
  else console.log("Stripe webhook", log);

  // Toute future action persistante devra être rendue idempotente via event.id.
  return jsonResponse({ received: true });
}
