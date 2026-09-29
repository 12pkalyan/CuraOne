export interface PatientConsentInfo {
  id?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'BYPASSED_BREAK_GLASS';
  consentedAt?: string | null;
  patientNotes?: string | null;
  isDisputed?: boolean;
  disputeReason?: string | null;
  disputedAt?: string | null;
}

export interface HospitalClearanceInfo {
  id?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewedByEmail?: string | null;
  clearedAt?: string | null;
  rejectionReason?: string | null;
  flaggedForHostReview?: boolean;
  hostReviewNotes?: string | null;
}

export interface GrantItem {
  id: string;
  patientId: string;
  patientName: string;
  patientEmail: string;
  requestingDoctorId: string;
  requestingDoctorName?: string;
  requestingHospitalId: string;
  requestingHospitalName: string;
  targetHospitalId: string;
  targetHospitalName: string;
  purpose: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'REVOKED' | 'EXPIRED';
  isBreakGlass?: boolean;
  breakGlassAttestation?: string | null;
  createdAt: string;
  expiresAt?: string | null;
  revokedAt?: string | null;
  isExpired?: boolean;
  patientConsent?: PatientConsentInfo;
  hospitalClearance?: HospitalClearanceInfo;
}

export interface CreateGrantPayload {
  patientId: string;
  targetHospitalId: string;
  purpose: string;
  durationDays?: number;
  isBreakGlass?: boolean;
  breakGlassAttestation?: string;
}
