"""Build a Card JSON for a REAL Magic card from the Scryfall API. No LLM.

For real (non-custom) cards this is more accurate than reading an image: it
pulls exact oracle text, mana cost, colors, art, etc. from Scryfall, and sets
custom=false. Output matches the `Card` type in src/types/types.ts.

Two ways to identify the card:
  1. By name (reliable):
       python card_from_scryfall.py --name "Lightning Bolt"
  2. By image (best-effort): OCRs the title line with Tesseract, then looks it
     up by name. Requires the system `tesseract` binary + `pytesseract`+`Pillow`.
       python card_from_scryfall.py --image bolt.png

Examples:
  python card_from_scryfall.py --name "Counterspell" -o card.json
  python card_from_scryfall.py --name "Llanowar Elves" --set m19

No API key needed. Scryfall asks for polite rate limiting (~10 req/s); this
script does one request per card.
"""

import argparse
import json
import os
import re
import sys
import time
from typing import Optional

import requests

SCRYFALL_NAMED = "https://api.scryfall.com/cards/named"

# Scryfall rarity -> the site's display rarity.
RARITY_MAP = {
    "common": "Common",
    "uncommon": "Uncommon",
    "rare": "Rare",
    "mythic": "Mythic Rare",
    "special": "Special",
    "bonus": "Bonus",
}


def slugify(name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    return slug or "card"


def fetch_scryfall(name: str, set_code: Optional[str] = None) -> dict:
    params = {"fuzzy": name}
    if set_code:
        params["set"] = set_code
    headers = {"User-Agent": "custom-cube-website/1.0", "Accept": "application/json"}
    resp = requests.get(SCRYFALL_NAMED, params=params, headers=headers, timeout=15)
    if resp.status_code == 404:
        raise LookupError(f"Scryfall found no card matching '{name}'")
    resp.raise_for_status()
    return resp.json()


def to_int(value) -> Optional[int]:
    """Scryfall loyalty is a string; the schema wants a number where possible."""
    if value is None:
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None  # e.g. "X" loyalty — drop rather than store a bad type


def map_card(data: dict) -> dict:
    # Double-faced cards keep top-level name/colors but put text on card_faces.
    face = data
    if "oracle_text" not in data and data.get("card_faces"):
        face = data["card_faces"][0]

    image_url = None
    image_uris = data.get("image_uris") or face.get("image_uris")
    if image_uris:
        image_url = image_uris.get("normal") or image_uris.get("large")

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

    # Optional fields — include only when present.
    flavor = face.get("flavor_text") or data.get("flavor_text")
    if flavor:
        card["flavorText"] = flavor
    artist = data.get("artist") or face.get("artist")
    if artist:
        card["artist"] = artist
    if face.get("power") is not None:
        card["power"] = str(face["power"])
    if face.get("toughness") is not None:
        card["toughness"] = str(face["toughness"])
    loyalty = to_int(face.get("loyalty"))
    if loyalty is not None:
        card["loyalty"] = loyalty
    if data.get("set_name"):
        card["set"] = data["set_name"]
    if image_url:
        card["imageUrl"] = image_url

    return card


def ocr_card_name(image_path: str) -> str:
    """Best-effort: read the title line from the top of a card image."""
    try:
        import pytesseract
        from PIL import Image
    except ImportError:
        raise RuntimeError(
            "Image lookup needs pytesseract and Pillow installed, plus the "
            "tesseract binary on PATH. Or just pass --name."
        )

    img = Image.open(image_path)
    w, h = img.size
    # The name sits in the top title bar — crop the top ~12% to cut noise.
    title = img.crop((0, 0, w, int(h * 0.12)))
    text = pytesseract.image_to_string(title).strip()
    # First non-empty line is the card name.
    name = next((line.strip() for line in text.splitlines() if line.strip()), "")
    if not name:
        raise LookupError(f"Could not OCR a card name from {image_path}")
    return name


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Build Card JSON for a real Magic card via Scryfall (no LLM)."
    )
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--name", help="Card name to look up (fuzzy matched).")
    group.add_argument("--image", help="Card image; OCRs the title, then looks it up.")
    parser.add_argument("--set", dest="set_code", help="Restrict to a set code, e.g. m19.")
    parser.add_argument("-o", "--output", help="Write JSON here instead of stdout.")
    args = parser.parse_args()

    name = args.name
    if args.image:
        name = ocr_card_name(args.image)
        print(f"OCR read name: {name!r}", file=sys.stderr)

    data = fetch_scryfall(name, args.set_code)
    time.sleep(0.1)  # be polite to Scryfall
    card = map_card(data)
    output = json.dumps(card, indent=2, ensure_ascii=False)

    if args.output:
        with open(args.output, "w", encoding="utf-8") as f:
            f.write(output)
        print(f"Wrote {args.output}", file=sys.stderr)
    else:
        print(output)
    return 0


if __name__ == "__main__":
    sys.exit(main())
