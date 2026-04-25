import { useLang } from "@/contexts/LangContext";
import produits from "@/data/produits.json";

type ArtistEntry = {
  id: string;
  nom: string;
  age: number;
  bio: { fr: string; en: string; es: string };
  products: typeof produits;
};

export default function ArtistesPage() {
  const { t, translateField } = useLang();

  const artistMap = new Map<string, ArtistEntry>();
  for (const p of produits) {
    const a = p.artiste;
    if (!artistMap.has(a.id)) {
      artistMap.set(a.id, { id: a.id, nom: a.nom, age: a.age, bio: a.bio, products: [] });
    }
    artistMap.get(a.id)!.products.push(p);
  }
  const artistes = Array.from(artistMap.values());

  const avatarColors = [
    "bg-amber-100 text-amber-700",
    "bg-green-100 text-green-700",
    "bg-blue-100 text-blue-700",
    "bg-purple-100 text-purple-700",
    "bg-rose-100 text-rose-700",
    "bg-orange-100 text-orange-700",
  ];

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-20" data-testid="artistes-page">
      <div className="mb-12">
        <h1 className="text-4xl sm:text-5xl font-black text-stone-900 uppercase tracking-tight mb-3" style={{ fontFamily: "'Nunito', sans-serif" }} data-testid="artistes-title">
          {t.artistes.titre}
        </h1>
        <p className="text-stone-500 text-lg mb-4">{t.artistes.sous_titre}</p>
        <div className="h-1 w-16 bg-gg-gold rounded-full" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
        {artistes.map((artiste, i) => (
          <div
            key={artiste.id}
            className="bg-white border border-stone-100 rounded-3xl p-8 hover:border-stone-200 hover:shadow-lg transition-all duration-300"
            data-testid={`artiste-card-${artiste.id}`}
          >
            <div className="flex items-start gap-4 mb-5">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center font-black text-3xl ${avatarColors[i % avatarColors.length]}`}>
                {artiste.nom[0]}
              </div>
              <div>
                <h2 className="text-2xl font-black text-stone-900" style={{ fontFamily: "'Nunito', sans-serif" }} data-testid={`artiste-name-${artiste.id}`}>
                  {artiste.nom}
                </h2>
                <p className="text-stone-500 text-sm">{artiste.age} {t.artistes.age}</p>
              </div>
            </div>

            <p className="text-stone-600 text-sm leading-relaxed mb-6" data-testid={`artiste-bio-${artiste.id}`}>
              {translateField(artiste.bio)}
            </p>

            <div className="flex gap-2 flex-wrap">
              {artiste.products.map((p) => (
                <div
                  key={p.id}
                  className="w-12 h-12 rounded-xl overflow-hidden border border-stone-100"
                  title={translateField(p.nom as any)}
                >
                  <img src={p.image} alt={translateField(p.nom as any)} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
