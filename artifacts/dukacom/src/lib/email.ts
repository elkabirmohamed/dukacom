import emailjs from "@emailjs/browser";

const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID as string | undefined;
const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID as string | undefined;
const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY as string | undefined;

function formatDateFr(date: Date): string {
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
}

export interface RecuEmailParams {
  toEmail: string;
  nomEntreprise: string;
  montantKmf: number;
  dateValidation: Date;
  dateExpiration: Date;
}

/**
 * Envoie le reçu officiel de paiement d'abonnement au commerçant via EmailJS,
 * juste après qu'un admin ait validé sa transaction MVola.
 *
 * Ne bloque jamais le flux de validation admin : les erreurs sont journalisées
 * mais n'interrompent pas l'activation de l'abonnement (déjà effectuée en base).
 */
export async function sendRecuPaiementEmail(params: RecuEmailParams): Promise<boolean> {
  if (!SERVICE_ID || !TEMPLATE_ID || !PUBLIC_KEY) {
    console.error(
      "EmailJS non configuré : VITE_EMAILJS_SERVICE_ID / VITE_EMAILJS_TEMPLATE_ID / VITE_EMAILJS_PUBLIC_KEY manquants."
    );
    return false;
  }

  if (!params.toEmail) {
    console.warn("Aucune adresse e-mail de contact pour cette entreprise, reçu non envoyé.");
    return false;
  }

  try {
    await emailjs.send(
      SERVICE_ID,
      TEMPLATE_ID,
      {
        to_email: params.toEmail,
        nom_entreprise: params.nomEntreprise,
        montant: params.montantKmf.toLocaleString("fr-FR"),
        statut: "Payé / Validé",
        date_validation: formatDateFr(params.dateValidation),
        date_expiration: formatDateFr(params.dateExpiration),
      },
      { publicKey: PUBLIC_KEY }
    );
    return true;
  } catch (err) {
    console.error("Échec de l'envoi du reçu par e-mail :", err);
    return false;
  }
}
