import { Link } from "wouter";
import { useLang } from "@/contexts/LangContext";
import { ProductCard } from "@/components/ProductCard";
import produits from "@/data/produits.json";
import { ArrowRight, Pencil } from "lucide-react";

export default function HomePage() {
  const { lang, t } = useLang();

  const shopRoute = lang === "fr" ? "/fr/boutique" : lang === "en" ? "/en/shop" : "/es/tienda";
  const aboutRoute = lang === "fr" ? "/fr/apropos" : lang === "en" ? "/en/about" : "/es/nosotros";
  const programRoute = lang === "fr" ? "/fr/p-tits-artistes" : lang === "en" ? "/en/little-artists" : "/es/pequenos-artistas";

  const nouveautes = produits.filter((p) => p.nouveaute).slice(0, 4);

  return (
    <main>
      <section className="relative min-h-[70vh] flex items-center bg-gradient-to-br from-stone-50 via-amber-50/30 to-stone-100 overflow-hidden" data-testid="hero-section">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-16 right-10 w-40 h-40 rounded-full bg-amber-100/40 blur-3xl" />
          <div className="absolute bottom-10 left-10 w-60 h-60 rounded-full bg-green-100/30 blur-3xl" />
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 w-full py-20 relative z-10">
          <div className="max-w-2xl">
            <div className="inline-block bg-gg-gold/20 text-stone-700 text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-6">
              Made in Québec
            </div>
            <h1 className="text-5xl sm:text-6xl md:text-7xl font-black text-stone-900 leading-none tracking-tight mb-6 uppercase" style={{ fontFamily: "'Nunito', sans-serif" }} data-testid="hero-slogan">
              {t.home.slogan}
            </h1>
            <p className="text-stone-600 text-lg leading-relaxed mb-10 max-w-lg" data-testid="hero-subslogan">
              {t.home.subslogan}
            </p>
            <div className="flex flex-wrap gap-4">
              <Link href={shopRoute}>
                <button className="bg-stone-900 text-stone-50 px-8 py-4 rounded-full font-semibold text-base hover:bg-gg-green transition-colors duration-300 flex items-center gap-2 group" data-testid="cta-shop">
                  {t.home.cta_boutique}
                  <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </button>
              </Link>
              <Link href={aboutRoute}>
                <button className="border-2 border-stone-900 text-stone-900 px-8 py-4 rounded-full font-semibold text-base hover:bg-stone-900 hover:text-stone-50 transition-colors duration-300" data-testid="cta-about">
                  {t.home.cta_apropos}
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* PROGRAMME BANNER */}
      <section className="bg-gg-gold/10 border-y border-gg-gold/30" data-testid="programme-banner">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-gg-gold/20 flex items-center justify-center flex-shrink-0">
                <Pencil size={22} className="text-gg-gold" />
              </div>
              <div>
                <h3 className="font-black text-stone-900 text-lg" style={{ fontFamily: "'Nunito', sans-serif" }}>
                  {t.home.programme_titre}
                </h3>
                <p className="text-stone-600 text-sm max-w-lg">
                  {t.home.programme_texte}
                </p>
              </div>
            </div>
            <Link href={programRoute} className="flex-shrink-0">
              <button className="bg-stone-900 text-stone-50 px-6 py-3 rounded-full font-semibold text-sm hover:bg-gg-green transition-colors duration-300 flex items-center gap-2 group whitespace-nowrap" data-testid="cta-programme">
                {t.home.programme_cta}
                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </Link>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-20" data-testid="nouveautes-section">
        <div className="flex items-end justify-between mb-10">
          <div>
            <h2 className="text-3xl sm:text-4xl font-black text-stone-900 uppercase tracking-tight" style={{ fontFamily: "'Nunito', sans-serif" }}>
              {t.home.nouveautes}
            </h2>
            <div className="h-1 w-16 bg-gg-gold mt-2 rounded-full" />
          </div>
          <Link href={shopRoute} className="text-stone-500 hover:text-stone-900 text-sm font-medium flex items-center gap-1 transition-colors" data-testid="link-voir-tout">
            {t.home.voir_tout}
            <ArrowRight size={14} />
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
          {nouveautes.map((p) => (
            <ProductCard key={p.id} produit={p as any} />
          ))}
        </div>
      </section>

      <section className="bg-stone-900 py-20" data-testid="slogan-band">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-3xl sm:text-4xl md:text-5xl font-black text-stone-50 uppercase tracking-tight leading-tight" style={{ fontFamily: "'Nunito', sans-serif" }}>
            {t.home.slogan}
          </p>
          <div className="flex justify-center mt-4">
            <div className="h-1 w-24 bg-gg-gold rounded-full" />
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-20" data-testid="values-section">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              emoji: "🎨",
              title: lang === "fr" ? "Dessins originaux" : lang === "en" ? "Original art" : "Arte original",
              text: lang === "fr"
                ? "Chaque design est unique, signé par son artiste en herbe."
                : lang === "en"
                ? "Every design is one-of-a-kind, signed by its young artist."
                : "Cada diseño es único, firmado por su pequeño artista.",
            },
            {
              emoji: "🍁",
              title: lang === "fr" ? "100% fait au Québec" : lang === "en" ? "100% Made in Québec" : "100% Hecho en Québec",
              text: lang === "fr"
                ? "Produit et livré depuis le Québec, avec fierté."
                : lang === "en"
                ? "Produced and shipped from Québec, with pride."
                : "Producido y enviado desde Québec, con orgullo.",
            },
            {
              emoji: "👕",
              title: lang === "fr" ? "Qualité premium" : lang === "en" ? "Premium quality" : "Calidad premium",
              text: lang === "fr"
                ? "Tissus durables, coupes confortables. Du linge pour vrai."
                : lang === "en"
                ? "Durable fabrics, comfortable cuts. Real clothes for real people."
                : "Telas duraderas, cortes cómodos. Ropa de verdad.",
            },
          ].map((val, i) => (
            <div key={i} className="bg-stone-50 rounded-2xl p-8 text-center border border-stone-100 hover:border-stone-200 hover:shadow-md transition-all duration-300" data-testid={`value-card-${i}`}>
              <div className="text-4xl mb-4">{val.emoji}</div>
              <h3 className="font-bold text-stone-900 text-lg mb-2">{val.title}</h3>
              <p className="text-stone-500 text-sm leading-relaxed">{val.text}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
