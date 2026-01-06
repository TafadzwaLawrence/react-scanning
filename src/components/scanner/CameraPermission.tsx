import React, { useState, useEffect, useCallback } from 'react';
import { Button, Card } from '@/components/ui';

type PermissionStatus = 'checking' | 'prompt' | 'granted' | 'denied' | 'unsupported' | 'https-required';

interface CameraPermissionProps {
  onPermissionGranted: () => void;
}

export const CameraPermission: React.FC<CameraPermissionProps> = ({ onPermissionGranted }) => {
  const [status, setStatus] = useState<PermissionStatus>('checking');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [deviceType, setDeviceType] = useState<'ios' | 'android' | 'web'>('web');

  // Detect device type
  useEffect(() => {
    const userAgent = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(userAgent)) {
      setDeviceType('ios');
    } else if (/android/.test(userAgent)) {
      setDeviceType('android');
    } else {
      setDeviceType('web');
    }
  }, []);

  // Check camera support and permissions
  const checkPermission = useCallback(async () => {
    setStatus('checking');
    setErrorMessage(null);

    // Check if we're in a secure context (HTTPS or localhost)
    // iOS Safari requires HTTPS for camera access
    const isSecure = window.isSecureContext || window.location.hostname === 'localhost';
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    
    if (!isSecure && isIOS) {
      setStatus('https-required');
      setErrorMessage('iOS requires HTTPS for camera access.');
      return;
    }

    // Check if mediaDevices is supported
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      // On iOS, this usually means we're not on HTTPS
      if (isIOS) {
        setStatus('https-required');
        setErrorMessage('Camera requires a secure connection (HTTPS) on iOS.');
      } else {
        setStatus('unsupported');
        setErrorMessage('Camera is not supported on this device or browser.');
      }
      return;
    }

    try {
      // Try to check permission status using Permissions API (not supported on iOS Safari)
      if (navigator.permissions && navigator.permissions.query) {
        try {
          const result = await navigator.permissions.query({ name: 'camera' as PermissionName });
          
          if (result.state === 'granted') {
            setStatus('granted');
            onPermissionGranted();
            return;
          } else if (result.state === 'denied') {
            setStatus('denied');
            return;
          }
          // 'prompt' falls through to show the request button
        } catch {
          // Permissions API might not support 'camera', continue to manual check
        }
      }

      // For iOS or when Permissions API isn't available, we need to actually request
      setStatus('prompt');
    } catch (err) {
      console.error('Permission check error:', err);
      setStatus('prompt');
    }
  }, [onPermissionGranted]);

  // Request camera permission
  const requestPermission = async () => {
    setStatus('checking');
    setErrorMessage(null);

    try {
      // Request camera access
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Prefer back camera
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      // Permission granted - stop the stream since we just needed to check
      stream.getTracks().forEach(track => track.stop());
      
      setStatus('granted');
      onPermissionGranted();
    } catch (err: unknown) {
      console.error('Camera permission error:', err);
      
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setStatus('denied');
          setErrorMessage('Camera access was denied. Please enable it in your browser/device settings.');
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          setStatus('unsupported');
          setErrorMessage('No camera found on this device.');
        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
          setStatus('denied');
          setErrorMessage('Camera is already in use by another application.');
        } else if (err.name === 'OverconstrainedError') {
          // Try again without constraints
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            stream.getTracks().forEach(track => track.stop());
            setStatus('granted');
            onPermissionGranted();
            return;
          } catch {
            setStatus('denied');
            setErrorMessage('Unable to access camera with required settings.');
          }
        } else {
          setStatus('denied');
          setErrorMessage(`Camera error: ${err.message}`);
        }
      } else {
        setStatus('denied');
        setErrorMessage('An unknown error occurred while accessing the camera.');
      }
    }
  };

  // Check permission on mount
  useEffect(() => {
    checkPermission();
  }, [checkPermission]);

  // Get device-specific instructions
  const getInstructions = () => {
    switch (deviceType) {
      case 'ios':
        return {
          title: 'Enable Camera on iOS',
          steps: [
            'Tap "Allow Camera Access" below',
            'When prompted, tap "Allow"',
            'If denied, go to Settings → Safari → Camera → Allow',
          ],
        };
      case 'android':
        return {
          title: 'Enable Camera on Android',
          steps: [
            'Tap "Allow Camera Access" below',
            'When prompted, tap "Allow"',
            'If denied, go to Settings → Apps → Browser → Permissions → Camera → Allow',
          ],
        };
      default:
        return {
          title: 'Enable Camera Access',
          steps: [
            'Click "Allow Camera Access" below',
            'When your browser asks, click "Allow"',
            'If blocked, click the camera icon in your address bar to enable',
          ],
        };
    }
  };

  const instructions = getInstructions();

  // Render based on status
  if (status === 'checking') {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4 pt-safe header-safe-dark">
        <Card className="w-full max-w-md text-center" padding="lg">
          <div className="animate-spin w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-600">Checking camera permissions...</p>
        </Card>
      </div>
    );
  }

  if (status === 'granted') {
    return null;
  }

  if (status === 'unsupported') {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4 pt-safe header-safe-dark">
        <Card className="w-full max-w-md text-center" padding="lg">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Camera Not Supported</h2>
          <p className="text-gray-600 mb-4">
            {errorMessage || 'Your device or browser does not support camera access.'}
          </p>
          <p className="text-sm text-gray-500">
            Please try using a different browser or device with camera support.
          </p>
        </Card>
      </div>
    );
  }

  if (status === 'https-required') {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4 pt-safe header-safe-dark">
        <Card className="w-full max-w-md text-center" padding="lg">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Secure Connection Required</h2>
          <p className="text-gray-600 mb-4">
            {deviceType === 'ios' 
              ? 'iOS Safari requires HTTPS (secure connection) to access the camera.'
              : 'Your browser requires HTTPS to access the camera.'}
          </p>
          
          <div className="bg-blue-50 rounded-lg p-4 mb-4 text-left">
            <h3 className="font-medium text-blue-900 mb-2">How to fix this:</h3>
            <ol className="text-sm text-blue-800 space-y-2">
              <li className="flex gap-2">
                <span className="font-bold">1.</span>
                <span>Deploy the app to a server with HTTPS (recommended)</span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold">2.</span>
                <span>Or access via localhost on the same device</span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold">3.</span>
                <span>Or use ngrok to create a secure tunnel: <code className="bg-blue-100 px-1 rounded">ngrok http 5174</code></span>
              </li>
            </ol>
          </div>

          <div className="bg-gray-50 rounded-lg p-3 text-left">
            <p className="text-xs text-gray-500">
              <strong>Current URL:</strong> {window.location.href}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              <strong>Secure Context:</strong> {window.isSecureContext ? 'Yes' : 'No'}
            </p>
          </div>

          <p className="text-xs text-gray-400 mt-4">
            This is a security requirement by {deviceType === 'ios' ? 'Apple' : 'your browser'} to protect your privacy.
          </p>
        </Card>
      </div>
    );
  }

  if (status === 'denied') {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4 pt-safe header-safe-dark">
        <Card className="w-full max-w-md text-center" padding="lg">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Camera Access Denied</h2>
          <p className="text-gray-600 mb-4">
            {errorMessage || 'Camera permission was denied. Please enable it to scan tickets.'}
          </p>
          
          <div className="bg-gray-50 rounded-lg p-4 mb-4 text-left">
            <h3 className="font-medium text-gray-900 mb-2">{instructions.title}</h3>
            <ol className="text-sm text-gray-600 space-y-1">
              {instructions.steps.map((step, index) => (
                <li key={index} className="flex gap-2">
                  <span className="font-medium text-indigo-600">{index + 1}.</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>

          <Button variant="primary" fullWidth onClick={requestPermission}>
            Try Again
          </Button>
        </Card>
      </div>
    );
  }

  // status === 'prompt'
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4 pt-safe header-safe-dark">
      <Card className="w-full max-w-md text-center" padding="lg">
        <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>

        <h2 className="text-xl font-bold text-gray-900 mb-2">Camera Permission Required</h2>
        <p className="text-gray-600 mb-6">
          To scan tickets, we need access to your camera. Your camera is only used for scanning QR codes and no images are stored.
        </p>

        <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
          <h3 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
            <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            Privacy Assurance
          </h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Camera is only used for QR code scanning</li>
            <li>• No photos or videos are recorded</li>
            <li>• Camera access can be revoked anytime</li>
          </ul>
        </div>

        <Button 
          variant="primary" 
          size="lg"
          fullWidth 
          onClick={requestPermission}
          leftIcon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            </svg>
          }
        >
          Allow Camera Access
        </Button>

        <p className="text-xs text-gray-400 mt-4">
          {deviceType === 'ios' && 'iOS: You may need to enable camera in Settings → Safari'}
          {deviceType === 'android' && 'Android: Tap "Allow" when prompted by your browser'}
          {deviceType === 'web' && 'Click "Allow" when your browser asks for permission'}
        </p>
      </Card>
    </div>
  );
};
