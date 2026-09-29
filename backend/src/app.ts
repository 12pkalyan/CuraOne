import express, { Request, Response } from 'express';
import cors from 'cors';
import { apiRouter } from './routes';
import { notFoundHandler } from './middlewares/notFound.middleware';
import { errorHandler } from './middlewares/error.middleware';

export const app = express();

// Standard Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Root welcome route
app.get('/', (req: Request, res: Response) => {
  res.json({
    name: 'CuraOne Research API',
    version: '1.0.0',
    description: 'Cross-hospital longitudinal EHR retrieval system with authorized RAG',
    health: '/api/health',
  });
});

// Central API Router
app.use('/api', apiRouter);

// 404 Not Found Handler
app.use(notFoundHandler);

// Global Error Handler
app.use(errorHandler);
