import React, { useEffect, useRef, useState, memo } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

interface QRScannerProps {
  onScan: (qrCode: string) => void;
  onError?: (error: string) => void;
}

// Supported formats - QR codes and common barcodes
const SUPPORTED_FORMATS = [
  Html5QrcodeSupportedFormats.QR_CODE,
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
];

// Memoized component - NEVER re-renders from parent updates
export const QRScanner: React.FC<QRScannerProps> = memo(({ onScan, onError }) => {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Store callbacks in refs - updates don't cause re-renders
  const onScanRef = useRef(onScan);
  const onErrorRef = useRef(onError);
  
  const [isFlashOn, setIsFlashOn] = useState(false);
  const [hasFlash, setHasFlash] = useState(false);
  const [isStarting, setIsStarting] = useState(true);
  const [scanFlash, setScanFlash] = useState(false);

  // Update refs silently (no re-render, no effect trigger)
  onScanRef.current = onScan;
  onErrorRef.current = onError;

  // Start scanner ONCE on mount - empty deps = run once only
  useEffect(() => {
    const elementId = 'qr-reader';
    let mounted = true;

    const vibrate = () => {
      if ('vibrate' in navigator) {
        try { navigator.vibrate(80); } catch {}
      }
    };

    const startScanner = async () => {
      try {
        await new Promise(resolve => setTimeout(resolve, 150));
        if (!mounted) return;

        const html5QrCode = new Html5Qrcode(elementId, {
          formatsToSupport: SUPPORTED_FORMATS,
          verbose: false,
        });
        scannerRef.current = html5QrCode;

        const containerWidth = containerRef.current?.clientWidth || 300;
        const qrboxSize = Math.min(containerWidth - 40, 260);

        await html5QrCode.start(
          { facingMode: 'environment' },
          {
            fps: 30,
            qrbox: { width: qrboxSize, height: qrboxSize },
            aspectRatio: 1,
            disableFlip: false,
          },
          (decodedText) => {
            // Quick visual flash
            setScanFlash(true);
            setTimeout(() => setScanFlash(false), 150);
            
            // Haptic
            vibrate();
            
            // Call via ref - never stale
            onScanRef.current(decodedText);
          },
          () => {} // Ignore empty frames
        );

        if (!mounted) {
          await html5QrCode.stop();
          return;
        }

        // Check flash capability
        try {
          const track = html5QrCode.getRunningTrackCameraCapabilities();
          setHasFlash(track?.torchFeature()?.isSupported() || false);
        } catch {
          setHasFlash(false);
        }

        setIsStarting(false);
      } catch (err) {
        console.error('Scanner error:', err);
        if (mounted) {
          onErrorRef.current?.('Camera failed. Check permissions.');
          setIsStarting(false);
        }
      }
    };

    startScanner();

    // Cleanup only on unmount (leaving page)
    return () => {
      mounted = false;
      if (scannerRef.current) {
        try {
          const state = scannerRef.current.getState();
          if (state === 2) {
            scannerRef.current.stop().catch(() => {});
          }
          scannerRef.current.clear();
        } catch {}
        scannerRef.current = null;
      }
    };
  }, []); // EMPTY DEPS - runs once on mount, cleanup on unmount ONLY

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
      console.error('Flash error:', err);
    }
  };

  return (
    <div className="relative w-full h-full" ref={containerRef}>
      <div
        id="qr-reader"
        className="w-full h-full overflow-hidden bg-black"
        style={{ minHeight: '350px' }}
      />

      {/* Scan focus frame */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        <div 
          className={`
            w-64 h-64 border-2 rounded-lg transition-all duration-100
            ${scanFlash ? 'border-green-400 bg-green-400/30 scale-95' : 'border-white/60'}
          `}
        >
          {/* Corners */}
          <div className="absolute -top-0.5 -left-0.5 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-lg" />
          <div className="absolute -top-0.5 -right-0.5 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-lg" />
          <div className="absolute -bottom-0.5 -left-0.5 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-lg" />
          <div className="absolute -bottom-0.5 -right-0.5 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-lg" />
          
          {/* Scan line */}
          {!scanFlash && (
            <div className="absolute inset-x-4 top-1/2 h-0.5 bg-gradient-to-r from-transparent via-indigo-400 to-transparent animate-pulse" />
          )}
        </div>
      </div>

      {/* Loading */}
      {isStarting && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/90">
          <div className="text-white text-center">
            <div className="w-10 h-10 border-3 border-white border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm">Starting camera...</p>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="absolute top-4 left-0 right-0 text-center">
        <span className="text-white/90 text-sm bg-black/50 px-4 py-1.5 rounded-full">
          Point at QR code
        </span>
      </div>

      {/* Flash button */}
      {hasFlash && !isStarting && (
        <div className="absolute bottom-4 left-0 right-0 flex justify-center">
          <button
            onClick={toggleFlash}
            className={`p-3 rounded-full transition-colors ${
              isFlashOn ? 'bg-amber-500 text-white' : 'bg-white/20 text-white backdrop-blur'
            }`}
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}, () => true); // Custom comparison - ALWAYS return true = NEVER re-render from props
