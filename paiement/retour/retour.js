(() => {
  "use strict";

  const title = document.querySelector("#return-title");
  const message = document.querySelector("#return-message");
  const email = document.querySelector("#return-email");
  const initialReviewLink = document.querySelector("#initial-review-link");

  const render = (heading, copy, session) => {
    title.textContent = heading;
    message.textContent = copy;
    if (session?.customerEmail) {
      email.textContent = `Confirmation envoyée à ${session.customerEmail}`;
      email.hidden = false;
    }
  };

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
        render(
          "PAIEMENT CONFIRMÉ",
          session.mode === "subscription" ? "Votre formule est activée." : "Votre paiement a bien été confirmé par Stripe.",
          session
        );
        if (session.mode === "subscription") {
          initialReviewLink.href = `${window.location.origin}/#reservation`;
          initialReviewLink.hidden = false;
        }
        return;
      }

      if (session.status === "complete" && session.paymentStatus === "unpaid") {
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
