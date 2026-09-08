/**
 * Configuration centralisée du système de mouvements et d'animations
 * Paramétrage optimisé pour une fluidité organique et des sensations physiques.
 */

export const MOTION = {
  // Séquence d'entrée
  entrance: {
    duration: 1.35,
    ease: 'power3.out',
    startScale: 0.94,
    finalScale: 1.0,
    opacityDurationPercent: 0.65,
    opacityEase: 'power2.out',
    safetyMarginY: 60,
    settle: {
      overshootY: -6,
      overshootScale: 1.002,
      duration: 0.22,
      ease: 'power2.out'
    }
  },

  // Flottement permanent (Idle Floating) en pixels écran réels
  idle: {
    screenAmplitudeYDesktop: 11,   // ~10 à 12px réels écran sur desktop
    screenAmplitudeYMobile: 9,     // ~8 à 10px réels écran sur mobile
    yDuration: 3.0,                // 3.0s par demi-cycle (2.8 à 3.2s)
    yEase: 'sine.inOut',

    rotationAmplitude: 0.30,       // ±0.30°
    rotationDuration: 3.8,         // 3.8s par demi-cycle (déphasé 3.5 à 4.1s)
    rotationEase: 'sine.inOut'
  },

  // Ombre portée au sol (Ground Shadow) réactive
  shadow: {
    widthRatio: 0.70,
    baseHeight: 16,
    blur: 16,
    baseOpacity: 0.14,
    idleOpacityMin: 0.10,          // Quand l'enveloppe monte
    idleOpacityMax: 0.18,          // Quand l'enveloppe descend
    idleScaleXMin: 0.96,           // Quand l'enveloppe descend
    idleScaleXMax: 1.04            // Quand l'enveloppe monte
  },

  // Stabilisation avant flip (0.22s + pause 0.08s)
  neutralize: {
    duration: 0.22,
    ease: 'power2.out',
    pauseBeforeFlip: 0.08
  },

  // Retournement 3D (Flip 180°) ralenti (1.55s)
  flip: {
    duration: 1.55,                // Exactement 1.55s
    ease: 'power2.inOut',
    backPauseDuration: 0.28        // Exactement 0.28s avec sceau visible
  },

  // Disparition du sceau
  seal: {
    duration: 0.35,
    overshootScale: 1.055,
    endScale: 0.82,
    endRotation: 2,
    ease: 'power2.inOut'
  },

  // Bascule ultra-rapide vers l'enveloppe ouverte
  openSwitch: {
    duration: 0.10,                // 80 à 120ms (crossfade imperceptible du corps)
    ease: 'linear',
    pauseBeforeExtraction: 0.10
  },

  // Extraction continue de la carte (durée 3.0s)
  extraction: {
    duration: 3.0,                 // Exactement 3.0s
    ease: 'none',
    envelopeFadeDuration: 0.65,    // Exactement 0.65s
    envelopeFadeY: 50,             // y: 0 -> +50px
    envelopeFadeScale: 0.94        // scale: 1 -> 0.94
  },

  // Transition de la carte PNG vers la carte interactive HTML/CSS
  cardTransition: {
    crossfadeDuration: 0.22        // 180 à 250ms
  },

  // Envoi postal vers le haut
  cardSend: {
    anticipationDuration: 0.14,
    anticipationY: 4,
    anticipationScale: 0.99,
    anticipationEase: 'power1.in',
    departureDuration: 0.92,
    departureY: '-140vh',
    departureEase: 'power2.in'
  },

  // Message de confirmation final
  confirmation: {
    delay: 0.20,
    duration: 0.58,
    yFrom: 8,
    ease: 'power2.out'
  },

  // Mode accessibilité (prefers-reduced-motion)
  reducedMotion: {
    duration: 0.40,
    translateY: 25,
    ease: 'power2.out'
  },

  verticalCenterOffsetPercent: -0.025
};
