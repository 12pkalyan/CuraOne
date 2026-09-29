import { db } from '../db';
import {
  accessRequests,
  patientConsents,
  hospitalClearances,
  patients,
  hospitals,
  doctors,
} from '../db/schema';
import { eq, and, or, desc, isNull, gt } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import type { AuthUserPayload } from '../types/auth.types';

export interface CreateGrantParams {
  patientId: string;
  requestingDoctorId: string;
  requestingHospitalId: string;
  targetHospitalId: string;
  purpose: string;
  durationDays?: number;
  isBreakGlass?: boolean;
  breakGlassAttestation?: string;
}

export type GrantStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'REVOKED' | 'EXPIRED';

// Aliases for joining requesting hospital and target hospital separately
const requestingHospitals = alias(hospitals, 'requesting_hospital');
const targetHospitals = alias(hospitals, 'target_hospital');

/**
 * 1. Doctor creates a new Access Grant request for an external hospital's records
 * Standard Request: creates PENDING patientConsent and PENDING hospitalClearance
 * Break-Glass Emergency Request: creates BYPASSED_BREAK_GLASS patientConsent, APPROVED clearance, and 24h clamp
 */
export async function createGrantRequest(params: CreateGrantParams) {
  // Guard 1: Cannot request your own custodial hospital
  if (params.requestingHospitalId === params.targetHospitalId) {
    const err: any = new Error(
      'Cannot request an access grant for your own custodial hospital (records already accessible)'
    );
    err.statusCode = 400;
    throw err;
  }

  // Guard 2: Verify patient exists
  const [patient] = await db
    .select({ id: patients.id })
    .from(patients)
    .where(eq(patients.id, params.patientId))
    .limit(1);

  if (!patient) {
    const err: any = new Error('Patient not found');
    err.statusCode = 404;
    throw err;
  }

  // Guard 3: Verify target hospital exists
  const [targetHosp] = await db
    .select({ id: hospitals.id, name: hospitals.name })
    .from(hospitals)
    .where(eq(hospitals.id, params.targetHospitalId))
    .limit(1);

  if (!targetHosp) {
    const err: any = new Error('Target hospital not found');
    err.statusCode = 404;
    throw err;
  }

  // Guard 4: Check if an active or pending request already exists
  const now = new Date();
  const [existingRequest] = await db
    .select({ id: accessRequests.id, status: accessRequests.status })
    .from(accessRequests)
    .where(
      and(
        eq(accessRequests.patientId, params.patientId),
        eq(accessRequests.requestingHospitalId, params.requestingHospitalId),
        eq(accessRequests.targetHospitalId, params.targetHospitalId),
        or(
          eq(accessRequests.status, 'PENDING'),
          and(
            eq(accessRequests.status, 'APPROVED'),
            or(isNull(accessRequests.expiresAt), gt(accessRequests.expiresAt, now))
          )
        )
      )
    )
    .limit(1);

  if (existingRequest) {
    const err: any = new Error(
      `An access request is already ${existingRequest.status} for this patient and hospital`
    );
    err.statusCode = 409;
    throw err;
  }

  const isBreakGlass = Boolean(params.isBreakGlass);
  // Break-glass is strictly clamped to 24 hours; normal request defaults to 7 days
  const durationDays = isBreakGlass ? 1 : params.durationDays || 7;
  const initialExpiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);

  // 1. Insert master access request
  const [createdRequest] = await db
    .insert(accessRequests)
    .values({
      patientId: params.patientId,
      requestingDoctorId: params.requestingDoctorId,
      requestingHospitalId: params.requestingHospitalId,
      targetHospitalId: params.targetHospitalId,
      purpose: params.purpose,
      status: isBreakGlass ? 'APPROVED' : 'PENDING',
      isBreakGlass: isBreakGlass,
      breakGlassAttestation: isBreakGlass
        ? params.breakGlassAttestation || 'Emergency override: Patient incapacitated in acute care'
        : null,
      expiresAt: initialExpiresAt,
    })
    .returning();

  // 2. Insert Key 1: Patient Consent
  const [createdConsent] = await db
    .insert(patientConsents)
    .values({
      requestId: createdRequest.id,
      patientId: params.patientId,
      status: isBreakGlass ? 'BYPASSED_BREAK_GLASS' : 'PENDING',
      consentedAt: isBreakGlass ? now : null,
      patientNotes: isBreakGlass ? 'Emergency clinical override by attending physician' : null,
    })
    .returning();

  // 3. Insert Key 2: Custodial Hospital Clearance
  const [createdClearance] = await db
    .insert(hospitalClearances)
    .values({
      requestId: createdRequest.id,
      targetHospitalId: params.targetHospitalId,
      status: isBreakGlass ? 'APPROVED' : 'PENDING',
      clearedAt: isBreakGlass ? now : null,
      reviewedByEmail: isBreakGlass ? 'system.breakglass@curaone.health' : null,
    })
    .returning();

  return {
    grant: {
      ...createdRequest,
      patientConsent: createdConsent,
      hospitalClearance: createdClearance,
    },
    targetHospital: targetHosp,
  };
}

