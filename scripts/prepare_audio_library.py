#!/usr/bin/env python3
"""Prepare OpenScreen audio assets from local source folders.

This script:
1) Cleans and normalizes file names (no spaces, kebab-case).
2) Classifies each file by rough audio type.
3) Copies files into project library folders with clean names.
4) Generates src/lib/audioLibrary.json manifest.

Example:
python scripts/prepare_audio_library.py \
  --sfx-src "C:/Users/khalk/Downloads/Sound Sfx file by apanvid 3/Sound Sfx file by apanvid 3.0/Sound Sfx file by apanvid 3.0" \
  --music-src "C:/Users/khalk/Downloads/music" \
  --project-root "C:/D_DRIVE/AARYASH/Code_PlayGround/openscreen"
"""

from __future__ import annotations

import argparse
import json
import re
import shutil
from collections import defaultdict
from pathlib import Path
from typing import Dict, Iterable, List, Tuple

AUDIO_EXTS = {".mp3", ".wav", ".m4a", ".aac", ".ogg", ".flac", ".webm"}

GARBAGE_TOKENS = {
    "sfx",
    "sound",
    "effect",
    "effects",
    "copyright",
    "free",
    "lossless",
    "mp3",
    "160k",
    "y2mate",
    "official",
    "audio",
    "hd",
}

SFX_KEYWORDS: Dict[str, Tuple[str, ...]] = {
    "whoosh": ("whoosh", "woosh", "swish", "swoosh", "transition"),
    "click": ("click", "button", "tap", "switch"),
    "pop": ("pop", "bubble", "blip"),
    "glitch": ("glitch", "digital", "static", "distort"),
    "alarm": ("alarm", "beep", "countdown", "ticking", "clock"),
    "coin": ("coin", "cash", "money", "register", "kaching"),
    "typing": ("typing", "keyboard", "typewriter"),
    "hit": ("hit", "impact", "boom", "thud", "drop"),
    "camera": ("camera", "shutter", "flash"),
    "notification": ("notify", "notification", "ding", "bell", "chime", "highlight"),
}

