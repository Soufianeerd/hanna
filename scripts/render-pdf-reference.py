#!/usr/bin/env python3
"""
Rendu haute résolution des pages de référence du PDF
scenarioAniationInvitation_compressed.pdf pour mesure géométrique de la trajectoire.
"""

import os
import fitz  # PyMuPDF

PDF_PATH = os.path.join(os.path.dirname(__file__), '..', 'docs', 'scenarioAniationInvitation_compressed.pdf')
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), '..', '.dev', 'pdf-pages')

def render_pages():
    if not os.path.exists(PDF_PATH):
        raise FileNotFoundError(f"PDF introuvable à : {PDF_PATH}")

    os.makedirs(OUTPUT_DIR, exist_ok=True)
    doc = fitz.open(PDF_PATH)
    total_pages = len(doc)
    print(f"Ouverture du PDF : {PDF_PATH} ({total_pages} pages)")

    # Facteur de zoom (2.0 = 144 DPI pour une analyse pixel précise)
    matrix = fitz.Matrix(2.0, 2.0)

    for page_num in range(1, total_pages + 1):
        page = doc[page_num - 1]
        pix = page.get_pixmap(matrix=matrix, alpha=False)
        out_filename = f"page-{page_num:02d}.png"
        out_path = os.path.join(OUTPUT_DIR, out_filename)
        pix.save(out_path)
        print(f"Rendu P{page_num:02d} -> {out_path} ({pix.width}x{pix.height})")

    doc.close()
    print(f"✓ {total_pages} pages rendues avec succès dans {OUTPUT_DIR}")

if __name__ == '__main__':
    render_pages()
