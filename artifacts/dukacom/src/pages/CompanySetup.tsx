import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Timestamp, getEntrepriseByOwner } from "@/lib/firestore-helpers";
import { uploadToCloudinary } from "@/lib/storage-helpers";
import { addDoc, collection } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UploadCloud, Store } from "lucide-react";

const VILLES = ["Moroni", "Mutsamudu", "Fomboni", "Domoni", "Sima", "Ouani", "Mitsoudjé", "Mitsamiouli", "Bandamaji", "Ntsoudjini"];
const CATEGORIES = ["Alimentation", "Vêtements", "Électronique", "Meubles", "Santé & Beauté", "Agriculture", "Construction", "Services", "Automobile", "Divers"];

export default function CompanySetup() {
  const { currentUser, userDoc, loading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [nom, setNom] = useState("");
  const [description, setDescription] = useState("");
  const [whatsapp, setWhatsapp] = useState("+269");
  const [ville, setVille] = useState("");
  const [adresse, setAdresse] = useState("");
  const [categorie, setCategorie] = useState("");
  const [emailContact, setEmailContact] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>("");
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    async function checkExisting() {
      if (!currentUser) {
        setLocation("/connexion");
        return;
      }
      if (userDoc?.role !== "vendeur") {
        setLocation("/espace-membre");
        return;
      }
      
      try {
        const ent = await getEntrepriseByOwner(currentUser.uid);
        if (ent) {
          setLocation("/tableau-de-bord");
        } else {
          setIsChecking(false);
        }
      } catch (err) {
        console.error(err);
        setIsChecking(false);
      }
    }
    
    if (!loading) {
      checkExisting();
    }
  }, [currentUser, userDoc, loading, setLocation]);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  /** Rejette après `ms` millisecondes avec un message clair. */
  function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(`Timeout: ${label} a dépassé ${ms / 1000}s`)), ms)
      ),
    ]);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    if (!ville || !categorie) {
      toast({ title: "Champs manquants", description: "Veuillez sélectionner une ville et une catégorie.", variant: "destructive" });
      return;
    }

    if (!logoFile) {
      toast({ title: "Logo manquant", description: "Veuillez uploader un logo avant de continuer.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    let logoUrl = "";

    try {
      // Étape 1 — Upload du logo (timeout 30 s)
      try {
        const logoPath = `logos/${currentUser.uid}/${Date.now()}`;
        logoUrl = await withTimeout(
          uploadToCloudinary(logoFile, logoPath),
          30_000,
          "upload du logo"
        );
      } catch (uploadErr: any) {
        console.error("Erreur upload logo :", uploadErr);
        toast({
          title: "Erreur d'upload",
          description: `Impossible d'envoyer le logo vers Cloudinary : ${uploadErr?.message ?? "erreur réseau"}. Vérifiez le preset ml_default et la connexion réseau.`,
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      // Étape 2 — Calcul des dates d'essai (60 jours)
      const trialStartDate = Timestamp.now();
      const trialEndDate = Timestamp.fromMillis(Date.now() + 60 * 24 * 60 * 60 * 1000);

      // Étape 3 — Enregistrement Firestore (timeout 15 s)
      try {
        await withTimeout(
          addDoc(collection(db, "entreprises"), {
            name: nom,
            telephone: whatsapp,
            email: emailContact || currentUser.email || "",
            logo: logoUrl,
            description,
            ville,
            adresse,
            categorie,
            userId: currentUser.uid,
            status: "active",
            isActive: true,
            trialStartDate,
            trialEndDate,
          }),
          15_000,
          "enregistrement Firestore"
        );
      } catch (firestoreErr: any) {
        console.error("Erreur Firestore :", firestoreErr);
        toast({
          title: "Erreur d'enregistrement",
          description: `Firestore n'a pas accepté le document : ${firestoreErr?.message ?? "permission refusée ou timeout"}. Vérifiez les règles Firestore.`,
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      toast({
        title: "Entreprise créée !",
        description: "Bienvenue sur votre tableau de bord. Vous bénéficiez de 60 jours d'essai gratuit.",
      });
      setLocation("/tableau-de-bord");
    } catch (err: any) {
      console.error("Erreur inattendue :", err);
      toast({
        title: "Erreur inattendue",
        description: err?.message ?? "Une erreur inconnue s'est produite.",
        variant: "destructive",
      });
      setIsSubmitting(false);
    }
  };

  if (loading || isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Store className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-3xl">Configuration de votre entreprise</CardTitle>
          <CardDescription className="text-lg">
            Remplissez les informations de votre boutique pour commencer à vendre.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-1 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="nom">Nom de l'entreprise *</Label>
                  <Input id="nom" required value={nom} onChange={(e) => setNom(e.target.value)} />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="whatsapp">Numéro WhatsApp *</Label>
                  <Input 
                    id="whatsapp" 
                    required 
                    value={whatsapp} 
                    onChange={(e) => setWhatsapp(e.target.value)} 
                    placeholder="+2693... ou +2694..."
                  />
                  <p className="text-xs text-muted-foreground">Format international: +269...</p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="emailContact">Email de contact</Label>
                  <Input id="emailContact" type="email" value={emailContact} onChange={(e) => setEmailContact(e.target.value)} />
                </div>
              </div>
              
              <div className="flex flex-col items-center justify-start gap-4">
                <Label className="self-start md:self-center">Logo de l'entreprise *</Label>
                <div className="relative w-32 h-32 rounded-full border-2 border-dashed flex items-center justify-center overflow-hidden bg-muted/50 group hover:border-primary transition-colors">
                  {logoPreview ? (
                    <img src={logoPreview} alt="Logo preview" className="w-full h-full object-cover" />
                  ) : (
                    <UploadCloud className="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors" />
                  )}
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                    onChange={handleLogoChange}
                  />
                </div>
                <p className="text-xs text-muted-foreground text-center max-w-[12rem]">
                  Cliquez pour sélectionner une image
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description de votre activité *</Label>
              <Textarea 
                id="description" 
                required 
                rows={4}
                value={description} 
                onChange={(e) => setDescription(e.target.value)} 
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Ville *</Label>
                <Select value={ville} onValueChange={setVille}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionnez une ville" />
                  </SelectTrigger>
                  <SelectContent>
                    {VILLES.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="adresse">Adresse / Localisation</Label>
                <Input
                  id="adresse"
                  value={adresse}
                  onChange={(e) => setAdresse(e.target.value)}
                  placeholder="Ex : Volo-Volo, Moroni"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Catégorie principale *</Label>
                <Select value={categorie} onValueChange={setCategorie}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionnez une catégorie" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full text-lg py-6" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="w-5 h-5 mr-2 animate-spin" />}
              Créer mon entreprise
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
