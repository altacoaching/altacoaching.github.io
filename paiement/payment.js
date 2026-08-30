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
  const klarnaSection = document.querySelector("#klarna-section");
  const klarnaOption = document.querySelector("#klarna-option");
  const klarnaOptionLabel = document.querySelector(".klarna-option");
  const emailError = document.querySelector("#email-error");
  const summaryHighlight = document.querySelector("#summary-offer-highlight");
  const bankSection = document.querySelector("#bank-transfer-section");
  const bankButton = document.querySelector("#bank-transfer-button");
  const bankEmail = document.querySelector("#bank-email");
  let checkoutActions = null;
  let offer = null;
  let canConfirm = false;
  let currentEmail = "";
  let emailIsValid = false;
  let selectedFlow = "stripe";
  let isSubmitting = false;
  let lastSweptOfferKey = null;

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value) && value.length <= 254;

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

  const updateSubmitState = () => {
    const methodIsReady = selectedFlow === "klarna" ? true : canConfirm;
    submitButton.disabled = isSubmitting || !checkoutActions || !emailIsValid || !methodIsReady;
  };

  const setLoading = (active) => {
    isSubmitting = active;
    updateSubmitState();
    submitSpinner.hidden = !active;
    submitLabel.textContent = active ? "Traitement sécurisé…" : getSubmitLabel();
  };

  const getSubmitLabel = () => {
    if (!offer) return "Continuer";
    const price = formatPrice(offer.amount, offer.currency, false);
    return offer.recurring ? `S’ABONNER POUR ${price} / MOIS` : `PAYER ${price}`;
  };

  const triggerSummarySweep = (key) => {
    if (!key || key === lastSweptOfferKey) return;
    lastSweptOfferKey = key;
    if (prefersReducedMotion.matches) return;
    summaryHighlight.classList.remove("is-sweeping");
    window.requestAnimationFrame(() => summaryHighlight.classList.add("is-sweeping"));
  };

  const renderOffer = () => {
    const formatted = formatPrice(offer.amount, offer.currency, offer.recurring);
    document.querySelector("#summary-title").textContent = offer.label;
    document.querySelector("#summary-price").textContent = formatted;
    document.querySelector("#summary-subtotal").textContent = formatted;
    document.querySelector("#summary-total").textContent = formatted;
    document.querySelector("#initial-review-benefit").hidden = !offer.recurring;
    klarnaSection.hidden = offer.recurring;
    if (offer.recurring && selectedFlow === "klarna") {
      selectedFlow = "stripe";
      klarnaOption.checked = false;
      klarnaOptionLabel.classList.remove("is-selected");
    }
    bankSection.hidden = offer.recurring;
    submitLabel.textContent = getSubmitLabel();
    updateSubmitState();
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
        paymentMethodOrder: ["card", "amazon_pay", "sepa_debit"],
        wallets: {
          applePay: "never",
          googlePay: "never",
          link: "never"
        }
      });
      paymentElement.mount("#payment-element");
      paymentElement.on("change", () => {
        if (selectedFlow === "klarna") {
          selectedFlow = "stripe";
          klarnaOption.checked = false;
          klarnaOptionLabel.classList.remove("is-selected");
        }
        updateSubmitState();
      });

      const actionsResult = await checkout.loadActions();
      if (actionsResult.type === "error") throw new Error(actionsResult.error.message);
      checkoutActions = actionsResult.actions;

      const checkoutSession = checkoutActions.getSession();
      currentEmail = typeof checkoutSession?.email === "string" ? checkoutSession.email.trim() : "";
      emailIsValid = isValidEmail(currentEmail);
      canConfirm = Boolean(checkoutSession?.canConfirm);
      const sdkAmount = checkoutSession?.total?.total?.minorUnitsAmount;
      if (Number.isInteger(sdkAmount)) {
        offer.amount = sdkAmount;
        offer.currency = checkoutSession.currency || offer.currency;
        renderOffer();
      }

      checkout.on("change", (session) => {
        canConfirm = Boolean(session.canConfirm);
        currentEmail = typeof session.email === "string" ? session.email.trim() : "";
        emailIsValid = isValidEmail(currentEmail);
        emailError.hidden = !currentEmail || emailIsValid;
        updateSubmitState();
      });

      loading.hidden = true;
      content.hidden = false;
      triggerSummarySweep(offer.key);
    } catch (error) {
      loading.textContent = error.message || "Le paiement sécurisé est temporairement indisponible.";
      loading.setAttribute("role", "alert");
    }
  };

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!checkoutActions) return;
    if (!emailIsValid) {
      emailError.hidden = false;
      return;
    }
    setMessage();
    setLoading(true);

    try {
      if (selectedFlow === "klarna") {
        const data = await requestJson("/api/stripe/create-klarna", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ offerKey, email: currentEmail })
        });
        const redirectUrl = new URL(data.url);
        const isStripeHost = redirectUrl.hostname === "stripe.com" || redirectUrl.hostname.endsWith(".stripe.com");
        if (redirectUrl.protocol !== "https:" || !isStripeHost) {
          throw new Error("Redirection de paiement invalide.");
        }
        window.location.assign(redirectUrl.href);
      } else {
        const result = await checkoutActions.confirm();
        if (result?.type === "error") throw new Error(result.error.message);
      }
    } catch (error) {
      setMessage(error.message || "Le paiement n’a pas pu être confirmé.");
      setLoading(false);
    }
  });

  klarnaOption.addEventListener("change", () => {
    if (!klarnaOption.checked) return;
    selectedFlow = "klarna";
    klarnaOptionLabel.classList.add("is-selected");
    updateSubmitState();
  });

  summaryHighlight.addEventListener("animationend", () => {
    summaryHighlight.classList.remove("is-sweeping");
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
