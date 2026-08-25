import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  Check,
  Clock3,
  Copy,
  Download,
  Eye,
  EyeOff,
  Heart,
  LockKeyhole,
  LogOut,
  RefreshCw,
  Search,
  Trophy,
  Users,
} from 'lucide-react';
import catalog from '../../../gaminet-gamin-vote/content/catalog.json';

type ResultData = {
  campaignId: string;
  participants: number;
  totalVotes: number;
  itemCounts: Record<string, number>;
  groups: Record<
    string,
    { participants: number; itemCounts: Record<string, number> }
  >;
  lastVoteAt: number;
};

type AccessState = 'checking' | 'signed-out' | 'signed-in';

const activeItems = catalog.items.filter((item) => item.active);
const sectionById = new Map(
  catalog.sections.map((section) => [section.id, section]),
);

function humanGroup(value: string) {
  if (!value || value === 'Sans groupe') return value || 'Sans groupe';
  return value
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toLocaleUpperCase('fr'));
}

function formatDate(value: number) {
  if (!value) return 'Aucun vote enregistré';
  return new Intl.DateTimeFormat('fr-CA', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function votingUrl(group?: string) {
  const url = new URL('/fr/boutique', window.location.origin);
  if (group) url.searchParams.set('group', group);
  return url.toString();
}

async function copyText(value: string) {
  await navigator.clipboard.writeText(value);
}

async function readJson<T>(response: Response): Promise<T & { error?: string }> {
  try {
    return await response.json() as T & { error?: string };
  } catch {
    return { error: 'Le service des votes est momentanément indisponible.' } as T & { error?: string };
  }
}

function csvCell(value: string | number) {
  const text = String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function downloadCsv(filename: string, rows: Array<Array<string | number>>) {
  const csv = `\uFEFF${rows.map((row) => row.map(csvCell).join(';')).join('\n')}`;
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function LoginScreen({
  error,
  isSubmitting,
  onLogin,
}: {
  error: string;
  isSubmitting: boolean;
  onLogin: (password: string) => Promise<void>;
}) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void onLogin(password);
  };

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-[#201c19] px-5 py-12 text-[#201c19]">
      <div className="absolute -left-24 -top-24 h-80 w-80 rounded-full bg-[#ff718a]/25 blur-3xl" />
      <div className="absolute -bottom-32 -right-24 h-96 w-96 rounded-full bg-[#dce77d]/20 blur-3xl" />
      <section className="relative w-full max-w-md rounded-[2rem] bg-[#f7f3eb] p-6 shadow-2xl sm:p-9" aria-labelledby="admin-login-title">
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-[#dce77d]">
          <LockKeyhole size={25} strokeWidth={2.5} aria-hidden="true" />
        </div>
        <p className="mt-7 text-xs font-black uppercase tracking-[0.2em] text-[#b77832]">Gaminet Gamin · Administration</p>
        <h1 id="admin-login-title" className="mt-3 text-4xl font-black tracking-[-0.05em]">Les votes, au même endroit.</h1>
        <p className="mt-4 text-sm font-semibold leading-relaxed text-black/55">
          Connectez-vous pour consulter les résultats en direct et exporter le classement complet.
        </p>

        <form onSubmit={submit} className="mt-8">
          <label htmlFor="admin-password" className="text-xs font-black uppercase tracking-[0.14em] text-black/50">
            Mot de passe administrateur
          </label>
          <div className="relative mt-2">
            <input
              id="admin-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              autoFocus
              required
              className="w-full rounded-2xl border border-black/10 bg-white py-4 pl-4 pr-14 font-bold outline-none transition focus:border-[#b77832] focus:ring-4 focus:ring-[#b77832]/10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              className="absolute inset-y-0 right-0 grid w-14 place-items-center text-black/45 hover:text-black"
              aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
          {error && (
            <p role="alert" className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-800">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={!password || isSubmitting}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-[#201c19] px-5 py-4 font-black text-white transition hover:bg-[#4a7a5e] disabled:cursor-not-allowed disabled:opacity-45"
          >
            {isSubmitting && <RefreshCw size={17} className="animate-spin" aria-hidden="true" />}
            {isSubmitting ? 'Connexion…' : 'Ouvrir le tableau de bord'}
          </button>
        </form>

        <a href="/fr" className="mt-6 block text-center text-xs font-bold text-black/40 hover:text-black/70">
          Retour au site public
        </a>
      </section>
    </main>
  );
}

export default function AdminDashboardPage() {
  const [access, setAccess] = useState<AccessState>('checking');
  const [data, setData] = useState<ResultData | null>(null);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState('all');
  const [selectedSection, setSelectedSection] = useState('all');
  const [query, setQuery] = useState('');
  const [showZeroVotes, setShowZeroVotes] = useState(false);
  const [shareGroup, setShareGroup] = useState('famille');
  const [copiedLink, setCopiedLink] = useState<'main' | 'group' | ''>('');

  const loadResults = useCallback(async (showRefreshState = false) => {
    if (showRefreshState) setIsRefreshing(true);
    setError('');
    try {
      const response = await fetch(
        `/api/votes?mode=results&campaignId=${encodeURIComponent(catalog.campaign.id)}`,
        { cache: 'no-store', credentials: 'same-origin' },
      );
      const body = await readJson<ResultData>(response);
      if (response.status === 401) {
        setData(null);
        setAccess('signed-out');
        return;
      }
      if (!response.ok) throw new Error(body.error || 'Impossible de charger les résultats.');
      setData(body);
      setAccess('signed-in');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Une erreur est survenue.');
      setAccess((current) => current === 'checking' ? 'signed-out' : current);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const previousTitle = document.title;
    const previousRobots = document.querySelector('meta[name="robots"]')?.getAttribute('content');
    let robots = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    if (!robots) {
      robots = document.createElement('meta');
      robots.name = 'robots';
      document.head.appendChild(robots);
    }
    document.title = 'Administration des votes · Gaminet Gamin';
    robots.content = 'noindex, nofollow';
    void loadResults();
    return () => {
      document.title = previousTitle;
      if (previousRobots === null || previousRobots === undefined) robots?.remove();
      else if (robots) robots.content = previousRobots;
    };
  }, [loadResults]);

  useEffect(() => {
    if (access !== 'signed-in') return;
    const interval = window.setInterval(() => void loadResults(), 60_000);
    return () => window.clearInterval(interval);
  }, [access, loadResults]);

  const login = async (password: string) => {
    setIsSubmitting(true);
    setError('');
    try {
      const response = await fetch('/api/votes', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'admin-login', password }),
      });
      const body = await readJson<Record<string, never>>(response);
      if (!response.ok) throw new Error(body.error || 'Connexion impossible.');
      await loadResults();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Connexion impossible.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/votes', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'admin-logout' }),
      });
    } finally {
      setData(null);
      setAccess('signed-out');
      setError('');
    }
  };

  const groupSummary = selectedGroup === 'all' ? null : data?.groups[selectedGroup];
  const currentParticipants = groupSummary?.participants ?? (selectedGroup === 'all' ? data?.participants ?? 0 : 0);
  const currentCounts = groupSummary?.itemCounts ?? (selectedGroup === 'all' ? data?.itemCounts ?? {} : {});
  const currentTotalVotes = Object.values(currentCounts).reduce((sum, count) => sum + count, 0);

  const allRanked = useMemo(
    () => activeItems
      .map((item) => ({ item, votes: currentCounts[item.id] ?? 0 }))
      .sort((left, right) => right.votes - left.votes || left.item.title.localeCompare(right.item.title, 'fr')),
    [currentCounts],
  );

  const ranked = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('fr');
    return allRanked
      .filter(({ item }) => {
        if (!showZeroVotes && (currentCounts[item.id] ?? 0) === 0) return false;
        if (selectedSection !== 'all' && item.sectionId !== selectedSection) return false;
        if (!normalizedQuery) return true;
        return `${item.title} ${item.garment.label.fr} ${item.color.label.fr}`
          .toLocaleLowerCase('fr')
          .includes(normalizedQuery);
      });
  }, [allRanked, currentCounts, query, selectedSection, showZeroVotes]);

  const groups = useMemo(
    () => Object.entries(data?.groups ?? {}).sort((left, right) => right[1].participants - left[1].participants || left[0].localeCompare(right[0], 'fr')),
    [data?.groups],
  );

  const exportResults = () => {
    const groupLabel = selectedGroup === 'all' ? 'Tous les votes' : humanGroup(selectedGroup);
    const rows: Array<Array<string | number>> = [
      ['Rang', 'Dessin', 'Vêtement', 'Couleur', 'Catégorie', 'Votes', 'Appui (%)', 'Groupe'],
      ...ranked.map(({ item, votes }, index) => [
        index + 1,
        item.title,
        item.garment.label.fr,
        item.color.label.fr,
        sectionById.get(item.sectionId)?.label.fr ?? item.sectionId,
        votes,
        currentParticipants ? Math.round((votes / currentParticipants) * 100) : 0,
        groupLabel,
      ]),
    ];
    const safeGroup = selectedGroup === 'all' ? 'tous' : selectedGroup.toLocaleLowerCase('fr').replace(/[^a-z0-9]+/g, '-');
    downloadCsv(`votes-${catalog.campaign.id}-${safeGroup}.csv`, rows);
  };

  const copyVotingLink = async (kind: 'main' | 'group') => {
    const cleanGroup = shareGroup.replace(/[<>]/g, '').trim().slice(0, 60);
    await copyText(votingUrl(kind === 'group' ? cleanGroup || undefined : undefined));
    setCopiedLink(kind);
    window.setTimeout(() => setCopiedLink(''), 1800);
  };

  if (access === 'checking') {
    return (
      <main className="grid min-h-screen place-items-center bg-[#201c19] text-white">
        <div className="text-center">
          <RefreshCw className="mx-auto animate-spin text-[#dce77d]" size={30} aria-hidden="true" />
          <p className="mt-4 text-sm font-black">Ouverture du tableau de bord…</p>
        </div>
      </main>
    );
  }

  if (access === 'signed-out') {
    return <LoginScreen error={error} isSubmitting={isSubmitting} onLogin={login} />;
  }

  const citedChoices = Object.values(currentCounts).filter((count) => count > 0).length;
  const averageVotes = currentParticipants ? (currentTotalVotes / currentParticipants).toFixed(1).replace('.', ',') : '0';
  const bestScore = ranked[0]?.votes ?? 0;

  return (
    <main className="min-h-screen bg-[#f7f3eb] text-[#201c19]">
      <header className="border-b border-white/10 bg-[#201c19] text-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-5 sm:px-8">
          <a href="/fr" className="leading-none transition hover:opacity-75" aria-label="Accueil Gaminet Gamin">
            <span className="block text-lg font-black uppercase tracking-tight">Gaminet Gamin</span>
            <span className="mt-1 block text-[10px] font-black uppercase tracking-[0.28em] text-[#dce77d]">Administration</span>
          </a>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => void copyVotingLink('main')} className="flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-black text-[#201c19]">
              {copiedLink === 'main' ? <Check size={16} /> : <Copy size={16} />}
              {copiedLink === 'main' ? 'Lien copié' : 'Lien de vote'}
            </button>
            <button onClick={() => void loadResults(true)} disabled={isRefreshing} className="grid h-10 w-10 place-items-center rounded-full border border-white/20 text-white transition hover:bg-white/10 disabled:opacity-50" aria-label="Actualiser les résultats">
              <RefreshCw size={17} className={isRefreshing ? 'animate-spin' : ''} />
            </button>
            <button onClick={() => void logout()} className="grid h-10 w-10 place-items-center rounded-full border border-white/20 text-white transition hover:bg-white/10" aria-label="Se déconnecter">
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-14">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#b77832]">Résultats en direct · Collection 2026</p>
            <h1 className="mt-3 text-4xl font-black tracking-[-0.05em] sm:text-6xl">Les favoris prennent forme.</h1>
            <div className="mt-4 flex items-center gap-2 text-xs font-bold text-black/45">
              <Clock3 size={15} aria-hidden="true" />
              Dernier vote : {formatDate(data?.lastVoteAt ?? 0)}
              <span className="hidden sm:inline">· Actualisation automatique chaque minute</span>
            </div>
          </div>
          <button onClick={exportResults} className="flex w-fit items-center gap-2 rounded-full bg-[#201c19] px-5 py-3 text-sm font-black text-white transition hover:bg-[#4a7a5e]">
            <Download size={17} /> Exporter en CSV
          </button>
        </div>

        {error && (
          <div role="alert" className="mt-7 rounded-2xl border border-red-200 bg-red-50 p-4 font-bold text-red-800">
            {error}
          </div>
        )}

        <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-[1.6rem] bg-[#dce77d] p-5">
            <Users size={20} className="text-black/45" aria-hidden="true" />
            <p className="mt-5 text-4xl font-black">{currentParticipants}</p>
            <p className="mt-1 text-xs font-black uppercase tracking-[0.12em] text-black/50">Participants</p>
          </div>
          <div className="rounded-[1.6rem] bg-white p-5 shadow-sm">
            <Heart size={20} className="text-[#ff718a]" aria-hidden="true" />
            <p className="mt-5 text-4xl font-black">{currentTotalVotes}</p>
            <p className="mt-1 text-xs font-black uppercase tracking-[0.12em] text-black/45">Votes compilés</p>
          </div>
          <div className="rounded-[1.6rem] bg-white p-5 shadow-sm">
            <BarChart3 size={20} className="text-[#b77832]" aria-hidden="true" />
            <p className="mt-5 text-4xl font-black">{averageVotes}</p>
            <p className="mt-1 text-xs font-black uppercase tracking-[0.12em] text-black/45">Choix par personne</p>
          </div>
          <div className="rounded-[1.6rem] bg-white p-5 shadow-sm">
            <Trophy size={20} className="text-[#4a7a5e]" aria-hidden="true" />
            <p className="mt-5 text-4xl font-black">{citedChoices}</p>
            <p className="mt-1 text-xs font-black uppercase tracking-[0.12em] text-black/45">Modèles choisis</p>
          </div>
        </div>

        <section className="mt-8 rounded-[2rem] border border-black/8 bg-white p-5 shadow-sm sm:p-6" aria-labelledby="group-links-title">
          <div className="grid gap-5 lg:grid-cols-[0.65fr_1fr_auto] lg:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-[#b77832]">Diffusion</p>
              <h2 id="group-links-title" className="mt-2 text-2xl font-black tracking-tight">Créer un lien de groupe</h2>
              <p className="mt-2 text-sm font-semibold text-black/45">Les résultats de ce lien pourront ensuite être filtrés séparément.</p>
            </div>
            <label className="block">
              <span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-black/45">Nom du groupe</span>
              <input value={shareGroup} onChange={(event) => setShareGroup(event.target.value.slice(0, 60))} placeholder="Famille, amis, équipe…" className="w-full rounded-2xl border border-black/10 bg-[#f7f3eb] px-4 py-3 font-bold outline-none focus:border-[#b77832]" />
            </label>
            <button onClick={() => void copyVotingLink('group')} className="flex items-center justify-center gap-2 rounded-full bg-[#201c19] px-5 py-3.5 text-sm font-black text-white">
              {copiedLink === 'group' ? <Check size={16} /> : <Copy size={16} />}
              {copiedLink === 'group' ? 'Lien copié' : 'Copier le lien'}
            </button>
          </div>
        </section>

        <div className="mt-8 flex gap-2 overflow-x-auto pb-2" aria-label="Filtrer par groupe">
          <button onClick={() => setSelectedGroup('all')} className={`shrink-0 rounded-full px-4 py-2.5 text-sm font-black ${selectedGroup === 'all' ? 'bg-[#201c19] text-white' : 'border border-black/10 bg-white'}`}>
            Tous · {data?.participants ?? 0}
          </button>
          {groups.map(([groupName, summary]) => (
            <button key={groupName} onClick={() => setSelectedGroup(groupName)} className={`shrink-0 rounded-full px-4 py-2.5 text-sm font-black ${selectedGroup === groupName ? 'bg-[#201c19] text-white' : 'border border-black/10 bg-white'}`}>
              {humanGroup(groupName)} · {summary.participants}
            </button>
          ))}
        </div>

        {allRanked.some((entry) => entry.votes > 0) && (
          <section className="mt-4 grid gap-3 md:grid-cols-3" aria-label="Palmarès">
            {allRanked.filter((entry) => entry.votes > 0).slice(0, 3).map(({ item, votes }, index) => (
              <article key={item.id} className={`overflow-hidden rounded-[1.6rem] ${index === 0 ? 'bg-[#201c19] text-white' : 'border border-black/8 bg-white'}`}>
                <div className="grid grid-cols-[104px_1fr] items-center">
                  <img src={item.image} alt="" className="h-full min-h-32 w-full object-cover" />
                  <div className="min-w-0 p-4">
                    <p className={`text-[10px] font-black uppercase tracking-[0.14em] ${index === 0 ? 'text-[#dce77d]' : 'text-[#b77832]'}`}>#{index + 1} du classement</p>
                    <h2 className="mt-2 truncate font-black">{item.title}</h2>
                    <p className={`mt-1 truncate text-xs font-semibold ${index === 0 ? 'text-white/50' : 'text-black/45'}`}>{item.garment.label.fr}</p>
                    <p className="mt-3 text-2xl font-black">{votes} <span className="text-xs">votes</span></p>
                  </div>
                </div>
              </article>
            ))}
          </section>
        )}

        <section className="mt-6 overflow-hidden rounded-[2rem] border border-black/8 bg-white shadow-[0_12px_40px_rgba(53,45,36,0.08)]" aria-labelledby="ranking-title">
          <div className="flex flex-col gap-4 border-b border-black/8 p-5 sm:flex-row sm:items-end sm:justify-between sm:p-6">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-[#b77832]">Compilation complète</p>
              <h2 id="ranking-title" className="mt-2 text-2xl font-black">Classement des modèles</h2>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
              <select value={selectedSection} onChange={(event) => setSelectedSection(event.target.value)} className="rounded-full border border-black/10 bg-[#f7f3eb] px-4 py-3 text-sm font-bold outline-none focus:border-[#b77832]" aria-label="Filtrer par catégorie">
                <option value="all">Toutes les catégories</option>
                {catalog.sections.map((section) => <option key={section.id} value={section.id}>{section.label.fr}</option>)}
              </select>
              <label className="relative block">
                <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-black/35" aria-hidden="true" />
                <span className="sr-only">Rechercher un modèle</span>
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher…" className="w-full rounded-full border border-black/10 bg-[#f7f3eb] py-3 pl-10 pr-4 text-sm font-bold outline-none placeholder:text-black/35 focus:border-[#b77832] sm:w-52" />
              </label>
              <label className="flex cursor-pointer items-center gap-2 rounded-full border border-black/10 bg-[#f7f3eb] px-4 py-3 text-xs font-black text-black/55">
                <input type="checkbox" checked={showZeroVotes} onChange={(event) => setShowZeroVotes(event.target.checked)} className="h-4 w-4 accent-[#201c19]" />
                Inclure les modèles sans vote
              </label>
            </div>
          </div>

          <div className="grid grid-cols-[42px_1fr_72px] border-b border-black/8 px-4 py-3 text-[10px] font-black uppercase tracking-[0.14em] text-black/40 sm:grid-cols-[50px_74px_1fr_110px_90px] sm:px-6">
            <span>#</span><span className="hidden sm:block">Aperçu</span><span>Modèle</span><span className="hidden text-right sm:block">Appui</span><span className="text-right">Votes</span>
          </div>
          {ranked.length === 0 ? (
            <p className="p-10 text-center font-bold text-black/40">Aucun modèle ne correspond à ces filtres.</p>
          ) : (
            ranked.map(({ item, votes }, index) => {
              const percentage = currentParticipants ? Math.round((votes / currentParticipants) * 100) : 0;
              const relativeWidth = bestScore ? Math.round((votes / bestScore) * 100) : 0;
              return (
                <article key={item.id} className="grid grid-cols-[42px_1fr_72px] items-center border-b border-black/6 px-4 py-3 last:border-0 sm:grid-cols-[50px_74px_1fr_110px_90px] sm:px-6">
                  <span className="text-lg font-black text-black/25">{index + 1}</span>
                  <img src={item.image} alt="" loading="lazy" className="hidden h-14 w-14 rounded-xl bg-stone-100 object-cover sm:block" />
                  <div className="min-w-0 pr-4">
                    <h3 className="truncate text-sm font-black sm:text-base">{item.title}</h3>
                    <p className="mt-1 truncate text-[11px] font-semibold text-black/40">{item.garment.label.fr} · {item.color.label.fr}</p>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/7">
                      <div className="h-full rounded-full bg-[#ff718a]" style={{ width: `${relativeWidth}%` }} />
                    </div>
                  </div>
                  <p className="hidden text-right text-sm font-black text-black/45 sm:block">{percentage}%</p>
                  <div className="text-right">
                    <p className="text-xl font-black">{votes}</p>
                    <p className="text-[10px] font-bold text-black/35 sm:hidden">{percentage}%</p>
                  </div>
                </article>
              );
            })
          )}
        </section>
      </section>
    </main>
  );
}
