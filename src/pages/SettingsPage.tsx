import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, Modal, Badge, Checkbox, Loading } from '@/components/ui';
import { useAuthStore, useEventStore, useSyncStore, useScannerStore, useSettingsStore, useToast } from '@/stores';
import { eventsAPI, authAPI, ticketsAPI } from '@/services/api';
import { db } from '@/services/db';
import type { TicketGroup } from '@/types';

export const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();

  const { deviceId, eventDetails, logout, session } = useAuthStore();
  const {
    selectedTicketTypes,
    setTicketTypes,
    downloadedTicketCount,
    setDownloadedCount,
    clearEvent,
  } = useEventStore();
  const { clearPendingScans, pendingScans, lastSyncTime, isOnline, startSync, completeSync, failSync, removePendingScan } = useSyncStore();
  const { resetStats, clearHistory } = useScannerStore();
  const { soundEnabled, vibrationEnabled, setSoundEnabled, setVibrationEnabled } = useSettingsStore();

  const [showTicketTypesModal, setShowTicketTypesModal] = useState(false);
  const [showClearDataModal, setShowClearDataModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const [ticketGroups, setTicketGroups] = useState<TicketGroup[]>([]);
  const [tempSelectedTypes, setTempSelectedTypes] = useState<string[]>([]);
  const [isLoadingTypes, setIsLoadingTypes] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Get event ID from auth store
  const eventId = eventDetails?.event_id;

  // Load ticket groups when modal opens
  useEffect(() => {
    if (showTicketTypesModal && eventId) {
      loadTicketGroups();
    }
  }, [showTicketTypesModal, eventId]);

  const loadTicketGroups = async () => {
    if (!eventId) {
      toast.error('Error', 'No event selected. Please login again.');
      return;
    }

    setIsLoadingTypes(true);
    try {
      const response = await eventsAPI.getTicketGroups(eventId);
      const groups: TicketGroup[] = response.ticket_type_counts.map((tc) => ({
        type: tc.event_ticket_type,
        total: tc.total,
        isSelected: selectedTicketTypes.includes(tc.event_ticket_type),
      }));
      setTicketGroups(groups);
      setTempSelectedTypes([...selectedTicketTypes]);
    } catch (err) {
      console.error('Error loading ticket groups:', err);
      toast.error('Error', 'Failed to load ticket types. Please check your connection.');
    } finally {
      setIsLoadingTypes(false);
    }
  };

  const toggleType = (type: string) => {
    setTempSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const selectAllTypes = () => {
    setTempSelectedTypes(ticketGroups.map((g) => g.type));
  };

  const downloadTickets = async () => {
    if (!eventId || tempSelectedTypes.length === 0) {
      toast.warning('Select Types', 'Please select at least one ticket type');
      return;
    }

    setIsDownloading(true);
    try {
      const response = await eventsAPI.downloadTickets(
        eventId,
        tempSelectedTypes
      );

      // Clear existing tickets
      await db.deleteAllTickets();

      // Insert new tickets
      let totalCount = 0;
      for (const [_type, tickets] of Object.entries(response.tickets)) {
        for (const ticket of tickets) {
          await db.insertTicket({
            ticket_id: ticket.ticket_id,
            event_id: ticket.event_id,
            organisation_id: ticket.organisation_id,
            event_name: ticket.event_ticket_name,
            event_date: ticket.event_date,
            ticket_type: ticket.event_ticket_type,
            ticket_admittence: ticket.event_ticket_admittence,
            event_venue: ticket.event_venue,
            event_city: ticket.event_city_state,
            qrcode: ticket.qrcode,
            ticket_number: ticket.ticket_number,
            serial: ticket.serial,
            log_count: ticket.log_count,
            sync_status: 0,
            scanned_at: null,
            scanned_device_id: null,
          });
          totalCount++;
        }
      }

      setTicketTypes(tempSelectedTypes);
      setDownloadedCount(totalCount);
      await db.setSelectedTypes(tempSelectedTypes);

      toast.success('Success', `Downloaded ${totalCount} tickets`);
      setShowTicketTypesModal(false);
    } catch (err) {
      console.error('Error downloading tickets:', err);
      toast.error('Error', 'Failed to download tickets');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleClearData = async () => {
    setIsClearing(true);
    try {
      await db.clearAll();
      clearPendingScans();
      resetStats();
      clearHistory();
      setDownloadedCount(0);
      setTicketTypes([]);
      toast.success('Data Cleared', 'All local data has been removed');
      setShowClearDataModal(false);
    } catch (err) {
      console.error('Error clearing data:', err);
      toast.error('Error', 'Failed to clear data');
    } finally {
      setIsClearing(false);
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      if (session) {
        await authAPI.logout(session);
      }
      await db.clearAll();
      clearPendingScans();
      resetStats();
      clearHistory();
      clearEvent();
      logout();
      navigate('/login', { replace: true });
    } catch (err) {
      console.error('Error logging out:', err);
      // Still logout locally
      logout();
      navigate('/login', { replace: true });
    } finally {
      setIsLoggingOut(false);
    }
  };

  // Sync pending scans to server
  const handleSyncNow = async () => {
    if (!isOnline) {
      toast.warning('Offline', 'You need to be online to sync');
      return;
    }

    if (pendingScans.length === 0) {
      toast.info('Nothing to sync', 'All scans are already synced');
      return;
    }

    if (!eventId || !deviceId) {
      toast.error('Error', 'Missing event or device information');
      return;
    }

    setIsSyncing(true);
    startSync();

    try {
      let syncedCount = 0;
      let failedCount = 0;

      // Sync each pending scan
      for (const scan of pendingScans) {
        try {
          await ticketsAPI.verify(
            eventId,
            scan.qrCode,
            scan.deviceId,
            selectedTicketTypes
          );
          removePendingScan(scan.id);
          syncedCount++;
        } catch (err) {
          failedCount++;
          // Continue with next scan
        }
      }

      completeSync();
      
      if (syncedCount > 0 && failedCount === 0) {
        toast.success('Sync Complete', `${syncedCount} scans synced successfully`);
      } else if (syncedCount > 0 && failedCount > 0) {
        toast.warning('Partial Sync', `${syncedCount} synced, ${failedCount} failed`);
      } else if (failedCount > 0) {
        toast.error('Sync Failed', `Failed to sync ${failedCount} scans`);
      }
    } catch (err) {
      failSync('Sync failed');
      toast.error('Sync Error', 'Failed to sync scans');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <h1 className="text-xl font-bold text-gray-900">Settings</h1>
      </div>

      <div className="p-4 space-y-4">
        {/* Event Info */}
        <Card variant="elevated" padding="md">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">
            Current Event
          </h2>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-500">Event</span>
              <span className="font-medium">
                {eventDetails?.event_name || 'Not selected'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Device ID</span>
              <span className="font-mono text-sm">{deviceId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Downloaded Tickets</span>
              <span className="font-medium">{downloadedTicketCount}</span>
            </div>
          </div>
        </Card>

        {/* Ticket Types */}
        <Card variant="elevated" padding="md">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700">
              Ticket Types
            </h2>
            <Badge variant="info" size="sm">
              {selectedTicketTypes.length} selected
            </Badge>
          </div>

          {selectedTicketTypes.length > 0 ? (
            <div className="flex flex-wrap gap-2 mb-3">
              {selectedTicketTypes.map((type) => (
                <Badge key={type} variant="default" size="sm">
                  {type}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 mb-3">No types selected</p>
          )}

          <Button
            variant="outline"
            size="sm"
            fullWidth
            onClick={() => setShowTicketTypesModal(true)}
          >
            Change Ticket Types
          </Button>
        </Card>

        {/* Sync Status */}
        <Card variant="elevated" padding="md">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">
            Sync Status
          </h2>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-500">Pending Scans</span>
              <span className="font-medium">{pendingScans.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Last Sync</span>
              <span className="text-sm">
                {lastSyncTime
                  ? new Date(lastSyncTime).toLocaleString()
                  : 'Never'}
              </span>
            </div>
          </div>
          {pendingScans.length > 0 && (
            <Button
              variant="primary"
              size="sm"
              fullWidth
              className="mt-3"
              onClick={handleSyncNow}
              loading={isSyncing}
              disabled={!isOnline}
            >
              {isOnline ? 'Sync Now' : 'Offline - Cannot Sync'}
            </Button>
          )}
        </Card>

        {/* Sound & Feedback Settings */}
        <Card variant="elevated" padding="md">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">
            Sound & Feedback
          </h2>
          <div className="space-y-3">
            <div 
              className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 cursor-pointer"
              onClick={() => setSoundEnabled(!soundEnabled)}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${soundEnabled ? 'bg-indigo-100' : 'bg-gray-100'}`}>
                  <svg className={`w-5 h-5 ${soundEnabled ? 'text-indigo-600' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    {soundEnabled ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                    )}
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Sound Effects</p>
                  <p className="text-xs text-gray-500">Play sounds on scan results</p>
                </div>
              </div>
              <Checkbox checked={soundEnabled} onChange={setSoundEnabled} />
            </div>

            <div 
              className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 cursor-pointer"
              onClick={() => setVibrationEnabled(!vibrationEnabled)}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${vibrationEnabled ? 'bg-indigo-100' : 'bg-gray-100'}`}>
                  <svg className={`w-5 h-5 ${vibrationEnabled ? 'text-indigo-600' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Vibration</p>
                  <p className="text-xs text-gray-500">Haptic feedback on scan</p>
                </div>
              </div>
              <Checkbox checked={vibrationEnabled} onChange={setVibrationEnabled} />
            </div>
          </div>
        </Card>

        {/* Data Management */}
        <Card variant="elevated" padding="md">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">
            Data Management
          </h2>
          <div className="space-y-3">
            <Button
              variant="outline"
              size="sm"
              fullWidth
              onClick={() => setShowClearDataModal(true)}
            >
              Clear All Local Data
            </Button>
          </div>
        </Card>

        {/* Logout */}
        <Card variant="elevated" padding="md">
          <Button
            variant="danger"
            size="md"
            fullWidth
            onClick={() => setShowLogoutModal(true)}
          >
            Logout
          </Button>
        </Card>

        {/* Version */}
        <p className="text-center text-xs text-gray-400 mt-8">
          Scan App v1.0.0 • © 2026 263tickets
        </p>
      </div>

      {/* Ticket Types Modal */}
      <Modal
        isOpen={showTicketTypesModal}
        onClose={() => setShowTicketTypesModal(false)}
        title="Select Ticket Types"
        size="lg"
      >
        {isLoadingTypes ? (
          <Loading message="Loading ticket types..." />
        ) : ticketGroups.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Ticket Types Found</h3>
            <p className="text-sm text-gray-500 mb-4">
              This event doesn't have any ticket types available, or there was an error loading them.
            </p>
            <Button variant="outline" size="sm" onClick={loadTicketGroups}>
              Try Again
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <Button variant="ghost" size="sm" onClick={selectAllTypes}>
              Select All
            </Button>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {ticketGroups.map((group) => (
                <div
                  key={group.type}
                  className={`
                    p-3 rounded-lg border cursor-pointer transition-colors
                    ${
                      tempSelectedTypes.includes(group.type)
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }
                  `}
                  onClick={() => toggleType(group.type)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={tempSelectedTypes.includes(group.type)}
                        onChange={() => toggleType(group.type)}
                      />
                      <span className="font-medium">{group.type}</span>
                    </div>
                    <Badge variant="default" size="sm">
                      {group.total} tickets
                    </Badge>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t">
              <p className="text-sm text-gray-500 mb-3">
                Selected: {tempSelectedTypes.length} types (
                {ticketGroups
                  .filter((g) => tempSelectedTypes.includes(g.type))
                  .reduce((sum, g) => sum + g.total, 0)}{' '}
                tickets)
              </p>
              <Button
                variant="primary"
                fullWidth
                loading={isDownloading}
                onClick={downloadTickets}
                disabled={tempSelectedTypes.length === 0}
              >
                Download Tickets
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Clear Data Modal */}
      <Modal
        isOpen={showClearDataModal}
        onClose={() => setShowClearDataModal(false)}
        title="Clear All Data?"
        size="sm"
      >
        <p className="text-gray-600 mb-4">
          This will remove all downloaded tickets and scan history. This action
          cannot be undone.
        </p>
        <div className="flex gap-3">
          <Button
            variant="ghost"
            onClick={() => setShowClearDataModal(false)}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleClearData}
            loading={isClearing}
            className="flex-1"
          >
            Clear Data
          </Button>
        </div>
      </Modal>

      {/* Logout Modal */}
      <Modal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        title="Logout?"
        size="sm"
      >
        <p className="text-gray-600 mb-4">
          {pendingScans.length > 0
            ? `You have ${pendingScans.length} unsynced scans. They will be lost if you logout now.`
            : 'Are you sure you want to logout?'}
        </p>
        <div className="flex gap-3">
          <Button
            variant="ghost"
            onClick={() => setShowLogoutModal(false)}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleLogout}
            loading={isLoggingOut}
            className="flex-1"
          >
            Logout
          </Button>
        </div>
      </Modal>
    </div>
  );
};
