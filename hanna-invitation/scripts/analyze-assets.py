#!/usr/bin/env python3
"""
scripts/analyze-assets.py
Audit automatique et géométrique des assets PNG avec Pillow.
Extrait : dimensions natives, canal alpha, bounding box visible, centre, ratios, couverture.
Sauvegarde dans docs/assets-analysis.json.
"""

import json
import os
from pathlib import Path
from PIL import Image

def analyze_image(image_path: Path):
    with Image.open(image_path) as img:
        width, height = img.size
        mode = img.mode
        has_alpha = 'A' in mode or img.info.get('transparency') is not None
        
        # Bounding box of visible non-zero alpha pixels
        bbox_visible = None
        visible_width = width
        visible_height = height
        visible_center = [width / 2.0, height / 2.0]
        coverage_pct = 100.0

        if has_alpha:
            alpha = img.convert('RGBA').split()[-1]
            # getbbox returns (left, upper, right, lower) of non-zero pixels
            bbox = alpha.getbbox()
            if bbox:
                bbox_visible = {
                    "left": bbox[0],
                    "top": bbox[1],
                    "right": bbox[2],
                    "bottom": bbox[3]
                }
                visible_width = bbox[2] - bbox[0]
                visible_height = bbox[3] - bbox[1]
                visible_center = [
                    bbox[0] + visible_width / 2.0,
                    bbox[1] + visible_height / 2.0
                ]
                
                # Approximate non-transparent pixel count
                non_zero_pixels = sum(1 for p in alpha.getdata() if p > 5)
                coverage_pct = round((non_zero_pixels / (width * height)) * 100.0, 2)
            else:
                bbox_visible = {"left": 0, "top": 0, "right": 0, "bottom": 0}
                visible_width = 0
                visible_height = 0
                visible_center = [0.0, 0.0]
                coverage_pct = 0.0
        else:
            bbox_visible = {
                "left": 0,
                "top": 0,
                "right": width,
                "bottom": height
            }

        aspect_ratio = round(width / height, 4) if height > 0 else 0
        visible_aspect_ratio = round(visible_width / visible_height, 4) if visible_height > 0 else 0

        return {
            "filename": image_path.name,
            "path": str(image_path.relative_to(image_path.parents[3])),
            "nativeWidth": width,
            "nativeHeight": height,
            "colorMode": mode,
            "hasAlpha": has_alpha,
            "aspectRatio": aspect_ratio,
            "visibleBBox": bbox_visible,
            "visibleWidth": visible_width,
            "visibleHeight": visible_height,
            "visibleAspectRatio": visible_aspect_ratio,
            "visibleCenter": visible_center,
            "canvasCoveragePercent": coverage_pct
        }

def main():
    base_dir = Path(__file__).resolve().parent.parent
    assets_dir = base_dir / "public" / "assets" / "hanna"
    docs_dir = base_dir / "docs"
    docs_dir.mkdir(parents=True, exist_ok=True)

    targets = [
        assets_dir / "envelope" / "envelope-front.png",
        assets_dir / "envelope" / "envelope-back-closed.png",
        assets_dir / "envelope" / "envelope-seal.png",
        assets_dir / "references" / "old-envelope-open.png",
        assets_dir / "envelope" / "old-envelope-pocket.png",
        assets_dir / "invitation" / "carteInvitation.png"
    ]

    results = {}
    print("=== AUDIT DES ASSETS PNG HANNA ===")
    for target in targets:
        if not target.exists():
            print(f"ATTENTION : fichier manquant : {target}")
            continue
        data = analyze_image(target)
        results[data["filename"]] = data
        print(f"\n[{data['filename']}]")
        print(f"  Dimensions natives : {data['nativeWidth']} x {data['nativeHeight']} (ratio {data['aspectRatio']})")
        print(f"  Mode : {data['colorMode']} | Alpha : {data['hasAlpha']}")
        print(f"  BBox visible : {data['visibleBBox']}")
        print(f"  Zone visible : {data['visibleWidth']} x {data['visibleHeight']} (centre : {data['visibleCenter']})")
        print(f"  Couverture canvas : {data['canvasCoveragePercent']}%")

    out_file = docs_dir / "assets-analysis.json"
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)

    print(f"\nRapport écrit dans {out_file}")

if __name__ == "__main__":
    main()
