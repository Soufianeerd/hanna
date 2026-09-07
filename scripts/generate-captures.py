#!/usr/bin/env python3
"""
Génération des captures visuelles de validation géométrique :
- N : FRONT / BACK OVERLAY (superposition 50/50 et boîte physique 820x490)
- O : P12 (carte au fond, rotation -90°)
- P : P16 (carte pivot 32°, engagée)
- Q : P20 (carte verticale 0°, ascension haute)
- R : P24 (carte seuil de sortie)
- S : P26 (carte finale autonome centrée)
"""

import os
import math
from PIL import Image, ImageDraw, ImageFont

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS_DIR = os.path.join(BASE_DIR, 'assets', 'hanna')
CAPTURES_DIR = os.path.join(BASE_DIR, '.dev', 'captures')
os.makedirs(CAPTURES_DIR, exist_ok=True)

STAGE_W, STAGE_H = 1600, 1000
CENTER_X, CENTER_Y = STAGE_W // 2, STAGE_H // 2

# Assets
img_front = Image.open(os.path.join(ASSETS_DIR, 'envelope', 'envelope-front.png')).convert('RGBA')
img_back = Image.open(os.path.join(ASSETS_DIR, 'envelope', 'envelope-back-closed.png')).convert('RGBA')
img_seal = Image.open(os.path.join(ASSETS_DIR, 'envelope', 'envelope-seal.png')).convert('RGBA')
img_pocket = Image.open(os.path.join(ASSETS_DIR, 'archive', 'old-envelope-pocket.png')).convert('RGBA')
img_card = Image.open(os.path.join(ASSETS_DIR, 'invitation', 'carteInvitation.png')).convert('RGBA')

# Target physical dimensions
# Front: 836.89 x 506.32, x=+0.27, y=-8.16
front_w, front_h = 837, 506
front_x, front_y = int(CENTER_X + 0.27 - front_w / 2), int(CENTER_Y - 8.16 - front_h / 2)
front_resized = img_front.resize((front_w, front_h), Image.Resampling.LANCZOS)

# Back: 848.94 x 496.86, x=-0.25, y=+3.43
back_w, back_h = 849, 497
back_x, back_y = int(CENTER_X - 0.25 - back_w / 2), int(CENTER_Y + 3.43 - back_h / 2)
back_resized = img_back.resize((back_w, back_h), Image.Resampling.LANCZOS)

# Pocket: same as front, y shifted by +45
pocket_w, pocket_h = front_w, front_h
pocket_x, pocket_y = front_x, front_y + 45
pocket_resized = img_pocket.resize((pocket_w, pocket_h), Image.Resampling.LANCZOS)

# Seal: 76x76 at x=0, y=93.1
seal_w, seal_h = 76, 76
seal_x, seal_y = int(CENTER_X - seal_w / 2), int(CENTER_Y + 93.1 - seal_h / 2)
seal_resized = img_seal.resize((seal_w, seal_h), Image.Resampling.LANCZOS)

def create_base_canvas():
    canvas = Image.new('RGBA', (STAGE_W, STAGE_H), (11, 12, 14, 255))
    draw = ImageDraw.Draw(canvas)
    # Draw subtle grid
    for x in range(0, STAGE_W, 100):
        draw.line([(x, 0), (x, STAGE_H)], fill=(25, 30, 38, 255), width=1)
    for y in range(0, STAGE_H, 100):
        draw.line([(0, y), (STAGE_W, y)], fill=(25, 30, 38, 255), width=1)
    # Axes
    draw.line([(0, CENTER_Y), (STAGE_W, CENTER_Y)], fill=(56, 189, 248, 80), width=1)
    draw.line([(CENTER_X, 0), (CENTER_X, STAGE_H)], fill=(56, 189, 248, 80), width=1)
    return canvas

# --- N : FRONT / BACK OVERLAY ---
canvas_n = create_base_canvas()
# Back at 50% opacity
back_50 = back_resized.copy()
b_alpha = back_50.split()[-1].point(lambda p: p * 0.5)
back_50.putalpha(b_alpha)
canvas_n.paste(back_50, (back_x, back_y), back_50)

# Front at 50% opacity
front_50 = front_resized.copy()
f_alpha = front_50.split()[-1].point(lambda p: p * 0.5)
front_50.putalpha(f_alpha)
canvas_n.paste(front_50, (front_x, front_y), front_50)

# Draw Physical bounds box (820 x 490)
draw_n = ImageDraw.Draw(canvas_n)
box_left, box_top = CENTER_X - 410, CENTER_Y - 245
box_right, box_bottom = CENTER_X + 410, CENTER_Y + 245
draw_n.rectangle([box_left, box_top, box_right, box_bottom], outline=(197, 168, 128, 255), width=2)
canvas_n.save(os.path.join(CAPTURES_DIR, 'capture_N_front_back_overlay.png'))
print("✓ Capture N générée : capture_N_front_back_overlay.png")

# Function to render a card pose
def render_pose(pose_name, x_offset, y_offset, rotation_deg, scale_val, is_final=False):
    canvas = create_base_canvas()
    card_base_w, card_base_h = 320, 569
    curr_card_w = int(card_base_w * scale_val)
    curr_card_h = int(card_base_h * scale_val)
    card_scaled = img_card.resize((curr_card_w, curr_card_h), Image.Resampling.LANCZOS)
    
    # Rotation (expand=True pour ne pas clipper)
    card_rot = card_scaled.rotate(-rotation_deg, resample=Image.Resampling.BICUBIC, expand=True)
    rot_w, rot_h = card_rot.size
    
    paste_x = int(CENTER_X + x_offset - rot_w / 2)
    paste_y = int(CENTER_Y + y_offset - rot_h / 2)
    
    # 1. Card (clippée au bas de l'enveloppe si dans la poche)
    if not is_final:
        # L'enveloppe a son fond fermé à CENTER_Y + 245px
        card_bottom_limit = CENTER_Y + 245
        if paste_y + rot_h > card_bottom_limit:
            crop_h = card_bottom_limit - paste_y
            if crop_h > 0:
                card_rot = card_rot.crop((0, 0, rot_w, crop_h))
                rot_w, rot_h = card_rot.size

    canvas.paste(card_rot, (paste_x, paste_y), card_rot)
    
    # 2. Pocket in front (sauf si P26 carte finale seule)
    if not is_final:
        canvas.paste(pocket_resized, (pocket_x, pocket_y), pocket_resized)
        
    draw = ImageDraw.Draw(canvas)
    draw.text((30, 30), f"HANNA CALIBRATION — {pose_name}", fill=(197, 168, 128, 255))
    draw.text((30, 55), f"X: {x_offset:+.1f}px | Y: {y_offset:+.1f}px | Rot: {rotation_deg:+.1f}° | Scale: {scale_val:.2f}", fill=(56, 189, 248, 255))
    
    out_path = os.path.join(CAPTURES_DIR, f"capture_{pose_name.split()[0]}.png")
    canvas.save(out_path)
    print(f"✓ Capture générée : {os.path.basename(out_path)}")

# P12, P16, P20, P24, P26
render_pose('O P12 - Carte au fond', -0.2, 80.0, -90.0, 1.00)
render_pose('P P16 - Pivot 32 degres', 15.7, -80.0, -31.84, 1.10)
render_pose('Q P20 - Ascension verticale', 0.0, -220.0, 0.0, 1.18)
render_pose('R P24 - Seuil liberation', 13.5, -360.0, 0.0, 1.24)
render_pose('S P26 - Carte finale autonome', 0.0, 0.0, 0.0, 1.30, is_final=True)
