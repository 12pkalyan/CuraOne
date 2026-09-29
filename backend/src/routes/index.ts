import { Router } from 'express';
import { healthRouter } from './health.routes';
import { authRouter } from './auth.routes';
import { adminRouter } from './admin.routes';
import { hospitalRouter } from './hospital.routes';
import { patientRouter } from './patient.routes';
import { grantRouter } from './grant.routes';

export const apiRouter = Router();

// Mount sub-routers
apiRouter.use('/health', healthRouter);
apiRouter.use('/auth', authRouter);
apiRouter.use('/admin', adminRouter);
apiRouter.use('/hospitals', hospitalRouter);
apiRouter.use('/patients', patientRouter);
apiRouter.use('/grants', grantRouter);
// apiRouter.use('/rag', ragRouter);
