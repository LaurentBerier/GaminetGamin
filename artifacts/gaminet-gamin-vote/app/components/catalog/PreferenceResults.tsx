'use client';

import { useMemo, useState } from 'react';
import type { VoteSummary } from '../../../lib/vote-results.mjs';
import type { CatalogItem } from './grouping';

type Row = { id: string; label: string; votes: number; image?: string; hex?: string };
const percentage = (votes: number, participants: number) => participants ? Math.round(votes / participants * 100) : 0;
const rank = (rows: Row[]) => rows.filter((row) => row.votes > 0).sort((a, b) => b.votes - a.votes || a.label.localeCompare(b.label, 'fr'));

function PreferenceList({ title, rows, participants }: { title: string; rows: Row[]; participants: number }) {
  return <section className="rounded-3xl border border-stone-200 bg-white p-5 sm:p-6" aria-label={title}>
    <h3 className="text-2xl font-black">{title}</h3>
    <p className="mt-2 text-sm text-stone-500">Personnes ayant choisi cette préférence</p>
    {rows.length ? <ol className="mt-5 space-y-5">{rows.map((row, index) => <li key={row.id}>
      <div className="flex items-center gap-3">
        <span className="w-5 shrink-0 text-sm font-bold text-stone-500">{index + 1}</span>
        {row.hex && <span className="h-6 w-6 shrink-0 rounded-full border border-black/15" style={{ backgroundColor: row.hex }} />}
        <span className="min-w-0 flex-1 text-base font-bold">{row.label}</span>
        <span className="shrink-0 text-right text-base font-black">{row.votes} <span className="text-sm font-medium text-stone-500">· {percentage(row.votes, participants)} %</span></span>
      </div>
      <div className="ml-8 mt-2 h-2 overflow-hidden rounded-full bg-stone-100" aria-hidden="true"><div className="h-full rounded-full bg-[#b9a3df]" style={{ width: percentage(row.votes, participants) + '%' }} /></div>
    </li>)}</ol> : <p className="mt-6 text-base text-stone-500">Aucune préférence enregistrée pour le moment.</p>}
  </section>;
}

