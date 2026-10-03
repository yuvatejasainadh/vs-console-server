import fs from 'fs';
import { Pool, PoolClient, PoolConfig } from 'pg';
import { config, DatabaseConfig } from '../config/env';
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

  public initPool(customDbConfig?: DatabaseConfig): void {
    try {
      if (this.pool) {
        this.pool.end().catch(() => {});
        this.pool = null;
      }

      const db = customDbConfig || config.database;
      const poolConfig: PoolConfig = {
        max: db.poolMax,
        min: db.poolMin,
        idleTimeoutMillis: db.idleTimeoutMillis,
        connectionTimeoutMillis: db.connectionTimeoutMillis,
      };

      if (db.host) {
        poolConfig.host = db.host;
        poolConfig.port = db.port;
        poolConfig.database = db.name;
        poolConfig.user = db.user;
        poolConfig.password = db.password;
      } else if (db.connectionString || config.databaseUrl) {
        poolConfig.connectionString = db.connectionString || config.databaseUrl;
      }

      if (db.ssl) {
        let caContent: string | undefined;
        if (db.sslCa) {
          try {
            if (fs.existsSync(db.sslCa)) {
              caContent = fs.readFileSync(db.sslCa, 'utf-8');
            } else if (db.sslCa.includes('BEGIN CERTIFICATE')) {
              caContent = db.sslCa;
            }
          } catch (caErr: any) {
            Logger.warn(`Could not load CA from '${db.sslCa}': ${caErr?.message}`);
          }
        }

        poolConfig.ssl = {
          rejectUnauthorized: db.sslRejectUnauthorized,
          ca: caContent || undefined,
        };
      }

      this.pool = new Pool(poolConfig);

      this.pool.on('error', (err) => {
        Logger.error('Unexpected error on idle PostgreSQL client', { error: err.message });
      });

      this.isConnected = false;
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
      this.isConnected = res.rows.length > 0;
      return this.isConnected;
    } catch {
      this.isConnected = false;
      return false;
    }
  }

  getPool(): Pool | null {
    return this.pool;
  }

  getStatusSummary(): {
    database: string;
    host: string;
    ssl: boolean;
    poolMax: number;
    poolMin: number;
    connected: boolean;
  } {
    return {
      database: config.database.name,
      host: config.database.host || 'url_configured',
      ssl: config.database.ssl,
      poolMax: config.database.poolMax,
      poolMin: config.database.poolMin,
      connected: this.isConnected,
    };
  }

  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      this.isConnected = false;
    }
  }
}
