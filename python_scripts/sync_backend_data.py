"""Copy the runtime cube JSON (cards.json + tokens.json per batch) from the repo
root into backend/public/Cube/, so the backend's deploy slug (which contains only
the backend/ subdir) can serve data from the JSON fallback when Mongo is absent.

Run this before deploying the backend so the slug ships the latest data.
"""
import glob, os, shutil

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(REPO, "public", "Cube")
DST = os.path.join(REPO, "backend", "public", "Cube")

copied = 0
for name in ("cards.json", "tokens.json"):
    for src in glob.glob(os.path.join(SRC, "*", "json", name)):
        rel = os.path.relpath(src, SRC)               # <Batch>/json/<name>
        dst = os.path.join(DST, rel)
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        shutil.copyfile(src, dst)
        copied += 1
print(f"synced {copied} JSON files into {DST}")
