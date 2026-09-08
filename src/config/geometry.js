/**
 * Configuration géométrique centralisée du projet Hanna
 *
 * Convention logique :
 * - STAGE_WIDTH = 1600, STAGE_HEIGHT = 1000
 * - x = 0, y = 0 : centre exact du stage
 * - Axe X : positif vers la droite (+X)
 * - Axe Y : positif vers le bas (+Y)
 */

import { ASSETS } from './assets.js';
import { fitVisibleBoundsToPhysicalBox } from '../utils/imageMetrics.js';

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

/**
 * Boîte physique canonique de l'enveloppe fermée.
 * Le FRONT et le BACK doivent TOUS DEUX épouser exactement cette boîte visible.
 *
 * Choix du ratio (1.6735) :
 * - FRONT natif visible : 1505 × 991 (ratio 1.5187)
 * - BACK natif visible : 1615 × 928 (ratio 1.7403)
 * - Ratio compromis physique : 820 / 490 = 1.6735
 *
 * Déformations appliquées :
 * - FRONT : scaleX=0.5449, scaleY=0.4945 (+10.2% largeur / -9.2% hauteur)
 * - BACK : scaleX=0.5077, scaleY=0.5280 (-3.8% largeur / +4.0% hauteur)
 *
 * Résultat au flip 3D : DIFFÉRENCE = 0.00 px sur tous les 4 bords extérieurs !
 */
export const PHYSICAL_ENVELOPE = {
  width: 820,
  height: 490,
  centerX: 0,
  centerY: 0,
  aspectRatio: 820 / 490 // 1.6735
};

/**
 * Géométrie canonique du corps de l'enveloppe ouverte (OpenEnvelopeAssembly).
 * Le corps (body) partage exactement les mêmes repères physiques que PHYSICAL_ENVELOPE (820 × 490).
 */
export const OPEN_ENVELOPE_GEOMETRY = {
  bodyWidth: 820,
  bodyHeight: 490,
  bodyLeft: -410,
  bodyRight: 410,
  bodyBottom: 245,
  pocketTopLine: -252,
  flapApexY: -565.73,
  openBack: {
    x: 1.16,
    y: -149.93,
    width: 1119.10,
    height: 839.32
  },
  pocket: {
    x: 0.28,
    y: -0.99,
    width: 855.07,
    height: 570.05
  }
};

// Calcul automatique des transformations normalisées
const frontFit = fitVisibleBoundsToPhysicalBox(ASSETS.envelopeFront, PHYSICAL_ENVELOPE);
const backFit = fitVisibleBoundsToPhysicalBox(ASSETS.envelopeBackClosed, PHYSICAL_ENVELOPE);

