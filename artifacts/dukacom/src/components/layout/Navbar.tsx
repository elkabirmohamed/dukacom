import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut, User, Store, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

function Logo() {
  return (
    <div className="flex items-center gap-2">
      <svg
        width="32"
        height="32"
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
      >
        <rect x="6" y="2" width="20" height="28" rx="4" fill="#1B3A6B" />
        <rect x="8" y="4" width="16" height="20" rx="2" fill="white" />
        <path
          d="M11 12h10l-1 8H12l-1-8z"
          fill="#25D366"
          stroke="#25D366"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path d="M13 10v2a3 3 0 006 0v-2" stroke="#25D366" strokeWidth="2" strokeLinecap="round" />
        <circle cx="16" cy="27" r="1.5" fill="white" />
      </svg>
      <span className="font-bold text-xl tracking-tight text-primary">DukaCom</span>
    </div>
  );
}

export function Navbar() {
  const { currentUser, userDoc, logout } = useAuth();
  const [, setLocation] = useLocation();

  const handleLogout = async () => {
    await logout();
    setLocation("/");
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center">
          <Logo />
        </Link>

        <nav className="flex items-center gap-2 sm:gap-4">
          {!currentUser ? (
            <>
              <Button variant="ghost" asChild className="hidden sm:inline-flex">
                <Link href="/connexion">Connexion</Link>
              </Button>
              <Button asChild>
                <Link href="/inscription">S'inscrire</Link>
              </Button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              {userDoc?.isAdmin && (
                <Button variant="ghost" size="icon" asChild title="Administration">
                  <Link href="/admin">
                    <ShieldCheck className="w-5 h-5 text-destructive" />
                  </Link>
                </Button>
              )}
              
              {userDoc?.role === "vendeur" ? (
                <Button variant="ghost" size="sm" asChild className="gap-2">
                  <Link href="/tableau-de-bord">
                    <Store className="w-4 h-4" />
                    <span className="hidden sm:inline">Tableau de bord</span>
                  </Link>
                </Button>
              ) : (
                <Button variant="ghost" size="sm" asChild className="gap-2">
                  <Link href="/espace-membre">
                    <User className="w-4 h-4" />
                    <span className="hidden sm:inline">Mon Espace</span>
                  </Link>
                </Button>
              )}
              <Button variant="ghost" size="icon" onClick={handleLogout} title="Se déconnecter">
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
