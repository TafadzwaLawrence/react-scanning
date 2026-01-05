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
  const lastScannedRef = useRef<string>('');
  const lastScannedTimeRef = useRef<number>(0);
  const cooldownMs = 3000;

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

      lastScannedRef.current = decodedText;
      lastScannedTimeRef.current = now;
      onScan(decodedText);
    },
    [onScan]
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
            fps: 15,
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

      {/* Loading indicator */}
      {isStarting && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 rounded-xl">
          <div className="text-white text-center">
            <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p>Starting camera...</p>
          </div>
        </div>
      )}

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
