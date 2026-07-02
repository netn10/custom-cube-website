"""Upload every card/token image referenced by the JSON to Imgur, build a
local-path -> imgur-URL map, and (optionally) rewrite all imageUrls to Imgur.

Requires an Imgur API Client-ID in env var IMGUR_CLIENT_ID (anonymous upload).
Resumable: the map is saved after every upload, so re-running skips done images
and continues after a rate-limit stop.

Usage:
  IMGUR_CLIENT_ID=xxxx python imgur_upload.py            # upload only
  IMGUR_CLIENT_ID=xxxx python imgur_upload.py --rewrite  # upload (resume) + rewrite JSON
"""
import base64, glob, json, os, sys, time
from urllib.parse import unquote
import requests

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MAP_PATH = os.path.join(REPO, "python_scripts", "imgur_map.json")
CLIENT_ID = os.environ.get("IMGUR_CLIENT_ID")
THROTTLE = float(os.environ.get("IMGUR_THROTTLE", "2.0"))  # seconds between uploads


def referenced_images():
    imgs = set()
    for p in glob.glob(os.path.join(REPO, "public", "Cube", "*", "json", "cards.json")):
        for d in json.load(open(p, encoding="utf-8")):
            u = d.get("imageUrl") or ""
            if u.startswith("/Cube/"):
                imgs.add(u)
    for p in glob.glob(os.path.join(REPO, "public", "Cube", "*", "json", "tokens.json")):
        for d in json.load(open(p, encoding="utf-8")):
            for u in [d.get("imageUrl") or ""] + [v.get("imageUrl") or "" for v in (d.get("versions") or [])]:
                if u.startswith("/Cube/"):
                    imgs.add(u)
    return sorted(imgs)


def load_map():
    if os.path.exists(MAP_PATH):
        return json.load(open(MAP_PATH, encoding="utf-8"))
    return {}


def save_map(m):
    json.dump(m, open(MAP_PATH, "w", encoding="utf-8"), indent=1, ensure_ascii=False)


def upload(url_path, mapping):
    fp = os.path.join(REPO, unquote(url_path).lstrip("/"))
    with open(fp, "rb") as f:
        b64 = base64.b64encode(f.read())
    for attempt in range(6):
        r = requests.post("https://api.imgur.com/3/image",
                          headers={"Authorization": f"Client-ID {CLIENT_ID}"},
                          data={"image": b64, "type": "base64"}, timeout=120)
        if r.status_code == 200:
            return r.json()["data"]["link"]
        if r.status_code == 429:
            return "RATE_LIMIT"
        time.sleep(2 ** attempt)
    return None


def do_upload():
    if not CLIENT_ID:
        print("ERROR: set IMGUR_CLIENT_ID env var"); return False
    imgs = referenced_images()
    mapping = load_map()
    todo = [u for u in imgs if u not in mapping]
    print(f"{len(imgs)} images referenced; {len(mapping)} already uploaded; {len(todo)} to go")
    for i, u in enumerate(todo, 1):
        link = upload(u, mapping)
        if link == "RATE_LIMIT":
            print(f"RATE LIMITED after {len(mapping)} uploads — re-run later to resume.")
            save_map(mapping); return False
        if not link:
            print("  FAIL:", u); continue
        mapping[u] = link
        if i % 10 == 0:
            save_map(mapping); print(f"  {i}/{len(todo)} (last: {u[-40:]})")
        time.sleep(THROTTLE)
    save_map(mapping)
    print(f"DONE uploading. map has {len(mapping)} entries.")
    return len(mapping) >= len(imgs)


def do_rewrite():
    mapping = load_map()
    if not mapping:
        print("no map yet"); return
    def repl(u):
        return mapping.get(u, u)
    n = 0
    for p in glob.glob(os.path.join(REPO, "public", "Cube", "*", "json", "custom", "*.json")) + \
             glob.glob(os.path.join(REPO, "public", "Cube", "*", "json", "real-cards.json")) + \
             glob.glob(os.path.join(REPO, "public", "Cube", "*", "json", "tokens.json")):
        docs = json.load(open(p, encoding="utf-8")); dirty = False
        for d in docs:
            if d.get("imageUrl") in mapping:
                d["imageUrl"] = mapping[d["imageUrl"]]; dirty = True; n += 1
            for v in (d.get("versions") or []):
                if v.get("imageUrl") in mapping:
                    v["imageUrl"] = mapping[v["imageUrl"]]; dirty = True
        if dirty:
            json.dump(docs, open(p, "w", encoding="utf-8"), indent=2, ensure_ascii=False)
    print(f"rewrote {n} imageUrls to Imgur. Now re-run build_batch_merge for each set.")


if __name__ == "__main__":
    ok = do_upload()
    if "--rewrite" in sys.argv and ok:
        do_rewrite()
