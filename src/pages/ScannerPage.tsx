import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRScanner, ScanResultDisplay, ScanStats, CameraPermission } from '@/components/scanner';
import { Badge, Button, Card } from '@/components/ui';
import { useAuthStore, useEventStore, useScannerStore, useSyncStore, useToast } from '@/stores';
import { ticketsAPI } from '@/services/api';
import { db } from '@/services/db';
import { generateUUID } from '@/utils';
import type { ScanResult, ScanResultType, VerifyResponse } from '@/types';
import { AxiosError } from 'axios';

export const ScannerPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { deviceId, eventDetails, isAuthenticated } = useAuthStore();
  const { selectedTicketTypes } = useEventStore();
  const { stats, addScanResult, lastScanResult, clearLastResult } = useScannerStore();
  const { isOnline, addPendingScan, totalScans, syncedScans } = useSyncStore();

  const [isScanning, setIsScanning] = useState(true);
  const [cameraPermissionGranted, setCameraPermissionGranted] = useState(false);

  // Get event ID from authStore (set during login)
  const eventId = eventDetails?.event_id;

  // Debug log
  useEffect(() => {
    console.log('ScannerPage - Auth state:', { 
      isAuthenticated, 
      deviceId, 
      eventDetails,
      eventId 
    });
  }, [isAuthenticated, deviceId, eventDetails, eventId]);

  const syncPercentage =
    totalScans > 0 ? Math.round((syncedScans / totalScans) * 100) : 100;

  // Play sound
  const playSound = useCallback((type: 'success' | 'failure') => {
    try {
      const audio = new Audio(
        type === 'success' ? '/sounds/success.mp3' : '/sounds/failure.mp3'
      );
      audio.play().catch(() => {});
    } catch {
      // Ignore sound errors
    }
  }, []);

  // Vibrate
  const vibrate = useCallback((pattern: number[]) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  }, []);

  const handleScan = useCallback(
    async (qrCode: string) => {
      if (!eventId || !deviceId) {
        toast.error('Setup required', 'Please log in again to set up the event');
        return;
      }

      const resultId = generateUUID();
      let resultType: ScanResultType = 'error';
      let message = '';
      let ticket: ScanResult['ticket'];

      // Pause scanning during processing
      setIsScanning(false);

      try {
        if (isOnline) {
          // Online verification
          const response: VerifyResponse = await ticketsAPI.verify(
            eventId,
            qrCode,
            deviceId,
            selectedTicketTypes
          );

          if (response.status === 200) {
            resultType = 'valid';
            message = 'Ticket validated successfully';
            ticket = {
              type: (response as any).type,
              admittence: (response as any).admittence,
              number: (response as any).number,
            };
            playSound('success');
            vibrate([100]);

            // Mark as scanned locally
            await db.markAsScanned(qrCode, deviceId);
          } else if (response.status === 403) {
            if ('scanned_at' in response) {
              resultType = 'used';
              message = `Scanned at ${response.scanned_at}`;
              ticket = {
                type: response.type,
                admittence: response.admittence,
                number: response.number,
              };
            } else if ('ticket_name' in response) {
              resultType = 'wrong-type';
              message = `Ticket type: ${response.ticket_name}`;
            } else {
              resultType = 'invalid';
              message = (response as any).message || 'Invalid ticket';
            }
            playSound('failure');
            vibrate([100, 50, 100]);
          } else if (response.status === 404) {
            resultType = 'invalid';
            message = 'Ticket not found';
            playSound('failure');
            vibrate([100, 50, 100]);
          } else {
            // Handle any other status codes
            resultType = 'error';
            message = (response as any).message || 'Unknown verification error';
            playSound('failure');
            vibrate([100, 50, 100]);
          }
        } else {
          // Offline verification
          const localTicket = await db.getTicketByQRCode(qrCode);

          if (localTicket) {
            if (localTicket.log_count > 0) {
              resultType = 'used';
              message = 'Already scanned (offline)';
              ticket = {
                type: localTicket.ticket_type,
                admittence: localTicket.ticket_admittence,
                number: localTicket.ticket_number,
              };
              playSound('failure');
              vibrate([100, 50, 100]);
            } else if (!selectedTicketTypes.includes(localTicket.ticket_type)) {
              resultType = 'wrong-type';
              message = `Ticket type: ${localTicket.ticket_type}`;
              playSound('failure');
              vibrate([100, 50, 100]);
            } else {
              resultType = 'valid';
              message = 'Validated offline - will sync later';
              ticket = {
                type: localTicket.ticket_type,
                admittence: localTicket.ticket_admittence,
                number: localTicket.ticket_number,
              };
              playSound('success');
              vibrate([100]);

              // Mark as scanned locally and queue for sync
              await db.markAsScanned(qrCode, deviceId);
              addPendingScan({
                qrCode,
                deviceId,
                scannedAt: Date.now(),
              });
            }
          } else {
            resultType = 'invalid';
            message = 'Ticket not found in local database';
            playSound('failure');
            vibrate([100, 50, 100]);
          }
        }
      } catch (err) {
        console.error('Scan error:', err);
        
        // Handle axios errors with response data (non-2xx status codes)
        if (err instanceof AxiosError && err.response?.data) {
          const errorData = err.response.data as VerifyResponse;
          console.log('API error response:', errorData);
          
          if (err.response.status === 404 || errorData.status === 404) {
            resultType = 'invalid';
            message = (errorData as any).message || 'Ticket not found';
          } else if (err.response.status === 403 || errorData.status === 403) {
            if ('scanned_at' in errorData) {
              resultType = 'used';
              message = `Already scanned at ${(errorData as any).scanned_at}`;
              ticket = {
                type: (errorData as any).type,
                admittence: (errorData as any).admittence,
                number: (errorData as any).number,
              };
            } else if ('ticket_name' in errorData) {
              resultType = 'wrong-type';
              message = `Wrong ticket type: ${(errorData as any).ticket_name}`;
            } else {
              resultType = 'invalid';
              message = (errorData as any).message || 'Ticket not valid';
            }
          } else {
            resultType = 'error';
            message = (errorData as any).message || 'Verification failed';
          }
        } else {
          resultType = 'error';
          message = 'Network error - please check your connection';
        }
        
        playSound('failure');
        vibrate([100, 50, 100]);
      }

      const result: ScanResult = {
        id: resultId,
        type: resultType,
        message,
        qrCode,
        ticket,
        scannedAt: new Date(),
        requiredTypes: selectedTicketTypes,
      };

      addScanResult(result);

      // Resume scanning after a delay
      setTimeout(() => {
        setIsScanning(true);
      }, resultType === 'valid' ? 2000 : 3000);
    },
    [
      eventId,
      deviceId,
      selectedTicketTypes,
      isOnline,
      toast,
      playSound,
      vibrate,
      addScanResult,
      addPendingScan,
    ]
  );

  const handleDismissResult = useCallback(() => {
    clearLastResult();
    setIsScanning(true);
  }, [clearLastResult]);

  // Setup online/offline listener
  useEffect(() => {
    const updateOnlineStatus = () => {
      useSyncStore.getState().setOnline(navigator.onLine);
    };

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  // Handle camera permission granted
  const handlePermissionGranted = useCallback(() => {
    setCameraPermissionGranted(true);
  }, []);

  // Show setup required screen if no event ID
  if (!eventId || !deviceId) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4 pb-20">
        <Card className="w-full max-w-md text-center" padding="lg">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Setup Required</h2>
          <p className="text-gray-600 mb-6">
            Please log in to an event before you can start scanning tickets.
          </p>
          <Button
            variant="primary"
            fullWidth
            onClick={() => navigate('/login')}
          >
            Go to Login
          </Button>
        </Card>
      </div>
    );
  }

  // Show camera permission request first
  if (!cameraPermissionGranted) {
    return <CameraPermission onPermissionGranted={handlePermissionGranted} />;
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col pb-20">
      {/* Header */}
      <div className="bg-gray-800 text-white p-3 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium truncate max-w-[200px]">
            {eventDetails?.event_name || 'Scanner'}
          </p>
          <p className="text-xs text-gray-400">
            Types: {selectedTicketTypes.length > 0 ? selectedTicketTypes.join(', ') : 'All'}
          </p>
        </div>
        <Badge variant={isOnline ? 'success' : 'error'} size="sm">
          {isOnline ? 'Online' : 'Offline'}
        </Badge>
      </div>

      {/* Stats */}
      <div className="p-3 bg-gray-800">
        <ScanStats stats={stats} syncPercentage={syncPercentage} />
      </div>

      {/* Scanner */}
      <div className="flex-1 relative">
        <QRScanner
          isEnabled={isScanning && !lastScanResult}
          onScan={handleScan}
          onError={(error) => toast.error('Camera Error', error)}
        />
      </div>

      {/* Result Overlay */}
      <ScanResultDisplay
        result={lastScanResult}
        onDismiss={handleDismissResult}
      />
    </div>
  );
};
