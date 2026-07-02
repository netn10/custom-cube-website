"""GitHub caps a release at 1000 assets. The first 1000 images live in release
`cube-art`; this uploads the remaining ~125 to an overflow release `cube-art-2`
and repoints their URLs in every JSON (built cards.json + custom/real/token
sources) and in the merge map (so re-merges stay correct).
"""
import glob, json, os, re, time
from urllib.parse import quote
import requests
from gh_release_upload import H, OWNER, NAME, CT, REPO, MAP_PATH

CUBE = os.path.join(REPO, "public", "Cube")
BASE_TAG = "cube-art"
OVERFLOW_TAG = "cube-art-2"


def asset_name_of(urlpath):
    rel = urlpath[len("/Cube/"):]
    root, ext = os.path.splitext(rel)
    slug = re.sub(r"[^A-Za-z0-9._-]+", "-", root.replace("/", "__")).strip("-").lower()
    return slug + ext.lower()


def disk_index():
    """asset_name -> (local url-path, filepath) for every image on disk."""
    idx = {}
    for fp in glob.glob(os.path.join(CUBE, "**", "*"), recursive=True):
        if not os.path.isfile(fp):
            continue
        if os.path.splitext(fp)[1].lower() not in CT:
            continue
        rel = os.path.relpath(fp, CUBE).replace("\\", "/")
        batch = rel.split("/")[0]
        urlpath = "/Cube/" + batch + "/" + quote(rel[len(batch) + 1:], safe="/")
        idx[asset_name_of(urlpath)] = (urlpath, fp)
    return idx


def ensure_release(tag):
    r = requests.get(f"https://api.github.com/repos/{OWNER}/{NAME}/releases/tags/{tag}", headers=H)
    if r.status_code == 200:
        rel = r.json()
    else:
        rel = requests.post(f"https://api.github.com/repos/{OWNER}/{NAME}/releases", headers=H,
                            json={"tag_name": tag, "name": "Cube card & token art (overflow)",
                                  "body": "Overflow of self-hosted card/token images (release asset cap is 1000)."}).json()
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


def referenced_urls():
    urls = set()
    for p in glob.glob(os.path.join(CUBE, "*", "json", "cards.json")) + \
             glob.glob(os.path.join(CUBE, "*", "json", "tokens.json")):
        for d in json.load(open(p, encoding="utf-8")):
            for u in [d.get("imageUrl") or ""] + [v.get("imageUrl") or "" for v in (d.get("versions") or [])]:
                if "releases/download/" in u:
                    urls.add(u)
    return urls


def main():
    idx = disk_index()
    mapping = json.load(open(MAP_PATH, encoding="utf-8"))
    good_names = {v.rsplit("/", 1)[-1] for v in mapping.values()}
    bad = [u for u in referenced_urls() if u.rsplit("/", 1)[-1] not in good_names]
    print(f"{len(bad)} URLs missing from '{BASE_TAG}' -> uploading to overflow '{OVERFLOW_TAG}'")

    rel_id, existing, ids = ensure_release(OVERFLOW_TAG)
    fixmap = {}   # old (cube-art) url -> new (cube-art-2) url
    fixed = miss = 0
    for u in bad:
        name = u.rsplit("/", 1)[-1]
        if name in existing:              # already uploaded to overflow on a prior run
            new = existing[name]
        else:
            if name not in idx:
                print("  NO LOCAL FILE:", name); miss += 1; continue
            urlpath, fp = idx[name]
            data = open(fp, "rb").read()
            ext = os.path.splitext(fp)[1].lower()
            new = None
            for attempt in range(8):
                try:
                    r = requests.post(
                        f"https://uploads.github.com/repos/{OWNER}/{NAME}/releases/{rel_id}/assets",
                        headers={**H, "Content-Type": CT.get(ext, "application/octet-stream")},
                        params={"name": name}, data=data, timeout=180)
                except requests.exceptions.RequestException as e:
                    print("  net retry", str(e)[:50]); time.sleep(2 ** attempt); continue
                if r.status_code in (200, 201):
                    new = r.json()["browser_download_url"]; break
                if r.status_code == 422 and name in ids:
                    requests.delete(f"https://api.github.com/repos/{OWNER}/{NAME}/releases/assets/{ids[name]}", headers=H)
                    time.sleep(1); continue
                print("  FAIL", name, r.status_code, r.text[:100]); time.sleep(1); break
            if not new:
                miss += 1; continue
        fixmap[u] = new
        urlpath = idx[name][0]
        mapping[urlpath] = new            # keep merge map durable
        fixed += 1
        if fixed % 25 == 0:
            json.dump(mapping, open(MAP_PATH, "w", encoding="utf-8"), indent=1, ensure_ascii=False)
            print(f"  uploaded {fixed}/{len(bad)}")
    json.dump(mapping, open(MAP_PATH, "w", encoding="utf-8"), indent=1, ensure_ascii=False)

    # repoint the moved URLs in every JSON file
    changed = 0
    for p in glob.glob(os.path.join(CUBE, "*", "json", "cards.json")) + \
             glob.glob(os.path.join(CUBE, "*", "json", "tokens.json")) + \
             glob.glob(os.path.join(CUBE, "*", "json", "real-cards.json")) + \
             glob.glob(os.path.join(CUBE, "*", "json", "custom", "*.json")):
        docs = json.load(open(p, encoding="utf-8")); dirty = False
        for d in docs:
            if d.get("imageUrl") in fixmap:
                d["imageUrl"] = fixmap[d["imageUrl"]]; dirty = True; changed += 1
            for v in (d.get("versions") or []):
                if v.get("imageUrl") in fixmap:
                    v["imageUrl"] = fixmap[v["imageUrl"]]; dirty = True
        if dirty:
            json.dump(docs, open(p, "w", encoding="utf-8"), indent=2, ensure_ascii=False)
    print(f"DONE: uploaded {fixed}, no-file {miss}; repointed {changed} JSON imageUrls to {OVERFLOW_TAG}")


if __name__ == "__main__":
    main()
