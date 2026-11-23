"""Upload new image files to a GitHub release, never replacing or deleting anything.

Usage: python gh_release_add.py <plan.json> [--dry]
plan.json: [{"path": "<local file>", "tag": "cube-art-2", "name": "<asset name>"}, ...]
- Skips an asset that is already on the release with the same size (resumable).
- Refuses to upload over an existing asset of a different size (prints it instead).
- Writes <plan>.result.json: name -> browser_download_url (or the error).
Uses the machine's existing GitHub credential (via `git credential fill`), like gh_release_upload.py.
"""
import json, mimetypes, os, subprocess, sys, time
import requests

OWNER, NAME = "netn10", "custom-cube-website"


def token():
    out = subprocess.run(["git", "credential", "fill"], input="protocol=https\nhost=github.com\n\n",
                         capture_output=True, text=True).stdout
    for line in out.splitlines():
        if line.startswith("password="):
            return line[9:]
    raise SystemExit("no GitHub token")


def main():
    plan_p = sys.argv[1]; dry = "--dry" in sys.argv
    plan = json.load(open(plan_p, encoding="utf-8"))
    H = {"Authorization": f"token {token()}", "Accept": "application/vnd.github+json"}
    rel, existing = {}, {}
    for tag in sorted({p["tag"] for p in plan}):
        r = requests.get(f"https://api.github.com/repos/{OWNER}/{NAME}/releases/tags/{tag}", headers=H, timeout=30)
        r.raise_for_status(); rel[tag] = r.json()
        assets, page = [], 1
        while True:
            a = requests.get(f"https://api.github.com/repos/{OWNER}/{NAME}/releases/{rel[tag]['id']}/assets",
                             headers=H, params={"per_page": 100, "page": page}, timeout=60).json()
            if not a: break
            assets += a; page += 1
        existing[tag] = {a["name"]: a for a in assets}
        new = sum(1 for p in plan if p["tag"] == tag and p["name"] not in existing[tag])
        print(f"{tag}: {len(assets)} assets now, {new} to add (limit 1000)")
        if len(assets) + new > 1000:
            raise SystemExit(f"{tag} would exceed GitHub's 1000-asset limit")
    result_p = plan_p.replace(".json", ".result.json")
    result = json.load(open(result_p, encoding="utf-8")) if os.path.exists(result_p) else {}
    for i, p in enumerate(plan, 1):
        tag, name, path = p["tag"], p["name"], p["path"]
        size = os.path.getsize(path)
        ex = existing[tag].get(name)
        if ex:
            result[name] = ex["browser_download_url"] if ex["size"] == size else f"EXISTS WITH OTHER SIZE ({ex['size']} vs {size})"
            continue
        if dry:
            continue
        ct = mimetypes.guess_type(name)[0] or "application/octet-stream"
        url = rel[tag]["upload_url"].split("{")[0]
        for attempt in range(4):
            try:
                with open(path, "rb") as f:
                    r = requests.post(url, headers={**H, "Content-Type": ct}, params={"name": name}, data=f, timeout=300)
                if r.status_code in (200, 201):
                    result[name] = r.json()["browser_download_url"]; break
                result[name] = f"ERROR {r.status_code} {r.text[:120]}"
            except Exception as ex_:
                result[name] = f"ERROR {ex_!r}"[:200]
            time.sleep(3 + 5 * attempt)
        if i % 25 == 0:
            json.dump(result, open(result_p, "w", encoding="utf-8"), indent=0, ensure_ascii=False)
            print(i, "of", len(plan), flush=True)
    json.dump(result, open(result_p, "w", encoding="utf-8"), indent=0, ensure_ascii=False)
    bad = {k: v for k, v in result.items() if not str(v).startswith("https://")}
    print("done:", sum(1 for v in result.values() if str(v).startswith("https://")), "uploaded/present,", len(bad), "problems",
          "(dry run)" if dry else "")
    for k, v in list(bad.items())[:20]:
        print("  ", k, v)


if __name__ == "__main__":
    main()
