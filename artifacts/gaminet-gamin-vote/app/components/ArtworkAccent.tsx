const drawings = {
  lapinou: '/designs/v3-lapinou-49df9c56b9.webp',
  harry: '/designs/v3-harryhearth-8d97ee348b.webp',
  egg: '/designs/v3-oeufsouriant-8e9285529b.webp',
  chat: '/designs/v3-chat-68d95e563b.webp',
  monstru: '/designs/v3-montru-bdc5116dfc.webp',
};

// Use the approved, transparent artwork intact. These accents are decorative.
export function ArtworkAccent({ name, className = '', eager = false }: {
  name: keyof typeof drawings;
  className?: string;
  eager?: boolean;
}) {
  return <span aria-hidden="true" className={'artwork-accent pointer-events-none shrink-0 select-none ' + className} data-artwork={name}>
    <img src={drawings[name]} alt="" width={160} height={160} className="block aspect-square h-auto w-full object-contain" loading={eager ? 'eager' : 'lazy'} decoding="async" draggable={false} />
  </span>;
}

export function ArtworkParade() {
  return <div aria-hidden="true" className="artwork-parade mx-auto flex max-w-3xl items-end justify-around gap-4 px-6">
    <ArtworkAccent name="lapinou" className="w-20 -rotate-6 sm:w-28" />
    <ArtworkAccent name="egg" className="mb-3 w-20 rotate-6 sm:w-28" />
    <ArtworkAccent name="monstru" className="w-20 -rotate-3 sm:w-28" />
    <ArtworkAccent name="chat" className="hidden w-28 rotate-3 sm:inline-block" />
  </div>;
}
