import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import {
  EntrepriseDoc,
  ProduitDoc,
  ConfigDoc,
  getEntrepriseByOwner,
  getProduitsForEntreprise,
  getConfig,
  updateEntreprise,
  createProduit,
  updateProduit,
  deleteProduit,
  createTransaction,
  daysUntilExpiration,
  serverTimestamp,
  Timestamp,
} from "@/lib/firestore-helpers";
import { uploadToCloudinary, uploadImage, uploadFile, deleteFile } from "@/lib/storage-helpers";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Edit, Trash2, CalendarClock, UploadCloud, AlertTriangle, Store, MapPin, Save } from "lucide-react";

const CATEGORIES = ["Alimentation", "Vêtements", "Électronique", "Meubles", "Santé & Beauté", "Agriculture", "Construction", "Services", "Automobile", "Divers"];

export default function Dashboard() {
  const { currentUser, userDoc, loading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [entreprise, setEntreprise] = useState<EntrepriseDoc | null>(null);
  const [produits, setProduits] = useState<ProduitDoc[]>([]);
  const [config, setConfig] = useState<ConfigDoc | null>(null);
  
  const [isLoadingData, setIsLoadingData] = useState(true);

  // State for Mvola payment
  const [refMvola, setRefMvola] = useState("");
  const [recuFile, setRecuFile] = useState<File | null>(null);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [paymentSubmitted, setPaymentSubmitted] = useState(false);

  // State for Product modal
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProduitDoc | null>(null);
  const [prodTitre, setProdTitre] = useState("");
  const [prodDesc, setProdDesc] = useState("");
  const [prodPrix, setProdPrix] = useState("");
  const [prodCat, setProdCat] = useState("");
  const [prodImage, setProdImage] = useState<File | null>(null);
  const [prodImagePreview, setProdImagePreview] = useState("");
  const [isSavingProduct, setIsSavingProduct] = useState(false);

  // State for company profile
  const [profileNom, setProfileNom] = useState("");
  const [profileDescription, setProfileDescription] = useState("");
  const [profileWhatsapp, setProfileWhatsapp] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [profileVille, setProfileVille] = useState("");
  const [profileAdresse, setProfileAdresse] = useState("");
  const [profileCategorie, setProfileCategorie] = useState("");
  const [profileLogo, setProfileLogo] = useState<File | null>(null);
  const [profileLogoPreview, setProfileLogoPreview] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Initial load
  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      if (!currentUser) {
        if (!cancelled) setLocation("/connexion");
        return;
      }

      // Ne pas rediriger pendant un état transitoire où Firebase Auth est
      // prêt mais où le document users n'a pas encore été relu. La lecture de
      // l'entreprise est déjà protégée par l'UID Firebase côté Firestore.
      if (userDoc && userDoc.role !== "vendeur") {
        if (!cancelled) setLocation("/connexion");
        return;
      }
      
      try {
        const ent = await getEntrepriseByOwner(currentUser.uid);
        if (!ent) {
          if (!cancelled) setLocation("/configuration-entreprise");
          return;
        }
        
        const [prods, conf] = await Promise.all([
          getProduitsForEntreprise(ent.id_entreprise!),
          getConfig()
        ]);
        
        if (!cancelled) {
          setEntreprise(ent);
          setProduits(prods);
          setConfig(conf);
          setProfileNom(ent.nom_entreprise);
          setProfileDescription(ent.description);
          setProfileWhatsapp(ent.whatsapp_num);
          setProfileEmail(ent.email_contact || "");
          setProfileVille(ent.ville);
          setProfileAdresse(ent.adresse || "");
          setProfileCategorie(ent.categorie || "");
          setProfileLogoPreview(ent.logo_url);
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          toast({
            title: "Erreur",
            description: "Impossible de charger les données de votre entreprise et de vos produits.",
            variant: "destructive",
          });
        }
      } finally {
        if (!cancelled) setIsLoadingData(false);
      }
    }
    
    if (!loading) loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [currentUser, userDoc, loading, setLocation, toast]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!entreprise?.id_entreprise) return;

    setIsSavingProfile(true);
    try {
      let logoUrl = entreprise.logo_url;
      if (profileLogo) {
        logoUrl = await uploadToCloudinary(
          profileLogo,
          `logos/${entreprise.uid_proprietaire || currentUser?.uid}/${Date.now()}`,
        );
      }

      const profileData = {
        nom_entreprise: profileNom.trim(),
        description: profileDescription.trim(),
        whatsapp_num: profileWhatsapp.trim(),
        email_contact: profileEmail.trim(),
        logo_url: logoUrl,
        ville: profileVille,
        adresse: profileAdresse.trim(),
        categorie: profileCategorie,
      };

      await updateEntreprise(entreprise.id_entreprise, profileData);
      setEntreprise((current) => current ? { ...current, ...profileData } : current);
      setProfileLogo(null);
      setProfileLogoPreview(logoUrl);
      toast({ title: "Profil mis à jour", description: "Les informations de votre boutique ont été enregistrées." });
    } catch (err) {
      console.error(err);
      toast({
        title: "Erreur",
        description: "Impossible d'enregistrer les informations de la boutique.",
        variant: "destructive",
      });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleMvolaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!entreprise || !entreprise.id_entreprise || !recuFile || !refMvola) return;
    
    setIsSubmittingPayment(true);
    try {
      const recuPath = `recus/${entreprise.id_entreprise}/${Date.now()}`;
      const recuUrl = await uploadFile(recuFile, recuPath);
      
      await createTransaction({
        id_entreprise_fk: entreprise.id_entreprise,
        reference_mvola: refMvola,
        recu_file_url: recuUrl,
        date_soumission: serverTimestamp() as Timestamp,
        statut_validation: "en_attente"
      });
      
      setPaymentSubmitted(true);
    } catch (err) {
      console.error(err);
      toast({ title: "Erreur", description: "Échec de l'envoi de la demande.", variant: "destructive" });
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  const openProductModal = (product?: ProduitDoc) => {
    if (product) {
      setEditingProduct(product);
      setProdTitre(product.titre);
      setProdDesc(product.description);
      setProdPrix(product.prix_kmf.toString());
      setProdCat(product.categorie || "");
      setProdImagePreview(product.image_url);
    } else {
      setEditingProduct(null);
      setProdTitre("");
      setProdDesc("");
      setProdPrix("");
      setProdCat(entreprise?.categorie || "");
      setProdImagePreview("");
    }
    setProdImage(null);
    setIsProductModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!entreprise || !entreprise.id_entreprise) return;
    
    if (!editingProduct && !prodImage) {
      toast({ title: "Erreur", description: "Veuillez fournir une image pour le produit.", variant: "destructive" });
      return;
    }
    
    setIsSavingProduct(true);
    try {
      let imageUrl = editingProduct?.image_url || "";
      
      if (prodImage) {
        const path = `produits/${entreprise.id_entreprise}/${Date.now()}`;
        imageUrl = await uploadImage(prodImage, path);
        // Optional: delete old image if editing
      }
      
      const prodData = {
        id_entreprise_fk: entreprise.id_entreprise,
        titre: prodTitre,
        description: prodDesc,
        prix_kmf: parseInt(prodPrix, 10),
        categorie: prodCat,
        image_url: imageUrl,
      };

      if (editingProduct && editingProduct.id_produit) {
        await updateProduit(editingProduct.id_produit, prodData);
        setProduits(produits.map(p => p.id_produit === editingProduct.id_produit ? { ...p, ...prodData } as ProduitDoc : p));
        toast({ title: "Succès", description: "Produit modifié." });
      } else {
        const newId = await createProduit({
          ...prodData,
          date_creation: serverTimestamp() as Timestamp
        });
        setProduits([{ ...prodData, id_produit: newId, date_creation: Timestamp.now() } as ProduitDoc, ...produits]);
        toast({ title: "Succès", description: "Produit ajouté." });
      }
      setIsProductModalOpen(false);
    } catch (err) {
      console.error(err);
      toast({ title: "Erreur", description: "Impossible d'enregistrer le produit.", variant: "destructive" });
    } finally {
      setIsSavingProduct(false);
    }
  };

  const handleDeleteProduct = async (id: string, imageUrl: string) => {
    if (!confirm("Voulez-vous vraiment supprimer ce produit ?")) return;
    try {
      await deleteProduit(id);
      await deleteFile(imageUrl);
      setProduits(produits.filter(p => p.id_produit !== id));
      toast({ title: "Succès", description: "Produit supprimé." });
    } catch (err) {
      console.error(err);
      toast({ title: "Erreur", description: "Impossible de supprimer le produit.", variant: "destructive" });
    }
  };

  if (loading || isLoadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!entreprise || !config) return null;

  // Render Mvola Payment Screen if suspended
  if (entreprise.statut_abonnement === "suspendu") {
    return (
      <div className="container mx-auto px-4 py-12 max-w-2xl">
        <Card className="border-destructive border-2">
          <CardHeader className="text-center bg-destructive/5 pb-8">
            <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <CardTitle className="text-2xl text-destructive">Abonnement Expiré</CardTitle>
            <CardDescription className="text-lg mt-4 text-foreground">
              Votre période gratuite ou votre dernier abonnement est terminé.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {paymentSubmitted ? (
              <div className="text-center p-8 bg-green-50 rounded-lg">
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">✅</div>
                <h3 className="text-xl font-bold text-green-800 mb-2">Demande envoyée</h3>
                <p className="text-green-700">
                  Votre demande a été soumise. L'administrateur vérifiera et activera votre compte dans les plus brefs délais.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="p-4 bg-muted rounded-lg text-center leading-relaxed text-foreground">
                  Votre période gratuite est terminée. Pour continuer à publier vos produits ce mois-ci, veuillez envoyer votre abonnement mensuel de <span className="font-bold text-primary">{config.abonnement_mensuel_kmf.toLocaleString()} KMF</span> par MVola au numéro suivant : <span className="font-bold text-primary text-lg">{config.mvola_number}</span>. Une fois le transfert effectué, veuillez remplir le formulaire ci-dessous.
                </div>

                <form onSubmit={handleMvolaSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="ref">Référence de la transaction MVola</Label>
                    <Input 
                      id="ref" 
                      required 
                      value={refMvola} 
                      onChange={(e) => setRefMvola(e.target.value)} 
                      placeholder="Ex: 023456789"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="recu">Photo du reçu de paiement</Label>
                    <Input 
                      id="recu" 
                      type="file" 
                      accept="image/*,.pdf" 
                      required 
                      onChange={(e) => setRecuFile(e.target.files?.[0] || null)}
                    />
                  </div>
                  
                  <Button type="submit" className="w-full mt-4" disabled={isSubmittingPayment}>
                    {isSubmittingPayment && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Soumettre le reçu
                  </Button>
                </form>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const daysLeft = daysUntilExpiration(entreprise.date_expiration_abonnement);
  const isUrgent = daysLeft < 7;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
        <div>
          <h1 className="text-3xl font-bold">Tableau de bord</h1>
          <p className="text-muted-foreground">Bienvenue, {entreprise.nom_entreprise}</p>
        </div>
        
        <div className={`flex items-center gap-4 p-4 rounded-xl shadow-sm ${isUrgent ? 'bg-destructive/10 text-destructive border border-destructive/20' : 'bg-primary/10 text-primary border border-primary/20'}`}>
          <CalendarClock className="w-8 h-8" />
          <div>
            <div className="text-sm font-semibold uppercase tracking-wider opacity-80">Jours restants</div>
            <div className="text-2xl font-bold leading-none">{daysLeft} jours</div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="produits" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-[400px] mb-8">
          <TabsTrigger value="produits">Mes Produits</TabsTrigger>
          <TabsTrigger value="profil">Profil Entreprise</TabsTrigger>
        </TabsList>
        
        <TabsContent value="produits" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Catalogue ({produits.length})</h2>
            <Button onClick={() => openProductModal()}>
              <Plus className="w-4 h-4 mr-2" /> Ajouter un produit
            </Button>
          </div>
          
          {produits.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
                <Store className="w-12 h-12 mb-4 opacity-20" />
                <h3 className="text-lg font-medium text-foreground">Aucun produit</h3>
                <p className="mb-6">Vous n'avez pas encore ajouté de produits à votre vitrine.</p>
                <Button variant="outline" onClick={() => openProductModal()}>Commencer à vendre</Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {produits.map((p) => (
                <Card key={p.id_produit} className="overflow-hidden flex flex-col">
                  <div className="aspect-square w-full bg-muted relative">
                    <img src={p.image_url} alt={p.titre} className="w-full h-full object-cover" />
                  </div>
                  <CardHeader className="p-4 pb-2">
                    <div className="flex justify-between items-start">
                      <h3 className="font-semibold line-clamp-1" title={p.titre}>{p.titre}</h3>
                      <span className="font-bold text-primary">{p.prix_kmf.toLocaleString()} KMF</span>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 flex-1">
                    <p className="text-sm text-muted-foreground line-clamp-2">{p.description}</p>
                  </CardContent>
                  <CardFooter className="p-4 pt-0 gap-2">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => openProductModal(p)}>
                      <Edit className="w-4 h-4 mr-2" /> Modifier
                    </Button>
                    <Button variant="outline" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDeleteProduct(p.id_produit!, p.image_url)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="profil">
          <Card>
            <CardHeader>
              <CardTitle>Informations de la boutique</CardTitle>
              <CardDescription>Mettez à jour les détails visibles par vos clients.</CardDescription>
            </CardHeader>
            <form onSubmit={handleSaveProfile}>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="profileNom">Nom de l'entreprise *</Label>
                    <Input
                      id="profileNom"
                      required
                      value={profileNom}
                      onChange={(e) => setProfileNom(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="profileWhatsapp">Numéro WhatsApp *</Label>
                    <Input
                      id="profileWhatsapp"
                      required
                      value={profileWhatsapp}
                      onChange={(e) => setProfileWhatsapp(e.target.value)}
                      placeholder="+269..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="profileEmail">Email de contact</Label>
                    <Input
                      id="profileEmail"
                      type="email"
                      value={profileEmail}
                      onChange={(e) => setProfileEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="profileVille">Ville *</Label>
                    <Select value={profileVille} onValueChange={setProfileVille}>
                      <SelectTrigger id="profileVille">
                        <SelectValue placeholder="Sélectionnez une ville" />
                      </SelectTrigger>
                      <SelectContent>
                        {["Moroni", "Mutsamudu", "Fomboni", "Domoni", "Sima", "Ouani", "Mitsoudjé", "Mitsamiouli", "Bandamaji", "Ntsoudjini"].map((ville) => (
                          <SelectItem key={ville} value={ville}>{ville}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="profileAdresse">Adresse / Localisation</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="profileAdresse"
                        className="pl-9"
                        value={profileAdresse}
                        onChange={(e) => setProfileAdresse(e.target.value)}
                        placeholder="Ex : Volo-Volo, Moroni"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Catégorie principale *</Label>
                    <Select value={profileCategorie} onValueChange={setProfileCategorie}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionnez une catégorie" />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((categorie) => (
                          <SelectItem key={categorie} value={categorie}>{categorie}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="profileDescription">Description de l'activité *</Label>
                  <Textarea
                    id="profileDescription"
                    required
                    rows={4}
                    value={profileDescription}
                    onChange={(e) => setProfileDescription(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="profileLogo">Logo de l'entreprise</Label>
                  <div className="flex items-center gap-4">
                    {profileLogoPreview && (
                      <div className="w-20 h-20 rounded-full overflow-hidden border shrink-0">
                        <img src={profileLogoPreview} alt="Aperçu du logo" className="w-full h-full object-cover" />
                      </div>
                    )}
                    <Input
                      id="profileLogo"
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setProfileLogo(file);
                          setProfileLogoPreview(URL.createObjectURL(file));
                        }
                      }}
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" disabled={isSavingProfile}>
                  {isSavingProfile ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  Enregistrer les modifications
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Product Modal */}
      <Dialog open={isProductModalOpen} onOpenChange={setIsProductModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingProduct ? "Modifier le produit" : "Ajouter un produit"}</DialogTitle>
            <DialogDescription>
              Remplissez les détails du produit. Assurez-vous d'avoir une belle image.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveProduct} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="titre">Nom du produit *</Label>
                <Input id="titre" required value={prodTitre} onChange={(e) => setProdTitre(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="prix">Prix (en KMF) *</Label>
                <Input id="prix" type="number" min="0" required value={prodPrix} onChange={(e) => setProdPrix(e.target.value)} />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="cat">Catégorie</Label>
              <Select value={prodCat} onValueChange={setProdCat}>
                <SelectTrigger>
                  <SelectValue placeholder="Catégorie" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="desc">Description *</Label>
              <Textarea id="desc" required rows={3} value={prodDesc} onChange={(e) => setProdDesc(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Image du produit {!editingProduct && "*"}</Label>
              <div className="flex items-center gap-4">
                {prodImagePreview && (
                  <div className="w-24 h-24 rounded-lg overflow-hidden border">
                    <img src={prodImagePreview} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                )}
                <Input 
                  type="file" 
                  accept="image/*" 
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setProdImage(file);
                      setProdImagePreview(URL.createObjectURL(file));
                    }
                  }} 
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsProductModalOpen(false)}>Annuler</Button>
              <Button type="submit" disabled={isSavingProduct}>
                {isSavingProduct && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Enregistrer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
