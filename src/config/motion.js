/**
 * Configuration centralisée du système de mouvements et d'animations (Phase 2)
 * Tous les timings, courbes d'accélération et amplitudes sont consignés ici.
 */

export const MOTION = {
  // Séquence d'entrée
  entrance: {
    duration: 1.35,              // Durée principale de l'ascension (1.25 à 1.45s)
    ease: 'power3.out',           // Courbe fluide sans rebond
    startScale: 0.94,            // Échelle initiale sous l'écran
    finalScale: 1.0,             // Échelle nominale
    opacityDurationPercent: 0.65, // Opacité atteint 1 à 65% de la course (0.88s)
    opacityEase: 'power2.out',
    safetyMarginY: 60,           // Marge de sécurité sous le bas de l'écran (40 à 100px)

    // Phase de stabilisation (micro-inertie)
    settle: {
      overshootY: -6,            // Dépassement vertical doux (-6px)
      overshootScale: 1.002,     // Micro-expansion imperceptible
      duration: 0.22,            // 220ms (entre 180 et 260ms)
      ease: 'power2.out'
    }
  },

  // Flottement permanent (Idle Floating)
  idle: {
    // Axe vertical (respiration lente)
    y: {
      amplitude: 4.5,            // ±4.5px (±4 à 5px max)
      duration: 3.1,             // 3.1s par demi-cycle (2.6 à 3.4s)
      ease: 'sine.inOut'
    },
    // Rotation Z (déphasage organique évitant l'effet pendule mécanique)
    rotation: {
      amplitude: 0.18,           // ±0.18° (±0.15° à ±0.22°)
      duration: 3.7,             // 3.7s par demi-cycle
      ease: 'sine.inOut'
    }
  },

  // Ombre portée au sol (Ground Shadow)
  shadow: {
    widthRatio: 0.70,            // 70% de la largeur enveloppe (820 * 0.70 = 574px)
    baseHeight: 16,              // Hauteur de l'ellipse en px
    blur: 16,                    // Rayon de flou
    baseOpacity: 0.14,           // Opacité de repos (0.10 à 0.18)
    idleOpacityMin: 0.12,        // Opacité quand l'enveloppe monte
    idleOpacityMax: 0.16,        // Opacité quand l'enveloppe descend
    idleScaleXMin: 0.98,         // Échelle X quand l'enveloppe descend
    idleScaleXMax: 1.02          // Échelle X quand l'enveloppe monte
  },

  // Mode accessibilité (prefers-reduced-motion)
  reducedMotion: {
    duration: 0.40,              // 400ms
    translateY: 25,              // Décalage vertical réduit
    ease: 'power2.out'
  },

  // Ajustement visuel du centrage vertical (légèrement au-dessus du centre géométrique)
  verticalCenterOffsetPercent: -0.025 // -2.5% du viewport (environ -15 à -25px selon hauteur)
};
