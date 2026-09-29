import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as grantService from '../services/grant.service';

const createGrantSchema = z.object({
  patientId: z.string().uuid('Valid patient UUID is required'),
  targetHospitalId: z.string().uuid('Valid target hospital UUID is required'),
  purpose: z.string().min(3, 'Purpose must be at least 3 characters'),
  durationDays: z.number().int().min(1).max(90).optional(),
  isBreakGlass: z.boolean().optional(),
  breakGlassAttestation: z.string().optional(),
});

const updateStatusSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED', 'REVOKED']),
  durationDays: z.number().int().min(1).max(90).optional(),
});

const patientConsentSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
  notes: z.string().optional(),
});

const hospitalClearanceSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
  notes: z.string().optional(),
});

const disputeIncidentSchema = z.object({
  reason: z.string().min(5, 'Dispute reason must be at least 5 characters'),
  alsoRevoke: z.boolean().optional(),
});

/**
 * POST /api/grants
 * Doctor creates a cross-hospital record access grant request (Standard or Break-Glass)
 */
export async function createGrant(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user || req.user.role !== 'DOCTOR') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only attending doctors can request cross-hospital access grants',
      });
    }

    if (!req.user.hospitalId) {
      return res.status(400).json({
        error: 'BadRequest',
        message: 'Doctor must be affiliated with an active hospital',
      });
    }

    const validated = createGrantSchema.parse(req.body);

    const result = await grantService.createGrantRequest({
      patientId: validated.patientId,
      requestingDoctorId: req.user.id,
      requestingHospitalId: req.user.hospitalId,
      targetHospitalId: validated.targetHospitalId,
      purpose: validated.purpose,
      durationDays: validated.durationDays,
      isBreakGlass: validated.isBreakGlass,
      breakGlassAttestation: validated.breakGlassAttestation,
    });

    res.status(201).json({
      message: validated.isBreakGlass
        ? 'Emergency Break-Glass access activated (24-hour window logged)'
        : 'Access grant request submitted successfully in PENDING status',
      ...result,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation Error',
        issues: error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
      });
    }
    next(error);
  }
}

/**
 * GET /api/grants
 * List grants automatically scoped to the calling user's role
 */
export async function listGrants(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const status = req.query.status as string | undefined;
    const grants = await grantService.listGrants(req.user, status);

    res.json({
      grants,
      count: grants.length,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/grants/:id
 * Get single grant details
 */
export async function getGrantById(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const grant = await grantService.getGrantById(req.params.id as string, req.user);
    res.json(grant);
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/grants/:id/patient-consent
 * Key 1: Patient sovereign consent (APPROVE or REJECT)
 */
export async function respondToPatientConsent(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user || req.user.role !== 'PATIENT') {
      return res.status(403).json({ error: 'Forbidden', message: 'Only patients can respond to consent' });
    }

    const validated = patientConsentSchema.parse(req.body);
    const updated = await grantService.respondToPatientConsent(
      req.params.id as string,
      req.user,
      validated.status,
      validated.notes
    );

    res.json({
      message: `Patient consent updated to ${validated.status}`,
      grant: updated,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation Error',
        issues: error.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
      });
    }
    next(error);
  }
}

/**
 * PATCH /api/grants/:id/hospital-clearance
 * Key 2: Custodial hospital institutional clearance (APPROVE or REJECT)
 */
export async function respondToHospitalClearance(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user || req.user.role !== 'HOSPITAL') {
      return res.status(403).json({ error: 'Forbidden', message: 'Only hospital admins can grant institutional clearance' });
    }

    const validated = hospitalClearanceSchema.parse(req.body);
    const updated = await grantService.respondToHospitalClearance(
      req.params.id as string,
      req.user,
      validated.status,
      validated.notes
    );

    res.json({
      message: `Hospital clearance updated to ${validated.status}`,
      grant: updated,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation Error',
        issues: error.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
      });
    }
    next(error);
  }
}

/**
 * POST /api/grants/:id/revoke
 * Revoke an active grant (Patient, Doctor, or Hospital)
 */
export async function revokeGrant(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim() : undefined;
    const revoked = await grantService.revokeAccessRequest(
      req.params.id as string,
      req.user,
      reason
    );
    res.json({
      message: 'Access grant successfully revoked. Records are now locked.',
      grant: revoked,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/grants/:id/flag-dispute
 * Flag Break-Glass or suspicious access for host hospital review
 */
export async function flagDispute(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const validated = disputeIncidentSchema.parse(req.body);
    const result = await grantService.flagDisputeIncident(
      req.params.id as string,
      req.user,
      validated.reason,
      validated.alsoRevoke
    );

    res.json(result);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation Error',
        issues: error.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
      });
    }
    next(error);
  }
}

/**
 * PATCH /api/grants/:id
 * Backward-compatible endpoint
 */
export async function updateGrantStatus(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const validated = updateStatusSchema.parse(req.body);

    const updated = await grantService.updateGrantStatus(
      req.params.id as string,
      req.user,
      validated.status,
      validated.durationDays
    );

    res.json({
      message: `Access grant status updated to ${validated.status}`,
      grant: updated,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation Error',
        issues: error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
      });
    }
    next(error);
  }
}
