import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

interface QRScannerProps {
  onScan: (qrCode: string) => void;
  isEnabled: boolean;
  onError?: (error: string) => void;
}

// Supported formats for both QR codes and barcodes
const SUPPORTED_FORMATS = [
  Html5QrcodeSupportedFormats.QR_CODE,
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
  Html5QrcodeSupportedFormats.DATA_MATRIX,
  Html5QrcodeSupportedFormats.AZTEC,
  Html5QrcodeSupportedFormats.PDF_417,
];

export const QRScanner: React.FC<QRScannerProps> = ({
  onScan,
  isEnabled,
  onError,
}) => {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFlashOn, setIsFlashOn] = useState(false);
  const [hasFlash, setHasFlash] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const lastScannedRef = useRef<string>('');
  const lastScannedTimeRef = useRef<number>(0);
  const cooldownMs = 1500; // Reduced for faster queue processing

  // Vibrate on scan - stronger feedback when QR is detected
  const vibrateOnScan = useCallback(() => {
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate([100]); // 100ms vibration when QR is detected
      } catch (e) {
        console.log('Vibration failed:', e);
      }
    }
  }, []);

  const handleScan = useCallback(
    (decodedText: string) => {
      const now = Date.now();
      // Prevent duplicate scans within cooldown period
      if (
        decodedText === lastScannedRef.current &&
        now - lastScannedTimeRef.current < cooldownMs
      ) {
        return;
      }

      // Visual and haptic feedback
      setIsScanning(true);
      vibrateOnScan();
      
      // Reset visual feedback after short delay
      setTimeout(() => setIsScanning(false), 300);

      lastScannedRef.current = decodedText;
      lastScannedTimeRef.current = now;
      onScan(decodedText);
    },
    [onScan, vibrateOnScan]
  );

  useEffect(() => {
    const elementId = 'qr-reader';
    let mounted = true;

    const startScanner = async () => {
      if (isStarting || scannerRef.current) return;
      setIsStarting(true);

      try {
        // Wait a bit for DOM to be ready
        await new Promise(resolve => setTimeout(resolve, 100));
        
        if (!mounted) return;

        const html5QrCode = new Html5Qrcode(elementId, {
          formatsToSupport: SUPPORTED_FORMATS,
          verbose: false,
        });
        scannerRef.current = html5QrCode;

        // Calculate qrbox size based on container
        const containerWidth = containerRef.current?.clientWidth || 300;
        const qrboxSize = Math.min(containerWidth - 40, 280);

        // Use facingMode for reliable back camera selection
        await html5QrCode.start(
          { facingMode: 'environment' },
          {
            fps: 30, // Higher FPS for faster detection
            qrbox: { width: qrboxSize, height: qrboxSize },
            aspectRatio: 1,
            disableFlip: false,
          },
          handleScan,
          () => {} // Ignore scan errors (no QR found in frame)
        );

        if (!mounted) {
          await html5QrCode.stop();
          return;
        }

        // Check if flash is available
        try {
          const track = html5QrCode.getRunningTrackCameraCapabilities();
          setHasFlash(track?.torchFeature()?.isSupported() || false);
        } catch {
          setHasFlash(false);
        }
      } catch (err) {
        console.error('Error starting scanner:', err);
        if (mounted) {
          onError?.('Failed to start camera. Please check permissions and try again.');
        }
      } finally {
        if (mounted) {
          setIsStarting(false);
        }
      }
    };

    const stopScanner = async () => {
      if (scannerRef.current) {
        try {
          const state = scannerRef.current.getState();
          if (state === 2) { // Html5QrcodeScannerState.SCANNING
            await scannerRef.current.stop();
          }
          scannerRef.current.clear();
        } catch (err) {
          console.error('Error stopping scanner:', err);
        }
        scannerRef.current = null;
      }
    };

    if (isEnabled) {
      startScanner();
    } else {
      stopScanner();
    }

    return () => {
      mounted = false;
      stopScanner();
    };
  }, [isEnabled, handleScan, onError]);

  const toggleFlash = async () => {
    if (!scannerRef.current || !hasFlash) return;

    try {
      const track = scannerRef.current.getRunningTrackCameraCapabilities();
      if (track?.torchFeature()?.isSupported()) {
        const newState = !isFlashOn;
        await track.torchFeature().apply(newState);
        setIsFlashOn(newState);
      }
    } catch (err) {
      console.error('Error toggling flash:', err);
    }
  };

  if (!isEnabled) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-900 rounded-xl">
        <p className="text-gray-400">Processing...</p>
      </div>
    );
  }

  return (
    <div className="relative w-full" ref={containerRef}>
      <div
        id="qr-reader"
        className="w-full overflow-hidden rounded-xl bg-black"
        style={{ minHeight: '350px' }}
      />

      {/* Scan focus overlay */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        <div 
          className={`
            w-64 h-64 border-2 rounded-lg transition-all duration-200
            ${isScanning 
              ? 'border-green-500 bg-green-500/20 scale-95' 
              : 'border-white/50'
            }
          `}
        >
          {/* Corner markers */}
          <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-lg" />
          <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-lg" />
          <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-lg" />
          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-lg" />
          
          {/* Scanning line animation */}
          {!isScanning && (
            <div className="absolute inset-x-2 top-1/2 h-0.5 bg-gradient-to-r from-transparent via-primary-500 to-transparent animate-pulse" />
          )}
          
          {/* Scan success indicator */}
          {isScanning && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center animate-ping">
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Loading indicator */}
      {isStarting && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 rounded-xl">
          <div className="text-white text-center">
            <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p>Starting camera...</p>
          </div>
        </div>
      )}

      {/* Scan instruction */}
      <div className="absolute top-4 left-0 right-0 text-center">
        <p className="text-white/80 text-sm bg-black/40 inline-block px-3 py-1 rounded-full">
          Position QR code in frame
        </p>
      </div>

      {/* Controls */}
      <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
        {hasFlash && (
          <button
            onClick={toggleFlash}
            className={`
              p-3 rounded-full transition-colors
              ${
                isFlashOn
                  ? 'bg-amber-500 text-white'
                  : 'bg-white/20 text-white backdrop-blur'
              }
            `}
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};
