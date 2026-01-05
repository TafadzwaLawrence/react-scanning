import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

interface QRScannerProps {
  onScan: (qrCode: string) => void;
  isEnabled: boolean;
  onError?: (error: string) => void;
}

export const QRScanner: React.FC<QRScannerProps> = ({
  onScan,
  isEnabled,
  onError,
}) => {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [isFlashOn, setIsFlashOn] = useState(false);
  const [hasFlash, setHasFlash] = useState(false);
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

    const startScanner = async () => {
      try {
        const html5QrCode = new Html5Qrcode(elementId);
        scannerRef.current = html5QrCode;

        const devices = await Html5Qrcode.getCameras();
        if (devices && devices.length > 0) {
          // Prefer back camera
          const backCamera = devices.find(
            (d) =>
              d.label.toLowerCase().includes('back') ||
              d.label.toLowerCase().includes('rear')
          );
          const cameraId = backCamera ? backCamera.id : devices[0].id;

          await html5QrCode.start(
            cameraId,
            {
              fps: 10,
              qrbox: { width: 250, height: 250 },
              aspectRatio: 1,
            },
            handleScan,
            () => {} // Ignore scan errors
          );

          // Check if flash is available
          try {
            const state = html5QrCode.getState();
            // Flash detection is best-effort; assume available on mobile devices
            const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent);
            setHasFlash(isMobile && state !== undefined);
          } catch {
            setHasFlash(false);
          }
        }
      } catch (err) {
        console.error('Error starting scanner:', err);
        onError?.('Failed to start camera. Please check permissions.');
      }
    };

    const stopScanner = async () => {
      if (scannerRef.current) {
        try {
          await scannerRef.current.stop();
          scannerRef.current.clear();
        } catch (err) {
          console.error('Error stopping scanner:', err);
        }
      }
    };

    if (isEnabled) {
      startScanner();
    }

    return () => {
      stopScanner();
    };
  }, [isEnabled, handleScan, onError]);

  const toggleFlash = async () => {
    if (!scannerRef.current || !hasFlash) return;

    try {
      const newState = !isFlashOn;
      await scannerRef.current.applyVideoConstraints({
        // @ts-expect-error torch is a valid constraint
        advanced: [{ torch: newState }],
      });
      setIsFlashOn(newState);
    } catch (err) {
      console.error('Error toggling flash:', err);
    }
  };

  if (!isEnabled) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-900 rounded-xl">
        <p className="text-gray-400">Scanner paused</p>
      </div>
    );
  }

  return (
    <div className="relative w-full">
      <div
        id="qr-reader"
        className="w-full overflow-hidden rounded-xl bg-black"
        style={{ minHeight: '300px' }}
      />

      {/* Scanner Overlay */}
      <div className="scanner-overlay pointer-events-none">
        <div className="scanner-frame" />
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
