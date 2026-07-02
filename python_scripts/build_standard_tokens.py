"""Fetch art + data for referenced tokens that have no local token entry.

Some cards' `relatedTokens` name standard MTG tokens (Treasure, Clue, Food, Map,
Saproling, Pest, ...) that have no custom art in any Tokens folder, so they were
missing from the token collection. This pulls each such token from Scryfall's
token database (layout=token) and appends it to First Batch/json/tokens.json so
the /api/tokens pages resolve with real art. Idempotent: skips tokens already
present (by normalized name). Re-run safe.
"""
import glob, json, os, re, time, requests

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HEAD = {"User-Agent": "custom-cube-website/1.0", "Accept": "application/json"}


def norm(s):
    return re.sub(r"[^a-z0-9]+", " ", s.lower()).strip()


def slugify(s):
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-") or "token"


def scryfall_token(name):
    # exact name, token layout
    for q in (f'!"{name}" (layout:token OR type:token)', f'{name} (layout:token OR type:token)'):
        r = requests.get("https://api.scryfall.com/cards/search",
                         params={"q": q, "order": "released", "unique": "cards"},
                         headers=HEAD, timeout=15)
        time.sleep(0.08)
        if r.status_code != 200:
            continue
        data = r.json().get("data") or []
        # prefer an exact (case-insensitive) name match
        exact = [c for c in data if c.get("name", "").lower() == name.lower()]
        pick = (exact or data)
        if pick:
            return pick[0]
    return None


def to_token(name, c):
    face = c
    if "image_uris" not in c and c.get("card_faces"):
        face = c["card_faces"][0]
    img = (c.get("image_uris") or face.get("image_uris") or {})
    tok = {
        "id": slugify(name),
        "name": name,
        "type": c.get("type_line") or face.get("type_line", ""),
        "colors": c.get("colors") or face.get("colors") or [],
        "text": face.get("oracle_text", "") or "",
        "set": c.get("set_name", "Scryfall"),
    }
    if face.get("power") is not None:
        tok["power"] = str(face["power"])
    if face.get("toughness") is not None:
        tok["toughness"] = str(face["toughness"])
    if c.get("artist"):
        tok["artist"] = c["artist"]
    if img.get("normal") or img.get("large"):
        tok["imageUrl"] = img.get("normal") or img.get("large")
    return tok


def main():
    # referenced token names
    referenced = set()
    for p in glob.glob(os.path.join(REPO, "public", "Cube", "*", "json", "cards.json")):
        for d in json.load(open(p, encoding="utf-8")):
            for t in (d.get("relatedTokens") or []):
                referenced.add(t)
    # existing token names
    existing = set()
    for p in glob.glob(os.path.join(REPO, "public", "Cube", "*", "json", "tokens.json")):
        for t in json.load(open(p, encoding="utf-8")):
            existing.add(norm(t["name"]))

    def covered(name):
        n = norm(name)
        return any(n == e or n in e or e in n for e in existing)

    missing = sorted(n for n in referenced if not covered(n))
    print("referenced-but-missing tokens:", len(missing))

    out_path = os.path.join(REPO, "public", "Cube", "First Batch", "json", "tokens.json")
    tokens = json.load(open(out_path, encoding="utf-8"))
    have_ids = {t["id"] for t in tokens}
    added, notfound = 0, []
    for name in missing:
        data = scryfall_token(name)
        if not data:
            notfound.append(name)
            print(f"  MISS  {name}")
            continue
        tok = to_token(name, data)
        if tok["id"] in have_ids:
            continue
        tokens.append(tok)
        have_ids.add(tok["id"])
        added += 1
        print(f"  OK    {name:26s} <- {data.get('name')} [{data.get('set','').upper()}] img={bool(tok.get('imageUrl'))}")
    json.dump(tokens, open(out_path, "w", encoding="utf-8"), indent=2, ensure_ascii=False)
    print(f"\nadded {added} Scryfall tokens to {out_path}")
    if notfound:
        print("not on Scryfall (custom/typo, left as-is):", notfound)


if __name__ == "__main__":
    main()
