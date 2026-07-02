"""Merge one batch's card JSON (real + custom) into a single cards.json.

Generalized version of build_first_batch_merge.py: pass the batch folder name
and the set label. Reads <Batch>/json/real-cards.json and every
<Batch>/json/custom/*.json, strips the internal _source field (using it to
derive imageUrl for custom art under public/), stamps the set label, and writes
<Batch>/json/cards.json.

An internal `_supersedes` field (a prior-set card id) is preserved: it marks a
card that remakes/replaces an earlier-set card, and the backend turns the
predecessor into a historical version at load time. Re-run whenever card JSON
changes.

Usage:
    python build_batch_merge.py "Second Batch" "Set 2"
"""

import glob
import json
import os
import sys
from urllib.parse import quote

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def load(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def _norm(name):
    root, ext = os.path.splitext(name)
    root = root.replace("’", "'").rstrip()
    return root.lower() + ext.lower()


def resolve_source(src, batch_dir):
    """Map a `_source` rel path to the rel path that actually exists on disk,
    tolerating apostrophe-style and trailing-space filename differences."""
    parts = src.replace("\\", "/").split("/")
    if os.path.isfile(os.path.join(batch_dir, *parts)):
        return "/".join(parts)
    subdir, base = "/".join(parts[:-1]), parts[-1]
    target_dir = os.path.join(batch_dir, *parts[:-1]) if subdir else batch_dir
    if os.path.isdir(target_dir):
        want = _norm(base)
        for fn in os.listdir(target_dir):
            if _norm(fn) == want:
                return f"{subdir}/{fn}" if subdir else fn
    return "/".join(parts)


def main(argv):
    if len(argv) < 3:
        print('Usage: python build_batch_merge.py "<Batch Folder>" "<Set Label>"',
              file=sys.stderr)
        return 2
    batch, set_label = argv[1], argv[2]
    batch_dir = os.path.join(REPO, "public", "Cube", batch)
    json_dir = os.path.join(batch_dir, "json")

    # If images have been published to GitHub Releases, repoint local /Cube/ paths
    # at their hosted URLs so the deployed site serves art from the release.
    map_path = os.path.join(REPO, "python_scripts", "gh_release_map.json")
    gh_map = json.load(open(map_path, encoding="utf-8")) if os.path.exists(map_path) else {}

    parts = []
    real = os.path.join(json_dir, "real-cards.json")
    if os.path.exists(real):
        parts.append(("real-cards.json", load(real)))
    for path in sorted(glob.glob(os.path.join(json_dir, "custom", "*.json"))):
        parts.append((os.path.relpath(path, json_dir), load(path)))

    all_cards = []
    for label, cards in parts:
        for c in cards:
            src = c.pop("_source", None)  # internal provenance, not part of the schema
            c["set"] = set_label
            # Custom cards have no Scryfall imageUrl; their art is the source PNG
            # under public/Cube/<Batch>/<...>. public/ is served at the site root,
            # so a URL-encoded root-relative path resolves to it.
            if not c.get("imageUrl") and src:
                c["imageUrl"] = (
                    f"/Cube/{batch}/" + quote(resolve_source(src, batch_dir), safe="/")
                )
            if c.get("imageUrl") in gh_map:
                c["imageUrl"] = gh_map[c["imageUrl"]]
            all_cards.append(c)
        print(f"  {label}: {len(cards)}")

    out = os.path.join(json_dir, "cards.json")
    with open(out, "w", encoding="utf-8") as f:
        json.dump(all_cards, f, indent=2, ensure_ascii=False)
    print(f"\nWrote {out}: {len(all_cards)} cards total ({set_label})")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
