import fs from 'fs';
import path from 'path';
import csvParser from 'csv-parser';
import bcrypt from 'bcryptjs';
import { sql } from 'drizzle-orm';
import { db, pool } from './index';
import {
  hospitals,
  doctors,
  patients,
  encounters,
  clinicalEvents,
  systemAdmins,
} from './schema';

// CONFIGURATION
const TARGET_PATIENT_COUNT = 69; // Easily change to 100 or any cohort size
const DATASET_DIR = path.resolve(__dirname, '../../../dataset/csv');

// Helper to stream and parse a CSV file into an array of objects
function parseCsv<T = any>(fileName: string): Promise<T[]> {
  const filePath = path.join(DATASET_DIR, fileName);
  if (!fs.existsSync(filePath)) {
    throw new Error(`CSV file not found: ${filePath}`);
  }

  return new Promise((resolve, reject) => {
    const results: T[] = [];
    fs.createReadStream(filePath)
      .pipe(csvParser())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', (err) => reject(err));
  });
}

// Helper to clean synthetic trailing numbers from Synthea names (e.g., "John123" -> "John")
function cleanName(name: string): string {
  if (!name) return '';
  return name.replace(/[0-9]/g, '').trim();
}

// Helper to batch insert records to prevent memory/payload limits
async function batchInsert<T extends Record<string, any>>(
  table: any,
  items: T[],
  batchSize = 200
) {
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    if (batch.length > 0) {
      await db.insert(table).values(batch as any);
    }
  }
}

