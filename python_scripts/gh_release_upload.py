"""Host all card/token images on GitHub Releases (free, no repo bloat) and
rewrite every imageUrl to the release download URL.

Uses the machine's existing GitHub credential (via `git credential fill`).
Resumable: skips assets already on the release; saves the map after each upload.

Usage:
  python gh_release_upload.py            # create release + upload (resume)
  python gh_release_upload.py --rewrite  # + rewrite JSON imageUrls to GitHub URLs
"""
import glob, json, os, re, subprocess, sys, time
from urllib.parse import unquote
import requests

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OWNER, NAME = "netn10", "custom-cube-website"
TAG = "cube-art"
MAP_PATH = os.path.join(REPO, "python_scripts", "gh_release_map.json")
CT = {".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
      ".webp": "image/webp", ".gif": "image/gif", ".bmp": "image/bmp"}


def token():
    out = subprocess.run(["git", "credential", "fill"], input="protocol=https\nhost=github.com\n\n",
                         capture_output=True, text=True).stdout
    for line in out.splitlines():
        if line.startswith("password="):
            return line[9:]
    raise SystemExit("no GitHub token")

TOK = token()
H = {"Authorization": f"token {TOK}", "Accept": "application/vnd.github+json"}


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


def asset_name(url_path, used):
    # /Cube/First Batch/Black/Foo.png -> first-batch__black__foo.png (unique, url-safe)
    rel = url_path[len("/Cube/"):]
    root, ext = os.path.splitext(rel)
    slug = re.sub(r"[^A-Za-z0-9._-]+", "-", root.replace("/", "__")).strip("-").lower()
    name = slug + ext.lower()
    n = 2
    while name in used:
        name = f"{slug}-{n}{ext.lower()}"; n += 1
    used.add(name)
    return name


def ensure_release():
    r = requests.get(f"https://api.github.com/repos/{OWNER}/{NAME}/releases/tags/{TAG}", headers=H)
    if r.status_code == 200:
        rel = r.json()
    else:
        rel = requests.post(f"https://api.github.com/repos/{OWNER}/{NAME}/releases", headers=H,
                            json={"tag_name": TAG, "name": "Cube card & token art",
                                  "body": "Self-hosted card/token images referenced by the site."}).json()
    # existing assets: name -> browser_download_url, name -> id
    existing, ids = {}, {}
    page = 1
    while True:
        a = requests.get(f"https://api.github.com/repos/{OWNER}/{NAME}/releases/{rel['id']}/assets",
                         headers=H, params={"per_page": 100, "page": page}).json()
        if not a:
            break
        for x in a:
            existing[x["name"]] = x["browser_download_url"]; ids[x["name"]] = x["id"]
        page += 1
    return rel["id"], existing, ids


def main():
    imgs = referenced_images()
    rel_id, existing, ids = ensure_release()
    mapping = json.load(open(MAP_PATH, encoding="utf-8")) if os.path.exists(MAP_PATH) else {}
    used = set()
    # reserve names already mapped so re-runs stay consistent
    for u in imgs:
        asset_name(u, used) if u not in mapping else None
    used = set()
    done = 0
    for i, u in enumerate(imgs, 1):
        if u in mapping:
            used.add(mapping[u].rsplit("/", 1)[-1]); continue
        name = asset_name(u, used)
        if name in existing:
            mapping[u] = existing[name]; continue
        fp = os.path.join(REPO, "public", unquote(u).lstrip("/"))
        ext = os.path.splitext(fp)[1].lower()
        with open(fp, "rb") as f:
            data = f.read()
        ok = False
        for attempt in range(8):
            try:
                r = requests.post(
                    f"https://uploads.github.com/repos/{OWNER}/{NAME}/releases/{rel_id}/assets",
                    headers={**H, "Content-Type": CT.get(ext, "application/octet-stream")},
                    params={"name": name}, data=data, timeout=180)
            except requests.exceptions.RequestException as e:
                print("  net retry", attempt, str(e)[:60]); time.sleep(2 ** attempt); continue
            if r.status_code in (200, 201):
                mapping[u] = r.json()["browser_download_url"]; ok = True; done += 1; break
            if r.status_code == 422:  # name already taken on the release
                if name in existing:            # a real, already-uploaded asset -> trust its URL
                    mapping[u] = existing[name]; ok = True; break
                if name in ids:                 # stale/partial asset -> delete and re-upload fresh
                    requests.delete(f"https://api.github.com/repos/{OWNER}/{NAME}/releases/assets/{ids[name]}", headers=H)
                    time.sleep(1); continue
                # 422 but we don't know this name: refetch once to learn it, else fail loudly
                _, existing, ids = ensure_release()
                if name in existing:
                    mapping[u] = existing[name]; ok = True; break
                print("  422-unresolved", u, r.text[:100]); time.sleep(2 ** attempt); continue
            time.sleep(2 ** attempt)
        if not ok:
            print("  FAIL", u, r.status_code, r.text[:120])
        if done and done % 20 == 0:
            json.dump(mapping, open(MAP_PATH, "w", encoding="utf-8"), indent=1, ensure_ascii=False)
            print(f"  uploaded {len(mapping)}/{len(imgs)}")
    json.dump(mapping, open(MAP_PATH, "w", encoding="utf-8"), indent=1, ensure_ascii=False)
    print(f"DONE: {len(mapping)}/{len(imgs)} mapped")
    return len(mapping) >= len(imgs)


def rewrite():
    mapping = json.load(open(MAP_PATH, encoding="utf-8"))
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
    print(f"rewrote {n} imageUrls to GitHub Releases URLs")


def verify():
    """HEAD-check every mapped URL; drop entries that 404 so they re-upload."""
    from concurrent.futures import ThreadPoolExecutor
    mapping = json.load(open(MAP_PATH, encoding="utf-8"))
    items = list(mapping.items())

    def check(kv):
        k, url = kv
        for _ in range(3):
            try:
                if requests.head(url, allow_redirects=True, timeout=30).status_code == 200:
                    return (k, True)
                return (k, False)
            except requests.exceptions.RequestException:
                time.sleep(1)
        return (k, False)

    bad = []
    with ThreadPoolExecutor(max_workers=16) as ex:
        for i, (k, good) in enumerate(ex.map(check, items), 1):
            if not good:
                bad.append(k)
            if i % 200 == 0:
                print(f"  verified {i}/{len(items)} ({len(bad)} bad)")
    for k in bad:
        mapping.pop(k, None)
    json.dump(mapping, open(MAP_PATH, "w", encoding="utf-8"), indent=1, ensure_ascii=False)
    print(f"verify: {len(bad)} broken URLs pruned; {len(mapping)} remain valid")
    return len(bad)


if __name__ == "__main__":
    if "--rewrite-only" in sys.argv:
        rewrite()
    elif "--verify" in sys.argv:
        verify()
    else:
        ok = main()
        if "--rewrite" in sys.argv and ok:
            rewrite()
