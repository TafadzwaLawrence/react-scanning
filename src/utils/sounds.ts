/**
 * Sound utilities using Howler.js
 * Howler.js handles Web Audio API, HTML5 Audio fallback, and mobile quirks
 */
import { Howl, Howler } from 'howler';

// Sound instances
let successSound: Howl | null = null;
let failureSound: Howl | null = null;
let initialized = false;

// Get the base URL for audio files
const getAudioPath = (filename: string): string => {
  const base = import.meta.env.BASE_URL || '/';
  return `${base}sounds/${filename}`;
};

/**
 * Initialize sounds (call after user interaction for mobile)
 */
export const initAudio = (): void => {
  if (initialized) return;
  
  try {
    console.log('[Sound] Initializing Howler.js sounds...');
    
    // Create success sound
    successSound = new Howl({
      src: [getAudioPath('success.mp3')],
      volume: 1.0,
      preload: true,
      onload: () => console.log('[Sound] Success sound loaded'),
      onloaderror: (_id, err) => console.error('[Sound] Success sound load error:', err),
      onplayerror: (_id, err) => {
        console.error('[Sound] Success sound play error:', err);
        // Try to unlock and replay
        Howler.ctx?.resume().then(() => {
          successSound?.play();
        });
      },
    });

    // Create failure sound
    failureSound = new Howl({
      src: [getAudioPath('failure.mp3')],
      volume: 1.0,
      preload: true,
      onload: () => console.log('[Sound] Failure sound loaded'),
      onloaderror: (_id, err) => console.error('[Sound] Failure sound load error:', err),
      onplayerror: (_id, err) => {
        console.error('[Sound] Failure sound play error:', err);
        // Try to unlock and replay
        Howler.ctx?.resume().then(() => {
          failureSound?.play();
        });
      },
    });

    // Unlock audio context on mobile
    if (Howler.ctx && Howler.ctx.state === 'suspended') {
      Howler.ctx.resume().then(() => {
        console.log('[Sound] Audio context resumed');
      });
    }

    initialized = true;
    console.log('[Sound] Initialization complete');
  } catch (error) {
    console.error('[Sound] Failed to initialize:', error);
  }
};

/**
 * Play success sound - for valid ticket scans
 */
export const playSuccessSound = (): void => {
  console.log('[Sound] Playing success sound');
  
  if (!initialized) {
    initAudio();
  }

  if (successSound) {
    // Stop any currently playing instance and play fresh
    successSound.stop();
    successSound.play();
  } else {
    console.warn('[Sound] Success sound not available');
  }
};

/**
 * Play failure/error sound - for invalid/used ticket scans
 */
export const playFailureSound = (): void => {
  console.log('[Sound] Playing failure sound');
  
  if (!initialized) {
    initAudio();
  }

  if (failureSound) {
    // Stop any currently playing instance and play fresh
    failureSound.stop();
    failureSound.play();
  } else {
    console.warn('[Sound] Failure sound not available');
  }
};

/**
 * Play warning sound - for "already used" tickets
 */
export const playWarningSound = (): void => {
  playFailureSound();
};

/**
 * Play beep sound
 */
export const playBeep = (): void => {
  playSuccessSound();
};

/**
 * Check if audio is ready
 */
export const isAudioReady = (): boolean => initialized;

/**
 * Unlock audio (call on user gesture)
 */
export const unlockAudio = (): void => {
  if (Howler.ctx && Howler.ctx.state === 'suspended') {
    Howler.ctx.resume();
  }
  // Also init if not done
  if (!initialized) {
    initAudio();
  }
};

/**
 * Sound player interface for components
 */
export const SoundPlayer = {
  success: playSuccessSound,
  failure: playFailureSound,
  warning: playWarningSound,
  beep: playBeep,
  init: initAudio,
  unlock: unlockAudio,
  isReady: isAudioReady,
};

export default SoundPlayer;
