'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, TouchEvent } from 'react';
import { ZoomIn, ZoomOut } from 'lucide-react';
import catalog from '../../../gaminet-gamin-vote/content/catalog.json';

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

type Point = { x: number; y: number };

type PreviewTouchGesture =
  | { mode: 'swipe'; start: Point }
  | { mode: 'pan'; start: Point; startPan: Point }
  | { mode: 'pinch'; startDistance: number; startZoom: number; startCenter: Point; startPan: Point };

const maxPreviewZoom = 3;
const desktopPreviewZoom = 2.25;

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function touchPoint(touch: { clientX: number; clientY: number }): Point {
  return { x: touch.clientX, y: touch.clientY };
}

function touchDistance(first: { clientX: number; clientY: number }, second: { clientX: number; clientY: number }) {
  return Math.hypot(second.clientX - first.clientX, second.clientY - first.clientY);
}

function touchCenter(first: { clientX: number; clientY: number }, second: { clientX: number; clientY: number }): Point {
  return { x: (first.clientX + second.clientX) / 2, y: (first.clientY + second.clientY) / 2 };
}

const activeItems = catalog.items.filter((item) => item.active);
const itemById = new Map(activeItems.map((item) => [item.id, item]));
const activeSections = catalog.sections.filter((section) =>
  activeItems.some((item) => item.sectionId === section.id),
);
const sectionById = new Map(
  activeSections.map((section) => [section.id, section]),
);

function shuffled<T>(items: readonly T[]) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

function getUrlValue(name: string) {
  if (typeof window === 'undefined') return '';
  return new URLSearchParams(window.location.search).get(name) ?? '';
}

