/**
 * Animation d'extraction de la carte selon les poses P12 à P26 du PDF
 */

import gsap from 'gsap';
import { PDF_CARD_POSES } from '../config/geometry.js';
import { MOTION } from '../config/motion.js';
import { EXPERIENCE_STATE } from '../experience/experienceState.js';

export class CardExtractionAnimation {
  constructor(scene, stateManager) {
    this.scene = scene;
    this.stateManager = stateManager;
    this.timeline = null;
  }

  play({ onCardReady } = {}) {
    this.kill();

    const { card, pocket, openEnvelope, shadow } = this.scene.elements;
    const cfg = MOTION.extraction;
    const isReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    this.stateManager.setState(EXPERIENCE_STATE.CARD_EXTRACTING);

    this.timeline = gsap.timeline({
      onComplete: () => {
        this.stateManager.setState(EXPERIENCE_STATE.CARD_READY);
        if (openEnvelope) openEnvelope.style.display = 'none';
        if (pocket) pocket.style.display = 'none';
        if (shadow) shadow.style.display = 'none';
        if (onCardReady) onCardReady();
      }
    });

    if (isReduced) {
      // Version simplifiée pour reduced-motion
      this.timeline.to(card, {
        x: PDF_CARD_POSES.P17.x,
        y: PDF_CARD_POSES.P17.y,
        rotation: PDF_CARD_POSES.P17.rotation,
        scale: PDF_CARD_POSES.P17.scale,
        duration: 0.4,
        ease: 'power1.out'
      });

      this.timeline.add(() => {
        if (card) card.style.zIndex = '50';
      });

      this.timeline.to(card, {
        x: PDF_CARD_POSES.P26.x,
        y: PDF_CARD_POSES.P26.y,
        rotation: PDF_CARD_POSES.P26.rotation,
        scale: PDF_CARD_POSES.P26.scale,
        duration: 0.4,
        ease: 'power2.out'
      });

      if (openEnvelope) {
        this.timeline.to(openEnvelope, {
          opacity: 0,
          y: cfg.envelopeFadeY,
          duration: 0.35
        }, '-=0.3');
      }

      return;
    }

    // Phase 1 : P12 -> P17 (Montée + Pivotement continu de -90° à 0°)
    const p12ToP17Poses = [
      PDF_CARD_POSES.P13,
      PDF_CARD_POSES.P14,
      PDF_CARD_POSES.P15,
      PDF_CARD_POSES.P16,
      PDF_CARD_POSES.P17
    ];
    const stepDurationP1 = cfg.p12ToP17Duration / p12ToP17Poses.length;

    p12ToP17Poses.forEach((pose) => {
      this.timeline.to(card, {
        x: pose.x,
        y: pose.y,
        rotation: pose.rotation,
        scale: pose.scale,
        duration: stepDurationP1,
        ease: 'power1.inOut'
      });
    });

    // Phase 2 : P17 -> P24 (Ascension verticale)
    const p17ToP24Poses = [
      PDF_CARD_POSES.P18,
      PDF_CARD_POSES.P19,
      PDF_CARD_POSES.P20,
      PDF_CARD_POSES.P21,
      PDF_CARD_POSES.P22,
      PDF_CARD_POSES.P23,
      PDF_CARD_POSES.P24
    ];
    const stepDurationP2 = cfg.p17ToP24Duration / p17ToP24Poses.length;

    p17ToP24Poses.forEach((pose) => {
      this.timeline.to(card, {
        x: pose.x,
        y: pose.y,
        rotation: 0,
        scale: pose.scale,
        duration: stepDurationP2,
        ease: 'linear'
      });
    });

    // Libération au seuil P24 : la carte passe au-dessus de la poche
    this.timeline.add(() => {
      if (card) card.style.zIndex = '50';
    });

    // Phase 3 : P24 -> P25 -> P26 (Descente vers le centre + disparition enveloppe)
    const stepDurationP3 = cfg.p24ToP26Duration / 2;

    this.timeline.to(card, {
      x: PDF_CARD_POSES.P25.x,
      y: PDF_CARD_POSES.P25.y,
      rotation: 0,
      scale: PDF_CARD_POSES.P25.scale,
      duration: stepDurationP3,
      ease: 'sine.inOut'
    });

    this.timeline.to(card, {
      x: PDF_CARD_POSES.P26.x,
      y: PDF_CARD_POSES.P26.y,
      rotation: 0,
      scale: PDF_CARD_POSES.P26.scale,
      duration: stepDurationP3,
      ease: 'power2.out'
    });

    // Effacement de l'enveloppe (fond + poche) et de l'ombre en arrière-plan pendant la descente
    const envelopeLayers = [openEnvelope, pocket].filter(Boolean);
    if (envelopeLayers.length > 0) {
      this.timeline.to(envelopeLayers, {
        opacity: 0,
        scale: cfg.envelopeFadeScale,
        y: cfg.envelopeFadeY,
        duration: cfg.envelopeFadeDuration,
        ease: 'power2.inOut'
      }, `-=${cfg.envelopeFadeDuration}`);
    }

    if (shadow) {
      this.timeline.to(shadow, {
        opacity: 0,
        duration: cfg.envelopeFadeDuration,
        ease: 'power2.out'
      }, `<`);
    }
  }

  kill() {
    if (this.timeline) {
      this.timeline.kill();
      this.timeline = null;
    }
  }
}