/**
 * 2. List grants automatically filtered based on user role with joined child tables
 */
export async function listGrants(user: AuthUserPayload, statusFilter?: string) {
  let roleCondition;

  if (user.role === 'PATIENT') {
    // Patient sees requests involving their own records
    roleCondition = eq(accessRequests.patientId, user.id);
  } else if (user.role === 'DOCTOR') {
    // Doctor sees requests they or their affiliated hospital made
    roleCondition = or(
      eq(accessRequests.requestingDoctorId, user.id),
      user.hospitalId ? eq(accessRequests.requestingHospitalId, user.hospitalId) : undefined
    );
  } else if (user.role === 'HOSPITAL') {
    // Hospital admin sees requests where their hospital is requester OR target custodian
    roleCondition = or(
      eq(accessRequests.requestingHospitalId, user.id),
      eq(accessRequests.targetHospitalId, user.id)
    );
  }

  const whereConditions = [];
  if (roleCondition) whereConditions.push(roleCondition);
  if (statusFilter) whereConditions.push(eq(accessRequests.status, statusFilter.toUpperCase()));

  const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

  const rows = await db
    .select({
      id: accessRequests.id,
      patientId: accessRequests.patientId,
      patientFirstName: patients.firstName,
      patientLastName: patients.lastName,
      patientEmail: patients.email,
      requestingDoctorId: accessRequests.requestingDoctorId,
      requestingDoctorName: doctors.name,
      requestingHospitalId: accessRequests.requestingHospitalId,
      requestingHospitalName: requestingHospitals.name,
      targetHospitalId: accessRequests.targetHospitalId,
      targetHospitalName: targetHospitals.name,
      status: accessRequests.status,
      purpose: accessRequests.purpose,
      isBreakGlass: accessRequests.isBreakGlass,
      breakGlassAttestation: accessRequests.breakGlassAttestation,
      createdAt: accessRequests.createdAt,
      expiresAt: accessRequests.expiresAt,
      revokedAt: accessRequests.revokedAt,
      // Key 1: Patient Consent
      consentId: patientConsents.id,
      consentStatus: patientConsents.status,
      consentedAt: patientConsents.consentedAt,
      patientNotes: patientConsents.patientNotes,
      isDisputed: patientConsents.isDisputed,
      disputeReason: patientConsents.disputeReason,
      disputedAt: patientConsents.disputedAt,
      // Key 2: Hospital Clearance
      clearanceId: hospitalClearances.id,
      clearanceStatus: hospitalClearances.status,
      reviewedByEmail: hospitalClearances.reviewedByEmail,
      clearedAt: hospitalClearances.clearedAt,
      rejectionReason: hospitalClearances.rejectionReason,
      flaggedForHostReview: hospitalClearances.flaggedForHostReview,
      hostReviewNotes: hospitalClearances.hostReviewNotes,
    })
    .from(accessRequests)
    .leftJoin(patientConsents, eq(accessRequests.id, patientConsents.requestId))
    .leftJoin(hospitalClearances, eq(accessRequests.id, hospitalClearances.requestId))
    .leftJoin(patients, eq(accessRequests.patientId, patients.id))
    .leftJoin(doctors, eq(accessRequests.requestingDoctorId, doctors.id))
    .leftJoin(requestingHospitals, eq(accessRequests.requestingHospitalId, requestingHospitals.id))
    .leftJoin(targetHospitals, eq(accessRequests.targetHospitalId, targetHospitals.id))
    .where(whereClause)
    .orderBy(desc(accessRequests.createdAt));

  return rows.map((r) => ({
    id: r.id,
    patientId: r.patientId,
    patientName: `${r.patientFirstName || ''} ${r.patientLastName || ''}`.trim(),
    patientEmail: r.patientEmail,
    requestingDoctorId: r.requestingDoctorId,
    requestingDoctorName: r.requestingDoctorName,
    requestingHospitalId: r.requestingHospitalId,
    requestingHospitalName: r.requestingHospitalName,
    targetHospitalId: r.targetHospitalId,
    targetHospitalName: r.targetHospitalName,
    purpose: r.purpose,
    status: r.status,
    isBreakGlass: r.isBreakGlass,
    breakGlassAttestation: r.breakGlassAttestation,
    createdAt: r.createdAt,
    expiresAt: r.expiresAt,
    revokedAt: r.revokedAt,
    isExpired: r.expiresAt ? new Date(r.expiresAt) < new Date() : false,
    patientConsent: {
      id: r.consentId,
      status: r.consentStatus || 'PENDING',
      consentedAt: r.consentedAt,
      patientNotes: r.patientNotes,
      isDisputed: Boolean(r.isDisputed),
      disputeReason: r.disputeReason,
      disputedAt: r.disputedAt,
    },
    hospitalClearance: {
      id: r.clearanceId,
      status: r.clearanceStatus || 'PENDING',
      reviewedByEmail: r.reviewedByEmail,
      clearedAt: r.clearedAt,
      rejectionReason: r.rejectionReason,
      flaggedForHostReview: Boolean(r.flaggedForHostReview),
      hostReviewNotes: r.hostReviewNotes,
    },
  }));
}

