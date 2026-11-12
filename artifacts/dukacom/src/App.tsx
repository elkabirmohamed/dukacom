import { lazy, Suspense } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import { AuthProvider } from '@/contexts/AuthContext';
import { Navbar } from '@/components/layout/Navbar';
import { Loader2 } from 'lucide-react';

// Pages
import Home from '@/pages/Home';
const Login = lazy(() => import('@/pages/Login'));
const Register = lazy(() => import('@/pages/Register'));
const MemberSpace = lazy(() => import('@/pages/MemberSpace'));
const CompanySetup = lazy(() => import('@/pages/CompanySetup'));
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const Admin = lazy(() => import('@/pages/Admin'));
const ShopPage = lazy(() => import('@/pages/ShopPage'));
const ProductPage = lazy(() => import('@/pages/ProductPage'));

const queryClient = new QueryClient();

function Router() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center" role="status" aria-label="Chargement de la page">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/boutique/:id" component={ShopPage} />
        <Route path="/produit/:id" component={ProductPage} />
        <Route path="/connexion" component={Login} />
        <Route path="/inscription" component={Register} />
        <Route path="/espace-membre" component={MemberSpace} />
        <Route path="/configuration-entreprise" component={CompanySetup} />
        <Route path="/tableau-de-bord" component={Dashboard} />
        <Route path="/admin" component={Admin} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
            <div className="min-h-screen bg-background text-foreground flex flex-col">
              <Navbar />
              <main className="flex-1 flex flex-col">
                <Router />
              </main>
            </div>
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
