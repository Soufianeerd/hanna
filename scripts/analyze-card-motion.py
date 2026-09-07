#!/usr/bin/env python3
"""
Mesure précise de la carte sur chaque page de P12 à P26 :
- Détection des coins de la carte (couleur crème/or de la carte vs vert de l'enveloppe et fond ivoire)
- Calcul de l'angle d'inclinaison par transformée de Hough / analyse en composantes principales (PCA)
- Calcul du centre et du pourcentage d'émergence
"""

import os
import math
import numpy as np
from PIL import Image

DEV_DIR = os.path.join(os.path.dirname(__file__), '..', '.dev', 'pdf-pages')

def analyze_card_angle_and_center(page_num):
    img_path = os.path.join(DEV_DIR, f"page-{page_num:02d}.png")
    if not os.path.exists(img_path):
        return None
    img = Image.open(img_path).convert('RGB')
    arr = np.array(img)
    h, w, _ = arr.shape

    # La carte est de couleur ivoire/or clair
    # R > 220, G > 210, B > 190
    # Le fond de la page est ~ (247, 246, 240)
    # L'enveloppe est vert sauge: R ~ 100-160, G ~ 120-170, B ~ 100-150
    # Le texte sur la carte est doré / noir
    # Détectons la carte en masquant le fond extérieur (fond uniforme autour des bords)
    bg = arr[10, 10]
    is_not_bg = np.abs(arr.astype(int) - bg.astype(int)).sum(axis=2) > 30

    # L'enveloppe se trouve en bas
    # Séparons les pixels de carte (ivoire avec texte) des pixels de l'enveloppe (vert)
    r = arr[:, :, 0].astype(float)
    g = arr[:, :, 1].astype(float)
    b = arr[:, :, 2].astype(float)

    # Vert enveloppe: G > R + 5 (dominante verte)
    is_envelope = (g > r + 3) & is_not_bg

    # Carte: dominante chaude/ivoire (R >= G >= B) et pas de dominante verte
    # Et à l'intérieur du masque non-fond
    is_card = is_not_bg & (~is_envelope) & (r > 150)

    # Pour les pages 12 à 24, l'enveloppe est présente
    # Récupérons la bounding box de l'enveloppe
    env_y, env_x = np.where(is_envelope)
    if len(env_x) > 0:
        env_cx = (env_x.min() + env_x.max()) / 2
        env_cy = (env_y.min() + env_y.max()) / 2
        env_w = env_x.max() - env_x.min()
    else:
        env_cx, env_cy, env_w = w / 2, h / 2, 800

    card_y, card_x = np.where(is_card)
    if len(card_x) < 500:
        return None

    # PCA sur les coordonnées (x, y) de la carte pour trouver l'orientation principale
    pts = np.column_stack([card_x, card_y])
    mean = np.mean(pts, axis=0)
    centered = pts - mean
    cov = np.cov(centered, rowvar=False)
    evals, evecs = np.linalg.eigh(cov)

    # Axe principal
    sort_idx = np.argsort(evals)[::-1]
    evecs = evecs[:, sort_idx]
    primary_vector = evecs[:, 0]  # [dx, dy]

    # Calcul de l'angle en degrés par rapport à la verticale
    # Si le vecteur est [0, 1] ou [0, -1] -> 0° (vertical)
    # Si le vecteur est [1, 0] -> 90° (horizontal)
    dx, dy = primary_vector[0], primary_vector[1]
    angle_rad = math.atan2(dx, -abs(dy))  # angle avec la verticale pointant vers le haut
    angle_deg = math.degrees(angle_rad)

    # Décalage relatif au centre de l'enveloppe (normalisé par rapport à env_w)
    dx_norm = (mean[0] - env_cx) / env_w
    dy_norm = (mean[1] - env_cy) / env_w

    card_min_x, card_max_x = card_x.min(), card_x.max()
    card_min_y, card_max_y = card_y.min(), card_y.max()

    return {
        'page': page_num,
        'mean_x': mean[0],
        'mean_y': mean[1],
        'angle_deg': angle_deg,
        'dx_norm': dx_norm,
        'dy_norm': dy_norm,
        'bbox': (int(card_min_x), int(card_min_y), int(card_max_x), int(card_max_y)),
        'env_cx': env_cx,
        'env_cy': env_cy,
        'env_w': env_w
    }

for p in range(12, 27):
    res = analyze_card_angle_and_center(p)
    if res:
        print(f"P{p:02d}: angle={res['angle_deg']:+6.1f}°, dx_norm={res['dx_norm']:+6.3f}, dy_norm={res['dy_norm']:+6.3f}, centre=({res['mean_x']:.1f}, {res['mean_y']:.1f})")
    else:
        print(f"P{p:02d}: non déterminé automatiquement")
