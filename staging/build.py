"""Build a public staging asset tree without publishing repository-only files."""
from pathlib import Path
import fnmatch
import hashlib
import json
import re
import shutil
import subprocess


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "dist-staging"
MARKER = ".rancana-staging-generated"
ALLOWED = {".html", ".css", ".js", ".svg", ".png", ".jpg", ".jpeg", ".webp", ".ico", ".woff", ".woff2"}


def ignored(name, patterns):
    basename = Path(name).name
    return any(
        fnmatch.fnmatchcase(name, pattern)
        or fnmatch.fnmatchcase(basename, pattern)
        or name.startswith(pattern.rstrip("/") + "/")
        for pattern in patterns
    )


def build():
    if OUT.exists():
        if OUT.is_symlink() or not (OUT / MARKER).is_file() or (OUT / MARKER).read_text() != "rancana staging build\n":
            raise SystemExit("Refusing to replace dist-staging without its generated-output marker")
        shutil.rmtree(OUT)
    OUT.mkdir()

    patterns = [
        line.strip().rstrip("/")
        for line in (ROOT / ".assetsignore").read_text().splitlines()
        if line.strip() and not line.lstrip().startswith("#")
    ]
    tracked = subprocess.check_output(["git", "ls-files", "-z"], cwd=ROOT).decode().split("\0")
    for name in tracked:
        if not name or name in {"robots.txt", "sitemap.xml", "analytics-config.js", "analytics-consent.js"}:
            continue
        src = ROOT / name
        if src.suffix.lower() not in ALLOWED or not src.is_file() or ignored(name, patterns):
            continue
        dest = OUT / name
        dest.parent.mkdir(parents=True, exist_ok=True)
        if src.suffix.lower() == ".html":
            html = src.read_text()
            html = re.sub(r'<meta\b[^>]*\bname=["\']robots["\'][^>]*>', "", html, flags=re.I)
            html = re.sub(
                r"<head\b[^>]*>",
                lambda match: match[0] + '<meta name="robots" content="noindex,nofollow,noarchive"><link rel="stylesheet" href="/staging-preview.css">',
                html,
                count=1,
                flags=re.I,
            )
            html = re.sub(
                r"<body\b[^>]*>",
                lambda match: match[0] + '<aside class="staging-notice" aria-label="Testing environment">STAGING · Review only · Analytics off</aside>',
                html,
                count=1,
                flags=re.I,
            )
            html = re.sub(
                r'<script\b[^>]*\bsrc=["\'](?:https?:)?//[^>]*>.*?</script>',
                "",
                html,
                flags=re.I | re.S,
            )
            dest.write_text(html)
        else:
            shutil.copyfile(src, dest)

    (OUT / "analytics-config.js").write_text('window.RancanaAnalyticsConfig = Object.freeze({measurementId: ""});\n')
    (OUT / "analytics-consent.js").write_text("// Staging only: analytics disabled.\n")
    (OUT / "robots.txt").write_text("User-agent: *\nDisallow: /\n")
    (OUT / "staging-preview.css").write_text(
        ".staging-notice{position:fixed;bottom:8px;left:50%;transform:translateX(-50%);z-index:2147483647;"
        "box-sizing:border-box;max-width:calc(100% - 16px);padding:7px 12px;border:1px solid #3b5b42;"
        "border-radius:8px;background:#f0f7ee;color:#183820;font:600 12px/1.4 system-ui;text-align:center;"
        "pointer-events:none}body{padding-bottom:48px}\n"
    )
    (OUT / MARKER).write_text("rancana staging build\n")
    (OUT / ".assetsignore").write_text(f"{MARKER}\n.assetsignore\n")

    manifest = {
        str(path.relative_to(OUT)): hashlib.sha256(path.read_bytes()).hexdigest()
        for path in sorted(OUT.rglob("*"))
        if path.is_file() and path.name not in {MARKER, ".assetsignore"}
    }
    evidence = ROOT / "review-evidence" / "staging"
    evidence.mkdir(parents=True, exist_ok=True)
    (evidence / "manifest.json").write_text(
        json.dumps({"commit": subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT).decode().strip(), "files": manifest}, indent=2) + "\n"
    )
    print(f"Staging build: {len(manifest)} public files in {OUT}")


if __name__ == "__main__":
    build()
