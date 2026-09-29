import { Router } from 'express';
import { authenticate, requireRole } from '../middlewares/auth.middleware';
import * as grantController from '../controllers/grant.controller';

export const grantRouter = Router();

// All grant endpoints require authentication
grantRouter.use(authenticate);

/**
 * 1. Doctor requests access to records from target hospital for a patient (Standard or Break-Glass)
 */
grantRouter.post(
  '/',
  requireRole('DOCTOR'),
  grantController.createGrant
);

/**
 * 2. List grants (auto-scoped to calling user's role)
 * Patient sees incoming consent requests; Doctor/Hospital sees outgoing or facility grants
 */
grantRouter.get(
  '/',
  requireRole('DOCTOR', 'HOSPITAL', 'PATIENT', 'SYSTEM_ADMIN'),
  grantController.listGrants
);

/**
 * 3. Get single grant details
 */
grantRouter.get(
  '/:id',
  requireRole('DOCTOR', 'HOSPITAL', 'PATIENT', 'SYSTEM_ADMIN'),
  grantController.getGrantById
);

/**
 * 4. Key 1: Patient Sovereign Consent (Approve or Reject)
 */
grantRouter.patch(
  '/:id/patient-consent',
  requireRole('PATIENT'),
  grantController.respondToPatientConsent
);

/**
 * 5. Key 2: Custodial Hospital Clearance (Approve or Reject)
 */
grantRouter.patch(
  '/:id/hospital-clearance',
  requireRole('HOSPITAL'),
  grantController.respondToHospitalClearance
);

/**
 * 6. Revoke an active grant (Patient, Doctor, or Hospital)
 */
grantRouter.post(
  '/:id/revoke',
  requireRole('PATIENT', 'DOCTOR', 'HOSPITAL'),
  grantController.revokeGrant
);

/**
 * 7. Flag Break-Glass or suspicious access dispute
 */
grantRouter.post(
  '/:id/flag-dispute',
  requireRole('PATIENT', 'HOSPITAL'),
  grantController.flagDispute
);

/**
 * 8. Backward-compatible patch endpoint
 */
grantRouter.patch(
  '/:id',
  requireRole('PATIENT', 'DOCTOR', 'HOSPITAL'),
  grantController.updateGrantStatus
);
