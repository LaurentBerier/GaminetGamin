"use client";

import { useEffect, useState } from "react";
import type { MouseEvent } from "react";

type Lang = "fr" | "en" | "es";
const routes = {
  fr: ["/fr", "/fr/boutique", "/fr/artistes", "/fr/apropos", "/fr/contact"],
  en: ["/en", "/en/shop", "/en/little-monsters", "/en/about", "/en/contact"],
  es: [
    "/es",
    "/es/tienda",
    "/es/pequenos-monstruos",
    "/es/nosotros",
    "/es/contacto",
  ],
};
const labels = {
  fr: [
    "Accueil",
    "La collection",
    "Les p’tits artistes",
    "Notre histoire",
    "Contact",
    "Connexion",
  ],
  en: [
    "Home",
    "The collection",
    "Little artists",
    "Our story",
    "Contact",
    "Log in",
  ],
  es: [
    "Inicio",
    "La colección",
    "Pequeños artistas",
    "Nuestra historia",
    "Contacto",
    "Conectarse",
  ],
};

export function SiteHeader({
  lang = "fr",
  location = "/fr/boutique",
  standalone = false,
  onNavigate,
  onLanguageChange,
}: {
  lang?: Lang;
  location?: string;
  standalone?: boolean;
  onNavigate?: (href: string) => void;
  onLanguageChange?: (lang: Lang) => void;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const path = location.split("?")[0].replace(/\/$/, "") || "/";
  const currentRoute = Object.values(routes)
    .flatMap((paths) => paths.map((route, index) => ({ route, index })))
    .sort((a, b) => b.route.length - a.route.length)
    .find(({ route }) => path === route || path.startsWith(route + "/"));
  const currentIndex = currentRoute?.index ?? 0;
  const origin = standalone ? "https://gaminetgamin.com" : "";
  const links = routes[lang]
    .slice(1)
    .map((href, index) => ({
      href: standalone && index === 0 ? "/" : origin + href,
      label: labels[lang][index + 1],
      active: standalone
        ? index === 0
        : currentIndex === index + 1 && path !== "/admin",
    }));

  useEffect(() => {
    setMobileOpen(false);
  }, [location, lang]);

  function navigate(event: MouseEvent<HTMLAnchorElement>) {
    if (
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      event.button !== 0
    )
      return;
    setMobileOpen(false);
    if (onNavigate) {
      event.preventDefault();
      onNavigate(event.currentTarget.getAttribute("href")!);
    }
  }
  function languageHref(target: Lang) {
    return (
      origin +
      (path === "/admin"
        ? "/admin"
        : routes[target][currentIndex] +
          (currentRoute ? path.slice(currentRoute.route.length) : "")) +
      (location.includes("?") ? location.slice(location.indexOf("?")) : "")
    );
  }

  return (
    <header
      className="sticky top-0 z-50 border-b border-stone-200 bg-stone-50/95 text-stone-900 backdrop-blur-sm"
      data-testid="header"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex h-20 items-center justify-between gap-3">
          <a
            href={origin + routes[lang][0]}
            onClick={navigate}
            aria-label={labels[lang][0] + " Gaminet Gamin"}
            className="shrink-0 font-black uppercase leading-tight tracking-tight"
            data-testid="logo-link"
          >
            Gaminet Gamin
            <span className="mt-1 block text-sm tracking-[0.3em] text-[#a87739]">
              GG
            </span>
          </a>
          <nav
            className="hidden items-center gap-5 lg:flex"
            aria-label="Navigation principale"
            data-testid="nav-desktop"
          >
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={navigate}
                aria-current={link.active ? "page" : undefined}
                className={
                  "border-b-2 py-2 text-sm font-bold transition-colors " +
                  (link.active
                    ? "border-[#a87739] text-stone-900"
                    : "border-transparent text-stone-600 hover:text-stone-900")
                }
              >
                {link.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <nav
              className="hidden items-center gap-1 sm:flex"
              aria-label="Langues"
              data-testid="lang-selector"
            >
              {(["fr", "en", "es"] as const).map((target) => (
                <a
                  key={target}
                  href={languageHref(target)}
                  onClick={(event) => {
                    if (
                      !event.metaKey &&
                      !event.ctrlKey &&
                      !event.shiftKey &&
                      !event.altKey &&
                      event.button === 0
                    )
                      onLanguageChange?.(target);
                    navigate(event);
                  }}
                  lang={target}
                  aria-label={
                    { fr: "Français", en: "English", es: "Español" }[target]
                  }
                  aria-current={lang === target ? "true" : undefined}
                  className={
                    "rounded px-2 py-1 text-sm font-bold " +
                    (lang === target
                      ? "bg-[#e5bd75]"
                      : "text-stone-600 hover:bg-stone-200")
                  }
                >
                  {target.toUpperCase()}
                </a>
              ))}
            </nav>
            <a
              href={origin + "/admin"}
              onClick={navigate}
              aria-current={path === "/admin" ? "page" : undefined}
              className="hidden rounded-full bg-stone-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-stone-700 sm:block"
            >
              {labels[lang][5]}
            </a>
            <button
              type="button"
              onClick={() => setMobileOpen((open) => !open)}
              aria-expanded={mobileOpen}
              aria-controls="site-mobile-menu"
              aria-label={mobileOpen ? "Fermer le menu" : "Ouvrir le menu"}
              className="grid h-11 w-11 place-items-center rounded-xl border border-stone-200 lg:hidden"
              data-testid="mobile-menu-toggle"
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path
                  d={
                    mobileOpen
                      ? "M6 6l12 12M6 18L18 6"
                      : "M4 6h16M4 12h16M4 18h16"
                  }
                />
              </svg>
            </button>
          </div>
        </div>
        {mobileOpen && (
          <nav
            id="site-mobile-menu"
            className="flex flex-col gap-1 border-t border-stone-200 py-4 lg:hidden"
            aria-label="Navigation mobile"
            data-testid="nav-mobile"
          >
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={navigate}
                aria-current={link.active ? "page" : undefined}
                className={
                  "rounded-xl px-3 py-3 text-base font-bold " +
                  (link.active ? "bg-amber-100" : "hover:bg-stone-100")
                }
              >
                {link.label}
              </a>
            ))}
            <a
              href={origin + "/admin"}
              onClick={navigate}
              className="rounded-xl px-3 py-3 font-bold"
            >
              {labels[lang][5]}
            </a>
            <div className="mt-2 flex gap-3 px-3 sm:hidden">
              {(["fr", "en", "es"] as const).map((target) => (
                <a
                  key={target}
                  href={languageHref(target)}
                  onClick={(event) => {
                    if (
                      !event.metaKey &&
                      !event.ctrlKey &&
                      !event.shiftKey &&
                      !event.altKey &&
                      event.button === 0
                    )
                      onLanguageChange?.(target);
                    navigate(event);
                  }}
                  lang={target}
                  className={
                    "rounded-lg px-3 py-2 font-bold " +
                    (lang === target ? "bg-[#e5bd75]" : "bg-stone-100")
                  }
                >
                  {target.toUpperCase()}
                </a>
              ))}
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
