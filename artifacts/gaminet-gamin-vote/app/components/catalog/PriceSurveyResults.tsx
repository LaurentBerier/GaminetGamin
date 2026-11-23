import type { PriceSurveySummary } from "../../../lib/vote-results.mjs";
import { garmentNames } from "./grouping";

const money = (amount: number) =>
  new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD" }).format(
    amount,
  );

export function PriceSurveyResults({
  summary,
  groupLabel,
}: {
  summary?: PriceSurveySummary;
  groupLabel: string;
}) {
  function exportCsv() {
    const rows: Array<Array<string | number>> = [
      ["Groupe", "Vêtement", "Prix proposé (CAD)", "Réponses"],
    ];
    for (const [id, values] of Object.entries(summary?.garments ?? {})) {
      for (const [amount, count] of Object.entries(values.amounts))
        rows.push([groupLabel, garmentNames[id] ?? id, amount, count]);
      if (values.unsure)
        rows.push([
          groupLabel,
          garmentNames[id] ?? id,
          "Je ne sais pas",
          values.unsure,
        ]);
      if (values.skipped) rows.push([groupLabel, garmentNames[id] ?? id, 'Plus tard', values.skipped]);
    }
    const csv =
      "\uFEFF" +
      rows
        .map((row) =>
          row
            .map(
              (cell) =>
                '"' +
                String(cell)
                  .replace(/^[=+@\-\t\r]/, (first) => "'" + first)
                  .replace(/"/g, '""') +
                '"',
            )
            .join(";"),
        )
        .join("\n");
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "sondage-prix.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <section
      className="mt-8 rounded-3xl border border-stone-200 bg-white p-5 sm:p-6"
      aria-labelledby="price-results-title"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-widest text-[#96682f]">
            Sondage · {groupLabel}
          </p>
          <h2 id="price-results-title" className="mt-2 text-2xl font-black">
            Le prix selon vos visiteurs
          </h2>
        </div>
        <button
          type="button"
          disabled={!summary?.responses && !summary?.skipped}
          onClick={exportCsv}
          className="rounded-full bg-stone-900 px-5 py-3 text-sm font-bold text-white disabled:opacity-40"
        >
          Exporter les réponses sur le prix
        </button>
      </div>
      <p className="mt-3 text-base leading-relaxed text-stone-600">
        Chaque visiteur peut proposer un prix par type de produit aimé. Toutes les
        réponses sont comptées, même lorsque le sondage reste incomplet. Les anciennes
        réponses sont conservées et les montants sont regroupés par type.
      </p>
      <p className="mt-4 text-sm font-bold">
        {summary?.respondents ?? 0} personne{(summary?.respondents ?? 0) > 1 ? "s" : ""} · {summary?.responses ?? 0} réponse
        {(summary?.responses ?? 0) > 1 ? "s" : ""} · {summary?.unsure ?? 0} « Je
        ne sais pas » · {summary?.skipped ?? 0} « Plus tard »
      </p>
      {!summary?.responses && !summary?.skipped ? (
        <p className="mt-6 rounded-2xl bg-stone-50 p-5 text-stone-500">
          Aucune réponse sur le prix pour ce groupe pour le moment.
        </p>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {Object.entries(summary?.garments ?? {}).map(([id, values]) => {
            const entries = Object.entries(values.amounts)
              .map(([amount, count]) => [Number(amount), count])
              .sort((a, b) => a[0] - b[0]);
            const count = entries.reduce((sum, [, n]) => sum + n, 0);
            const total = entries.reduce(
              (sum, [amount, n]) => sum + amount * n,
              0,
            );
            return (
              <article
                key={id}
                className="rounded-2xl border border-stone-200 p-5"
              >
                <h3 className="text-lg font-black">{garmentNames[id] ?? id}</h3>
                <p className="mt-3 text-3xl font-black">
                  {count ? money(total / count) : "—"}
                </p>
                <p className="mt-1 text-sm text-stone-500">
                  Prix moyen · {count} montant{count > 1 ? "s" : ""} proposé
                  {count > 1 ? "s" : ""}
                </p>
                {count > 0 && (
                  <>
                    <p className="mt-3 text-sm">
                      De {money(entries[0][0])} à{" "}
                      {money(entries[entries.length - 1][0])}
                    </p>
                    <details className="mt-4 text-sm">
                      <summary className="cursor-pointer font-bold">
                        Voir la répartition
                      </summary>
                      <ul className="mt-3 space-y-2">
                        {entries.map(([amount, n]) => (
                          <li
                            key={amount}
                            className="flex justify-between gap-4"
                          >
                            <span>{money(amount)}</span>
                            <span>
                              {n} réponse{n > 1 ? "s" : ""}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </details>
                  </>
                )}
                {values.skipped > 0 && <p className="mt-3 text-sm text-stone-500">{values.skipped} « Plus tard »</p>}
                {values.unsure > 0 && (
                  <p className="mt-3 text-sm text-stone-500">
                    {values.unsure} « Je ne sais pas »
                  </p>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
