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
import sys
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
ARTWORK_OVERRIDE_ROOT = SITE_ROOT / "content" / "artwork-overrides"
ASSET_ROOTS = [
    SITE_ROOT / "public" / "catalog",
    SITE_ROOT.parent / "gaminet-gamin" / "public" / "catalog",
]

# The source renderer owns the perspective and fabric treatment for headwear.
# Importing it here lets the web sync rebuild every hat from the transparent
# master while enforcing one vertical center for each product shape.
sys.path.insert(0, str(SOURCE_ROOT / "apparel_expansion"))
from apparel_surface import render_headwear  # noqa: E402

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

THEME_DEFINITIONS = [
    {
        "id": "royaume-des-pepins",
        "label": {"fr": "Le Royaume des Pépins", "en": "The Kingdom of Seeds"},
        "description": {
            "fr": "Les héros, alliés et microbes du jeu Le Royaume des Pépins.",
            "en": "Heroes, allies, and microbes from The Kingdom of Seeds game.",
        },
    },
    {
        "id": "animaux-rigolos",
        "label": {"fr": "Animaux rigolos", "en": "Funny animals"},
        "description": {
            "fr": "Grenouilles, chats, crabes et autres bêtes pleines de caractère.",
            "en": "Frogs, cats, crabs, and other creatures full of personality.",
        },
    },
    {
        "id": "gourmandises",
        "label": {"fr": "Gourmandises", "en": "Food fun"},
        "description": {
            "fr": "Des aliments, collations et légumes qui ont pris vie.",
            "en": "Food, snacks, and vegetables that came to life.",
        },
    },
    {
        "id": "musique-et-cosmos",
        "label": {"fr": "Musique et cosmos", "en": "Music and cosmos"},
        "description": {
            "fr": "Des étoiles, des instruments et beaucoup de rythme.",
            "en": "Stars, instruments, and plenty of rhythm.",
        },
    },
    {
        "id": "aventures-et-copains",
        "label": {"fr": "Aventures et copains", "en": "Adventures and friends"},
        "description": {
            "fr": "Des voyages, des lieux étonnants et des duos inséparables.",
            "en": "Journeys, surprising places, and inseparable duos.",
        },
    },
    {
        "id": "monstres-et-merveilles",
        "label": {"fr": "Monstres et merveilles", "en": "Monsters and wonders"},
        "description": {
            "fr": "Les créatures les plus étranges et merveilleuses de la collection.",
            "en": "The collection's strangest and most wonderful creatures.",
        },
    },
]

