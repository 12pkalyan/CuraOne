import { Request, Response, NextFunction } from 'express';
import * as healthService from '../services/health.service';

export async function getHealth(req: Request, res: Response, next: NextFunction) {
  try {
    const health = await healthService.checkHealth();
    res.json(health);
  } catch (error) {
    next(error);
  }
}

export async function getStats(req: Request, res: Response, next: NextFunction) {
  try {
    const stats = await healthService.getSystemStats();
    res.json(stats);
  } catch (error) {
    next(error);
  }
}
