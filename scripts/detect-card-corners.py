#!/usr/bin/env python3
"""
Détection rigoureuse des 4 coins de la carte d'invitation dans les pages P12 à P26.
Permet d'obtenir :
- L'angle de rotation exact du rectangle (en degrés)
- Le centre (x, y) de la carte
- Les dimensions apparentes (largeur x hauteur)
"""

import os
import math
import numpy as np
from PIL import Image

DEV_DIR = os.path.join(os.path.dirname(__file__), '..', '.dev', 'pdf-pages')

def get_card_corners(p):
    img_path = os.path.join(DEV_DIR, f"page-{p:02d}.png")
    if not os.path.exists(img_path):
        return None
    img = Image.open(img_path).convert('RGB')
    arr = np.array(img)
    h, w, _ = arr.shape

    # Fond page ~ (247, 246, 240)
    bg = arr[10, 10]
    diff = np.abs(arr.astype(int) - bg.astype(int)).sum(axis=2)
    is_not_bg = diff > 25

    # Carte: pixels couleur crème / or (teinte chaude)
    r = arr[:, :, 0].astype(float)
    g = arr[:, :, 1].astype(float)
    b = arr[:, :, 2].astype(float)

    # L'enveloppe est vert sauge: (g > r + 3)
    is_envelope = (g > r + 4) & is_not_bg
    is_card = is_not_bg & (~is_envelope) & (r > 150) & (b < 230)

    # On récupère tous les pixels de la carte
    cy, cx = np.where(is_card)
    if len(cx) < 500:
        return None

    # Enveloppe bounds
    ey, ex = np.where(is_envelope)
    if len(ex) > 0:
        env_cx = (ex.min() + ex.max()) / 2
        env_cy = (ey.min() + ey.max()) / 2
        env_w = ex.max() - ex.min()
        env_h = ey.max() - ey.min()
    else:
        env_cx, env_cy, env_w, env_h = w/2, h/2, 800, 500

    # Bounding box orientée minimale (min-area bounding box)
    # Pour un nuage de points 2D, testons les angles de -90° à +10° par pas de 0.5°
    best_area = float('inf')
    best_angle = 0
    best_center = (0, 0)
    best_dim = (0, 0)

    # Échantillonnage pour vitesse
    step = max(1, len(cx) // 5000)
    pts = np.column_stack([cx[::step], cy[::step]])

    for angle_deg in np.linspace(-95, 10, 211):
        rad = math.radians(angle_deg)
        cos_a, sin_a = math.cos(rad), math.sin(rad)
        # Rotation des points
        rx = pts[:, 0] * cos_a - pts[:, 1] * sin_a
        ry = pts[:, 0] * sin_a + pts[:, 1] * cos_a

        w_box = rx.max() - rx.min()
        h_box = ry.max() - ry.min()
        area = w_box * h_box

        if area < best_area:
            best_area = area
            best_angle = angle_deg
            rcx = (rx.min() + rx.max()) / 2
            rcy = (ry.min() + ry.max()) / 2
            # Inverse rotation pour le centre
            orig_cx = rcx * cos_a + rcy * sin_a
            orig_cy = -rcx * sin_a + rcy * cos_a
            best_center = (orig_cx, orig_cy)
            best_dim = (w_box, h_box)

    # Normalisation par rapport à l'enveloppe
    # Stage width = 820 px pour l'enveloppe
    stage_env_w = 820.0
    scale_factor = stage_env_w / env_w
    norm_x = (best_center[0] - env_cx) * scale_factor
    norm_y = (best_center[1] - env_cy) * scale_factor

    return {
        'page': p,
        'angle_deg': round(best_angle, 1),
        'dim': (round(best_dim[0]), round(best_dim[1])),
        'center_px': (round(best_center[0], 1), round(best_center[1], 1)),
        'stage_x': round(norm_x, 1),
        'stage_y': round(norm_y, 1),
        'env_w': round(env_w),
        'env_h': round(env_h)
    }

print("Page | Angle | Stage X | Stage Y | Dim visible (w x h)")
print("-" * 55)
for p in range(12, 27):
    res = get_card_corners(p)
    if res:
        print(f"P{res['page']:02d}  | {res['angle_deg']:+5.1f}° | {res['stage_x']:+7.1f} | {res['stage_y']:+7.1f} | {res['dim'][0]}x{res['dim'][1]}")
    else:
        print(f"P{p:02d}  | N/A")
