/**
 * Séquence de retournement 3D et ouverture de l'enveloppe
 * - Neutralisation du floating sans à-coups + respiration naturelle de 140ms
 * - Rotation 3D 180° ralentie et soyeuse (1.35s, power2.inOut)
 * - Pause contemplative de 260ms sur le dos avec le sceau
 * - Disparition élégante du sceau (micro-expansion puis effacement)
 * - Bascule transparente vers l'enveloppe ouverte (80-120ms)
 */

import gsap from 'gsap';
import { MOTION } from '../config/motion.js';
import { EXPERIENCE_STATE } from '../experience/experienceState.js';

export class EnvelopeFlipAnimation {
  constructor(scene, stateManager) {
    this.scene = scene;
    this.stateManager = stateManager;
    this.timeline = null;
  }

  /**
   * Neutralise le floating en douceur pour ramener le wrapper à y=0, rot=0
   * suivi d'une courte respiration naturelle avant le déclenchement du flip
   */
  neutralizeMotion() {
    const motionWrapper = this.scene.elements.motionWrapper;
    return new Promise((resolve) => {
      gsap.to(motionWrapper, {
        y: 0,
        rotation: 0,
        duration: MOTION.neutralize.duration,
        ease: MOTION.neutralize.ease,
        onComplete: () => {
          // Respiration naturelle de 140ms ("j'ai touché l'objet" -> "il se retourne")
          setTimeout(resolve, MOTION.neutralize.pauseBeforeFlip * 1000);
        }
      });
    });
  }

  /**
   * Exécute le flip 180° puis la disparition du sceau et la bascule ouverte
   */
  playFlipSequence({ onOpenReady } = {}) {
    this.kill();

    const { object3D, seal, backFace, openScene } = this.scene.elements;
    const flipCfg = MOTION.flip;
    const sealCfg = MOTION.seal;
    const openCfg = MOTION.openSwitch;
    const isReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    this.stateManager.setState(EXPERIENCE_STATE.ENVELOPE_TURNING);

    const flipDuration = isReduced ? 0.50 : flipCfg.duration;

    this.timeline = gsap.timeline();

    // 1. Rotation 3D 0° -> 180° (1.35s ralentie et gracieuse)
    this.timeline.to(object3D, {
      rotationY: 180,
      duration: flipDuration,
      ease: flipCfg.ease,
      transformOrigin: '50% 50%'
    });

    // 2. Arrivée à 180° : état ENVELOPE_BACK_READY
    this.timeline.add(() => {
      this.stateManager.setState(EXPERIENCE_STATE.ENVELOPE_BACK_READY);
    });

    // Pause contemplative (260ms) pour bien apprécier le dos et le sceau
    this.timeline.to({}, { duration: flipCfg.backPauseDuration });

    // 3. Début ouverture sceau : SEAL_OPENING
    this.timeline.add(() => {
      this.stateManager.setState(EXPERIENCE_STATE.SEAL_OPENING);
    });

    if (seal) {
      this.timeline.to(seal, {
        scale: sealCfg.overshootScale,
        rotation: sealCfg.endRotation,
        duration: sealCfg.duration * 0.45,
        ease: 'power1.out'
      });

      this.timeline.to(seal, {
        scale: sealCfg.endScale,
        opacity: 0,
        duration: sealCfg.duration * 0.55,
        ease: 'power2.in',
        onComplete: () => {
          seal.style.visibility = 'hidden';
        }
      });
    }

    // 4. Transition BackFace -> OpenScene (80-120ms crossfade)
    this.timeline.add(() => {
      this.stateManager.setState(EXPERIENCE_STATE.OPEN_ENVELOPE_READY);
      if (openScene) {
        openScene.style.visibility = 'visible';
      }
    });

    if (openScene && backFace) {
      this.timeline.to(backFace, {
        opacity: 0,
        duration: openCfg.duration,
        ease: openCfg.ease
      });

      this.timeline.to(openScene, {
        opacity: 1,
        duration: openCfg.duration,
        ease: openCfg.ease
      }, '<');
    }

    // Courte pause avant de lancer l'extraction de la carte (100ms)
    this.timeline.to({}, {
      duration: openCfg.pauseBeforeExtraction,
      onComplete: () => {
        if (onOpenReady) onOpenReady();
      }
    });
  }

  kill() {
    if (this.timeline) {
      this.timeline.kill();
      this.timeline = null;
    }
  }
}
