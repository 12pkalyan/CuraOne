import { db } from '../db';
import { 
  patients, 
  encounters, 
  clinicalEvents, 
  hospitals, 
  doctors, 
  accessRequests 
} from '../db/schema';
import { eq, and, or, ilike, isNull, gt, desc, sql, count } from 'drizzle-orm';

export interface SearchPatientsParams {
  search?: string;
  limit?: number;
  offset?: number;
}

export interface CreateClinicalEventInput {
  eventType: 'CONDITION' | 'MEDICATION' | 'ALLERGY' | 'PROCEDURE' | 'CAREPLAN' | 'IMMUNIZATION';
  code?: string;
  description: string;
  reasonDescription?: string;
  startDate?: string | Date;
  endDate?: string | Date;
}

export interface CreateEncounterInput {
  patientId: string;
  doctorId: string;
  hospitalId: string;
  startDate: string | Date;
  endDate?: string | Date;
  encounterClass?: string;
  description?: string;
  reasonDescription?: string;
  events?: CreateClinicalEventInput[];
}

/**
 * Search patients directory with pagination and encounter count
 */
export async function searchPatients({ search, limit = 20, offset = 0 }: SearchPatientsParams) {
  const filterConditions = [];
  if (search && search.trim()) {
    const term = `%${search.trim()}%`;
    filterConditions.push(
      or(
        ilike(patients.firstName, term),
        ilike(patients.lastName, term),
        ilike(patients.email, term)
      )
    );
  }

  const whereClause = filterConditions.length > 0 ? filterConditions[0] : undefined;

  // Query matching patients
  const patientList = await db
    .select({
      id: patients.id,
      firstName: patients.firstName,
      lastName: patients.lastName,
      email: patients.email,
      birthdate: patients.birthdate,
      gender: patients.gender,
      city: patients.city,
      state: patients.state,
      createdAt: patients.createdAt,
    })
    .from(patients)
    .where(whereClause)
    .orderBy(desc(patients.createdAt))
    .limit(limit)
    .offset(offset);

  // Total count for pagination
  const [totalRes] = await db
    .select({ count: count() })
    .from(patients)
    .where(whereClause);

  const total = Number(totalRes?.count || 0);

  // Attach total encounters count for each patient
  const patientIds = patientList.map((p) => p.id);
  const encounterCountsMap = new Map<string, number>();

  if (patientIds.length > 0) {
    const encounterStats = await db
      .select({
        patientId: encounters.patientId,
        count: count(encounters.id),
      })
      .from(encounters)
      .where(sql`${encounters.patientId} IN ${patientIds}`)
      .groupBy(encounters.patientId);

    for (const stat of encounterStats) {
      encounterCountsMap.set(stat.patientId, Number(stat.count));
    }
  }

  const results = patientList.map((p) => {
    const count = encounterCountsMap.get(p.id) || 0;
    return {
      ...p,
      fullName: `${p.firstName} ${p.lastName}`,
      totalEncounters: count,
      encounterCount: count,
    };
  });

  return {
    patients: results,
    patientList: results,
    pagination: {
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
    },
  };
}

/**
 * Get patient demographic profile by ID
 */
export async function getPatientById(patientId: string) {
  const [patient] = await db
    .select({
      id: patients.id,
      firstName: patients.firstName,
      lastName: patients.lastName,
      email: patients.email,
      birthdate: patients.birthdate,
      gender: patients.gender,
      city: patients.city,
      state: patients.state,
      createdAt: patients.createdAt,
    })
    .from(patients)
    .where(eq(patients.id, patientId))
    .limit(1);

  if (!patient) {
    const error: any = new Error('Patient not found');
    error.statusCode = 404;
    throw error;
  }

  return {
    ...patient,
    fullName: `${patient.firstName} ${patient.lastName}`,
  };
}

/**
 * Get longitudinal clinical timeline for a Provider (Doctor / Hospital)
 * Strictly applies contextual authorization (UNLOCKED vs LOCKED based on hospital jurisdiction & access grants)
 */
