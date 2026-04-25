import { useLang, type Lang } from "@/contexts/LangContext";
import { useLocation } from "wouter";

const routeEquivalents: Record<string, Record<Lang, string>> = {
  home: { fr: "/fr", en: "/en", es: "/es" },
  boutique: { fr: "/fr/boutique", en: "/en/shop", es: "/es/tienda" },
  apropos: { fr: "/fr/apropos", en: "/en/about", es: "/es/nosotros" },
  artistes: { fr: "/fr/artistes", en: "/en/little-monsters", es: "/es/pequenos-monstruos" },
  contact: { fr: "/fr/contact", en: "/en/contact", es: "/es/contacto" },
};

function getEquivalentRoute(currentPath: string, targetLang: Lang): string {
  for (const [, routes] of Object.entries(routeEquivalents)) {
    for (const [, path] of Object.entries(routes)) {
      if (currentPath === path || currentPath.startsWith(path + "/")) {
        return routes[targetLang];
      }
    }
  }
  return routeEquivalents.home[targetLang];
}

export function LanguageSelector() {
  const { lang, setLang, t } = useLang();
  const [location, setLocation] = useLocation();
  const langs: Lang[] = ["fr", "en", "es"];

  const handleLangChange = (newLang: Lang) => {
    if (newLang === lang) return;
    setLang(newLang);
    const target = getEquivalentRoute(location, newLang);
    setLocation(target);
  };

  return (
    <div className="flex items-center gap-1" data-testid="lang-selector">
      {langs.map((l) => (
        <button
          key={l}
          onClick={() => handleLangChange(l)}
          data-testid={`lang-btn-${l}`}
          className={`px-2 py-1 rounded text-sm font-semibold tracking-wide transition-all duration-200 ${
            lang === l
              ? "bg-gg-gold text-stone-900"
              : "text-stone-500 hover:text-stone-900 hover:bg-stone-100"
          }`}
          aria-label={t.lang_selector[l]}
        >
          {t.lang_selector[l]}
        </button>
      ))}
    </div>
  );
}
