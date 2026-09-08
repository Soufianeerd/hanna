/**
 * Animation de flottement permanent (Idle Floating)
 *
 * Mouvement calibré en pixels écran réels (indépendant du runtimeScale) :
 * - Amplitude Y visible constante (~11px desktop, ~9px mobile)
 * - Amplitude rotation Z : ±0.30°
 * - Déphasage organique entre Y (3.0s) et rotation (3.8s)
 * - Ombre réactive couplée (respiration d'échelle et d'opacité)
 */

import gsap from 'gsap';
import { MOTION } from '../config/motion.js';

export class EnvelopeIdleAnimation {
  constructor(scene) {
    this.scene = scene;
    this.tweens = [];
    this.isRunning = false;
  }

  /**
   * Calcule l'amplitude logique en fonction de la taille d'écran et du runtimeScale
   */
  calculateLogicalAmplitude() {
    const isMobile = window.innerWidth < 600;
    const targetScreenAmp = isMobile
      ? MOTION.idle.screenAmplitudeYMobile
      : MOTION.idle.screenAmplitudeYDesktop;

    const runtimeScale = this.scene.runtimeScale || 1;
    // logicalAmplitude * runtimeScale = targetScreenAmp
    return targetScreenAmp / runtimeScale;
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

    const logicalAmpY = this.calculateLogicalAmplitude();

    // 1. Mouvement vertical (Y) : amorce fluide vers -amplitude, puis oscillation continue
    const startYLoop = () => {
      if (!this.isRunning) return;
      const tweenY = gsap.fromTo(
        motionWrapper,
        { y: -logicalAmpY },
        {
          y: logicalAmpY * 0.85, // Légère asymétrie naturelle (-logicalAmpY à +0.85*logicalAmpY)
          duration: idle.yDuration,
          ease: idle.yEase,
          yoyo: true,
          repeat: -1
        }
      );
      this.tweens.push(tweenY);
    };

    const initialYTween = gsap.to(motionWrapper, {
      y: -logicalAmpY,
      duration: idle.yDuration / 2,
      ease: 'sine.out',
      onComplete: startYLoop
    });
    this.tweens.push(initialYTween);

    // 2. Rotation Z : déphasée pour un mouvement organique vivant (3.8s)
    const startRotLoop = () => {
      if (!this.isRunning) return;
      const tweenRot = gsap.fromTo(
        motionWrapper,
        { rotation: idle.rotationAmplitude },
        {
          rotation: -idle.rotationAmplitude,
          duration: idle.rotationDuration,
          ease: idle.rotationEase,
          yoyo: true,
          repeat: -1
        }
      );
      this.tweens.push(tweenRot);
    };

    const initialRotTween = gsap.to(motionWrapper, {
      rotation: idle.rotationAmplitude,
      duration: idle.rotationDuration / 2,
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
            duration: idle.yDuration,
            ease: idle.yEase,
            yoyo: true,
            repeat: -1
          }
        );
        this.tweens.push(tweenShadow);
      };

      const initialShadowTween = gsap.to(shadow, {
        scaleX: shadowCfg.idleScaleXMax,
        opacity: shadowCfg.idleOpacityMin,
        duration: idle.yDuration / 2,
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
