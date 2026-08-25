# Collection content workflow

The voting site is driven by `catalog.json`. Every apparel option is one record with a stable ID, a section, garment type, color, image, and source reference.

## Refresh the current collection

After adding or rebuilding mockups in `Designs/Batch3_output`, run:

```bash
python3 scripts/sync_catalog.py
```

The script discovers `Designs/Batch3_output` in a parent workspace. In another
checkout, set `GAMINET_BATCH3_ROOT` to that folder before running the command.

This reads the three apparel manifests, optimizes every active mockup for the web, and rebuilds `content/catalog.json`. The site does not need component changes when a garment, color, or section gains another record.

Prices are centralized in `scripts/sync_catalog.py` under `PRICES`. Change a
garment price there and run the same sync to refresh every matching card.

## Add a new color or apparel option

1. Add the mockup and its row to the appropriate Batch 3 manifest.
2. If the color is new, add its name and hex value to `COLORS` in `scripts/sync_catalog.py`.
3. Run the sync command.

## Add a new section

Add the section definition to `SECTION_DEFINITIONS`, map the incoming product to that section in the sync script, then run the sync command. Section navigation and voting totals are created from the catalog automatically.

Do not rename existing item IDs after voting begins: ballot history uses those stable IDs.
