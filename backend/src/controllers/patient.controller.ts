import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as patientService from '../services/patient.service';

const createEventSchema = z.object({
  eventType: z.enum(['CONDITION', 'MEDICATION', 'ALLERGY', 'PROCEDURE', 'CAREPLAN', 'IMMUNIZATION']),
  code: z.string().optional(),
  description: z.string().min(1, 'Clinical event description is required'),
  reasonDescription: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

const createEncounterSchema = z.object({
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().optional(),
  encounterClass: z.string().optional(),
  description: z.string().optional(),
  reasonDescription: z.string().optional(),
  events: z.array(createEventSchema).optional(),
});

/**
 * GET /api/patients
 * Provider search of patient cohort
 */
export async function searchPatients(req: Request, res: Response, next: NextFunction) {
  try {
    const search = req.query.search as string | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
    const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;

    const result = await patientService.searchPatients({ search, limit, offset });
    res.json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/patients/:id
 * Get patient demographic details
 */
export async function getPatientById(req: Request, res: Response, next: NextFunction) {
  try {
    const patientId = req.params.id as string;
    const patient = await patientService.getPatientById(patientId);
    res.json(patient);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/patients/:id/timeline
 * Attending Provider View: Longitudinal timeline with hospital access gating
 */
export async function getProviderTimeline(req: Request, res: Response, next: NextFunction) {
  try {
    const patientId = req.params.id as string;

    // Determine the requesting provider's custodial hospital ID
    let requestingHospitalId: string | null = null;

    if (req.user?.role === 'DOCTOR') {
      requestingHospitalId = req.user.hospitalId || null;
    } else if (req.user?.role === 'HOSPITAL') {
      requestingHospitalId = req.user.id;
    } else if (req.user?.role === 'SYSTEM_ADMIN') {
      // System admin can simulate a hospital or pass via query
      requestingHospitalId = (req.query.hospitalId as string) || req.user.id;
    }

    if (!requestingHospitalId) {
      return res.status(400).json({
        error: 'BadRequest',
        message: 'Requesting provider must be affiliated with a custodial hospital to view gated clinical timeline',
      });
    }

    const timeline = await patientService.getTimelineForProvider(patientId, requestingHospitalId);
    res.json(timeline);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/patients/me/timeline
 * Patient Sovereign View: 100% of patient's records across all hospitals are UNLOCKED
 */
export async function getMyTimeline(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user || req.user.role !== 'PATIENT') {
      return res.status(403).json({ error: 'Forbidden', message: 'Only patients can access their personal sovereign timeline' });
    }

    const timeline = await patientService.getTimelineForPatient(req.user.id);
    res.json(timeline);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/patients/me/profile
 * Patient profile view
 */
export async function getMyProfile(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user || req.user.role !== 'PATIENT') {
      return res.status(403).json({ error: 'Forbidden', message: 'Only patients can access this profile endpoint' });
    }

    const profile = await patientService.getPatientById(req.user.id);
    res.json(profile);
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/patients/:id/encounters
 * Doctor records a new clinical encounter + diagnoses/prescriptions
 */
export async function createEncounter(req: Request, res: Response, next: NextFunction) {
  try {
    const patientId = req.params.id as string;
    const doctorId = req.user?.id;
    const hospitalId = req.user?.hospitalId;

    if (!doctorId || !hospitalId) {
      return res.status(400).json({
        error: 'BadRequest',
        message: 'Doctor account must have an active hospital affiliation to create clinical records',
      });
    }

    const validatedData = createEncounterSchema.parse(req.body);

    const result = await patientService.createEncounter({
      patientId,
      doctorId,
      hospitalId,
      ...validatedData,
    });

    res.status(201).json({
      message: 'Clinical encounter and events recorded successfully',
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
