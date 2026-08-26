# Gaminet Gamin — Collection vote

Public catalog and voting site for the 107 current apparel mockups.

## What is data-driven

- `content/catalog.json` contains the sections, garments, colors, titles, images, and campaign rules.
- `scripts/sync_catalog.py` rebuilds that catalog and the optimized web images from the three Batch 3 manifests.
- The public page creates filters, counts, priced shop cards, and voting hearts directly from the catalog.
- A garment, color, or section can be added without changing the page component.

## Voting model

- Each browser receives an anonymous voter ID; every heart click immediately updates its vote.
- Ballots are stored in the platform database, not only in the browser.
- Visitors can save as many favorites as they want, and the catalog order is randomized on every visit.
- A group can be attached through the URL, for example `?group=famille` or `?group=boutique-montreal`.
- `/admin` provides a password-protected dashboard with the overall ranking, group-by-group comparisons, and a CSV export.
- Set `ADMIN_PASSWORD` in the hosting environment. Existing deployments can continue using `RESULTS_KEY` as a fallback.

No email address is requested or stored.

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
