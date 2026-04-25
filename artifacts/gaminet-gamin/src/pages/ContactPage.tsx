import { useState } from "react";
import { useLang } from "@/contexts/LangContext";
import { Instagram, Mail } from "lucide-react";

export default function ContactPage() {
  const { t } = useLang();
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ nom: "", courriel: "", message: "" });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-20" data-testid="contact-page">
      <div className="mb-12">
        <h1 className="text-4xl sm:text-5xl font-black text-stone-900 uppercase tracking-tight mb-3" style={{ fontFamily: "'Nunito', sans-serif" }} data-testid="contact-title">
          {t.contact.titre}
        </h1>
        <p className="text-stone-500 text-lg mb-4">{t.contact.sous_titre}</p>
        <div className="h-1 w-16 bg-gg-gold rounded-full" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-12">
        <div className="md:col-span-3" data-testid="contact-form-wrapper">
          {submitted ? (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-8 text-center" data-testid="contact-success">
              <div className="text-4xl mb-3">✓</div>
              <p className="text-green-700 font-semibold text-lg">{t.contact.merci}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5" data-testid="contact-form">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-stone-500 mb-2" htmlFor="nom">
                  {t.contact.nom}
                </label>
                <input
                  id="nom"
                  type="text"
                  required
                  value={form.nom}
                  onChange={(e) => setForm({ ...form, nom: e.target.value })}
                  className="w-full border-2 border-stone-200 rounded-xl px-4 py-3 text-stone-900 focus:outline-none focus:border-stone-900 transition-colors"
                  data-testid="input-nom"
                  placeholder={t.contact.nom}
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-stone-500 mb-2" htmlFor="courriel">
                  {t.contact.courriel}
                </label>
                <input
                  id="courriel"
                  type="email"
                  required
                  value={form.courriel}
                  onChange={(e) => setForm({ ...form, courriel: e.target.value })}
                  className="w-full border-2 border-stone-200 rounded-xl px-4 py-3 text-stone-900 focus:outline-none focus:border-stone-900 transition-colors"
                  data-testid="input-courriel"
                  placeholder={t.contact.courriel}
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-stone-500 mb-2" htmlFor="message">
                  {t.contact.message}
                </label>
                <textarea
                  id="message"
                  required
                  rows={5}
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  className="w-full border-2 border-stone-200 rounded-xl px-4 py-3 text-stone-900 focus:outline-none focus:border-stone-900 transition-colors resize-none"
                  data-testid="input-message"
                  placeholder={t.contact.message}
                />
              </div>

              <button
                type="submit"
                className="w-full bg-stone-900 text-stone-50 py-4 rounded-full font-semibold text-base hover:bg-gg-green transition-colors"
                data-testid="btn-submit"
              >
                {t.contact.envoyer}
              </button>
            </form>
          )}
        </div>

        <div className="md:col-span-2 space-y-6" data-testid="contact-info">
          <div className="bg-stone-50 border border-stone-100 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-stone-900 rounded-xl flex items-center justify-center">
                <Instagram size={18} className="text-stone-50" />
              </div>
              <p className="font-semibold text-stone-900 text-sm">{t.contact.instagram}</p>
            </div>
            <a
              href="https://instagram.com/gaminetgaminggg"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gg-green font-bold hover:underline text-sm"
              data-testid="link-instagram"
            >
              @gaminetgamingg
            </a>
          </div>

          <div className="bg-stone-50 border border-stone-100 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-stone-900 rounded-xl flex items-center justify-center">
                <Mail size={18} className="text-stone-50" />
              </div>
              <p className="font-semibold text-stone-900 text-sm">{t.contact.email_label}</p>
            </div>
            <a href="mailto:salut@gaminetgamin.ca" className="text-gg-green font-bold hover:underline text-sm" data-testid="link-email">
              salut@gaminetgamin.ca
            </a>
          </div>

          <div className="bg-gg-gold/10 border border-gg-gold/30 rounded-2xl p-6">
            <p className="text-stone-700 text-sm font-black uppercase tracking-wide mb-1" style={{ fontFamily: "'Nunito', sans-serif" }}>
              Made in Québec
            </p>
            <p className="text-stone-500 text-sm">{t.footer.fait_avec}</p>
          </div>
        </div>
      </div>
    </main>
  );
}
