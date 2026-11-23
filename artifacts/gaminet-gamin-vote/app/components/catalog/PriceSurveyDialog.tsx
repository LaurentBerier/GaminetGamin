"use client";

import { useEffect, useRef, useState } from "react";
import { priceChoices } from "../../../lib/price-survey.mjs";
import type { PriceSurvey } from "../../../lib/price-survey.mjs";
import type { CatalogItem } from "./grouping";

export function PriceSurveyDialog({
  item,
  previous,
  onSave,
  onDismiss,
}: {
  item: CatalogItem;
  previous: PriceSurvey | null;
  onSave: (answer: PriceSurvey) => Promise<void>;
  onDismiss: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const options = priceChoices[item.garment.id] ?? [];
  const previousAmount = previous?.status === 'answered' ? previous.amount : null;
  const [choice, setChoice] = useState(previousAmount !== null ? (options.includes(previousAmount) ? String(previousAmount) : 'other') : '');
  const [amount, setAmount] = useState(previousAmount !== null && !options.includes(previousAmount) ? String(previousAmount) : '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const amountNumber = Number((choice === "other" ? amount : choice).replace(",", "."));
  const validAmount =
    choice !== "" && (choice !== "other" || amount.trim() !== "") &&
    Number.isFinite(amountNumber) &&
    amountNumber >= 1 &&
    amountNumber <= 1000 &&
    Math.abs(amountNumber * 100 - Math.round(amountNumber * 100)) < 0.000001;

  useEffect(() => {
    const element = dialog.current;
    const overflow = document.body.style.overflow;
    element?.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      element?.close();
      document.body.style.overflow = overflow;
    };
  }, []);

  async function submit(status: PriceSurvey["status"]) {
    if (saving || (status === "answered" && !validAmount)) return;
    setSaving(true);
    setError("");
    try {
      await onSave({
        version: 2,
        status,
        itemId: item.id,
        garmentId: item.garment.id,
        amount: status === "answered" ? amountNumber : null,
        currency: "CAD",
        charity: "fondation-chu-sainte-justine",
        answerSource: choice === "other" ? "custom" : "choice",
      });
      onDismiss();
    } catch {
      setError(
        "Votre réponse n’a pas pu être enregistrée. Vos favoris sont conservés. Réessayez.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <dialog
      ref={dialog}
      onCancel={(event) => {
        event.preventDefault();
        if (!saving) onDismiss();
      }}
      aria-labelledby="price-survey-title"
      aria-describedby="price-survey-intro"
      className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-xl overflow-y-auto rounded-3xl border-0 bg-stone-50 p-5 text-stone-900 shadow-2xl backdrop:bg-black/50 sm:p-6"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-bold uppercase tracking-widest text-[#96682f]">
          Votre avis · {item.garment.label.fr}
        </p>
        <button
          type="button"
          disabled={saving}
          onClick={onDismiss}
          aria-label="Fermer le sondage"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-stone-200 text-xl"
        >
          ×
        </button>
      </div>
      <h2
        id="price-survey-title"
        className="mt-2 text-2xl font-black leading-tight"
      >
        Combien seriez-vous prêt à payer?
      </h2>
      <p
        id="price-survey-intro"
        className="mt-2 text-sm leading-relaxed text-stone-600"
      >
        Une réponse par type de produit, même si vous aimez plusieurs modèles.
      </p>
      <div className="mt-3 flex items-center gap-3 rounded-2xl border border-stone-200 bg-white p-2">
        <img
          src={item.image}
          alt={item.title + " — " + item.garment.label.fr}
          className="h-16 w-16 rounded-xl object-cover"
        />
        <div>
          <p className="font-black">{item.title}</p>
          <p className="mt-1 text-sm text-stone-600">
            {item.garment.label.fr} · {item.color.label.fr}
          </p>
        </div>
      </div>
      <p className="mt-3 rounded-2xl bg-[#e9e1fa] p-3 text-sm leading-relaxed text-[#594276]">
        Une partie des profits sera versée à la{" "}
        <a
          href="https://www.fondationstejustine.org/"
          target="_blank"
          rel="noreferrer"
          className="font-bold underline underline-offset-2"
        >
          Fondation CHU Sainte-Justine
        </a>
        , pour soutenir la santé des enfants.
      </p>
      <form
        className="mt-3"
        onSubmit={(event) => {
          event.preventDefault();
          void submit("answered");
        }}
      >
        <fieldset disabled={saving}>
          <legend className="text-base font-bold">Votre budget · {item.garment.label.fr} (CAD)</legend>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[...options.map(String), 'other'].map((value) => <label key={value} className={'relative flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 px-2 py-2.5 text-sm font-bold focus-within:ring-2 focus-within:ring-[#a87739] ' + (choice === value ? 'border-stone-900 bg-[#e9e1fa]' : 'border-stone-200 bg-white')}>
              <input type="radio" name="price-choice" value={value} checked={choice === value} onChange={() => setChoice(value)} className="h-4 w-4 accent-stone-900" />
              {value === 'other' ? 'Autre montant' : value + ' $'}
            </label>)}
          </div>
          {choice === 'other' && <label className="mt-4 block text-sm font-bold">Votre montant en dollars canadiens
            <input id="survey-price" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} aria-describedby="price-survey-help" placeholder="Votre montant" className="mt-2 w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-lg outline-none focus:ring-2 focus:ring-[#a87739]" />
          </label>}
        </fieldset>
        <p id="price-survey-help" className="mt-2 text-sm text-stone-500">
          Votre vote est déjà compté. Réponse facultative, sans engagement d’achat.
        </p>
        {choice === "other" && amount.trim() && !validAmount && (
          <p className="mt-2 text-sm text-red-800">
            Entrez un montant entre 1 et 1 000 $, avec au plus deux décimales.
          </p>
        )}
        {error && (
          <p
            role="alert"
            className="mt-3 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-800"
          >
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={saving || !validAmount}
          className="mt-3 w-full rounded-full bg-stone-900 px-5 py-3.5 text-base font-bold text-white disabled:opacity-40"
        >
          {saving ? "Enregistrement…" : "Envoyer ma réponse"}
        </button>
        <div className="mt-1 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            disabled={saving}
            onClick={() => void submit("unsure")}
            className="rounded-full px-4 py-3 text-sm font-bold hover:bg-stone-200"
          >
            Je ne sais pas
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void submit("skipped")}
            className="rounded-full px-4 py-3 text-sm font-bold text-stone-600 hover:bg-stone-200"
          >
            Plus tard
          </button>
        </div>
      </form>
    </dialog>
  );
}
