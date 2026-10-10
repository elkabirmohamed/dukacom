import type { ProduitDoc } from "@/lib/firestore-helpers";

export const DUKACOM_SITE_URL = "https://dukacom.vercel.app";

export function buildProductOrderWhatsAppUrl(
  phoneNumber: string,
  product: ProduitDoc,
): string {
  const normalizedPhone = phoneNumber.replace(/\D/g, "");
  const price = product.prix_kmf.toLocaleString("fr-FR");
  const productId = product.id_produit;
  if (!productId) {
    throw new Error("Impossible de partager un produit sans identifiant.");
  }

  const productUrl = `${DUKACOM_SITE_URL}/produit/${encodeURIComponent(productId)}`;
  const message =
    `Bonjour, je souhaite commander : ${product.titre} (${price} KMF).\n\n` +
    `Voir le produit : ${productUrl}`;

  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`;
}
