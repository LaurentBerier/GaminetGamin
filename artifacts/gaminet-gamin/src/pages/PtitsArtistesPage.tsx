import { useLang } from "@/contexts/LangContext";
import { Link } from "wouter";
import soumissions from "@/data/soumissions-vedettes.json";
import { useState, useRef } from "react";
import { ArrowRight, Upload, CheckCircle2, ChevronDown, ChevronUp, Palette, Camera, Shirt } from "lucide-react";

const GALLERY_COLORS = [
  "from-purple-100 to-pink-100",
  "from-amber-100 to-orange-100",
  "from-sky-100 to-blue-100",
  "from-green-100 to-teal-100",
  "from-rose-100 to-red-100",
  "from-indigo-100 to-violet-100",
];

const GALLERY_EMOJIS = ["🐱", "🐉", "🏠", "🦋", "☀️", "🦈"];

type Lang = "fr" | "en" | "es";

function translateSoumissionField(field: { fr: string; en: string; es: string }, lang: Lang) {
  return field[lang];
}

export default function PtitsArtistesPage() {
  const { lang, t } = useLang();
  const pa = t.p_tits_artistes;

  const programRoute = lang === "fr" ? "/fr/p-tits-artistes" : lang === "en" ? "/en/little-artists" : "/es/pequenos-artistas";
  const shopRoute = lang === "fr" ? "/fr/boutique" : lang === "en" ? "/en/shop" : "/es/tienda";

  const [form, setForm] = useState({
    prenom: "",
    age: "",
    ville: "",
    courriel: "",
    telephone: "",
    raconte: "",
    consent1: false,
    consent2: false,
  });
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileObj, setFileObj] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLDivElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      setFileObj(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(false);

    try {
      const data = new FormData();
      data.append("prenom", form.prenom);
      data.append("age", form.age);
      data.append("ville", form.ville);
      data.append("courriel", form.courriel);
      data.append("telephone", form.telephone);
      data.append("raconte", form.raconte);
      if (fileObj) data.append("dessin", fileObj);

      const res = await fetch("/api/soumissions", { method: "POST", body: data });
      if (res.ok) {
        setSubmitted(true);
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    } finally {
      setSubmitting(false);
    }
  };

  const scrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const faqs = [
    { q: pa.faq1_q, r: pa.faq1_r },
    { q: pa.faq2_q, r: pa.faq2_r },
    { q: pa.faq3_q, r: pa.faq3_r },
    { q: pa.faq4_q, r: pa.faq4_r },
  ];

  const steps = [
    { icon: <Palette size={28} />, titre: pa.step1_titre, texte: pa.step1_texte },
    { icon: <Camera size={28} />, titre: pa.step2_titre, texte: pa.step2_texte },
    { icon: <Shirt size={28} />, titre: pa.step3_titre, texte: pa.step3_texte },
  ];

  return (
    <main data-testid="ptits-artistes-page">
      {/* HERO */}
      <section className="relative min-h-[65vh] flex items-center bg-gradient-to-br from-amber-50 via-stone-50 to-green-50 overflow-hidden" data-testid="pa-hero">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-10 right-12 text-9xl opacity-10 rotate-12">🎨</div>
          <div className="absolute bottom-8 left-8 text-7xl opacity-10 -rotate-6">✏️</div>
          <div className="absolute top-1/2 right-1/4 text-5xl opacity-10 rotate-45">⭐</div>
        </div>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20 relative z-10 w-full">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-gg-gold/20 text-stone-700 text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-6">
              <span>🎨</span>
              {lang === "fr" ? "Programme P'tits Artistes" : lang === "en" ? "Little Artists Program" : "Programa Pequeños Artistas"}
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-stone-900 leading-tight tracking-tight mb-6 uppercase" style={{ fontFamily: "'Nunito', sans-serif" }} data-testid="pa-hero-titre">
              {pa.hero_titre}
            </h1>
            <p className="text-stone-600 text-lg leading-relaxed mb-10 max-w-xl" data-testid="pa-hero-sous-titre">
              {pa.hero_sous_titre}
            </p>
            <button
              onClick={scrollToForm}
              className="bg-stone-900 text-stone-50 px-8 py-4 rounded-full font-semibold text-base hover:bg-gg-green transition-colors duration-300 flex items-center gap-2 group"
              data-testid="pa-hero-cta"
            >
              {pa.hero_cta}
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </section>

      {/* COMMENT ÇA MARCHE */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-20" data-testid="pa-steps">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-black text-stone-900 uppercase tracking-tight mb-3" style={{ fontFamily: "'Nunito', sans-serif" }}>
            {pa.steps_titre}
          </h2>
          <div className="h-1 w-16 bg-gg-gold rounded-full mx-auto" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {steps.map((step, i) => (
            <div key={i} className="relative" data-testid={`pa-step-${i + 1}`}>
              <div className="bg-stone-50 border border-stone-100 rounded-2xl p-8 text-center hover:shadow-md transition-all duration-300 h-full">
                <div className="w-14 h-14 rounded-full bg-gg-gold/20 text-gg-gold flex items-center justify-center mx-auto mb-4">
                  {step.icon}
                </div>
                <div className="text-5xl font-black text-stone-100 absolute top-6 right-8" style={{ fontFamily: "'Nunito', sans-serif" }}>
                  {i + 1}
                </div>
                <h3 className="font-black text-stone-900 text-xl mb-3 relative z-10" style={{ fontFamily: "'Nunito', sans-serif" }}>
                  {step.titre}
                </h3>
                <p className="text-stone-500 text-sm leading-relaxed">
                  {step.texte}
                </p>
              </div>
              {i < 2 && (
                <div className="hidden md:block absolute top-1/2 -right-4 z-10 text-stone-300">
                  <ArrowRight size={24} />
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* LA CAUSE */}
      <section className="bg-gg-green py-20" data-testid="pa-cause">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl sm:text-4xl font-black text-white uppercase tracking-tight mb-6" style={{ fontFamily: "'Nunito', sans-serif" }}>
                {pa.cause_titre}
              </h2>
              <p className="text-green-100 text-lg leading-relaxed mb-8">
                {pa.cause_texte}
              </p>
              <p className="text-green-200 text-sm leading-relaxed italic">
                {pa.cause_note}
              </p>
            </div>
            <div className="space-y-4">
              <p className="text-green-200 text-xs font-bold uppercase tracking-widest mb-4">
                {pa.cause_organismes}
              </p>
              {[pa.cause_org1, pa.cause_org2, pa.cause_org3].map((org, i) => (
                <div key={i} className="flex items-center gap-3 bg-white/10 rounded-xl px-5 py-4">
                  <div className="w-8 h-8 rounded-full bg-gg-gold/80 flex items-center justify-center text-stone-900 font-black text-sm flex-shrink-0">
                    {i + 1}
                  </div>
                  <span className="text-white font-medium">{org}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FORMULAIRE */}
      <section ref={formRef} className="max-w-4xl mx-auto px-4 sm:px-6 py-20" data-testid="pa-form-section">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-black text-stone-900 uppercase tracking-tight mb-3" style={{ fontFamily: "'Nunito', sans-serif" }}>
            {pa.form_titre}
          </h2>
          <div className="h-1 w-16 bg-gg-gold rounded-full mx-auto" />
        </div>

        {submitted ? (
          <div className="text-center py-16 bg-green-50 border border-green-100 rounded-3xl" data-testid="pa-form-success">
            <div className="text-6xl mb-4">🎨</div>
            <CheckCircle2 size={40} className="text-gg-green mx-auto mb-4" />
            <p className="text-xl font-bold text-stone-900">{pa.form_merci}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6 bg-white border border-stone-100 rounded-3xl p-8 sm:p-10 shadow-sm" data-testid="pa-form">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-stone-500 mb-2">{pa.form_prenom} *</label>
                <input
                  type="text"
                  name="prenom"
                  required
                  value={form.prenom}
                  onChange={handleChange}
                  className="w-full border border-stone-200 rounded-xl px-4 py-3 text-stone-900 focus:outline-none focus:border-stone-900 transition-colors text-sm"
                  data-testid="input-prenom"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-stone-500 mb-2">{pa.form_age} *</label>
                <input
                  type="number"
                  name="age"
                  required
                  min={4}
                  max={14}
                  value={form.age}
                  onChange={handleChange}
                  className="w-full border border-stone-200 rounded-xl px-4 py-3 text-stone-900 focus:outline-none focus:border-stone-900 transition-colors text-sm"
                  data-testid="input-age"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-stone-500 mb-2">{pa.form_ville} *</label>
              <input
                type="text"
                name="ville"
                required
                value={form.ville}
                onChange={handleChange}
                className="w-full border border-stone-200 rounded-xl px-4 py-3 text-stone-900 focus:outline-none focus:border-stone-900 transition-colors text-sm"
                data-testid="input-ville"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-stone-500 mb-2">{pa.form_courriel} *</label>
                <input
                  type="email"
                  name="courriel"
                  required
                  value={form.courriel}
                  onChange={handleChange}
                  className="w-full border border-stone-200 rounded-xl px-4 py-3 text-stone-900 focus:outline-none focus:border-stone-900 transition-colors text-sm"
                  data-testid="input-courriel"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-stone-500 mb-2">{pa.form_telephone}</label>
                <input
                  type="tel"
                  name="telephone"
                  value={form.telephone}
                  onChange={handleChange}
                  className="w-full border border-stone-200 rounded-xl px-4 py-3 text-stone-900 focus:outline-none focus:border-stone-900 transition-colors text-sm"
                  data-testid="input-telephone"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-stone-500 mb-2">{pa.form_dessin} *</label>
              <div
                className="border-2 border-dashed border-stone-200 rounded-xl p-6 text-center cursor-pointer hover:border-gg-gold transition-colors"
                onClick={() => fileInputRef.current?.click()}
                data-testid="file-upload-area"
              >
                <Upload size={24} className="mx-auto mb-2 text-stone-400" />
                <p className="text-stone-500 text-sm">
                  {fileName ? (
                    <span className="font-medium text-stone-900">{fileName}</span>
                  ) : (
                    lang === "fr" ? "Cliquer pour choisir un fichier" : lang === "en" ? "Click to choose a file" : "Haz clic para elegir un archivo"
                  )}
                </p>
                <p className="text-stone-400 text-xs mt-1">JPG, PNG — max 10 Mo</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png"
                onChange={handleFile}
                className="hidden"
                data-testid="input-file"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-stone-500 mb-2">{pa.form_raconte}</label>
              <textarea
                name="raconte"
                value={form.raconte}
                onChange={handleChange}
                maxLength={200}
                rows={3}
                placeholder={pa.form_raconte_placeholder}
                className="w-full border border-stone-200 rounded-xl px-4 py-3 text-stone-900 focus:outline-none focus:border-stone-900 transition-colors text-sm resize-none"
                data-testid="input-raconte"
              />
              <p className="text-stone-400 text-xs text-right mt-1">{form.raconte.length}/200</p>
            </div>

            <div className="space-y-3 pt-2">
              <label className="flex items-start gap-3 cursor-pointer" data-testid="consent1-label">
                <input
                  type="checkbox"
                  name="consent1"
                  required
                  checked={form.consent1}
                  onChange={handleChange}
                  className="mt-0.5 w-4 h-4 accent-stone-900 flex-shrink-0"
                  data-testid="input-consent1"
                />
                <span className="text-stone-600 text-sm leading-relaxed">{pa.form_consent1}</span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer" data-testid="consent2-label">
                <input
                  type="checkbox"
                  name="consent2"
                  required
                  checked={form.consent2}
                  onChange={handleChange}
                  className="mt-0.5 w-4 h-4 accent-stone-900 flex-shrink-0"
                  data-testid="input-consent2"
                />
                <span className="text-stone-600 text-sm leading-relaxed">
                  {pa.form_consent2}{" "}
                  <span className="underline text-stone-900 cursor-pointer">
                    {lang === "fr" ? "(lire les conditions)" : lang === "en" ? "(read terms)" : "(leer condiciones)"}
                  </span>
                </span>
              </label>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-100 rounded-xl px-5 py-4 text-red-700 text-sm" data-testid="pa-form-error">
                {pa.form_erreur}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-stone-900 text-stone-50 py-4 rounded-full font-semibold text-base hover:bg-gg-green transition-colors duration-300 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              data-testid="btn-submit"
            >
              {submitting ? (
                <span className="animate-pulse">{lang === "fr" ? "Envoi en cours..." : lang === "en" ? "Sending..." : "Enviando..."}</span>
              ) : (
                pa.form_submit
              )}
            </button>
          </form>
        )}
      </section>

      {/* GALERIE */}
      <section className="bg-amber-50/50 py-20" data-testid="pa-gallery">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-black text-stone-900 uppercase tracking-tight mb-3" style={{ fontFamily: "'Nunito', sans-serif" }}>
              {pa.gallery_titre}
            </h2>
            <p className="text-stone-500 text-base max-w-xl mx-auto">{pa.gallery_sous_titre}</p>
            <div className="h-1 w-16 bg-gg-gold rounded-full mx-auto mt-4" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {soumissions.map((s, i) => (
              <div key={s.id} className="bg-white border border-stone-100 rounded-2xl overflow-hidden hover:shadow-md transition-all duration-300" data-testid={`gallery-card-${s.id}`}>
                <div className={`h-48 bg-gradient-to-br ${GALLERY_COLORS[i % GALLERY_COLORS.length]} flex items-center justify-center`}>
                  <span className="text-7xl opacity-60">{GALLERY_EMOJIS[i % GALLERY_EMOJIS.length]}</span>
                </div>
                <div className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <span className="font-black text-stone-900 text-base" style={{ fontFamily: "'Nunito', sans-serif" }}>{s.prenom}</span>
                      <span className="text-stone-400 text-sm ml-2">
                        {s.age} {t.artistes.age}
                      </span>
                    </div>
                    <span className="text-stone-400 text-xs">{s.ville}</span>
                  </div>
                  <p className="text-stone-500 text-sm italic leading-relaxed mb-4">
                    "{translateSoumissionField(s.description as any, lang as Lang)}"
                  </p>
                  {s.produit_id && (
                    <Link href={`${shopRoute}/${s.produit_id}`}>
                      <span className="inline-flex items-center gap-1.5 bg-gg-gold/20 text-stone-700 text-xs font-bold px-3 py-1.5 rounded-full hover:bg-gg-gold/30 transition-colors cursor-pointer">
                        <Shirt size={12} />
                        {pa.gallery_disponible}
                      </span>
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-20" data-testid="pa-faq">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-black text-stone-900 uppercase tracking-tight mb-3" style={{ fontFamily: "'Nunito', sans-serif" }}>
            {pa.faq_titre}
          </h2>
          <div className="h-1 w-16 bg-gg-gold rounded-full mx-auto" />
        </div>
        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <div key={i} className="border border-stone-200 rounded-2xl overflow-hidden" data-testid={`faq-item-${i}`}>
              <button
                className="w-full flex items-center justify-between px-6 py-5 text-left bg-white hover:bg-stone-50 transition-colors"
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                data-testid={`faq-toggle-${i}`}
              >
                <span className="font-bold text-stone-900 text-base pr-4">{faq.q}</span>
                {openFaq === i ? <ChevronUp size={18} className="text-stone-400 flex-shrink-0" /> : <ChevronDown size={18} className="text-stone-400 flex-shrink-0" />}
              </button>
              {openFaq === i && (
                <div className="px-6 pb-5 bg-stone-50 border-t border-stone-100" data-testid={`faq-answer-${i}`}>
                  <p className="text-stone-600 text-sm leading-relaxed pt-4">{faq.r}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
