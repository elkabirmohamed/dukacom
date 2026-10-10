import { useEffect, useState } from "react";
import { Link, useRoute } from "wouter";
import { ArrowLeft, Loader2, MessageCircle, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  EntrepriseDoc,
  getEntreprise,
  getProduit,
  ProduitDoc,
} from "@/lib/firestore-helpers";
import { buildProductOrderWhatsAppUrl, DUKACOM_SITE_URL } from "@/lib/whatsapp";

function useProductMetadata(product: ProduitDoc | null) {
  useEffect(() => {
    if (!product) return;

    const oldTitle = document.title;
    const previousMeta: Array<{
      element: HTMLMetaElement;
      originalContent: string | null;
      existed: boolean;
    }> = [];

    const setMeta = (attribute: "name" | "property", key: string, content: string) => {
      let element = document.head.querySelector<HTMLMetaElement>(
        `meta[${attribute}="${key}"]`,
      );
      const existed = element !== null;
      const originalContent = element?.getAttribute("content") ?? null;

      if (!element) {
        element = document.createElement("meta");
        element.setAttribute(attribute, key);
        document.head.appendChild(element);
      }

      previousMeta.push({ element, originalContent, existed });
      element.setAttribute("content", content);
    };

    const price = product.prix_kmf.toLocaleString("fr-FR");
    const description = `${price} KMF - Disponible sur DukaCom`;
    const pageUrl = `${DUKACOM_SITE_URL}/produit/${encodeURIComponent(product.id_produit ?? "")}`;

    document.title = `${product.titre} | DukaCom`;
    setMeta("name", "description", description);
    setMeta("property", "og:title", product.titre);
    setMeta("property", "og:description", description);
    setMeta("property", "og:url", pageUrl);
    setMeta("property", "og:type", "product");
    if (product.image_url) {
      setMeta("property", "og:image", product.image_url);
      setMeta("property", "og:image:alt", product.titre);
    }
    setMeta("name", "twitter:card", "summary_large_image");
    setMeta("name", "twitter:title", product.titre);
    setMeta("name", "twitter:description", description);
    if (product.image_url) setMeta("name", "twitter:image", product.image_url);

    return () => {
      document.title = oldTitle;
      for (const item of previousMeta.reverse()) {
        if (item.existed && item.originalContent !== null) {
          item.element.setAttribute("content", item.originalContent);
        } else {
          item.element.remove();
        }
      }
    };
  }, [product]);
}

export default function ProductPage() {
  const [, params] = useRoute("/produit/:id");
  const [product, setProduct] = useState<ProduitDoc | null>(null);
  const [shop, setShop] = useState<EntrepriseDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadProduct() {
      if (!params?.id) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setLoadError(false);
      setProduct(null);
      setShop(null);

      try {
        const loadedProduct = await getProduit(params.id);
        if (!loadedProduct) {
          if (!cancelled) setLoadError(true);
          return;
        }

        const loadedShop = await getEntreprise(loadedProduct.id_entreprise_fk);
        if (!cancelled) {
          setProduct(loadedProduct);
          setShop(loadedShop);
        }
      } catch (error) {
        console.error("Impossible de charger le produit partagé.", error);
        if (!cancelled) setLoadError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadProduct();
    return () => {
      cancelled = true;
    };
  }, [params?.id]);

  useProductMetadata(product);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-label="Chargement du produit" />
      </div>
    );
  }

  if (loadError || !product) {
    return (
      <main className="container mx-auto px-4 py-20 text-center">
        <h1 className="mb-3 text-2xl font-bold">Produit introuvable</h1>
        <p className="mb-6 text-muted-foreground">
          Ce produit n’existe pas ou n’est plus disponible.
        </p>
        <Button asChild>
          <Link href="/">Retour au catalogue</Link>
        </Button>
      </main>
    );
  }

  const price = product.prix_kmf.toLocaleString("fr-FR");
  const handleWhatsApp = () => {
    if (!shop?.whatsapp_num) return;
    const url = buildProductOrderWhatsAppUrl(shop.whatsapp_num, product);
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <main className="container mx-auto w-full max-w-5xl px-4 py-8">
      <Button variant="ghost" asChild className="mb-6 -ml-2">
        <Link href={shop?.id_entreprise ? `/boutique/${shop.id_entreprise}` : "/"}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {shop ? `Retour à ${shop.nom_entreprise}` : "Retour au catalogue"}
        </Link>
      </Button>

      <Card className="overflow-hidden">
        <div className="grid md:grid-cols-2">
          <div className="aspect-square bg-muted">
            {product.image_url ? (
              <img
                src={product.image_url}
                alt={product.titre}
                className="h-full w-full object-cover"
                fetchPriority="high"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                Image non disponible
              </div>
            )}
          </div>
          <CardContent className="flex flex-col p-6 md:p-8">
            {product.categorie && (
              <span className="mb-4 self-start rounded-md bg-secondary px-2 py-1 text-xs text-secondary-foreground">
                {product.categorie}
              </span>
            )}
            <h1 className="text-2xl font-bold leading-tight md:text-3xl">{product.titre}</h1>
            <p className="mt-3 text-2xl font-bold text-primary">{price} KMF</p>
            {product.description && (
              <p className="mt-6 whitespace-pre-line text-muted-foreground">
                {product.description}
              </p>
            )}
            {shop && (
              <Link
                href={`/boutique/${shop.id_entreprise}`}
                className="mt-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary hover:underline"
              >
                <Store className="h-4 w-4" />
                {shop.nom_entreprise}
                {shop.ville ? ` • ${shop.ville}` : ""}
              </Link>
            )}
            <Button
              className="mt-auto w-full bg-[hsl(var(--whatsapp))] text-white hover:bg-[hsl(var(--whatsapp))/0.9] md:mt-10"
              onClick={handleWhatsApp}
              disabled={!shop?.whatsapp_num}
            >
              <MessageCircle className="mr-2 h-4 w-4" />
              Commander sur WhatsApp
            </Button>
          </CardContent>
        </div>
      </Card>
    </main>
  );
}
