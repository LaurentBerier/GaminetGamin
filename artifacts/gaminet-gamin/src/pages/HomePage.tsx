import { Link } from "wouter";
import { ArrowRight, Heart, Pencil, Sparkles } from "lucide-react";
import { useState } from "react";
import { useLang, type Lang } from "@/contexts/LangContext";
import catalog from "../../../gaminet-gamin-vote/content/catalog.json";

const activeItems = catalog.items.filter((item) => item.active);
const activeItemCount = activeItems.length;

function shuffled<T>(items: readonly T[]) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

const copy = {
  fr: {
    eyebrow: "Collection 2026 · Vote ouvert",
    title: "Tu choisis la prochaine collection.",
    intro:
      "La vraie collection est prête à être départagée. Choisis autant de favoris que tu veux : tes votes nous aideront à décider quels vêtements prendront vie.",
    primaryCta: "Voter pour mes préférés",
    secondaryCta: "Voir les candidats",
    pieces: "créations en lice",
    choices: "favoris sans limite",
    madeHere: "imaginé au Québec",
    collectionEyebrow: "Le vestiaire en lice",
    collectionTitle: "De la couleur. Des monstres. Ton dernier mot.",
    collectionIntro:
      "T-shirts, hoodies, crewnecks, casquettes et chapeaux : voici un aperçu des vraies créations soumises au vote.",
    candidate: "Candidat 2026",
    vote: "Voter",
    seeAll: `Découvrir les ${activeItemCount} créations`,
    finalEyebrow: "Ton vote compte",
    finalTitle: "Quel vêtement mérite sa place dans la prochaine collection?",
    finalText:
      "Fais défiler toute la collection et garde tous les coups de cœur que tu veux. Chaque cœur est enregistré automatiquement.",
    finalCta: "Je choisis mes favoris",
  },
  en: {
    eyebrow: "Collection 2026 · Voting is open",
    title: "You choose the next collection.",
    intro:
      "The real collection is ready for your verdict. Pick as many favorites as you like: your votes will help decide which garments come to life.",
    primaryCta: "Vote for my favorites",
    secondaryCta: "Meet the candidates",
    pieces: "designs in the running",
    choices: "unlimited favorites",
    madeHere: "imagined in Québec",
    collectionEyebrow: "The lineup",
    collectionTitle: "Big color. Little monsters. Your final say.",
    collectionIntro:
      "T-shirts, hoodies, crewnecks, caps and bucket hats: here is a glimpse of the real designs up for a vote.",
    candidate: "2026 candidate",
    vote: "Vote",
    seeAll: `Explore all ${activeItemCount} designs`,
    finalEyebrow: "Your vote counts",
    finalTitle: "Which garment deserves a place in the next collection?",
    finalText:
      "Browse the full collection and save every favorite you like. Each heart is recorded automatically.",
    finalCta: "Choose my favorites",
  },
  es: {
    eyebrow: "Colección 2026 · Votación abierta",
    title: "Tú eliges la próxima colección.",
    intro:
      "La colección real está lista para tu veredicto. Elige todas las favoritas que quieras: tus votos nos ayudarán a decidir qué prendas cobrarán vida.",
    primaryCta: "Votar por mis favoritas",
    secondaryCta: "Ver las candidatas",
    pieces: "diseños candidatos",
    choices: "favoritas sin límite",
    madeHere: "imaginado en Québec",
    collectionEyebrow: "La selección",
    collectionTitle: "Mucho color. Pequeños monstruos. Tú decides.",
    collectionIntro:
      "Camisetas, sudaderas, gorras y sombreros: descubre una muestra de los diseños reales sometidos a votación.",
    candidate: "Candidata 2026",
    vote: "Votar",
    seeAll: `Descubrir los ${activeItemCount} diseños`,
    finalEyebrow: "Tu voto cuenta",
    finalTitle: "¿Qué prenda merece un lugar en la próxima colección?",
    finalText:
      "Explora la colección completa y guarda todas las favoritas que quieras. Cada corazón se registra automáticamente.",
    finalCta: "Elegir mis favoritas",
  },
} as const;

const spanishGarments: Record<string, string> = {
  "t-shirt": "Camiseta",
  hoodie: "Sudadera con capucha",
  "crewneck-sweatshirt": "Sudadera",
  "long-sleeve-shirt": "Camiseta de manga larga",
  casquette: "Gorra",
  "bucket-hat": "Sombrero",
};

