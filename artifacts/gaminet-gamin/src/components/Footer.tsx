import { useLang } from "@/contexts/LangContext";
import { Link } from "wouter";
import { Instagram } from "lucide-react";

export function Footer() {
  const { lang, t } = useLang();
  const year = new Date().getFullYear();

  const homeRoute = lang === "fr" ? "/fr" : lang === "en" ? "/en" : "/es";

  return (
    <footer className="bg-stone-900 text-stone-300 mt-24" data-testid="footer">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          <div>
            <div className="flex flex-col leading-none mb-4">
              <span className="font-black text-stone-100 text-xl tracking-tight uppercase" style={{ fontFamily: "'Nunito', sans-serif" }}>
                GAMINET GAMIN
              </span>
              <span className="font-black text-gg-gold text-lg tracking-widest" style={{ fontFamily: "'Nunito', sans-serif" }}>
                GG
              </span>
            </div>
            <p className="text-stone-400 text-sm leading-relaxed max-w-xs">
              {t.home.subslogan}
            </p>
          </div>

          <div>
            <h4 className="text-stone-100 font-semibold text-sm uppercase tracking-widest mb-4">Navigation</h4>
            <ul className="space-y-2">
              {[
                { href: lang === "fr" ? "/fr/boutique" : lang === "en" ? "/en/shop" : "/es/tienda", label: t.nav.boutique },
                { href: lang === "fr" ? "/fr/artistes" : lang === "en" ? "/en/little-monsters" : "/es/pequenos-monstruos", label: t.nav.artistes },
                { href: lang === "fr" ? "/fr/apropos" : lang === "en" ? "/en/about" : "/es/nosotros", label: t.nav.apropos },
                { href: lang === "fr" ? "/fr/contact" : lang === "en" ? "/en/contact" : "/es/contacto", label: t.nav.contact },
              ].map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-stone-400 hover:text-stone-100 text-sm transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-stone-100 font-semibold text-sm uppercase tracking-widest mb-4">Info</h4>
            <ul className="space-y-2">
              <li><span className="text-stone-400 text-sm cursor-pointer hover:text-stone-100 transition-colors">{t.footer.livraison}</span></li>
              <li><span className="text-stone-400 text-sm cursor-pointer hover:text-stone-100 transition-colors">{t.footer.faq}</span></li>
              <li><span className="text-stone-400 text-sm cursor-pointer hover:text-stone-100 transition-colors">{t.footer.politique}</span></li>
            </ul>
            <div className="mt-6 flex items-center gap-3">
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="text-stone-400 hover:text-stone-100 transition-colors flex items-center gap-2 text-sm" data-testid="instagram-link">
                <Instagram size={16} />
                {t.contact.instagram}
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-stone-800 mt-12 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-stone-500 text-xs">
            © {year} Gaminet Gamin GG — {t.footer.droits}
          </p>
          <p className="text-stone-500 text-xs">{t.footer.fait_avec}</p>
        </div>
      </div>
    </footer>
  );
}
