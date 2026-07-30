export type Lang = "fr" | "en" | "es";

export type LocalizedText = Record<Lang, string>;

export type GarmentId = "tshirt" | "hoodie" | "crewneck";

export interface ProductColor {
  hex: string;
  name: LocalizedText;
}

export interface GarmentOption {
  id: GarmentId;
  label: LocalizedText;
  price: number;
  composition: string;
}

export interface Artist {
  id: string;
  nom: string;
  age?: number;
  bio: LocalizedText;
  organisme?: string;
}

export interface Product {
  id: string;
  categorie: string;
  prix: number;
  image?: string;
  images?: string[];
  designImage?: string;
  garments?: GarmentOption[];
  nouveaute: boolean;
  couleurs: Array<string | ProductColor>;
  tailles: string[];
  nom: LocalizedText;
  description: LocalizedText;
  artiste: Artist;
  composition: string;
  soumission?: boolean;
}

export function getColorOptions(product: Product): ProductColor[] {
  return product.couleurs.map((color) =>
    typeof color === "string"
      ? {
          hex: color,
          name: { fr: color, en: color, es: color },
        }
      : color,
  );
}

export function getDefaultGarment(product: Product): GarmentOption | null {
  return product.garments?.[0] ?? null;
}

export function isLayeredProduct(product: Product): boolean {
  return Boolean(product.designImage && product.garments?.length);
}
