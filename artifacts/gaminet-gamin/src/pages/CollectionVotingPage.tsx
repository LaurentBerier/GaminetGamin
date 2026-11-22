import { useEffect, useState } from 'react';
import catalog from '../../../gaminet-gamin-vote/content/catalog.json';
import { CollectionStorefront } from '../../../gaminet-gamin-vote/app/components/catalog/CollectionStorefront';

export function CollectionPreview() {
  const [resultsKey] = useState(() => new URLSearchParams(window.location.search).get('results'));
  useEffect(() => {
    if (resultsKey) window.location.replace('/admin');
  }, [resultsKey]);
  if (resultsKey) return <main className="grid min-h-screen place-items-center bg-[#201c19] text-white"><p>Ouverture de l’administration…</p></main>;
  return <CollectionStorefront catalog={catalog} />;
}
