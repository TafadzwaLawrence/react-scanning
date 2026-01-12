/**
 * Sync Client - HTTP client for communicating with Laravel API
 * Handles authentication, retries, and error handling
 */

import type {
  ScanPayload,
  ScanSyncResult,
  BatchConfig,
  BatchResult,
  DeviceInfo,
} from './types';

// ============================================================================
// CONFIGURATION
// ============================================================================

const DEFAULT_BATCH_CONFIG: BatchConfig = {
  batch_size: 50,
  retry_attempts: 3,
  retry_delay: 1000,
  timeout: 30000,
};

// ============================================================================
// HTTP UTILITIES
// ============================================================================

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  status: number;
}

async function makeRequest<T>(
  url: string,
  options: RequestInit,
  timeout: number
): Promise<ApiResponse<T>> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const data = await response.json();

    return {
      success: response.ok,
      data: response.ok ? data : undefined,
      error: !response.ok ? data.message || 'Request failed' : undefined,
      status: response.status,
    };
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return { success: false, error: 'Request timeout', status: 408 };
      }
      return { success: false, error: error.message, status: 0 };
    }
    return { success: false, error: 'Unknown error', status: 0 };
  }
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// SYNC CLIENT CLASS
// ============================================================================

export class SyncClient {
  private baseUrl: string;
  private authToken: string | null = null;
  private config: BatchConfig;

  constructor(baseUrl: string, config: Partial<BatchConfig> = {}) {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.config = { ...DEFAULT_BATCH_CONFIG, ...config };
  }

  /**
   * Set authentication token
   */
  setAuthToken(token: string | null): void {
    this.authToken = token;
  }

