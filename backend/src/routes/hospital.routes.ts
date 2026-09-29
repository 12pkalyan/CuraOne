import { Router } from 'express';
import {
  createDoctor,
  listDoctors,
  getHospitals,
} from '../controllers/hospital.controller';
import { authenticate, requireRole } from '../middlewares/auth.middleware';

export const hospitalRouter = Router();

// Public: Get directory of hospitals (for dropdowns / selection)
hospitalRouter.get('/', getHospitals);

// Protected: Hospital Admin provisions and views doctors for their hospital
hospitalRouter.post('/doctors', authenticate, requireRole('HOSPITAL'), createDoctor);
hospitalRouter.get('/doctors', authenticate, requireRole('HOSPITAL'), listDoctors);