/**
 * 3. Get single grant by ID with authorization verification
 */
export async function getGrantById(grantId: string, user: AuthUserPayload) {
  const [row] = await db
    .select({
      id: accessRequests.id,
      patientId: accessRequests.patientId,
      patientFirstName: patients.firstName,
      patientLastName: patients.lastName,
      patientEmail: patients.email,
      requestingDoctorId: accessRequests.requestingDoctorId,
      requestingDoctorName: doctors.name,
      requestingHospitalId: accessRequests.requestingHospitalId,
      requestingHospitalName: requestingHospitals.name,
      targetHospitalId: accessRequests.targetHospitalId,
      targetHospitalName: targetHospitals.name,
      status: accessRequests.status,
      purpose: accessRequests.purpose,
      isBreakGlass: accessRequests.isBreakGlass,
      breakGlassAttestation: accessRequests.breakGlassAttestation,
      createdAt: accessRequests.createdAt,
      expiresAt: accessRequests.expiresAt,
      revokedAt: accessRequests.revokedAt,
      // Key 1
      consentId: patientConsents.id,
      consentStatus: patientConsents.status,
      consentedAt: patientConsents.consentedAt,
      patientNotes: patientConsents.patientNotes,
      isDisputed: patientConsents.isDisputed,
      disputeReason: patientConsents.disputeReason,
      disputedAt: patientConsents.disputedAt,
      // Key 2
      clearanceId: hospitalClearances.id,
      clearanceStatus: hospitalClearances.status,
      reviewedByEmail: hospitalClearances.reviewedByEmail,
      clearedAt: hospitalClearances.clearedAt,
      rejectionReason: hospitalClearances.rejectionReason,
      flaggedForHostReview: hospitalClearances.flaggedForHostReview,
      hostReviewNotes: hospitalClearances.hostReviewNotes,
    })
    .from(accessRequests)
    .leftJoin(patientConsents, eq(accessRequests.id, patientConsents.requestId))
    .leftJoin(hospitalClearances, eq(accessRequests.id, hospitalClearances.requestId))
    .leftJoin(patients, eq(accessRequests.patientId, patients.id))
    .leftJoin(doctors, eq(accessRequests.requestingDoctorId, doctors.id))
    .leftJoin(requestingHospitals, eq(accessRequests.requestingHospitalId, requestingHospitals.id))
    .leftJoin(targetHospitals, eq(accessRequests.targetHospitalId, targetHospitals.id))
    .where(eq(accessRequests.id, grantId))
    .limit(1);

  if (!row) {
    const err: any = new Error('Access grant not found');
    err.statusCode = 404;
    throw err;
  }

  // Access check
  if (
    (user.role === 'PATIENT' && row.patientId !== user.id) ||
    (user.role === 'DOCTOR' &&
      row.requestingDoctorId !== user.id &&
      row.requestingHospitalId !== user.hospitalId) ||
    (user.role === 'HOSPITAL' &&
      row.requestingHospitalId !== user.id &&
      row.targetHospitalId !== user.id)
  ) {
    const err: any = new Error('Unauthorized to view this access grant');
    err.statusCode = 403;
    throw err;
  }

  return {
    id: row.id,
    patientId: row.patientId,
    patientName: `${row.patientFirstName || ''} ${row.patientLastName || ''}`.trim(),
    patientEmail: row.patientEmail,
    requestingDoctorId: row.requestingDoctorId,
    requestingDoctorName: row.requestingDoctorName,
    requestingHospitalId: row.requestingHospitalId,
    requestingHospitalName: row.requestingHospitalName,
    targetHospitalId: row.targetHospitalId,
    targetHospitalName: row.targetHospitalName,
    purpose: row.purpose,
    status: row.status,
    isBreakGlass: row.isBreakGlass,
    breakGlassAttestation: row.breakGlassAttestation,
    createdAt: row.createdAt,
    expiresAt: row.expiresAt,
    revokedAt: row.revokedAt,
    isExpired: row.expiresAt ? new Date(row.expiresAt) < new Date() : false,
    patientConsent: {
      id: row.consentId,
      status: row.consentStatus || 'PENDING',
      consentedAt: row.consentedAt,
      patientNotes: row.patientNotes,
      isDisputed: Boolean(row.isDisputed),
      disputeReason: row.disputeReason,
      disputedAt: row.disputedAt,
    },
    hospitalClearance: {
      id: row.clearanceId,
      status: row.clearanceStatus || 'PENDING',
      reviewedByEmail: row.reviewedByEmail,
      clearedAt: row.clearedAt,
      rejectionReason: row.rejectionReason,
      flaggedForHostReview: Boolean(row.flaggedForHostReview),
      hostReviewNotes: row.hostReviewNotes,
    },
  };
}

