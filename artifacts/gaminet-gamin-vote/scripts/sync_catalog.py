#!/usr/bin/env python3
"""Build the web catalog and optimized images from the apparel manifests.

The apparel manifests remain the source of truth. Re-running this script after
adding a row or changing a mockup is enough to refresh the voting site.
"""

from __future__ import annotations

import csv
import hashlib
import json
import os
import re
import unicodedata
from pathlib import Path

from PIL import Image, ImageChops, ImageEnhance, ImageFilter


SITE_ROOT = Path(__file__).resolve().parents[1]


def find_source_root() -> Path:
    configured = os.environ.get("GAMINET_BATCH3_ROOT")
    if configured:
        return Path(configured).expanduser().resolve()
    for parent in SITE_ROOT.parents:
        candidate = parent / "Designs" / "Batch3_output"
        if candidate.exists():
            return candidate
    raise RuntimeError(
        "Batch 3 source folder not found. Set GAMINET_BATCH3_ROOT to its path."
    )


SOURCE_ROOT = find_source_root()
CATALOG_PATH = SITE_ROOT / "content" / "catalog.json"
ASSET_ROOTS = [
    SITE_ROOT / "public" / "catalog",
    SITE_ROOT.parent / "gaminet-gamin" / "public" / "catalog",
]

SECTION_DEFINITIONS = [
    {
        "id": "classics",
        "order": 10,
        "label": {"fr": "Les classiques", "en": "The classics"},
        "description": {
            "fr": "Les chandails, crewnecks, hoodies et manches longues sur des couleurs faciles à porter.",
            "en": "T-shirts, crewnecks, hoodies and long sleeves in easy-to-wear colors.",
        },
    },
    {
        "id": "vivid",
        "order": 20,
        "label": {"fr": "Couleurs vives", "en": "Vivid colors"},
        "description": {
            "fr": "Les mêmes dessins sur des bases franches, joyeuses et très visibles.",
            "en": "The same drawings on bold, joyful and highly visible bases.",
        },
    },
    {
        "id": "caps",
        "order": 30,
        "label": {"fr": "Casquettes", "en": "Caps"},
        "description": {
            "fr": "Des illustrations simples et centrées, pensées pour le panneau avant.",
            "en": "Simple centered illustrations designed for the front panel.",
        },
    },
    {
        "id": "bucket-hats",
        "order": 40,
        "label": {"fr": "Chapeaux", "en": "Bucket hats"},
        "description": {
            "fr": "Les options chapeau pour les dessins aux silhouettes les plus fortes.",
            "en": "Bucket-hat options for the strongest illustration silhouettes.",
        },
    },
]

GARMENTS = {
    "hoodie-black": ("hoodie", {"fr": "Hoodie", "en": "Hoodie"}),
    "crewneck-grey": ("crewneck", {"fr": "Crewneck", "en": "Crewneck"}),
    "tshirt-navy": ("tshirt", {"fr": "T-shirt", "en": "T-shirt"}),
    "longsleeve-green": (
        "longsleeve",
        {"fr": "Chandail manches longues", "en": "Long-sleeve shirt"},
    ),
    "hoodie": ("hoodie", {"fr": "Hoodie", "en": "Hoodie"}),
    "crewneck sweatshirt": (
        "crewneck",
        {"fr": "Crewneck", "en": "Crewneck sweatshirt"},
    ),
    "T-shirt": ("tshirt", {"fr": "T-shirt", "en": "T-shirt"}),
    "long-sleeve shirt": (
        "longsleeve",
        {"fr": "Chandail manches longues", "en": "Long-sleeve shirt"},
    ),
    "casquette": ("cap", {"fr": "Casquette", "en": "Cap"}),
    "bucket hat": ("bucket-hat", {"fr": "Chapeau", "en": "Bucket hat"}),
}

# The original shop's garment price ladder lives here so future price changes
# can be applied to every matching catalog card in one sync.
PRICES = {
    "tshirt": 44.99,
    "longsleeve": 49.99,
    "crewneck": 64.99,
    "hoodie": 74.99,
    "cap": 34.99,
    "bucket-hat": 39.99,
}

