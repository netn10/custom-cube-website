"""Extract a custom-cube Card JSON from a card image using Claude vision.

Reads one image (or a folder of images) and produces JSON objects matching the
`Card` type in src/types/types.ts. The model judges per card whether it is a
custom/fan-made card (custom=true) or a real printed card (custom=false).
Output goes to stdout or a file.

Usage:
    python card_from_image.py path/to/card.png
    python card_from_image.py path/to/card.png -o card.json
    python card_from_image.py path/to/folder -o cards.json   # folder = batch

Requires ANTHROPIC_API_KEY in the environment (or an `ant auth login` profile).
"""

import argparse
import base64
import json
import os
import re
import sys
import uuid
from typing import List, Optional

import anthropic
from pydantic import BaseModel, Field

MODEL = "claude-opus-4-8"

MEDIA_TYPES = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
}

# Valid archetype IDs from src/data/archetypes.ts. The model maps a card to any
# that fit; an empty list is fine when none clearly apply.
ARCHETYPE_IDS = [
    "wu-storm",
    "ub-broken-cipher",
    "br-token-collection",
    "rg-control",
    "gw-vehicles",
    "wb-blink",
    "bg-artifacts",
    "ur-enchantments",
    "rw-self-mill",
    "gu-prowess",
]


class ExtractedCard(BaseModel):
    """Mirrors the `Card` type in src/types/types.ts.

    `id` is filled in by this script; everything else (including `custom`) is
    read off the image by the model.
    """

    name: str = Field(description="Card name exactly as printed.")
    custom: bool = Field(
        description="True if this is a custom / fan-made card, false if it is a "
        "real, officially-printed Magic: The Gathering card. Judge from the art "
        "style, set symbol, frame, and whether you recognize the card as a real "
        "printing. When unsure, prefer true."
    )
    manaCost: str = Field(
        description="Mana cost in curly-brace notation, e.g. '{2}{W}{U}'. "
        "Empty string for lands or cards with no mana cost."
    )
    type: str = Field(
        description="Full type line, e.g. 'Legendary Creature — Human Wizard'."
    )
    rarity: str = Field(
        description="Card rarity: 'Common', 'Uncommon', 'Rare', or 'Mythic Rare'. "
        "Infer from the set symbol color if visible, else best guess."
    )
    text: str = Field(
        description="Full rules/oracle text. Preserve line breaks with \\n. "
        "Exclude flavor text and reminder-only italics where distinguishable."
    )
    colors: List[str] = Field(
        description="Color identity as single-letter codes: W, U, B, R, G. "
        "Empty list for colorless/artifact/land."
    )
    flavorText: Optional[str] = Field(
        default=None, description="Italic flavor text, if present."
    )
    artist: Optional[str] = Field(
        default=None, description="Artist credit from the bottom of the card, if legible."
    )
    power: Optional[str] = Field(
        default=None, description="Creature power as a string (e.g. '3', '*'). Null if not a creature."
    )
    toughness: Optional[str] = Field(
        default=None, description="Creature toughness as a string. Null if not a creature."
    )
    loyalty: Optional[int] = Field(
        default=None, description="Starting loyalty for planeswalkers. Null otherwise."
    )
    set: Optional[str] = Field(
        default=None, description="Set name or code, if shown."
    )
    archetypes: List[str] = Field(
        default_factory=list,
        description="Zero or more archetype IDs this card supports, chosen ONLY from: "
        + ", ".join(ARCHETYPE_IDS)
        + ". Use an empty list if none clearly apply.",
    )


def slugify(name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    return slug or "card"


def encode_image(path: str) -> tuple[str, str]:
    ext = os.path.splitext(path)[1].lower()
    media_type = MEDIA_TYPES.get(ext)
    if not media_type:
        raise ValueError(f"Unsupported image type '{ext}' for {path}")
    with open(path, "rb") as f:
        data = base64.standard_b64encode(f.read()).decode("utf-8")
    return media_type, data


def extract_card(client: anthropic.Anthropic, path: str) -> dict:
    media_type, data = encode_image(path)

    response = client.messages.parse(
        model=MODEL,
        max_tokens=4096,
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": media_type,
                            "data": data,
                        },
                    },
                    {
                        "type": "text",
                        "text": (
                            "This is a Magic: The Gathering-style custom card. "
                            "Read every field off the card image and extract it. "
                            "Be faithful to what is printed; do not invent rules text. "
                            "If a field isn't present, leave it null/empty."
                        ),
                    },
                ],
            }
        ],
        output_format=ExtractedCard,
    )

    card = response.parsed_output

    # Build the full Card dict: model-extracted fields plus script-assigned ones.
    result = card.model_dump(exclude_none=True)
    result["id"] = slugify(card.name) + "-" + uuid.uuid4().hex[:8]
    # `custom` comes straight from the model's judgement (already in result).
    # Ensure required array fields exist even when empty.
    result.setdefault("colors", [])
    result.setdefault("archetypes", [])
    return result


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Extract custom-cube Card JSON from card image(s) using Claude. "
        "The model decides per card whether custom is true or false."
    )
    parser.add_argument(
        "path", help="An image file, or a folder of images (processed in order)."
    )
    parser.add_argument(
        "-o",
        "--output",
        help="Write JSON here instead of stdout.",
    )
    args = parser.parse_args()

    client = anthropic.Anthropic()  # reads ANTHROPIC_API_KEY / ant profile

    if os.path.isdir(args.path):
        files = [
            os.path.join(args.path, f)
            for f in sorted(os.listdir(args.path))
            if os.path.splitext(f)[1].lower() in MEDIA_TYPES
        ]
        if not files:
            print(f"No images found in {args.path}", file=sys.stderr)
            return 1
        cards = []
        for f in files:
            print(f"Extracting {os.path.basename(f)}...", file=sys.stderr)
            try:
                card = extract_card(client, f)
                print(
                    f"  -> {card['name']} (custom={card['custom']})", file=sys.stderr
                )
                cards.append(card)
            except Exception as e:  # keep going on a bad card
                print(f"  failed: {e}", file=sys.stderr)
        output = json.dumps(cards, indent=2, ensure_ascii=False)
    else:
        output = json.dumps(extract_card(client, args.path), indent=2, ensure_ascii=False)

    if args.output:
        with open(args.output, "w", encoding="utf-8") as f:
            f.write(output)
        print(f"Wrote {args.output}", file=sys.stderr)
    else:
        print(output)

    return 0


if __name__ == "__main__":
    sys.exit(main())