/**
 * 4. Patient updates Key 1 (Sovereign Consent: APPROVE or REJECT)
 */
export async function respondToPatientConsent(
  requestId: string,
  user: AuthUserPayload,
  decision: 'APPROVED' | 'REJECTED',
  notes?: string
) {
  if (user.role !== 'PATIENT') {
    const err: any = new Error('Only patients can grant sovereign consent');
    err.statusCode = 403;
    throw err;
  }

  const [reqRecord] = await db
    .select()
    .from(accessRequests)
    .where(eq(accessRequests.id, requestId))
    .limit(1);

  if (!reqRecord) {
    const err: any = new Error('Access request not found');
    err.statusCode = 404;
    throw err;
  }

  if (reqRecord.patientId !== user.id) {
    const err: any = new Error('Unauthorized to provide consent for another patient');
    err.statusCode = 403;
    throw err;
  }

  if (reqRecord.status !== 'PENDING') {
    const err: any = new Error(`Cannot update consent for a request that is ${reqRecord.status}`);
    err.statusCode = 400;
    throw err;
  }

  // Update Key 1 (patient_consents)
  await db
    .update(patientConsents)
    .set({
      status: decision,
      consentedAt: new Date(),
      patientNotes: notes || null,
    })
    .where(eq(patientConsents.requestId, requestId));

  // Fetch current Key 2 status (hospital_clearances)
  const [clearance] = await db
    .select()
    .from(hospitalClearances)
    .where(eq(hospitalClearances.requestId, requestId))
    .limit(1);

  let newMasterStatus = 'PENDING';
  if (decision === 'REJECTED') {
    newMasterStatus = 'REJECTED';
  } else if (decision === 'APPROVED' && clearance && clearance.status === 'APPROVED') {
    // Both keys turned!
    newMasterStatus = 'APPROVED';
  }

  const [updatedRequest] = await db
    .update(accessRequests)
    .set({ status: newMasterStatus })
    .where(eq(accessRequests.id, requestId))
    .returning();

  return updatedRequest;
}

