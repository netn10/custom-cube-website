"""Merge all First Batch card JSON (real + custom) into one giant cards.json.

Reads real-cards.json and every custom/*.json under the First Batch json folder,
strips the internal _source field, and writes a single schema-clean cards.json
array. Re-run any time more custom folders are added.
"""

import glob
import json
import os
from urllib.parse import quote

JSON_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "public", "Cube", "First Batch", "json",
)
FIRST_BATCH_DIR = os.path.dirname(JSON_DIR)  # public/Cube/First Batch


def load(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def _norm(name):
    """Normalize a filename for matching: unify curly/straight apostrophes and
    ignore trailing whitespace before the extension, case-insensitively."""
    root, ext = os.path.splitext(name)
    root = root.replace("’", "'").rstrip()
    return root.lower() + ext.lower()


def resolve_source(src):
    """Map a `_source` rel path (as transcribed) to the rel path that actually
    exists on disk under First Batch, tolerating apostrophe-style and trailing-
    space differences in filenames. Returns the original src if unresolved."""
    parts = src.split("/")
    if os.path.isfile(os.path.join(FIRST_BATCH_DIR, *parts)):
        return src
    subdir, base = "/".join(parts[:-1]), parts[-1]
    target_dir = os.path.join(FIRST_BATCH_DIR, *parts[:-1]) if subdir else FIRST_BATCH_DIR
    if os.path.isdir(target_dir):
        want = _norm(base)
        for fn in os.listdir(target_dir):
            if _norm(fn) == want:
                return f"{subdir}/{fn}" if subdir else fn
    return src


def main():
    parts = []
    real = os.path.join(JSON_DIR, "real-cards.json")
    if os.path.exists(real):
        parts.append(("real-cards.json", load(real)))
    for path in sorted(glob.glob(os.path.join(JSON_DIR, "custom", "*.json"))):
        parts.append((os.path.relpath(path, JSON_DIR), load(path)))

    all_cards = []
    for label, cards in parts:
        for c in cards:
            src = c.pop("_source", None)  # internal provenance, not part of the schema
            c["set"] = "Set 1"  # First Batch = "Set 1" (matches the site's set names)
            # Custom cards have no Scryfall imageUrl; their art is the source PNG
            # under public/Cube/First Batch/<Color>/<file>. public/ is served at the
            # site root by Next.js, so a URL-encoded root-relative path resolves to it.
            if not c.get("imageUrl") and src:
                c["imageUrl"] = "/Cube/First Batch/" + quote(resolve_source(src), safe="/")
            all_cards.append(c)
        print(f"  {label}: {len(cards)}")

    out = os.path.join(JSON_DIR, "cards.json")
    with open(out, "w", encoding="utf-8") as f:
        json.dump(all_cards, f, indent=2, ensure_ascii=False)
    print(f"\nWrote {out}: {len(all_cards)} cards total")


if __name__ == "__main__":
    main()