async function runSeed() {
  console.log('🌱 Starting CuraOne database seeding...');
  console.log(`📂 Reading dataset from: ${DATASET_DIR}`);
  console.log(`🎯 Target patient cohort size: ${TARGET_PATIENT_COUNT}`);

  // Precompute single bcrypt hash for "password123" to use across synthetic users
  console.log('\n🔐 Precomputing secure bcrypt password hash for synthetic users...');
  const DEFAULT_PASSWORD_HASH = await bcrypt.hash('password123', 10);
  console.log('✅ Password hash generated ("password123").');

  // STEP 0: Clean slate (wipe previous seed data)
  console.log('\n🧹 Clearing existing database tables...');
  await db.execute(
    sql`TRUNCATE clinical_embeddings, clinical_events, hospital_clearances, patient_consents, access_requests, encounters, doctors, patients, hospitals, system_admins CASCADE;`
  );
  console.log('✅ Tables cleared successfully.');

  // STEP 1: Scout encounters to find multi-hospital patients
  console.log('\n🔍 Scouting encounters to find longitudinal multi-hospital patients...');
  const allEncounters = await parseCsv<any>('encounters.csv');
  console.log(`   Found ${allEncounters.length} total encounters in dataset.`);

  // Group encounters by patient and track unique hospitals
  const patientStats = new Map<
    string,
    { hospitals: Set<string>; count: number }
  >();

  for (const enc of allEncounters) {
    if (!enc.PATIENT || !enc.ORGANIZATION) continue;
    let stats = patientStats.get(enc.PATIENT);
    if (!stats) {
      stats = { hospitals: new Set<string>(), count: 0 };
      patientStats.set(enc.PATIENT, stats);
    }
    stats.hospitals.add(enc.ORGANIZATION);
    stats.count++;
  }

  // Filter for patients with at least 2 distinct hospitals and at least 5 encounters
  const eligiblePatients = Array.from(patientStats.entries())
    .filter(([_, stats]) => stats.hospitals.size >= 2 && stats.count >= 5)
    .sort((a, b) => {
      // Sort by number of unique hospitals descending, then by encounter count
      if (b[1].hospitals.size !== a[1].hospitals.size) {
        return b[1].hospitals.size - a[1].hospitals.size;
      }
      return b[1].count - a[1].count;
    });

  console.log(`   Identified ${eligiblePatients.length} eligible multi-hospital patients.`);

  // Select our target cohort (e.g. 69)
  const selectedCohortIds = new Set(
    eligiblePatients.slice(0, TARGET_PATIENT_COUNT).map(([id]) => id)
  );

  console.log(`⭐ Selected top ${selectedCohortIds.size} patients for the research cohort.`);

  // STEP 2: Filter encounters and collect relevant Hospitals & Doctors
  const cohortEncounters = allEncounters.filter((enc) =>
    selectedCohortIds.has(enc.PATIENT)
  );

  const relevantHospitalIds = new Set<string>();
  const relevantDoctorIds = new Set<string>();

  for (const enc of cohortEncounters) {
    if (enc.ORGANIZATION) relevantHospitalIds.add(enc.ORGANIZATION);
    if (enc.PROVIDER) relevantDoctorIds.add(enc.PROVIDER);
  }

  // STEP 3: Ingest Hospitals
  console.log('\n🏥 Ingesting Hospitals (organizations.csv)...');
  const allOrgs = await parseCsv<any>('organizations.csv');
  const hospitalRows = allOrgs
    .filter((org) => relevantHospitalIds.has(org.Id))
    .map((org) => {
      const shortId = org.Id.slice(0, 4);
      return {
        id: org.Id,
        name: org.NAME,
        city: org.CITY || null,
        state: org.STATE || null,
        phone: org.PHONE || null,
        adminEmail: `admin.${shortId}@hospital.curaone.health`,
        passwordHash: DEFAULT_PASSWORD_HASH,
      };
    });

  await batchInsert(hospitals, hospitalRows);
  const validHospitalIds = new Set(hospitalRows.map((h) => h.id));
  console.log(`✅ Ingested ${hospitalRows.length} hospitals.`);

  // STEP 4: Ingest Doctors
  console.log('\n👨‍⚕️ Ingesting Doctors (providers.csv)...');
  const allProviders = await parseCsv<any>('providers.csv');
  const seenDoctorIds = new Set<string>();
  const doctorRows = [];

  for (let index = 0; index < allProviders.length; index++) {
    const prov = allProviders[index];
    if (
      !relevantDoctorIds.has(prov.Id) ||
      !validHospitalIds.has(prov.ORGANIZATION) ||
      seenDoctorIds.has(prov.Id)
    ) {
      continue;
    }

    seenDoctorIds.add(prov.Id);
    const cleanedName = cleanName(prov.NAME) || `Doctor ${index + 1}`;
    const emailName = cleanedName.toLowerCase().replace(/[^a-z0-9]/g, '.');
    const uniqueSuffix = prov.Id.slice(0, 4);

    doctorRows.push({
      id: prov.Id,
      hospitalId: prov.ORGANIZATION,
      name: `Dr. ${cleanedName}`,
      specialty: prov.SPECIALITY || 'General Practice',
      gender: prov.GENDER || null,
      email: `${emailName}.${uniqueSuffix}@curaone.health`,
      passwordHash: DEFAULT_PASSWORD_HASH,
    });
  }

  await batchInsert(doctors, doctorRows);
  const validDoctorIds = new Set(doctorRows.map((d) => d.id));
  console.log(`✅ Ingested ${doctorRows.length} doctors.`);

  // STEP 5: Ingest Patients
  console.log('\n🧑‍🤝‍🧑 Ingesting Patients (patients.csv)...');
  const allPatients = await parseCsv<any>('patients.csv');
  const seenPatientIds = new Set<string>();
  const patientRows = [];

  for (const pat of allPatients) {
    if (!selectedCohortIds.has(pat.Id) || seenPatientIds.has(pat.Id)) continue;
    seenPatientIds.add(pat.Id);

    const first = cleanName(pat.FIRST) || 'Patient';
    const last = cleanName(pat.LAST) || 'User';
    const uniqueSuffix = pat.Id.slice(0, 4);
    const email = `${first.toLowerCase()}.${last.toLowerCase()}.${uniqueSuffix}@patient.curaone.health`;

    patientRows.push({
      id: pat.Id,
      firstName: first,
      lastName: last,
      birthdate: pat.BIRTHDATE || null,
      gender: pat.GENDER || null,
      city: pat.CITY || null,
      state: pat.STATE || null,
      email: email,
      passwordHash: DEFAULT_PASSWORD_HASH,
    });
  }

  await batchInsert(patients, patientRows);
  console.log(`✅ Ingested ${patientRows.length} cohort patients.`);

  // STEP 6: Ingest Encounters
  console.log('\n📋 Ingesting Encounters (encounters.csv)...');
  const seenEncounterIds = new Set<string>();
  const encounterRows = [];

  for (const enc of cohortEncounters) {
    if (!validHospitalIds.has(enc.ORGANIZATION) || seenEncounterIds.has(enc.Id)) continue;
    seenEncounterIds.add(enc.Id);

    encounterRows.push({
      id: enc.Id,
      patientId: enc.PATIENT,
      hospitalId: enc.ORGANIZATION,
      doctorId: validDoctorIds.has(enc.PROVIDER) ? enc.PROVIDER : null,
      startDate: new Date(enc.START),
      endDate: enc.STOP ? new Date(enc.STOP) : null,
      encounterClass: enc.ENCOUNTERCLASS || null,
      description: enc.DESCRIPTION || null,
      reasonDescription: enc.REASONDESCRIPTION || null,
    });
  }

  await batchInsert(encounters, encounterRows);
  const validEncounterMap = new Map<string, string>(); // encounterId -> hospitalId
  for (const row of encounterRows) {
    validEncounterMap.set(row.id, row.hospitalId);
  }
  console.log(`✅ Ingested ${encounterRows.length} clinical encounters.`);

  // STEP 7: Ingest Unified Clinical Events (6 CSV files)
  console.log('\n🩺 Ingesting Unified Clinical Events...');

  const clinicalFiles = [
    { name: 'conditions.csv', type: 'CONDITION' },
    { name: 'medications.csv', type: 'MEDICATION' },
    { name: 'allergies.csv', type: 'ALLERGY' },
    { name: 'procedures.csv', type: 'PROCEDURE' },
    { name: 'careplans.csv', type: 'CAREPLAN' },
    { name: 'immunizations.csv', type: 'IMMUNIZATION' },
  ];

  let totalEvents = 0;

  for (const file of clinicalFiles) {
    const rawEvents = await parseCsv<any>(file.name);
    const eventRows = [];

    for (const row of rawEvents) {
      if (!selectedCohortIds.has(row.PATIENT)) continue;
      const encounterId = row.ENCOUNTER;
      const hospitalId = validEncounterMap.get(encounterId);

      // Only insert if encounter exists in our cohort encounters
      if (encounterId && hospitalId) {
        const startDateStr = row.START || row.DATE;
        eventRows.push({
          encounterId: encounterId,
          patientId: row.PATIENT,
          hospitalId: hospitalId,
          eventType: file.type,
          code: row.CODE || null,
          description: row.DESCRIPTION,
          reasonDescription: row.REASONDESCRIPTION || null,
          startDate: startDateStr ? new Date(startDateStr) : null,
          endDate: row.STOP ? new Date(row.STOP) : null,
        });
      }
    }

    if (eventRows.length > 0) {
      await batchInsert(clinicalEvents, eventRows);
      totalEvents += eventRows.length;
      console.log(`   ✔ ${file.type.padEnd(12)} : ${eventRows.length} records`);
    }
  }

  console.log(`✅ Total Clinical Events Ingested: ${totalEvents}`);

  // STEP 8: Ingest Default Platform System Admin
  console.log('\n👑 Ingesting Default Platform System Admin...');
  await db.insert(systemAdmins).values({
    name: 'CuraOne Platform Admin',
    email: 'admin@curaone.health',
    passwordHash: DEFAULT_PASSWORD_HASH,
  });
  console.log('✅ System Admin created: admin@curaone.health');

  // SUMMARY REPORT
  console.log('\n=========================================');
  console.log('🎉 SEEDING COMPLETE! DATABASE SUMMARY:');
  console.log(`   System Admins   : 1 (admin@curaone.health)`);
  console.log(`   Hospitals       : ${hospitalRows.length} (with admin logins)`);
  console.log(`   Doctors         : ${doctorRows.length}`);
  console.log(`   Patients        : ${patientRows.length}`);
  console.log(`   Encounters      : ${encounterRows.length}`);
  console.log(`   Clinical Events : ${totalEvents}`);
  console.log(`   All Passwords   : "password123" (bcrypt hashed)`);
  console.log('=========================================\n');
}

runSeed()
  .catch((err) => {
    console.error('❌ Seeding failed with error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
