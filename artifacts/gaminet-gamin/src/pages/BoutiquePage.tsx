import { useState } from "react";
import { useLang } from "@/contexts/LangContext";
import { ProductCard } from "@/components/ProductCard";
import produits from "@/data/produits.json";

type Categorie = "tout" | "t-shirts" | "hoodies" | "sweats" | "casquettes" | "debardeurs";

export default function BoutiquePage() {
  const { t } = useLang();
  const [categorie, setCategorie] = useState<Categorie>("tout");

  const categories: Array<{ key: Categorie; label: string }> = [
    { key: "tout", label: t.boutique.tout },
    { key: "t-shirts", label: t.boutique.t_shirts },
    { key: "hoodies", label: t.boutique.hoodies },
    { key: "sweats", label: t.boutique.sweats },
    { key: "debardeurs", label: t.boutique.debardeurs },
    { key: "casquettes", label: t.boutique.casquettes },
  ];

  const filtered = categorie === "tout" ? produits : produits.filter((p) => p.categorie === categorie);

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-16" data-testid="boutique-page">
      <div className="mb-12">
        <h1 className="text-4xl sm:text-5xl font-black text-stone-900 uppercase tracking-tight mb-2" style={{ fontFamily: "'Nunito', sans-serif" }} data-testid="boutique-title">
          {t.boutique.titre}
        </h1>
        <p className="text-stone-500 text-lg">{t.boutique.sous_titre}</p>
        <div className="h-1 w-16 bg-gg-gold mt-4 rounded-full" />
      </div>

      <div className="flex flex-wrap gap-2 mb-10" data-testid="category-filters">
        {categories.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setCategorie(cat.key)}
            data-testid={`filter-${cat.key}`}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
              categorie === cat.key
                ? "bg-stone-900 text-stone-50"
                : "bg-stone-100 text-stone-600 hover:bg-stone-200"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 text-stone-400" data-testid="no-products">
          <p className="text-lg">{t.boutique.aucun_produit}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-6" data-testid="products-grid">
          {filtered.map((p) => (
            <ProductCard key={p.id} produit={p as any} />
          ))}
        </div>
      )}
    </main>
  );
}
