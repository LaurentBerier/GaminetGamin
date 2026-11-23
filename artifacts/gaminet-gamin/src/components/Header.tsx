import { useLocation, useSearch } from "wouter";
import { useLang } from "@/contexts/LangContext";
import { SiteHeader } from "../../../gaminet-gamin-vote/app/components/SiteHeader";

export function Header() {
  const { lang, setLang } = useLang();
  const [location, setLocation] = useLocation();
  const search = useSearch();
  return (
    <SiteHeader
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
  );
}
