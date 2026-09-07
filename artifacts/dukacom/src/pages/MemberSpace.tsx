import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { updateUserRole } from "@/lib/firestore-helpers";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { User, LogOut, Store, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function MemberSpace() {
  const { currentUser, userDoc, logout, refreshUserDoc, loading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isUpgrading, setIsUpgrading] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (!currentUser) {
        setLocation("/connexion");
      } else if (userDoc?.role === "vendeur") {
        setLocation("/tableau-de-bord");
      }
    }
  }, [currentUser, userDoc, loading, setLocation]);

  const handleLogout = async () => {
    await logout();
    setLocation("/");
  };

  const handleUpgrade = async () => {
    if (!currentUser) return;
    setIsUpgrading(true);
    try {
      await updateUserRole(currentUser.uid, "vendeur");
      await refreshUserDoc();
      setLocation("/configuration-entreprise");
      toast({
        title: "Félicitations !",
        description: "Vous êtes maintenant un vendeur. Configurez votre entreprise.",
      });
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Erreur",
        description: "Impossible de modifier votre rôle.",
        variant: "destructive",
      });
    } finally {
      setIsUpgrading(false);
    }
  };

  if (loading || !currentUser || userDoc?.role !== "visiteur") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-2xl">
      <h1 className="text-3xl font-bold mb-8 text-center">Mon Espace</h1>
      
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              Profil Utilisateur
            </CardTitle>
            <CardDescription>Vos informations personnelles</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="text-sm text-muted-foreground mb-1">Nom complet</div>
              <div className="font-medium text-lg">{userDoc.nom}</div>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="text-sm text-muted-foreground mb-1">Adresse email</div>
              <div className="font-medium">{userDoc.email}</div>
            </div>
            
            <div className="pt-4 flex justify-end">
              <Button variant="outline" onClick={handleLogout} className="gap-2 text-destructive hover:text-destructive">
                <LogOut className="w-4 h-4" />
                Se déconnecter
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <Store className="w-5 h-5" />
              Vous avez une entreprise ?
            </CardTitle>
            <CardDescription>
              Rejoignez DukaCom en tant que vendeur pour publier vos produits et atteindre des milliers de clients locaux.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={handleUpgrade} 
              disabled={isUpgrading}
              className="w-full text-lg py-6 shadow-md hover-elevate-2 transition-all"
            >
              {isUpgrading ? (
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              ) : (
                <span className="mr-2">🚀</span>
              )}
              Devenir une Entreprise
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