const spanishColors: Record<string, string> = {
  "hot-pink": "Rosa intenso",
  "bright-teal": "Turquesa intenso",
  "tangerine-orange": "Naranja mandarina",
  "sunflower-yellow": "Amarillo girasol",
  "berry-purple": "Morado baya",
  "cobalt-blue": "Azul cobalto",
};

function garmentLabel(item: (typeof catalog.items)[number], lang: Lang) {
  if (lang === "es") return spanishGarments[item.garment.id] ?? item.garment.label.en;
  return item.garment.label[lang];
}

function colorLabel(item: (typeof catalog.items)[number], lang: Lang) {
  if (lang === "es") return spanishColors[item.color.id] ?? item.color.label.en;
  return item.color.label[lang];
}

export default function HomePage() {
  const { lang, t } = useLang();
  const pageCopy = copy[lang];
  const [featuredItems] = useState(() => shuffled(activeItems).slice(0, 6));

  const shopRoute = lang === "fr" ? "/fr/boutique" : lang === "en" ? "/en/shop" : "/es/tienda";
  const programRoute = lang === "fr" ? "/fr/artistes" : lang === "en" ? "/en/little-monsters" : "/es/pequenos-monstruos";
  const numberLocale = lang === "fr" ? "fr-CA" : lang === "es" ? "es-CA" : "en-CA";

  return (
    <main className="overflow-hidden bg-[#f7f3eb]">
      <section className="relative border-b border-black/10" data-testid="hero-section">
        <div className="absolute -left-20 top-24 h-72 w-72 rounded-full bg-[#ef8db7]/25 blur-3xl" />
        <div className="absolute -right-20 bottom-0 h-80 w-80 rounded-full bg-[#56c9c5]/25 blur-3xl" />

        <div className="relative mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl items-center gap-14 px-5 py-16 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:py-20">
          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/80 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-[#a45c26] shadow-sm backdrop-blur">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#ef6a48] opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#ef6a48]" />
              </span>
              {pageCopy.eyebrow}
            </div>

            <h1
              className="mt-7 max-w-3xl text-5xl font-black uppercase leading-[0.92] tracking-[-0.055em] text-[#201c19] sm:text-6xl lg:text-7xl xl:text-[5.4rem]"
              style={{ fontFamily: "'Nunito', sans-serif" }}
              data-testid="hero-slogan"
            >
              {pageCopy.title}
            </h1>
            <p className="mt-7 max-w-xl text-base font-medium leading-relaxed text-black/60 sm:text-lg" data-testid="hero-subslogan">
              {pageCopy.intro}
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href={shopRoute}
                className="group inline-flex items-center justify-center gap-2 rounded-full bg-[#201c19] px-7 py-4 text-sm font-black text-white shadow-[0_12px_28px_rgba(32,28,25,0.2)] transition hover:-translate-y-0.5 hover:bg-[#3f714f]"
                data-testid="cta-vote-hero"
              >
                <Heart size={17} fill="currentColor" />
                {pageCopy.primaryCta}
                <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
              </Link>
              <a
                href="#collection-2026"
                className="inline-flex items-center justify-center rounded-full border-2 border-[#201c19] px-7 py-4 text-sm font-black text-[#201c19] transition hover:bg-white"
              >
                {pageCopy.secondaryCta}
              </a>
            </div>

            <div className="mt-10 grid max-w-xl grid-cols-3 divide-x divide-black/10 border-t border-black/10 pt-5">
              <div className="pr-4">
                <p className="text-2xl font-black text-[#201c19]">{activeItemCount}</p>
                <p className="mt-1 text-[10px] font-bold uppercase leading-tight tracking-[0.1em] text-black/45">{pageCopy.pieces}</p>
              </div>
              <div className="px-4">
                <p className="text-2xl font-black text-[#201c19]">∞</p>
                <p className="mt-1 text-[10px] font-bold uppercase leading-tight tracking-[0.1em] text-black/45">{pageCopy.choices}</p>
              </div>
              <div className="pl-4">
                <p className="text-2xl font-black text-[#201c19]">100%</p>
                <p className="mt-1 text-[10px] font-bold uppercase leading-tight tracking-[0.1em] text-black/45">{pageCopy.madeHere}</p>
              </div>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-2xl lg:mx-0">
            <div className="absolute -left-4 top-[18%] z-20 rotate-[-8deg] rounded-full bg-[#dce77d] px-4 py-2 text-xs font-black uppercase tracking-[0.1em] shadow-lg">
              {pageCopy.vote} ♥
            </div>
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              {featuredItems.slice(0, 4).map((item, index) => (
                <Link
                  key={item.id}
                  href={shopRoute}
                  className={`group relative overflow-hidden rounded-[2rem] border border-black/10 bg-white p-2 shadow-[0_18px_50px_rgba(53,45,36,0.11)] transition duration-300 hover:-translate-y-1 ${
                    index === 1 ? "mt-8" : index === 2 ? "-mt-8" : ""
                  }`}
                >
                  <div className="relative aspect-[4/5] overflow-hidden rounded-[1.55rem]" style={{ backgroundColor: `${item.color.hex}24` }}>
                    <img
                      src={item.image}
                      alt={`${item.title} — ${garmentLabel(item, lang)}`}
                      className="h-full w-full object-contain p-2 transition duration-500 group-hover:scale-[1.035]"
                      loading={index < 2 ? "eager" : "lazy"}
                      decoding="async"
                    />
                    <span className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#ef5d82] shadow-md">
                      <Heart size={16} />
                    </span>
                  </div>
                  <div className="px-2 pb-2 pt-3">
                    <p className="truncate text-sm font-black text-[#201c19] sm:text-base">{item.title}</p>
                    <p className="mt-0.5 text-[11px] font-bold uppercase tracking-[0.08em] text-black/42">
                      {garmentLabel(item, lang)} · {colorLabel(item, lang)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="collection-2026" className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:py-28" data-testid="collection-preview">
        <div className="grid gap-6 lg:grid-cols-[1fr_0.8fr] lg:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#b77832]">{pageCopy.collectionEyebrow}</p>
            <h2 className="mt-4 max-w-3xl text-4xl font-black uppercase leading-[0.95] tracking-[-0.045em] text-[#201c19] sm:text-5xl lg:text-6xl" style={{ fontFamily: "'Nunito', sans-serif" }}>
              {pageCopy.collectionTitle}
            </h2>
          </div>
          <p className="max-w-xl text-base font-medium leading-relaxed text-black/55 lg:justify-self-end">{pageCopy.collectionIntro}</p>
        </div>

        <div className="mt-12 grid grid-cols-2 gap-4 md:grid-cols-3 lg:gap-6">
          {featuredItems.map((item, index) => (
            <Link
              key={item.id}
              href={shopRoute}
              className="group overflow-hidden rounded-[1.7rem] border border-black/10 bg-white shadow-[0_8px_30px_rgba(53,45,36,0.06)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_16px_38px_rgba(53,45,36,0.12)]"
              data-testid={`collection-card-${index}`}
            >
              <div className="relative aspect-square overflow-hidden" style={{ backgroundColor: `${item.color.hex}1f` }}>
                <img
                  src={item.image}
                  alt={`${item.title} — ${garmentLabel(item, lang)}`}
                  className="h-full w-full object-contain p-3 transition duration-500 group-hover:scale-105"
                  loading="lazy"
                  decoding="async"
                />
                <span className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.12em] text-[#201c19] shadow-sm backdrop-blur sm:text-[10px]">
                  {pageCopy.candidate}
                </span>
              </div>
              <div className="p-4 sm:p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="truncate text-base font-black text-[#201c19] sm:text-lg">{item.title}</h3>
                    <p className="mt-1 truncate text-[10px] font-bold uppercase tracking-[0.08em] text-black/42 sm:text-xs">
                      {garmentLabel(item, lang)} · {colorLabel(item, lang)}
                    </p>
                  </div>
                  <Heart size={19} className="mt-0.5 shrink-0 text-[#ef5d82] transition group-hover:fill-[#ef5d82]" />
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-black/8 pt-3">
                  <span className="text-sm font-black text-[#201c19]">
                    {new Intl.NumberFormat(numberLocale, { style: "currency", currency: "CAD" }).format(item.garment.price)}
                  </span>
                  <span className="flex items-center gap-1 text-xs font-black text-[#a45c26]">
                    {pageCopy.vote} <ArrowRight size={13} className="transition group-hover:translate-x-1" />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-10 flex justify-center">
          <Link href={shopRoute} className="group inline-flex items-center gap-2 rounded-full border-2 border-[#201c19] px-7 py-3.5 text-sm font-black text-[#201c19] transition hover:bg-[#201c19] hover:text-white" data-testid="cta-see-all">
            {pageCopy.seeAll}
            <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </section>

      <section className="px-5 pb-20 sm:px-8 lg:pb-28" data-testid="vote-cta-band">
        <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[2.5rem] bg-[#201c19] px-6 py-14 text-white sm:px-12 sm:py-16 lg:px-16">
          <div className="absolute -right-12 -top-24 h-72 w-72 rounded-full bg-[#ef8db7]/30 blur-2xl" />
          <div className="absolute -bottom-32 left-1/3 h-72 w-72 rounded-full bg-[#56c9c5]/25 blur-2xl" />
          <Sparkles className="absolute right-8 top-8 text-[#dce77d] sm:right-12 sm:top-10" size={30} />
          <div className="relative grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
            <div className="max-w-3xl">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[#dce77d]">{pageCopy.finalEyebrow}</p>
              <h2 className="mt-4 text-4xl font-black uppercase leading-[0.98] tracking-[-0.045em] sm:text-5xl lg:text-6xl" style={{ fontFamily: "'Nunito', sans-serif" }}>
                {pageCopy.finalTitle}
              </h2>
              <p className="mt-5 max-w-2xl text-sm font-medium leading-relaxed text-white/60 sm:text-base">{pageCopy.finalText}</p>
            </div>
            <Link href={shopRoute} className="group inline-flex w-fit items-center gap-2 rounded-full bg-[#dce77d] px-7 py-4 text-sm font-black text-[#201c19] shadow-lg transition hover:-translate-y-0.5 hover:bg-white" data-testid="cta-vote-final">
              <Heart size={17} fill="currentColor" />
              {pageCopy.finalCta}
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </section>

      <section className="border-y border-[#c8914a]/30 bg-[#c8914a]/10" data-testid="programme-banner">
        <div className="mx-auto max-w-6xl px-5 py-9 sm:px-8">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#c8914a]/20">
                <Pencil size={22} className="text-[#9c682f]" />
              </div>
              <div>
                <h3 className="text-lg font-black text-[#201c19]" style={{ fontFamily: "'Nunito', sans-serif" }}>{t.home.programme_titre}</h3>
                <p className="max-w-lg text-sm text-black/55">{t.home.programme_texte}</p>
              </div>
            </div>
            <Link href={programRoute} className="group flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full bg-[#201c19] px-6 py-3 text-sm font-black text-white transition hover:bg-[#3f714f]" data-testid="cta-programme">
              {t.home.programme_cta}
              <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-20 sm:px-8" data-testid="values-section">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {[
            {
              emoji: "🎨",
              title: lang === "fr" ? "Dessins originaux" : lang === "en" ? "Original art" : "Arte original",
              text: lang === "fr" ? "Chaque design est unique, signé par son artiste en herbe." : lang === "en" ? "Every design is one-of-a-kind, signed by its young artist." : "Cada diseño es único, firmado por su pequeño artista.",
            },
            {
              emoji: "🍁",
              title: lang === "fr" ? "100% fait au Québec" : lang === "en" ? "100% Made in Québec" : "100% Hecho en Québec",
              text: lang === "fr" ? "Produit et livré depuis le Québec, avec fierté." : lang === "en" ? "Produced and shipped from Québec, with pride." : "Producido y enviado desde Québec, con orgullo.",
            },
            {
              emoji: "👕",
              title: lang === "fr" ? "Qualité premium" : lang === "en" ? "Premium quality" : "Calidad premium",
              text: lang === "fr" ? "Tissus durables, coupes confortables. Du linge pour vrai." : lang === "en" ? "Durable fabrics, comfortable cuts. Real clothes for real people." : "Telas duraderas, cortes cómodos. Ropa de verdad.",
            },
          ].map((value, index) => (
            <div key={value.title} className="rounded-3xl border border-black/8 bg-white p-8 text-center transition hover:-translate-y-1 hover:shadow-lg" data-testid={`value-card-${index}`}>
              <div className="text-4xl">{value.emoji}</div>
              <h3 className="mt-4 text-lg font-black text-[#201c19]">{value.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-black/48">{value.text}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
