import { Router } from 'express';
import { authenticate, requireRole } from '../middlewares/auth.middleware';
import * as patientController from '../controllers/patient.controller';

export const patientRouter = Router();

// All patient routes require authentication
patientRouter.use(authenticate);

/**
 * 1. Patient Sovereign Self-Service Routes
 * Must be mounted before /:id to prevent "me" being parsed as a UUID param
 */
patientRouter.get(
  '/me/timeline',
  requireRole('PATIENT'),
  patientController.getMyTimeline
);

patientRouter.get(
  '/me/profile',
  requireRole('PATIENT'),
  patientController.getMyProfile
);

/**
 * 2. Clinical Provider Cohort Search
 * Doctors, Hospital Admins, and System Admins
 */
patientRouter.get(
  '/',
  requireRole('DOCTOR', 'HOSPITAL', 'SYSTEM_ADMIN'),
  patientController.searchPatients
);

/**
 * 3. Individual Patient Demographics
 */
patientRouter.get(
  '/:id',
  requireRole('DOCTOR', 'HOSPITAL', 'SYSTEM_ADMIN'),
  patientController.getPatientById
);

/**
 * 4. Longitudinal Clinical Timeline (Provider View with Custodial Gating)
 */
patientRouter.get(
  '/:id/timeline',
  requireRole('DOCTOR', 'HOSPITAL', 'SYSTEM_ADMIN'),
  patientController.getProviderTimeline
);

/**
 * 5. Attending Doctor Record Live Encounter & Diagnoses/Prescriptions
 */
patientRouter.post(
  '/:id/encounters',
  requireRole('DOCTOR'),
  patientController.createEncounter
);
