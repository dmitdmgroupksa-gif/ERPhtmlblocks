"""Copy the shared DM dashboard kit into every dashboard that embeds it.

Custom HTML Blocks must be self-contained, so dashboards carry a copy of tools/erp/kit/dms-kit.js and dms-kit.css
between marker comments. Edit the kit, then run:  python tools/erp/kit/build_kit.py   (--check verifies, no writes).
"""
import pathlib
import sys

KIT = pathlib.Path(__file__).resolve().parent
REPO = KIT.parents[2]
MARK = {
    ".js": ("  /* ==== DMS kit v1 · generated from tools/erp/kit/dms-kit.js by build_kit.py — edit the kit, not this copy ==== */", "  /* ==== end DMS kit ==== */", KIT / "dms-kit.js"),
    ".css": ("/* ==== DMS kit v1 · generated from tools/erp/kit/dms-kit.css by build_kit.py — edit the kit, not this copy ==== */", "/* ==== end DMS kit ==== */", KIT / "dms-kit.css"),
}


def targets():
    for ext in MARK:
        for p in sorted(REPO.glob("*/*/dashboard" + ext)) + sorted(REPO.glob("*/*/*/dashboard" + ext)):
            if ".local" in p.parts or "legacy" in p.parts:
                continue
            raw = p.read_bytes().decode("utf-8")
            if MARK[ext][0] in raw:
                yield p, ext, raw


def build(raw, ext):
    start, end, src = MARK[ext]
    eol = "\r\n" if "\r\n" in raw else "\n"
    text = raw.replace("\r\n", "\n")
    a = text.index(start) + len(start)
    b = text.index(end, a)
    kit = src.read_text(encoding="utf-8").replace("\r\n", "\n").rstrip("\n")
    out = text[:a] + "\n" + kit + "\n" + text[b:]
    return out.replace("\n", eol)


def main():
    check = "--check" in sys.argv
    stale = []
    n = 0
    for p, ext, raw in targets():
        n += 1
        new = build(raw, ext)
        if new != raw:
            stale.append(str(p.relative_to(REPO)))
            if not check:
                p.write_bytes(new.encode("utf-8"))
    if check:
        print("kit stale: " + (", ".join(stale) if stale else "none") + " (" + str(n) + " files)")
        sys.exit(1 if stale else 0)
    print("kit updated: " + (", ".join(stale) if stale else "nothing to do") + " (" + str(n) + " files)")


if __name__ == "__main__":
    main()
