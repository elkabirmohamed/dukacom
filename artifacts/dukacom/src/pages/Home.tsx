import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Search, MapPin, Tag, MessageCircle, Store } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { getActiveProducts, ProduitDoc, getAllEntreprises, EntrepriseDoc } from "@/lib/firestore-helpers";
import { useToast } from "@/hooks/use-toast";

const VILLES = ["Moroni", "Mutsamudu", "Fomboni", "Domoni", "Sima", "Ouani", "Mitsoudjé", "Mitsamiouli", "Bandamaji", "Ntsoudjini"];
const CATEGORIES = ["Alimentation", "Vêtements", "Électronique", "Meubles", "Santé & Beauté", "Agriculture", "Construction", "Services", "Automobile", "Divers"];

export default function Home() {
  const [produits, setProduits] = useState<ProduitDoc[]>([]);
  const [entreprises, setEntreprises] = useState<Record<string, EntrepriseDoc>>({});
  const [loading, setLoading] = useState(true);
  
  const [search, setSearch] = useState("");
  const [ville, setVille] = useState("Toutes");
  const [categorie, setCategorie] = useState("Toutes");
  const { toast } = useToast();

  useEffect(() => {
    async function loadData() {
      try {
        const [prodData, entData] = await Promise.all([
          getActiveProducts(),
          getAllEntreprises()
        ]);
        
        const entMap: Record<string, EntrepriseDoc> = {};
        entData.forEach(e => {
          if (e.id_entreprise) entMap[e.id_entreprise] = e;
        });
        
        // Filter out products from suspended/inactive enterprises client-side as requested
        const activeProds = prodData.filter(p => {
          const ent = entMap[p.id_entreprise_fk];
          return ent && ent.statut_abonnement === "actif";
        });
        
        setProduits(activeProds);
        setEntreprises(entMap);
      } catch (err) {
        console.error(err);
        toast({ title: "Erreur", description: "Impossible de charger le catalogue.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [toast]);

  const filteredProduits = produits.filter(p => {
    const ent = entreprises[p.id_entreprise_fk];
    if (!ent) return false;
    
    if (search && !p.titre.toLowerCase().includes(search.toLowerCase()) && !p.description.toLowerCase().includes(search.toLowerCase())) return false;
    if (ville !== "Toutes" && ent.ville !== ville) return false;
    if (categorie !== "Toutes" && p.categorie !== categorie && ent.categorie !== categorie) return false;
    
    return true;
  });

  const handleWhatsApp = (p: ProduitDoc, ent: EntrepriseDoc) => {
    const text = encodeURIComponent(`Bonjour, je suis intéressé(e) par le produit ${p.titre} au prix de ${p.prix_kmf} KMF.`);
    // clean phone number - remove non-digits, ensure it starts with correct prefix. 
    // Usually WhatsApp links prefer no '+' or just digits.
    const num = ent.whatsapp_num.replace(/[^0-9]/g, '');
    window.open(`https://wa.me/${num}?text=${text}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-gray-50/50 flex flex-col">
      {/* Hero Section */}
      <section className="bg-primary text-primary-foreground py-16 px-4">
        <div className="container mx-auto max-w-4xl text-center space-y-6">
          <h1 className="text-3xl md:text-5xl font-bold leading-tight">
            DukaCom : Le grand répertoire des supermarchés et boutiques aux Comores
          </h1>
          <p className="text-primary-foreground/80 text-lg">
            Trouvez les meilleurs produits locaux et contactez directement les vendeurs sur WhatsApp.
          </p>
          
          <div className="bg-background rounded-lg p-2 flex flex-col md:flex-row gap-2 shadow-lg mt-8 text-foreground max-w-3xl mx-auto">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
              <Input 
                type="text" 
                placeholder="Que recherchez-vous ?" 
                className="pl-10 border-0 shadow-none focus-visible:ring-0"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="w-full md:w-[1px] h-[1px] md:h-8 bg-border my-auto"></div>
            <div className="flex-1">
              <Select value={categorie} onValueChange={setCategorie}>
                <SelectTrigger className="border-0 shadow-none focus:ring-0">
                  <Tag className="w-4 h-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Catégorie" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Toutes">Toutes les catégories</SelectItem>
                  {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="w-full md:w-[1px] h-[1px] md:h-8 bg-border my-auto"></div>
            <div className="flex-1">
              <Select value={ville} onValueChange={setVille}>
                <SelectTrigger className="border-0 shadow-none focus:ring-0">
                  <MapPin className="w-4 h-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Ville" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Toutes">Toutes les villes</SelectItem>
                  {VILLES.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </section>

      {/* Products Grid */}
      <main className="container mx-auto px-4 py-12 flex-1">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <div className="h-48 bg-muted rounded-t-lg"></div>
                <CardHeader className="h-20 bg-muted/50"></CardHeader>
                <CardContent className="h-10 bg-muted/30"></CardContent>
              </Card>
            ))}
          </div>
        ) : filteredProduits.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Search className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <h2 className="text-xl font-semibold text-foreground mb-2">Aucun produit trouvé</h2>
            <p>Essayez de modifier vos filtres ou votre recherche.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredProduits.map((p) => {
              const ent = entreprises[p.id_entreprise_fk];
              return (
                <Card key={p.id_produit} className="flex flex-col overflow-hidden hover-elevate transition-shadow">
                  <div className="relative aspect-square bg-muted">
                    <img 
                      src={p.image_url} 
                      alt={p.titre} 
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    {ent.logo_url && (
                      <div className="absolute top-2 left-2 w-8 h-8 rounded-full border-2 border-background overflow-hidden bg-background">
                        <img src={ent.logo_url} alt={ent.nom_entreprise} className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>
                  <CardHeader className="p-4 pb-2">
                    <div className="flex justify-between items-start gap-2">
                      <h3 className="font-semibold text-lg line-clamp-2 leading-tight">{p.titre}</h3>
                      <span className="font-bold text-primary whitespace-nowrap">{p.prix_kmf.toLocaleString('fr-FR')} KMF</span>
                    </div>
                    <Link
                      href={`/boutique/${ent.id_entreprise}`}
                      className="text-sm text-muted-foreground line-clamp-1 flex items-center gap-1 hover:text-primary hover:underline"
                    >
                      <Store className="w-3 h-3 shrink-0" /> {ent.nom_entreprise} • {ent.ville}
                    </Link>
                    {ent.adresse && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <MapPin className="w-3 h-3 shrink-0" /> {ent.adresse}
                      </p>
                    )}
                  </CardHeader>
                  <CardContent className="p-4 pt-0 flex-1">
                    {p.categorie && (
                      <span className="inline-block px-2 py-1 bg-secondary text-secondary-foreground text-xs rounded-md mb-2">
                        {p.categorie}
                      </span>
                    )}
                  </CardContent>
                  <CardFooter className="p-4 pt-0">
                    <Button 
                      className="w-full bg-[hsl(var(--whatsapp))] hover:bg-[hsl(var(--whatsapp))/0.9] text-white" 
                      onClick={() => handleWhatsApp(p, ent)}
                    >
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Commander sur WhatsApp
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
