'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MouseEvent } from 'react';
import { garmentNames, garmentOrder, groupProducts, productId, productUrl, relatedProducts } from './grouping';
import type { CatalogItem, ProductGroup } from './grouping';
import { ProductImage } from './ProductImage';
import { SiteHeader } from '../SiteHeader';
import { ArtworkAccent } from '../ArtworkAccent';
import { PriceSurveyDialog } from './PriceSurveyDialog';
import { surveyEligibleItems, priceSurveysByGarment, mergePriceSurvey } from '../../../lib/price-survey.mjs';
import type { PriceSurvey, StoredPriceSurvey } from '../../../lib/price-survey.mjs';

type Labelled = { id: string; label: { fr: string; en: string } };
type Catalog = {
  campaign: { id: string; maxSelections?: number | null };
  items: CatalogItem[];
  themes?: Labelled[];
  specialCollections?: Labelled[];
};
type Route = { product: string; color: string; legacyItem: string };
const emptyRoute: Route = { product: '', color: '', legacyItem: '' };

export function CollectionStorefront({ catalog, standalone = false }: { catalog: Catalog; standalone?: boolean }) {
  const products = useMemo(() => groupProducts(catalog.items), [catalog.items]);
  const itemById = useMemo(() => new Map(catalog.items.filter((item) => item.active).map((item) => [item.id, item])), [catalog.items]);
  const [route, setRoute] = useState<Route>(emptyRoute);
  const [category, setCategory] = useState('all');
  const [collection, setCollection] = useState('all');
  const [theme, setTheme] = useState('all');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [shareLabel, setShareLabel] = useState('Partager');
  const [notice, setNotice] = useState('');
  const [priceSurvey, setPriceSurvey] = useState<StoredPriceSurvey | null>(null);
  const [surveyItem, setSurveyItem] = useState<CatalogItem | null>(null);
  const surveyPrompted = useRef(new Set<string>());
  const voter = useRef('');
  const voterName = useRef('');
  const voterGroup = useRef('');
  const selections = useRef<string[]>([]);
  const savedSelections = useRef<string[]>([]);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const revision = useRef(0);
  const browsePosition = useRef(0);
  const productHeading = useRef<HTMLHeadingElement>(null);
  const [shopPath, setShopPath] = useState(standalone ? '/' : '/fr/boutique');

  const readRoute = useCallback(() => {
    const params = new URLSearchParams(window.location.search);
    setRoute({ product: params.get('product') ?? '', color: params.get('color') ?? '', legacyItem: params.get('item') ?? '' });
    setCategory(params.get('type') ?? 'all');
    setCollection(params.get('collection') ?? 'all');
    setTheme(params.get('theme') ?? 'all');
    setQuery(params.get('q') ?? '');
    setShopPath(window.location.pathname);
  }, []);

  useEffect(() => {
    readRoute();
    const navigationEvents = ['popstate', 'pushState', 'replaceState'];
    for (const event of navigationEvents) window.addEventListener(event, readRoute);
    return () => { for (const event of navigationEvents) window.removeEventListener(event, readRoute); };
  }, [readRoute]);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15000);
    const voterKey = 'gg-voter:' + catalog.campaign.id;
    try {
      voter.current = localStorage.getItem(voterKey) || crypto.randomUUID();
      localStorage.setItem(voterKey, voter.current);
    } catch {
      voter.current = crypto.randomUUID();
    }
    try { const saved = JSON.parse(sessionStorage.getItem('gg-price-types:' + catalog.campaign.id) || '[]'); if (Array.isArray(saved)) surveyPrompted.current = new Set(saved.filter((id) => typeof id === 'string')); } catch { /* Storage is optional. */ }
    voterGroup.current = (new URLSearchParams(window.location.search).get('group') ?? '').slice(0, 60);
    fetch('/api/votes?mode=ballot&campaignId=' + encodeURIComponent(catalog.campaign.id) + '&voterId=' + encodeURIComponent(voter.current), { cache: 'no-store', signal: controller.signal })
      .then(async (response) => {
        const body = await response.json() as { error?: string; ballot?: { selectedItemIds: string[]; voterName?: string; voterGroup?: string; priceSurvey?: StoredPriceSurvey | null } | null };
        if (!response.ok) throw new Error(body.error || 'Chargement impossible');
        return body;
      })
      .then((body) => {
        if (cancelled || !body.ballot) return;
        const ids = (body.ballot.selectedItemIds as string[]).filter((id) => itemById.has(id));
        selections.current = ids;
        savedSelections.current = ids;
        setSelected(ids);
        voterName.current = body.ballot.voterName || '';
        voterGroup.current ||= body.ballot.voterGroup || '';
        setPriceSurvey(body.ballot.priceSurvey ?? null);
        if (ids.length) setSaveState('saved');
      })
      .catch(() => { if (!cancelled) setSaveState('error'); })
      .finally(() => { window.clearTimeout(timeout); if (!cancelled) setReady(true); });
    return () => { cancelled = true; controller.abort(); window.clearTimeout(timeout); };
  }, [catalog.campaign.id, itemById]);

  const eligibleItems = useMemo(() => surveyEligibleItems(selected, catalog.items), [selected, catalog.items]);
  const priceAnswers = useMemo(() => priceSurveysByGarment(priceSurvey), [priceSurvey]);
  useEffect(() => {
    if (!ready || saveState !== 'saved' || surveyItem) return;
    const next = eligibleItems.find((item) => !surveyPrompted.current.has(item.garment.id)
      && (!priceAnswers[item.garment.id] || priceAnswers[item.garment.id].status === 'skipped'));
    if (!next) return;
    surveyPrompted.current.add(next.garment.id);
    try { sessionStorage.setItem('gg-price-types:' + catalog.campaign.id, JSON.stringify([...surveyPrompted.current])); } catch { /* Storage is optional. */ }
    setSurveyItem(next);
  }, [ready, saveState, eligibleItems, priceAnswers, surveyItem, catalog.campaign.id]);

  function savePriceSurvey(answer: PriceSurvey) {
    const request = queue.current.catch(() => undefined).then(async () => {
      const response = await fetch('/api/votes', {
        method: 'POST', keepalive: true, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'price-survey', campaignId: catalog.campaign.id, voterId: voter.current, priceSurvey: answer }),
      });
      if (!response.ok) throw new Error('Réponse non enregistrée');
      setPriceSurvey((previous) => mergePriceSurvey(previous, answer));
    });
    queue.current = request.catch(() => undefined);
    return request;
  }

  const legacyItem = itemById.get(route.legacyItem);
  const currentProductId = route.product || (legacyItem ? productId(legacyItem) : '');
  const product = products.find((entry) => entry.id === currentProductId);
  const variant = product?.variants.find((entry) => entry.color.id === route.color)
    ?? product?.variants.find((entry) => entry.id === route.legacyItem)
    ?? product?.variants[0];
  const recommendations = useMemo(() => product ? relatedProducts(product, products) : null, [product, products]);
  const categoryIds = garmentOrder.filter((id) => products.some((entry) => entry.garmentId === id));
  const filtered = useMemo(() => {
    const text = query.trim().toLocaleLowerCase('fr');
    return products.filter((entry) => {
      if (category !== 'all' && entry.garmentId !== category) return false;
      if (collection !== 'all' && !entry.variants.some((item) => item.specialCollectionId === collection || item.sectionId === collection)) return false;
      if (theme !== 'all' && !entry.variants.some((item) => item.themeId === theme)) return false;
      return !text || entry.variants.some((item) => (item.title + ' ' + item.garment.label.fr + ' ' + item.color.label.fr).toLocaleLowerCase('fr').includes(text));
    });
  }, [products, category, collection, theme, query]);
  const designCount = new Set(products.map((entry) => entry.designId)).size;
  const newDesignCount = new Set(products.filter((entry) => entry.designId.startsWith('V3_')).map((entry) => entry.designId)).size;
  const status = !ready ? 'Chargement des favoris…' : saveState === 'saving' ? 'Enregistrement…' : saveState === 'saved' ? 'Chaque favori est enregistré et compté, même si vous vous arrêtez ici.' : saveState === 'error' ? 'Connexion interrompue — réessayez votre vote' : 'Vos coups de cœur comptent.';
  const maxSelections = catalog.campaign.maxSelections;
  const mainOrigin = standalone ? 'https://gaminetgamin.com' : '';

  useEffect(() => {
    document.title = product ? product.title + ' · ' + product.variants[0].garment.label.fr + ' | Gaminet Gamin' : 'La collection | Gaminet Gamin';
    if (product) productHeading.current?.focus({ preventScroll: true });
  }, [product]);

  function browseUrl() {
    const url = new URL(window.location.href);
    for (const key of ['product', 'color', 'item']) url.searchParams.delete(key);
    for (const [key, value] of [['type', category], ['collection', collection], ['theme', theme], ['q', query]]) {
      if (value && value !== 'all') url.searchParams.set(key, value);
      else url.searchParams.delete(key);
    }
    return url;
  }
  function openProduct(entry: ProductGroup, color = entry.variants[0]) {
    if (!product) browsePosition.current = window.scrollY;
    const url = browseUrl();
    url.searchParams.set('product', entry.id);
    url.searchParams.set('color', color.color.id);
    window.history.pushState({}, '', url);
    setRoute({ product: entry.id, color: color.color.id, legacyItem: '' });
    setNotice('');
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
  function selectColor(item: CatalogItem) {
    if (!product) return;
    const url = new URL(window.location.href);
    url.searchParams.set('product', product.id);
    url.searchParams.set('color', item.color.id);
    url.searchParams.delete('item');
    window.history.replaceState({}, '', url);
    setRoute({ product: product.id, color: item.color.id, legacyItem: '' });
    setNotice('');
  }
  function showCollection(reset = false) {
    const url = browseUrl();
    if (reset) {
      for (const key of ['type', 'collection', 'theme', 'q']) url.searchParams.delete(key);
      setCategory('all'); setCollection('all'); setTheme('all'); setQuery('');
    }
    window.history.pushState({}, '', url);
    setRoute(emptyRoute);
    window.scrollTo({ top: reset ? 0 : browsePosition.current, behavior: 'instant' });
  }
  function updateFilter(key: 'type' | 'collection' | 'theme' | 'q', value: string) {
    const url = new URL(window.location.href);
    if (value && value !== 'all') url.searchParams.set(key, value); else url.searchParams.delete(key);
    window.history.replaceState({}, '', url);
    if (key === 'type') setCategory(value);
    if (key === 'collection') setCollection(value);
    if (key === 'theme') setTheme(value);
    if (key === 'q') setQuery(value);
  }
  function vote(itemId: string) {
    if (!ready) return;
    const previous = selections.current;
    const removing = previous.includes(itemId);
    if (!removing && maxSelections && previous.length >= maxSelections) {
      setNotice('Vous avez déjà ' + maxSelections + ' favoris. Retirez un cœur pour en choisir un autre.');
      return;
    }
    const next = removing ? previous.filter((id) => id !== itemId) : [...previous, itemId];
    selections.current = next;
    setSelected(next);
    setSaveState('saving');
    setNotice('');
    const requestRevision = ++revision.current;
    queue.current = queue.current.catch(() => undefined).then(async () => {
      const response = await fetch('/api/votes', {
        method: 'POST', keepalive: true, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId: catalog.campaign.id, voterId: voter.current, voterName: voterName.current, voterGroup: voterGroup.current, selectedItemIds: next }),
      });
      if (!response.ok) throw new Error('Vote non enregistré');
      savedSelections.current = next;
      if (requestRevision === revision.current) {
        setSaveState(next.length ? 'saved' : 'idle');
        if (!next.length) setPriceSurvey(null);
      }
    }).catch(() => {
      if (requestRevision !== revision.current) return;
      selections.current = savedSelections.current;
      setSelected(savedSelections.current);
      setSaveState('error');
      setNotice('Ce vote n’a pas pu être enregistré. Réessayez dans un instant.');
    });
  }
  async function share() {
    try {
      const url = window.location.href;
      if (navigator.share) await navigator.share({ title: product ? product.title + ' — Gaminet Gamin' : 'La collection Gaminet Gamin', url });
      else await navigator.clipboard.writeText(url);
      setShareLabel('Lien copié');
      window.setTimeout(() => setShareLabel('Partager'), 1800);
    } catch { setShareLabel('Partager'); }
  }
  function productClick(event: MouseEvent<HTMLAnchorElement>, entry: ProductGroup, color?: CatalogItem) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    openProduct(entry, color);
  }
  function card(entry: ProductGroup) {
    const image = entry.variants[0];
    const likes = entry.variants.filter((item) => selected.includes(item.id)).length;
    return <article key={entry.id} className="group overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg" data-product-id={entry.id}>
      <a href={productUrl(shopPath, entry)} onClick={(event) => productClick(event, entry)} className="relative block overflow-hidden" aria-label={entry.title + ' — ' + image.garment.label.fr + ', ' + entry.variants.length + ' couleurs'}>
        <img src={image.image} alt={entry.title + ' — ' + image.garment.label.fr + ' ' + image.color.label.fr} loading="lazy" className="aspect-square w-full object-cover transition duration-500 group-hover:scale-[1.03]" />
        {likes > 0 && <span className="absolute right-3 top-3 rounded-full bg-[#ff718a] px-3 py-2 text-sm font-bold">♥ {likes}</span>}
      </a>
      <div className="p-4 sm:p-5">
        <p className="text-sm font-semibold text-stone-500">{image.garment.label.fr}</p>
        <h3 className="mt-1 text-lg font-black leading-tight"><a href={productUrl(shopPath, entry)} onClick={(event) => productClick(event, entry)}>{entry.title}</a></h3>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5" aria-label={entry.variants.length + ' couleurs proposées'}>
            {entry.variants.map((item) => <a key={item.id} href={productUrl(shopPath, entry, item)} onClick={(event) => productClick(event, entry, item)} aria-label={entry.title + ' en ' + item.color.label.fr} title={item.color.label.fr} className="grid h-8 w-8 place-items-center rounded-full border border-stone-200 hover:border-stone-800"><span className="h-5 w-5 rounded-full border border-black/10" style={{ backgroundColor: item.color.hex }} /></a>)}
          </div>
        </div>
        <p className="mt-3 text-sm font-semibold text-stone-500">{entry.variants.length} couleurs · Choisir mon modèle</p>
      </div>
    </article>;
  }

  return <>
    {standalone && <SiteHeader standalone />}
    <main className="min-h-[calc(100dvh-5rem)] bg-[#faf9f6] text-[#201c19]">
    <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 border-b border-stone-200 px-4 py-4 sm:px-6" aria-label="Vos favoris">
      <p className="text-sm font-bold">♥ {selected.length} favori{selected.length > 1 ? 's' : ''}{maxSelections ? ' / ' + maxSelections : ''}</p>
      <div className="flex flex-wrap items-center gap-2">
        {eligibleItems.length > 0 && <details className="relative">
          <summary className="cursor-pointer rounded-full bg-[#e9e1fa] px-4 py-2.5 text-sm font-bold">Mes réponses sur les prix</summary>
          <div className="absolute right-0 top-full z-20 mt-2 w-72 space-y-1 rounded-2xl border border-stone-200 bg-white p-2 shadow-xl">
            {eligibleItems.map((item) => <button key={item.garment.id} type="button" onClick={(event) => { event.currentTarget.closest('details')?.removeAttribute('open'); setSurveyItem(item); }} className="block w-full rounded-xl px-3 py-3 text-left text-sm font-bold hover:bg-stone-100">{priceAnswers[item.garment.id] && priceAnswers[item.garment.id].status !== 'skipped' ? 'Modifier' : 'Répondre'} · {item.garment.label.fr}</button>)}
          </div>
        </details>}
        <button type="button" onClick={() => void share()} className="rounded-full border border-stone-200 bg-white px-4 py-2.5 text-sm font-bold">{shareLabel}</button>
      </div>
    </div>
    {surveyItem && <PriceSurveyDialog key={surveyItem.garment.id} item={surveyItem} previous={priceAnswers[surveyItem.garment.id] ?? null} onSave={savePriceSurvey} onDismiss={() => setSurveyItem(null)} />}

    {product && variant ? <>
      <section className="mx-auto max-w-7xl px-4 pb-14 pt-6 sm:px-6 sm:pt-10">
        <nav className="mb-7 flex flex-wrap items-center gap-3 text-sm font-semibold text-stone-500" aria-label="Fil d’Ariane">
          <button type="button" onClick={() => showCollection()} className="underline underline-offset-4">Retour à la collection</button><span>/</span><span>{variant.garment.label.fr}</span><span>/</span><span className="text-stone-800">{product.title}</span>
        </nav>
        <div className="grid items-start gap-8 lg:grid-cols-[1.15fr_1fr] lg:gap-14">
          <ProductImage key={variant.id} src={variant.image} alt={product.title + ' — ' + variant.garment.label.fr + ' ' + variant.color.label.fr} />
          <div className="lg:sticky" style={{ top: 'calc(var(--site-masthead-height, 8rem) + 1rem)' }}>
            <p className="text-sm font-black uppercase tracking-[0.16em] text-[#96682f]">{variant.garment.label.fr}{product.designId.startsWith('V3_') ? ' · Nouveauté' : ''}</p>
            <h1 ref={productHeading} tabIndex={-1} className="mt-3 text-4xl font-black leading-tight tracking-tight outline-none sm:text-5xl">{product.title}</h1>
            <p className="mt-5 text-base leading-relaxed text-stone-600">Un dessin d’enfant, tout son caractère. Choisissez votre couleur préférée et aidez-nous à lui faire une place dans la prochaine collection.</p>
            <fieldset className="mt-8">
              <legend className="mb-3 text-base font-bold">Couleur : <span className="font-medium">{variant.color.label.fr}</span></legend>
              <div className="flex flex-wrap gap-3">
                {product.variants.map((item) => <label key={item.id} className={'flex cursor-pointer items-center gap-3 rounded-2xl border-2 px-4 py-3 text-sm font-bold transition ' + (item.id === variant.id ? 'border-[#201c19] bg-white' : 'border-stone-200 hover:border-stone-400')}>
                  <input type="radio" name="product-color" value={item.id} checked={item.id === variant.id} onChange={() => selectColor(item)} className="sr-only peer" />
                  <span className="h-6 w-6 rounded-full border border-black/15 ring-offset-4 peer-focus-visible:ring-2 peer-focus-visible:ring-[#201c19]" style={{ backgroundColor: item.color.hex }} />
                  {item.color.label.fr}
                  {selected.includes(item.id) && <span className="text-[#c93f61]" aria-label="Dans vos favoris">♥</span>}
                </label>)}
              </div>
            </fieldset>
            <button type="button" onClick={() => vote(variant.id)} disabled={!ready} aria-pressed={selected.includes(variant.id)} className={'mt-7 flex w-full items-center justify-center gap-3 rounded-full px-5 py-4 text-base font-black transition disabled:opacity-40 ' + (selected.includes(variant.id) ? 'bg-[#ff718a] text-[#201c19]' : 'bg-[#201c19] text-white hover:bg-[#44374f]')}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill={selected.includes(variant.id) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78Z" /></svg>
              Voter
            </button>
            <p className="mt-3 text-center text-sm text-stone-600" role="status" aria-live="polite">{notice || status}</p>
            <div className="mt-8 rounded-2xl bg-[#e9e1fa] p-5">
              <p className="font-bold">C’est vous qui choisissez la suite.</p>
              <p className="mt-2 text-sm leading-relaxed text-[#594276]">Chaque cœur exprime trois préférences : l’illustration, la couleur et le type de vêtement. Un même dessin compte une seule fois par personne, même si vous aimez plusieurs versions.</p>
            </div>
          </div>
        </div>
      </section>
      {recommendations && <div className="mx-auto max-w-7xl space-y-14 px-4 pb-20 sm:px-6">
        {recommendations.otherGarments.length > 0 && <section aria-labelledby="same-drawing-title">
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-[#96682f]">Le même dessin, autrement</p>
          <h2 id="same-drawing-title" className="mt-2 text-3xl font-black">Aussi avec {product.title}</h2>
          <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">{recommendations.otherGarments.map(card)}</div>
        </section>}
        {recommendations.similar.length > 0 && <section aria-labelledby="related-drawings-title">
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-[#96682f]">D’autres coups de cœur</p>
          <h2 id="related-drawings-title" className="mt-2 text-3xl font-black">Ces dessins pourraient vous plaire.</h2>
          <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">{recommendations.similar.map(card)}</div>
        </section>}
      </div>}
    </> : currentProductId ? <section className="mx-auto max-w-3xl px-6 py-24 text-center"><h1 className="text-3xl font-black">Ce modèle n’est plus dans la collection.</h1><button type="button" onClick={() => showCollection(true)} className="mt-6 rounded-full bg-[#201c19] px-6 py-3 font-bold text-white">Voir la collection</button></section> : <>
      <section className="mx-auto max-w-7xl px-4 pb-8 pt-10 sm:px-6 sm:pt-16">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div><p className="text-sm font-bold uppercase tracking-[0.18em] text-[#96682f]">Des petits dessins. Beaucoup de caractère.</p><h1 className="mt-3 text-4xl font-black tracking-tight sm:text-6xl">À chacun son coup de cœur.</h1><p className="mt-5 max-w-2xl text-lg leading-relaxed text-stone-600">Choisissez un vêtement, trouvez votre dessin, puis explorez ses couleurs. Chaque cœur compte, sans minimum de choix. Répondez aux questions sur le prix seulement si vous le souhaitez.</p></div>
          <div className="flex shrink-0 items-center gap-4 text-sm text-stone-500 lg:max-w-xs lg:flex-col lg:items-start"><ArtworkAccent name="chat" eager className="w-24 -rotate-6 lg:w-32" /><div><p><strong className="text-2xl text-[#201c19]">{products.length}</strong> modèles · {designCount} dessins</p><p className="mt-2" role="status" aria-live="polite">{status}</p></div></div>
        </div>
        {newDesignCount > 0 && <div className="mt-8 flex flex-col justify-between gap-4 rounded-3xl bg-[#e9e1fa] p-5 sm:flex-row sm:items-center sm:p-6"><div><p className="font-black">Les nouveautés V3 sont là.</p><p className="mt-1 text-base text-[#594276]">{newDesignCount} nouveaux dessins, à découvrir dans toutes leurs couleurs.</p></div><button type="button" onClick={() => { updateFilter('type', 'all'); updateFilter('collection', 'nouveautes-v3'); updateFilter('theme', 'all'); updateFilter('q', ''); }} className="shrink-0 rounded-full bg-[#201c19] px-5 py-3 text-sm font-bold text-white">Voir les nouveautés</button></div>}
      </section>
      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6" aria-label="Catalogue par type de vêtement">
        <div className="mb-8 rounded-3xl border border-stone-200 bg-white p-4 sm:p-5">
          <div className="flex gap-2 overflow-x-auto pb-3" aria-label="Types de vêtements">
            {['all', ...categoryIds].map((id) => <button key={id} type="button" onClick={() => updateFilter('type', id)} aria-pressed={category === id} className={'shrink-0 rounded-full px-4 py-3 text-sm font-bold ' + (category === id ? 'bg-[#201c19] text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200')}>{id === 'all' ? 'Tout' : garmentNames[id]}</button>)}
          </div>
          <div className="grid gap-3 border-t border-stone-100 pt-4 sm:grid-cols-3">
            <label className="block text-sm font-semibold text-stone-500">Rechercher<input type="search" value={query} onChange={(event) => updateFilter('q', event.target.value)} placeholder="Un dessin, une couleur…" className="mt-1 w-full rounded-xl border border-stone-200 bg-[#faf9f6] px-3 py-3 text-base text-[#201c19]" /></label>
            <label className="block text-sm font-semibold text-stone-500">Collection<select value={collection} onChange={(event) => updateFilter('collection', event.target.value)} className="mt-1 w-full rounded-xl border border-stone-200 bg-[#faf9f6] px-3 py-3 text-base text-[#201c19]"><option value="all">Toutes les collections</option>{catalog.specialCollections?.map((entry) => <option key={entry.id} value={entry.id}>{entry.label.fr}</option>)}</select></label>
            <label className="block text-sm font-semibold text-stone-500">Univers<select value={theme} onChange={(event) => updateFilter('theme', event.target.value)} className="mt-1 w-full rounded-xl border border-stone-200 bg-[#faf9f6] px-3 py-3 text-base text-[#201c19]"><option value="all">Tous les univers</option>{catalog.themes?.map((entry) => <option key={entry.id} value={entry.id}>{entry.label.fr}</option>)}</select></label>
          </div>
          <div className="mt-4 flex items-center justify-between text-sm text-stone-500"><span>{filtered.length} modèles</span><button type="button" onClick={() => { updateFilter('type', 'all'); updateFilter('collection', 'all'); updateFilter('theme', 'all'); updateFilter('q', ''); }} className="font-bold underline underline-offset-4">Tout réinitialiser</button></div>
        </div>
        <div className="space-y-14">
          {categoryIds.map((id) => {
            const entries = filtered.filter((entry) => entry.garmentId === id);
            if (!entries.length) return null;
            return <section key={id} aria-labelledby={'category-' + id}><div className="mb-5 flex items-baseline justify-between gap-4"><h2 id={'category-' + id} className="text-3xl font-black">{garmentNames[id]}</h2><p className="text-sm font-semibold text-stone-500">{entries.length} modèles</p></div><div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">{entries.map(card)}</div></section>;
          })}
        </div>
        {!filtered.length && <p className="rounded-3xl bg-white p-12 text-center text-lg font-bold text-stone-500">Aucun modèle pour cette recherche. Essayez un autre dessin ou une autre couleur.</p>}
      </section>
    </>}
    {standalone && <footer className="bg-[#201c19] text-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-6 py-12 sm:grid-cols-2">
        <div><p className="text-xl font-black uppercase">Gaminet Gamin <span className="text-[#c8914a]">GG</span></p><p className="mt-4 max-w-md text-base leading-relaxed text-white/60">Des dessins d’enfants qui ont plus d’imagination que nous autres. Imaginé au Québec.</p></div>
        <nav className="flex flex-wrap items-start gap-6 text-sm font-bold" aria-label="Liens de pied de page"><button type="button" onClick={() => showCollection(true)}>La collection</button><a href={mainOrigin + '/fr/artistes'}>Les p’tits artistes</a><a href={mainOrigin + '/fr/contact'}>Contact</a></nav>
        <p className="text-sm text-white/45">© 2026 Gaminet Gamin GG · La prochaine collection se choisit avec vous.</p>
        {!standalone && <nav className="flex gap-4 text-sm font-bold" aria-label="Langues"><a href="/fr/boutique" lang="fr">FR</a><a href="/en/shop" lang="en">EN</a><a href="/es/tienda" lang="es">ES</a></nav>}
      </div>
    </footer>}
  </main></>;
}
