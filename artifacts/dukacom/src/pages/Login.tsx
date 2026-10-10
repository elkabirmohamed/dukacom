import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);
  const { login, requestPasswordReset } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await login(email, password);
      setLocation("/");
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Erreur de connexion",
        description: "Email ou mot de passe incorrect.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSendingReset(true);
    try {
      await requestPasswordReset(resetEmail.trim());
      setEmail(resetEmail.trim());
      setIsResetDialogOpen(false);
      toast({
        title: "Demande envoyée",
        description:
          "Si un compte correspond à cette adresse, un lien de réinitialisation a été envoyé.",
      });
    } catch (err) {
      console.error("Échec de l’envoi du lien de réinitialisation :", err);
      toast({
        title: "Envoi impossible",
        description: "Vérifiez l’adresse e-mail et réessayez.",
        variant: "destructive",
      });
    } finally {
      setIsSendingReset(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 bg-gray-50/50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Bon retour !</CardTitle>
          <CardDescription>
            Connectez-vous pour accéder à votre espace
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
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
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="password">Mot de passe</Label>
                <Dialog
                  open={isResetDialogOpen}
                  onOpenChange={(open) => {
                    setIsResetDialogOpen(open);
                    if (open) setResetEmail(email);
                  }}
                >
                  <DialogTrigger asChild>
                    <button
                      type="button"
                      className="text-sm text-primary hover:underline"
                    >
                      Mot de passe oublié ?
                    </button>
                  </DialogTrigger>
                  <DialogContent>
                    <form onSubmit={handlePasswordReset} className="space-y-5">
                      <DialogHeader>
                        <DialogTitle>Réinitialiser votre mot de passe</DialogTitle>
                        <DialogDescription>
                          Saisissez l’adresse e-mail associée à votre compte. Nous vous
                          enverrons un lien sécurisé pour choisir un nouveau mot de passe.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-2">
                        <Label htmlFor="reset-email">Adresse e-mail</Label>
                        <Input
                          id="reset-email"
                          type="email"
                          autoComplete="email"
                          placeholder="vous@exemple.com"
                          required
                          value={resetEmail}
                          onChange={(event) => setResetEmail(event.target.value)}
                        />
                      </div>
                      <DialogFooter>
                        <Button type="submit" disabled={isSendingReset}>
                          {isSendingReset && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          )}
                          Envoyer le lien
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
              <Input 
                id="password" 
                type="password" 
                required 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Se connecter
            </Button>
            <p className="text-sm text-center text-muted-foreground">
              Pas encore de compte ?{" "}
              <Link href="/inscription" className="text-primary hover:underline">
                S'inscrire
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