SPECIAL_COLLECTION_DEFINITIONS = [
    {
        "id": "royaume-des-pepins",
        "label": {"fr": "Le Royaume des Pépins", "en": "The Kingdom of Seeds"},
        "kind": {"fr": "Produit associé · Jeu", "en": "Associated product · Game"},
        "description": {
            "fr": "Une collection spéciale inspirée du jeu Le Royaume des Pépins.",
            "en": "A special collection inspired by The Kingdom of Seeds game.",
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
    "IMG_6553": "Le Microboss",
    "IMG_6218": "Chaise Haricot",
    "V2_20260805_140256": "Le Microbe Ébahi",
    "V2_20260805_140312": "Le Vilain Hérissé",
    "V2_20260805_140334": "Monsieur Citron",
    "V2_20260805_140342": "Wallie",
}

ARTWORK_OVERRIDES = {
    "V2_20260805_140334": (
        ARTWORK_OVERRIDE_ROOT / "V2_20260805_140334-colored-yellow.png"
    ),
}

THEME_DESIGN_IDS = {
    "royaume-des-pepins": {
        "IMG_6553",
        "V2_20260805_140256",
        "V2_20260805_140312",
        "V2_20260805_140334",
        "V2_20260805_140342",
    },
    "animaux-rigolos": {
        "IMG_6164",
        "IMG_6170",
        "IMG_6211",
        "IMG_6235",
        "IMG_6285",
        "IMG_6299",
        "IMG_6443",
        "IMG_6444",
        "IMG_6554",
        "IMG_6555",
        "IMG_6556",
        "IMG_6739",
        "V2_20260823_142751",
        "V2_20260823_142759",
    },
    "gourmandises": {
        "BreuvageGentilGlace",
        "IMG_6218",
        "IMG_6301",
        "IMG_6328",
        "IMG_6504",
        "IMG_6782",
        "IMG_6799",
        "V2_20260805_140243",
        "V2_20260823_142146",
        "V2_20260823_142456",
        "V2_20260823_142638",
    },
    "musique-et-cosmos": {
        "IMG_6163",
        "V2_20260823_142513",
        "V2_20260823_142700",
        "V2_20260823_142733",
        "V2_20260823_142806",
        "V2_20260823_142814",
    },
    "aventures-et-copains": {
        "IMG_6169",
        "IMG_6173",
        "IMG_6212",
        "IMG_6336",
        "IMG_6357",
        "IMG_6550",
        "IMG_6740",
        "IMG_6750",
        "IMG_6751",
        "IMG_6772",
        "IMG_6773",
    },
}

SPECIAL_COLLECTION_BY_DESIGN = {
    design_id: "royaume-des-pepins"
    for design_id in THEME_DESIGN_IDS["royaume-des-pepins"]
}

COLLECTION_ROLE_BY_DESIGN = {
    "IMG_6553": {"fr": "Boss des microbes", "en": "Microbe boss"},
    "V2_20260805_140256": {"fr": "Microbe surpris", "en": "Surprised microbe"},
    "V2_20260805_140312": {"fr": "Microbe ennemi", "en": "Enemy microbe"},
    "V2_20260805_140334": {"fr": "Gentil allié citron", "en": "Friendly lemon ally"},
    "V2_20260805_140342": {"fr": "Personnage du jeu", "en": "Game character"},
}

ALL_SECTION_ORDER = {
    "vivid": 0,
    "classics": 1,
    "caps": 2,
    "bucket-hats": 3,
}

HEADWEAR_PRINT_MAXIMUMS = {
    ("bucket-hat", "IMG_6504"): (225, 190),
    ("bucket-hat", "IMG_6553"): (215, 195),
    ("bucket-hat", "IMG_6336"): (240, 170),
    ("bucket-hat", "V2_20260823_142456"): (225, 195),
    ("cap", "V2_20260805_140342"): (250, 175),
    ("cap", "V2_20260823_142146"): (250, 175),
    ("cap", "V2_20260805_140334"): (230, 185),
    ("cap", "IMG_6554"): (220, 190),
}

HEADWEAR_PRINT_CENTERS = {
    "bucket-hat": (627, 610),
    "cap": (575, 555),
}

# These garments need custom print placement. Keeping the dimensions here
# makes the storefront assets reproducible whenever the catalog is synchronized.
# The sizes deliberately leave a comfortable margin around the illustration so
# the print stays inside the usable chest area on both the card and the preview.
PRINT_OVERRIDES = {
    ("standard", "IMG_6166"): {
        "template": SOURCE_ROOT / "_templates" / "crewneck-grey.png",
        "maximum": (365, 385),
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
        "maximum": (250, 215),
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
        "maximum": (270, 300),
        "center": (627, 500),
        "saturation": 0.84,
        "opacity": 0.955,
        "blur": 14,
        "texture_floor": 210,
        "texture_base": 245,
        "contrast": 1.0,
    },
    ("standard", "V2_20260805_140334"): {
        "template": SOURCE_ROOT / "_templates" / "tshirt-navy.png",
        "maximum": (280, 305),
        "center": (627, 520),
        "saturation": 0.82,
        "opacity": 0.965,
        "blur": 18,
        "texture_floor": 222,
        "texture_base": 246,
        "contrast": 1.015,
    },
}


def slug(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value)
    ascii_value = normalized.encode("ascii", "ignore").decode("ascii")
    return re.sub(r"[^a-z0-9]+", "-", ascii_value.lower()).strip("-")


def normalized_color(value: str) -> str:
    return slug(value)


def artwork_path(design_id: str) -> Path:
    return ARTWORK_OVERRIDES.get(
        design_id,
        SOURCE_ROOT / "colored" / f"{design_id}-colored.png",
    )


def theme_id(design_id: str) -> str:
    for candidate, design_ids in THEME_DESIGN_IDS.items():
        if design_id in design_ids:
            return candidate
    return "monstres-et-merveilles"


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


def rendered_asset_version(design_id: str, override: dict) -> str:
    """Return a stable cache key for a composited mockup and its settings."""
    digest = hashlib.sha256()
    art_path = artwork_path(design_id)
    for path in (art_path, override["template"]):
        with path.open("rb") as handle:
            for chunk in iter(lambda: handle.read(1024 * 1024), b""):
                digest.update(chunk)
    settings = {
        key: value
        for key, value in override.items()
        if key != "template"
    }
    digest.update(
        json.dumps(settings, sort_keys=True, separators=(",", ":")).encode("utf-8")
    )
    return digest.hexdigest()[:10]


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


def render_custom_print(design_id: str, override: dict) -> Image.Image:
    garment = Image.open(override["template"]).convert("RGBA")
    art = fit(
        trim_alpha(Image.open(artwork_path(design_id))),
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


def render_centered_headwear(design_id: str, override: dict) -> Image.Image:
    product = Image.open(override["template"]).convert("RGBA")
    product, _, _ = render_headwear(
        product,
        Image.open(artwork_path(design_id)),
        {
            "template": override["template"].stem,
            "max": override["maximum"],
            "center": override["center"],
        },
    )
    return product


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
    headwear_template: Path | None = None,
) -> dict:
    title = TITLE_OVERRIDES.get(design_id, title)
    garment_id, garment_label = GARMENTS[garment_key]
    override = PRINT_OVERRIDES.get((source_collection, design_id))
    headwear_maximum = HEADWEAR_PRINT_MAXIMUMS.get((garment_id, design_id))
    if headwear_maximum:
        if not headwear_template:
            raise ValueError(f"Missing headwear template for {item_id}")
        override = {
            "renderer": "centered-headwear-v1",
            "template": headwear_template,
            "maximum": headwear_maximum,
            "center": HEADWEAR_PRINT_CENTERS[garment_id],
        }
    web_stem = slug(item_id)
    if override:
        web_stem = f"{web_stem}-r{rendered_asset_version(design_id, override)}"
    web_name = f"{web_stem}.webp"
    for asset_root in ASSET_ROOTS:
        destination = asset_root / web_name
        if override:
            rendered = (
                render_centered_headwear(design_id, override)
                if override.get("renderer") == "centered-headwear-v1"
                else render_custom_print(design_id, override)
            )
            optimize_rendered_image(rendered, destination)
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
        "themeId": theme_id(design_id),
        "specialCollectionId": SPECIAL_COLLECTION_BY_DESIGN.get(design_id),
        "collectionRole": COLLECTION_ROLE_BY_DESIGN.get(design_id),
        "image": f"/catalog/{web_name}",
        "active": True,
        "source": {
            "collection": source_collection,
            "file": source_image.name,
            "checksum": checksum(source_image),
            "artworkChecksum": checksum(artwork_path(design_id)),
        },
    }
    if override:
        item["render"] = {
            "variant": (
                "centered-headwear"
                if override.get("renderer") == "centered-headwear-v1"
                else "custom-print"
            ),
            "printBoxPx": f"{override['maximum'][0]}x{override['maximum'][1]}",
            "centerPx": f"{override['center'][0]}x{override['center'][1]}",
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
                headwear_template=(
                    SOURCE_ROOT / "apparel_expansion" / "_templates" / row["template"]
                    if is_headwear
                    else None
                ),
            )
        )

items.sort(key=lambda item: ALL_SECTION_ORDER[item["sectionId"]])

if len(items) != 107:
    raise RuntimeError(f"Expected 107 apparel variants, found {len(items)}")
if len({item['id'] for item in items}) != len(items):
    raise RuntimeError("Catalog item IDs are not unique")

catalog = {
    "schemaVersion": 3,
    "campaign": {
        "id": "collection-2026",
        "title": {
            "fr": "Vote de la prochaine collection",
            "en": "Next collection vote",
        },
        "minSelections": 0,
    },
    "sections": SECTION_DEFINITIONS,
    "themes": THEME_DEFINITIONS,
    "specialCollections": SPECIAL_COLLECTION_DEFINITIONS,
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
