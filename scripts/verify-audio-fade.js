/**
 * Script de test ciblé pour valider le fondu audio synchronisé
 */
import { InvitationAudioManager } from '../src/audio/invitationAudio.js';
import gsap from 'gsap';

async function testAudioFade() {
  console.log('=== TEST UNITAIRE FADE-OUT AUDIO ===');
  
  // Mock HTMLAudioElement
  let isPaused = false;
  const mockAudio = {
    volume: 0.7,
    currentTime: 12.5,
    paused: false,
    pause() {
      this.paused = true;
      isPaused = true;
    },
    play() {
      this.paused = false;
      isPaused = false;
      return Promise.resolve();
    }
  };

  const manager = new InvitationAudioManager();
  manager.audio = mockAudio;
  manager.isPlaying = true;
  manager.available = true;
  manager.isMuted = false;

  console.log('1. État initial : volume =', manager.audio.volume, ', isPlaying =', manager.isPlaying);

  // Déclenchement du fondu 1.0s
  console.log('2. Appel fadeOutAndStop(1.0)...');
  manager.fadeOutAndStop(1.0);

  // Vérifier progression à 0.3s
  gsap.delayedCall(0.3, () => {
    console.log('   À t=0.3s : volume =', manager.audio.volume.toFixed(3), '(baisse progressive)');
    if (manager.audio.volume >= 0.7 || manager.audio.volume <= 0) {
      console.error('   ÉCHEC : le volume ne baisse pas progressivement !');
      process.exit(1);
    }
  });

  // Vérifier progression à 0.6s
  gsap.delayedCall(0.6, () => {
    console.log('   À t=0.6s : volume =', manager.audio.volume.toFixed(3), '(proche de la fin)');
  });

  // Vérifier completion à 1.05s
  gsap.delayedCall(1.05, () => {
    console.log('3. Fin du fondu :');
    console.log('   volume =', manager.audio.volume);
    console.log('   paused =', manager.audio.paused);
    console.log('   currentTime =', manager.audio.currentTime);
    console.log('   isPlaying =', manager.isPlaying);
    console.log('   hasFadedOut =', manager.hasFadedOut);

    const success = (
      manager.audio.volume === 0 &&
      manager.audio.paused === true &&
      manager.audio.currentTime === 0 &&
      manager.isPlaying === false &&
      manager.hasFadedOut === true
    );

    if (success) {
      console.log('=== TEST AUDIO RÉUSSI AVEC SUCCÈS ===');
      process.exit(0);
    } else {
      console.error('=== TEST AUDIO ÉCHOUÉ ===');
      process.exit(1);
    }
  });
}

testAudioFade();
