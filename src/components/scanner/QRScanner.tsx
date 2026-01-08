import React, { useEffect, useRef, useState, memo } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

interface QRScannerProps {
  // onScan may return a Promise so the scanner can await completion
  onScan: (qrCode: string) => void | Promise<any>;
  onError?: (error: string) => void;
}

// All supported formats for high precision detection
const SUPPORTED_FORMATS = [
  Html5QrcodeSupportedFormats.QR_CODE,
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
  Html5QrcodeSupportedFormats.DATA_MATRIX,
  Html5QrcodeSupportedFormats.PDF_417,
  Html5QrcodeSupportedFormats.AZTEC,
];

// Memoized component - NEVER re-renders from parent updates
export const QRScanner: React.FC<QRScannerProps> = memo(({ onScan, onError }) => {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Store callbacks in refs - updates don't cause re-renders
  type OnScanHandler = (qrCode: string) => void | Promise<any>;
  const onScanRef = useRef<OnScanHandler>(onScan);
  const onErrorRef = useRef<any>(onError);
  const isHandlingRef = useRef(false);
  
  const [isFlashOn, setIsFlashOn] = useState(false);
  const [hasFlash, setHasFlash] = useState(false);
  const [isStarting, setIsStarting] = useState(true);
  const [scanFlash, setScanFlash] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [isCooldown, setIsCooldown] = useState(false);

  // Expose start/stop to outside via refs so UI buttons can call them
  const startScannerRef = useRef<((isRestart?: boolean) => Promise<void>) | null>(null);
  const stopScannerRef = useRef<(() => Promise<void>) | null>(null);

  // Update refs silently (no re-render, no effect trigger)
  onScanRef.current = onScan;
  onErrorRef.current = onError;

  // Start scanner ONCE on mount - empty deps = run once only
  useEffect(() => {
    const elementId = 'qr-reader';
    let mounted = true;
    let isRestarting = false;

    const vibrate = () => {
      if ('vibrate' in navigator) {
        try { navigator.vibrate(80); } catch {}
      }
    };

    const stopScanner = async () => {
      if (scannerRef.current) {
        try {
          const state = scannerRef.current.getState();
          if (state === 2) { // SCANNING state
            await scannerRef.current.stop();
          }
        } catch {}
        try {
          scannerRef.current.clear();
        } catch {}
        scannerRef.current = null;
      }
    };

    const startScanner = async (isRestart = false) => {
      if (!mounted) return;
      
      try {
        // Stop any existing scanner first
        await stopScanner();

        // Wait a bit for camera to be released
        await new Promise(resolve => setTimeout(resolve, isRestart ? 500 : 150));
        if (!mounted) return;

        setIsStarting(true);

        // Clear the container first
        const container = document.getElementById(elementId);
        if (container) {
          container.innerHTML = '';
        }

        const html5QrCode = new Html5Qrcode(elementId, {
          formatsToSupport: SUPPORTED_FORMATS,
          verbose: false,
          experimentalFeatures: {
            useBarCodeDetectorIfSupported: true
          }
        });
        scannerRef.current = html5QrCode;

        const containerWidth = containerRef.current?.clientWidth || 300;
        const qrboxSize = Math.min(containerWidth - 32, 280);

        await html5QrCode.start(
          { facingMode: 'environment' },
          {
            fps: 30, // Lower FPS for better stability
            qrbox: { width: qrboxSize, height: qrboxSize },
            aspectRatio: 1,
            disableFlip: false,
          },
          async (decodedText) => {
            // Prevent concurrent processing of multiple detections
            if (isHandlingRef.current) return;
            isHandlingRef.current = true;
            setIsCooldown(true);

            try {
              setScanFlash(true);
              setTimeout(() => setScanFlash(false), 120);
              vibrate();

              const result = onScanRef.current(decodedText);
              // If handler returns a promise, await it so we pause until validation completes
              if (result && typeof (result as any).then === 'function') {
                try {
                  await (result as Promise<any>);
                } catch (e) {
                  // swallow - ScannerPage handles errors
                }
              }

              // Short cooldown after processing to avoid immediate re-detects
              await new Promise((r) => setTimeout(r, 700));
            } finally {
              isHandlingRef.current = false;
              setIsCooldown(false);
            }
          },
          () => {}
        );

        if (!mounted) {
          await stopScanner();
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
      } catch (err: any) {
        console.error('Scanner error:', err);
        if (mounted) {
          const msg = err?.message || String(err);
          // Detect permission denied
          if (msg.toLowerCase().includes('permission') || err?.name === 'NotAllowedError') {
            setPermissionDenied(true);
            onErrorRef.current?.('Camera permissions denied.');
          } else {
            onErrorRef.current?.('Camera failed. Check permissions.');
          }
          setIsStarting(false);
        }
      }
    };

    // Expose start/stop for external controls
    startScannerRef.current = startScanner;
    stopScannerRef.current = stopScanner;

    // Handle visibility change - restart camera when tab becomes visible again
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && mounted && !isRestarting) {
        // Add a small delay to ensure the page is fully visible
        await new Promise(resolve => setTimeout(resolve, 200));
        
        if (!mounted) return;
        
        // Check if camera is actually running by checking scanner state
        let needsRestart = false;
        
        if (!scannerRef.current) {
          needsRestart = true;
        } else {
          try {
            const state = scannerRef.current.getState();
            // State: 0 = NOT_STARTED, 1 = PAUSED, 2 = SCANNING
            if (state !== 2) {
              needsRestart = true;
            }
          } catch {
            needsRestart = true;
          }
        }
        
        if (needsRestart) {
          isRestarting = true;
          await startScanner(true);
          isRestarting = false;
        }
      }
    };

    // Handle page focus
    const handleFocus = () => {
      if (mounted && !isRestarting) {
        setTimeout(() => {
          handleVisibilityChange();
        }, 300);
      }
    };

    // Also handle when camera stream ends unexpectedly (browser kills it)
    const checkCameraStatus = () => {
      if (!mounted || isRestarting) return;
      
      if (document.visibilityState === 'visible') {
        handleVisibilityChange();
      }
    };

    startScanner(false);

    // Listen for visibility and focus changes
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    
    // Periodic check for camera status (every 2 seconds when visible)
    const intervalId = setInterval(checkCameraStatus, 2000);

    // Cleanup ONLY on unmount
    return () => {
      mounted = false;
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      stopScanner();
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

  const handleRetry = async () => {
    setPermissionDenied(false);
    setIsStarting(true);
    try {
      if (startScannerRef.current) await startScannerRef.current(true);
    } catch (e) {
      // ignore
    }
  };

  const handleStop = async () => {
    try {
      if (stopScannerRef.current) await stopScannerRef.current();
    } catch {}
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
            ${scanFlash ? 'border-success bg-success/30 scale-95' : 'border-white/60'}
          `}
        >
          {/* Corners */}
          <div className="absolute -top-0.5 -left-0.5 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-lg" />
          <div className="absolute -top-0.5 -right-0.5 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-lg" />
          <div className="absolute -bottom-0.5 -left-0.5 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-lg" />
          <div className="absolute -bottom-0.5 -right-0.5 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-lg" />
          
          {/* Scan line */}
          {!scanFlash && (
            <div className="absolute inset-x-4 top-1/2 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent animate-pulse" />
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

      {/* Validating overlay during cooldown */}
      {isCooldown && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-black/50 text-white px-4 py-2 rounded-md">Validating scan…</div>
        </div>
      )}

      {/* Permission denied modal */}
      {permissionDenied && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-50">
          <div className="bg-white rounded-lg p-6 w-[90%] max-w-sm text-center">
            <h3 className="text-lg font-semibold text-text-primary mb-2">Camera access needed</h3>
            <p className="text-sm text-text-secondary mb-4">This app needs permission to use the camera to scan tickets. Please enable camera access in your browser or device settings.</p>
            <div className="flex gap-3 justify-center">
              <button onClick={handleRetry} className="px-4 py-2 bg-black text-white rounded-md">Retry</button>
              <button onClick={() => setPermissionDenied(false)} className="px-4 py-2 border rounded-md">Close</button>
            </div>
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
            aria-label={isFlashOn ? 'Turn off flashlight' : 'Turn on flashlight'}
            className={`p-3 rounded-full transition-colors ${
              isFlashOn ? 'bg-warning text-white' : 'bg-white/20 text-white backdrop-blur'
            }`}
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </button>
        </div>
      )}

      {/* Stop button */}
      {!isStarting && (
        <div className="absolute top-4 right-4">
          <button
            onClick={handleStop}
            aria-label="Stop camera"
            className="px-3 py-2 bg-white/20 text-white rounded-md"
          >
            Stop
          </button>
        </div>
      )}
    </div>
  );
}, () => true); // Custom comparison - ALWAYS return true = NEVER re-render from props
