/**
 * Configuration centralisée du système de mouvements et d'animations (Full MVP Flow)
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

  // Flottement permanent (Idle Floating)
  idle: {
    y: {
      amplitude: 4.5,
      duration: 3.1,
      ease: 'sine.inOut'
    },
    rotation: {
      amplitude: 0.18,
      duration: 3.7,
      ease: 'sine.inOut'
    }
  },

  // Ombre portée au sol (Ground Shadow)
  shadow: {
    widthRatio: 0.70,
    baseHeight: 16,
    blur: 16,
    baseOpacity: 0.14,
    idleOpacityMin: 0.12,
    idleOpacityMax: 0.16,
    idleScaleXMin: 0.98,
    idleScaleXMax: 1.02
  },

  // Neutralisation du floating avant le flip
  neutralize: {
    duration: 0.18,
    ease: 'power2.out'
  },

  // Retournement 3D (Flip 180°)
  flip: {
    duration: 0.85,
    ease: 'power2.inOut',
    backPauseDuration: 0.14
  },

  // Disparition du sceau
  seal: {
    duration: 0.35,
    overshootScale: 1.055,
    endScale: 0.82,
    endRotation: 2,
    ease: 'power2.inOut'
  },

  // Bascule vers l'enveloppe ouverte
  openSwitch: {
    duration: 0.14,
    ease: 'power1.inOut',
    pauseBeforeExtraction: 0.10
  },

  // Extraction de la carte (P12 -> P26)
  extraction: {
    p12ToP17Duration: 0.80,
    p17ToP24Duration: 0.70,
    p24ToP26Duration: 0.40,
    envelopeFadeDuration: 0.45,
    envelopeFadeY: 40,
    envelopeFadeScale: 0.94
  },

  // RSVP et soumission
  rsvp: {
    submitSimulatedDelay: 0.25,
    panelFadeOutDuration: 0.20,
    panelFadeOutY: 4
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