export async function getTimelineForProvider(patientId: string, requestingHospitalId: string) {
  const patient = await getPatientById(patientId);

  // 1. Find all active, approved grants for this patient and requesting hospital
  const now = new Date();
  const approvedGrants = await db
    .select({
      id: accessRequests.id,
      targetHospitalId: accessRequests.targetHospitalId,
      expiresAt: accessRequests.expiresAt,
      purpose: accessRequests.purpose,
    })
    .from(accessRequests)
    .where(
      and(
        eq(accessRequests.patientId, patientId),
        eq(accessRequests.requestingHospitalId, requestingHospitalId),
        eq(accessRequests.status, 'APPROVED'),
        or(isNull(accessRequests.expiresAt), gt(accessRequests.expiresAt, now))
      )
    );

  const authorizedTargetMap = new Map<string, typeof approvedGrants[0]>();
  for (const grant of approvedGrants) {
    authorizedTargetMap.set(grant.targetHospitalId, grant);
  }

  // 2. Fetch all encounters for this patient ordered chronologically
  const rawEncounters = await db
    .select({
      id: encounters.id,
      patientId: encounters.patientId,
      hospitalId: encounters.hospitalId,
      doctorId: encounters.doctorId,
      startDate: encounters.startDate,
      endDate: encounters.endDate,
      encounterClass: encounters.encounterClass,
      description: encounters.description,
      reasonDescription: encounters.reasonDescription,
      createdAt: encounters.createdAt,
      hospitalName: hospitals.name,
      hospitalCity: hospitals.city,
      hospitalState: hospitals.state,
      doctorName: doctors.name,
      doctorSpecialty: doctors.specialty,
    })
    .from(encounters)
    .leftJoin(hospitals, eq(encounters.hospitalId, hospitals.id))
    .leftJoin(doctors, eq(encounters.doctorId, doctors.id))
    .where(eq(encounters.patientId, patientId))
    .orderBy(desc(encounters.startDate));

  // 3. Fetch all clinical events for this patient
  const allEvents = await db
    .select({
      id: clinicalEvents.id,
      encounterId: clinicalEvents.encounterId,
      hospitalId: clinicalEvents.hospitalId,
      eventType: clinicalEvents.eventType,
      code: clinicalEvents.code,
      description: clinicalEvents.description,
      reasonDescription: clinicalEvents.reasonDescription,
      startDate: clinicalEvents.startDate,
      endDate: clinicalEvents.endDate,
    })
    .from(clinicalEvents)
    .where(eq(clinicalEvents.patientId, patientId))
    .orderBy(desc(clinicalEvents.startDate));

  const eventsByEncounterId = new Map<string, typeof allEvents>();
  for (const ev of allEvents) {
    if (ev.encounterId) {
      const list = eventsByEncounterId.get(ev.encounterId) || [];
      list.push(ev);
      eventsByEncounterId.set(ev.encounterId, list);
    }
  }

  // 4. Evaluate access gating on every encounter
  let unlockedCount = 0;
  let lockedCount = 0;
  const hospitalsInvolvedSet = new Set<string>();

  const processedEncounters = rawEncounters.map((enc) => {
    hospitalsInvolvedSet.add(enc.hospitalName || 'Unknown Hospital');
    const isOwnHospital = enc.hospitalId === requestingHospitalId;
    const activeGrant = authorizedTargetMap.get(enc.hospitalId);
    const hasGrant = !!activeGrant;

    if (isOwnHospital) {
      unlockedCount++;
      return {
        ...enc,
        isLocked: false,
        accessReason: 'CUSTODIAL_OWNER',
        grantDetails: null,
        clinicalEvents: eventsByEncounterId.get(enc.id) || [],
      };
    }

    if (hasGrant) {
      unlockedCount++;
      return {
        ...enc,
        isLocked: false,
        accessReason: 'AUTHORIZED_BY_GRANT',
        grantDetails: {
          grantId: activeGrant.id,
          purpose: activeGrant.purpose,
          expiresAt: activeGrant.expiresAt,
        },
        clinicalEvents: eventsByEncounterId.get(enc.id) || [],
      };
    }

    // Locked record: Redact sensitive clinical data
    lockedCount++;
    return {
      id: enc.id,
      patientId: enc.patientId,
      hospitalId: enc.hospitalId,
      hospitalName: enc.hospitalName,
      hospitalCity: enc.hospitalCity,
      hospitalState: enc.hospitalState,
      doctorId: null,
      doctorName: null,
      doctorSpecialty: null,
      startDate: enc.startDate,
      endDate: enc.endDate,
      encounterClass: enc.encounterClass,
      description: '[Protected Cross-Hospital Record - Access Grant Required]',
      reasonDescription: null,
      createdAt: enc.createdAt,
      isLocked: true,
      accessReason: 'REQUIRES_CROSS_HOSPITAL_GRANT',
      grantDetails: null,
      clinicalEvents: [], // Redacted
    };
  });

  return {
    patient,
    encounters: processedEncounters,
    summary: {
      totalEncounters: processedEncounters.length,
      unlockedCount,
      unlockedEncounters: unlockedCount,
      lockedCount,
      lockedEncounters: lockedCount,
      totalHospitalsInvolved: hospitalsInvolvedSet.size,
      hospitalsInvolved: Array.from(hospitalsInvolvedSet),
      requestingHospitalId,
    },
  };
}