export function PreferenceResults({ items, summary, groupLabel = 'Tous' }: { items: readonly CatalogItem[]; summary?: VoteSummary | null; groupLabel?: string }) {
  const [selectedIllustration, setSelectedIllustration] = useState('');
  const [showAll, setShowAll] = useState(false);
  const metadata = useMemo(() => {
    const designs = new Map<string, CatalogItem>();
    const colors = new Map<string, CatalogItem['color']>();
    const garments = new Map<string, CatalogItem['garment']>();
    for (const item of items) {
      if (!item.active) continue;
      if (!designs.has(item.designId)) designs.set(item.designId, item);
      colors.set(item.color.id, item.color);
      garments.set(item.garment.id, item.garment);
    }
    return { designs, colors, garments };
  }, [items]);
  const illustrations = rank([...metadata.designs].map(([id, item]) => ({ id, label: item.title, votes: summary?.illustrationCounts?.[id] ?? 0, image: item.artworkImage || item.image })));
  const activeId = summary?.illustrations?.[selectedIllustration] ? selectedIllustration : '';
  const scope = activeId ? summary?.illustrations[activeId] : summary;
  const participants = scope?.participants ?? 0;
  const colourRows = (counts: Record<string, number> = {}) => rank([...metadata.colors].map(([id, color]) => ({ id, label: color.label.fr, hex: color.hex, votes: counts[id] ?? 0 })));
  const garmentRows = (counts: Record<string, number> = {}) => rank([...metadata.garments].map(([id, garment]) => ({ id, label: garment.label.fr, votes: counts[id] ?? 0 })));

  function exportRankings() {
    if (!summary) return;
    const rows: Array<Array<string | number>> = [['Groupe', 'Portée', 'Illustration ID', 'Dimension', 'Rang', 'ID', 'Libellé', 'Personnes', 'Participants de la portée', 'Appui (%)']];
    const append = (scopeLabel: string, illustration: string, dimension: string, entries: Row[], denominator: number) => {
      entries.forEach((entry, index) => rows.push([groupLabel, scopeLabel, illustration, dimension, index + 1, entry.id, entry.label, entry.votes, denominator, percentage(entry.votes, denominator)]));
    };
    append('Toutes les illustrations', '', 'Illustration', illustrations, summary.participants);
    append('Toutes les illustrations', '', 'Couleur', colourRows(summary.colorCounts), summary.participants);
    append('Toutes les illustrations', '', 'Vêtement', garmentRows(summary.garmentCounts), summary.participants);
    for (const illustration of illustrations) {
      const detail = summary.illustrations[illustration.id];
      append(illustration.label, illustration.id, 'Couleur', colourRows(detail.colorCounts), detail.participants);
      append(illustration.label, illustration.id, 'Vêtement', garmentRows(detail.garmentCounts), detail.participants);
    }
    const csv = '\uFEFF' + rows.map((row) => row.map((cell) => '"' + String(cell).replace(/"/g, '""') + '"').join(';')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url; link.download = 'classements-illustrations-couleurs-vetements.csv';
    document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
  }

  return <section className="mt-8 space-y-6" aria-label="Préférences par illustration, couleur et vêtement">
    <div className="rounded-3xl bg-[#e9e1fa] p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-2xl font-black sm:text-3xl">Les illustrations les plus appréciées</h2>
        <button type="button" onClick={exportRankings} disabled={!summary} className="rounded-full bg-[#201c19] px-5 py-3 text-sm font-bold text-white disabled:opacity-40">Exporter les trois classements</button>
      </div>
      <p className="mt-3 max-w-4xl text-base leading-relaxed text-[#594276]">Chaque personne compte une seule fois par illustration, par couleur et par type de vêtement, même si elle aime plusieurs versions. Les votes déjà reçus sont inclus.</p>
      <p className="mt-2 text-sm text-[#594276]">Une personne peut aimer plusieurs dessins, couleurs ou vêtements : les pourcentages ne s’additionnent pas à 100 %.</p>
    </div>
    {illustrations.length ? <div className="overflow-hidden rounded-3xl border border-stone-200 bg-white">
      <ol>{(showAll ? illustrations : illustrations.slice(0, 8)).map((row, index) => <li key={row.id} className="border-b border-stone-100 last:border-0">
        <button type="button" onClick={() => setSelectedIllustration(activeId === row.id ? '' : row.id)} aria-pressed={activeId === row.id} aria-label={'Voir couleurs et vêtements pour ' + row.label} className={'flex w-full items-center gap-3 p-4 text-left transition sm:gap-5 sm:px-6 ' + (activeId === row.id ? 'bg-[#e9e1fa]' : 'hover:bg-stone-50')}>
          <span className="w-6 shrink-0 text-lg font-black text-stone-400">{index + 1}</span>
          <img src={row.image} alt="" loading="lazy" className="h-14 w-14 shrink-0 rounded-xl bg-[#faf9f6] object-contain sm:h-20 sm:w-20" />
          <span className="min-w-0 flex-1"><span className="block text-base font-black sm:text-lg">{row.label}</span><span className="mt-1 block text-sm text-stone-500">Voir ses couleurs et vêtements</span></span>
          <span className="shrink-0 text-right"><span className="block text-2xl font-black">{row.votes}</span><span className="text-sm text-stone-500">{percentage(row.votes, summary?.participants ?? 0)} %</span></span>
        </button>
      </li>)}</ol>
      {illustrations.length > 8 && <button type="button" onClick={() => setShowAll(!showAll)} className="w-full border-t border-stone-200 p-4 text-sm font-bold">{showAll ? 'Réduire le classement' : 'Voir les ' + illustrations.length + ' illustrations'}</button>}
    </div> : <p className="rounded-3xl bg-white p-6 text-base text-stone-500">{summary ? 'Les premières illustrations apparaîtront ici dès les premiers votes.' : 'Chargement des classements…'}</p>}
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div><h2 className="text-2xl font-black">Couleurs, puis types de vêtements</h2><p className="mt-2 text-base text-stone-600">{activeId ? 'Préférences pour ' + metadata.designs.get(activeId)?.title : 'Préférences pour toutes les illustrations'} · {participants} {participants === 1 ? 'personne' : 'personnes'}</p></div>
      <label className="text-sm font-bold">Illustration<select value={activeId} onChange={(event) => setSelectedIllustration(event.target.value)} className="mt-2 block w-full max-w-xs rounded-xl border border-stone-200 bg-white px-4 py-3 text-base"><option value="">Toutes les illustrations</option>{illustrations.map((row) => <option key={row.id} value={row.id}>{row.label}</option>)}</select></label>
    </div>
    <div className="grid gap-5 lg:grid-cols-2" aria-live="polite">
      <PreferenceList title="Couleurs préférées" rows={colourRows(scope?.colorCounts)} participants={participants} />
      <PreferenceList title="Types de vêtements préférés" rows={garmentRows(scope?.garmentCounts)} participants={participants} />
    </div>
  </section>;
}
