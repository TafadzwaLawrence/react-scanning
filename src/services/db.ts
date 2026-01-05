import Dexie, { Table } from 'dexie';
import type { Ticket, HourlyScanData, TicketTypeStats, SyncStatus } from '@/types';

class TicketDatabase extends Dexie {
  tickets!: Table<Ticket>;
  config!: Table<{ key: string; value: string }>;
  selectedTypes!: Table<{ ticket_type: string }>;

  constructor() {
    super('ScanDB');

    this.version(2).stores({
      tickets:
        '++id, ticket_id, event_id, qrcode, ticket_type, sync_status, log_count, scanned_at',
      config: 'key',
      selectedTypes: 'ticket_type',
    });
  }

  // Ticket Operations
  async insertTicket(ticket: Omit<Ticket, 'id'>): Promise<number> {
    return this.tickets.add(ticket as Ticket);
  }

  async insertTicketsBulk(tickets: Omit<Ticket, 'id'>[]): Promise<void> {
    await this.tickets.bulkAdd(tickets as Ticket[]);
  }

  async getTicketByQRCode(qrcode: string): Promise<Ticket | undefined> {
    return this.tickets.where('qrcode').equals(qrcode).first();
  }

  async getAllTickets(): Promise<Ticket[]> {
    return this.tickets.toArray();
  }

  async getTicketsByEventId(eventId: string): Promise<Ticket[]> {
    return this.tickets.where('event_id').equals(eventId).toArray();
  }

  async updateTicket(id: number, data: Partial<Ticket>): Promise<void> {
    await this.tickets.update(id, data);
  }

  async deleteAllTickets(): Promise<void> {
    await this.tickets.clear();
  }

  async isTableEmpty(): Promise<boolean> {
    const count = await this.tickets.count();
    return count === 0;
  }

  async countAllTickets(): Promise<number> {
    return this.tickets.count();
  }

  // Scan Operations
  async markAsScanned(qrcode: string, deviceId: string): Promise<void> {
    const ticket = await this.getTicketByQRCode(qrcode);
    if (ticket && ticket.id) {
      await this.tickets.update(ticket.id, {
        log_count: ticket.log_count + 1,
        scanned_at: Date.now(),
        scanned_device_id: deviceId,
        sync_status: 0 as SyncStatus, // Mark as unsynced
      });
    }
  }

  async isTicketScanned(qrcode: string): Promise<boolean> {
    const ticket = await this.getTicketByQRCode(qrcode);
    return ticket ? ticket.log_count > 0 : false;
  }

  // Sync Operations
  async getUnsyncedTickets(): Promise<Ticket[]> {
    return this.tickets
      .where('sync_status')
      .equals(0)
      .and((ticket) => ticket.log_count > 0)
      .toArray();
  }

  async getUnsyncedCount(): Promise<number> {
    return this.tickets
      .where('sync_status')
      .equals(0)
      .and((ticket) => ticket.log_count > 0)
      .count();
  }

  async markAsSynced(qrcodes: string[]): Promise<void> {
    await this.tickets
      .where('qrcode')
      .anyOf(qrcodes)
      .modify({ sync_status: 1 as SyncStatus });
  }

  // Statistics
  async getScannedCount(): Promise<number> {
    return this.tickets.where('log_count').above(0).count();
  }

  async getSyncedCount(): Promise<number> {
    return this.tickets
      .where('sync_status')
      .equals(1)
      .and((ticket) => ticket.log_count > 0)
      .count();
  }

  async getHourlyScanData(): Promise<HourlyScanData[]> {
    const scannedTickets = await this.tickets
      .where('log_count')
      .above(0)
      .toArray();

    const hourlyData: { [key: string]: number } = {};

    // Initialize all hours
    for (let i = 0; i < 24; i++) {
      hourlyData[i.toString().padStart(2, '0')] = 0;
    }

    // Count scans per hour
    scannedTickets.forEach((ticket) => {
      if (ticket.scanned_at) {
        const date = new Date(ticket.scanned_at);
        const hour = date.getHours().toString().padStart(2, '0');
        hourlyData[hour]++;
      }
    });

    return Object.entries(hourlyData).map(([hour, count]) => ({
      hour,
      count,
    }));
  }

  async getStatsByTicketType(): Promise<TicketTypeStats[]> {
    const tickets = await this.tickets.toArray();
    const typeStats: { [key: string]: number } = {};

    tickets.forEach((ticket) => {
      if (ticket.log_count > 0) {
        typeStats[ticket.ticket_type] =
          (typeStats[ticket.ticket_type] || 0) + 1;
      }
    });

    return Object.entries(typeStats).map(([type, scannedCount]) => ({
      type,
      scannedCount,
    }));
  }

  // Config Operations
  async setConfig(key: string, value: string): Promise<void> {
    await this.config.put({ key, value });
  }

  async getConfig(key: string): Promise<string | undefined> {
    const config = await this.config.get(key);
    return config?.value;
  }

  // Selected Types Operations
  async setSelectedTypes(types: string[]): Promise<void> {
    await this.selectedTypes.clear();
    await this.selectedTypes.bulkAdd(types.map((t) => ({ ticket_type: t })));
  }

  async getSelectedTypes(): Promise<string[]> {
    const types = await this.selectedTypes.toArray();
    return types.map((t) => t.ticket_type);
  }

  // Clear all data
  async clearAll(): Promise<void> {
    await this.tickets.clear();
    await this.config.clear();
    await this.selectedTypes.clear();
  }
}

export const db = new TicketDatabase();
