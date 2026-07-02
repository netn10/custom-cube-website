"""Self-host real-card art: for every real (custom==false) card, download the
OLDEST printing's image into public/Cube/RealCards/ and repoint imageUrl at the
local file. Uses the card's oracle_id to fetch the oldest print reliably (so
double-faced cards resolve to the right face)."""
import json, glob, os, time, requests
from urllib.parse import quote

HEAD = {"User-Agent": "custom-cube-website/1.0", "Accept": "application/json"}
OUT = os.path.join("public", "Cube", "RealCards")
os.makedirs(OUT, exist_ok=True)

def named(name):
    r = requests.get("https://api.scryfall.com/cards/named",
                     params={"fuzzy": name}, headers=HEAD, timeout=20)
    time.sleep(0.09)
    return r.json() if r.status_code == 200 else None

def oldest_print(oracle_id):
    r = requests.get("https://api.scryfall.com/cards/search",
                     params={"q": f"oracleid:{oracle_id}", "unique": "prints",
                             "order": "released", "dir": "asc"},
                     headers=HEAD, timeout=20)
    time.sleep(0.09)
    if r.status_code != 200:
        return None
    data = r.json().get("data") or []
    return data[0] if data else None

def face_image(card, want_name, is_back):
    faces = card.get("card_faces")
    if faces:
        if is_back:
            f = faces[1] if len(faces) > 1 else faces[0]
        else:
            f = next((x for x in faces if x.get("name", "").lower() == (want_name or "").lower()), faces[0])
        img = f.get("image_uris") or card.get("image_uris") or {}
    else:
        img = card.get("image_uris") or {}
    return img.get("normal") or img.get("large")

files = glob.glob("public/Cube/*/json/real-cards.json") + glob.glob("public/Cube/*/json/custom/*.json")
img_cache = {}   # scryfall image url -> local rel path
done = miss = 0
for path in files:
    docs = json.load(open(path, encoding="utf-8")); dirty = False
    for d in docs:
        if d.get("custom") or "scryfall" not in (d.get("imageUrl") or ""):
            continue
        is_back = bool(d.get("facedown"))
        rf = d.get("relatedFace")
        lookup = (rf if is_back and isinstance(rf, str) else None) or d["name"]
        try:
            c = named(lookup)
            if not c:
                miss += 1; print("  MISS named:", d["name"]); continue
            oldest = oldest_print(c.get("oracle_id")) or c
            img_url = face_image(oldest, d["name"], is_back)
            if not img_url:
                miss += 1; print("  MISS img:", d["name"]); continue
            if img_url in img_cache:
                d["imageUrl"] = img_cache[img_url]; done += 1; dirty = True; continue
            fn = d["id"] + ".jpg"
            open(os.path.join(OUT, fn), "wb").write(requests.get(img_url, headers=HEAD, timeout=40).content)
            time.sleep(0.03)
            rel = "/Cube/RealCards/" + quote(fn, safe="")
            img_cache[img_url] = rel
            d["imageUrl"] = rel; done += 1; dirty = True
            print(f"  {d['name'][:34]:34s} <- {oldest.get('set','').upper()} {oldest.get('released_at','')}")
        except Exception as e:
            miss += 1; print("  ERR", d["name"], e)
    if dirty:
        json.dump(docs, open(path, "w", encoding="utf-8"), indent=2, ensure_ascii=False)
print(f"\ndownloaded/updated {done} real cards; misses {miss}; files in {OUT}: {len(os.listdir(OUT))}")
