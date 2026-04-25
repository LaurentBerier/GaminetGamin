import { useLang } from "@/contexts/LangContext";

export default function AproposPage() {
  const { t } = useLang();

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-20" data-testid="apropos-page">
      <div className="mb-12">
        <h1 className="text-4xl sm:text-5xl font-black text-stone-900 uppercase tracking-tight mb-6 leading-tight" style={{ fontFamily: "'Nunito', sans-serif" }} data-testid="apropos-title">
          {t.apropos.titre}
        </h1>
        <div className="h-1 w-16 bg-gg-gold rounded-full mb-8" />
        <div className="space-y-5 text-stone-600 text-lg leading-relaxed">
          <p data-testid="apropos-p1">{t.apropos.p1}</p>
          <p data-testid="apropos-p2">{t.apropos.p2}</p>
          <p data-testid="apropos-p3">{t.apropos.p3}</p>
        </div>
      </div>

      <div className="bg-stone-900 rounded-3xl p-10 text-center mb-16" data-testid="mission-block">
        <h2 className="text-stone-400 text-xs font-bold uppercase tracking-widest mb-3">{t.apropos.mission}</h2>
        <p className="text-stone-50 text-2xl font-black uppercase tracking-tight leading-tight" style={{ fontFamily: "'Nunito', sans-serif" }}>
          {t.apropos.mission_texte}
        </p>
      </div>

      <h2 className="text-2xl font-black text-stone-900 uppercase tracking-tight mb-8" style={{ fontFamily: "'Nunito', sans-serif" }} data-testid="valeurs-title">
        {t.apropos.valeurs}
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {[
          { title: t.apropos.val1_titre, text: t.apropos.val1_texte, emoji: "🍁" },
          { title: t.apropos.val2_titre, text: t.apropos.val2_texte, emoji: "✏️" },
          { title: t.apropos.val3_titre, text: t.apropos.val3_texte, emoji: "👕" },
        ].map((val, i) => (
          <div
            key={i}
            className="bg-stone-50 border border-stone-100 rounded-2xl p-6 hover:border-stone-200 hover:shadow-md transition-all"
            data-testid={`valeur-card-${i}`}
          >
            <div className="text-3xl mb-3">{val.emoji}</div>
            <h3 className="font-bold text-stone-900 text-base mb-1">{val.title}</h3>
            <p className="text-stone-500 text-sm leading-relaxed">{val.text}</p>
          </div>
        ))}
      </div>

      <div className="mt-20 bg-amber-50 border border-amber-100 rounded-3xl p-10 text-center">
        <p className="text-3xl sm:text-4xl font-black text-stone-900 uppercase tracking-tight" style={{ fontFamily: "'Nunito', sans-serif" }}>
          {t.home.slogan}
        </p>
        <div className="flex justify-center mt-4">
          <div className="h-1 w-16 bg-gg-gold rounded-full" />
        </div>
      </div>
    </main>
  );
}
