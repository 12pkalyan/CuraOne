import { pgTable, uuid, text, varchar, timestamp, date, vector, boolean } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// 1. HOSPITALS (from organizations.csv)
export const hospitals = pgTable('hospitals', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  city: text('city'),
  state: text('state'),
  phone: text('phone'),
  adminEmail: text('admin_email').unique(),
  passwordHash: text('password_hash'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const hospitalsRelations = relations(hospitals, ({ many }) => ({
  doctors: many(doctors),
  encounters: many(encounters),
  clinicalEvents: many(clinicalEvents),
  requestedAccess: many(accessRequests, { relationName: 'requestingHospital' }),
  custodialAccess: many(accessRequests, { relationName: 'targetHospital' }),
  clearances: many(hospitalClearances),
}));

// 2. DOCTORS (from providers.csv)
export const doctors = pgTable('doctors', {
  id: uuid('id').primaryKey().defaultRandom(),
  hospitalId: uuid('hospital_id')
    .references(() => hospitals.id, { onDelete: 'cascade' })
    .notNull(),
  name: text('name').notNull(),
  specialty: text('specialty'),
  gender: varchar('gender', { length: 10 }),
  email: text('email').unique(),
  passwordHash: text('password_hash'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const doctorsRelations = relations(doctors, ({ one, many }) => ({
  hospital: one(hospitals, {
    fields: [doctors.hospitalId],
    references: [hospitals.id],
  }),
  encounters: many(encounters),
  accessRequests: many(accessRequests),
}));

// 3. PATIENTS (from patients.csv)
export const patients = pgTable('patients', {
  id: uuid('id').primaryKey().defaultRandom(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  birthdate: date('birthdate'),
  gender: varchar('gender', { length: 10 }),
  city: text('city'),
  state: text('state'),
  email: text('email').unique(),
  passwordHash: text('password_hash'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const patientsRelations = relations(patients, ({ many }) => ({
  encounters: many(encounters),
  clinicalEvents: many(clinicalEvents),
  accessRequests: many(accessRequests),
  patientConsents: many(patientConsents),
  embeddings: many(clinicalEmbeddings),
}));

// 4. ENCOUNTERS (from encounters.csv)
export const encounters = pgTable('encounters', {
  id: uuid('id').primaryKey().defaultRandom(),
  patientId: uuid('patient_id')
    .references(() => patients.id, { onDelete: 'cascade' })
    .notNull(),
  hospitalId: uuid('hospital_id')
    .references(() => hospitals.id, { onDelete: 'cascade' })
    .notNull(),
  doctorId: uuid('doctor_id').references(() => doctors.id, { onDelete: 'set null' }),
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date'),
  encounterClass: text('encounter_class'),
  description: text('description'),
  reasonDescription: text('reason_description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const encountersRelations = relations(encounters, ({ one, many }) => ({
  patient: one(patients, {
    fields: [encounters.patientId],
    references: [patients.id],
  }),
  hospital: one(hospitals, {
    fields: [encounters.hospitalId],
    references: [hospitals.id],
  }),
  doctor: one(doctors, {
    fields: [encounters.doctorId],
    references: [doctors.id],
  }),
  clinicalEvents: many(clinicalEvents),
}));

// 5. CLINICAL EVENTS (unified: conditions, medications, allergies, procedures, careplans, immunizations)
export const clinicalEvents = pgTable('clinical_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  encounterId: uuid('encounter_id').references(() => encounters.id, { onDelete: 'cascade' }),
  patientId: uuid('patient_id')
    .references(() => patients.id, { onDelete: 'cascade' })
    .notNull(),
  hospitalId: uuid('hospital_id')
    .references(() => hospitals.id, { onDelete: 'cascade' })
    .notNull(),
  eventType: varchar('event_type', { length: 30 }).notNull(), // 'CONDITION' | 'MEDICATION' | 'ALLERGY' | 'PROCEDURE' | 'CAREPLAN' | 'IMMUNIZATION'
  code: text('code'),
  description: text('description').notNull(),
  reasonDescription: text('reason_description'),
  startDate: timestamp('start_date'),
  endDate: timestamp('end_date'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const clinicalEventsRelations = relations(clinicalEvents, ({ one }) => ({
  encounter: one(encounters, {
    fields: [clinicalEvents.encounterId],
    references: [encounters.id],
  }),
  patient: one(patients, {
    fields: [clinicalEvents.patientId],
    references: [patients.id],
  }),
  hospital: one(hospitals, {
    fields: [clinicalEvents.hospitalId],
    references: [hospitals.id],
  }),
}));

// 6. ACCESS REQUESTS (Master cross-hospital query record)
export const accessRequests = pgTable('access_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  patientId: uuid('patient_id')
    .references(() => patients.id, { onDelete: 'cascade' })
    .notNull(),
  requestingDoctorId: uuid('requesting_doctor_id')
    .references(() => doctors.id, { onDelete: 'cascade' })
    .notNull(),
  requestingHospitalId: uuid('requesting_hospital_id')
    .references(() => hospitals.id, { onDelete: 'cascade' })
    .notNull(),
  targetHospitalId: uuid('target_hospital_id')
    .references(() => hospitals.id, { onDelete: 'cascade' })
    .notNull(),
  purpose: text('purpose').notNull(),
  status: varchar('status', { length: 20 }).default('PENDING').notNull(), // 'PENDING' | 'APPROVED' | 'REJECTED' | 'REVOKED' | 'EXPIRED'
  isBreakGlass: boolean('is_break_glass').default(false).notNull(),
  breakGlassAttestation: text('break_glass_attestation'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  expiresAt: timestamp('expires_at'),
  revokedAt: timestamp('revoked_at'),
});

// Backward compatibility export alias
export const accessGrants = accessRequests;

// 6A. PATIENT CONSENTS (Key 1: Sovereign Patient Consent)
export const patientConsents = pgTable('patient_consents', {
  id: uuid('id').primaryKey().defaultRandom(),
  requestId: uuid('request_id')
    .references(() => accessRequests.id, { onDelete: 'cascade' })
    .notNull(),
  patientId: uuid('patient_id')
    .references(() => patients.id, { onDelete: 'cascade' })
    .notNull(),
  status: varchar('status', { length: 25 }).default('PENDING').notNull(), // 'PENDING' | 'APPROVED' | 'REJECTED' | 'BYPASSED_BREAK_GLASS'
  consentedAt: timestamp('consented_at'),
  patientNotes: text('patient_notes'),
  isDisputed: boolean('is_disputed').default(false).notNull(),
  disputeReason: text('dispute_reason'),
  disputedAt: timestamp('disputed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 6B. HOSPITAL CLEARANCES (Key 2: Custodial Hospital Clearance)
export const hospitalClearances = pgTable('hospital_clearances', {
  id: uuid('id').primaryKey().defaultRandom(),
  requestId: uuid('request_id')
    .references(() => accessRequests.id, { onDelete: 'cascade' })
    .notNull(),
  targetHospitalId: uuid('target_hospital_id')
    .references(() => hospitals.id, { onDelete: 'cascade' })
    .notNull(),
  status: varchar('status', { length: 20 }).default('PENDING').notNull(), // 'PENDING' | 'APPROVED' | 'REJECTED'
  reviewedByEmail: text('reviewed_by_email'),
  clearedAt: timestamp('cleared_at'),
  rejectionReason: text('rejection_reason'),
  flaggedForHostReview: boolean('flagged_for_host_review').default(false).notNull(),
  hostReviewNotes: text('host_review_notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const accessRequestsRelations = relations(accessRequests, ({ one }) => ({
  patient: one(patients, {
    fields: [accessRequests.patientId],
    references: [patients.id],
  }),
  requestingDoctor: one(doctors, {
    fields: [accessRequests.requestingDoctorId],
    references: [doctors.id],
  }),
  requestingHospital: one(hospitals, {
    fields: [accessRequests.requestingHospitalId],
    references: [hospitals.id],
    relationName: 'requestingHospital',
  }),
  targetHospital: one(hospitals, {
    fields: [accessRequests.targetHospitalId],
    references: [hospitals.id],
    relationName: 'targetHospital',
  }),
  patientConsent: one(patientConsents, {
    fields: [accessRequests.id],
    references: [patientConsents.requestId],
  }),
  hospitalClearance: one(hospitalClearances, {
    fields: [accessRequests.id],
    references: [hospitalClearances.requestId],
  }),
}));

export const patientConsentsRelations = relations(patientConsents, ({ one }) => ({
  request: one(accessRequests, {
    fields: [patientConsents.requestId],
    references: [accessRequests.id],
  }),
  patient: one(patients, {
    fields: [patientConsents.patientId],
    references: [patients.id],
  }),
}));

export const hospitalClearancesRelations = relations(hospitalClearances, ({ one }) => ({
  request: one(accessRequests, {
    fields: [hospitalClearances.requestId],
    references: [accessRequests.id],
  }),
  targetHospital: one(hospitals, {
    fields: [hospitalClearances.targetHospitalId],
    references: [hospitals.id],
  }),
}));

// Backward compatibility relations export
export const accessGrantsRelations = accessRequestsRelations;

// 7. CLINICAL EMBEDDINGS (pgvector store for RAG)
export const clinicalEmbeddings = pgTable('clinical_embeddings', {
  id: uuid('id').primaryKey().defaultRandom(),
  patientId: uuid('patient_id')
    .references(() => patients.id, { onDelete: 'cascade' })
    .notNull(),
  hospitalId: uuid('hospital_id')
    .references(() => hospitals.id, { onDelete: 'cascade' })
    .notNull(),
  encounterId: uuid('encounter_id').references(() => encounters.id, { onDelete: 'cascade' }),
  chunkText: text('chunk_text').notNull(),
  embedding: vector('embedding', { dimensions: 768 }), // 768 dimensions for Gemini text-embedding-004
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const clinicalEmbeddingsRelations = relations(clinicalEmbeddings, ({ one }) => ({
  patient: one(patients, {
    fields: [clinicalEmbeddings.patientId],
    references: [patients.id],
  }),
  hospital: one(hospitals, {
    fields: [clinicalEmbeddings.hospitalId],
    references: [hospitals.id],
  }),
  encounter: one(encounters, {
    fields: [clinicalEmbeddings.encounterId],
    references: [encounters.id],
  }),
}));

// 8. SYSTEM ADMINS (Platform-level superuser)
export const systemAdmins = pgTable('system_admins', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  email: text('email').unique().notNull(),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
