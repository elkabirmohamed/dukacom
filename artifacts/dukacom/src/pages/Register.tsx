import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Store, User, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Register() {
  const [role, setRole] = useState<"visiteur" | "vendeur" | null>(null);
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { register } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!role) return;
    
    setIsSubmitting(true);
    try {
      await register(email, nom, password, role);
      if (role === "vendeur") {
        setLocation("/configuration-entreprise");
      } else {
        setLocation("/");
      }
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Erreur d'inscription",
        description: err.message || "Une erreur est survenue lors de la création du compte.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 py-12 bg-gray-50/50">
      <Card className="w-full max-w-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Créer un compte</CardTitle>
          <CardDescription>
            Rejoignez la plateforme DukaCom
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <button
              type="button"
              className={cn(
                "flex flex-col items-center gap-3 p-6 rounded-xl border-2 transition-all",
                role === "visiteur" 
                  ? "border-primary bg-primary/5 text-primary" 
                  : "border-muted hover:border-primary/50 text-muted-foreground hover:text-foreground"
              )}
              onClick={() => setRole("visiteur")}
            >
              <User className="w-10 h-10" />
              <div className="font-semibold">Je suis un Utilisateur</div>
              <div className="text-xs text-center opacity-80">Pour explorer et acheter des produits locaux</div>
            </button>
            <button
              type="button"
              className={cn(
                "flex flex-col items-center gap-3 p-6 rounded-xl border-2 transition-all",
                role === "vendeur" 
                  ? "border-primary bg-primary/5 text-primary" 
                  : "border-muted hover:border-primary/50 text-muted-foreground hover:text-foreground"
              )}
              onClick={() => setRole("vendeur")}
            >
              <Store className="w-10 h-10" />
              <div className="font-semibold">Je suis une Entreprise</div>
              <div className="text-xs text-center opacity-80">Pour publier et vendre mes produits</div>
            </button>
          </div>

          {role && (
            <form onSubmit={handleSubmit} className="space-y-4 animate-in fade-in zoom-in-95">
              <div className="space-y-2">
                <Label htmlFor="nom">Nom complet {role === "vendeur" && "ou Nom du responsable"}</Label>
                <Input 
                  id="nom" 
                  required 
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="vous@exemple.com" 
                  required 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Mot de passe</Label>
                <Input 
                  id="password" 
                  type="password" 
                  required 
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full mt-6" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                S'inscrire comme {role === "visiteur" ? "Visiteur" : "Vendeur"}
              </Button>
            </form>
          )}
        </CardContent>
        <CardFooter className="justify-center border-t p-6">
          <p className="text-sm text-muted-foreground">
            Déjà un compte ?{" "}
            <Link href="/connexion" className="text-primary hover:underline">
              Se connecter
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
