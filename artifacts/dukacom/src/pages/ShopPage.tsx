import { useEffect, useState } from "react";
import { Link, useRoute } from "wouter";
import { ArrowLeft, Loader2, Mail, MapPin, MessageCircle, Store, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  EntrepriseDoc,
  getEntreprise,
  getProduitsForEntreprise,
  ProduitDoc,
} from "@/lib/firestore-helpers";

export default function ShopPage() {
  const [, params] = useRoute("/boutique/:id");
  const { toast } = useToast();
  const [entreprise, setEntreprise] = useState<EntrepriseDoc | null>(null);
  const [produits, setProduits] = useState<ProduitDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadShop() {
      if (!params?.id) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      try {
        const ent = await getEntreprise(params.id);
        if (!ent) {
          if (!cancelled) setNotFound(true);
          return;
        }

        const prods = await getProduitsForEntreprise(params.id);
        if (!cancelled) {
          setEntreprise(ent);
          setProduits(prods);
        }
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          toast({
            title: "Erreur",
            description: "Impossible de charger la vitrine de cette boutique.",
            variant: "destructive",
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadShop();
    return () => {
      cancelled = true;
    };
  }, [params?.id, toast]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (notFound || !entreprise) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <Store className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
        <h1 className="text-2xl font-bold mb-2">Boutique introuvable</h1>
        <p className="text-muted-foreground mb-6">
          Cette boutique n’existe pas ou n’est plus disponible.
        </p>
        <Button asChild>
          <Link href="/">Retour au catalogue</Link>
        </Button>
      </div>
    );
  }

  const handleWhatsApp = (produit: ProduitDoc) => {
    const number = entreprise.whatsapp_num.replace(/[^0-9]/g, "");
    const text = encodeURIComponent(
      `Bonjour, je suis intéressé(e) par le produit ${produit.titre} au prix de ${produit.prix_kmf} KMF.`,
    );
    window.open(`https://wa.me/${number}?text=${text}`, "_blank");
  };

  return (
    <div className="min-h-screen bg-gray-50/50">
      <main className="container mx-auto px-4 py-8">
        <Button variant="ghost" asChild className="mb-6 -ml-2">
          <Link href="/">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour au catalogue
          </Link>
        </Button>

        <Card className="overflow-hidden mb-8">
          <div className="bg-primary px-6 py-8 md:px-10 md:py-10 text-primary-foreground">
            <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
              <div className="w-28 h-28 rounded-2xl overflow-hidden bg-background/20 border border-primary-foreground/20 shrink-0 flex items-center justify-center">
                {entreprise.logo_url ? (
                  <img
                    src={entreprise.logo_url}
                    alt={`Logo de ${entreprise.nom_entreprise}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Store className="w-12 h-12 opacity-70" />
                )}
              </div>
              <div className="space-y-3">
                <p className="text-sm uppercase tracking-wider opacity-75">Vitrine boutique</p>
                <h1 className="text-3xl md:text-4xl font-bold">{entreprise.nom_entreprise}</h1>
                <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-primary-foreground/85">
                  <span className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    {entreprise.adresse || entreprise.ville}
                  </span>
                  {entreprise.adresse && entreprise.ville && (
                    <span className="opacity-80">{entreprise.ville}</span>
                  )}
                  {entreprise.categorie && (
                    <span className="flex items-center gap-2">
                      <Tag className="w-4 h-4" />
                      {entreprise.categorie}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
          <CardContent className="p-6 flex flex-wrap gap-3 items-center justify-between">
            <p className="text-muted-foreground max-w-3xl">{entreprise.description}</p>
            <div className="flex flex-wrap gap-2 shrink-0">
              {entreprise.whatsapp_num && (
                <Button
                  asChild
                  className="bg-[hsl(var(--whatsapp))] hover:bg-[hsl(var(--whatsapp))/0.9] text-white"
                >
                  <a
                    href={`https://wa.me/${entreprise.whatsapp_num.replace(/[^0-9]/g, "")}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    WhatsApp
                  </a>
                </Button>
              )}
              {entreprise.email_contact && (
                <Button variant="outline" asChild>
                  <a href={`mailto:${entreprise.email_contact}`}>
                    <Mail className="w-4 h-4 mr-2" />
                    Email
                  </a>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex items-end justify-between gap-4 mb-5">
          <div>
            <h2 className="text-2xl font-bold">Catalogue de la boutique</h2>
            <p className="text-muted-foreground">
              {produits.length} produit{produits.length === 1 ? "" : "s"} disponible{produits.length === 1 ? "" : "s"}
            </p>
          </div>
        </div>

        {produits.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center text-muted-foreground">
              <Store className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>Cette boutique n’a pas encore ajouté de produits.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {produits.map((produit) => (
              <Card key={produit.id_produit} className="overflow-hidden flex flex-col">
                <div className="aspect-square bg-muted">
                  <img
                    src={produit.image_url}
                    alt={produit.titre}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-semibold line-clamp-2">{produit.titre}</h3>
                    <span className="font-bold text-primary whitespace-nowrap">
                      {produit.prix_kmf.toLocaleString("fr-FR")} KMF
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-0 flex-1 flex flex-col">
                  <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                    {produit.description}
                  </p>
                  {produit.categorie && (
                    <span className="inline-block self-start px-2 py-1 bg-secondary text-secondary-foreground text-xs rounded-md mb-4">
                      {produit.categorie}
                    </span>
                  )}
                  <Button
                    className="w-full mt-auto bg-[hsl(var(--whatsapp))] hover:bg-[hsl(var(--whatsapp))/0.9] text-white"
                    onClick={() => handleWhatsApp(produit)}
                    disabled={!entreprise.whatsapp_num}
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Commander sur WhatsApp
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}