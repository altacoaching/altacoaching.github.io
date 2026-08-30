(() => {
  "use strict";

  const title = document.querySelector("#return-title");
  const message = document.querySelector("#return-message");
  const email = document.querySelector("#return-email");
  const bookingButton = document.querySelector("#booking-button");
  const initializedNamespaces = new Set();
  let activeBookingRoute = null;
  let bookingAcceptedHandled = false;

  const BOOKING_ROUTES = Object.freeze({
    programme: Object.freeze({
      copy: "Votre formule est activée.",
      cta: "RÉSERVER MON BILAN INITIAL GRATUIT",
      calLink: "maxime-alta-coaching-ghihbc/visio-ou-physique-bilan-de-prise-en-charge-initiale",
      namespace: "visio-ou-physique-bilan-de-prise-en-charge-initiale"
    }),
    essentielle: Object.freeze({
      copy: "Votre formule est activée.",
      cta: "RÉSERVER MON BILAN INITIAL GRATUIT",
      calLink: "maxime-alta-coaching-ghihbc/visio-ou-physique-bilan-de-prise-en-charge-initiale",
      namespace: "visio-ou-physique-bilan-de-prise-en-charge-initiale"
    }),
    performance: Object.freeze({
      copy: "Votre formule est activée.",
      cta: "RÉSERVER MON BILAN INITIAL GRATUIT",
      calLink: "maxime-alta-coaching-ghihbc/visio-ou-physique-bilan-de-prise-en-charge-initiale",
      namespace: "visio-ou-physique-bilan-de-prise-en-charge-initiale"
    }),
    bilan: Object.freeze({
      copy: "Votre paiement est confirmé. Choisissez maintenant votre créneau pour votre bilan initial.",
      cta: "RÉSERVER MON BILAN INITIAL",
      calLink: "maxime-alta-coaching-ghihbc/presentiel-bilan-initial-1h30",
      namespace: "presentiel-bilan-initial-1h30"
    }),
    seance: Object.freeze({
      copy: "Votre paiement est confirmé. Choisissez maintenant votre créneau de coaching.",
      cta: "RÉSERVER MA SÉANCE",
      calLink: "maxime-alta-coaching-ghihbc/presentiel-seance-de-coaching-60-min",
      namespace: "presentiel-seance-de-coaching-60-min"
    }),
    pack5: Object.freeze({
      copy: "Votre pack est activé. Vous pouvez maintenant réserver votre première séance.",
      cta: "RÉSERVER MA PREMIÈRE SÉANCE",
      calLink: "maxime-alta-coaching-ghihbc/presentiel-seance-de-coaching-60-min",
      namespace: "presentiel-seance-de-coaching-60-min"
    }),
    pack10: Object.freeze({
      copy: "Votre pack est activé. Vous pouvez maintenant réserver votre première séance.",
      cta: "RÉSERVER MA PREMIÈRE SÉANCE",
      calLink: "maxime-alta-coaching-ghihbc/presentiel-seance-de-coaching-60-min",
      namespace: "presentiel-seance-de-coaching-60-min"
    })
  });

  const ensureCalLoader = () => {
    if (!window.Cal) {
      (function (C, A, L) {
        const push = (api, args) => api.q.push(args);
        const documentRef = C.document;
        C.Cal = C.Cal || function () {
          const cal = C.Cal;
          const args = arguments;
          if (!cal.loaded) {
            cal.ns = {};
            cal.q = cal.q || [];
            documentRef.head.appendChild(documentRef.createElement("script")).src = A;
            cal.loaded = true;
          }
          if (args[0] === L) {
            const api = function () { push(api, arguments); };
            const namespace = args[1];
            api.q = api.q || [];
            if (typeof namespace === "string") {
              cal.ns[namespace] = cal.ns[namespace] || api;
              push(cal.ns[namespace], args);
              push(cal, ["initNamespace", namespace]);
            } else push(cal, args);
            return;
          }
          push(cal, args);
        };
      })(window, "https://app.cal.com/embed/embed.js", "init");
    }

    window.Cal.config = window.Cal.config || {};
    window.Cal.config.forwardQueryParams = true;
  };

  const getBookingStorageKey = (sessionId) => `alta:booking-confirmed:${sessionId}`;

  const getAcceptedBooking = (sessionId) => {
    try {
      const storedBooking = JSON.parse(window.sessionStorage.getItem(getBookingStorageKey(sessionId)) || "null");
      return storedBooking?.status === "accepted" ? storedBooking : null;
    } catch {
      return null;
    }
  };

  const initializeBookingPopup = (route, sessionId) => {
    ensureCalLoader();
    if (initializedNamespaces.has(route.namespace)) return;

    window.Cal("init", route.namespace, { origin: "https://app.cal.com" });
    window.Cal.ns[route.namespace]("ui", {
      hideEventTypeDetails: false,
      layout: "month_view"
    });
    window.Cal.ns[route.namespace]("on", {
      action: "bookingSuccessfulV2",
      callback: (event) => {
        const bookingStatus = String(event?.detail?.data?.status || "").toLowerCase();
        if (bookingStatus !== "accepted" || bookingAcceptedHandled) return;

        bookingAcceptedHandled = true;
        const bookingUid = String(event?.detail?.data?.uid || "");
        try {
          window.sessionStorage.setItem(
            getBookingStorageKey(sessionId),
            JSON.stringify({ status: "accepted", uid: bookingUid })
          );
        } catch {
          bookingAcceptedHandled = false;
          return;
        }

        window.Cal.ns[route.namespace]("closeModal");
        window.setTimeout(() => window.location.reload(), 220);
      }
    });
    initializedNamespaces.add(route.namespace);
  };

  const showBookingButton = (route, sessionId) => {
    activeBookingRoute = route;
    bookingButton.textContent = route.cta;
    bookingButton.dataset.calLink = route.calLink;
    bookingButton.dataset.calNamespace = route.namespace;
    bookingButton.dataset.calConfig = JSON.stringify({
      layout: "month_view",
      useSlotsViewOnSmallScreen: "true"
    });
    bookingButton.hidden = false;
    initializeBookingPopup(route, sessionId);
  };

  const render = (heading, copy, session) => {
    title.textContent = heading;
    message.textContent = copy;
    message.hidden = false;
    email.hidden = true;
    if (session?.customerEmail) {
      email.textContent = `Confirmation envoyée à ${session.customerEmail}`;
      email.hidden = false;
    }
  };

  const renderBooked = () => {
    title.textContent = "CRÉNEAU RÉSERVÉ";
    message.textContent = "";
    message.hidden = true;
    email.textContent = "";
    email.hidden = true;
    bookingButton.hidden = true;
  };

  bookingButton.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();
    if (!activeBookingRoute || !window.Cal?.ns?.[activeBookingRoute.namespace]) return;
    window.Cal.ns[activeBookingRoute.namespace]("modal", {
      calLink: activeBookingRoute.calLink,
      config: {
        layout: "month_view",
        useSlotsViewOnSmallScreen: "true"
      }
    });
  });

  const loadStatus = async () => {
    const sessionId = new URLSearchParams(window.location.search).get("session_id");
    if (!sessionId || !/^cs_(?:test_|live_)?[A-Za-z0-9]{8,240}$/.test(sessionId)) {
      render("ERREUR", "L’identifiant de session est absent ou invalide.");
      return;
    }

    try {
      const response = await fetch(`/api/stripe/session?session_id=${encodeURIComponent(sessionId)}`, {
        headers: { Accept: "application/json" },
        cache: "no-store"
      });
      const session = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(session.error || "Impossible de vérifier le paiement.");

      if (session.status === "bank_transfer_pending") {
        render(
          "VIREMENT EN ATTENTE",
          "Votre commande sera confirmée dès réception et validation du virement par Stripe.",
          session
        );
        return;
      }

      if (session.status === "complete" && (session.paymentStatus === "paid" || session.paymentStatus === "no_payment_required")) {
        if (getAcceptedBooking(sessionId)) {
          renderBooked();
          return;
        }

        const bookingRoute = BOOKING_ROUTES[session.offerKey];
        render(
          "PAIEMENT CONFIRMÉ",
          bookingRoute?.copy || "Votre paiement a bien été confirmé par Stripe.",
          session
        );
        if (bookingRoute) showBookingButton(bookingRoute, sessionId);
        return;
      }

      if (
        (session.status === "complete" && (session.paymentStatus === "unpaid" || session.paymentStatus === "processing")) ||
        session.status === "processing"
      ) {
        render("PAIEMENT EN COURS", "Stripe traite encore votre paiement. Son statut sera mis à jour dès confirmation.", session);
        return;
      }

      if (session.status === "open" || session.status === "expired") {
        render("PAIEMENT NON FINALISÉ", "Le paiement n’a pas été finalisé. Vous pouvez revenir au site et recommencer.", session);
        return;
      }

      render("ERREUR", "Le statut du paiement ne peut pas être déterminé actuellement.", session);
    } catch (error) {
      render("ERREUR", error.message || "Impossible de vérifier le paiement actuellement.");
    }
  };

  loadStatus();
})();
