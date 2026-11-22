#!/usr/bin/env python3
"""Publish reviewed template composites as colour variants, preserving vote IDs."""
import argparse
import copy
import hashlib
import json
import shutil
from collections import defaultdict
from pathlib import Path

from PIL import Image
from collection_extensions import merge_extension

SITE = Path(__file__).resolve().parents[1]


def read(path):
    return json.loads(path.read_text())


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-root", type=Path, required=True)
    parser.add_argument("--voting-site", type=Path, required=True)
    args = parser.parse_args()
    source = args.source_root
    host = args.voting_site
    plan = read(source / "asset-plan.json")
    jobs = {job["id"]: job for job in plan["jobs"]}
    reviewed = []
    for chunk in ("a", "b", "c", "accessories"):
        reviewed.extend(read(source / ("jobs-" + chunk + "-results.json"))["jobs"])
    if len(reviewed) != 97 or {job["id"] for job in reviewed} != set(jobs):
        raise ValueError("Expected all 97 reviewed second-colour variants")
    for result in reviewed:
        if result.get("reviewStatus") != "passed":
            raise ValueError("Unreviewed product: " + result["id"])
        if sha(Path(result["output"])) != result["outputSha256"]:
            raise ValueError("Product changed since review: " + result["id"])
        if sha(Path(result["approvedMaster"])) != result["masterSha256"]:
            raise ValueError("Approved drawing changed: " + result["designId"])

    main_catalog = read(SITE / "content/catalog.json")
    host_catalog = read(host / "content/catalog.json")
    main_by_id = {item["id"]: item for item in main_catalog["items"]}
    host_by_id = {item["id"]: item for item in host_catalog["items"]}
    public_roots = [SITE / "public", SITE.parent / "gaminet-gamin/public", host / "public"]
    variants_main, variants_host = [], []
    for result in reviewed:
        item = copy.deepcopy(jobs[result["id"]]["sourceItem"])
        item.update(id=result["id"], color=result["color"])
        image_name = result["id"] + "-" + result["outputSha256"][:10] + ".webp"
        image_path = source / "web" / image_name
        image_path.parent.mkdir(exist_ok=True)
        with Image.open(result["output"]) as image:
            image = image.convert("RGB")
            image.thumbnail((1100, 1100), Image.Resampling.LANCZOS)
            image.save(image_path, "WEBP", quality=88, method=6)
        item["image"] = "/catalog/" + image_name
        item["source"] = {
            "collection": "color-choices",
            "file": Path(result["output"]).name,
            "checksum": result["outputSha256"][:16],
            "artworkChecksum": result["masterSha256"][:16],
            "parentItemId": result["parentItemId"],
            "method": "approved-art-template-composite",
        }
        if not item.get("themeId"):
            sibling = next((record for record in main_catalog["items"] if record["designId"] == item["designId"]), None)
            if sibling:
                for field in ("themeId", "specialCollectionId", "collectionRole"):
                    item[field] = sibling.get(field)
        for public in public_roots:
            if result["audience"] != "both" and public != host / "public":
                continue
            target = public / "catalog" / image_name
            target.parent.mkdir(exist_ok=True)
            shutil.copy2(image_path, target)
        if result["audience"] == "both":
            variants_main.append(item)
        variants_host.append(item)

    # Reuse already approved cap/hat colours and current descriptive metadata.
    # Existing vote IDs remain stable; each website retains its own campaign.
    host_updates = []
    for item_id, current in main_by_id.items():
        if item_id.startswith("colorchoices-"):
            continue
        if item_id not in host_by_id:
            host_updates.append(copy.deepcopy(current))
            image = current["image"].lstrip("/")
            shutil.copy2(SITE / "public" / image, host / "public" / image)
        else:
            record = copy.deepcopy(host_by_id[item_id])
            for field in ("title", "themeId", "specialCollectionId", "collectionRole"):
                if field in current:
                    record[field] = current[field]
            if item_id == "classic-v2-20260805-140334-tshirt-navy":
                record["image"] = current["image"]
                record["source"] = copy.deepcopy(current["source"])
                image = current["image"].lstrip("/")
                shutil.copy2(SITE / "public" / image, host / "public" / image)
            host_updates.append(record)

    repairs_path = source / "existing-color-repairs.json"
    if repairs_path.exists():
        for repair in read(repairs_path)["items"]:
            if repair["reviewStatus"] != "passed":
                raise ValueError("Unreviewed existing-colour repair")
            record = copy.deepcopy(host_by_id[repair["itemId"]])
            original = Path(repair["output"])
            image_name = repair["itemId"] + "-" + sha(original)[:10] + ".webp"
            with Image.open(original) as image:
                image = image.convert("RGB")
                image.thumbnail((1100, 1100), Image.Resampling.LANCZOS)
                image.save(host / "public/catalog" / image_name, "WEBP", quality=88, method=6)
            record["image"] = "/catalog/" + image_name
            record["source"] = {**record["source"], "checksum": sha(original)[:16], "artworkChecksum": repair["masterSha256"][:16]}
            host_updates.append(record)

    for site, catalog, incoming in (
        (SITE, main_catalog, variants_main),
        (host, host_catalog, host_updates + variants_host),
    ):
        extension = {
            "mode": "item-variants",
            "items": incoming,
            "themes": main_catalog.get("themes", []),
            "specialCollections": main_catalog.get("specialCollections", []),
        }
        catalog = merge_extension(catalog, extension)
        grouped = defaultdict(set)
        for item in catalog["items"]:
            if item["active"]:
                grouped[(item["designId"], item["garment"]["id"])].add(item["color"]["id"])
        assert all(len(colors) >= 2 for colors in grouped.values()), "Every product needs at least two colours"
        assert len({item["id"] for item in catalog["items"]}) == len(catalog["items"])
        (site / "content/collections/zz-color-choices.json").write_text(json.dumps(extension, ensure_ascii=False, indent=2) + "\n")
        (site / "content/catalog.json").write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + "\n")
        print(str(site) + ": " + str(len(catalog["items"])) + " variants, " + str(len(grouped)) + " product pages; all have 2+ colours")


if __name__ == "__main__":
    main()
