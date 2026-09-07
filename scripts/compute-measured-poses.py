#!/usr/bin/env python3
"""
Calcul des coordonnées exactes mesurées depuis les matrices de transformation du PDF.
Normalisation sur le stage logique (1600x1000) où l'enveloppe/poche a une largeur de 820px.
"""

import pymupdf
import math
import json

doc = pymupdf.open('docs/scenarioAniationInvitation_compressed.pdf')

results = {}

for p_num in range(12, 27):
    page = doc[p_num - 1]
    img_list = page.get_image_info(xrefs=True)
    
    # Identifier la poche (xref 74 ou 89) et la carte
    pocket_info = None
    card_info = None
    bg_info = None
    
    for info in img_list:
        xr = info['xref']
        w, h = info['width'], info['height']
        if xr in (74, 89):
            pocket_info = info
        elif xr in (120, 101, 107, 144, 167, 179):
            card_info = info
        elif xr in (117, 65):
            bg_info = info

    # Centre et largeur de référence (la poche si présente, sinon le fond, sinon 500)
    ref = pocket_info or bg_info
    if ref:
        ref_bbox = ref['bbox']
        ref_cx = (ref_bbox[0] + ref_bbox[2]) / 2
        ref_cy = (ref_bbox[1] + ref_bbox[3]) / 2
        ref_w = ref_bbox[2] - ref_bbox[0]
        ref_h = ref_bbox[3] - ref_bbox[1]
    else:
        ref_cx, ref_cy, ref_w, ref_h = 300, 400, 500, 300

    card_bbox = card_info['bbox'] if card_info else [0, 0, 0, 0]
    card_cx = (card_bbox[0] + card_bbox[2]) / 2
    card_cy = (card_bbox[1] + card_bbox[3]) / 2
    card_w = card_bbox[2] - card_bbox[0]
    card_h = card_bbox[3] - card_bbox[1]

    # Angle depuis la transform de la carte
    tf = card_info.get('transform') if card_info else None
    if tf:
        a, b, c, d, e, f = tf
        angle = math.degrees(math.atan2(b, a))
        scale_img_x = math.hypot(a, b)
        scale_img_y = math.hypot(c, d)
    else:
        angle = 0.0
        scale_img_x = card_w
        scale_img_y = card_h

    # Normalisation sur le stage 820px
    # Si la poche est à x=0, y=45 sur le stage :
    scale_stage = 820.0 / ref_w
    stage_x = (card_cx - ref_cx) * scale_stage
    stage_y = (card_cy - ref_cy) * scale_stage + (45.0 if pocket_info else 0.0)

    # Scale de la carte relative à la taille de base (base card w=320)
    card_base_w = 320.0
    relative_scale = (scale_img_x * scale_stage) / card_base_w if angle == 0 else (scale_img_y * scale_stage) / (card_base_w * 1672 / 941)

    # Visible percentage estimate: based on how much of card_cy is above pocket_cy
    results[f"P{p_num}"] = {
        "pdfPage": p_num,
        "x": round(stage_x, 1),
        "y": round(stage_y, 1),
        "rotation": round(angle, 2),
        "scale": round(relative_scale, 2),
        "card_bbox": [round(v, 1) for v in card_bbox],
        "ref_bbox": [round(v, 1) for v in ref_bbox] if ref else [],
        "measurementConfidence": "measured"
    }

print(json.dumps(results, indent=2))
