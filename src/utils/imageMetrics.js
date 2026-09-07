/**
 * Utilitaires géométriques et métriques pour le stage de calibration
 *
 * Convention logique :
 * - Origine (0, 0) = centre exact du stage
 * - Axe X : positif vers la droite (+X), négatif vers la gauche (-X)
 * - Axe Y : positif vers le bas (+Y), négatif vers le haut (-Y)
 */

/**
 * Aligne rigoureusement la BOUNDING BOX VISIBLE d'un asset sur une boîte physique cible (physicalBox).
 * Prend en compte :
 * - dimensions natives
 * - bounding box des pixels non nuls (visibleBBox)
 * - décalages transparents gauche/haut
 * - décalage entre centre du contenu visible et centre du canvas
 *
 * Résultat : les bords visibles de l'asset coïncident EXACTEMENT avec physicalBox.
 */
export function fitVisibleBoundsToPhysicalBox(assetMetrics, physicalBox) {
  const { nativeWidth, nativeHeight, visibleBBox, visibleWidth, visibleHeight } = assetMetrics;
  const { width: targetW, height: targetH, centerX = 0, centerY = 0 } = physicalBox;

  // Facteurs d'échelle nécessaires pour que le contenu visible atteigne exactement targetW et targetH
  const scaleX = targetW / visibleWidth;
  const scaleY = targetH / visibleHeight;

  // Dimensions totales du conteneur/canvas mis à l'échelle
  const containerW = nativeWidth * scaleX;
  const containerH = nativeHeight * scaleY;

  // Centre du canvas natif
  const canvasCenterX = nativeWidth / 2;
  const canvasCenterY = nativeHeight / 2;

  // Centre du contenu visible dans le canvas natif
  const visibleCenterX = visibleBBox.left + visibleWidth / 2;
  const visibleCenterY = visibleBBox.top + visibleHeight / 2;

  // Décalage du centre visible par rapport au centre du canvas
  const offsetVisibleToCanvasX = visibleCenterX - canvasCenterX;
  const offsetVisibleToCanvasY = visibleCenterY - canvasCenterY;

  // Pour que le centre du contenu visible soit à (centerX, centerY),
  // le centre du canvas doit être placé en compensant ce décalage :
  const stageX = centerX - (offsetVisibleToCanvasX * scaleX);
  const stageY = centerY - (offsetVisibleToCanvasY * scaleY);

  // Coordonnées absolues des bords visibles sur le stage logique
  const visibleLeft = stageX - (containerW / 2) + (visibleBBox.left * scaleX);
  const visibleRight = stageX - (containerW / 2) + (visibleBBox.right * scaleX);
  const visibleTop = stageY - (containerH / 2) + (visibleBBox.top * scaleY);
  const visibleBottom = stageY - (containerH / 2) + (visibleBBox.bottom * scaleY);

  return {
    width: Math.round(containerW * 100) / 100,
    height: Math.round(containerH * 100) / 100,
    x: Math.round(stageX * 100) / 100,
    y: Math.round(stageY * 100) / 100,
    scaleX: Math.round(scaleX * 10000) / 10000,
    scaleY: Math.round(scaleY * 10000) / 10000,
    visibleBounds: {
      left: Math.round(visibleLeft * 100) / 100,
      right: Math.round(visibleRight * 100) / 100,
      top: Math.round(visibleTop * 100) / 100,
      bottom: Math.round(visibleBottom * 100) / 100,
      width: Math.round((visibleRight - visibleLeft) * 100) / 100,
      height: Math.round((visibleBottom - visibleTop) * 100) / 100,
      centerX: Math.round(((visibleLeft + visibleRight) / 2) * 100) / 100,
      centerY: Math.round(((visibleTop + visibleBottom) / 2) * 100) / 100
    }
  };
}

export function logicalToCss(x, y, stageWidth = 1600, stageHeight = 1000) {
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
