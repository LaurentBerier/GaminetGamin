"""Merge saved collection additions without renaming existing vote IDs."""
import json
from pathlib import Path


def merge_extension(catalog: dict, extension: dict) -> dict:
    if extension.get("mode") == "item-variants":
        incoming = extension["items"]
        incoming_ids = {item["id"] for item in incoming}
        if len(incoming_ids) != len(incoming):
            raise ValueError("Variant extension contains duplicate vote IDs")
        catalog["items"] = [item for item in catalog["items"]
                            if item["id"] not in incoming_ids] + incoming
        for field in ("themes", "specialCollections"):
            records = extension.get(field, [])
            ids = {record["id"] for record in records}
            catalog[field] = [record for record in catalog.get(field, [])
                              if record["id"] not in ids] + records
        return catalog
    collection_id = extension["collectionId"]
    incoming_ids = {item["id"] for item in extension["items"]}
    retained = [item for item in catalog["items"]
                if item.get("specialCollectionId") != collection_id]
    if incoming_ids.intersection(item["id"] for item in retained):
        raise ValueError("Collection extension collides with an existing vote ID")
    catalog["items"] = retained + extension["items"]
    for field in ("sections", "specialCollections"):
        new_records = extension.get(field, [])
        new_ids = {record["id"] for record in new_records}
        catalog[field] = [record for record in catalog.get(field, [])
                          if record["id"] not in new_ids] + new_records
    catalog["sections"].sort(key=lambda section: section["order"])
    return catalog


def apply_extensions(catalog: dict, directory: Path) -> dict:
    for path in sorted(directory.glob("*.json")):
        catalog = merge_extension(catalog, json.loads(path.read_text()))
    ids = [item["id"] for item in catalog["items"]]
    if len(ids) != len(set(ids)):
        raise ValueError("Catalog item IDs are not unique")
    return catalog
