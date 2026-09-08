/**
 * Interpolateur de trajectoire fluide et continue pour l'extraction de la carte
 * 
 * Règle stricte (User Request) :
 * - Aucun zigzag (x quasi-centré : -6px -> 0px sans oscillation gauche/droite)
 * - Trajectoire de rotation continue et monotone (-90° -> -35° -> 0°)
 * - Trajectoire verticale soignée sans à-coups ni descente brutale (y: +60px -> -50px -> 0px)
 * - 4 phases temporelles continues (0 -> 0.38 -> 0.62 -> 0.82 -> 1.0)
 */

function smoothstep(t) {
  const clamped = Math.max(0, Math.min(1, t));
  return clamped * clamped * (3 - 2 * clamped);
}

/**
 * Échantillonne la pose de la carte à n'importe quel instant de la progression (0 à 1)
 * @param {number} progress Progression globale 0.0 -> 1.0
 * @returns {{ x: number, y: number, rotation: number, scale: number, isFreed: boolean }}
 */
export function sampleCardPose(progress) {
  const p = Math.max(0, Math.min(1, progress));

  let x = 0;
  let y = 0;
  let rotation = 0;
  let scale = 1.0;
  let isFreed = false;

  if (p < 0.35) {
    // Phase A (0 -> 0.35) : PIVOT INITIAL + AMORCE DE MONTÉE (-90° -> -35°)
    const t = smoothstep(p / 0.35);
    rotation = -90.0 + t * (-35.0 - -90.0);
    x = -6.0 + t * (-2.0 - -6.0);
    y = 10.0 + t * (-75.0 - 10.0);
    scale = 1.0 + t * (1.06 - 1.0);
    isFreed = false;
  } else if (p < 0.65) {
    // Phase B (0.35 -> 0.65) : FIN DU REDRESSEMENT (-35° -> 0°)
    const t = smoothstep((p - 0.35) / 0.30);
    rotation = -35.0 + t * (0.0 - -35.0);
    x = -2.0 + t * (0.0 - -2.0);
    y = -75.0 + t * (-165.0 - -75.0);
    scale = 1.06 + t * (1.12 - 1.06);
    isFreed = false;
  } else if (p < 0.96) {
    // Phase C (0.65 -> 0.96) : MONTÉE VERTICALE CONTINUE HORS DE LA POCHE (rotation 0°)
    // La carte monte continûment sans jamais redescendre
    const t = smoothstep((p - 0.65) / 0.31);
    rotation = 0.0;
    x = 0.0;
    y = -165.0 + t * (-265.0 - -165.0);
    scale = 1.12 + t * (1.18 - 1.12);
    isFreed = false;
  } else {
    // Phase D (0.96 -> 1.0) : SOMMET DE L'EXTRACTION — LIBÉRATION PHYSIQUE
    // Sortie définitive du corps de l'enveloppe
    const t = smoothstep((p - 0.96) / 0.04);
    rotation = 0.0;
    x = 0.0;
    y = -265.0 + t * (-285.0 - -265.0);
    scale = 1.18 + t * (1.20 - 1.18);
    isFreed = true;
  }

  return {
    x: Number(x.toFixed(2)),
    y: Number(y.toFixed(2)),
    rotation: Number(rotation.toFixed(2)),
    scale: Number(scale.toFixed(4)),
    isFreed
  };
}
