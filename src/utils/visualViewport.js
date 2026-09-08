/**
 * Utilitaire pour mesurer avec précision la zone réellement visible du navigateur (Visual Viewport)
 * Particulièrement critique sur iOS Safari où les barres d'outils et de navigation réduisent l'espace utile.
 */

export function getVisualViewportRect() {
  if (typeof window !== 'undefined' && window.visualViewport) {
    const vv = window.visualViewport;
    return {
      width: vv.width,
      height: vv.height,
      offsetLeft: vv.offsetLeft || 0,
      offsetTop: vv.offsetTop || 0,
      scale: vv.scale || 1
    };
  }

  const width = typeof window !== 'undefined' ? window.innerWidth : 390;
  const height = typeof window !== 'undefined' ? window.innerHeight : 844;

  return {
    width,
    height,
    offsetLeft: 0,
    offsetTop: 0,
    scale: 1
  };
}

/**
 * Calcule la géométrie cible de la carte finale pour qu'elle s'affiche en grand
 * mais tienne à 100% dans la zone visible de l'écran SANS être coupée par Safari.
 * Ratio carte : 941 / 1672 (~0.5628)
 */
export function computeFinalCardRect() {
  const vv = getVisualViewportRect();
  const ratio = 941 / 1672;

  const isMobile = vv.width <= 600;

  let targetWidth;
  let targetHeight;

  if (isMobile) {
    // Marges de sécurité pour éviter les barres Safari et encoches (Safe Area)
    const safeTop = 10;
    const safeBottom = 16;
    const marginX = 8;

    const availableWidth = Math.max(280, vv.width - marginX * 2);
    const availableHeight = Math.max(400, vv.height - safeTop - safeBottom);

    // Hauteur contrainte par la zone visible
    targetHeight = Math.min(availableHeight, availableWidth / ratio);
    targetWidth = targetHeight * ratio;

    // Si la hauteur calculée permet de prendre plus de largeur tout en restant dans le viewport
    if (targetWidth > availableWidth) {
      targetWidth = availableWidth;
      targetHeight = targetWidth / ratio;
    }
  } else {
    // Desktop : centré avec une hauteur maximale de 94dvh
    const maxDesktopHeight = Math.min(vv.height * 0.94, 900);
    const maxDesktopWidth = Math.min(540, vv.width - 32);

    targetHeight = Math.min(maxDesktopHeight, maxDesktopWidth / ratio);
    targetWidth = targetHeight * ratio;
  }

  // Centrage parfait dans le Visual Viewport visible
  const targetLeft = vv.offsetLeft + (vv.width - targetWidth) / 2;
  const targetTop = vv.offsetTop + (vv.height - targetHeight) / 2;

  return {
    left: Math.round(targetLeft),
    top: Math.round(targetTop),
    width: Math.round(targetWidth),
    height: Math.round(targetHeight)
  };
}
