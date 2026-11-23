'use client';

/* eslint-disable @next/next/no-img-element */
import { useCallback, useEffect, useMemo, useState } from 'react';
import catalog from '../../content/catalog.json';
import { CollectionStorefront } from './catalog/CollectionStorefront';

import { PreferenceResults } from './catalog/PreferenceResults';
import type { VoteResults as ResultData } from '../../lib/vote-results.mjs';

const activeItems = catalog.items.filter((item) => item.active);
const itemById = new Map(activeItems.map((item) => [item.id, item]));
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
    const previousTitle = document.title;
    document.title = 'Résultats des votes | Gaminet Gamin';
    const refreshTimer = window.setTimeout(() => void refresh(), 0);
    return () => { window.clearTimeout(refreshTimer); document.title = previousTitle; };
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
              <p className="text-4xl font-black">{Object.keys((group === 'all' ? data : data?.groups[group])?.illustrationCounts ?? {}).length}</p>
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-black/45">Illustrations appréciées</p>
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

        <PreferenceResults items={catalog.items} summary={group === 'all' ? data : data?.groups[group]} groupLabel={group === 'all' ? 'Tous' : humanGroup(group)} />
        <h2 className="mt-12 text-2xl font-black">Combinaisons illustration · couleur · vêtement</h2>
        <p className="mt-2 text-base text-stone-600">Retrouvez aussi les modèles précis choisis, avec leur illustration, couleur et vêtement.</p>

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
                      {themeById.get(item.themeId || '')?.label.fr}
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
  const [resultsKey, setResultsKey] = useState('');
  useEffect(() => { setResultsKey(getUrlValue('results')); }, []);
  if (resultsKey) return <ResultsDashboard resultsKey={resultsKey} />;
  return <CollectionStorefront catalog={catalog} standalone />;
}
