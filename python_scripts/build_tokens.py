"""Build deduped per-batch tokens.json from each batch's tokens-raw.json.

Each Tokens folder was transcribed by vision into <Batch>/json/tokens-raw.json
(objects with name/type/colors/power/toughness/text/artist/_source). This script:
  - walks the batches in set order (First..Fifth),
  - dedupes tokens by normalized printed name (a token that recurs across sets,
    e.g. Treasure/Confusion/Memory, is kept once — first occurrence wins),
  - resolves each _source ("Tokens/<file>") to the real on-disk filename and
    builds a root-relative, URL-encoded imageUrl under public/,
  - stamps the batch's set label and a slug id,
  - writes <Batch>/json/tokens.json containing that batch's first-seen tokens.

The backend seeds db.tokens from every <Batch>/json/tokens.json. Cards link to a
token by its `name` via their `relatedTokens` array (the /api/tokens join).

Usage: python build_tokens.py
"""

import glob
import json
import os
import re
from urllib.parse import quote

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CUBE = os.path.join(REPO, "public", "Cube")

BATCH_ORDER = [
    ("First Batch", "Set 1"),
    ("Second Batch", "Set 2"),
    ("Third Batch", "Set 3"),
    ("Forth Batch", "Set 4"),
    ("Fifth Batch", "Set 5"),
]


def slugify(name):
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-") or "token"


def norm_name(name):
    n = name.strip().lower()
    n = re.sub(r"\s+token$", "", n)          # drop a trailing " token"
    n = re.sub(r"\s+\d+$", "", n)            # drop a trailing number ("confusion 3")
    return re.sub(r"[^a-z0-9]+", " ", n).strip()


def _norm_file(name):
    root, ext = os.path.splitext(name)
    return root.replace("’", "'").rstrip().lower() + ext.lower()


def resolve_source(src, batch_dir):
    parts = src.replace("\\", "/").split("/")
    if os.path.isfile(os.path.join(batch_dir, *parts)):
        return "/".join(parts)
    subdir, base = "/".join(parts[:-1]), parts[-1]
    target = os.path.join(batch_dir, *parts[:-1]) if subdir else batch_dir
    if os.path.isdir(target):
        want = _norm_file(base)
        for fn in os.listdir(target):
            if _norm_file(fn) == want:
                return f"{subdir}/{fn}" if subdir else fn
    return "/".join(parts)


def main():
    seen_names = {}      # norm_name -> set label that first defined it
    seen_ids = {}
    total = 0
    for batch, label in BATCH_ORDER:
        batch_dir = os.path.join(CUBE, batch)
        raw_path = os.path.join(batch_dir, "json", "tokens-raw.json")
        out_path = os.path.join(batch_dir, "json", "tokens.json")
        if not os.path.exists(raw_path):
            print(f"  {batch}: no tokens-raw.json, skipping")
            continue
        with open(raw_path, encoding="utf-8") as f:
            raw = json.load(f)
        kept = []
        for t in raw:
            name = (t.get("name") or "").strip()
            if not name:
                continue
            key = norm_name(name)
            if key in seen_names:
                continue  # already defined in an earlier (or this) set
            seen_names[key] = label
            tok = {k: v for k, v in t.items() if k != "_source"}
            tid = slugify(name)
            while tid in seen_ids:
                seen_ids[tid] += 1
                tid = f"{tid}-{seen_ids[tid]}"
            seen_ids.setdefault(tid, 1)
            tok["id"] = tid
            tok["set"] = label
            src = t.get("_source")
            if src:
                tok["imageUrl"] = f"/Cube/{batch}/" + quote(resolve_source(src, batch_dir), safe="/")
            kept.append(tok)
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(kept, f, indent=2, ensure_ascii=False)
        total += len(kept)
        print(f"  {batch}: {len(raw)} raw -> {len(kept)} unique tokens")
    print(f"\nTotal unique tokens: {total}")


if __name__ == "__main__":
    main()
