/**
 * Sound utilities using Tone.js for reliable audio feedback
 * Generates sounds programmatically - no external files needed
 */

import * as Tone from 'tone';

// Flag to track if audio context is started
let audioContextStarted = false;

/**
 * Initialize audio context (must be called after user interaction)
 */
export const initAudio = async (): Promise<void> => {
  if (audioContextStarted) return;
  
  try {
    await Tone.start();
    audioContextStarted = true;
    console.log('Audio context started');
  } catch (error) {
    console.error('Failed to start audio context:', error);
  }
};

/**
 * Play a success sound - pleasant ascending chime
 * Perfect for valid ticket scans
 */
export const playSuccessSound = async (): Promise<void> => {
  if (!audioContextStarted) {
    await initAudio();
  }

  try {
    // Create a pleasant success chime using two synths
    const synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'sine' },
      envelope: {
        attack: 0.01,
        decay: 0.2,
        sustain: 0.1,
        release: 0.3,
      },
    }).toDestination();

    synth.volume.value = -6; // Slightly quieter

    // Play ascending notes for success feeling
    const now = Tone.now();
    synth.triggerAttackRelease('C5', '8n', now);
    synth.triggerAttackRelease('E5', '8n', now + 0.08);
    synth.triggerAttackRelease('G5', '8n', now + 0.16);

    // Clean up after sound finishes
    setTimeout(() => {
      synth.dispose();
    }, 800);
  } catch (error) {
    console.error('Error playing success sound:', error);
  }
};

/**
 * Play a failure/error sound - descending tone
 * Perfect for invalid/used ticket scans
 */
export const playFailureSound = async (): Promise<void> => {
  if (!audioContextStarted) {
    await initAudio();
  }

  try {
    const synth = new Tone.Synth({
      oscillator: { type: 'square' },
      envelope: {
        attack: 0.01,
        decay: 0.1,
        sustain: 0.2,
        release: 0.2,
      },
    }).toDestination();

    synth.volume.value = -10;

    // Play a buzzer-like descending tone
    const now = Tone.now();
    synth.triggerAttackRelease('A4', '16n', now);
    synth.triggerAttackRelease('F4', '16n', now + 0.1);

    setTimeout(() => {
      synth.dispose();
    }, 500);
  } catch (error) {
    console.error('Error playing failure sound:', error);
  }
};

/**
 * Play a warning sound - for "already used" tickets
 */
export const playWarningSound = async (): Promise<void> => {
  if (!audioContextStarted) {
    await initAudio();
  }

  try {
    const synth = new Tone.Synth({
      oscillator: { type: 'triangle' },
      envelope: {
        attack: 0.01,
        decay: 0.15,
        sustain: 0.1,
        release: 0.2,
      },
    }).toDestination();

    synth.volume.value = -8;

    // Double beep for warning
    const now = Tone.now();
    synth.triggerAttackRelease('D5', '16n', now);
    synth.triggerAttackRelease('D5', '16n', now + 0.15);

    setTimeout(() => {
      synth.dispose();
    }, 500);
  } catch (error) {
    console.error('Error playing warning sound:', error);
  }
};

/**
 * Play a simple beep - for scan detection
 */
export const playBeep = async (): Promise<void> => {
  if (!audioContextStarted) {
    await initAudio();
  }

  try {
    const synth = new Tone.Synth({
      oscillator: { type: 'sine' },
      envelope: {
        attack: 0.005,
        decay: 0.1,
        sustain: 0,
        release: 0.1,
      },
    }).toDestination();

    synth.volume.value = -12;
    synth.triggerAttackRelease('C6', '32n');

    setTimeout(() => {
      synth.dispose();
    }, 300);
  } catch (error) {
    console.error('Error playing beep:', error);
  }
};

/**
 * Sound player hook-like interface for components
 */
export const SoundPlayer = {
  success: playSuccessSound,
  failure: playFailureSound,
  warning: playWarningSound,
  beep: playBeep,
  init: initAudio,
};

export default SoundPlayer;
