/**
 * Utilitaires géométriques et métriques pour le stage de calibration
 *
 * Convention logique :
 * - Origine (0, 0) = centre exact du stage
 * - Axe X : positif vers la droite, négatif vers la gauche
 * - Axe Y : positif vers le bas, négatif vers le haut
 */

export function logicalToCss(x, y, stageWidth = 1600, stageHeight = 1000) {
  // Convertit les coordonnées logiques (centrées en 0,0) en coordonnées CSS absolues (top/left depuis le coin supérieur gauche)
  const left = stageWidth / 2 + x;
  const top = stageHeight / 2 + y;
  return { left, top };
}

export function buildTransformStyle(geometry) {
  const {
    x = 0,
    y = 0,
    scaleX = 1,
    scaleY = 1,
    rotation = 0,
    transformOriginX = 50,
    transformOriginY = 50,
    opacity = 1,
    zIndex = 1
  } = geometry;

  return {
    transform: `translate3d(${x}px, ${y}px, 0px) rotate(${rotation}deg) scale(${scaleX}, ${scaleY})`,
    transformOrigin: `${transformOriginX}% ${transformOriginY}%`,
    opacity: opacity,
    zIndex: zIndex
  };
}

export function computeFittedDimensions(nativeWidth, nativeHeight, maxWidth, maxHeight) {
  const ratio = nativeWidth / nativeHeight;
  let width = maxWidth;
  let height = width / ratio;

  if (height > maxHeight) {
    height = maxHeight;
    width = height * ratio;
  }

  return { width, height, ratio };
}
