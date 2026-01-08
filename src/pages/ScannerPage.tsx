import React, { useCallback, useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRScanner, ScanResultDisplay, ScanStats, CameraPermission } from '@/components/scanner';
import { Badge, Button, Card, Input, Modal } from '@/components/ui';
import { useAuthStore, useEventStore, useScannerStore, useSyncStore, useSettingsStore, useToast } from '@/stores';
import { ticketsAPI } from '@/services/api';
import { db } from '@/services/db';
import { generateUUID } from '@/utils';
import { SoundPlayer } from '@/utils/sounds';
import type { ScanResult, ScanResultType, VerifyResponse } from '@/types';
import { AxiosError } from 'axios';

export const ScannerPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { deviceId, eventDetails } = useAuthStore();
  const { selectedTicketTypes } = useEventStore();
  const { stats, addScanResult, lastScanResult, clearLastResult } = useScannerStore();
  const { isOnline, addPendingScan, totalScans, syncedScans } = useSyncStore();
  const { soundEnabled, vibrationEnabled } = useSettingsStore();

  // Check if we've previously granted permission (persisted in sessionStorage)
  const [cameraPermissionGranted, setCameraPermissionGranted] = useState(() => {
    return sessionStorage.getItem('cameraPermissionGranted') === 'true';
  });
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [isManualProcessing, setIsManualProcessing] = useState(false);
  
  // Use refs for processing state - NO STATE CHANGES = NO CAMERA RESTART
  const isProcessingRef = useRef(false);
  const lastScanTimeRef = useRef(0);
  const lastScannedCodeRef = useRef<string>('');
  const SCAN_COOLDOWN = 1200; // 1.2 second cooldown between same code

  const eventId = eventDetails?.event_id;

  const syncPercentage =
    totalScans > 0 ? Math.round((syncedScans / totalScans) * 100) : 100;

  // Initialize audio on first user interaction
  useEffect(() => {
    const initAudioOnInteraction = () => {
      SoundPlayer.init();
      document.removeEventListener('touchstart', initAudioOnInteraction);
      document.removeEventListener('click', initAudioOnInteraction);
    };
    
    document.addEventListener('touchstart', initAudioOnInteraction, { once: true });
    document.addEventListener('click', initAudioOnInteraction, { once: true });
    
    return () => {
      document.removeEventListener('touchstart', initAudioOnInteraction);
      document.removeEventListener('click', initAudioOnInteraction);
    };
  }, []);

  // Vibrate helper - respects settings
  const vibrate = useCallback((pattern: number | number[]) => {
    if (!vibrationEnabled) return;
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch (e) {
        // Ignore
      }
    }
  }, [vibrationEnabled]);

  // Play sound helper - respects settings
  const playSound = useCallback((type: 'success' | 'failure' | 'warning') => {
    if (!soundEnabled) return;
    if (type === 'success') SoundPlayer.success();
    else if (type === 'failure') SoundPlayer.failure();
    else if (type === 'warning') SoundPlayer.warning();
  }, [soundEnabled]);

  const handleScan = useCallback(
    async (qrCode: string) => {
      // Ref-based cooldown - no state changes, camera never restarts
      const now = Date.now();
      
      // Skip if same code scanned too quickly or still processing
      if (isProcessingRef.current) return;
      if (qrCode === lastScannedCodeRef.current && now - lastScanTimeRef.current < SCAN_COOLDOWN) {
        return;
      }
      
      isProcessingRef.current = true;
      lastScanTimeRef.current = now;
      lastScannedCodeRef.current = qrCode;

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
              playSound('warning');
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

      // Release lock after short delay
      setTimeout(() => {
        isProcessingRef.current = false;
      }, 300);
    },
    [eventId, deviceId, selectedTicketTypes, isOnline, toast, vibrate, playSound, addScanResult, addPendingScan]
  );

  const handleDismissResult = useCallback(() => {
    clearLastResult();
  }, [clearLastResult]);

  // Handle manual ticket entry
  const handleManualSubmit = useCallback(async () => {
    const code = manualCode.trim();
    if (!code) {
      toast.warning('Empty Code', 'Please enter a ticket code');
      return;
    }
    
    setIsManualProcessing(true);
    await handleScan(code);
    setIsManualProcessing(false);
    setManualCode('');
    setShowManualEntry(false);
  }, [manualCode, handleScan, toast]);

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
    sessionStorage.setItem('cameraPermissionGranted', 'true');
  }, []);

  // Show setup required screen if no event ID
  if (!eventId || !deviceId) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 pb-20">
        <Card className="w-full max-w-md text-center" padding="lg">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-text-primary mb-2">Setup Required</h2>
          <p className="text-text-secondary mb-6">
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
    <div className="min-h-screen bg-background flex flex-col pb-20">
      {/* Header */}
      <div className="bg-surface border-b border-border p-3 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-text-primary truncate max-w-[200px]">
            {eventDetails?.event_name || 'Scanner'}
          </p>
          <p className="text-xs text-text-secondary">
            Types: {selectedTicketTypes.length > 0 ? selectedTicketTypes.join(', ') : 'All'}
          </p>
        </div>
        <Badge variant={isOnline ? 'success' : 'error'} size="sm">
          {isOnline ? 'Online' : 'Offline'}
        </Badge>
      </div>

      {/* Stats */}
      <div className="p-3 bg-surface border-b border-border">
        <ScanStats stats={stats} syncPercentage={syncPercentage} />
      </div>

      {/* Scanner - NEVER stops, always running */}
      <div className="flex-1 relative">
        <QRScanner
          onScan={handleScan}
          onError={(error) => toast.error('Camera Error', error)}
        />
        
        {/* Manual Entry Button */}
        <div className="absolute bottom-20 left-0 right-0 flex justify-center">
          <button
            onClick={() => setShowManualEntry(true)}
            aria-label="Enter ticket code manually"
            className="bg-surface/95 text-text-primary px-4 py-2 rounded-full text-sm font-medium shadow-lg flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Enter Manually
          </button>
        </div>
      </div>

      {/* Manual Entry Modal */}
      <Modal
        isOpen={showManualEntry}
        onClose={() => setShowManualEntry(false)}
        title="Manual Ticket Entry"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Enter the ticket code or QR code value manually if the scanner cannot read it.
          </p>
          <Input
            label="Ticket Code"
            placeholder="Enter ticket code..."
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            disabled={isManualProcessing}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !isManualProcessing) {
                handleManualSubmit();
              }
            }}
            leftIcon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
              </svg>
            }
          />
          <div className="flex gap-3 pt-2">
            <Button
              variant="ghost"
              onClick={() => setShowManualEntry(false)}
              className="flex-1"
              disabled={isManualProcessing}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleManualSubmit}
              loading={isManualProcessing}
              className="flex-1"
              disabled={!manualCode.trim()}
            >
              Verify Ticket
            </Button>
          </div>
        </div>
      </Modal>

      {/* Result Overlay */}
      <ScanResultDisplay
        result={lastScanResult}
        onDismiss={handleDismissResult}
      />
    </div>
  );
};
