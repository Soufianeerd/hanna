/**
 * Interpolateur de poses de la carte (P12 à P26)
 * Échantillonne une trajectoire continue C1-smooth via spline cubique Catmull-Rom.
 * Supprime tous les arrêts ou saccades entre poses en garantissant un mouvement organique.
 */

import { PDF_CARD_POSES } from '../config/geometry.js';

// Table de correspondance temporelle (progression normalisée 0..1)
const WAYPOINTS = [
  { t: 0.000, pose: PDF_CARD_POSES.P12 }, // Fond de poche couché (-90°)
  { t: 0.080, pose: PDF_CARD_POSES.P13 }, // Début pivot
  { t: 0.160, pose: PDF_CARD_POSES.P14 }, // Pivot accentué
  { t: 0.240, pose: PDF_CARD_POSES.P15 }, // Mi-parcours pivot
  { t: 0.320, pose: PDF_CARD_POSES.P16 }, // Dégagement
  { t: 0.390, pose: PDF_CARD_POSES.P17 }, // Redressement vertical (0°)
  { t: 0.445, pose: PDF_CARD_POSES.P18 }, // Ascension 1
  { t: 0.500, pose: PDF_CARD_POSES.P19 }, // Ascension 2
  { t: 0.550, pose: PDF_CARD_POSES.P20 }, // Ascension 3
  { t: 0.600, pose: PDF_CARD_POSES.P21 }, // Ascension 4
  { t: 0.650, pose: PDF_CARD_POSES.P22 }, // Ascension 5
  { t: 0.700, pose: PDF_CARD_POSES.P23 }, // Affleurement poche
  { t: 0.740, pose: PDF_CARD_POSES.P24 }, // Seuil libération haute (-360px)
  { t: 0.860, pose: PDF_CARD_POSES.P25 }, // Descente continue vers le centre
  { t: 1.000, pose: PDF_CARD_POSES.P26 }  // Centrage final au repos (0px, 0°, 1.30)
];

function catmullRom(p0, p1, p2, p3, u) {
  return 0.5 * (
    (2 * p1) +
    (-p0 + p2) * u +
    (2 * p0 - 5 * p1 + 4 * p2 - p3) * (u * u) +
    (-p0 + 3 * p1 - 3 * p2 + p3) * (u * u * u)
  );
}

/**
 * Échantillonne la pose de la carte pour un avancement global progress entre 0 et 1.
 * @param {number} rawProgress - Valeur de progression [0, 1]
 * @returns {{ x: number, y: number, rotation: number, scale: number, isFreed: boolean }}
 */
export function sampleCardPose(rawProgress) {
  const progress = Math.max(0, Math.min(1, rawProgress));

  // Trouver l'intervalle [i, i+1]
  let i = 0;
  while (i < WAYPOINTS.length - 2 && WAYPOINTS[i + 1].t <= progress) {
    i++;
  }

  const w0 = WAYPOINTS[Math.max(0, i - 1)].pose;
  const w1 = WAYPOINTS[i].pose;
  const w2 = WAYPOINTS[Math.min(WAYPOINTS.length - 1, i + 1)].pose;
  const w3 = WAYPOINTS[Math.min(WAYPOINTS.length - 1, i + 2)].pose;

  const t0 = WAYPOINTS[i].t;
  const t1 = WAYPOINTS[i + 1].t;
  const u = t1 === t0 ? 0 : (progress - t0) / (t1 - t0);

  // Interpolation spline Catmull-Rom pour X, Y, Scale
  const x = catmullRom(w0.x, w1.x, w2.x, w3.x, u);
  const y = catmullRom(w0.y, w1.y, w2.y, w3.y, u);
  const scale = catmullRom(w0.scale, w1.scale, w2.scale, w3.scale, u);

  // Interpolation rotation : de -90° à 0° jusqu'à P17 (t=0.390), puis 0° strict
  let rotation = 0;
  if (progress < 0.390) {
    const rotProgress = progress / 0.390;
    // Courbe d'angle fluide sans dépassement
    rotation = -90 * Math.pow(1 - rotProgress, 1.45);
  } else {
    rotation = 0;
  }

  // La carte est physiquement libre de la poche à partir de P24 (t >= 0.740)
  const isFreed = progress >= 0.740;

  return { x, y, rotation, scale, isFreed };
}
