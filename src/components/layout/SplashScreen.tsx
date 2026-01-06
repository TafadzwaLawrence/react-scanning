import React, { useEffect, useState } from 'react';

interface SplashScreenProps {
  onFinish: () => void;
  duration?: number;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ 
  onFinish, 
  duration = 2000 
}) => {
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    // Start fade out before duration ends
    const fadeTimer = setTimeout(() => {
      setFadeOut(true);
    }, duration - 500);

    // Call onFinish after full duration
    const finishTimer = setTimeout(() => {
      onFinish();
    }, duration);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(finishTimer);
    };
  }, [duration, onFinish]);

  return (
    <div
      className={`
        fixed inset-0 z-[9999] 
        bg-gradient-to-br from-indigo-600 via-purple-600 to-violet-700
        flex flex-col items-center justify-center
        transition-opacity duration-500 ease-out
        ${fadeOut ? 'opacity-0' : 'opacity-100'}
      `}
    >
      {/* Logo container with animation */}
      <div className={`
        transform transition-all duration-700 ease-out
        ${fadeOut ? 'scale-110 opacity-0' : 'scale-100 opacity-100'}
      `}>
        {/* Logo image */}
        <div className="w-32 h-32 mb-6 animate-pulse-slow">
          <img
            src="/icons/icon-512.png"
            alt="263tickets Scanner"
            className="w-full h-full object-contain drop-shadow-2xl rounded-3xl"
          />
        </div>
      </div>

      {/* App name */}
      <div className={`
        text-center transform transition-all duration-500 delay-200
        ${fadeOut ? 'translate-y-4 opacity-0' : 'translate-y-0 opacity-100'}
      `}>
        <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">
          263tickets
        </h1>
        <p className="text-white/80 text-sm font-medium">
          Ticket Scanner
        </p>
      </div>

      {/* Loading indicator */}
      <div className={`
        mt-12 transform transition-all duration-500 delay-300
        ${fadeOut ? 'opacity-0' : 'opacity-100'}
      `}>
        <div className="flex space-x-2">
          <div className="w-2 h-2 bg-white/80 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 bg-white/80 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 bg-white/80 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>

      {/* Version */}
      <div className={`
        absolute bottom-8 text-white/50 text-xs
        transition-opacity duration-300
        ${fadeOut ? 'opacity-0' : 'opacity-100'}
      `}>
        v1.0.0
      </div>
    </div>
  );
};
