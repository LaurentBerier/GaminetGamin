import { useLang } from "@/contexts/LangContext";
import { Link } from "wouter";
import { ShoppingBag } from "lucide-react";

interface Produit {
  id: string;
  categorie: string;
  prix: number;
  image: string;
  nouveaute: boolean;
  couleurs: string[];
  nom: { fr: string; en: string; es: string };
  description: { fr: string; en: string; es: string };
  artiste: {
    id: string;
    nom: string;
    age: number;
    bio: { fr: string; en: string; es: string };
  };
}

interface ProductCardProps {
  produit: Produit;
}

const shopRoutes = {
  fr: "/fr/boutique",
  en: "/en/shop",
  es: "/es/tienda",
};

export function ProductCard({ produit }: ProductCardProps) {
  const { lang, translateField, t } = useLang();
  const route = `${shopRoutes[lang]}/${produit.id}`;

  return (
    <div
      className="group bg-white rounded-2xl overflow-hidden border border-stone-100 hover:border-stone-200 hover:shadow-lg transition-all duration-300"
      data-testid={`card-product-${produit.id}`}
    >
      <Link href={route}>
        <div className="relative overflow-hidden bg-stone-50 aspect-square cursor-pointer">
          <img
            src={produit.image}
            alt={translateField(produit.nom)}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            data-testid={`img-product-${produit.id}`}
          />
          {produit.nouveaute && (
            <span className="absolute top-3 left-3 bg-gg-gold text-stone-900 text-xs font-bold px-2 py-1 rounded-full tracking-wide uppercase">
              New
            </span>
          )}
          <div className="absolute inset-0 bg-stone-900/0 group-hover:bg-stone-900/5 transition-colors duration-300" />
        </div>
      </Link>

      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <Link href={route}>
            <h3 className="font-semibold text-stone-900 text-sm leading-snug cursor-pointer hover:text-gg-green transition-colors line-clamp-2" data-testid={`text-product-name-${produit.id}`}>
              {translateField(produit.nom)}
            </h3>
          </Link>
          <span className="font-bold text-stone-900 text-sm whitespace-nowrap" data-testid={`text-price-${produit.id}`}>
            {produit.prix.toFixed(2)} $
          </span>
        </div>

        <p className="text-stone-500 text-xs mb-3 leading-relaxed line-clamp-2">
          {t.produit.artiste}: <span className="font-medium text-stone-700">{produit.artiste.nom}</span>, {produit.artiste.age} {t.artistes.age}
        </p>

        <div className="flex items-center justify-between">
          <div className="flex gap-1.5" data-testid={`colors-${produit.id}`}>
            {produit.couleurs.slice(0, 4).map((c, i) => (
              <div
                key={i}
                className="w-4 h-4 rounded-full border border-stone-200 cursor-pointer hover:scale-110 transition-transform"
                style={{ backgroundColor: c }}
                title={c}
              />
            ))}
            {produit.couleurs.length > 4 && (
              <span className="text-stone-400 text-xs self-center">+{produit.couleurs.length - 4}</span>
            )}
          </div>

          <button
            className="flex items-center gap-1.5 bg-stone-900 text-stone-50 px-3 py-1.5 rounded-full text-xs font-medium hover:bg-gg-green transition-colors duration-200 group/btn"
            data-testid={`btn-add-cart-${produit.id}`}
            onClick={(e) => { e.preventDefault(); }}
          >
            <ShoppingBag size={12} className="group-hover/btn:scale-110 transition-transform" />
            {t.boutique.ajouter_panier}
          </button>
        </div>
      </div>
    </div>
  );
}
