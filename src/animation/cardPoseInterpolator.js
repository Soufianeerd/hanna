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

  if (p < 0.38) {
    // Phase A (0 -> 0.38) : PIVOT INITIAL + MONTÉE (-90° -> -35°)
    const t = smoothstep(p / 0.38);
    rotation = -90.0 + t * (-35.0 - -90.0);
    x = -6.0 + t * (-2.0 - -6.0);
    y = 10.0 + t * (-80.0 - 10.0);
    scale = 1.0 + t * (1.08 - 1.0);
    isFreed = false;
  } else if (p < 0.62) {
    // Phase B (0.38 -> 0.62) : FIN DU REDRESSEMENT (-35° -> 0°)
    const t = smoothstep((p - 0.38) / 0.24);
    rotation = -35.0 + t * (0.0 - -35.0);
    x = -2.0 + t * (0.0 - -2.0);
    y = -80.0 + t * (-140.0 - -80.0);
    scale = 1.08 + t * (1.18 - 1.08);
    isFreed = false;
  } else if (p < 0.82) {
    // Phase C (0.62 -> 0.82) : MONTÉE VERTICALE HORS DE LA POCHE (rotation 0°)
    const t = smoothstep((p - 0.62) / 0.20);
    rotation = 0.0;
    x = 0.0;
    y = -140.0 + t * (-160.0 - -140.0);
    scale = 1.18 + t * (1.26 - 1.18);
    isFreed = false;
  } else {
    // Phase D (0.82 -> 1.0) : PRÉSENTATION FINALE (carte libérée, l'enveloppe recule)
    const t = smoothstep((p - 0.82) / 0.18);
    rotation = 0.0;
    x = 0.0;
    y = -160.0 + t * (0.0 - -160.0);
    scale = 1.26 + t * (1.30 - 1.26);
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
