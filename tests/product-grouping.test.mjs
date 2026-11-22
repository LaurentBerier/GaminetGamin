import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';
import { groupProducts, productId, productUrl, relatedProducts } from '../artifacts/gaminet-gamin-vote/app/components/catalog/grouping.ts';

const catalog = JSON.parse(readFileSync(new URL('../artifacts/gaminet-gamin-vote/content/catalog.json', import.meta.url)));
const groups = groupProducts(catalog.items);

test('colours across collections share one product while garment types stay separate', () => {
  const base = catalog.items[0];
  const items = [
    { ...base, id: 'blue-shirt', designId: 'example', sectionId: 'classics', garment: { ...base.garment, id: 'tshirt' }, color: { ...base.color, id: 'blue' } },
    { ...base, id: 'pink-shirt', designId: 'example', sectionId: 'vivid', garment: { ...base.garment, id: 'tshirt' }, color: { ...base.color, id: 'pink' } },
    { ...base, id: 'blue-hoodie', designId: 'example', garment: { ...base.garment, id: 'hoodie' } },
    { ...base, id: 'inactive', designId: 'retired', active: false },
  ];
  const result = groupProducts(items);
  assert.equal(result.length, 2);
  assert.deepEqual(result.find((group) => group.garmentId === 'tshirt').variants.map((item) => item.id), ['blue-shirt', 'pink-shirt']);
  assert.equal(productId(items[0]), productId(items[1]));
  assert.notEqual(productId(items[0]), productId(items[2]));
});

test('grouping preserves every active voting ID exactly once', () => {
  const before = catalog.items.filter((item) => item.active).map((item) => item.id).sort();
  const after = groups.flatMap((group) => group.variants.map((item) => item.id)).sort();
  assert.deepEqual(after, before);
  assert.equal(new Set(after).size, after.length);
});

test('every product offers at least two distinct colours with existing image files', () => {
  for (const group of groups) {
    const colours = group.variants.map((item) => item.color.id);
    assert.ok(new Set(colours).size >= 2, group.id + ' needs a second colour');
    assert.equal(new Set(colours).size, colours.length, group.id + ' repeats a colour');
    for (const item of group.variants) {
      assert.ok(existsSync(new URL('../artifacts/gaminet-gamin-vote/public' + item.image, import.meta.url)), item.image);
      assert.ok(existsSync(new URL('../artifacts/gaminet-gamin/public' + item.image, import.meta.url)), item.image);
    }
  }
});

test('recommendations offer the same drawing on other garments and distinct related drawings', () => {
  const product = groups.find((group) => group.id === 'v3-lapinou--crewneck');
  assert.ok(product);
  const { otherGarments, similar } = relatedProducts(product, groups);
  assert.ok(otherGarments.some((group) => group.garmentId === 'tote'));
  assert.ok(otherGarments.every((group) => group.designId === product.designId && group.id !== product.id));
  assert.ok(similar.every((group) => group.designId !== product.designId));
  assert.equal(new Set(similar.map((group) => group.designId)).size, similar.length);
  assert.ok(similar.every((group) => group.variants.some((item) => item.themeId === 'animaux-rigolos')));
});

test('product links keep one product identity and identify the chosen colour', () => {
  const group = groups.find((entry) => entry.variants.length > 1);
  assert.ok(group);
  const first = new URL(productUrl('/fr/boutique', group, group.variants[0]), 'https://gaminetgamin.com');
  const second = new URL(productUrl('/fr/boutique', group, group.variants[1]), 'https://gaminetgamin.com');
  assert.equal(first.searchParams.get('product'), second.searchParams.get('product'));
  assert.notEqual(first.searchParams.get('color'), second.searchParams.get('color'));
});

test('a drawing offered on one garment suggests other garment types with related drawings', () => {
  const product = groups.find((group) => group.id === 'v3-broco-bili--tshirt');
  const { otherGarments, similar } = relatedProducts(product, groups);
  assert.equal(otherGarments.length, 0);
  assert.equal(similar.length, 4);
  assert.ok(similar.every((group) => group.garmentId !== product.garmentId));
  assert.ok(similar.every((group) => group.variants.some((item) => item.themeId === product.variants[0].themeId)));
});
