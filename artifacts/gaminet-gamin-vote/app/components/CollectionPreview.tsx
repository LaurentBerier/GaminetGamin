'use client';

/* eslint-disable @next/next/no-img-element */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import catalog from '../../content/catalog.json';

type ResultData = {
  campaignId: string;
  participants: number;
  itemCounts: Record<string, number>;
  groups: Record<
    string,
    { participants: number; itemCounts: Record<string, number> }
  >;
  lastVoteAt: number;
};

const activeItems = catalog.items.filter((item) => item.active);
const itemById = new Map(activeItems.map((item) => [item.id, item]));
const activeSections = catalog.sections.filter((section) =>
  activeItems.some((item) => item.sectionId === section.id),
);
const sectionById = new Map(
  activeSections.map((section) => [section.id, section]),
);
const themeById = new Map(catalog.themes.map((theme) => [theme.id, theme]));
const specialCollectionById = new Map(
  catalog.specialCollections.map((collection) => [collection.id, collection]),
);
const garmentOptions = Array.from(
  new Map(activeItems.map((item) => [item.garment.id, item.garment])).values(),
).sort((left, right) => left.label.fr.localeCompare(right.label.fr, 'fr'));
const colorOptions = Array.from(
  new Map(activeItems.map((item) => [item.color.id, item.color])).values(),
).sort((left, right) => left.label.fr.localeCompare(right.label.fr, 'fr'));

function shuffled<T>(items: T[]) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[randomIndex]] = [copy[randomIndex], copy[index]];
  }
  return copy;
}

function getUrlValue(name: string) {
  if (typeof window === 'undefined') return '';
  return new URLSearchParams(window.location.search).get(name) ?? '';
}

function publicVotingUrl(group?: string) {
  if (typeof window === 'undefined') return '';
  const url = new URL(window.location.origin);
  url.searchParams.set('campaign', catalog.campaign.id);
  if (group) url.searchParams.set('group', group);
  return url.toString();
}