  /**
   * Get default headers
   */
  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    return headers;
  }

  /**
   * Sync scans using the sync endpoint with full tracking
   * POST /sync/scans
   * This logs all scans to device_scan_logs table
   */
  async syncScans(
    scans: ScanPayload[],
    eventId: string,
    gateName?: string,
    onProgress?: (synced: number, total: number) => void
  ): Promise<{
    success: boolean;
    results: ScanSyncResult[];
    summary: { synced: number; duplicates: number; notFound: number; failed: number };
  }> {
    const results: ScanSyncResult[] = [];
    let synced = 0;
    let duplicates = 0;
    let notFound = 0;
    let failed = 0;

    // Process in batches
    for (let i = 0; i < scans.length; i += this.config.batch_size) {
      const batch = scans.slice(i, i + this.config.batch_size);
      const batchResult = await this.syncBatch(batch, eventId, gateName);

      // Process results
      for (const result of batchResult.results) {
        results.push(result);

        switch (result.status) {
          case 200:
            synced++;
            break;
          case 403:
            duplicates++;
            break;
          case 404:
            notFound++;
            break;
          default:
            failed++;
        }
      }

      // Report progress
      if (onProgress) {
        onProgress(i + batch.length, scans.length);
      }

      // Small delay between batches to avoid overwhelming the server
      if (i + this.config.batch_size < scans.length) {
        await sleep(100);
      }
    }

    return {
      success: failed === 0,
      results,
      summary: { synced, duplicates, notFound, failed },
    };
  }

  /**
   * Sync a single batch with retry logic
   * Uses /sync/scans endpoint for full device tracking
   */
  private async syncBatch(
    scans: ScanPayload[],
    eventId: string,
    gateName?: string
  ): Promise<BatchResult> {
    const payload = {
      device_id: scans[0]?.device_id || 'unknown',
      event_id: eventId,
      gate_name: gateName,
      scans: scans.map(s => ({
        qrcode: s.qrcode,
        scanned_at: s.scanned_at,
      })),
    };

    let lastError: string | undefined;

    for (let attempt = 0; attempt < this.config.retry_attempts; attempt++) {
      const response = await makeRequest<{
        status: number;
        success_count: number;
        summary: {
          total_uploaded: number;
          successful: number;
          duplicates: number;
          not_found: number;
          failed: number;
        };
        results: Array<{
          qrcode: string;
          status: number;
          message: string;
          sync_status: string;
          type?: string;
          number?: string;
          admittence?: number;
          scanned_at?: string;
          scanned_by?: string;
        }>;
        sync_session_id: number;
        synced_at: string;
      }>(
        `${this.baseUrl}/sync/scans`,
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify(payload),
        },
        this.config.timeout
      );

      if (response.success && response.data) {
        return {
          batch_index: 0,
          success: true,
          synced_count: response.data.success_count,
          failed_count: scans.length - response.data.success_count,
          results: response.data.results.map(r => ({
            qrcode: r.qrcode,
            status: r.status as 200 | 403 | 404 | 500,
            message: this.getStatusMessage(r.status),
            sync_status: this.getSyncStatus(r.status),
            type: r.type,
            number: r.number,
            admittence: r.admittence,
            scanned_at: r.scanned_at,
            scanned_by: r.scanned_by,
          })),
        };
      }

      lastError = response.error;

      // Don't retry on auth errors
      if (response.status === 401 || response.status === 403) {
        break;
      }

      // Wait before retry
      if (attempt < this.config.retry_attempts - 1) {
        await sleep(this.config.retry_delay * (attempt + 1));
      }
    }

    // All retries failed
    return {
      batch_index: 0,
      success: false,
      synced_count: 0,
      failed_count: scans.length,
      results: scans.map(s => ({
        qrcode: s.qrcode,
        status: 500 as const,
        message: lastError || 'Sync failed',
        sync_status: 'failed' as const,
      })),
      error: lastError,
    };
  }

  /**
   * Sync session logs (login/logout events)
   * POST /sync/session-logs
   */
  async syncSessionLogs(
    deviceId: string,
    logs: Array<{
      id: string;
      event_id: string;
      action: string;
      timestamp: number;
      user_id?: number;
      user_name?: string;
      gate_name?: string;
      metadata?: Record<string, unknown>;
    }>
  ): Promise<ApiResponse<{ synced_count: number }>> {
    return makeRequest(
      `${this.baseUrl}/sync/session-logs`,
      {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          device_id: deviceId,
          logs,
        }),
      },
      this.config.timeout
    );
  }

  /**
   * Register device with the server (optional endpoint)
   */
  async registerDevice(
    device: DeviceInfo,
    eventId: string,
    gateName?: string
  ): Promise<ApiResponse<{ registered: boolean; device_id: string }>> {
    return makeRequest(
      `${this.baseUrl}/sync/device/register`,
      {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          ...device,
          event_id: eventId,
          gate_name: gateName,
        }),
      },
      this.config.timeout
    );
  }

  /**
   * Check server connectivity
   */
  async ping(): Promise<boolean> {
    try {
      const response = await makeRequest<{ status: string }>(
        `${this.baseUrl}/ping`,
        {
          method: 'GET',
          headers: this.getHeaders(),
        },
        5000
      );
      return response.success;
    } catch {
      return false;
    }
  }

  /**
   * Get status message from status code
   */
  private getStatusMessage(status: number): string {
    switch (status) {
      case 200:
        return 'Successfully synced';
      case 403:
        return 'Already scanned';
      case 404:
        return 'Ticket not found';
      default:
        return 'Sync failed';
    }
  }

  /**
   * Get sync status from status code
   */
  private getSyncStatus(status: number): ScanSyncResult['sync_status'] {
    switch (status) {
      case 200:
        return 'synced';
      case 403:
        return 'duplicate';
      case 404:
        return 'not_found';
      default:
        return 'failed';
    }
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let clientInstance: SyncClient | null = null;

/**
 * Initialize sync client with API base URL
 */
export function initSyncClient(
  baseUrl: string,
  config?: Partial<BatchConfig>
): SyncClient {
  clientInstance = new SyncClient(baseUrl, config);
  return clientInstance;
}

/**
 * Get sync client instance
 */
export function getSyncClient(): SyncClient {
  if (!clientInstance) {
    throw new Error('SyncClient not initialized. Call initSyncClient first.');
  }
  return clientInstance;
}

/**
 * Check if sync client is initialized
 */
export function isSyncClientInitialized(): boolean {
  return clientInstance !== null;
}