/**
 * Get longitudinal clinical timeline for the Patient themselves
 * Patient has sovereign access: 100% of historical records across all hospitals are UNLOCKED
 */
export async function getTimelineForPatient(patientId: string) {
  const patient = await getPatientById(patientId);

  // Fetch all encounters ordered chronologically
  const rawEncounters = await db
    .select({
      id: encounters.id,
      patientId: encounters.patientId,
      hospitalId: encounters.hospitalId,
      doctorId: encounters.doctorId,
      startDate: encounters.startDate,
      endDate: encounters.endDate,
      encounterClass: encounters.encounterClass,
      description: encounters.description,
      reasonDescription: encounters.reasonDescription,
      createdAt: encounters.createdAt,
      hospitalName: hospitals.name,
      hospitalCity: hospitals.city,
      hospitalState: hospitals.state,
      doctorName: doctors.name,
      doctorSpecialty: doctors.specialty,
    })
    .from(encounters)
    .leftJoin(hospitals, eq(encounters.hospitalId, hospitals.id))
    .leftJoin(doctors, eq(encounters.doctorId, doctors.id))
    .where(eq(encounters.patientId, patientId))
    .orderBy(desc(encounters.startDate));

  // Fetch all clinical events
  const allEvents = await db
    .select({
      id: clinicalEvents.id,
      encounterId: clinicalEvents.encounterId,
      hospitalId: clinicalEvents.hospitalId,
      eventType: clinicalEvents.eventType,
      code: clinicalEvents.code,
      description: clinicalEvents.description,
      reasonDescription: clinicalEvents.reasonDescription,
      startDate: clinicalEvents.startDate,
      endDate: clinicalEvents.endDate,
    })
    .from(clinicalEvents)
    .where(eq(clinicalEvents.patientId, patientId))
    .orderBy(desc(clinicalEvents.startDate));

  const eventsByEncounterId = new Map<string, typeof allEvents>();
  for (const ev of allEvents) {
    if (ev.encounterId) {
      const list = eventsByEncounterId.get(ev.encounterId) || [];
      list.push(ev);
      eventsByEncounterId.set(ev.encounterId, list);
    }
  }

  const processedEncounters = rawEncounters.map((enc) => ({
    ...enc,
    isLocked: false,
    accessReason: 'PATIENT_SOVEREIGN_ACCESS',
    grantDetails: null,
    clinicalEvents: eventsByEncounterId.get(enc.id) || [],
  }));

  const hospitalsSet = new Set(processedEncounters.map((e) => e.hospitalName || 'Unknown Hospital'));

  return {
    patient,
    encounters: processedEncounters,
    summary: {
      totalEncounters: processedEncounters.length,
      unlockedCount: processedEncounters.length,
      unlockedEncounters: processedEncounters.length,
      lockedCount: 0,
      lockedEncounters: 0,
      totalHospitalsInvolved: hospitalsSet.size,
      hospitalsInvolved: Array.from(hospitalsSet),
    },
  };
}

/**
 * Create a new clinical encounter with diagnoses/prescriptions (Doctor only)
 */
export async function createEncounter(input: CreateEncounterInput) {
  // 1. Verify patient exists
  await getPatientById(input.patientId);

  // 2. Insert encounter record
  const [createdEncounter] = await db
    .insert(encounters)
    .values({
      patientId: input.patientId,
      doctorId: input.doctorId,
      hospitalId: input.hospitalId,
      startDate: new Date(input.startDate),
      endDate: input.endDate ? new Date(input.endDate) : new Date(input.startDate),
      encounterClass: input.encounterClass || 'AMBULATORY',
      description: input.description || 'Clinical Consultation',
      reasonDescription: input.reasonDescription || null,
    })
    .returning();

  // 3. Insert clinical events if provided
  let createdEvents: any[] = [];
  if (input.events && input.events.length > 0) {
    const eventsToInsert = input.events.map((ev) => ({
      encounterId: createdEncounter.id,
      patientId: input.patientId,
      hospitalId: input.hospitalId,
      eventType: ev.eventType,
      code: ev.code || null,
      description: ev.description,
      reasonDescription: ev.reasonDescription || null,
      startDate: ev.startDate ? new Date(ev.startDate) : new Date(input.startDate),
      endDate: ev.endDate ? new Date(ev.endDate) : null,
    }));

    createdEvents = await db.insert(clinicalEvents).values(eventsToInsert).returning();
  }

  return {
    encounter: createdEncounter,
    clinicalEvents: createdEvents,
  };
}
