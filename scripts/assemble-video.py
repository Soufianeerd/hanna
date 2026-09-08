import os
import glob
from PIL import Image

FRAMES_DIR = '.dev/video_frames'
OUTPUT_WEBP = '.dev/captures/hanna_full_mobile_flow.webp'
ARTIFACTS_DIR = '/Users/soufianeelrhadi/.gemini/antigravity-ide/brain/3bae6ad7-9a2b-4846-a85a-ca9f89474d53'

frame_files = sorted(glob.glob(os.path.join(FRAMES_DIR, 'frame_*.png')))
print(f"Trouvé {len(frame_files)} frames à assembler...")

if not frame_files:
    print("Aucune frame trouvée.")
    exit(1)

images = []
for f in frame_files:
    img = Image.open(f).convert('RGB')
    images.append(img)

# Assemblage WebP animé à ~8 FPS (durée 125ms par frame)
duration_ms = 125
print(f"Assemblage de l'animation WebP vers {OUTPUT_WEBP}...")
images[0].save(
    OUTPUT_WEBP,
    save_all=True,
    append_images=images[1:],
    duration=duration_ms,
    loop=0,
    quality=85,
    method=4
)

size_mb = os.path.getsize(OUTPUT_WEBP) / (1024 * 1024)
print(f"Animation WebP créée avec succès : {OUTPUT_WEBP} ({size_mb:.2f} MB)")

# Copie vers le répertoire artifacts
artifact_dest = os.path.join(ARTIFACTS_DIR, 'hanna_full_mobile_flow.webp')
with open(OUTPUT_WEBP, 'rb') as f_src, open(artifact_dest, 'wb') as f_dst:
    f_dst.write(f_src.read())

print(f"Copié dans les artifacts : {artifact_dest}")
