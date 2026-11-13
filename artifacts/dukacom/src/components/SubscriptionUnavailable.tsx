import { Store } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function SubscriptionUnavailable() {
  return (
    <main className="container mx-auto px-4 py-20 text-center">
      <Store className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
      <h1 className="mb-3 text-2xl font-bold">
        Boutique temporairement indisponible
      </h1>
      <p className="mx-auto mb-3 max-w-xl text-muted-foreground">
        L’abonnement de cette boutique est arrivé à échéance. Sa vitrine et ses
        produits seront de nouveau visibles après le renouvellement.
      </p>
      <p className="mx-auto mb-6 max-w-xl text-sm text-muted-foreground">
        Le propriétaire peut se connecter à son tableau de bord pour renouveler
        son abonnement.
      </p>
      <Button asChild>
        <Link href="/">Retour au catalogue</Link>
      </Button>
    </main>
  );
}