function humanGroup(value: string) {
  if (!value) return 'Lien général';
  return value.replace(/[-_]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

async function copyText(value: string) {
  await navigator.clipboard.writeText(value);
}

function ResultsDashboard({ resultsKey }: { resultsKey: string }) {
  const [data, setData] = useState<ResultData | null>(null);
  const [error, setError] = useState('');
  const [group, setGroup] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [shareGroup, setShareGroup] = useState('famille');
  const [groupLinkCopied, setGroupLinkCopied] = useState(false);
  const [rankingTheme, setRankingTheme] = useState('all');
  const [rankingGarment, setRankingGarment] = useState('all');
  const [rankingColor, setRankingColor] = useState('all');
  const [rankingSpecial, setRankingSpecial] = useState('all');

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch(
        `/api/votes?mode=results&campaignId=${encodeURIComponent(catalog.campaign.id)}&key=${encodeURIComponent(resultsKey)}`,
        { cache: 'no-store' },
      );
      const body = (await response.json()) as ResultData & { error?: string };
      if (!response.ok) throw new Error(body.error || 'Impossible de charger les résultats.');
      setData(body);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Une erreur est survenue.');
    } finally {
      setIsLoading(false);
    }
  }, [resultsKey]);

  useEffect(() => {
    const refreshTimer = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(refreshTimer);
  }, [refresh]);

  const currentParticipants =
    group === 'all' ? data?.participants ?? 0 : data?.groups[group]?.participants ?? 0;
  const currentCounts =
    group === 'all' ? data?.itemCounts ?? {} : data?.groups[group]?.itemCounts ?? {};
  const ranked = activeItems
    .map((item) => ({ item, votes: currentCounts[item.id] ?? 0 }))
    .filter(({ item, votes }) => {
      if (votes === 0) return false;
      if (rankingTheme !== 'all' && item.themeId !== rankingTheme) return false;
      if (rankingGarment !== 'all' && item.garment.id !== rankingGarment) return false;
      if (rankingColor !== 'all' && item.color.id !== rankingColor) return false;
      if (rankingSpecial !== 'all' && item.specialCollectionId !== rankingSpecial) return false;
      return true;
    })
    .sort((left, right) => right.votes - left.votes || left.item.title.localeCompare(right.item.title));

  const copyMainLink = async () => {
    await copyText(publicVotingUrl());
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const copyGroupLink = async () => {
    const cleanGroup = shareGroup.replace(/[<>]/g, '').trim().slice(0, 60);
    await copyText(publicVotingUrl(cleanGroup || undefined));
    setGroupLinkCopied(true);
    window.setTimeout(() => setGroupLinkCopied(false), 1800);
  };

  return (
    <main className="min-h-screen bg-[#f7f3eb] text-[#201c19]">
      <header className="border-b border-black/10 bg-[#201c19] text-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-5 sm:px-8">
          <div>
            <p className="text-lg font-black uppercase tracking-[-0.04em]">Gaminet Gamin</p>
            <p className="mt-1 text-[10px] font-extrabold uppercase tracking-[0.28em] text-[#dce77d]">Tableau privé</p>
          </div>
          <div className="flex gap-2">
            <button onClick={copyMainLink} className="rounded-full bg-white px-4 py-2.5 text-sm font-black text-[#201c19]">
              {copied ? 'Lien copié' : 'Copier le lien de vote'}
            </button>
            <button onClick={() => void refresh()} className="rounded-full border border-white/25 px-4 py-2.5 text-sm font-bold text-white">
              Actualiser
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-5 py-12 sm:px-8">
        <div className="grid gap-7 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#b77832]">Résultats en direct</p>
            <h1 className="mt-3 text-5xl font-black tracking-[-0.05em] sm:text-7xl">Les favoris prennent forme.</h1>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-3xl bg-[#dce77d] px-6 py-5">
              <p className="text-4xl font-black">{data?.participants ?? 0}</p>
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-black/55">Participants</p>
            </div>
            <div className="rounded-3xl bg-white px-6 py-5 shadow-sm">
              <p className="text-4xl font-black">{ranked.length}</p>
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-black/45">Choix cités</p>
            </div>
          </div>
        </div>

        {error && <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-5 font-bold text-red-800">{error}</div>}

        <div className="mt-10 flex gap-2 overflow-x-auto pb-2">
          <button onClick={() => setGroup('all')} className={`shrink-0 rounded-full px-4 py-2.5 text-sm font-black ${group === 'all' ? 'bg-[#201c19] text-white' : 'border border-black/10 bg-white'}`}>
            Tous · {data?.participants ?? 0}
          </button>
          {Object.entries(data?.groups ?? {}).map(([groupName, summary]) => (
            <button key={groupName} onClick={() => setGroup(groupName)} className={`shrink-0 rounded-full px-4 py-2.5 text-sm font-black ${group === groupName ? 'bg-[#201c19] text-white' : 'border border-black/10 bg-white'}`}>
              {humanGroup(groupName)} · {summary.participants}
            </button>
          ))}
        </div>

        <div className="mt-5 grid gap-4 rounded-[1.6rem] border border-black/8 bg-white p-5 sm:grid-cols-[1fr_auto] sm:items-end">
          <label className="block">
            <span className="mb-2 block text-xs font-black uppercase tracking-[0.13em] text-black/45">Créer un lien pour un groupe</span>
            <input value={shareGroup} onChange={(event) => setShareGroup(event.target.value.slice(0, 60))} placeholder="Famille, amis, équipe…" className="w-full rounded-2xl border border-black/10 bg-[#f7f3eb] px-4 py-3 font-bold outline-none focus:border-[#b77832]" />
          </label>
          <button onClick={() => void copyGroupLink()} className="rounded-full bg-[#201c19] px-5 py-3.5 text-sm font-black text-white">
            {groupLinkCopied ? 'Lien copié' : 'Copier ce lien de groupe'}
          </button>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2 rounded-[1.6rem] border border-black/8 bg-white p-4 lg:grid-cols-[1fr_1fr_1fr_1.2fr_auto]">
          <select value={rankingTheme} onChange={(event) => setRankingTheme(event.target.value)} className="rounded-xl border border-black/10 bg-[#f7f3eb] px-3 py-3 text-xs font-bold outline-none focus:border-[#b77832]" aria-label="Classer par thème">
            <option value="all">Tous les thèmes</option>
            {catalog.themes.map((theme) => <option key={theme.id} value={theme.id}>{theme.label.fr}</option>)}
          </select>
          <select value={rankingGarment} onChange={(event) => setRankingGarment(event.target.value)} className="rounded-xl border border-black/10 bg-[#f7f3eb] px-3 py-3 text-xs font-bold outline-none focus:border-[#b77832]" aria-label="Classer par catégorie de vêtement">
            <option value="all">Toutes les catégories</option>
            {garmentOptions.map((garment) => <option key={garment.id} value={garment.id}>{garment.label.fr}</option>)}
          </select>
          <select value={rankingColor} onChange={(event) => setRankingColor(event.target.value)} className="rounded-xl border border-black/10 bg-[#f7f3eb] px-3 py-3 text-xs font-bold outline-none focus:border-[#b77832]" aria-label="Classer par couleur">
            <option value="all">Toutes les couleurs</option>
            {colorOptions.map((color) => <option key={color.id} value={color.id}>{color.label.fr}</option>)}
          </select>
          <select value={rankingSpecial} onChange={(event) => setRankingSpecial(event.target.value)} className="rounded-xl border border-black/10 bg-[#f7f3eb] px-3 py-3 text-xs font-bold outline-none focus:border-[#b77832]" aria-label="Classer par collection spéciale">
            <option value="all">Toutes les collections</option>
            {catalog.specialCollections.map((collection) => <option key={collection.id} value={collection.id}>{collection.label.fr}</option>)}
          </select>
          <button type="button" onClick={() => { setRankingTheme('all'); setRankingGarment('all'); setRankingColor('all'); setRankingSpecial('all'); }} className="col-span-2 rounded-xl px-3 py-3 text-xs font-black text-black/45 hover:bg-stone-100 hover:text-black lg:col-span-1">
            Réinitialiser
          </button>
        </div>

        <div className="mt-6 overflow-hidden rounded-[2rem] border border-black/8 bg-white shadow-[0_12px_40px_rgba(53,45,36,0.08)]">
          <div className="grid grid-cols-[44px_1fr_72px] border-b border-black/8 px-4 py-3 text-[10px] font-black uppercase tracking-[0.15em] text-black/45 sm:grid-cols-[56px_90px_1fr_100px] sm:px-6">
            <span>#</span><span className="hidden sm:block">Aperçu</span><span>Morceau</span><span className="text-right">Votes</span>
          </div>
          {isLoading ? (
            <p className="p-10 text-center font-bold text-black/45">Chargement des bulletins…</p>
          ) : ranked.length === 0 ? (
            <p className="p-10 text-center font-bold text-black/45">Aucun vote pour ce groupe pour le moment.</p>
          ) : (
            ranked.map(({ item, votes }, index) => {
              const percentage = currentParticipants ? Math.round((votes / currentParticipants) * 100) : 0;
              return (
                <div key={item.id} className="grid grid-cols-[44px_1fr_72px] items-center border-b border-black/6 px-4 py-3 last:border-0 sm:grid-cols-[56px_90px_1fr_100px] sm:px-6">
                  <span className="text-xl font-black text-black/30">{index + 1}</span>
                  <img src={item.image} alt="" className="hidden h-16 w-16 rounded-xl object-cover sm:block" />
                  <div className="min-w-0 pr-4">
                    <p className="truncate font-black">{item.title}</p>
                    <p className="mt-1 truncate text-xs text-black/45">{item.garment.label.fr} · {item.color.label.fr}</p>
                    <p className="mt-1 truncate text-[10px] font-black uppercase tracking-[0.08em] text-[#b77832]">
                      {themeById.get(item.themeId)?.label.fr}
                      {item.specialCollectionId ? ` · ${specialCollectionById.get(item.specialCollectionId)?.label.fr}` : ''}
                    </p>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/8">
                      <div className="h-full rounded-full bg-[#ff6f86]" style={{ width: `${percentage}%` }} />
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-black">{votes}</p>
                    <p className="text-xs font-bold text-black/40">{percentage}%</p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>
    </main>
  );
}

export function CollectionPreview() {
  const [resultsKey] = useState(() => getUrlValue('results'));
  const [randomizedItems, setRandomizedItems] = useState(activeItems);
  const [filter, setFilter] = useState('all');
  const [themeFilter, setThemeFilter] = useState('all');
  const [garmentFilter, setGarmentFilter] = useState('all');
  const [colorFilter, setColorFilter] = useState('all');
  const [specialFilter, setSpecialFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [previewItemId, setPreviewItemId] = useState('');
  const [voterId, setVoterId] = useState('');
  const [voterGroup, setVoterGroup] = useState(() => getUrlValue('group').slice(0, 60));
  const [hydrated, setHydrated] = useState(false);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [shareState, setShareState] = useState('Partager');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const selectedRef = useRef<string[]>([]);
  const saveQueue = useRef<Promise<void>>(Promise.resolve());
  const saveRevision = useRef(0);

  useEffect(() => {
    setRandomizedItems(shuffled(activeItems));
  }, []);

  useEffect(() => {
    if (resultsKey) return;
    const initializeTimer = window.setTimeout(() => {
      const voterKey = `gg-voter:${catalog.campaign.id}`;
      let storedVoterId = localStorage.getItem(voterKey) ?? '';
      if (!storedVoterId) {
        storedVoterId = crypto.randomUUID();
        localStorage.setItem(voterKey, storedVoterId);
      }
      setVoterId(storedVoterId);

      fetch(`/api/votes?mode=ballot&campaignId=${encodeURIComponent(catalog.campaign.id)}&voterId=${encodeURIComponent(storedVoterId)}`, { cache: 'no-store' })
        .then(async (response) => {
          const body = (await response.json()) as {
            ballot?: {
              voterName: string;
              voterGroup: string;
              selectedItemIds: string[];
            } | null;
            error?: string;
          };
          if (!response.ok) {
            throw new Error(body.error || 'Impossible de charger vos favoris.');
          }
          return body;
        })
        .then((body) => {
          if (!body.ballot) return;
          const storedSelections = body.ballot.selectedItemIds.filter((id) => itemById.has(id));
          selectedRef.current = storedSelections;
          setSelected(storedSelections);
          setVoterGroup((current) => current || body.ballot?.voterGroup || '');
          if (storedSelections.length) setSaveState('saved');
        })
        .catch(() => setSaveState('error'))
        .finally(() => setHydrated(true));
    }, 0);
    return () => window.clearTimeout(initializeTimer);
  }, [resultsKey]);

  useEffect(() => {
    if (!previewItemId) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPreviewItemId('');
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [previewItemId]);

  const filteredItems = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('fr');
    return randomizedItems.filter((item) => {
      if (filter !== 'all' && item.sectionId !== filter) return false;
      if (themeFilter !== 'all' && item.themeId !== themeFilter) return false;
      if (garmentFilter !== 'all' && item.garment.id !== garmentFilter) return false;
      if (colorFilter !== 'all' && item.color.id !== colorFilter) return false;
      if (specialFilter !== 'all' && item.specialCollectionId !== specialFilter) return false;
      if (!normalized) return true;
      return `${item.title} ${item.garment.label.fr} ${item.color.label.fr} ${themeById.get(item.themeId)?.label.fr ?? ''} ${item.specialCollectionId ? specialCollectionById.get(item.specialCollectionId)?.label.fr ?? '' : ''}`
        .toLocaleLowerCase('fr')
      .includes(normalized);
    });
  }, [colorFilter, filter, garmentFilter, query, randomizedItems, specialFilter, themeFilter]);

  const persistLikes = (nextSelections: string[]) => {
    if (!voterId) return;
    const revision = ++saveRevision.current;
    setSaveState('saving');
    saveQueue.current = saveQueue.current
      .catch(() => undefined)
      .then(async () => {
        const response = await fetch('/api/votes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            campaignId: catalog.campaign.id,
            voterId,
            voterName: '',
            voterGroup,
            selectedItemIds: nextSelections,
          }),
        });
        const body = (await response.json()) as { error?: string };
        if (!response.ok) throw new Error(body.error || 'Impossible d’enregistrer ce favori.');
        if (revision === saveRevision.current) {
          setSaveState(nextSelections.length ? 'saved' : 'idle');
        }
      })
      .catch(() => {
        if (revision === saveRevision.current) setSaveState('error');
      });
  };

  const toggle = (itemId: string) => {
    if (!hydrated) return;
    const current = selectedRef.current;
    const nextSelections = current.includes(itemId)
      ? current.filter((id) => id !== itemId)
      : [...current, itemId];
    selectedRef.current = nextSelections;
    setSelected(nextSelections);
    persistLikes(nextSelections);
  };

  const share = async () => {
    const url = publicVotingUrl(voterGroup || undefined);
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Vote Gaminet Gamin', text: 'Choisis tes vêtements préférés pour la prochaine collection Gaminet Gamin.', url });
      } else {
        await copyText(url);
      }
      setShareState('Lien copié');
      window.setTimeout(() => setShareState('Partager'), 1800);
    } catch {
      setShareState('Partager');
    }
  };

  if (resultsKey) return <ResultsDashboard resultsKey={resultsKey} />;

  const previewItem = previewItemId ? itemById.get(previewItemId) : undefined;
  const statusLabel = saveState === 'saving'
    ? 'Enregistrement…'
    : saveState === 'saved'
      ? 'Favoris enregistrés'
      : saveState === 'error'
        ? 'Erreur — recliquez le cœur'
        : 'Cliquez sur un cœur pour voter';

  return (
    <main className="min-h-screen bg-[#faf9f6] text-[#201c19]">
      <header className="sticky top-0 z-30 border-b border-stone-200 bg-[#faf9f6]/95 backdrop-blur-xl">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex h-16 items-center justify-between gap-4">
            <a href="https://gaminetgamin.com/fr" className="leading-none transition hover:opacity-75" aria-label="Accueil Gaminet Gamin">
              <span className="block text-lg font-black uppercase tracking-tight">Gaminet Gamin</span>
              <span className="mt-1 block text-sm font-black tracking-[0.28em] text-[#c8914a]">GG</span>
            </a>
            <nav className="hidden items-center gap-6 text-sm font-bold text-black/50 md:flex" aria-label="Navigation principale">
              <button onClick={() => setFilter('all')} className="border-b-2 border-[#c8914a] pb-0.5 text-[#201c19]">Boutique</button>
              <a href="https://gaminetgamin.com/fr/artistes" className="transition hover:text-[#201c19]">Les p&apos;tits monstres</a>
              <a href="https://gaminetgamin.com/fr/apropos" className="transition hover:text-[#201c19]">À propos</a>
              <a href="https://gaminetgamin.com/fr/contact" className="transition hover:text-[#201c19]">Contact</a>
            </nav>
            <div className="flex items-center gap-2">
              <div className="hidden items-center gap-1 text-[11px] font-black text-black/45 sm:flex" aria-label="Langues">
                <span className="rounded-full bg-stone-200 px-2.5 py-1.5 text-[#201c19]">FR</span>
                <a href="https://gaminetgamin.com/en" className="rounded-full px-2 py-1.5 hover:bg-stone-100">EN</a>
                <a href="https://gaminetgamin.com/es" className="rounded-full px-2 py-1.5 hover:bg-stone-100">ES</a>
              </div>
              <button onClick={() => void share()} className="hidden rounded-full border border-stone-200 bg-white px-3 py-2 text-xs font-black lg:block">{shareState}</button>
              <div className="rounded-full bg-[#201c19] px-3.5 py-2 text-xs font-black text-white" title={statusLabel}>
                <span className="mr-1 text-[#ff718a]">♥</span> {selected.length}
              </div>
              <button type="button" onClick={() => setMobileMenuOpen((current) => !current)} className="grid h-10 w-10 place-items-center rounded-lg text-xl font-black hover:bg-stone-100 md:hidden" aria-label="Menu" aria-expanded={mobileMenuOpen}>
                {mobileMenuOpen ? '×' : '☰'}
              </button>
            </div>
          </div>
          {mobileMenuOpen && (
            <nav className="flex flex-col gap-1 border-t border-stone-200 py-3 text-sm font-bold md:hidden" aria-label="Navigation mobile">
              <button onClick={() => { setFilter('all'); setMobileMenuOpen(false); }} className="rounded-lg bg-amber-50 px-3 py-2.5 text-left text-[#201c19]">Boutique</button>
              <a href="https://gaminetgamin.com/fr/artistes" className="rounded-lg px-3 py-2.5 text-black/60 hover:bg-stone-100">Les p&apos;tits monstres</a>
              <a href="https://gaminetgamin.com/fr/apropos" className="rounded-lg px-3 py-2.5 text-black/60 hover:bg-stone-100">À propos</a>
              <a href="https://gaminetgamin.com/fr/contact" className="rounded-lg px-3 py-2.5 text-black/60 hover:bg-stone-100">Contact</a>
              <button onClick={() => void share()} className="rounded-lg px-3 py-2.5 text-left text-black/60 hover:bg-stone-100">{shareState}</button>
            </nav>
          )}
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 pb-8 pt-12 sm:px-6 sm:pt-16">
        <div className="max-w-3xl">
          <p className="mb-3 text-xs font-black uppercase tracking-[0.2em] text-[#c8914a]">Nouvelle collection · vote ouvert</p>
          <h1 className="text-4xl font-black uppercase tracking-tight sm:text-5xl">Boutique</h1>
          <p className="mt-3 text-base font-semibold text-black/50 sm:text-lg">
            Tous nos nouveaux dessins et vêtements sont réunis ici. Agrandissez une photo pour voir le morceau, puis cliquez sur le cœur pour voter instantanément.
          </p>
          <div className="mt-5 h-1 w-16 rounded-full bg-[#c8914a]" />
          <div className="mt-5 flex flex-wrap items-center gap-3 text-xs font-bold text-black/45">
            <span>{activeItems.length} options</span>
            <span aria-hidden="true">·</span>
            <span>{statusLabel}</span>
            {voterGroup && <span className="rounded-full bg-[#dce77d] px-3 py-1.5 text-black/65">Groupe · {humanGroup(voterGroup)}</span>}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
        <div className="sticky top-16 z-20 -mx-2 mb-8 rounded-2xl bg-[#faf9f6]/95 px-2 py-3 backdrop-blur-lg">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Filtrer les vêtements">
              <button onClick={() => setFilter('all')} className={`shrink-0 rounded-full px-4 py-2.5 text-sm font-bold ${filter === 'all' ? 'bg-[#201c19] text-white' : 'bg-stone-100 text-black/55 hover:bg-stone-200'}`}>
                Tout · {activeItems.length}
              </button>
              {activeSections.map((section) => {
                const count = activeItems.filter((item) => item.sectionId === section.id).length;
                return (
                  <button key={section.id} onClick={() => setFilter(section.id)} className={`shrink-0 rounded-full px-4 py-2.5 text-sm font-bold ${filter === section.id ? 'bg-[#201c19] text-white' : 'bg-stone-100 text-black/55 hover:bg-stone-200'}`}>
                    {section.label.fr} · {count}
                  </button>
                );
              })}
            </div>
            <label className="relative block shrink-0">
              <span className="sr-only">Rechercher un morceau</span>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher un dessin…" className="w-full rounded-full border border-stone-200 bg-white px-5 py-3 text-sm font-bold outline-none placeholder:text-black/35 focus:border-[#c8914a] lg:w-64" />
            </label>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 border-t border-stone-200/80 pt-3 lg:grid-cols-[1fr_1fr_1fr_1.2fr_auto]">
            <label>
              <span className="sr-only">Filtrer par thème</span>
              <select value={themeFilter} onChange={(event) => setThemeFilter(event.target.value)} className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-xs font-bold outline-none focus:border-[#c8914a]">
                <option value="all">Tous les thèmes</option>
                {catalog.themes.map((theme) => <option key={theme.id} value={theme.id}>{theme.label.fr}</option>)}
              </select>
            </label>
            <label>
              <span className="sr-only">Filtrer par catégorie de vêtement</span>
              <select value={garmentFilter} onChange={(event) => setGarmentFilter(event.target.value)} className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-xs font-bold outline-none focus:border-[#c8914a]">
                <option value="all">Toutes les catégories</option>
                {garmentOptions.map((garment) => <option key={garment.id} value={garment.id}>{garment.label.fr}</option>)}
              </select>
            </label>
            <label>
              <span className="sr-only">Filtrer par couleur</span>
              <select value={colorFilter} onChange={(event) => setColorFilter(event.target.value)} className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-xs font-bold outline-none focus:border-[#c8914a]">
                <option value="all">Toutes les couleurs</option>
                {colorOptions.map((color) => <option key={color.id} value={color.id}>{color.label.fr}</option>)}
              </select>
            </label>
            <label>
              <span className="sr-only">Filtrer par collection spéciale</span>
              <select value={specialFilter} onChange={(event) => setSpecialFilter(event.target.value)} className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-xs font-bold outline-none focus:border-[#c8914a]">
                <option value="all">Toutes les collections</option>
                {catalog.specialCollections.map((collection) => <option key={collection.id} value={collection.id}>{collection.label.fr}</option>)}
              </select>
            </label>
            <button
              type="button"
              onClick={() => { setThemeFilter('all'); setGarmentFilter('all'); setColorFilter('all'); setSpecialFilter('all'); setQuery(''); }}
              className="col-span-2 rounded-xl px-3 py-2.5 text-xs font-black text-black/45 hover:bg-stone-100 hover:text-black lg:col-span-1"
            >
              Réinitialiser · {filteredItems.length}
            </button>
          </div>
        </div>

        {filter !== 'all' && sectionById.get(filter) && (
          <div className="mb-6 rounded-2xl border border-stone-200 bg-white p-5">
            <h2 className="text-xl font-black">{sectionById.get(filter)?.label.fr}</h2>
            <p className="mt-1 text-sm font-semibold text-black/45">{sectionById.get(filter)?.description.fr}</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
          {filteredItems.map((item) => {
            const isSelected = selected.includes(item.id);
            return (
              <article key={item.id} className={`group overflow-hidden rounded-2xl border bg-white transition duration-300 hover:-translate-y-0.5 hover:shadow-lg ${isSelected ? 'border-[#ff718a] ring-2 ring-[#ff718a]/35' : 'border-stone-200'}`}>
                <div className="relative aspect-square overflow-hidden bg-stone-100">
                  <button type="button" onClick={() => setPreviewItemId(item.id)} aria-label={`Agrandir ${item.title}`} className="block h-full w-full cursor-zoom-in overflow-hidden text-left">
                    <img src={item.image} alt={`${item.title} — ${item.garment.label.fr} ${item.color.label.fr}`} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.035]" />
                    <span className="absolute bottom-3 left-3 rounded-full bg-white/90 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-black/60 opacity-0 shadow-sm transition group-hover:opacity-100">Agrandir</span>
                  </button>
                  <button type="button" onClick={() => toggle(item.id)} disabled={!hydrated} aria-pressed={isSelected} aria-label={`${isSelected ? 'Retirer le vote pour' : 'Voter pour'} ${item.title}`} className={`absolute right-3 top-3 z-10 grid h-11 w-11 place-items-center rounded-full border text-2xl shadow-md transition hover:scale-110 disabled:cursor-not-allowed disabled:opacity-40 ${isSelected ? 'border-[#201c19] bg-[#ff718a] text-[#201c19]' : 'border-white bg-white text-black/35 hover:text-[#ff718a]'}`}>
                    {isSelected ? '♥' : '♡'}
                  </button>
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="min-h-10 text-sm font-bold leading-tight sm:text-base">{item.title}</h2>
                    <p className="shrink-0 text-sm font-black">{item.garment.price.toFixed(2)} $</p>
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-xs font-semibold text-black/45">
                    <span className="h-3 w-3 rounded-full border border-black/10" style={{ backgroundColor: item.color.hex }} />
                    <span className="truncate">{item.garment.label.fr} · {item.color.label.fr}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.1em]">
                    <span className="text-[#c8914a]">{themeById.get(item.themeId)?.label.fr}</span>
                    {item.specialCollectionId && (
                      <span className="rounded-full bg-[#dce77d] px-2 py-1 text-[#201c19]">
                        {specialCollectionById.get(item.specialCollectionId)?.label.fr}
                      </span>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {!filteredItems.length && <div className="rounded-3xl border border-stone-200 bg-white p-12 text-center font-black text-black/45">Aucun morceau ne correspond à cette recherche.</div>}
      </section>

      <footer className="bg-[#201c19] text-white">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <div className="grid gap-10 border-b border-white/10 pb-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr]">
            <div>
              <p className="text-xl font-black uppercase tracking-tight">Gaminet Gamin</p>
              <p className="mt-1 text-base font-black tracking-[0.28em] text-[#c8914a]">GG</p>
              <p className="mt-5 max-w-sm text-sm font-semibold leading-relaxed text-white/55">Des designs faits icitte au Québec, par des enfants qui ont plus d&apos;imagination que nous autres.</p>
              <button onClick={() => void share()} className="mt-5 rounded-full bg-white px-5 py-2.5 text-sm font-black text-[#201c19]">{shareState}</button>
            </div>
            <div>
              <h2 className="text-xs font-black uppercase tracking-[0.18em] text-white/40">Navigation</h2>
              <ul className="mt-4 space-y-3 text-sm font-bold text-white/70">
                <li><button onClick={() => { setFilter('all'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="hover:text-white">Boutique</button></li>
                <li><a href="https://gaminetgamin.com/fr/artistes" className="hover:text-white">Les p&apos;tits monstres</a></li>
                <li><a href="https://gaminetgamin.com/fr/apropos" className="hover:text-white">À propos</a></li>
                <li><a href="https://gaminetgamin.com/fr/contact" className="hover:text-white">Contact</a></li>
              </ul>
            </div>
            <div>
              <h2 className="text-xs font-black uppercase tracking-[0.18em] text-white/40">Info</h2>
              <ul className="mt-4 space-y-3 text-sm font-bold text-white/70">
                <li>Info livraison</li>
                <li>FAQ</li>
                <li>Politique de confidentialité</li>
                <li><a href="https://instagram.com" className="hover:text-white">Suivez-nous sur Instagram</a></li>
              </ul>
            </div>
          </div>
          <div className="flex flex-col gap-2 pt-6 text-xs font-bold text-white/35 sm:flex-row sm:justify-between">
            <p>© 2026 Gaminet Gamin GG — Tous droits réservés</p>
            <p>Fait avec <span className="text-[#ff718a]">♥</span> au Québec</p>
          </div>
        </div>
      </footer>

      {previewItem && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[#201c19]/75 p-3 backdrop-blur-sm sm:p-6" role="dialog" aria-modal="true" aria-labelledby="preview-title" onMouseDown={(event) => { if (event.target === event.currentTarget) setPreviewItemId(''); }}>
          <div className="relative mx-auto my-3 max-w-5xl overflow-hidden rounded-3xl bg-[#faf9f6] shadow-2xl sm:my-8">
            <button onClick={() => setPreviewItemId('')} aria-label="Fermer l’agrandissement" className="absolute right-4 top-4 z-10 grid h-11 w-11 place-items-center rounded-full bg-white text-2xl font-black shadow-md">×</button>
            <div className="grid md:grid-cols-[1.3fr_0.7fr]">
              <div className="aspect-square bg-stone-100">
                <img src={previewItem.image} alt={`${previewItem.title} — aperçu agrandi`} className="h-full w-full object-contain" />
              </div>
              <div className="flex flex-col justify-center p-6 sm:p-10">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#c8914a]">{sectionById.get(previewItem.sectionId)?.label.fr}</p>
                <h2 id="preview-title" className="mt-3 text-3xl font-black uppercase tracking-tight sm:text-4xl">{previewItem.title}</h2>
                <p className="mt-3 text-2xl font-black">{previewItem.garment.price.toFixed(2)} $</p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs font-black">
                  <span className="rounded-full bg-stone-200 px-3 py-1.5 text-black/60">{themeById.get(previewItem.themeId)?.label.fr}</span>
                  {previewItem.specialCollectionId && (
                    <span className="rounded-full bg-[#dce77d] px-3 py-1.5 text-[#201c19]">
                      {specialCollectionById.get(previewItem.specialCollectionId)?.label.fr}
                    </span>
                  )}
                </div>
                {previewItem.specialCollectionId && (
                  <div className="mt-4 rounded-2xl border border-[#c7d459] bg-[#f4f8cb] p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-black/45">
                      {specialCollectionById.get(previewItem.specialCollectionId)?.kind.fr}
                    </p>
                    <p className="mt-1 text-sm font-black">{previewItem.collectionRole?.fr}</p>
                  </div>
                )}
                <div className="mt-6 border-y border-stone-200 py-5">
                  <p className="text-xs font-black uppercase tracking-[0.12em] text-black/40">Vêtement</p>
                  <p className="mt-1 font-bold">{previewItem.garment.label.fr}</p>
                  <p className="mt-4 text-xs font-black uppercase tracking-[0.12em] text-black/40">Couleur</p>
                  <div className="mt-2 flex items-center gap-2 font-bold">
                    <span className="h-5 w-5 rounded-full border border-black/10" style={{ backgroundColor: previewItem.color.hex }} />
                    {previewItem.color.label.fr}
                  </div>
                </div>
                <button type="button" onClick={() => toggle(previewItem.id)} disabled={!hydrated} aria-pressed={selected.includes(previewItem.id)} className={`mt-7 flex w-full items-center justify-center gap-3 rounded-full px-6 py-4 text-base font-black transition disabled:opacity-40 ${selected.includes(previewItem.id) ? 'bg-[#ff718a] text-[#201c19]' : 'bg-[#201c19] text-white hover:bg-[#4a7a5e]'}`}>
                  <span className="text-2xl">{selected.includes(previewItem.id) ? '♥' : '♡'}</span>
                  {selected.includes(previewItem.id) ? 'Retirer de mes favoris' : 'Voter pour ce vêtement'}
                </button>
                <p className="mt-3 text-center text-xs font-bold text-black/40">Le cœur enregistre automatiquement votre vote.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
