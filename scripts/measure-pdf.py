#!/usr/bin/env python3
"""
Script d'analyse et de mesure pixel rigoureuse :
- Mesure du sceau sur Page 2
- Mesures de référence sur Page 4 (enveloppe ouverte)
- Mesures réelles de la carte P12 -> P26
"""

import os
import math
import numpy as np
from PIL import Image

DEV_DIR = os.path.join(os.path.dirname(__file__), '..', '.dev', 'pdf-pages')
ASSETS_DIR = os.path.join(os.path.dirname(__file__), '..', 'assets', 'hanna')

def analyze_page_02_seal():
    """Analyse de la position du sceau sur la page 2 (dos fermé)."""
    p2 = Image.open(os.path.join(DEV_DIR, 'page-02.png')).convert('RGB')
    arr = np.array(p2)
    h, w, _ = arr.shape

    # Fond ivoire ~ (247, 246, 240) ou similaire.
    # Détecter la bounding box de l'enveloppe
    bg = arr[10, 10]
    diff = np.abs(arr.astype(int) - bg.astype(int)).sum(axis=2)
    mask = diff > 25
    y_indices, x_indices = np.where(mask)
    env_left, env_top, env_right, env_bottom = x_indices.min(), y_indices.min(), x_indices.max(), y_indices.max()
    env_w = env_right - env_left
    env_h = env_bottom - env_top
    env_cx = (env_left + env_right) / 2
    env_cy = (env_top + env_bottom) / 2

    # Sceau doré : teinte dorée/brune caractéristique
    # Le sceau est au milieu du dos
    # Détection de la zone dorée du sceau (pixels plus chauds/dorés au centre)
    r = arr[:, :, 0].astype(float)
    g = arr[:, :, 1].astype(float)
    b = arr[:, :, 2].astype(float)

    # Sceau : r > 160, g > 130, b < 100 dans la région centrale
    seal_mask = (r > 150) & (g > 120) & (b < 110) & (diff > 40)
    # Restreindre autour du centre de l'enveloppe
    cy_min, cy_max = int(env_cy - env_h * 0.3), int(env_cy + env_h * 0.3)
    cx_min, cx_max = int(env_cx - env_w * 0.2), int(env_cx + env_w * 0.2)
    region_seal = seal_mask[cy_min:cy_max, cx_min:cx_max]
    sy, sx = np.where(region_seal)

    if len(sy) > 0:
        seal_left = cx_min + sx.min()
        seal_right = cx_min + sx.max()
        seal_top = cy_min + sy.min()
        seal_bottom = cy_min + sy.max()
        seal_w = seal_right - seal_left
        seal_h = seal_bottom - seal_top
        seal_cx = (seal_left + seal_right) / 2
        seal_cy = (seal_top + seal_bottom) / 2

        rel_x = (seal_cx - env_cx) / env_w
        rel_y = (seal_cy - env_cy) / env_h
        rel_size = seal_w / env_w

        print(f"=== PAGE 02 — SCEAU ===")
        print(f"Enveloppe : bbox=({env_left}, {env_top}, {env_right}, {env_bottom}), taille={env_w}x{env_h}, centre=({env_cx:.1f}, {env_cy:.1f})")
        print(f"Sceau : bbox=({seal_left}, {seal_top}, {seal_right}, {seal_bottom}), taille={seal_w}x{seal_h}, centre=({seal_cx:.1f}, {seal_cy:.1f})")
        print(f"Décalage relatif centre enveloppe : dx={rel_x:.4f} * env_w, dy={rel_y:.4f} * env_h")
        print(f"Diamètre relatif sceau/enveloppe : {rel_size:.4f} ({rel_size*100:.1f}%)")
    else:
        print("Sceau non isolé automatiquement par seuillage strict.")

def analyze_open_reference():
    """Analyse réelle des mesures sur old-envelope-open.png."""
    ref_path = os.path.join(ASSETS_DIR, 'archive', 'old-envelope-open.png')
    img = Image.open(ref_path)
    alpha = np.array(img.split()[-1])
    rgb = np.array(img.convert('RGB'))

    # BBox visible
    y_idx, x_idx = np.where(alpha > 10)
    left, top, right, bottom = x_idx.min(), y_idx.min(), x_idx.max(), y_idx.max()
    vis_w = right - left
    vis_h = bottom - top
    cx = (left + right) / 2
    cy = (top + bottom) / 2

    # Ligne de poche : là où la découpe de poche commence (profil en V)
    # L'intérieur blanc est visible au-dessus de la poche
    # Trouvons la transition entre l'intérieur blanc/beige et le vert de la poche
    # Au centre horizontal cx:
    center_col_rgb = rgb[:, int(cx)]
    center_col_alpha = alpha[:, int(cx)]

    # Vert olive de la poche : R ~ 90-140, G ~ 100-150, B ~ 80-130
    # Intérieur blanc/ivoire : R > 200, G > 190, B > 180
    pocket_v_notch_y = None
    for y in range(top, bottom):
        r, g, b = center_col_rgb[y]
        if center_col_alpha[y] > 128:
            # Pointe du V au centre
            if r < 160 and g < 160 and b < 150 and y > top + vis_h * 0.4:
                pocket_v_notch_y = y
                break

    # Sommet du rabat : top de la bbox visible
    flap_apex_y = top
    bottom_y = bottom

    print(f"\n=== OLD ENVELOPE OPEN — MESURES RÉELLES ===")
    print(f"Image native : {img.size[0]}x{img.size[1]}")
    print(f"BBox visible : left={left}, top={top}, right={right}, bottom={bottom}")
    print(f"Dimensions visibles : {vis_w} x {vis_h} (ratio={vis_w/vis_h:.4f})")
    print(f"Centre visible : ({cx:.1f}, {cy:.1f})")
    print(f"Sommet rabat Y : {flap_apex_y} (décalage au centre = {flap_apex_y - cy} px)")
    print(f"Pointe V poche Y : {pocket_v_notch_y} (décalage au centre = {pocket_v_notch_y - cy} px)")
    print(f"Bas enveloppe Y : {bottom_y} (décalage au centre = {bottom_y - cy} px)")
    print(f"Hauteur poche (V au bas) : {bottom_y - pocket_v_notch_y} px")
    print(f"Hauteur rabat (sommet au V) : {pocket_v_notch_y - flap_apex_y} px")

def analyze_card_pages():
    """Analyse de la position et de l'angle de la carte sur P12 -> P26."""
    print(f"\n=== MESURE DES PAGES P12 À P26 ===")
    for p in range(12, 27):
        img_path = os.path.join(DEV_DIR, f"page-{p:02d}.png")
        if not os.path.exists(img_path):
            continue
        img = Image.open(img_path).convert('RGB')
        arr = np.array(img)
        bg = arr[10, 10]
        diff = np.abs(arr.astype(int) - bg.astype(int)).sum(axis=2)
        mask = diff > 25
        y_idx, x_idx = np.where(mask)
        if len(x_idx) == 0:
            continue
        left, top, right, bottom = x_idx.min(), y_idx.min(), x_idx.max(), y_idx.max()
        pw, ph = right - left, bottom - top
        pcx, pcy = (left + right) / 2, (top + bottom) / 2

        print(f"Page {p:02d}: BBox=({left}, {top}, {right}, {bottom}), Dim={pw}x{ph}, Centre=({pcx:.1f}, {pcy:.1f})")

if __name__ == '__main__':
    analyze_page_02_seal()
    analyze_open_reference()
    analyze_card_pages()
