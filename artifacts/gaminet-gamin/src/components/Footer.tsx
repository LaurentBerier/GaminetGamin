import { useLang } from "@/contexts/LangContext";
import { Link } from "wouter";
import { Instagram } from "lucide-react";
import { ArtworkParade } from "../../../gaminet-gamin-vote/app/components/ArtworkAccent";

export function Footer() {
  const { lang, t } = useLang();
  const year = new Date().getFullYear();

  const homeRoute = lang === "fr" ? "/fr" : lang === "en" ? "/en" : "/es";

  return (
    <footer className="relative mt-32 bg-stone-900 text-stone-300" data-testid="footer">
      <div className="relative -top-16 -mb-16 sm:-top-20 sm:-mb-20"><ArtworkParade /></div>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          <div>
            <Link
              href={homeRoute}
              onClick={(event) => {
                if (!event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey && event.button === 0) {
                  window.scrollTo({ top: 0, behavior: "instant" });
                }
              }}
              className="mb-5 inline-block rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4"
            >
              <img
                src="/brand/gaminet-gamin-blanc-v1-400.png"
                srcSet="/brand/gaminet-gamin-blanc-v1-400.png 400w, /brand/gaminet-gamin-blanc-v1-800.png 800w"
                sizes="208px"
                width={1448}
                height={1086}
                alt="Gaminet Gamin"
                className="block h-auto w-52"
                loading="lazy"
                decoding="async"
              />
            </Link>
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
