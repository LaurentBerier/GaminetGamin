import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LangProvider } from "@/contexts/LangContext";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useEffect } from "react";
import HomePage from "@/pages/HomePage";
import BoutiquePage from "@/pages/BoutiquePage";
import ProduitPage from "@/pages/ProduitPage";
import AproposPage from "@/pages/AproposPage";
import ArtistesPage from "@/pages/ArtistesPage";
import ContactPage from "@/pages/ContactPage";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function RedirectToFr() {
  const [, setLocation] = useLocation();
  useEffect(() => {
    setLocation("/fr");
  }, [setLocation]);
  return null;
}

function AppLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-stone-50">
      <Header />
      <div className="flex-1">
        <Switch>
          <Route path="/" component={RedirectToFr} />
          <Route path="/fr" component={HomePage} />
          <Route path="/fr/boutique" component={BoutiquePage} />
          <Route path="/fr/boutique/:id" component={ProduitPage} />
          <Route path="/fr/apropos" component={AproposPage} />
          <Route path="/fr/artistes" component={ArtistesPage} />
          <Route path="/fr/contact" component={ContactPage} />
          <Route path="/en" component={HomePage} />
          <Route path="/en/shop" component={BoutiquePage} />
          <Route path="/en/shop/:id" component={ProduitPage} />
          <Route path="/en/about" component={AproposPage} />
          <Route path="/en/little-monsters" component={ArtistesPage} />
          <Route path="/en/contact" component={ContactPage} />
          <Route path="/es" component={HomePage} />
          <Route path="/es/tienda" component={BoutiquePage} />
          <Route path="/es/tienda/:id" component={ProduitPage} />
          <Route path="/es/nosotros" component={AproposPage} />
          <Route path="/es/pequenos-monstruos" component={ArtistesPage} />
          <Route path="/es/contacto" component={ContactPage} />
          <Route component={NotFound} />
        </Switch>
      </div>
      <Footer />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <LangProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <AppLayout />
          </WouterRouter>
        </LangProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
