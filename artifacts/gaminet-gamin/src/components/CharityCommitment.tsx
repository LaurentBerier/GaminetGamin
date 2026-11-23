import { Heart, X } from 'lucide-react';
import { useState } from 'react';
import { useLang } from '@/contexts/LangContext';
import { ArtworkAccent } from '../../../gaminet-gamin-vote/app/components/ArtworkAccent';

const copy = {
  fr: {
    title: 'Des dessins qui font du bien.',
    message: 'Une partie de nos profits sera versée à des organismes de bienfaisance qui soutiennent les enfants, dont la',
    link: 'Découvrir notre engagement',
    close: 'Fermer le bandeau de bienfaisance',
    shortMessage: 'Une partie de nos profits sera versée à des organismes pour les enfants, dont la',
    story: 'L’imagination des enfants mérite de faire du chemin. En donnant vie à leurs dessins sur nos vêtements, on veut aussi redonner aux enfants et aux familles. C’est pourquoi une partie des profits de Gaminet Gamin soutiendra des œuvres de bienfaisance, dont la Fondation CHU Sainte-Justine.',
    closing: 'Tu nous aides à choisir les modèles qui prendront vie. Ensemble, on fait une place à la créativité et à la solidarité.',
  },
  en: {
    title: 'Little drawings. A little more good.',
    message: 'A portion of our profits will go to charities that support children, including the',
    link: 'Discover our commitment',
    close: 'Close the charity banner',
    shortMessage: 'Part of our profits will support children’s charities, including the',
    story: 'Children’s imagination deserves to go places. By bringing their drawings to life on clothing, we also want to give back to children and families. That is why a portion of Gaminet Gamin’s profits will support charities, including the Fondation CHU Sainte-Justine.',
    closing: 'You help us choose the designs that will come to life. Together, we make room for creativity and generosity.',
  },
  es: {
    title: 'Dibujos que hacen el bien.',
    message: 'Una parte de nuestras ganancias se destinará a organizaciones benéficas que apoyan a los niños, entre ellas la',
    link: 'Conoce nuestro compromiso',
    close: 'Cerrar el aviso benéfico',
    shortMessage: 'Parte de nuestras ganancias apoyará a organizaciones para niños, entre ellas la',
    story: 'La imaginación de los niños merece llegar lejos. Al dar vida a sus dibujos en nuestra ropa, también queremos apoyar a los niños y a sus familias. Por eso, una parte de las ganancias de Gaminet Gamin se destinará a organizaciones benéficas, entre ellas la Fondation CHU Sainte-Justine.',
    closing: 'Nos ayudas a elegir los diseños que cobrarán vida. Juntos, damos espacio a la creatividad y a la solidaridad.',
  },
};

export function CharityCommitment({ compact = false }: { compact?: boolean }) {
  const [dismissed, setDismissed] = useState(() => {
    try { return sessionStorage.getItem('gg-charity-banner-dismissed') === '1'; } catch { return false; }
  });
  const { lang } = useLang();
  const text = copy[lang];
  const storyPath = { fr: '/fr/apropos', en: '/en/about', es: '/es/nosotros' }[lang];
  function dismiss() {
    setDismissed(true);
    try { sessionStorage.setItem('gg-charity-banner-dismissed', '1'); } catch { /* Closing still works when storage is unavailable. */ }
  }
  if (compact && dismissed) return null;
  if (compact) return <aside className="bg-[#315c47] text-white" aria-label={text.title} data-testid="charity-banner">
    <div className="relative mx-auto flex max-w-7xl items-center gap-4 py-3 pl-4 pr-14 sm:pl-6 sm:pr-16">
      <ArtworkAccent name="harry" eager className="hidden w-16 -rotate-6 sm:inline-block" />
      <div><p className="text-base font-black">{text.title}</p><p className="mt-1 text-base leading-snug text-white/90"><span className="hidden sm:inline">{text.message}</span><span className="sm:hidden">{text.shortMessage}</span> <a href="https://www.fondationstejustine.org/" target="_blank" rel="noreferrer" className="font-bold underline underline-offset-4">Fondation CHU Sainte-Justine</a>.</p><a href={storyPath + '#engagement'} className="mt-1 inline-block py-1 text-sm font-bold text-[#dce77d] underline underline-offset-4">{text.link}</a></div>
      <button type="button" onClick={dismiss} aria-label={text.close} className="absolute right-2 top-2 grid h-11 w-11 place-items-center rounded-full text-white/90 transition hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-white sm:right-4" data-testid="dismiss-charity-banner"><X size={18} aria-hidden="true" /></button>
    </div>
  </aside>;
  return <section id="engagement" className="relative mb-12 rounded-3xl bg-[#315c47] p-6 text-white sm:p-9" aria-labelledby="charity-title" data-testid="charity-story">
    <div className="flex items-center justify-between"><Heart size={28} aria-hidden="true" className="text-[#dce77d]" /><ArtworkAccent name="harry" className="-my-3 w-24 rotate-6 sm:w-28" /></div>
    <h2 id="charity-title" className="mt-4 text-3xl font-black">{text.title}</h2>
    <p className="mt-4 text-lg leading-relaxed text-white/90">{text.story}</p>
    <p className="mt-4 text-base leading-relaxed text-white/90">{text.closing}</p>
    <a href="https://www.fondationstejustine.org/" target="_blank" rel="noreferrer" className="mt-5 inline-block text-base font-bold text-[#dce77d] underline underline-offset-4">Fondation CHU Sainte-Justine</a>
  </section>;
}
