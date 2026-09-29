import { Router } from 'express';
import { createHospital, listHospitals } from '../controllers/admin.controller';
import { authenticate, requireRole } from '../middlewares/auth.middleware';

export const adminRouter = Router();

// Protect all admin routes: Requires valid JWT with SYSTEM_ADMIN role
adminRouter.use(authenticate, requireRole('SYSTEM_ADMIN'));

// Platform admin manages hospitals
adminRouter.post('/hospitals', createHospital);
adminRouter.get('/hospitals', listHospitals);
