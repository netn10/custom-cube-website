"""For every token still pointing at a Scryfall image, download the OLDEST
printing's art into public/Cube/Tokens/ and repoint imageUrl at the local file,
so all token art is self-hosted. 'Body' has no real counterpart -> placeholder
(imageUrl cleared, so the UI shows its 'no image' placeholder)."""
import json, glob, os, re, time, requests

HEAD = {"User-Agent": "custom-cube-website/1.0", "Accept": "application/json"}
OUT_DIR = os.path.join("public", "Cube", "Tokens")
os.makedirs(OUT_DIR, exist_ok=True)
PT = re.compile(r"^\s*-?[\dX*]+/-?[\dX*+]+\s+")
CW = {"white", "blue", "black", "red", "green", "and", "colorless"}

def subtype(name):
    n = PT.sub("", name).split()
    while n and n[0].lower() in CW:
        n.pop(0)
    return " ".join(n).strip()

def slug(s):
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")

def oldest_art(sub):
    if sub.lower().endswith(" role"):
        q = f'!"{sub[:-5]}" t:role include:extras'
    else:
        q = f'!"{sub}" include:extras'
    try:
        r = requests.get("https://api.scryfall.com/cards/search",
                         params={"q": q, "order": "released", "dir": "asc", "unique": "prints"},
                         headers=HEAD, timeout=20)
        time.sleep(0.1)
        if r.status_code != 200:
            return None
        data = r.json().get("data") or []
    except Exception:
        return None
    if not data:
        return None
    toks = [c for c in data if c.get("layout") in ("token", "double_faced_token")]
    c = (toks or data)[0]
    faces = c.get("card_faces")
    face = c
    if faces:
        # pick the face whose name matches this token's subtype (DFC tokens like
        # "Wicked // Cursed" or "Vampire // Treasure"); fall back to the front.
        want = sub.lower()
        face = next((fc for fc in faces if fc.get("name", "").lower() == want), faces[0])
    img = (face.get("image_uris") or c.get("image_uris") or {})
    return img.get("normal") or img.get("large"), face.get("name") or c.get("name")

cache = {}   # subtype -> local rel url ('' => placeholder/failed)
tok_files = glob.glob("public/Cube/*/json/tokens.json")
changed = 0
for f in tok_files:
    docs = json.load(open(f, encoding="utf-8")); dirty = False
    for t in docs:
        u = t.get("imageUrl") or ""
        if "scryfall" not in u:
            continue
        sub = subtype(t["name"]) or t["name"]
        if sub.lower() == "body":
            t["imageUrl"] = ""; dirty = True; changed += 1
            print("  Body -> placeholder"); continue
        if sub in cache:
            t["imageUrl"] = cache[sub]
            if cache[sub]: dirty = True; changed += 1
            continue
        res = oldest_art(sub)
        if not res or not res[0]:
            cache[sub] = ""; print("  MISS scryfall:", sub); continue
        img_url, sname = res
        fn = slug(sub) + ".jpg"
        path = os.path.join(OUT_DIR, fn)
        try:
            b = requests.get(img_url, headers=HEAD, timeout=30).content
            open(path, "wb").write(b)
        except Exception as e:
            cache[sub] = ""; print("  download FAIL:", sub, e); continue
        rel = "/Cube/Tokens/" + fn.replace(" ", "%20")
        cache[sub] = rel
        t["imageUrl"] = rel; dirty = True; changed += 1
        print(f"  {sub:26s} <- {sname}  saved {fn}")
    if dirty:
        json.dump(docs, open(f, "w", encoding="utf-8"), indent=2, ensure_ascii=False)
print("updated", changed, "token entries;", len(os.listdir(OUT_DIR)), "art files")
