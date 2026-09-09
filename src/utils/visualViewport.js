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
    // Mobile : largeur 100% utile, hauteur naturelle selon le ratio strict 941 / 1672
    targetWidth = Math.round(vv.width);
    targetHeight = Math.round(targetWidth / ratio);
  } else {
    // Desktop : centré avec proportions harmonieuses
    const maxDesktopHeight = Math.min(vv.height * 0.94, 900);
    const maxDesktopWidth = Math.min(540, vv.width - 32);

    targetHeight = Math.min(maxDesktopHeight, maxDesktopWidth / ratio);
    targetWidth = targetHeight * ratio;
  }

  // Positionnement centré horizontalement, débutant en haut (top: 0) pour un scroll naturel
  const targetLeft = vv.offsetLeft + (vv.width - targetWidth) / 2;
  const targetTop = 0;

  return {
    left: Math.round(targetLeft),
    top: Math.round(targetTop),
    width: Math.round(targetWidth),
    height: Math.round(targetHeight)
  };
}