MUSIC_KEYWORDS: Dict[str, Tuple[str, ...]] = {
    "lofi": ("lofi", "chill"),
    "ambient": ("ambient", "atmos", "drone"),
    "corporate": ("corporate", "promotional", "business"),
    "podcast": ("podcast",),
    "upbeat": ("upbeat", "bounce", "energetic"),
    "cinematic": ("cinematic", "epic", "trailer"),
    "rock": ("rock",),
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Prepare and clean OpenScreen audio library files")
    parser.add_argument("--sfx-src", type=Path, required=False, help="Source folder containing SFX files")
    parser.add_argument("--music-src", type=Path, required=False, help="Source folder containing music files")
    parser.add_argument("--project-root", type=Path, required=True, help="OpenScreen project root")
    parser.add_argument(
        "--rename-in-place",
        action="store_true",
        help="Rename source files in-place as well (in addition to copying into project library)",
    )
    return parser.parse_args()


def audio_files(source: Path) -> Iterable[Path]:
    for p in sorted(source.rglob("*")):
        if p.is_file() and p.suffix.lower() in AUDIO_EXTS:
            yield p


def cleanup_base_name(raw: str) -> str:
    value = raw.lower()
    value = re.sub(r"\([^)]*\)", " ", value)
    value = re.sub(r"\[[^\]]*\]", " ", value)
    value = re.sub(r"\b(?:sba|fk)[-_]?\d+\b", " ", value)
    value = value.replace("&", " and ")
    value = re.sub(r"[^a-z0-9]+", "-", value)
    value = re.sub(r"-{2,}", "-", value).strip("-")

    parts = [p for p in value.split("-") if p and p not in GARBAGE_TOKENS and not p.isdigit()]
    return "-".join(parts) if parts else "audio"


def classify(base_name: str, mapping: Dict[str, Tuple[str, ...]], fallback: str) -> str:
    for kind, keywords in mapping.items():
        if any(k in base_name for k in keywords):
            return kind
    return fallback


def ensure_dir(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)


def format_display_name(stem: str, category: str) -> str:
    # Keep technical prefixes in fileName, but show cleaner UI names.
    if category == "hooks" and stem.startswith("openscreen-sfx-"):
        stem = stem[len("openscreen-sfx-") :]
    return stem.replace("-", " ").title()


def clear_directory(path: Path) -> None:
    if not path.exists():
        return
    for child in path.iterdir():
        if child.is_file():
            child.unlink(missing_ok=True)
        elif child.is_dir():
            shutil.rmtree(child)


def process_collection(
    source: Path,
    destination: Path,
    category: str,
    classifier: Dict[str, Tuple[str, ...]],
    fallback_kind: str,
    name_prefix: str,
    rename_in_place: bool,
) -> List[dict]:
    ensure_dir(destination)
    counters: Dict[str, int] = defaultdict(int)
    manifest_rows: List[dict] = []

    for file_path in audio_files(source):
        clean = cleanup_base_name(file_path.stem)
        kind = classify(clean, classifier, fallback_kind)
        counters[kind] += 1
        idx = counters[kind]

        ext = file_path.suffix.lower()
        if category == "music":
            out_name = f"openscreen-{kind}-{idx:03d}{ext}"
        else:
            out_name = f"{name_prefix}-{kind}-{idx:03d}{ext}"

        out_path = destination / out_name
        shutil.copy2(file_path, out_path)

        if rename_in_place:
            in_place_name = out_name
            in_place_path = file_path.with_name(in_place_name)
            if in_place_path != file_path and not in_place_path.exists():
                file_path.rename(in_place_path)

        url = f"/audio/library/{category}/{out_name}"
        manifest_rows.append(
            {
                "id": out_name.rsplit(".", 1)[0],
                "name": format_display_name(out_name.rsplit(".", 1)[0], category),
                "fileName": out_name,
                "url": url,
                "category": "music" if category == "music" else "hook",
                "tags": [category, kind],
            }
        )

    return manifest_rows


def manifest_rows_from_existing(
    library_dir: Path,
    category: str,
    classifier: Dict[str, Tuple[str, ...]],
    fallback_kind: str,
) -> List[dict]:
    if not library_dir.exists():
        return []

    rows: List[dict] = []
    for file_path in audio_files(library_dir):
        clean = cleanup_base_name(file_path.stem)
        kind = classify(clean, classifier, fallback_kind)
        file_name = file_path.name

        rows.append(
            {
                "id": file_path.stem,
                "name": format_display_name(file_path.stem, category),
                "fileName": file_name,
                "url": f"/audio/library/{category}/{file_name}",
                "category": "music" if category == "music" else "hook",
                "tags": [category, kind],
            }
        )

    return rows


def write_manifest(path: Path, rows: List[dict]) -> None:
    rows_sorted = sorted(rows, key=lambda item: (item["category"], item["fileName"]))
    path.write_text(json.dumps(rows_sorted, indent=2), encoding="utf-8")


def main() -> int:
    args = parse_args()
    project_root: Path = args.project_root.resolve()

    out_root = project_root / "public" / "audio" / "library"
    hooks_out = out_root / "hooks"
    music_out = out_root / "music"
    manifest_path = project_root / "src" / "lib" / "audioLibrary.json"

    ensure_dir(out_root)
    ensure_dir(hooks_out)
    ensure_dir(music_out)

    rows: List[dict] = []
    has_source_inputs = bool(args.sfx_src or args.music_src)

    if has_source_inputs:
        if args.sfx_src:
            sfx_src = args.sfx_src.resolve()
            if not sfx_src.exists():
                raise FileNotFoundError(f"SFX source not found: {sfx_src}")
            clear_directory(hooks_out)
            rows.extend(
                process_collection(
                    source=sfx_src,
                    destination=hooks_out,
                    category="hooks",
                    classifier=SFX_KEYWORDS,
                    fallback_kind="misc",
                    name_prefix="openscreen-sfx",
                    rename_in_place=args.rename_in_place,
                )
            )
        else:
            rows.extend(
                manifest_rows_from_existing(
                    library_dir=hooks_out,
                    category="hooks",
                    classifier=SFX_KEYWORDS,
                    fallback_kind="misc",
                )
            )

        if args.music_src:
            music_src = args.music_src.resolve()
            if not music_src.exists():
                raise FileNotFoundError(f"Music source not found: {music_src}")
            clear_directory(music_out)
            rows.extend(
                process_collection(
                    source=music_src,
                    destination=music_out,
                    category="music",
                    classifier=MUSIC_KEYWORDS,
                    fallback_kind="track",
                    name_prefix="openscreen-music",
                    rename_in_place=args.rename_in_place,
                )
            )
        else:
            rows.extend(
                manifest_rows_from_existing(
                    library_dir=music_out,
                    category="music",
                    classifier=MUSIC_KEYWORDS,
                    fallback_kind="track",
                )
            )
    else:
        rows.extend(
            manifest_rows_from_existing(
                library_dir=hooks_out,
                category="hooks",
                classifier=SFX_KEYWORDS,
                fallback_kind="misc",
            )
        )
        rows.extend(
            manifest_rows_from_existing(
                library_dir=music_out,
                category="music",
                classifier=MUSIC_KEYWORDS,
                fallback_kind="track",
            )
        )

    write_manifest(manifest_path, rows)

    print(f"Wrote {len(rows)} audio entries to {manifest_path}")
    print(f"Hooks output: {hooks_out}")
    print(f"Music output: {music_out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
