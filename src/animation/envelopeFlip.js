/**
 * Séquence de retournement 3D et ouverture de l'enveloppe
 * - Neutralisation du floating sans à-coups
 * - Rotation 3D 180° de EnvelopeObject3D
 * - Micro-pause sur le dos fermé avec le sceau de cire
 * - Disparition élégante du sceau (micro-expansion puis effacement)
 * - Bascule transparente vers l'enveloppe ouverte
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
   */
  neutralizeMotion() {
    const motionWrapper = this.scene.elements.motionWrapper;
    return new Promise((resolve) => {
      gsap.to(motionWrapper, {
        y: 0,
        rotation: 0,
        duration: MOTION.neutralize.duration,
        ease: MOTION.neutralize.ease,
        onComplete: resolve
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

    const flipDuration = isReduced ? 0.45 : flipCfg.duration;

    this.timeline = gsap.timeline();

    // 1. Rotation 3D 0° -> 180°
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

    // Micro-pause contemplative (140ms)
    this.timeline.to({}, { duration: flipCfg.backPauseDuration });

    // 3. Début ouverture sceau : SEAL_OPENING
    this.timeline.add(() => {
      this.stateManager.setState(EXPERIENCE_STATE.SEAL_OPENING);
    });

    if (seal) {
      // Disparition du sceau : micro-expansion (1.055) puis rétrécissement (0.82) et fade-out
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

    // 4. Transition BackFace -> OpenScene (140ms)
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

    // Micro-pause avant de lancer l'extraction de la carte (100ms)
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
