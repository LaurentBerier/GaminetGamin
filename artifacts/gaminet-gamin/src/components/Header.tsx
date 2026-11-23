import { useLocation, useSearch } from "wouter";
import { useLang } from "@/contexts/LangContext";
import { SiteHeader } from "../../../gaminet-gamin-vote/app/components/SiteHeader";
import { useLayoutEffect, useRef } from "react";
import { CharityCommitment } from "./CharityCommitment";

export function Header() {
  const { lang, setLang } = useLang();
  const [location, setLocation] = useLocation();
  const search = useSearch();
  const masthead = useRef<HTMLDivElement>(null);
  const isAdmin = location.replace(/\/$/, '') === '/admin';

  useLayoutEffect(() => {
    const element = masthead.current;
    if (!element) return;
    const updateHeight = () => document.documentElement.style.setProperty('--site-masthead-height', `${element.getBoundingClientRect().height}px`);
    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(element);
    return () => { observer.disconnect(); document.documentElement.style.removeProperty('--site-masthead-height'); };
  }, []);

  return (
    <div ref={masthead} className="sticky top-0 z-50" data-testid="site-masthead">
    <SiteHeader
      sticky={false}
      lang={lang}
      location={location + (search ? "?" + search : "")}
      onLanguageChange={setLang}
      onNavigate={(href) => {
        const language = href.split("/")[1];
        if (language === "fr" || language === "en" || language === "es")
          setLang(language);
        setLocation(href);
        window.scrollTo({ top: 0, behavior: "instant" });
      }}
    />
    {!isAdmin && <CharityCommitment compact />}
    </div>
  );
}