/**
 * 5. Custodial Hospital updates Key 2 (Institutional Clearance: APPROVE or REJECT)
 */
export async function respondToHospitalClearance(
  requestId: string,
  user: AuthUserPayload,
  decision: 'APPROVED' | 'REJECTED',
  notes?: string
) {
  if (user.role !== 'HOSPITAL') {
    const err: any = new Error('Only custodial hospital admins can grant record clearance');
    err.statusCode = 403;
    throw err;
  }

  const [reqRecord] = await db
    .select()
    .from(accessRequests)
    .where(eq(accessRequests.id, requestId))
    .limit(1);

  if (!reqRecord) {
    const err: any = new Error('Access request not found');
    err.statusCode = 404;
    throw err;
  }

  if (reqRecord.targetHospitalId !== user.id) {
    const err: any = new Error('Only the target custodial hospital can approve record clearance');
    err.statusCode = 403;
    throw err;
  }

  if (reqRecord.status !== 'PENDING') {
    const err: any = new Error(`Cannot update clearance for a request that is ${reqRecord.status}`);
    err.statusCode = 400;
    throw err;
  }

  // Update Key 2 (hospital_clearances)
  await db
    .update(hospitalClearances)
    .set({
      status: decision,
      clearedAt: new Date(),
      reviewedByEmail: user.email,
      rejectionReason: decision === 'REJECTED' ? notes : null,
    })
    .where(eq(hospitalClearances.requestId, requestId));

  // Fetch current Key 1 status (patient_consents)
  const [consent] = await db
    .select()
    .from(patientConsents)
    .where(eq(patientConsents.requestId, requestId))
    .limit(1);

  let newMasterStatus = 'PENDING';
  if (decision === 'REJECTED') {
    newMasterStatus = 'REJECTED';
  } else if (
    decision === 'APPROVED' &&
    consent &&
    (consent.status === 'APPROVED' || consent.status === 'BYPASSED_BREAK_GLASS')
  ) {
    // Both keys turned!
    newMasterStatus = 'APPROVED';
  }

  const [updatedRequest] = await db
    .update(accessRequests)
    .set({ status: newMasterStatus })
    .where(eq(accessRequests.id, requestId))
    .returning();

  return updatedRequest;
}

/**
 * 6. Revoke an active grant (Patient, Doctor, or Hospital)
 * Supports priority emergency revocation with audit logging & disciplinary alerts
 */
export async function revokeAccessRequest(
  requestId: string,
  user: AuthUserPayload,
  reason?: string
) {
  const [reqRecord] = await db
    .select()
    .from(accessRequests)
    .where(eq(accessRequests.id, requestId))
    .limit(1);

  if (!reqRecord) {
    const err: any = new Error('Access request not found');
    err.statusCode = 404;
    throw err;
  }

  // Auth check
  const isPatientOwner = user.role === 'PATIENT' && reqRecord.patientId === user.id;
  const isDoctorOwner =
    user.role === 'DOCTOR' &&
    (reqRecord.requestingDoctorId === user.id || reqRecord.requestingHospitalId === user.hospitalId);
  const isHospitalParty =
    user.role === 'HOSPITAL' &&
    (reqRecord.requestingHospitalId === user.id || reqRecord.targetHospitalId === user.id);

  if (!isPatientOwner && !isDoctorOwner && !isHospitalParty) {
    const err: any = new Error('Unauthorized to revoke this access grant');
    err.statusCode = 403;
    throw err;
  }

  if (reqRecord.status === 'REVOKED') {
    return reqRecord;
  }

  const now = new Date();

  const [revoked] = await db
    .update(accessRequests)
    .set({
      status: 'REVOKED',
      revokedAt: now,
    })
    .where(eq(accessRequests.id, requestId))
    .returning();

  // If this is a priority revocation by Patient or Custodial Hospital, update consents/clearances
  if (user.role === 'PATIENT') {
    const defaultReason = reason || 'Priority Revocation executed by patient: emergency access severed.';
    await db
      .update(patientConsents)
      .set({
        isDisputed: true,
        disputeReason: defaultReason,
        disputedAt: now,
      })
      .where(eq(patientConsents.requestId, requestId));

    await db
      .update(hospitalClearances)
      .set({
        flaggedForHostReview: true,
        hostReviewNotes: `Priority Revocation (Patient): ${defaultReason}`,
      })
      .where(eq(hospitalClearances.requestId, requestId));
  } else if (user.role === 'HOSPITAL' && reqRecord.targetHospitalId === user.id) {
    const defaultReason = reason || 'Priority Revocation executed by custodial hospital: access quarantined.';
    await db
      .update(hospitalClearances)
      .set({
        status: 'REJECTED',
        flaggedForHostReview: true,
        hostReviewNotes: `Priority Revocation (Target Custodian): ${defaultReason}`,
      })
      .where(eq(hospitalClearances.requestId, requestId));
  }

  return revoked;
}

