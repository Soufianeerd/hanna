/**
 * Gestionnaire audio pour l'expérience d'ouverture d'invitation Hanna
 * Morceau : "Lilet Elhena" (intro d'ouverture uniquement)
 * Arrêt en fondu à l'apparition de la carte (CARD_READY)
 */

import gsap from 'gsap';
import { AUDIO } from '../config/audio.js';

export class InvitationAudioManager {
  constructor() {
    this.audio = null;
    this.isPlaying = false;
    this.isMuted = false;
    this.hasFadedOut = false;
    this.maxWaitTimer = null;
    this.fadeTween = null;
    this.userGestureBound = false;
    this.onMuteChange = null;

    this.initAudio();
  }

  initAudio() {
    try {
      this.audio = new Audio();
      this.audio.src = AUDIO.invitationMusic.src;
      this.audio.preload = 'auto';
      this.audio.loop = false;
      this.audio.volume = 0;

      // Gestion propre en cas d'absence du fichier ou d'erreur de décodage
      this.audio.addEventListener('error', (e) => {
        console.warn('Audio non disponible ou en attente d’ajout manuel:', AUDIO.invitationMusic.src);
      });
    } catch (err) {
      console.warn('Initialisation audio ignorée:', err);
    }
  }

  preload() {
    if (!this.audio) return;
    try {
      this.audio.load();
    } catch (_) {}
  }

  /**
   * Tente de démarrer la musique.
   * Gère silencieusement le refus d'autoplay des navigateurs mobiles (Safari/Chrome).
   */
  start() {
    if (!this.audio || this.isPlaying || this.hasFadedOut) return;

    const targetVolume = this.isMuted ? 0 : AUDIO.invitationMusic.volume;

    const playPromise = this.audio.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          this.isPlaying = true;
          // Fade in initial
          if (this.fadeTween) this.fadeTween.kill();
          this.fadeTween = gsap.to(this.audio, {
            volume: targetVolume,
            duration: AUDIO.invitationMusic.fadeIn,
            ease: 'power1.out'
          });

          // Timeout de sécurité si l'utilisateur attend plus de 20s sans cliquer
          if (AUDIO.invitationMusic.maxWaitDuration > 0) {
            this.maxWaitTimer = setTimeout(() => {
              if (this.isPlaying && !this.hasFadedOut) {
                this.fadeOutAndStop(1.5);
              }
            }, AUDIO.invitationMusic.maxWaitDuration * 1000);
          }
        })
        .catch((err) => {
          // Autoplay bloqué par le navigateur : attend le premier geste utilisateur
          this.isPlaying = false;
          this.bindUserGesture();
        });
    }
  }

  /**
   * Attache un écouteur sur le premier geste utilisateur si l'autoplay a été bloqué
   */
  bindUserGesture() {
    if (this.userGestureBound || this.hasFadedOut) return;
    this.userGestureBound = true;

    const triggerPlay = () => {
      if (!this.isPlaying && !this.hasFadedOut) {
        this.start();
      }
      window.removeEventListener('pointerdown', triggerPlay);
      window.removeEventListener('touchstart', triggerPlay);
      window.removeEventListener('click', triggerPlay);
    };

    window.addEventListener('pointerdown', triggerPlay, { once: true, passive: true });
    window.addEventListener('touchstart', triggerPlay, { once: true, passive: true });
    window.addEventListener('click', triggerPlay, { once: true, passive: true });
  }

  /**
   * Fade out progressif et arrêt (appelé à CARD_READY)
   * @param {number} duration Durée du fondu en secondes (défaut: 0.8s)
   */
  fadeOutAndStop(duration = AUDIO.invitationMusic.fadeOut) {
    if (!this.audio || !this.isPlaying || this.hasFadedOut) return;
    this.hasFadedOut = true;

    if (this.maxWaitTimer) {
      clearTimeout(this.maxWaitTimer);
      this.maxWaitTimer = null;
    }

    if (this.fadeTween) this.fadeTween.kill();

    this.fadeTween = gsap.to(this.audio, {
      volume: 0,
      duration: duration,
      ease: 'power2.out',
      onComplete: () => {
        this.stop();
      }
    });
  }

  stop() {
    if (!this.audio) return;
    try {
      this.audio.pause();
      this.audio.currentTime = 0;
    } catch (_) {}
    this.isPlaying = false;
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.audio) {
      if (this.isMuted) {
        this.audio.volume = 0;
      } else if (this.isPlaying && !this.hasFadedOut) {
        this.audio.volume = AUDIO.invitationMusic.volume;
      }
    }
    if (this.onMuteChange) {
      this.onMuteChange(this.isMuted);
    }
    return this.isMuted;
  }

  destroy() {
    if (this.maxWaitTimer) {
      clearTimeout(this.maxWaitTimer);
      this.maxWaitTimer = null;
    }
    if (this.fadeTween) {
      this.fadeTween.kill();
      this.fadeTween = null;
    }
    this.stop();
    this.audio = null;
  }
}
