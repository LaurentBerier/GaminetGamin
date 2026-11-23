# Gaminet Gamin — Collection vote

Public catalog and voting site for the 107 current apparel mockups.

## What is data-driven

- `content/catalog.json` contains the sections, garments, colors, titles, images, and campaign rules.
- `scripts/sync_catalog.py` rebuilds that catalog and the optimized web images from the three Batch 3 manifests.
- The public page creates filters, counts, shop cards without displayed prices, and voting hearts directly from the catalog.
- A garment, color, or section can be added without changing the page component.

## Voting model

- Each browser receives an anonymous voter ID; every heart click immediately updates its vote.
- Ballots are stored in the platform database, not only in the browser.
- Visitors can save as many favorites as they want, and the catalog order is randomized on every visit.
- A group can be attached through the URL, for example `?group=famille` or `?group=boutique-montreal`.
- `/admin` provides an email-and-password-protected dashboard with the overall ranking, group-by-group comparisons, and a CSV export.
- Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` in the hosting environment for the deployed Vercel endpoint. Existing deployments can continue using `RESULTS_KEY` as a fallback.

Voting stays anonymous: visitors do not need an account or email. Every saved favorite is counted, including ballots with only one vote and no price response. Customer registration and ordering are not enabled yet.

## Refresh apparel

Run this after changing or adding Batch 3 mockups:

```bash
python3 scripts/sync_catalog.py
```

Then build the site:

```bash
pnpm build
```

See `content/README.md` for the color, garment, and section workflow.

## Price survey

As soon as a favorite is saved, visitors may answer a price question in CAD for that product type. Choices differ by type; “Autre montant”, “Je ne sais pas” and “Plus tard” remain available. Each visitor answers once per type (including accessories), can edit the answer later, and is not asked again for another color or drawing of an answered type. The question mentions a contribution from profits to the Fondation CHU Sainte-Justine, without specifying a percentage or implying a formal partnership. The same commitment appears at the top of the main landing page and in the brand story, in all three languages.

The Vercel endpoint stores `priceSurvey` with the existing ballot, adding the nullable `price_survey` JSONB column to PostgreSQL automatically. Redis and the standalone endpoint store the same version-2 `byGarment` object. Historical single answers are still counted and preserved when adding another type. Subsequent favorite changes preserve responses; removing all favorites removes the entire ballot. `/admin` displays amounts, undecided and deferred responses by garment and group, plus unique respondent counts and a separate CSV export. Existing votes need no data backfill.

The shared header includes **Connexion** on desktop and in the mobile menu. On the deployed main site it opens `/admin`, using `ADMIN_EMAIL` and the existing `ADMIN_PASSWORD` (or `RESULTS_KEY`) with an eight-hour HttpOnly session. Email matching ignores surrounding spaces and case; errors do not reveal which credential failed. Passwords and the administrator email are never included in the public bundle. Both settings are required. Sessions issued before the email login update are invalidated.

Login attempts are limited in the shared database (or Redis): five attempts per email and twenty per source IP over fifteen minutes, with counters cleared after a successful sign-in. PostgreSQL automatically creates `gaminet_login_attempts`; keys are hashed. The legacy standalone Next endpoint retains its separate `RESULTS_KEY` configuration and is not the production admin route.
