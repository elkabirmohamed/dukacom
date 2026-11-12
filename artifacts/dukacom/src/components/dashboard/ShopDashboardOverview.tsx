import { ArrowUpRight, Check, Circle, Copy, Package, Plus, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { EntrepriseDoc, ProduitDoc } from "@/lib/firestore-helpers";
import { DUKACOM_SITE_URL } from "@/lib/whatsapp";

interface ShopDashboardOverviewProps {
  entreprise: EntrepriseDoc;
  produits: ProduitDoc[];
  daysLeft: number;
  shopUrl: string;
  onAddProduct: () => void;
  onCopyLink: (url: string, label: string) => Promise<void>;
}

export default function ShopDashboardOverview({
  entreprise,
  produits,
  daysLeft,
  shopUrl,
  onAddProduct,
  onCopyLink,
}: ShopDashboardOverviewProps) {
  const categories = new Set(
    produits.map((product) => product.categorie?.trim()).filter(Boolean),
  );
  const profileChecklist = [
    { label: "Nom de la boutique", complete: Boolean(entreprise.nom_entreprise.trim()) },
    { label: "Description", complete: Boolean(entreprise.description.trim()) },
    { label: "Numéro WhatsApp", complete: Boolean(entreprise.whatsapp_num.trim()) },
    { label: "Ville", complete: Boolean(entreprise.ville.trim()) },
    { label: "Logo", complete: Boolean(entreprise.logo_url.trim()) },
    { label: "Au moins un produit", complete: produits.length > 0 },
  ];
  const completedProfileItems = profileChecklist.filter((item) => item.complete).length;
  const completionPercentage = Math.round(
    (completedProfileItems / profileChecklist.length) * 100,
  );
  const recentProducts = produits.slice(0, 3);

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4" aria-label="Résumé de la boutique">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Produits au catalogue</CardDescription>
            <CardTitle className="text-3xl">{produits.length}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {produits.length === 1 ? "Produit visible dans votre vitrine" : "Produits visibles dans votre vitrine"}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Catégories renseignées</CardDescription>
            <CardTitle className="text-3xl">{categories.size}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Pour aider les clients à parcourir vos produits
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Profil de la boutique</CardDescription>
            <CardTitle className="text-3xl">{completionPercentage}%</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {completedProfileItems} éléments renseignés sur {profileChecklist.length}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Abonnement</CardDescription>
            <CardTitle className="text-3xl">
              {Math.max(daysLeft, 0)} <span className="text-base font-medium">jours</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {daysLeft < 7 ? "À renouveler prochainement" : "Jusqu’au renouvellement"}
          </CardContent>
        </Card>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Store className="w-5 h-5 text-primary" />
              <CardTitle>Votre vitrine publique</CardTitle>
            </div>
            <CardDescription>
              Partagez votre boutique pour que vos clients consultent le catalogue et vous contactent.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-muted px-3 py-2.5 text-sm break-all" aria-label="Lien public de la boutique">
              {shopUrl}
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button onClick={() => onCopyLink(shopUrl, "Lien de la boutique")}>
                <Copy className="w-4 h-4 mr-2" />
                Copier le lien
              </Button>
              <Button variant="outline" asChild>
                <a href={shopUrl} target="_blank" rel="noreferrer">
                  Voir la vitrine
                  <ArrowUpRight className="w-4 h-4 ml-2" />
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Compléter votre boutique</CardTitle>
            <CardDescription>
              Un profil complet donne aux clients les informations utiles avant de commander.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {profileChecklist.map((item) => (
                <li key={item.label} className="flex items-center gap-3 text-sm">
                  {item.complete ? (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Check className="h-3.5 w-3.5" aria-hidden="true" />
                    </span>
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground/50" aria-hidden="true" />
                  )}
                  <span className={item.complete ? "text-muted-foreground" : "font-medium"}>
                    {item.label}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle>Ajouts récents</CardTitle>
            <CardDescription>Les trois derniers produits ajoutés à votre catalogue.</CardDescription>
          </div>
          {produits.length > 0 && (
            <Button variant="outline" onClick={onAddProduct}>
              <Plus className="w-4 h-4 mr-2" />
              Ajouter
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {recentProducts.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-center">
              <Package className="w-9 h-9 text-muted-foreground/50 mb-3" aria-hidden="true" />
              <p className="font-medium">Votre catalogue est encore vide</p>
              <p className="text-sm text-muted-foreground mt-1 mb-4">
                Ajoutez votre premier produit pour remplir la vitrine.
              </p>
              <Button onClick={onAddProduct}>
                <Plus className="w-4 h-4 mr-2" />
                Ajouter un produit
              </Button>
            </div>
          ) : (
            <ul className="divide-y">
              {recentProducts.map((product) => (
                <li key={product.id_produit} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                  <div className="flex min-w-0 items-center gap-3">
                    <img
                      src={product.image_url}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="h-12 w-12 rounded-md object-cover bg-muted"
                    />
                    <div className="min-w-0">
                      <p className="truncate font-medium">{product.titre}</p>
                      <p className="text-sm text-muted-foreground">
                        {product.prix_kmf.toLocaleString("fr-FR")} KMF
                      </p>
                    </div>
                  </div>
                  {product.id_produit && (
                    <Button variant="ghost" size="sm" asChild>
                      <a
                        href={`${DUKACOM_SITE_URL}/produit/${encodeURIComponent(product.id_produit)}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Voir
                        <ArrowUpRight className="w-4 h-4 ml-1" />
                      </a>
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
