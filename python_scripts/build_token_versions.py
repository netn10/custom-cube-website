"""Attach cross-set version history to tokens that recur across batches (e.g.
The Experiment, Memory). The current token uses the LATEST set's art; a
`versions` list records every set's art (chronological), mirroring how cards
keep historic versions. Only applied to tokens whose subtype maps to a single
catalog entry (named tokens), not multi-variant creature types."""
import json, glob, os, re
from urllib.parse import quote
from collections import defaultdict

BATCHES = [("First Batch", "Set 1", 1), ("Second Batch", "Set 2", 2),
           ("Third Batch", "Set 3", 3), ("Forth Batch", "Set 4", 4),
           ("Fifth Batch", "Set 5", 5)]
PT = re.compile(r"^\s*-?[\dX*]+/-?[\dX*+]+\s+")
CW = {"white", "blue", "black", "red", "green", "and", "colorless"}

def norm(fn):
    r = os.path.splitext(fn)[0]
    r = re.sub(r"\s*-\s*Copy.*$", "", r, flags=re.I)
    r = re.sub(r"\s*\(\d+\).*$", "", r)
    r = re.sub(r"\s*\d+\s*$", "", r)
    return r.replace("’", "'").strip().lower()

def subtype(name):
    n = PT.sub("", name).split()
    while n and n[0].lower() in CW:
        n.pop(0)
    return " ".join(n).lower()

# base name -> {set_label: (order, imageUrl)}
versions = defaultdict(dict)
for batch, label, order in BATCHES:
    d = f"public/Cube/{batch}/Tokens"
    if not os.path.isdir(d):
        continue
    for fn in sorted(os.listdir(d)):
        if not fn.lower().endswith((".png", ".jpg", ".jpeg", ".webp")):
            continue
        b = norm(fn)
        if "token" in b:
            b = b.replace(" token", "").strip()
        if label not in versions[b]:
            url = f"/Cube/{batch}/Tokens/" + quote(fn, safe="")
            versions[b][label] = (order, url)

recurring = {b: v for b, v in versions.items() if len(v) > 1}

# count catalog entries per subtype (to only version single-entry named tokens)
tok_files = glob.glob("public/Cube/*/json/tokens.json")
sub_count = defaultdict(int)
for f in tok_files:
    for t in json.load(open(f, encoding="utf-8")):
        sub_count[subtype(t["name"])] += 1

applied = 0
for f in tok_files:
    docs = json.load(open(f, encoding="utf-8")); dirty = False
    for t in docs:
        st = subtype(t["name"])
        if st in recurring and sub_count[st] == 1:
            vs = sorted(recurring[st].values())      # by set order
            ordered = [{"set": lbl, "imageUrl": url}
                       for lbl, (o, url) in sorted(recurring[st].items(), key=lambda kv: kv[1][0])]
            latest = ordered[-1]
            t["imageUrl"] = latest["imageUrl"]
            t["set"] = latest["set"]
            t["versions"] = ordered
            dirty = True; applied += 1
            print(f"  {t['name']}: versions {[v['set'] for v in ordered]} (current={latest['set']})")
    if dirty:
        json.dump(docs, open(f, "w", encoding="utf-8"), indent=2, ensure_ascii=False)
print(f"applied versioning to {applied} tokens")
print("recurring bases found:", sorted(recurring))
