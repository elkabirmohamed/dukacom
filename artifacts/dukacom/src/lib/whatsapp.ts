import type { ProduitDoc } from "@/lib/firestore-helpers";

export function buildProductOrderWhatsAppUrl(
  phoneNumber: string,
  product: ProduitDoc,
  shopName: string,
): string {
  const normalizedPhone = phoneNumber.replace(/\D/g, "");
  const price = product.prix_kmf.toLocaleString("fr-FR");
  const photoLine = product.image_url
    ? ` Photo du produit : ${product.image_url}`
    : "";
  const message =
    `Bonjour, je souhaite commander : ${product.titre} - ${price} KMF. ` +
    `Boutique : ${shopName}.${photoLine}`;

  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`;
}
