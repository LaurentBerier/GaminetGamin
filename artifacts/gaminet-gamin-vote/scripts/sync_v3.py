#!/usr/bin/env python3
"""Export reviewed V3 assets for the web and merge them into the existing catalog.

This only resizes/encodes finished ImageGen outputs; artwork and product mockups
are authored and reviewed separately. Originals and transparent masters are kept.
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import json
import re
from pathlib import Path

from PIL import Image
from collection_extensions import merge_extension

SITE = Path(__file__).resolve().parents[1]
CONFIG = json.loads((SITE / "content/v3-designs.json").read_text())
COLLECTION_ID = CONFIG["collectionId"]
PRODUCTS = {
    "tshirt": ("tshirt", "T-shirt", "T-shirt", 44.99),
    "hoodie": ("hoodie", "Hoodie", "Hoodie", 74.99),
    "crewneck": ("crewneck", "Crewneck", "Crewneck", 64.99),
    "longsleeve": ("longsleeve", "Chandail manches longues", "Long-sleeve shirt", 49.99),
    "casquette": ("cap", "Casquette", "Cap", 34.99),
    "bucket-hat": ("bucket-hat", "Chapeau", "Bucket hat", 39.99),
    "tote": ("tote", "Sac en toile", "Tote bag", 29.99),
    "mug": ("mug", "Tasse", "Mug", 24.99),
}
COLORS = {
    "black": ("#20201f", "Noir", "Black"),
    "grey": ("#b7b7b4", "Gris chiné", "Heather grey"),
    "navy": ("#243750", "Bleu marine", "Navy"),
    "green": ("#455646", "Vert forêt", "Forest green"),
    "hot-pink": ("#fb2f83", "Rose éclatant", "Hot pink"),
    "electric-violet": ("#7740d6", "Violet électrique", "Electric violet"),
    "bright-teal": ("#11aaa1", "Turquoise vif", "Bright teal"),
    "berry-purple": ("#963a8d", "Violet baie", "Berry purple"),
    "cobalt-blue": ("#1d45c7", "Bleu cobalt", "Cobalt blue"),
    "sunflower": ("#ffc928", "Jaune tournesol", "Sunflower yellow"),
    "natural": ("#eee5d4", "Naturel", "Natural"),
    "white": ("#ffffff", "Blanc", "White"),
}


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()[:16]


def slug(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")


def export_web(source: Path, destination: Path, limit: int, transparent=False):
    destination.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(source) as image:
        image = image.convert("RGBA" if transparent else "RGB")
        image.thumbnail((limit, limit), Image.Resampling.LANCZOS)
        image.save(destination, "WEBP", quality=88, method=6)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-root", type=Path)
    args = parser.parse_args()
    source = args.source_root
    if not source:
        source = next((parent / "Designs" / CONFIG["sourceFolder"]
                       for parent in SITE.parents
                       if (parent / "Designs" / CONFIG["sourceFolder"]).is_dir()), None)
    if not source:
        parser.error("Pass --source-root with the reviewed Batch4_V3_output folder")

    # Validate the whole collection before writing any catalog records.
    for design in CONFIG["designs"]:
        art = source / "colored" / f"{design['stem']}-v3.png"
        with Image.open(art) as image:
            if image.mode != "RGBA" or image.getchannel("A").getextrema() != (0, 255):
                raise ValueError(f"Expected genuine transparent artwork: {art}")
        for product in design["products"]:
            path = source / "mockups" / f"{design['stem']}-{product}-v3.png"
            if not path.is_file():
                raise FileNotFoundError(path)

    public_roots = [SITE / "public"]
    shop = SITE.parent / "gaminet-gamin" / "public"
    if shop.exists():
        public_roots.append(shop)
    items, manifest = [], []
    for design in CONFIG["designs"]:
        stem = design["stem"]
        art = source / "colored" / f"{stem}-v3.png"
        art_name = f"v3-{slug(stem)}-{digest(art)[:10]}.webp"
        for public in public_roots:
            export_web(art, public / "designs" / art_name, 1400, True)
        for product in design["products"]:
            kind = next(key for key in sorted(PRODUCTS, key=len, reverse=True)
                        if product.startswith(key + "-"))
            color = product[len(kind) + 1:]
            garment_id, fr, en, price = PRODUCTS[kind]
            color_hex, color_fr, color_en = COLORS[color]
            mockup = source / "mockups" / f"{stem}-{product}-v3.png"
            item_id = f"v3-{slug(stem)}-{product}"
            web_name = f"{item_id}-{digest(mockup)[:10]}.webp"
            for public in public_roots:
                export_web(mockup, public / "catalog" / web_name, 1100)
            items.append({
                "id": item_id, "designId": f"V3_{stem}", "title": design["title"],
                "sectionId": "nouveautes-v3",
                "garment": {"id": garment_id, "label": {"fr": fr, "en": en}, "price": price},
                "color": {"id": "sunflower-yellow" if color == "sunflower" else color,
                          "hex": color_hex, "label": {"fr": color_fr, "en": color_en}},
                "themeId": design["theme"], "specialCollectionId": COLLECTION_ID,
                "collectionRole": None, "image": f"/catalog/{web_name}",
                "artworkImage": f"/designs/{art_name}", "active": True,
                "source": {"collection": "v3", "file": mockup.name,
                           "checksum": digest(mockup), "artworkChecksum": digest(art)},
            })
            manifest.append({"id": item_id, "stem": stem, "piece_name": design["title"],
                             "artwork": art.name, "product": product,
                             "mockup": mockup.name, "price_cad_proposal": price})
    extension = {
        "collectionId": COLLECTION_ID,
        "sections": [{"id": COLLECTION_ID, "order": 5,
                      "label": {"fr": "Nouveautés V3", "en": "New in V3"},
                      "description": {"fr": "20 nouveaux dessins, déclinés en chandails, casquettes, chapeau, sacs en toile et tasse.",
                                      "en": "20 new drawings on shirts, caps, a bucket hat, tote bags, and a mug."}}],
        "specialCollections": [{"id": COLLECTION_ID,
                                "label": {"fr": "Nouveautés V3", "en": "New in V3"},
                                "kind": {"fr": "Nouvelle collection", "en": "New collection"},
                                "description": {"fr": "Les derniers dessins des p’tits monstres, en couleurs et tout en caractère.",
                                                "en": "The latest little-monster drawings, full of color and personality."}}],
        "items": items,
    }
    path = SITE / "content/collections/v3.json"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(extension, ensure_ascii=False, indent=2) + "\n")
    catalog_path = SITE / "content/catalog.json"
    catalog = merge_extension(json.loads(catalog_path.read_text()), extension)
    catalog_path.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + "\n")
    with (source / "manifest.csv").open("w", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=manifest[0].keys())
        writer.writeheader()
        writer.writerows(manifest)
    print(f"Published {len(items)} V3 proposals from {len(CONFIG['designs'])} drawings; catalog has {len(catalog['items'])} items.")


if __name__ == "__main__":
    main()
