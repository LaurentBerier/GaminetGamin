import { Link, useLocation } from "wouter";
import { useLang } from "@/contexts/LangContext";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useState } from "react";
import { Menu, X, ShoppingBag } from "lucide-react";

const routeMap = {
  fr: {
    boutique: "/fr/boutique",
    apropos: "/fr/apropos",
    artistes: "/fr/artistes",
    contact: "/fr/contact",
    p_tits_artistes: "/fr/p-tits-artistes",
  },
  en: {
    boutique: "/en/shop",
    apropos: "/en/about",
    artistes: "/en/little-monsters",
    contact: "/en/contact",
    p_tits_artistes: "/en/little-artists",
  },
  es: {
    boutique: "/es/tienda",
    apropos: "/es/nosotros",
    artistes: "/es/pequenos-monstruos",
    contact: "/es/contacto",
    p_tits_artistes: "/es/pequenos-artistas",
  },
};

export function Header() {
  const { lang, t } = useLang();
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const routes = routeMap[lang];

  const homeRoute = lang === "fr" ? "/fr" : lang === "en" ? "/en" : "/es";

  const navLinks = [
    { href: routes.boutique, label: t.nav.boutique },
    { href: routes.p_tits_artistes, label: t.nav.p_tits_artistes, highlight: true },
    { href: routes.artistes, label: t.nav.artistes },
    { href: routes.apropos, label: t.nav.apropos },
    { href: routes.contact, label: t.nav.contact },
  ];

  return (
    <header className="sticky top-0 z-50 bg-stone-50/95 backdrop-blur-sm border-b border-stone-200" data-testid="header">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          <Link href={homeRoute} data-testid="logo-link">
            <div className="flex flex-col leading-none cursor-pointer hover:opacity-80 transition-opacity">
              <span className="font-black text-stone-900 text-lg tracking-tight uppercase" style={{ fontFamily: "'Nunito', sans-serif" }}>
                GAMINET GAMIN
              </span>
              <span className="font-black text-gg-gold text-base tracking-widest" style={{ fontFamily: "'Nunito', sans-serif" }}>
                GG
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-6" data-testid="nav-desktop">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-medium tracking-wide transition-colors duration-200 ${
                  location === link.href
                    ? "text-stone-900 border-b-2 border-gg-gold pb-0.5"
                    : link.highlight
                    ? "text-gg-green hover:text-stone-900 font-bold"
                    : "text-stone-500 hover:text-stone-900"
                }`}
                data-testid={`nav-link-${link.label.toLowerCase().replace(/[^a-z]/g, "-")}`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <LanguageSelector />
            <button
              className="hidden md:flex items-center gap-2 bg-stone-900 text-stone-50 px-3 py-1.5 rounded-full text-sm font-medium hover:bg-stone-700 transition-colors"
              data-testid="cart-button"
            >
              <ShoppingBag size={14} />
            </button>
            <button
              className="md:hidden p-2 rounded-lg hover:bg-stone-100 transition-colors"
              onClick={() => setMobileOpen(!mobileOpen)}
              data-testid="mobile-menu-toggle"
              aria-label="Menu"
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <nav className="md:hidden border-t border-stone-200 py-4 flex flex-col gap-3" data-testid="nav-mobile">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={`text-sm font-medium py-2 px-2 rounded-lg transition-colors ${
                  location === link.href
                    ? "text-stone-900 bg-amber-50"
                    : link.highlight
                    ? "text-gg-green font-bold hover:bg-stone-100"
                    : "text-stone-600 hover:text-stone-900 hover:bg-stone-100"
                }`}
                data-testid={`mobile-nav-${link.label}`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        )}
      </div>
    </header>
  );
}
