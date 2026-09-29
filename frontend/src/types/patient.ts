export interface PatientListItem {
  id: string;
  firstName: string;
  lastName: string;
  fullName?: string;
  email: string;
  birthdate: string;
  gender: string;
  city?: string | null;
  state?: string | null;
  totalEncounters: number;
  encounterCount?: number;
}

export interface SearchPatientsResponse {
  patients: PatientListItem[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export interface PatientDetail {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  birthdate: string;
  gender: string;
  city?: string | null;
  state?: string | null;
  createdAt: string;
}

export type ClinicalEventType = 
  | 'CONDITION' 
  | 'MEDICATION' 
  | 'ALLERGY' 
  | 'PROCEDURE' 
  | 'CAREPLAN' 
  | 'IMMUNIZATION';

export interface ClinicalEvent {
  id: string;
  encounterId?: string | null;
  hospitalId: string;
  eventType: ClinicalEventType;
  code?: string | null;
  description: string;
  reasonDescription?: string | null;
  startDate?: string | null;
  endDate?: string | null;
}

export interface TimelineEncounter {
  id: string;
  patientId: string;
  hospitalId: string;
  hospitalName: string;
  hospitalCity?: string | null;
  hospitalState?: string | null;
  doctorId?: string | null;
  doctorName?: string | null;
  doctorSpecialty?: string | null;
  startDate: string;
  endDate?: string | null;
  encounterClass?: string | null;
  description?: string | null;
  reasonDescription?: string | null;
  createdAt: string;
  isLocked: boolean;
  accessReason: 'CUSTODIAL_OWNER' | 'AUTHORIZED_BY_GRANT' | 'REQUIRES_CROSS_HOSPITAL_GRANT';
  grantDetails?: {
    grantId: string;
    purpose?: string | null;
    expiresAt?: string | null;
  } | null;
  clinicalEvents: ClinicalEvent[];
}

export interface TimelineResponse {
  patient: PatientDetail;
  encounters: TimelineEncounter[];
  summary: {
    totalEncounters: number;
    unlockedEncounters: number;
    lockedEncounters: number;
    hospitalsInvolved: string[];
  };
}

export interface CreateClinicalEventInput {
  eventType: ClinicalEventType;
  code?: string;
  description: string;
  reasonDescription?: string;
}

export interface CreateEncounterPayload {
  startDate: string;
  endDate?: string;
  encounterClass: string;
  description: string;
  reasonDescription?: string;
  events?: CreateClinicalEventInput[];
}

export interface CreateGrantPayload {
  patientId: string;
  targetHospitalId: string;
  purpose: string;
  durationDays?: number;
}
