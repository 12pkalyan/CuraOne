import { Router } from 'express';
import { getHealth, getStats } from '../controllers/health.controller';

export const healthRouter = Router();

// 1. Lightweight health ping (SELECT 1 + latency timing)
healthRouter.get('/', getHealth);

// 2. Heavy stats query (Aggregated record counts)
healthRouter.get('/stats', getStats);
