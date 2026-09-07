/**
 * Animation d'entrée de l'enveloppe (Phase 2)
 *
 * Trajectoire :
 * 1. Enveloppe complètement hors-écran sous le viewport (avec marge de sécurité)
 * 2. Montée progressive et fluide (power3.out)
 * 3. Fade-in rapide au départ (opacité 1 à 65% de la course)
 * 4. Micro-settle naturel (overshoot -6px -> 0px sur 220ms)
 * 5. Enchaînement immédiat vers le flottement idle (aucun temps mort).
 */

import gsap from 'gsap';
import { MOTION } from '../config/motion.js';
import { EXPERIENCE_STATE } from '../experience/experienceState.js';

export class EnvelopeEntranceAnimation {
  constructor(scene, stateManager) {
    this.scene = scene;
    this.stateManager = stateManager;
    this.timeline = null;
  }

  /**
   * Calcule la coordonnée Y de départ hors-écran sous le viewport
   */
  calculateStartY() {
    const vh = window.innerHeight;
    const runtimeScale = this.scene.runtimeScale || 1;
    const safetyMargin = MOTION.entrance.safetyMarginY;
    const verticalOffset = vh * MOTION.verticalCenterOffsetPercent;

    // En coordonnées écran : distance depuis le centre au repos jusqu'au bas de l'écran + hauteur enveloppe + marge
    const renderedHalfHeight = (490 * runtimeScale) / 2;
    const screenDistance = (vh / 2) + renderedHalfHeight + safetyMargin - verticalOffset;

    // Conversion dans l'espace logique de EnvelopeMotionWrapper (qui subit runtimeScale)
    return screenDistance / runtimeScale;
  }

  play({ onComplete } = {}) {
    this.kill();

    const motionWrapper = this.scene.elements.motionWrapper;
    const shadow = this.scene.elements.shadow;
    const isReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (isReduced) {
      this.playReducedMotion({ onComplete });
      return;
    }

    const startY = this.calculateStartY();
    const config = MOTION.entrance;

    // État initial
    gsap.set(motionWrapper, {
      y: startY,
      scale: config.startScale,
      opacity: 0,
      rotation: 0
    });

    if (shadow) {
      gsap.set(shadow, {
        opacity: 0,
        scaleX: 0.85
      });
    }

    this.stateManager.setState(EXPERIENCE_STATE.ENVELOPE_ENTERING);

    this.timeline = gsap.timeline({
      onComplete: () => {
        this.stateManager.setState(EXPERIENCE_STATE.ENVELOPE_IDLE);
        if (onComplete) onComplete();
      }
    });

    // 1. Ascension principale vers l'overshoot (-6px)
    this.timeline.to(motionWrapper, {
      y: config.settle.overshootY,
      scale: config.settle.overshootScale,
      duration: config.duration,
      ease: config.ease
    }, 0);

    // 2. Opacité progressive devenant 1 à ~65% de la durée
    const opacityDuration = config.duration * config.opacityDurationPercent;
    this.timeline.to(motionWrapper, {
      opacity: 1,
      duration: opacityDuration,
      ease: config.opacityEase
    }, 0);

    // 3. Apparition douce de l'ombre au sol synchronisée avec l'arrivée
    if (shadow) {
      this.timeline.to(shadow, {
        opacity: MOTION.shadow.baseOpacity,
        scaleX: 1.0,
        duration: config.duration * 0.9,
        ease: 'power2.out'
      }, config.duration * 0.1);
    }

    // 4. Stabilisation / Micro-settle (-6px -> 0px)
    this.timeline.add(() => {
      this.stateManager.setState(EXPERIENCE_STATE.ENVELOPE_SETTLING);
    });

    this.timeline.to(motionWrapper, {
      y: 0,
      scale: config.finalScale,
      duration: config.settle.duration,
      ease: config.settle.ease
    });
  }

  playReducedMotion({ onComplete } = {}) {
    const motionWrapper = this.scene.elements.motionWrapper;
    const shadow = this.scene.elements.shadow;
    const red = MOTION.reducedMotion;

    gsap.set(motionWrapper, {
      y: red.translateY,
      scale: 1,
      opacity: 0,
      rotation: 0
    });

    if (shadow) {
      gsap.set(shadow, {
        opacity: 0,
        scaleX: 1.0
      });
    }

    this.stateManager.setState(EXPERIENCE_STATE.ENVELOPE_ENTERING);

    this.timeline = gsap.timeline({
      onComplete: () => {
        this.stateManager.setState(EXPERIENCE_STATE.ENVELOPE_IDLE);
        if (onComplete) onComplete();
      }
    });

    this.timeline.to(motionWrapper, {
      y: 0,
      opacity: 1,
      duration: red.duration,
      ease: red.ease
    }, 0);

    if (shadow) {
      this.timeline.to(shadow, {
        opacity: MOTION.shadow.baseOpacity,
        duration: red.duration,
        ease: red.ease
      }, 0);
    }
  }

  kill() {
    if (this.timeline) {
      this.timeline.kill();
      this.timeline = null;
    }
  }
}