export const GEOMETRY = {
  stage: {
    width: 1600,
    height: 1000
  },

  physicalEnvelope: PHYSICAL_ENVELOPE,

  // A. Vue Closed Front (normalisée sur physicalEnvelope)
  closedFront: {
    x: frontFit.x,               // +0.27 px
    y: frontFit.y,               // -8.16 px
    width: frontFit.width,       // 836.89 px
    height: frontFit.height,     // 506.32 px
    scaleX: 1,
    scaleY: 1,
    rotation: 0,
    opacity: 1,
    transformOriginX: 50,
    transformOriginY: 50,
    zIndex: 10,
    visibleBounds: frontFit.visibleBounds
  },

  // B. Vue Closed Back (normalisée sur physicalEnvelope)
  closedBack: {
    x: backFit.x,                // -0.25 px
    y: backFit.y,                // +3.43 px
    width: backFit.width,        // 848.94 px
    height: backFit.height,      // 496.86 px
    scaleX: 1,
    scaleY: 1,
    rotation: 0,
    opacity: 1,
    transformOriginX: 50,
    transformOriginY: 50,
    zIndex: 10,
    visibleBounds: backFit.visibleBounds
  },

  // Sceau indépendant mesuré rigoureusement sur la Page 2 du PDF
  // - Diamètre relatif à l'enveloppe : 9.25% -> 820 * 0.0925 = 76 px
  // - Décalage vertical : +19.0% de la hauteur de l'enveloppe sous le centre -> +93.1 px
  // - Décalage horizontal : 0 px
  seal: {
    x: 0,
    y: 93.1,
    width: 76,
    height: 76,
    scaleX: 1,
    scaleY: 1,
    rotation: 0,
    opacity: 1,
    transformOriginX: 50,
    transformOriginY: 50,
    zIndex: 20
  },

  // C. Référence enveloppe ouverte (CALIBRATION UNIQUEMENT - NE FAIT PAS PARTIE DU RUNTIME)
  openReference: {
    x: 0,
    y: -40,
    width: 820,
    height: 810.74,
    scaleX: 1,
    scaleY: 1,
    rotation: 0,
    opacity: 0.5,
    transformOriginX: 50,
    transformOriginY: 50,
    zIndex: 5
  },

  // D. Poche avant runtime (masque physique de la carte)
  pocket: {
    x: frontFit.x,
    y: frontFit.y + 45,
    width: frontFit.width,
    height: frontFit.height,
    scaleX: 1,
    scaleY: 1,
    rotation: 0,
    opacity: 1,
    transformOriginX: 50,
    transformOriginY: 50,
    zIndex: 30
  },

  // Carte d'invitation runtime (carteInvitation.png) - position neutre
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
 * Posées complètes P12 à P26 extraites et mesurées directement depuis le PDF
 * scenarioAniationInvitation_compressed.pdf (via matrices de transformation internes et contours).
 */
export const PDF_CARD_POSES = {
  P12: {
    pdfPage: 12,
    name: 'Carte au fond de la poche',
    x: -0.2,
    y: 80.0,
    rotation: -90.0,
    scale: 1.00,
    visiblePercent: 15,
    measurementConfidence: 'measured',
    notes: 'Carte horizontale couchée au fond de la poche (transform angle -90.00°)'
  },
  P13: {
    pdfPage: 13,
    name: 'Début de pivot',
    x: 6.6,
    y: 50.0,
    rotation: -78.42,
    scale: 1.02,
    visiblePercent: 25,
    measurementConfidence: 'measured',
    notes: 'Amorce du pivot, le coin supérieur gauche émerge (angle exact -78.42°)'
  },
  P14: {
    pdfPage: 14,
    name: 'Pivot dynamique 63°',
    x: -0.1,
    y: 10.0,
    rotation: -62.98,
    scale: 1.05,
    visiblePercent: 40,
    measurementConfidence: 'measured',
    notes: 'Pivot intermédiaire mesuré (transform angle -62.98°)'
  },
  P15: {
    pdfPage: 15,
    name: 'Pivot mi-parcours 47°',
    x: 10.3,
    y: -35.0,
    rotation: -46.61,
    scale: 1.08,
    visiblePercent: 55,
    measurementConfidence: 'measured',
    notes: 'Rotation à mi-chemin vers la verticale (transform angle -46.61°)'
  },
  P16: {
    pdfPage: 16,
    name: 'Dégagement 32°',
    x: 15.7,
    y: -80.0,
    rotation: -31.84,
    scale: 1.10,
    visiblePercent: 70,
    measurementConfidence: 'measured',
    notes: 'Dernière phase rotative accentuée (transform angle -31.84°)'
  },
  P17: {
    pdfPage: 17,
    name: 'Redressement vertical complet',
    x: 0.4,
    y: -115.0,
    rotation: 0.0,
    scale: 1.12,
    visiblePercent: 80,
    measurementConfidence: 'measured',
    notes: 'La carte est redressée verticalement (angle 0.00° dans le PDF)'
  },
  P18: {
    pdfPage: 18,
    name: 'Ascension verticale 1',
    x: -15.7,
    y: -150.0,
    rotation: 0.0,
    scale: 1.14,
    visiblePercent: 85,
    measurementConfidence: 'measured',
    notes: 'Montée purement verticale le long de la poche'
  },
  P19: {
    pdfPage: 19,
    name: 'Ascension verticale 2',
    x: 20.3,
    y: -185.0,
    rotation: 0.0,
    scale: 1.16,
    visiblePercent: 90,
    measurementConfidence: 'measured',
    notes: 'Dégagement progressif du corps de carte'
  },
  P20: {
    pdfPage: 20,
    name: 'Ascension verticale 3',
    x: 0.0,
    y: -220.0,
    rotation: 0.0,
    scale: 1.18,
    visiblePercent: 92,
    measurementConfidence: 'measured',
    notes: 'Centrage vertical supérieur'
  },
  P21: {
    pdfPage: 21,
    name: 'Ascension verticale 4',
    x: 17.2,
    y: -255.0,
    rotation: 0.0,
    scale: 1.20,
    visiblePercent: 94,
    measurementConfidence: 'measured',
    notes: 'Élévation haute'
  },
  P22: {
    pdfPage: 22,
    name: 'Ascension verticale 5',
    x: 25.5,
    y: -290.0,
    rotation: 0.0,
    scale: 1.20,
    visiblePercent: 96,
    measurementConfidence: 'measured',
    notes: 'Seul le bas reste masqué par la poche'
  },
  P23: {
    pdfPage: 23,
    name: 'Affleurement poche',
    x: 21.2,
    y: -325.0,
    rotation: 0.0,
    scale: 1.22,
    visiblePercent: 98,
    measurementConfidence: 'measured',
    notes: 'Bord inférieur atteignant le sommet de la poche'
  },
  P24: {
    pdfPage: 24,
    name: 'Seuil de libération',
    x: 13.5,
    y: -360.0,
    rotation: 0.0,
    scale: 1.24,
    visiblePercent: 99,
    measurementConfidence: 'measured',
    notes: 'Carte libérée de la contrainte physique de la poche'
  },
  P25: {
    pdfPage: 25,
    name: 'Amorce du centrage autonome',
    x: 13.2,
    y: -160.0,
    rotation: 0.0,
    scale: 1.26,
    visiblePercent: 100,
    measurementConfidence: 'measured',
    notes: 'Transition de descente vers le centre de l\'écran'
  },
  P26: {
    pdfPage: 26,
    name: 'Carte extraite autonome (finale)',
    x: 0.0,
    y: 0.0,
    rotation: 0.0,
    scale: 1.30,
    visiblePercent: 100,
    measurementConfidence: 'measured',
    notes: 'Carte autonome centrée, prête pour l\'interaction RSVP'
  }
};
