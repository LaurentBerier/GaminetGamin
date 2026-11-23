"use client";

import { useEffect, useRef, useState } from "react";
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
  const [amount, setAmount] = useState(
    previous?.itemId === item.id ? (previous.amount?.toString() ?? "") : "",
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const amountNumber = Number(amount.replace(",", "."));
  const validAmount =
    amount.trim() !== "" &&
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
        version: 1,
        status,
        itemId: item.id,
        garmentId: item.garment.id,
        amount: status === "answered" ? amountNumber : null,
        currency: "CAD",
        charity: "fondation-chu-sainte-justine",
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
      className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-3xl border-0 bg-stone-50 p-6 text-stone-900 shadow-2xl backdrop:bg-black/50 sm:p-8"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-bold uppercase tracking-widest text-[#96682f]">
          Vos coups de cœur, la suite
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
        className="mt-4 text-3xl font-black leading-tight"
      >
        Quel prix vous semblerait juste?
      </h2>
      <p
        id="price-survey-intro"
        className="mt-3 text-base leading-relaxed text-stone-600"
      >
        Vous avez aimé plusieurs chandails. Pour ce modèle, combien seriez-vous
        prêt à payer?
      </p>
      <div className="mt-5 flex items-center gap-4 rounded-2xl border border-stone-200 bg-white p-3">
        <img
          src={item.image}
          alt={item.title + " — " + item.garment.label.fr}
          className="h-24 w-24 rounded-xl object-cover"
        />
        <div>
          <p className="font-black">{item.title}</p>
          <p className="mt-1 text-sm text-stone-600">
            {item.garment.label.fr} · {item.color.label.fr}
          </p>
        </div>
      </div>
      <p className="mt-5 rounded-2xl bg-[#e9e1fa] p-4 text-base leading-relaxed text-[#594276]">
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
        className="mt-5"
        onSubmit={(event) => {
          event.preventDefault();
          void submit("answered");
        }}
      >
        <label htmlFor="survey-price" className="block text-base font-bold">
          Votre prix pour ce chandail (CAD)
        </label>
        <div className="relative mt-2">
          <input
            id="survey-price"
            inputMode="decimal"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            disabled={saving}
            aria-describedby="price-survey-help"
            placeholder="Votre montant"
            className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3 pr-12 text-lg outline-none focus:ring-2 focus:ring-[#a87739]"
          />
          <span className="absolute right-4 top-3 text-lg font-bold">$</span>
        </div>
        <p id="price-survey-help" className="mt-2 text-sm text-stone-500">
          Question facultative, sans engagement d’achat.
        </p>
        {amount.trim() && !validAmount && (
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
          className="mt-5 w-full rounded-full bg-stone-900 px-5 py-3.5 text-base font-bold text-white disabled:opacity-40"
        >
          {saving ? "Enregistrement…" : "Envoyer ma réponse"}
        </button>
        <div className="mt-3 flex flex-wrap justify-center gap-2">
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
