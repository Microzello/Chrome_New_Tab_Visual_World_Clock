import gzip
import re
import sys
import unicodedata
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path

from PIL import Image

Image.MAX_IMAGE_PIXELS = None

ROOT = Path(__file__).resolve().parent.parent
SKIP_FEATURES = {"PPLX", "PPLH", "PPLQ", "PPLW", "PPLCH"}
ALT_MIN_POP = 750_000
ALT_MAX = 60
ASCII_ALT = re.compile(r"^[A-Z][A-Za-z.'\-]*( [A-Za-z.'\-]+){0,2}$")
DISTRICT = re.compile(r" \d{1,2}[A-Z]?( |$)|\(Kreis \d+\)")


def fold(text):
    text = "".join(c for c in unicodedata.normalize("NFD", text) if not unicodedata.combining(c)).lower()
    return re.sub(r"[.'\u2019`]", "", text)


def resize(src, size, mode):
    img = Image.open(src)
    img.draft("RGB", (int(size[0] * 1.2), int(size[1] * 1.2)))
    img = img.convert("RGB").resize(size, Image.LANCZOS)
    return img.convert("L") if mode == "L" else img


def build_image(job):
    src, name, mode, quality = job
    path = ROOT / "img" / f"{name}.webp"
    resize(src, (4096, 2048), mode).save(path, "WEBP", quality=quality, method=6)
    print(path.name, path.stat().st_size // 1024, "KB", flush=True)


def build_images(dl):
    (ROOT / "img").mkdir(exist_ok=True)
    jobs = [(dl / "night.jpg", "lights", "L", 88)]
    jobs += [(dl / f"day_{m:02d}.jpg", f"day_{m:02d}", "RGB", 84) for m in range(1, 13)]
    with ProcessPoolExecutor(max_workers=4) as pool:
        list(pool.map(build_image, jobs))


def build_cities(dl):
    admin1 = {}
    for line in (dl / "admin1CodesASCII.txt").read_text(encoding="utf-8").splitlines():
        parts = line.split("\t")
        if len(parts) >= 2:
            admin1[parts[0]] = parts[1]

    rows = []
    for line in (dl / "cities1000.txt").open(encoding="utf-8"):
        f = line.rstrip("\n").split("\t")
        if f[7] in SKIP_FEATURES or not f[17] or DISTRICT.search(f[1]):
            continue
        rows.append(f)
    rows.sort(key=lambda f: -int(f[14] or 0))

    tzs, tz_index = [], {}
    regions, region_index = [], {}
    out_lines = []
    for f in rows:
        name, ascii_name, alts = f[1], f[2], f[3]
        lat, lon, cc, a1, pop, tz = f[4], f[5], f[8], f[10], int(f[14] or 0), f[17]
        if tz not in tz_index:
            tz_index[tz] = len(tzs)
            tzs.append(tz)
        region = admin1.get(f"{cc}.{a1}", "")
        if region not in region_index:
            region_index[region] = len(regions)
            regions.append(region)
        alt_out = []
        if pop >= ALT_MIN_POP and alts:
            seen = {name.lower(), ascii_name.lower()}
            for a in alts.split(","):
                key = a.lower()
                if key not in seen and ASCII_ALT.match(a):
                    seen.add(key)
                    alt_out.append(a)
                if len(alt_out) >= ALT_MAX:
                    break
        out_lines.append("\t".join((
            name,
            "" if fold(name) == fold(ascii_name) else ascii_name,
            "|".join(alt_out),
            cc,
            str(region_index[region]),
            f"{float(lat):.2f}".rstrip("0").rstrip("."),
            f"{float(lon):.2f}".rstrip("0").rstrip("."),
            str(tz_index[tz]),
        )))

    data = "\n".join(["\t".join(tzs), "\t".join(regions), *out_lines])
    path = ROOT / "data" / "cities.tsv.gz"
    path.parent.mkdir(exist_ok=True)
    path.write_bytes(gzip.compress(data.encode("utf-8"), 9, mtime=0))
    print(path.name, len(out_lines), "places", len(data) // 1024, "KB raw", path.stat().st_size // 1024, "KB gz")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit("usage: python tools/build_assets.py <dir with day_01.jpg..day_12.jpg, night.jpg, cities1000.txt, admin1CodesASCII.txt>")
    dl = Path(sys.argv[1])
    build_cities(dl)
    build_images(dl)
