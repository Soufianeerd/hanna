/**
 * Registre unique des assets du projet Hanna
 * Toutes les dimensions et bounding boxes proviennent de l'audit automatique (docs/assets-analysis.json).
 */

export const ASSETS = {
  envelopeFront: {
    id: 'envelopeFront',
    name: 'Face avant enveloppe',
    src: '/assets/hanna/envelope/envelope-front.png',
    nativeWidth: 1536,
    nativeHeight: 1024,
    aspectRatio: 1.5,
    hasAlpha: true,
    visibleBBox: {
      left: 15,
      top: 33,
      right: 1520,
      bottom: 1024
    },
    visibleWidth: 1505,
    visibleHeight: 991,
    visibleCenter: { x: 767.5, y: 528.5 },
    canvasCoveragePercent: 76.94
  },

  envelopeBackClosed: {
    id: 'envelopeBackClosed',
    name: 'Dos fermé enveloppe',
    src: '/assets/hanna/envelope/envelope-back-closed.png',
    nativeWidth: 1672,
    nativeHeight: 941,
    aspectRatio: 1.7768,
    hasAlpha: true,
    visibleBBox: {
      left: 29,
      top: 0,
      right: 1644,
      bottom: 928
    },
    visibleWidth: 1615,
    visibleHeight: 928,
    visibleCenter: { x: 836.5, y: 464.0 },
    canvasCoveragePercent: 89.82
  },

  envelopeSeal: {
    id: 'envelopeSeal',
    name: 'Sceau de cire indépendant',
    src: '/assets/hanna/envelope/envelope-seal.png',
    nativeWidth: 1254,
    nativeHeight: 1254,
    aspectRatio: 1.0,
    hasAlpha: true,
    visibleBBox: {
      left: 0,
      top: 21,
      right: 1240,
      bottom: 1214
    },
    visibleWidth: 1240,
    visibleHeight: 1193,
    visibleCenter: { x: 620.0, y: 617.5 },
    canvasCoveragePercent: 57.66
  },

  envelopeOpenReference: {
    id: 'envelopeOpenReference',
    name: 'Référence enveloppe ouverte (calibration)',
    src: '/assets/hanna/references/old-envelope-open.png',
    nativeWidth: 1448,
    nativeHeight: 1086,
    aspectRatio: 1.3333,
    hasAlpha: true,
    visibleBBox: {
      left: 0,
      top: 0,
      right: 1261,
      bottom: 1086
    },
    visibleWidth: 1261,
    visibleHeight: 1086,
    visibleCenter: { x: 630.5, y: 543.0 },
    canvasCoveragePercent: 58.26
  },

  envelopePocket: {
    id: 'envelopePocket',
    name: 'Poche avant enveloppe (masquage carte)',
    src: '/assets/hanna/envelope/old-envelope-pocket.png',
    nativeWidth: 1536,
    nativeHeight: 1024,
    aspectRatio: 1.5,
    hasAlpha: true,
    visibleBBox: {
      left: 0,
      top: 41,
      right: 1507,
      bottom: 1024
    },
    visibleWidth: 1507,
    visibleHeight: 983,
    visibleCenter: { x: 753.5, y: 532.5 },
    canvasCoveragePercent: 64.42
  },

  invitationCard: {
    id: 'invitationCard',
    name: 'Carte d\'invitation',
    src: '/assets/hanna/invitation/carteInvitation.png',
    nativeWidth: 941,
    nativeHeight: 1672,
    aspectRatio: 0.5628,
    hasAlpha: false,
    visibleBBox: {
      left: 0,
      top: 0,
      right: 941,
      bottom: 1672
    },
    visibleWidth: 941,
    visibleHeight: 1672,
    visibleCenter: { x: 470.5, y: 836.0 },
    canvasCoveragePercent: 100.0
  }
};
