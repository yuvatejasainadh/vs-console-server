import { Request, Response } from 'express';
import { DatabaseService } from '../database/db.service';
import { config } from '../config/env';

export class HealthController {
  private dbService = DatabaseService.getInstance();

  getHealth = async (req: Request, res: Response): Promise<void> => {
    res.status(200).json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      service: 'VoiceShield Console Backend',
      version: '1.0.0',
    });
  };

  getLive = async (req: Request, res: Response): Promise<void> => {
    res.status(200).json({
      status: 'UP',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  };

  getReady = async (req: Request, res: Response): Promise<void> => {
    const isDbConnected = await this.dbService.checkHealth();

    const isReady = true; // Service is ready to serve requests

    res.status(isReady ? 200 : 503).json({
      status: isReady ? 'READY' : 'NOT_READY',
      checks: {
        application: 'UP',
        database: isDbConnected ? 'CONNECTED' : 'DISCONNECTED',
        storage: config.storageDriver === 's3' ? 'S3_CONFIGURED' : 'LOCAL_STORAGE_ACTIVE',
      },
      timestamp: new Date().toISOString(),
    });
  };
}