COLORS = {
    "black": ("#20201f", {"fr": "Noir", "en": "Black"}),
    "grey": ("#b7b7b4", {"fr": "Gris chiné", "en": "Heather grey"}),
    "navy": ("#243750", {"fr": "Bleu marine", "en": "Navy"}),
    "green": ("#455646", {"fr": "Vert forêt", "en": "Forest green"}),
    "coral-red": ("#f05555", {"fr": "Rouge corail", "en": "Coral red"}),
    "cobalt-blue": ("#1d45c7", {"fr": "Bleu cobalt", "en": "Cobalt blue"}),
    "bright-teal": ("#11aaa1", {"fr": "Turquoise vif", "en": "Bright teal"}),
    "electric-violet": ("#7740d6", {"fr": "Violet électrique", "en": "Electric violet"}),
    "electric-purple": ("#7034ba", {"fr": "Pourpre électrique", "en": "Electric purple"}),
    "tangerine-orange": ("#fa7218", {"fr": "Orange tangerine", "en": "Tangerine orange"}),
    "sunflower-yellow": ("#ffc928", {"fr": "Jaune tournesol", "en": "Sunflower yellow"}),
    "hot-pink": ("#fb2f83", {"fr": "Rose éclatant", "en": "Hot pink"}),
    "berry-purple": ("#963a8d", {"fr": "Violet baie", "en": "Berry purple"}),
}

TITLE_OVERRIDES = {
    "IMG_6173": "Le Chalet",
    "IMG_6218": "Chaise Haricot",
}

ALL_SECTION_ORDER = {
    "vivid": 0,
    "classics": 1,
    "caps": 2,
    "bucket-hats": 3,
}

# These illustration-led garments intentionally use more of the printable
# chest area than the rest of the catalog. Keeping the overrides here makes
# the storefront assets reproducible whenever the catalog is synchronized.
LARGE_PRINT_OVERRIDES = {
    ("standard", "IMG_6166"): {
        "template": SOURCE_ROOT / "_templates" / "crewneck-grey.png",
        "maximum": (520, 550),
        "center": (627, 520),
        "saturation": 0.82,
        "opacity": 0.965,
        "blur": 18,
        "texture_floor": 222,
        "texture_base": 246,
        "contrast": 1.015,
    },
    ("standard", "IMG_6173"): {
        "template": SOURCE_ROOT / "_templates" / "hoodie-black.png",
        "maximum": (495, 470),
        "center": (627, 505),
        "saturation": 0.82,
        "opacity": 0.965,
        "blur": 18,
        "texture_floor": 222,
        "texture_base": 246,
        "contrast": 1.015,
    },
    ("primary", "IMG_6166"): {
        "template": SOURCE_ROOT / "apparel_expansion" / "_templates" / "hoodie-electric-purple.png",
        "maximum": (405, 500),
        "center": (627, 500),
        "saturation": 0.84,
        "opacity": 0.955,
        "blur": 14,
        "texture_floor": 210,
        "texture_base": 245,
        "contrast": 1.0,
    },
}


def slug(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value)
    ascii_value = normalized.encode("ascii", "ignore").decode("ascii")
    return re.sub(r"[^a-z0-9]+", "-", ascii_value.lower()).strip("-")


def normalized_color(value: str) -> str:
    return slug(value)


def color_payload(color_id: str) -> dict:
    if color_id not in COLORS:
        raise KeyError(f"Unknown catalog color: {color_id}")
    hex_value, label = COLORS[color_id]
    return {"id": color_id, "hex": hex_value, "label": label}


