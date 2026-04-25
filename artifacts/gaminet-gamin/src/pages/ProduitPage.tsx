import { useParams, useLocation } from "wouter";
import { useLang } from "@/contexts/LangContext";
import produits from "@/data/produits.json";
import { ArrowLeft, ShoppingBag, Share2, Heart } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";

const ORGANISME_MAP: Record<string, { fr: string; en: string; es: string }> = {
  "jeunes-en-tete": { fr: "Fondation Jeunes en Tête", en: "Fondation Jeunes en Tête", es: "Fondation Jeunes en Tête" },
  "grands-freres": { fr: "Grands Frères Grandes Soeurs", en: "Big Brothers Big Sisters", es: "Grandes Hermanos Grandes Hermanas" },
  "tel-jeunes": { fr: "Tel-Jeunes", en: "Tel-Jeunes", es: "Tel-Jeunes" },
};

export default function ProduitPage() {
  const params = useParams<{ id: string }>();
  const { lang, translateField, t } = useLang();
  const [, setLocation] = useLocation();
  const [selectedImg, setSelectedImg] = useState(0);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);

  const shopRoute = lang === "fr" ? "/fr/boutique" : lang === "en" ? "/en/shop" : "/es/tienda";
  const programRoute = lang === "fr" ? "/fr/artistes" : lang === "en" ? "/en/little-monsters" : "/es/pequenos-monstruos";
  const produit = produits.find((p) => p.id === params.id);

  if (!produit) {
    return (
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-20 text-center" data-testid="product-not-found">
        <h1 className="text-2xl font-bold text-stone-900 mb-4">404</h1>
        <Link href={shopRoute}>
          <button className="bg-stone-900 text-stone-50 px-6 py-3 rounded-full font-medium hover:bg-gg-green transition-colors">
            {t.produit.retour}
          </button>
        </Link>
      </main>
    );
  }

  const organismeId = (produit as any).artiste?.organisme as string | undefined;
  const organisme = organismeId ? ORGANISME_MAP[organismeId] : null;
  const isSoumission = !!(produit as any).soumission;

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-12" data-testid="produit-page">
      <button
        onClick={() => setLocation(shopRoute)}
        className="flex items-center gap-2 text-stone-500 hover:text-stone-900 text-sm font-medium mb-8 transition-colors"
        data-testid="btn-retour"
      >
        <ArrowLeft size={16} />
        {t.produit.retour}
      </button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        <div className="space-y-4" data-testid="product-images">
          <div className="rounded-2xl overflow-hidden bg-stone-50 aspect-square border border-stone-100">
            <img
              src={produit.images[selectedImg]}
              alt={translateField(produit.nom as any)}
              className="w-full h-full object-cover"
              data-testid="img-product-main"
            />
          </div>
          {produit.images.length > 1 && (
            <div className="flex gap-3">
              {produit.images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedImg(i)}
                  className={`w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${
                    selectedImg === i ? "border-stone-900" : "border-stone-200 opacity-60 hover:opacity-100"
                  }`}
                  data-testid={`img-thumb-${i}`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div data-testid="product-details">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <div className="inline-block bg-gg-gold/20 text-stone-700 text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full">
              {t.produit.fait_quebec}
            </div>
            {isSoumission && (
              <Link href={programRoute}>
                <div className="inline-flex items-center gap-1 bg-gg-green/10 text-gg-green text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full cursor-pointer hover:bg-gg-green/20 transition-colors" data-testid="soumission-badge">
                  🎨 {t.produit.soumission_badge}
                </div>
              </Link>
            )}
          </div>

          <h1 className="text-3xl sm:text-4xl font-black text-stone-900 uppercase tracking-tight mb-2" style={{ fontFamily: "'Nunito', sans-serif" }} data-testid="product-title">
            {translateField(produit.nom as any)}
          </h1>

          <p className="text-2xl font-bold text-stone-900 mb-6" data-testid="product-price">
            {produit.prix.toFixed(2)} $
          </p>

          <div className="mb-6">
            <h3 className="text-xs font-bold uppercase tracking-widest text-stone-500 mb-2">{t.produit.description}</h3>
            <p className="text-stone-600 leading-relaxed" data-testid="product-description">
              {translateField(produit.description as any)}
            </p>
          </div>

          <div className="mb-6">
            <h3 className="text-xs font-bold uppercase tracking-widest text-stone-500 mb-3">{t.produit.couleurs}</h3>
            <div className="flex gap-2 flex-wrap" data-testid="product-colors">
              {produit.couleurs.map((c, i) => (
                <button
                  key={i}
                  className="w-8 h-8 rounded-full border-2 border-transparent hover:border-stone-900 transition-all hover:scale-110"
                  style={{ backgroundColor: c }}
                  title={c}
                  data-testid={`color-swatch-${i}`}
                />
              ))}
            </div>
          </div>

          <div className="mb-8">
            <h3 className="text-xs font-bold uppercase tracking-widest text-stone-500 mb-3">{t.produit.tailles}</h3>
            <div className="flex gap-2 flex-wrap" data-testid="product-sizes">
              {produit.tailles.map((taille) => (
                <button
                  key={taille}
                  onClick={() => setSelectedSize(taille)}
                  className={`px-4 py-2 border-2 rounded-xl text-sm font-medium transition-all ${
                    selectedSize === taille
                      ? "border-stone-900 bg-stone-900 text-stone-50"
                      : "border-stone-200 text-stone-700 hover:border-stone-900 hover:text-stone-900"
                  }`}
                  data-testid={`size-btn-${taille}`}
                >
                  {taille}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 mb-8">
            <button
              className="flex-1 bg-stone-900 text-stone-50 py-4 rounded-full font-semibold text-base hover:bg-gg-green transition-colors flex items-center justify-center gap-2"
              data-testid="btn-add-cart"
            >
              <ShoppingBag size={18} />
              {t.produit.ajouter}
            </button>
            <button
              className="p-4 border-2 border-stone-200 rounded-full hover:border-stone-900 hover:text-stone-900 text-stone-400 transition-all"
              data-testid="btn-share"
            >
              <Share2 size={18} />
            </button>
          </div>

          {/* ARTISTE CARD */}
          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5 mb-4" data-testid="artiste-card">
            <h3 className="text-xs font-bold uppercase tracking-widest text-stone-500 mb-3">{t.produit.artiste}</h3>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-gg-gold/30 flex items-center justify-center font-black text-stone-700 text-lg">
                {produit.artiste.nom[0]}
              </div>
              <div>
                <p className="font-bold text-stone-900" data-testid="artist-name">
                  {produit.artiste.nom}, {produit.artiste.age} {t.artistes.age}
                </p>
              </div>
            </div>
            <p className="text-stone-600 text-sm leading-relaxed" data-testid="artist-bio">
              {translateField(produit.artiste.bio as any)}
            </p>
          </div>

          {/* PARTAGE DES PROFITS */}
          {organisme && (
            <div className="flex items-start gap-3 bg-green-50 border border-green-100 rounded-2xl px-5 py-4" data-testid="partage-profits">
              <Heart size={16} className="text-gg-green mt-0.5 flex-shrink-0" />
              <p className="text-stone-600 text-sm leading-relaxed">
                <span className="font-bold text-gg-green">10% </span>
                {t.produit.partage_profits}{" "}
                <span className="font-bold text-stone-900">{organisme[lang]}</span>.
              </p>
            </div>
          )}

          <p className="text-stone-400 text-xs mt-4">{t.produit.composition}: {produit.composition}</p>
        </div>
      </div>
    </main>
  );
}
