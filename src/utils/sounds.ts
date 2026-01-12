/**
 * Sound utilities using MP3 audio files
 * Uses preloaded Audio elements for reliable playback
 */

// Preload audio elements for instant playback
let successAudio: HTMLAudioElement | null = null;
let failureAudio: HTMLAudioElement | null = null;
let audioInitialized = false;

/**
 * Initialize audio elements (call after user interaction)
 */
export const initAudio = async (): Promise<void> => {
  if (audioInitialized) return;

  try {
    successAudio = new Audio('/sounds/success.mp3');
    failureAudio = new Audio('/sounds/failure.mp3');
    
    // Preload the audio files
    successAudio.load();
    failureAudio.load();
    
    audioInitialized = true;
  } catch (error) {
    console.error('Failed to initialize audio:', error);
  }
};

/**
 * Play a success sound - for valid ticket scans
 */
export const playSuccessSound = async (): Promise<void> => {
  if (!audioInitialized) {
    await initAudio();
  }

  try {
    if (successAudio) {
      successAudio.currentTime = 0;
      await successAudio.play();
    }
  } catch (error) {
    console.error('Error playing success sound:', error);
  }
};

/**
 * Play a failure/error sound - for invalid/used ticket scans
 */
export const playFailureSound = async (): Promise<void> => {
  if (!audioInitialized) {
    await initAudio();
  }

  try {
    if (failureAudio) {
      failureAudio.currentTime = 0;
      await failureAudio.play();
    }
  } catch (error) {
    console.error('Error playing failure sound:', error);
  }
};

/**
 * Play a warning sound - for "already used" tickets (uses failure sound)
 */
export const playWarningSound = async (): Promise<void> => {
  await playFailureSound();
};

/**
 * Play a simple beep - for scan detection (uses success sound)
 */
export const playBeep = async (): Promise<void> => {
  await playSuccessSound();
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
};

export default SoundPlayer;
