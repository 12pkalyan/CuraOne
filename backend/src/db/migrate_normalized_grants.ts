import { sql } from 'drizzle-orm';
import { db, pool } from './index';

async function migrate() {
  console.log('🔄 Executing Normalized Dual-Key Access Grants migration...');

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "access_requests" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "patient_id" uuid NOT NULL REFERENCES "patients"("id") ON DELETE CASCADE,
      "requesting_doctor_id" uuid NOT NULL REFERENCES "doctors"("id") ON DELETE CASCADE,
      "requesting_hospital_id" uuid NOT NULL REFERENCES "hospitals"("id") ON DELETE CASCADE,
      "target_hospital_id" uuid NOT NULL REFERENCES "hospitals"("id") ON DELETE CASCADE,
      "purpose" text NOT NULL,
      "status" varchar(20) DEFAULT 'PENDING' NOT NULL,
      "is_break_glass" boolean DEFAULT false NOT NULL,
      "break_glass_attestation" text,
      "created_at" timestamp DEFAULT now() NOT NULL,
      "expires_at" timestamp,
      "revoked_at" timestamp
    );
  `);
  console.log('✅ Table "access_requests" created or verified.');

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "patient_consents" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "request_id" uuid NOT NULL REFERENCES "access_requests"("id") ON DELETE CASCADE,
      "patient_id" uuid NOT NULL REFERENCES "patients"("id") ON DELETE CASCADE,
      "status" varchar(25) DEFAULT 'PENDING' NOT NULL,
      "consented_at" timestamp,
      "patient_notes" text,
      "is_disputed" boolean DEFAULT false NOT NULL,
      "dispute_reason" text,
      "disputed_at" timestamp,
      "created_at" timestamp DEFAULT now() NOT NULL
    );
  `);
  console.log('✅ Table "patient_consents" created or verified.');

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "hospital_clearances" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "request_id" uuid NOT NULL REFERENCES "access_requests"("id") ON DELETE CASCADE,
      "target_hospital_id" uuid NOT NULL REFERENCES "hospitals"("id") ON DELETE CASCADE,
      "status" varchar(20) DEFAULT 'PENDING' NOT NULL,
      "reviewed_by_email" text,
      "cleared_at" timestamp,
      "rejection_reason" text,
      "flagged_for_host_review" boolean DEFAULT false NOT NULL,
      "host_review_notes" text,
      "created_at" timestamp DEFAULT now() NOT NULL
    );
  `);
  console.log('✅ Table "hospital_clearances" created or verified.');

  await db.execute(sql`DROP TABLE IF EXISTS "access_grants" CASCADE;`);
  console.log('✅ Legacy table "access_grants" dropped.');

  console.log('🎉 Migration completed successfully!');
}

migrate()
  .catch((err) => {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
