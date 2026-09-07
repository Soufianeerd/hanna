/**
 * Animation de flottement permanent (Idle Floating) — Phase 2
 *
 * Caractéristiques :
 * - Amplitude verticale discrète : ±4.5px
 * - Rotation Z minime : ±0.18°
 * - Déphasage organique entre Y (3.1s) et rotateZ (3.7s) pour éviter l'effet pendule
 * - Ombre réactive au sol (s'élargit et s'estompe quand l'enveloppe monte)
 * - Transitions sans à-coups depuis la fin du settle
 * - Désactivé en mode prefers-reduced-motion
 */

import gsap from 'gsap';
import { MOTION } from '../config/motion.js';

export class EnvelopeIdleAnimation {
  constructor(scene) {
    this.scene = scene;
    this.tweens = [];
    this.isRunning = false;
  }

  start() {
    this.stop();

    const isReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (isReduced) {
      this.isRunning = false;
      return;
    }

    const motionWrapper = this.scene.elements.motionWrapper;
    const shadow = this.scene.elements.shadow;
    if (!motionWrapper) return;

    const { idle, shadow: shadowCfg } = MOTION;
    this.isRunning = true;

    // 1. Mouvement vertical (Y) : amorce fluide depuis 0 vers -amplitude, puis oscillation continue
    const startYLoop = () => {
      if (!this.isRunning) return;
      const tweenY = gsap.fromTo(
        motionWrapper,
        { y: -idle.y.amplitude },
        {
          y: idle.y.amplitude,
          duration: idle.y.duration,
          ease: idle.y.ease,
          yoyo: true,
          repeat: -1
        }
      );
      this.tweens.push(tweenY);
    };

    const initialYTween = gsap.to(motionWrapper, {
      y: -idle.y.amplitude,
      duration: idle.y.duration / 2,
      ease: 'sine.out',
      onComplete: startYLoop
    });
    this.tweens.push(initialYTween);

    // 2. Rotation Z : déphasée pour un mouvement organique vivant
    const startRotLoop = () => {
      if (!this.isRunning) return;
      const tweenRot = gsap.fromTo(
        motionWrapper,
        { rotation: idle.rotation.amplitude },
        {
          rotation: -idle.rotation.amplitude,
          duration: idle.rotation.duration,
          ease: idle.rotation.ease,
          yoyo: true,
          repeat: -1
        }
      );
      this.tweens.push(tweenRot);
    };

    const initialRotTween = gsap.to(motionWrapper, {
      rotation: idle.rotation.amplitude,
      duration: idle.rotation.duration / 2,
      ease: 'sine.out',
      onComplete: startRotLoop
    });
    this.tweens.push(initialRotTween);

    // 3. Ombre au sol : respiration couplée avec l'élévation Y
    if (shadow) {
      const startShadowLoop = () => {
        if (!this.isRunning) return;
        const tweenShadow = gsap.fromTo(
          shadow,
          {
            scaleX: shadowCfg.idleScaleXMax,
            opacity: shadowCfg.idleOpacityMin
          },
          {
            scaleX: shadowCfg.idleScaleXMin,
            opacity: shadowCfg.idleOpacityMax,
            duration: idle.y.duration,
            ease: idle.y.ease,
            yoyo: true,
            repeat: -1
          }
        );
        this.tweens.push(tweenShadow);
      };

      const initialShadowTween = gsap.to(shadow, {
        scaleX: shadowCfg.idleScaleXMax,
        opacity: shadowCfg.idleOpacityMin,
        duration: idle.y.duration / 2,
        ease: 'sine.out',
        onComplete: startShadowLoop
      });
      this.tweens.push(initialShadowTween);
    }
  }

  stop() {
    this.isRunning = false;
    for (const tw of this.tweens) {
      if (tw && tw.kill) tw.kill();
    }
    this.tweens = [];
  }

  destroy() {
    this.stop();
  }
}
