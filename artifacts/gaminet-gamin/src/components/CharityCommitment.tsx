import { Heart } from 'lucide-react';
import { useLang } from '@/contexts/LangContext';

const copy = {
  fr: {
    title: 'Des dessins qui font du bien.',
    message: 'Une partie de nos profits sera versée à des organismes de bienfaisance qui soutiennent les enfants, dont la',
    link: 'Découvrir notre engagement',
    story: 'L’imagination des enfants mérite de faire du chemin. En donnant vie à leurs dessins sur nos vêtements, on veut aussi redonner aux enfants et aux familles. C’est pourquoi une partie des profits de Gaminet Gamin soutiendra des œuvres de bienfaisance, dont la Fondation CHU Sainte-Justine.',
    closing: 'Tu nous aides à choisir les modèles qui prendront vie. Ensemble, on fait une place à la créativité et à la solidarité.',
  },
  en: {
    title: 'Little drawings. A little more good.',
    message: 'A portion of our profits will go to charities that support children, including the',
    link: 'Discover our commitment',
    story: 'Children’s imagination deserves to go places. By bringing their drawings to life on clothing, we also want to give back to children and families. That is why a portion of Gaminet Gamin’s profits will support charities, including the Fondation CHU Sainte-Justine.',
    closing: 'You help us choose the designs that will come to life. Together, we make room for creativity and generosity.',
  },
  es: {
    title: 'Dibujos que hacen el bien.',
    message: 'Una parte de nuestras ganancias se destinará a organizaciones benéficas que apoyan a los niños, entre ellas la',
    link: 'Conoce nuestro compromiso',
    story: 'La imaginación de los niños merece llegar lejos. Al dar vida a sus dibujos en nuestra ropa, también queremos apoyar a los niños y a sus familias. Por eso, una parte de las ganancias de Gaminet Gamin se destinará a organizaciones benéficas, entre ellas la Fondation CHU Sainte-Justine.',
    closing: 'Nos ayudas a elegir los diseños que cobrarán vida. Juntos, damos espacio a la creatividad y a la solidaridad.',
  },
};

export function CharityCommitment({ compact = false }: { compact?: boolean }) {
  const { lang } = useLang();
  const text = copy[lang];
  const storyPath = { fr: '/fr/apropos', en: '/en/about', es: '/es/nosotros' }[lang];
  if (compact) return <aside className="bg-[#315c47] text-white" aria-label={text.title} data-testid="charity-banner">
    <div className="mx-auto flex max-w-7xl items-start gap-3 px-5 py-5 sm:px-8">
      <Heart size={24} aria-hidden="true" className="mt-1 shrink-0 text-[#dce77d]" />
      <div><p className="text-lg font-black">{text.title}</p><p className="mt-1 text-base leading-relaxed text-white/90">{text.message} <a href="https://www.fondationstejustine.org/" target="_blank" rel="noreferrer" className="font-bold underline underline-offset-4">Fondation CHU Sainte-Justine</a>.</p><a href={storyPath + '#engagement'} className="mt-2 inline-block text-sm font-bold text-[#dce77d] underline underline-offset-4">{text.link}</a></div>
    </div>
  </aside>;
  return <section id="engagement" className="mb-12 scroll-mt-28 rounded-3xl bg-[#315c47] p-6 text-white sm:p-9" aria-labelledby="charity-title" data-testid="charity-story">
    <Heart size={28} aria-hidden="true" className="text-[#dce77d]" />
    <h2 id="charity-title" className="mt-4 text-3xl font-black">{text.title}</h2>
    <p className="mt-4 text-lg leading-relaxed text-white/90">{text.story}</p>
    <p className="mt-4 text-base leading-relaxed text-white/90">{text.closing}</p>
    <a href="https://www.fondationstejustine.org/" target="_blank" rel="noreferrer" className="mt-5 inline-block text-base font-bold text-[#dce77d] underline underline-offset-4">Fondation CHU Sainte-Justine</a>
  </section>;
}
