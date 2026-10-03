import { Pool, PoolClient } from 'pg';
import { config } from '../config/env';
import { Logger } from '../common/logger';
import { IDatabaseClient, IDatabaseService, QueryResult } from './db.interface';

class PostgresClientAdapter implements IDatabaseClient {
  constructor(private client: PoolClient) {}

  async query<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>> {
    const res = await this.client.query(sql, params);
    return {
      rows: res.rows,
      rowCount: res.rowCount ?? res.rows.length,
    };
  }

  release(): void {
    this.client.release();
  }
}

export class DatabaseService implements IDatabaseService {
  private static instance: DatabaseService;
  private pool: Pool | null = null;
  private isConnected = false;

  private constructor() {
    this.initPool();
  }

  static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  private initPool(): void {
    try {
      this.pool = new Pool({
        connectionString: config.databaseUrl,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      });

      this.pool.on('error', (err) => {
        Logger.error('Unexpected error on idle PostgreSQL client', { error: err.message });
      });
    } catch (err: any) {
      Logger.warn(`PostgreSQL pool initialization note: ${err?.message}`);
    }
  }

  async query<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>> {
    if (!this.pool) {
      throw new Error('Database pool not initialized');
    }
    const res = await this.pool.query(sql, params);
    return {
      rows: res.rows,
      rowCount: res.rowCount ?? res.rows.length,
    };
  }

  async getClient(): Promise<IDatabaseClient> {
    if (!this.pool) {
      throw new Error('Database pool not initialized');
    }
    const client = await this.pool.connect();
    return new PostgresClientAdapter(client);
  }

  async transaction<T>(callback: (client: IDatabaseClient) => Promise<T>): Promise<T> {
    if (!this.pool) {
      throw new Error('Database pool not initialized');
    }
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const adapter = new PostgresClientAdapter(client);
      const result = await callback(adapter);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async checkHealth(): Promise<boolean> {
    try {
      if (!this.pool) return false;
      const res = await this.pool.query('SELECT 1 as health');
      return res.rows.length > 0;
    } catch {
      return false;
    }
  }

  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }
}
