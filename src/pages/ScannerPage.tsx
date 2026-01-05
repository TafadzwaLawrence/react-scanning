import React, { useCallback, useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Howl } from 'howler';
import { QRScanner, ScanResultDisplay, ScanStats, CameraPermission } from '@/components/scanner';
import { Badge, Button, Card } from '@/components/ui';
import { useAuthStore, useEventStore, useScannerStore, useSyncStore, useToast } from '@/stores';
import { ticketsAPI } from '@/services/api';
import { db } from '@/services/db';
import { generateUUID } from '@/utils';
import type { ScanResult, ScanResultType, VerifyResponse } from '@/types';
import { AxiosError } from 'axios';

// Preload sounds using Howler.js for reliable cross-platform audio
const successSound = new Howl({
  src: ['/sounds/success.mp3'],
  volume: 1.0,
  preload: true,
});

const failureSound = new Howl({
  src: ['/sounds/failure.mp3'],
  volume: 1.0,
  preload: true,
});

export const ScannerPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { deviceId, eventDetails } = useAuthStore();
  const { selectedTicketTypes } = useEventStore();
  const { stats, addScanResult, lastScanResult, clearLastResult } = useScannerStore();
  const { isOnline, addPendingScan, totalScans, syncedScans } = useSyncStore();

  const [cameraPermissionGranted, setCameraPermissionGranted] = useState(false);
  
  // Use refs for processing state - NO STATE CHANGES = NO CAMERA RESTART
  const isProcessingRef = useRef(false);
  const lastScanTimeRef = useRef(0);
  const SCAN_COOLDOWN = 1500;

  const eventId = eventDetails?.event_id;

  const syncPercentage =
    totalScans > 0 ? Math.round((syncedScans / totalScans) * 100) : 100;

  // Play sound using Howler - GUARANTEED to work every time
  const playSound = useCallback((type: 'success' | 'failure') => {
    if (type === 'success') {
      successSound.play();
    } else {
      failureSound.play();
    }
  }, []);

  // Vibrate helper
  const vibrate = useCallback((pattern: number | number[]) => {
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch (e) {
        // Ignore
      }
    }
  }, []);

  const handleScan = useCallback(
    async (qrCode: string) => {
      // Ref-based cooldown - no state changes, camera never restarts
      const now = Date.now();
      if (isProcessingRef.current || now - lastScanTimeRef.current < SCAN_COOLDOWN) {
        return;
      }
      
      isProcessingRef.current = true;
      lastScanTimeRef.current = now;

      if (!eventId || !deviceId) {
        toast.error('Setup required', 'Please log in again');
        isProcessingRef.current = false;
        return;
      }

      const resultId = generateUUID();
      let resultType: ScanResultType = 'error';
      let message = '';
      let ticket: ScanResult['ticket'];

      try {
        if (isOnline) {
          const response: VerifyResponse = await ticketsAPI.verify(
            eventId,
            qrCode,
            deviceId,
            selectedTicketTypes
          );

          if (response.status === 200) {
            playSound('success');
            vibrate(100);
            resultType = 'valid';
            message = 'Ticket validated';
            ticket = {
              type: (response as any).type,
              admittence: (response as any).admittence,
              number: (response as any).number,
            };
            db.markAsScanned(qrCode, deviceId).catch(console.error);
          } else if (response.status === 403) {
            playSound('failure');
            vibrate([50, 30, 50]);
            if ('scanned_at' in response) {
              resultType = 'used';
              message = `Scanned at ${response.scanned_at}`;
              ticket = { type: response.type, admittence: response.admittence, number: response.number };
            } else if ('ticket_name' in response) {
              resultType = 'wrong-type';
              message = `Type: ${response.ticket_name}`;
            } else {
              resultType = 'invalid';
              message = (response as any).message || 'Invalid';
            }
          } else if (response.status === 404) {
            playSound('failure');
            vibrate([50, 30, 50]);
            resultType = 'invalid';
            message = 'Not found';
          } else {
            playSound('failure');
            vibrate([50, 30, 50]);
            resultType = 'error';
            message = (response as any).message || 'Error';
          }
        } else {
          const localTicket = await db.getTicketByQRCode(qrCode);
          if (localTicket) {
            if (localTicket.log_count > 0) {
              playSound('failure');
              vibrate([50, 30, 50]);
              resultType = 'used';
              message = 'Already scanned';
              ticket = { type: localTicket.ticket_type, admittence: localTicket.ticket_admittence, number: localTicket.ticket_number };
            } else if (selectedTicketTypes.length > 0 && !selectedTicketTypes.includes(localTicket.ticket_type)) {
              playSound('failure');
              vibrate([50, 30, 50]);
              resultType = 'wrong-type';
              message = `Type: ${localTicket.ticket_type}`;
            } else {
              playSound('success');
              vibrate(100);
              resultType = 'valid';
              message = 'Offline validated';
              ticket = { type: localTicket.ticket_type, admittence: localTicket.ticket_admittence, number: localTicket.ticket_number };
              db.markAsScanned(qrCode, deviceId).catch(console.error);
              addPendingScan({ qrCode, deviceId, scannedAt: Date.now() });
            }
          } else {
            playSound('failure');
            vibrate([50, 30, 50]);
            resultType = 'invalid';
            message = 'Not in database';
          }
        }
      } catch (err) {
        playSound('failure');
        vibrate([50, 30, 50]);
        
        if (err instanceof AxiosError && err.response?.data) {
          const errorData = err.response.data as VerifyResponse;
          if (err.response.status === 404 || errorData.status === 404) {
            resultType = 'invalid';
            message = (errorData as any).message || 'Not found';
          } else if (err.response.status === 403 || errorData.status === 403) {
            if ('scanned_at' in errorData) {
              resultType = 'used';
              message = `Scanned at ${(errorData as any).scanned_at}`;
              ticket = { type: (errorData as any).type, admittence: (errorData as any).admittence, number: (errorData as any).number };
            } else if ('ticket_name' in errorData) {
              resultType = 'wrong-type';
              message = `Type: ${(errorData as any).ticket_name}`;
            } else {
              resultType = 'invalid';
              message = (errorData as any).message || 'Invalid';
            }
          } else {
            resultType = 'error';
            message = (errorData as any).message || 'Error';
          }
        } else {
          resultType = 'error';
          message = 'Network error';
        }
      }

      addScanResult({
        id: resultId,
        type: resultType,
        message,
        qrCode,
        ticket,
        scannedAt: new Date(),
        requiredTypes: selectedTicketTypes,
      });

      // Release lock after cooldown
      setTimeout(() => {
        isProcessingRef.current = false;
      }, SCAN_COOLDOWN);
    },
    [eventId, deviceId, selectedTicketTypes, isOnline, toast, playSound, vibrate, addScanResult, addPendingScan]
  );

  const handleDismissResult = useCallback(() => {
    clearLastResult();
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
    <div className="min-h-screen bg-gray-100 flex flex-col pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-3 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-900 truncate max-w-[200px]">
            {eventDetails?.event_name || 'Scanner'}
          </p>
          <p className="text-xs text-gray-500">
            Types: {selectedTicketTypes.length > 0 ? selectedTicketTypes.join(', ') : 'All'}
          </p>
        </div>
        <Badge variant={isOnline ? 'success' : 'error'} size="sm">
          {isOnline ? 'Online' : 'Offline'}
        </Badge>
      </div>

      {/* Stats */}
      <div className="p-3 bg-white border-b border-gray-200">
        <ScanStats stats={stats} syncPercentage={syncPercentage} />
      </div>

      {/* Scanner - NEVER stops, always running */}
      <div className="flex-1 relative">
        <QRScanner
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