/**
 * 7. Flag Break-Glass or Suspicious Access Dispute (Patient or Target Hospital)
 * Triggers host hospital review notification
 */
export async function flagDisputeIncident(
  requestId: string,
  user: AuthUserPayload,
  reason: string,
  alsoRevoke?: boolean
) {
  const [reqRecord] = await db
    .select()
    .from(accessRequests)
    .where(eq(accessRequests.id, requestId))
    .limit(1);

  if (!reqRecord) {
    const err: any = new Error('Access request not found');
    err.statusCode = 404;
    throw err;
  }

  const now = new Date();

  if (user.role === 'PATIENT') {
    if (reqRecord.patientId !== user.id) {
      const err: any = new Error('Unauthorized to flag disputes for another patient');
      err.statusCode = 403;
      throw err;
    }

    await db
      .update(patientConsents)
      .set({
        isDisputed: true,
        disputeReason: reason,
        disputedAt: now,
      })
      .where(eq(patientConsents.requestId, requestId));

    // Also flag custodial review to alert the doctor's host hospital
    await db
      .update(hospitalClearances)
      .set({
        flaggedForHostReview: true,
        hostReviewNotes: `Patient Dispute: ${reason}`,
      })
      .where(eq(hospitalClearances.requestId, requestId));
  } else if (user.role === 'HOSPITAL') {
    if (reqRecord.targetHospitalId !== user.id) {
      const err: any = new Error('Only the custodial hospital can flag peer review incidents');
      err.statusCode = 403;
      throw err;
    }

    await db
      .update(hospitalClearances)
      .set({
        flaggedForHostReview: true,
        hostReviewNotes: `Target Custodian Flag: ${reason}`,
      })
      .where(eq(hospitalClearances.requestId, requestId));
  } else {
    const err: any = new Error('Only patients or custodial hospitals can flag access disputes');
    err.statusCode = 403;
    throw err;
  }

  // If immediate priority revocation is requested alongside the dispute flag
  let revokedGrant = null;
  if (alsoRevoke && reqRecord.status !== 'REVOKED') {
    revokedGrant = await revokeAccessRequest(requestId, user, reason);
  }

  return {
    message: alsoRevoke
      ? 'Incident flagged and access grant revoked immediately. Records are now locked.'
      : 'Incident flagged for bilateral host hospital peer review',
    requestId,
    isRevoked: Boolean(alsoRevoke || reqRecord.status === 'REVOKED'),
    grant: revokedGrant,
  };
}

/**
 * 8. Backward-compatible updateGrantStatus
 */
export async function updateGrantStatus(
  grantId: string,
  user: AuthUserPayload,
  newStatus: 'APPROVED' | 'REJECTED' | 'REVOKED',
  _durationDays?: number
) {
  if (newStatus === 'REVOKED') {
    return revokeAccessRequest(grantId, user);
  }

  if (user.role === 'PATIENT') {
    return respondToPatientConsent(grantId, user, newStatus);
  }

  if (user.role === 'HOSPITAL') {
    return respondToHospitalClearance(grantId, user, newStatus);
  }

  const err: any = new Error('Unauthorized to update grant status');
  err.statusCode = 403;
  throw err;
}
