import type { ProduitDoc } from "@/lib/firestore-helpers";

export function buildProductOrderWhatsAppUrl(
  phoneNumber: string,
  product: ProduitDoc,
  shopName: string,
): string {
  const normalizedPhone = phoneNumber.replace(/\D/g, "");
  const price = product.prix_kmf.toLocaleString("fr-FR");
  const orderDetails =
    `Bonjour, je souhaite commander : ${product.titre} - ${price} KMF ` +
    `(Boutique : ${shopName})`;
  const message = product.image_url
    ? `${product.image_url}\n\n${orderDetails}`
    : orderDetails;

  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`;
}
