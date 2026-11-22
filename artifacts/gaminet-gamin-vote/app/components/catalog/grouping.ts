export type CatalogItem = {
  id: string;
  designId: string;
  title: string;
  sectionId: string;
  active: boolean;
  image: string;
  artworkImage?: string;
  themeId?: string;
  specialCollectionId?: string | null;
  garment: { id: string; label: { fr: string; en: string }; price: number };
  color: { id: string; hex: string; label: { fr: string; en: string } };
};

export type ProductGroup = {
  id: string;
  designId: string;
  title: string;
  garmentId: string;
  variants: CatalogItem[];
};

export const garmentOrder = ['tshirt', 'longsleeve', 'crewneck', 'hoodie', 'cap', 'bucket-hat', 'beanie', 'tote', 'mug'];
export const garmentNames: Record<string, string> = {
  tshirt: 'T-shirts', longsleeve: 'Manches longues', crewneck: 'Crewnecks',
  hoodie: 'Hoodies', cap: 'Casquettes', 'bucket-hat': 'Chapeaux',
  beanie: 'Tuques', tote: 'Sacs en toile', mug: 'Tasses',
};

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function productId(item: Pick<CatalogItem, 'designId' | 'garment'>) {
  return `${slug(item.designId)}--${slug(item.garment.id)}`;
}

export function groupProducts(items: readonly CatalogItem[]): ProductGroup[] {
  const groups = new Map<string, ProductGroup>();
  for (const item of items) {
    if (!item.active) continue;
    const id = productId(item);
    const existing = groups.get(id);
    if (existing) existing.variants.push(item);
    else groups.set(id, { id, designId: item.designId, title: item.title, garmentId: item.garment.id, variants: [item] });
  }
  return [...groups.values()].sort((left, right) =>
    garmentOrder.indexOf(left.garmentId) - garmentOrder.indexOf(right.garmentId)
    || Number(right.designId.startsWith('V3_')) - Number(left.designId.startsWith('V3_'))
    || left.title.localeCompare(right.title, 'fr'),
  );
}

export function relatedProducts(product: ProductGroup, products: readonly ProductGroup[]) {
  const otherGarments = products.filter((candidate) => candidate.designId === product.designId && candidate.id !== product.id);
  const theme = product.variants.find((variant) => variant.themeId)?.themeId;
  const candidates = products.filter((candidate) => candidate.designId !== product.designId);
  const score = (candidate: ProductGroup) =>
    (theme && candidate.variants.some((variant) => variant.themeId === theme) ? 10 : 0)
    + (candidate.garmentId !== product.garmentId ? 3 : 0)
    + (candidate.designId.startsWith('V3_') === product.designId.startsWith('V3_') ? 1 : 0);
  candidates.sort((left, right) => score(right) - score(left) || left.title.localeCompare(right.title, 'fr'));
  const seen = new Set<string>();
  const similar = candidates.filter((candidate) => {
    if (seen.has(candidate.designId)) return false;
    seen.add(candidate.designId);
    return true;
  }).slice(0, 4);
  return { otherGarments, similar };
}

export function productUrl(base: string, product: ProductGroup, variant = product.variants[0]) {
  return `${base}?product=${encodeURIComponent(product.id)}&color=${encodeURIComponent(variant.color.id)}`;
}
