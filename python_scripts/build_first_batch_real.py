"""Build Card JSON for the REAL (jpg) cards of First Batch via Scryfall. No LLM.

Walks the color folders under 'public/Cube/First Batch', looks up every .jpg
file (filename = card name) on Scryfall, and writes real-cards.json. Custom
(.png) cards are listed in custom-todo.txt for separate vision extraction.
"""

import json
import os
import re
import sys
import time

import requests

BATCH_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "public", "Cube", "First Batch",
)
OUT_DIR = os.path.join(BATCH_DIR, "json")
SCRYFALL = "https://api.scryfall.com/cards/named"
HEADERS = {"User-Agent": "custom-cube-website/1.0", "Accept": "application/json"}

# Card-pool color folders (Boosters = duplicate packs, Tokens = separate schema).
COLOR_DIRS = ["Black", "Blue", "Colorless", "Gold", "Green", "Lands", "Red", "White"]

RARITY_MAP = {
    "common": "Common", "uncommon": "Uncommon", "rare": "Rare",
    "mythic": "Mythic Rare", "special": "Special", "bonus": "Bonus",
}


def slugify(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-") or "card"


def to_int(v):
    try:
        return int(v)
    except (TypeError, ValueError):
        return None


def fetch(name: str) -> dict:
    r = requests.get(SCRYFALL, params={"fuzzy": name}, headers=HEADERS, timeout=15)
    if r.status_code == 404:
        raise LookupError("no match")
    r.raise_for_status()
    return r.json()


def map_card(data: dict) -> dict:
    face = data
    if "oracle_text" not in data and data.get("card_faces"):
        face = data["card_faces"][0]
    imgs = data.get("image_uris") or face.get("image_uris") or {}
    card = {
        "id": slugify(data["name"]) + "-" + data.get("set", ""),
        "name": data["name"],
        "manaCost": face.get("mana_cost", "") or "",
        "type": data.get("type_line") or face.get("type_line", ""),
        "rarity": RARITY_MAP.get(data.get("rarity", ""), data.get("rarity", "")),
        "text": face.get("oracle_text", "") or "",
        "colors": data.get("colors") or face.get("colors") or [],
        "custom": False,
        "archetypes": [],
    }
    if face.get("flavor_text") or data.get("flavor_text"):
        card["flavorText"] = face.get("flavor_text") or data.get("flavor_text")
    if data.get("artist"):
        card["artist"] = data["artist"]
    if face.get("power") is not None:
        card["power"] = str(face["power"])
    if face.get("toughness") is not None:
        card["toughness"] = str(face["toughness"])
    loy = to_int(face.get("loyalty"))
    if loy is not None:
        card["loyalty"] = loy
    if data.get("set_name"):
        card["set"] = data["set_name"]
    if imgs.get("normal") or imgs.get("large"):
        card["imageUrl"] = imgs.get("normal") or imgs.get("large")
    return card


def main() -> int:
    real, failures, custom_todo = [], [], []

    for color in COLOR_DIRS:
        cdir = os.path.join(BATCH_DIR, color)
        if not os.path.isdir(cdir):
            continue
        for root, _, files in os.walk(cdir):
            for fn in sorted(files):
                ext = os.path.splitext(fn)[1].lower()
                path = os.path.join(root, fn)
                rel = os.path.relpath(path, BATCH_DIR)
                name = os.path.splitext(fn)[0].strip()
                if ext in (".jpg", ".jpeg"):
                    try:
                        card = map_card(fetch(name))
                        card["_source"] = rel  # provenance; strip before import if unwanted
                        real.append(card)
                        print(f"OK   {rel} -> {card['name']}", file=sys.stderr)
                    except Exception as e:
                        failures.append(f"{rel}\t{e}")
                        print(f"FAIL {rel}: {e}", file=sys.stderr)
                    time.sleep(0.1)  # polite to Scryfall
                elif ext == ".png":
                    custom_todo.append(rel)

    with open(os.path.join(OUT_DIR, "real-cards.json"), "w", encoding="utf-8") as f:
        json.dump(real, f, indent=2, ensure_ascii=False)
    with open(os.path.join(OUT_DIR, "failures.txt"), "w", encoding="utf-8") as f:
        f.write("\n".join(failures))
    with open(os.path.join(OUT_DIR, "custom-todo.txt"), "w", encoding="utf-8") as f:
        f.write("\n".join(custom_todo))

    print(
        f"\nDone: {len(real)} real cards, {len(failures)} failures, "
        f"{len(custom_todo)} custom (.png) to do.",
        file=sys.stderr,
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
