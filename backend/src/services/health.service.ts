import { sql } from 'drizzle-orm';
import { db } from '../db';
import {
  hospitals,
  doctors,
  patients,
  encounters,
  clinicalEvents,
  systemAdmins,
} from '../db/schema';

// 1. Ultra-lightweight health check (Runs SELECT 1 with latency timing)
export async function checkHealth() {
  const start = Date.now();
  const dbCheck = await db.execute(sql`SELECT 1 as connected;`);
  const latencyMs = Date.now() - start;

  return {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    database: {
      status: dbCheck.rows.length > 0 ? 'connected' : 'disconnected',
      latencyMs,
    },
  };
}

// 2. Heavy lookup: only called when needed by admin or stats views
export async function getSystemStats() {
  const [hospitalsCount] = await db.select({ count: sql<number>`count(*)` }).from(hospitals);
  const [doctorsCount] = await db.select({ count: sql<number>`count(*)` }).from(doctors);
  const [patientsCount] = await db.select({ count: sql<number>`count(*)` }).from(patients);
  const [encountersCount] = await db.select({ count: sql<number>`count(*)` }).from(encounters);
  const [eventsCount] = await db.select({ count: sql<number>`count(*)` }).from(clinicalEvents);
  const [adminsCount] = await db.select({ count: sql<number>`count(*)` }).from(systemAdmins);

  return {
    timestamp: new Date().toISOString(),
    stats: {
      systemAdmins: Number(adminsCount?.count || 0),
      hospitals: Number(hospitalsCount?.count || 0),
      doctors: Number(doctorsCount?.count || 0),
      patients: Number(patientsCount?.count || 0),
      encounters: Number(encountersCount?.count || 0),
      clinicalEvents: Number(eventsCount?.count || 0),
    },
  };
}