def checksum(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()[:16]


def optimize_rendered_image(image: Image.Image, destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    image = image.convert("RGB")
    image.thumbnail((900, 900), Image.Resampling.LANCZOS)
    image.save(destination, "WEBP", quality=82, method=6)


def optimize_image(source: Path, destination: Path) -> None:
    optimize_rendered_image(Image.open(source), destination)


def trim_alpha(image: Image.Image) -> Image.Image:
    image = image.convert("RGBA")
    bounds = image.getchannel("A").getbbox()
    if not bounds:
        raise ValueError("Illustration has an empty alpha channel")
    return image.crop(bounds)


def fit(image: Image.Image, maximum: tuple[int, int]) -> Image.Image:
    image = image.copy()
    image.thumbnail(maximum, Image.Resampling.LANCZOS)
    return image


def render_large_print(design_id: str, override: dict) -> Image.Image:
    garment = Image.open(override["template"]).convert("RGBA")
    art = fit(
        trim_alpha(Image.open(SOURCE_ROOT / "colored" / f"{design_id}-colored.png")),
        override["maximum"],
    )
    center_x, center_y = override["center"]
    xy = (round(center_x - art.width / 2), round(center_y - art.height / 2))

    original_alpha = art.getchannel("A")
    printed_rgb = ImageEnhance.Color(art.convert("RGB")).enhance(override["saturation"])
    printed_rgb = ImageEnhance.Contrast(printed_rgb).enhance(0.97)
    x, y = xy
    fabric = garment.crop((x, y, x + art.width, y + art.height)).convert("RGB")
    gray = fabric.convert("L")
    broad = gray.filter(ImageFilter.GaussianBlur(override["blur"]))
    detail = ImageChops.subtract(gray, broad, scale=1.0, offset=128)
    texture = detail.point(
        lambda value: max(
            override["texture_floor"],
            min(255, round(override["texture_base"] + (value - 128) * 0.22)),
        )
    )
    texture_rgb = Image.merge("RGB", (texture, texture, texture))
    printed_rgb = ImageChops.multiply(printed_rgb, texture_rgb)
    printed_rgb = ImageEnhance.Contrast(printed_rgb).enhance(override["contrast"])
    printed_rgb.putalpha(original_alpha.point(lambda value: round(value * override["opacity"])))
    garment.alpha_composite(printed_rgb, xy)
    return garment


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open(newline="", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


def make_item(
    *,
    item_id: str,
    design_id: str,
    title: str,
    section_id: str,
    garment_key: str,
    color_id: str,
    source_image: Path,
    source_collection: str,
) -> dict:
    title = TITLE_OVERRIDES.get(design_id, title)
    garment_id, garment_label = GARMENTS[garment_key]
    web_name = f"{slug(item_id)}.webp"
    override = LARGE_PRINT_OVERRIDES.get((source_collection, design_id))
    for asset_root in ASSET_ROOTS:
        destination = asset_root / web_name
        if override:
            optimize_rendered_image(render_large_print(design_id, override), destination)
        else:
            optimize_image(source_image, destination)
    item = {
        "id": slug(item_id),
        "designId": design_id,
        "title": title,
        "sectionId": section_id,
        "garment": {
            "id": garment_id,
            "label": garment_label,
            "price": PRICES[garment_id],
        },
        "color": color_payload(color_id),
        "image": f"/catalog/{web_name}",
        "active": True,
        "source": {
            "collection": source_collection,
            "file": source_image.name,
            "checksum": checksum(source_image),
        },
    }
    if override:
        item["render"] = {
            "variant": "large-print",
            "printBoxPx": f"{override['maximum'][0]}x{override['maximum'][1]}",
        }
    return item


items: list[dict] = []

for row in read_csv(SOURCE_ROOT / "manifest.csv"):
    garment = row["garment"]
    color_id = garment.rsplit("-", 1)[-1]
    items.append(
        make_item(
            item_id=f"classic-{row['stem']}-{garment}",
            design_id=row["stem"],
            title=row["piece_name"],
            section_id="classics",
            garment_key=garment,
            color_id=color_id,
            source_image=SOURCE_ROOT / "mockups" / row["garment_mockup"],
            source_collection="standard",
        )
    )

expansion_sources = [
    (
        SOURCE_ROOT / "apparel_expansion" / "manifest.csv",
        SOURCE_ROOT / "apparel_expansion",
        "primary",
    ),
    (
        SOURCE_ROOT / "apparel_expansion" / "alternate_set" / "manifest.csv",
        SOURCE_ROOT / "apparel_expansion" / "alternate_set",
        "alternate",
    ),
]

for manifest_path, collection_root, source_collection in expansion_sources:
    for row in read_csv(manifest_path):
        category = row["category"]
        is_headwear = "headwear" in category
        product = row["product"]
        if product == "tuque":
            continue
        color_id = normalized_color(row["color"])
        if is_headwear:
            section_id = {
                "casquette": "caps",
                "bucket hat": "bucket-hats",
            }[product]
            asset_folder = "headwear"
        else:
            section_id = "vivid"
            asset_folder = "vivid_shirts"
        items.append(
            make_item(
                item_id=(
                    f"{source_collection}-{section_id}-{row['stem']}-"
                    f"{product}-{color_id}"
                ),
                design_id=row["stem"],
                title=row["piece_name"],
                section_id=section_id,
                garment_key=product,
                color_id=color_id,
                source_image=collection_root / asset_folder / row["mockup"],
                source_collection=source_collection,
            )
        )

items.sort(key=lambda item: ALL_SECTION_ORDER[item["sectionId"]])

if len(items) != 107:
    raise RuntimeError(f"Expected 107 apparel variants, found {len(items)}")
if len({item['id'] for item in items}) != len(items):
    raise RuntimeError("Catalog item IDs are not unique")

catalog = {
    "schemaVersion": 2,
    "campaign": {
        "id": "collection-2026",
        "title": {
            "fr": "Vote de la prochaine collection",
            "en": "Next collection vote",
        },
        "minSelections": 0,
    },
    "sections": SECTION_DEFINITIONS,
    "items": items,
}

CATALOG_PATH.parent.mkdir(parents=True, exist_ok=True)
CATALOG_PATH.write_text(
    json.dumps(catalog, ensure_ascii=False, indent=2) + "\n",
    encoding="utf-8",
)
print(f"Wrote {CATALOG_PATH}")
print(
    f"Optimized {len(items)} apparel images into "
    + ", ".join(str(path) for path in ASSET_ROOTS)
)
