/**
 * Animation d'extraction continue de la carte
 * Utilise un tween unique de progression (progress 0..1) et l'interpolateur spline Catmull-Rom.
 * Supprime tous les arrêts ou paliers pour un mouvement gracieux, continu et aérien.
 */

import gsap from 'gsap';
import { sampleCardPose } from './cardPoseInterpolator.js';
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

    const { card, pocket, openEnvelope, shadow, interactiveCard } = this.scene.elements;
    const cfg = MOTION.extraction;
    const isReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    this.stateManager.setState(EXPERIENCE_STATE.CARD_EXTRACTING);

    const proxy = { progress: 0 };
    let envelopeFadingStarted = false;

    this.timeline = gsap.timeline();

    const duration = isReduced ? 1.2 : cfg.duration; // 2.85s

    // 1. Tween unique continu d'extraction
    this.timeline.to(proxy, {
      progress: 1,
      duration: duration,
      ease: cfg.ease,
      onUpdate: () => {
        const pose = sampleCardPose(proxy.progress);

        if (card) {
          gsap.set(card, {
            x: pose.x,
            y: pose.y,
            rotation: pose.rotation,
            scale: pose.scale
          });

          // Seuil de libération physique à P24
          if (pose.isFreed && card.style.zIndex !== '50') {
            card.style.zIndex = '50';
          }
        }

        // Effacement de l'enveloppe pendant la phase de recentrage (progress >= 0.74)
        if (proxy.progress >= 0.74 && !envelopeFadingStarted) {
          envelopeFadingStarted = true;
          const envelopeLayers = [openEnvelope, pocket].filter(Boolean);
          if (envelopeLayers.length > 0) {
            gsap.to(envelopeLayers, {
              opacity: 0,
              scale: cfg.envelopeFadeScale,
              y: cfg.envelopeFadeY,
              duration: cfg.envelopeFadeDuration,
              ease: 'power2.inOut',
              onComplete: () => {
                envelopeLayers.forEach((el) => {
                  el.style.display = 'none';
                });
              }
            });
          }
          if (shadow) {
            gsap.to(shadow, {
              opacity: 0,
              duration: cfg.envelopeFadeDuration,
              ease: 'power2.out',
              onComplete: () => {
                shadow.style.display = 'none';
              }
            });
          }
        }
      }
    });

    // 2. Transition fluide Carte Image -> Carte Interactive HTML/CSS à la fin de P26
    this.timeline.add(() => {
      this.stateManager.setState(EXPERIENCE_STATE.CARD_READY);

      if (interactiveCard && card) {
        // Superposition exacte de la carte interactive
        gsap.set(interactiveCard, {
          display: 'flex',
          opacity: 0
        });

        // Crossfade imperceptible (220ms)
        gsap.to(card, {
          opacity: 0,
          duration: MOTION.cardTransition.crossfadeDuration,
          ease: 'power1.out',
          onComplete: () => {
            card.style.display = 'none';
          }
        });

        gsap.to(interactiveCard, {
          opacity: 1,
          duration: MOTION.cardTransition.crossfadeDuration,
          ease: 'power1.in',
          onComplete: () => {
            if (onCardReady) onCardReady();
          }
        });
      } else {
        if (onCardReady) onCardReady();
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