function publicVotingUrl(group?: string) {
  if (typeof window === 'undefined') return '';
  const url = new URL(window.location.pathname, window.location.origin);
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

function ResultsDashboard() {
  const [data, setData] = useState<ResultData | null>(null);
  const [error, setError] = useState('');
  const [group, setGroup] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [shareGroup, setShareGroup] = useState('famille');
  const [groupLinkCopied, setGroupLinkCopied] = useState(false);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch(
        `/api/votes?mode=results&campaignId=${encodeURIComponent(catalog.campaign.id)}`,
        { cache: 'no-store', credentials: 'same-origin' },
      );
      const body = (await response.json()) as ResultData & { error?: string };
      if (!response.ok) throw new Error(body.error || 'Impossible de charger les résultats.');
      setData(body);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Une erreur est survenue.');
    } finally {
      setIsLoading(false);
    }
  }, []);

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
    .filter((entry) => entry.votes > 0)
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
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [previewItemId, setPreviewItemId] = useState('');
  const [voterId, setVoterId] = useState('');
  const [voterGroup, setVoterGroup] = useState(() => getUrlValue('group').slice(0, 60));
  const [hydrated, setHydrated] = useState(false);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [shareState, setShareState] = useState('Partager');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [previewZoom, setPreviewZoom] = useState(1);
  const [previewPan, setPreviewPan] = useState<Point>({ x: 0, y: 0 });
  const [randomizedItems] = useState(() => shuffled(activeItems));
  const selectedRef = useRef<string[]>([]);
  const saveQueue = useRef<Promise<void>>(Promise.resolve());
  const saveRevision = useRef(0);
  const previewFrameRef = useRef<HTMLDivElement>(null);
  const previewZoomRef = useRef(1);
  const previewPanRef = useRef<Point>({ x: 0, y: 0 });
  const previewTouchGesture = useRef<PreviewTouchGesture | null>(null);
  const previewPointerStart = useRef<{ pointerId: number; start: Point; startPan: Point } | null>(null);

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
    if (resultsKey) window.location.replace('/admin');
  }, [resultsKey]);

  const filteredItems = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('fr');
    return randomizedItems.filter((item) => {
      if (filter !== 'all' && item.sectionId !== filter) return false;
      if (!normalized) return true;
      return `${item.title} ${item.garment.label.fr} ${item.color.label.fr}`
        .toLocaleLowerCase('fr')
      .includes(normalized);
    });
  }, [filter, query, randomizedItems]);

  const constrainPreviewPan = useCallback((zoom: number, pan: Point): Point => {
    const frame = previewFrameRef.current;
    if (!frame || zoom <= 1) return { x: 0, y: 0 };
    const maximumX = frame.clientWidth * (zoom - 1) / 2;
    const maximumY = frame.clientHeight * (zoom - 1) / 2;
    return {
      x: clamp(pan.x, -maximumX, maximumX),
      y: clamp(pan.y, -maximumY, maximumY),
    };
  }, []);

  const updatePreviewTransform = useCallback((zoom: number, pan: Point) => {
    const nextZoom = clamp(zoom, 1, maxPreviewZoom);
    const nextPan = constrainPreviewPan(nextZoom, pan);
    previewZoomRef.current = nextZoom;
    previewPanRef.current = nextPan;
    setPreviewZoom(nextZoom);
    setPreviewPan(nextPan);
  }, [constrainPreviewPan]);

  const resetPreviewTransform = useCallback(() => {
    updatePreviewTransform(1, { x: 0, y: 0 });
  }, [updatePreviewTransform]);

  const togglePreviewZoom = useCallback(() => {
    if (previewZoomRef.current > 1) {
      resetPreviewTransform();
    } else {
      updatePreviewTransform(desktopPreviewZoom, { x: 0, y: 0 });
    }
  }, [resetPreviewTransform, updatePreviewTransform]);

  const navigatePreview = useCallback((direction: -1 | 1) => {
    resetPreviewTransform();
    setPreviewItemId((currentId) => {
      if (filteredItems.length < 2) return currentId;
      const currentIndex = filteredItems.findIndex((item) => item.id === currentId);
      if (currentIndex < 0) return filteredItems[0].id;
      const nextIndex = (currentIndex + direction + filteredItems.length) % filteredItems.length;
      return filteredItems[nextIndex].id;
    });
  }, [filteredItems, resetPreviewTransform]);

  useEffect(() => {
    previewTouchGesture.current = null;
    previewPointerStart.current = null;
    resetPreviewTransform();
  }, [previewItemId, resetPreviewTransform]);

  useEffect(() => {
    if (!previewItemId) return;
    const navigateWithKeyboard = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPreviewItemId('');
      if (event.key === 'ArrowLeft') navigatePreview(-1);
      if (event.key === 'ArrowRight') navigatePreview(1);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', navigateWithKeyboard);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', navigateWithKeyboard);
    };
  }, [navigatePreview, previewItemId]);

  useEffect(() => {
    if (!previewItemId || filteredItems.length < 2) return;
    const currentIndex = filteredItems.findIndex((item) => item.id === previewItemId);
    if (currentIndex < 0) return;
    const adjacentItems = [
      filteredItems[(currentIndex - 1 + filteredItems.length) % filteredItems.length],
      filteredItems[(currentIndex + 1) % filteredItems.length],
    ];
    adjacentItems.forEach((item) => {
      const image = new Image();
      image.src = item.image;
    });
  }, [filteredItems, previewItemId]);

  const startPreviewGesture = (event: TouchEvent<HTMLDivElement>) => {
    if (event.touches.length >= 2) {
      const first = event.touches[0];
      const second = event.touches[1];
      previewTouchGesture.current = {
        mode: 'pinch',
        startDistance: Math.max(touchDistance(first, second), 1),
        startZoom: previewZoomRef.current,
        startCenter: touchCenter(first, second),
        startPan: previewPanRef.current,
      };
      return;
    }
    const touch = event.touches[0];
    if (!touch) return;
    const start = touchPoint(touch);
    previewTouchGesture.current = previewZoomRef.current > 1
      ? { mode: 'pan', start, startPan: previewPanRef.current }
      : { mode: 'swipe', start };
  };

  const movePreviewGesture = (event: TouchEvent<HTMLDivElement>) => {
    const gesture = previewTouchGesture.current;
    if (!gesture) return;
    if (event.touches.length >= 2) {
      const first = event.touches[0];
      const second = event.touches[1];
      if (gesture.mode !== 'pinch') {
        previewTouchGesture.current = {
          mode: 'pinch',
          startDistance: Math.max(touchDistance(first, second), 1),
          startZoom: previewZoomRef.current,
          startCenter: touchCenter(first, second),
          startPan: previewPanRef.current,
        };
        return;
      }
      event.preventDefault();
      const nextZoom = clamp(gesture.startZoom * touchDistance(first, second) / gesture.startDistance, 1, maxPreviewZoom);
      const currentCenter = touchCenter(first, second);
      const frame = previewFrameRef.current;
      if (!frame) return;
      const bounds = frame.getBoundingClientRect();
      const frameCenter = { x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 };
      const startingCenter = { x: gesture.startCenter.x - frameCenter.x, y: gesture.startCenter.y - frameCenter.y };
      const movingCenter = { x: currentCenter.x - frameCenter.x, y: currentCenter.y - frameCenter.y };
      const anchoredPoint = {
        x: (startingCenter.x - gesture.startPan.x) / gesture.startZoom,
        y: (startingCenter.y - gesture.startPan.y) / gesture.startZoom,
      };
      updatePreviewTransform(nextZoom, {
        x: movingCenter.x - anchoredPoint.x * nextZoom,
        y: movingCenter.y - anchoredPoint.y * nextZoom,
      });
      return;
    }
    if (gesture.mode === 'pan' && event.touches[0]) {
      event.preventDefault();
      const current = touchPoint(event.touches[0]);
      updatePreviewTransform(previewZoomRef.current, {
        x: gesture.startPan.x + current.x - gesture.start.x,
        y: gesture.startPan.y + current.y - gesture.start.y,
      });
    }
  };

  const finishPreviewGesture = (event: TouchEvent<HTMLDivElement>) => {
    const gesture = previewTouchGesture.current;
    if (!gesture) return;
    if (event.touches.length === 1 && previewZoomRef.current > 1) {
      const start = touchPoint(event.touches[0]);
      previewTouchGesture.current = { mode: 'pan', start, startPan: previewPanRef.current };
      return;
    }
    previewTouchGesture.current = null;
    if (gesture.mode === 'swipe') {
      const touch = event.changedTouches[0];
      if (!touch) return;
      const horizontalDistance = touch.clientX - gesture.start.x;
      const verticalDistance = touch.clientY - gesture.start.y;
      if (Math.abs(horizontalDistance) >= 50 && Math.abs(horizontalDistance) > Math.abs(verticalDistance)) {
        navigatePreview(horizontalDistance < 0 ? 1 : -1);
      }
      return;
    }
    if (previewZoomRef.current <= 1.02) resetPreviewTransform();
  };

  const startPreviewPointerPan = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'mouse' || previewZoomRef.current <= 1 || (event.target as HTMLElement).closest('button')) return;
    previewPointerStart.current = {
      pointerId: event.pointerId,
      start: { x: event.clientX, y: event.clientY },
      startPan: previewPanRef.current,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  };

  const movePreviewPointerPan = (event: ReactPointerEvent<HTMLDivElement>) => {
    const start = previewPointerStart.current;
    if (!start || start.pointerId !== event.pointerId) return;
    updatePreviewTransform(previewZoomRef.current, {
      x: start.startPan.x + event.clientX - start.start.x,
      y: start.startPan.y + event.clientY - start.start.y,
    });
  };

  const finishPreviewPointerPan = (event: ReactPointerEvent<HTMLDivElement>) => {
    const start = previewPointerStart.current;
    if (!start || start.pointerId !== event.pointerId) return;
    previewPointerStart.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };

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

  if (resultsKey) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#201c19] text-white">
        <p className="font-black">Redirection vers l’administration…</p>
      </main>
    );
  }

  const previewItem = previewItemId ? itemById.get(previewItemId) : undefined;
  const previewItemIndex = previewItem
    ? filteredItems.findIndex((item) => item.id === previewItem.id)
    : -1;
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
            <a href="/fr" className="leading-none transition hover:opacity-75" aria-label="Accueil Gaminet Gamin">
              <span className="block text-lg font-black uppercase tracking-tight">Gaminet Gamin</span>
              <span className="mt-1 block text-sm font-black tracking-[0.28em] text-[#c8914a]">GG</span>
            </a>
            <nav className="hidden items-center gap-6 text-sm font-bold text-black/50 md:flex" aria-label="Navigation principale">
              <button onClick={() => setFilter('all')} className="border-b-2 border-[#c8914a] pb-0.5 text-[#201c19]">Boutique</button>
              <a href="/fr/artistes" className="transition hover:text-[#201c19]">Les p&apos;tits monstres</a>
              <a href="/fr/apropos" className="transition hover:text-[#201c19]">À propos</a>
              <a href="/fr/contact" className="transition hover:text-[#201c19]">Contact</a>
            </nav>
            <div className="flex items-center gap-2">
              <div className="hidden items-center gap-1 text-[11px] font-black text-black/45 sm:flex" aria-label="Langues">
                <span className="rounded-full bg-stone-200 px-2.5 py-1.5 text-[#201c19]">FR</span>
                <a href="/en/shop" className="rounded-full px-2 py-1.5 hover:bg-stone-100">EN</a>
                <a href="/es/tienda" className="rounded-full px-2 py-1.5 hover:bg-stone-100">ES</a>
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
              <a href="/fr/artistes" className="rounded-lg px-3 py-2.5 text-black/60 hover:bg-stone-100">Les p&apos;tits monstres</a>
              <a href="/fr/apropos" className="rounded-lg px-3 py-2.5 text-black/60 hover:bg-stone-100">À propos</a>
              <a href="/fr/contact" className="rounded-lg px-3 py-2.5 text-black/60 hover:bg-stone-100">Contact</a>
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
                  <p className="mt-3 text-[10px] font-black uppercase tracking-[0.14em] text-[#c8914a]">{sectionById.get(item.sectionId)?.label.fr}</p>
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
                <li><a href="/fr/artistes" className="hover:text-white">Les p&apos;tits monstres</a></li>
                <li><a href="/fr/apropos" className="hover:text-white">À propos</a></li>
                <li><a href="/fr/contact" className="hover:text-white">Contact</a></li>
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
        <div className="fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-[#201c19]/75 p-3 backdrop-blur-sm sm:p-6" role="dialog" aria-modal="true" aria-labelledby="preview-title" onMouseDown={(event) => { if (event.target === event.currentTarget) setPreviewItemId(''); }}>
          <div className="relative mx-auto my-3 max-w-5xl overflow-hidden rounded-3xl bg-[#faf9f6] shadow-2xl sm:my-8">
            <button onClick={() => setPreviewItemId('')} aria-label="Fermer l’agrandissement" className="absolute right-4 top-4 z-30 grid h-11 w-11 place-items-center rounded-full bg-white text-2xl font-black shadow-md transition hover:scale-105">×</button>
            <div className="grid md:grid-cols-[1.3fr_0.7fr]">
              <div
                ref={previewFrameRef}
                className={`relative aspect-square select-none overflow-hidden bg-stone-100 ${previewZoom > 1 ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}`}
                style={{ touchAction: previewZoom > 1 ? 'none' : 'pan-y' }}
                onTouchStart={startPreviewGesture}
                onTouchMove={movePreviewGesture}
                onTouchEnd={finishPreviewGesture}
                onTouchCancel={() => { previewTouchGesture.current = null; }}
                onPointerDown={startPreviewPointerPan}
                onPointerMove={movePreviewPointerPan}
                onPointerUp={finishPreviewPointerPan}
                onPointerCancel={finishPreviewPointerPan}
              >
                <img
                  key={previewItem.id}
                  src={previewItem.image}
                  alt={`${previewItem.title} — aperçu agrandi`}
                  draggable={false}
                  className="pointer-events-none h-full w-full object-contain"
                  style={{
                    transform: `translate3d(${previewPan.x}px, ${previewPan.y}px, 0) scale(${previewZoom})`,
                    transformOrigin: 'center',
                    willChange: 'transform',
                  }}
                />
                <button
                  type="button"
                  onClick={() => toggle(previewItem.id)}
                  disabled={!hydrated}
                  aria-pressed={selected.includes(previewItem.id)}
                  aria-label={`${selected.includes(previewItem.id) ? 'Retirer le vote pour' : 'Voter pour'} ${previewItem.title}`}
                  className={`absolute left-4 top-4 z-20 grid h-12 w-12 place-items-center rounded-full border text-3xl shadow-lg transition hover:scale-110 disabled:cursor-not-allowed disabled:opacity-40 ${selected.includes(previewItem.id) ? 'border-[#201c19] bg-[#ff718a] text-[#201c19]' : 'border-white bg-white text-black/40 hover:text-[#ff718a]'}`}
                >
                  {selected.includes(previewItem.id) ? '♥' : '♡'}
                </button>
                <button
                  type="button"
                  onClick={togglePreviewZoom}
                  aria-label={previewZoom > 1 ? 'Revenir à la taille normale' : 'Agrandir l’illustration'}
                  aria-pressed={previewZoom > 1}
                  title={previewZoom > 1 ? 'Réduire l’illustration' : 'Agrandir l’illustration'}
                  className={`absolute left-[4.75rem] top-4 z-20 hidden h-12 w-12 place-items-center rounded-full border shadow-lg transition hover:scale-105 md:grid ${previewZoom > 1 ? 'border-[#201c19] bg-[#dce77d] text-[#201c19]' : 'border-white bg-white text-black/55'}`}
                >
                  {previewZoom > 1 ? <ZoomOut size={21} strokeWidth={2.5} /> : <ZoomIn size={21} strokeWidth={2.5} />}
                </button>
                {filteredItems.length > 1 && (
                  <>
                    <button type="button" onClick={() => navigatePreview(-1)} aria-label="Voir le vêtement précédent" className="absolute left-3 top-1/2 z-20 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-3xl font-black shadow-md backdrop-blur transition hover:scale-105">‹</button>
                    <button type="button" onClick={() => navigatePreview(1)} aria-label="Voir le vêtement suivant" className="absolute right-3 top-1/2 z-20 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-3xl font-black shadow-md backdrop-blur transition hover:scale-105">›</button>
                    <div className="absolute bottom-3 left-1/2 z-20 -translate-x-1/2 rounded-full bg-[#201c19]/80 px-3 py-1.5 text-[11px] font-black text-white backdrop-blur">
                      {previewItemIndex + 1} / {filteredItems.length}
                    </div>
                  </>
                )}
                <div aria-live="polite" className="absolute bottom-3 right-3 z-20 rounded-full bg-white/90 px-3 py-1.5 text-[10px] font-black text-black/60 shadow-sm backdrop-blur md:hidden">
                  {previewZoom > 1 ? `${previewZoom.toFixed(1)}×` : 'Pincez pour zoomer'}
                </div>
              </div>
              <div className="flex flex-col justify-center p-6 sm:p-10">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#c8914a]">{sectionById.get(previewItem.sectionId)?.label.fr}</p>
                <h2 id="preview-title" aria-live="polite" className="mt-3 text-3xl font-black uppercase tracking-tight sm:text-4xl">{previewItem.title}</h2>
                <p className="mt-3 text-2xl font-black">{previewItem.garment.price.toFixed(2)} $</p>
                <button type="button" onClick={() => toggle(previewItem.id)} disabled={!hydrated} aria-pressed={selected.includes(previewItem.id)} className={`mt-5 flex w-full items-center justify-center gap-3 rounded-full px-6 py-4 text-base font-black transition disabled:opacity-40 ${selected.includes(previewItem.id) ? 'bg-[#ff718a] text-[#201c19]' : 'bg-[#201c19] text-white hover:bg-[#4a7a5e]'}`}>
                  <span className="text-2xl">{selected.includes(previewItem.id) ? '♥' : '♡'}</span>
                  {selected.includes(previewItem.id) ? 'Retirer de mes favoris' : 'Voter pour ce vêtement'}
                </button>
                <p className="mt-2 text-center text-xs font-bold text-black/40">Le cœur enregistre automatiquement votre vote.</p>
                <div className="mt-6 border-y border-stone-200 py-5">
                  <p className="text-xs font-black uppercase tracking-[0.12em] text-black/40">Vêtement</p>
                  <p className="mt-1 font-bold">{previewItem.garment.label.fr}</p>
                  <p className="mt-4 text-xs font-black uppercase tracking-[0.12em] text-black/40">Couleur</p>
                  <div className="mt-2 flex items-center gap-2 font-bold">
                    <span className="h-5 w-5 rounded-full border border-black/10" style={{ backgroundColor: previewItem.color.hex }} />
                    {previewItem.color.label.fr}
                  </div>
                </div>
                <p className="mt-5 text-center text-xs font-bold leading-relaxed text-black/40">
                  Pincez l’image sur mobile ou utilisez la loupe sur ordinateur pour voir l’illustration de plus près.
                  {filteredItems.length > 1 && ' Glissez à taille normale ou utilisez les flèches pour changer de vêtement.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
