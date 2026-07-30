import { useState } from "react";
import { useLang } from "@/contexts/LangContext";
import { Link } from "wouter";
import { ShoppingBag } from "lucide-react";
import { GarmentMockup } from "@/components/GarmentMockup";
import {
  getColorOptions,
  getDefaultGarment,
  isLayeredProduct,
  type Product,
} from "@/types/product";

interface ProductCardProps {
  produit: Product;
  priority?: boolean;
}

const shopRoutes = {
  fr: "/fr/boutique",
  en: "/en/shop",
  es: "/es/tienda",
};

export function ProductCard({ produit, priority = false }: ProductCardProps) {
  const { lang, translateField, t } = useLang();
  const route = `${shopRoutes[lang]}/${produit.id}`;
  const colors = getColorOptions(produit);
  const defaultGarment = getDefaultGarment(produit);
  const [selectedColor, setSelectedColor] = useState(colors[0]);
  const price = defaultGarment?.price ?? produit.prix;
  const layered = isLayeredProduct(produit);

  return (
    <div
      className="product-card group bg-white rounded-2xl overflow-hidden border border-stone-100 hover:border-stone-200 hover:shadow-lg transition-all duration-300"
      data-testid={`card-product-${produit.id}`}
    >
      <Link href={route}>
        <div className="relative overflow-hidden bg-stone-50 aspect-square cursor-pointer">
          {layered && produit.designImage && defaultGarment ? (
            <div className="w-full h-full group-hover:scale-[1.03] transition-transform duration-500">
              <GarmentMockup
                alt={translateField(produit.nom)}
                color={selectedColor.hex}
                designImage={produit.designImage}
                garment={defaultGarment.id}
                priority={priority}
              />
            </div>
          ) : (
            <>
              <img
                src={produit.image}
                alt={translateField(produit.nom)}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                width="1100"
                height="1100"
                loading={priority ? "eager" : "lazy"}
                fetchPriority={priority ? "high" : "auto"}
                decoding="async"
                data-testid={`img-product-${produit.id}`}
              />
              <div
                className="absolute inset-0 opacity-20 mix-blend-color pointer-events-none"
                style={{ backgroundColor: selectedColor.hex }}
                aria-hidden="true"
              />
            </>
          )}
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
            {price.toFixed(2)} $
          </span>
        </div>

        <p className="text-stone-500 text-xs mb-3 leading-relaxed line-clamp-2">
          {t.produit.artiste}: <span className="font-medium text-stone-700">{produit.artiste.nom}</span>
          {produit.artiste.age ? `, ${produit.artiste.age} ${t.artistes.age}` : ""}
        </p>

        <div className="flex items-center justify-between">
          <div className="flex gap-1.5" data-testid={`colors-${produit.id}`}>
            {colors.slice(0, 4).map((color) => (
              <button
                key={color.hex}
                type="button"
                className={`w-4 h-4 rounded-full border cursor-pointer hover:scale-110 transition-all ${
                  selectedColor.hex === color.hex
                    ? "border-stone-900 ring-2 ring-stone-300"
                    : "border-stone-200"
                }`}
                style={{ backgroundColor: color.hex }}
                title={color.name[lang]}
                aria-label={color.name[lang]}
                aria-pressed={selectedColor.hex === color.hex}
                onClick={() => setSelectedColor(color)}
              />
            ))}
            {colors.length > 4 && (
              <span className="text-stone-400 text-xs self-center">+{colors.length - 4}</span>
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
