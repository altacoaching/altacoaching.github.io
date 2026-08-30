(() => {
  "use strict";

  const params = new URLSearchParams(window.location.search);
  const offerKey = params.get("offre") || "essentielle";
  const loading = document.querySelector("#checkout-loading");
  const content = document.querySelector("#checkout-content");
  const message = document.querySelector("#payment-message");
  const form = document.querySelector("#payment-form");
  const submitButton = document.querySelector("#submit-payment");
  const submitLabel = document.querySelector("#submit-label");
  const submitSpinner = document.querySelector("#submit-spinner");
  const expressSection = document.querySelector("#express-section");
  const klarnaNote = document.querySelector("#klarna-note");
  const bankSection = document.querySelector("#bank-transfer-section");
  const bankButton = document.querySelector("#bank-transfer-button");
  const bankEmail = document.querySelector("#bank-email");
  let checkoutActions = null;
  let offer = null;
  let canConfirm = false;

  const requestJson = async (url, options = {}) => {
    const response = await fetch(url, {
      ...options,
      headers: { Accept: "application/json", ...(options.headers || {}) }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Une erreur est survenue.");
    return data;
  };

  const formatPrice = (amount, currency, recurring) => {
    if (!Number.isInteger(amount)) return "Prix indisponible";
    const value = new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: String(currency || "eur").toUpperCase(),
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount / 100);
    return recurring ? `${value} / mois` : value;
  };

  const setMessage = (text = "") => { message.textContent = text; };

  const setLoading = (active) => {
    submitButton.disabled = active || !checkoutActions || !canConfirm;
    submitSpinner.hidden = !active;
    submitLabel.textContent = active ? "Traitement sécurisé…" : getSubmitLabel();
  };

  const getSubmitLabel = () => {
    if (!offer) return "Continuer";
    const price = formatPrice(offer.amount, offer.currency, false);
    return offer.recurring ? `S’ABONNER POUR ${price} / MOIS` : `PAYER ${price}`;
  };

  const renderOffer = () => {
    const formatted = formatPrice(offer.amount, offer.currency, offer.recurring);
    document.querySelector("#summary-title").textContent = offer.label;
    document.querySelector("#summary-price").textContent = formatted;
    document.querySelector("#summary-subtotal").textContent = formatted;
    document.querySelector("#summary-total").textContent = formatted;
    document.querySelector("#initial-review-benefit").hidden = !offer.recurring;
    klarnaNote.hidden = offer.recurring;
    bankSection.hidden = offer.recurring;
    submitLabel.textContent = getSubmitLabel();
  };

  const initCheckout = async () => {
    try {
      const [config, sessionPayload] = await Promise.all([
        requestJson("/api/stripe/config"),
        requestJson("/api/stripe/create-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ offerKey })
        })
      ]);

      if (!window.Stripe || !config.publishableKey || !sessionPayload.clientSecret) {
        throw new Error("Le paiement sécurisé est temporairement indisponible.");
      }

      offer = sessionPayload.offer;
      renderOffer();

      const stripe = window.Stripe(config.publishableKey);
      const checkout = stripe.initCheckoutElementsSdk({
        clientSecret: sessionPayload.clientSecret,
        elementsOptions: {
          appearance: {
            theme: "stripe",
            variables: {
              colorPrimary: "#004aad",
              colorText: "#111317",
              colorBackground: "#ffffff",
              colorDanger: "#9b1c1c",
              fontFamily: "Inter, Arial, sans-serif",
              borderRadius: "9px"
            }
          }
        }
      });

      const expressElement = checkout.createExpressCheckoutElement({
        buttonHeight: 48,
        layout: { maxColumns: 2, maxRows: 2, overflow: "auto" },
        paymentMethodOrder: ["applePay", "googlePay", "paypal", "link"],
        paymentMethods: {
          applePay: "always",
          googlePay: "always",
          paypal: "auto",
          link: "auto",
          amazonPay: "never",
          klarna: "never"
        }
      });
      expressElement.on("availablepaymentmethodschange", (event) => {
        const methods = event.paymentMethods || {};
        expressSection.classList.remove("is-pending");
        expressSection.hidden = !Object.values(methods).some((entry) => entry?.available);
      });
      expressElement.mount("#express-checkout-element");

      const contactElement = checkout.createContactDetailsElement();
      contactElement.mount("#contact-details-element");
      const paymentElement = checkout.createPaymentElement({
        layout: {
          type: "accordion",
          radios: "always",
          visibleAccordionItemsCount: 0
        },
        paymentMethodOrder: offer.recurring
          ? ["card", "amazon_pay", "sepa_debit"]
          : ["card", "amazon_pay", "sepa_debit", "klarna"],
        wallets: {
          applePay: "never",
          googlePay: "never",
          link: "never"
        }
      });
      paymentElement.mount("#payment-element");

      const actionsResult = await checkout.loadActions();
      if (actionsResult.type === "error") throw new Error(actionsResult.error.message);
      checkoutActions = actionsResult.actions;

      const checkoutSession = checkoutActions.getSession();
      const sdkAmount = checkoutSession?.total?.total?.minorUnitsAmount;
      if (Number.isInteger(sdkAmount)) {
        offer.amount = sdkAmount;
        offer.currency = checkoutSession.currency || offer.currency;
        renderOffer();
      }

      checkout.on("change", (session) => {
        canConfirm = Boolean(session.canConfirm);
        submitButton.disabled = !canConfirm;
      });

      loading.hidden = true;
      content.hidden = false;
    } catch (error) {
      loading.textContent = error.message || "Le paiement sécurisé est temporairement indisponible.";
      loading.setAttribute("role", "alert");
    }
  };

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!checkoutActions) return;
    setMessage();
    setLoading(true);

    try {
      const result = await checkoutActions.confirm();
      if (result?.type === "error") throw new Error(result.error.message);
    } catch (error) {
      setMessage(error.message || "Le paiement n’a pas pu être confirmé.");
      setLoading(false);
    }
  });

  bankButton.addEventListener("click", async () => {
    setMessage();
    if (!bankEmail.reportValidity()) return;
    bankButton.disabled = true;
    bankButton.textContent = "Ouverture de Stripe…";

    try {
      const data = await requestJson("/api/stripe/create-bank-transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ offerKey, email: bankEmail.value })
      });
      const redirectUrl = new URL(data.url);
      const isStripeHost = redirectUrl.hostname === "stripe.com" || redirectUrl.hostname.endsWith(".stripe.com");
      if (redirectUrl.protocol !== "https:" || !isStripeHost) {
        throw new Error("Redirection de paiement invalide.");
      }
      window.location.assign(redirectUrl.href);
    } catch (error) {
      setMessage(error.message || "Le virement bancaire n’est pas disponible actuellement.");
      bankButton.disabled = false;
      bankButton.textContent = "Payer par virement bancaire";
    }
  });

  initCheckout();
})();
