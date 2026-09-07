/**
 * Centralisation des coordonnées géométriques du stage de calibration
 *
 * Convention logique :
 * - STAGE_WIDTH = 1600, STAGE_HEIGHT = 1000
 * - x = 0, y = 0 : centre exact du stage
 * - x positif : vers la droite (+X)
 * - x négatif : vers la gauche (-X)
 * - y positif : vers le bas (+Y)
 * - y négatif : vers le haut (-Y)
 */

export const STAGE_CONFIG = {
  width: 1600,
  height: 1000,
  coordinateSystem: {
    origin: 'center',
    xPositive: 'right',
    xNegative: 'left',
    yPositive: 'down',
    yNegative: 'up'
  }
};

export const GEOMETRY = {
  stage: {
    width: 1600,
    height: 1000
  },

  // A. Vue Closed Front
  closedFront: {
    x: 0,
    y: 0,
    width: 820,
    height: 546.67,
    scaleX: 1,
    scaleY: 1,
    rotation: 0,
    opacity: 1,
    transformOriginX: 50,
    transformOriginY: 50,
    zIndex: 10
  },

  // B. Vue Closed Back
  closedBack: {
    x: 0,
    y: 0,
    width: 820,
    height: 461.42,
    scaleX: 1,
    scaleY: 1,
    rotation: 0,
    opacity: 1,
    transformOriginX: 50,
    transformOriginY: 50,
    zIndex: 10
  },

  // Sceau indépendant sur le dos
  seal: {
    x: 0,
    y: 4,
    width: 120,
    height: 120,
    scaleX: 1,
    scaleY: 1,
    rotation: 0,
    opacity: 1,
    transformOriginX: 50,
    transformOriginY: 50,
    zIndex: 20
  },

  // C. Vue Open Reference
  openReference: {
    x: 0,
    y: -30,
    width: 820,
    height: 615,
    scaleX: 1,
    scaleY: 1,
    rotation: 0,
    opacity: 1,
    transformOriginX: 50,
    transformOriginY: 50,
    zIndex: 10
  },

  // D. Poche avant (old-envelope-pocket.png)
  pocket: {
    x: 0,
    y: 45,
    width: 820,
    height: 546.67,
    scaleX: 1,
    scaleY: 1,
    rotation: 0,
    opacity: 1,
    transformOriginX: 50,
    transformOriginY: 50,
    zIndex: 30
  },

  // Arrière de l'enveloppe ouverte sous la carte
  envelopeBacking: {
    x: 0,
    y: -30,
    width: 820,
    height: 615,
    scaleX: 1,
    scaleY: 1,
    rotation: 0,
    opacity: 0.85,
    transformOriginX: 50,
    transformOriginY: 50,
    zIndex: 5
  },

  // Carte d'invitation (carteInvitation.png) - position de base
  card: {
    x: 0,
    y: 0,
    width: 320,
    height: 568.59,
    scaleX: 1,
    scaleY: 1,
    rotation: 0,
    opacity: 1,
    transformOriginX: 50,
    transformOriginY: 50,
    zIndex: 15
  }
};

/**
 * Key poses de la carte d'invitation calibrées d'après le PDF
 * scenarioAniationInvitation_compressed.pdf (Pages 8 à 26).
 *
 * La carte démarre complètement rentrée (Page 12),
 * pivote et monte progressivement (Pages 13-18),
 * se redresse à la verticale (Pages 19-20),
 * continue son ascension verticale (Pages 21-24),
 * et s'établit en carte principale (Pages 25-26).
 */
export const CARD_KEY_POSES = {
  // Page 12 : Carte complètement rentrée à l'horizontale au fond de la poche
  inside: {
    name: 'P12 - Carte au fond (horizontale)',
    pdfPage: 12,
    x: -5,
    y: 110,
    rotation: -90,
    scale: 0.88,
    opacity: 1,
    description: 'Carte couchée dans la poche, masquée par le rabat avant'
  },

  // Page 13 : Amorçage de la sortie, le coin supérieur gauche émerge
  pose1: {
    name: 'P13 - Début de pivot',
    pdfPage: 13,
    x: -25,
    y: 80,
    rotation: -75,
    scale: 0.89,
    opacity: 1,
    description: 'Premier dégagement, rotation vers le haut-gauche'
  },

  // Page 14 : Pivot intermédiaire
  pose2: {
    name: 'P14 - Pivot 55°',
    pdfPage: 14,
    x: -35,
    y: 50,
    rotation: -55,
    scale: 0.90,
    opacity: 1,
    description: 'Le haut de la carte émerge visiblement'
  },

  // Page 15 : Pivot 40°
  pose3: {
    name: 'P15 - Pivot 40°',
    pdfPage: 15,
    x: -30,
    y: 15,
    rotation: -40,
    scale: 0.92,
    opacity: 1,
    description: 'La carte s\'élève et commence son redressement'
  },

  // Page 16 : Pivot 25°
  pose4: {
    name: 'P16 - Pivot 25°',
    pdfPage: 16,
    x: -20,
    y: -20,
    rotation: -25,
    scale: 0.94,
    opacity: 1,
    description: 'Redressement prononcé, plus de la moitié visible'
  },

  // Page 17 : Presque redressée
  pose5: {
    name: 'P17 - Presque droite (-12°)',
    pdfPage: 17,
    x: -10,
    y: -50,
    rotation: -12,
    scale: 0.96,
    opacity: 1,
    description: 'Légère inclinaison résiduelle'
  },

  // Page 18 : Redressement quasi complet
  pose6: {
    name: 'P18 - Quasi verticale (-5°)',
    pdfPage: 18,
    x: -5,
    y: -80,
    rotation: -5,
    scale: 0.97,
    opacity: 1,
    description: 'Dernière phase de rotation'
  },

  // Page 20 : Carte parfaitement verticale
  vertical: {
    name: 'P20 - Verticale (0°)',
    pdfPage: 20,
    x: 0,
    y: -110,
    rotation: 0,
    scale: 0.98,
    opacity: 1,
    description: 'Carte droite, ascension purement verticale engagée'
  },

  // Page 22 : Ascension intermédiaire
  pose7: {
    name: 'P22 - Ascension haute',
    pdfPage: 22,
    x: 0,
    y: -150,
    rotation: 0,
    scale: 0.99,
    opacity: 1,
    description: 'Seul le bas de la carte affleure la poche'
  },

  // Page 24 : Sortie presque complète
  pose8: {
    name: 'P24 - Presque sortie',
    pdfPage: 24,
    x: 0,
    y: -190,
    rotation: 0,
    scale: 1.0,
    opacity: 1,
    description: 'La carte quitte le haut de la poche'
  },

  // Page 26 : Carte complètement extraite, isolée et centrée
  extracted: {
    name: 'P26 - Carte extraite (finale)',
    pdfPage: 26,
    x: 0,
    y: 0,
    rotation: 0,
    scale: 1.05,
    opacity: 1,
    description: 'Carte autonome prête pour l\'interaction RSVP'
  }
};
