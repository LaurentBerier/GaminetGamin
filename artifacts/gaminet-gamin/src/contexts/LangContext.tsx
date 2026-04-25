import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useLocation } from "wouter";
import fr from "@/locales/fr.json";
import en from "@/locales/en.json";
import es from "@/locales/es.json";

export type Lang = "fr" | "en" | "es";

type Translations = typeof fr;

const translations: Record<Lang, Translations> = { fr, en, es };

interface LangContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: Translations;
  translateField: (field: { fr: string; en: string; es: string }) => string;
}

const LangContext = createContext<LangContextType | null>(null);

function detectLangFromPath(pathname: string): Lang | null {
  if (pathname.startsWith("/fr")) return "fr";
  if (pathname.startsWith("/en")) return "en";
  if (pathname.startsWith("/es")) return "es";
  return null;
}

function detectBrowserLang(): Lang {
  const saved = localStorage.getItem("gg_lang") as Lang | null;
  if (saved && ["fr", "en", "es"].includes(saved)) return saved;
  const nav = navigator.language.toLowerCase();
  if (nav.startsWith("fr")) return "fr";
  if (nav.startsWith("es")) return "es";
  return "fr";
}

export function LangProvider({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [lang, setLangState] = useState<Lang>(() => {
    const fromPath = detectLangFromPath(window.location.pathname);
    if (fromPath) return fromPath;
    return detectBrowserLang();
  });

  useEffect(() => {
    const fromPath = detectLangFromPath(location);
    if (fromPath && fromPath !== lang) {
      setLangState(fromPath);
      localStorage.setItem("gg_lang", fromPath);
    }
  }, [location]);

  const setLang = (newLang: Lang) => {
    setLangState(newLang);
    localStorage.setItem("gg_lang", newLang);
  };

  const t = translations[lang];

  const translateField = (field: { fr: string; en: string; es: string }) => {
    return field[lang];
  };

  return (
    <LangContext.Provider value={{ lang, setLang, t, translateField }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("useLang must be used inside LangProvider");
  return ctx;
}
