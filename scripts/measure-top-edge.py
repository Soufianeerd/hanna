#!/usr/bin/env python3
"""
Différence entre chaque page et le fond fixe de l'enveloppe
pour isoler la géométrie exacte de la carte mobile.
"""

import os
import math
import numpy as np
from PIL import Image

DEV_DIR = os.path.join(os.path.dirname(__file__), '..', '.dev', 'pdf-pages')

# Let's inspect pages 12 to 26
# Let's find for each page:
# 1. The bounding box of the moving card
# 2. The top edge slope (tan angle = dy / dx) of the top edge of the card!

def measure_card_top_edge(p):
    img = Image.open(os.path.join(DEV_DIR, f"page-{p:02d}.png")).convert('RGB')
    arr = np.array(img)
    bg = arr[10, 10]
    diff = np.abs(arr.astype(int) - bg.astype(int)).sum(axis=2)
    is_not_bg = diff > 25

    # L'enveloppe
    r, g, b = arr[:, :, 0].astype(float), arr[:, :, 1].astype(float), arr[:, :, 2].astype(float)
    is_env = (g > r + 3) & is_not_bg
    is_card = is_not_bg & (~is_env) & (r > 140)

    # Récupérer les pixels de carte les plus hauts (le bord supérieur émergé)
    y_indices, x_indices = np.where(is_card)
    if len(y_indices) == 0:
        return None

    # Prenons les 5% des pixels les plus hauts pour trouver la pente du bord supérieur
    min_y = y_indices.min()
    top_band = is_card & (arr.shape[0] - y_indices.min() > 0)
    # Filtrer les pixels proches du sommet (par ex. y dans [min_y, min_y + 40])
    top_pixels_mask = is_card & (np.arange(arr.shape[0])[:, None] <= min_y + 45)
    ty, tx = np.where(top_pixels_mask)

    if len(tx) > 20:
        # Régression linéaire sur le bord supérieur : y = m * x + p
        # Pente m = dy / dx -> angle = arctan(m)
        pente, intercept = np.polyfit(tx, ty, 1)
        # Angle par rapport à l'horizontale
        angle_from_horizontal = math.degrees(math.atan(pente))
        # Si la carte est à l'horizontale (repos), son bord supérieur est horizontal -> pente = 0 -> angle = -90° par rapport à la verticale
        # Quand elle pivote, le bord supérieur s'incline
    else:
        pente = 0
        angle_from_horizontal = 0

    # Largeur de l'enveloppe pour normalisation
    ey, ex = np.where(is_env)
    env_w = ex.max() - ex.min() if len(ex) > 0 else 800
    env_cx = (ex.min() + ex.max()) / 2 if len(ex) > 0 else arr.shape[1] / 2
    env_cy = (ey.min() + ey.max()) / 2 if len(ey) > 0 else arr.shape[0] / 2

    # Centre de la carte
    card_cx = (x_indices.min() + x_indices.max()) / 2
    card_cy = (y_indices.min() + y_indices.max()) / 2
    card_w = x_indices.max() - x_indices.min()
    card_h = y_indices.max() - y_indices.min()

    # Normalisation sur le stage 820px
    scale = 820.0 / env_w
    stage_x = (card_cx - env_cx) * scale
    stage_y = (card_cy - env_cy) * scale

    return {
        'page': p,
        'min_y': min_y,
        'pente': pente,
        'edge_angle': angle_from_horizontal,
        'stage_x': stage_x,
        'stage_y': stage_y,
        'card_w': card_w * scale,
        'card_h': card_h * scale,
        'visible_top_stage_y': (min_y - env_cy) * scale
    }

print("Page | Sommet Y | Pente bord | Angle bord | Stage X | Stage Y | Carte w x h")
print("-" * 75)
for p in range(12, 27):
    r = measure_card_top_edge(p)
    if r:
        print(f"P{r['page']:02d}  | {r['visible_top_stage_y']:+8.1f} | {r['pente']:+10.4f} | {r['edge_angle']:+9.2f}° | {r['stage_x']:+7.1f} | {r['stage_y']:+7.1f} | {r['card_w']:.0f}x{r['card_h']:.0f}")
