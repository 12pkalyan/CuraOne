import { eq, ilike, or } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { db } from '../db';
import { doctors, hospitals } from '../db/schema';
import { isEmailTaken } from './auth.service';

export async function createDoctor(
  hospitalId: string,
  data: {
    name: string;
    email: string;
    password: string;
    specialty?: string;
    gender?: string;
  }
) {
  const email = data.email.trim().toLowerCase();

  // 1. Verify email uniqueness across all tables
  if (await isEmailTaken(email)) {
    const error: any = new Error('Doctor email address is already in use');
    error.statusCode = 409;
    throw error;
  }

  // 2. Verify the hospital exists
  const [hospital] = await db
    .select({ id: hospitals.id, name: hospitals.name })
    .from(hospitals)
    .where(eq(hospitals.id, hospitalId))
    .limit(1);

  if (!hospital) {
    const error: any = new Error('Associated hospital not found');
    error.statusCode = 404;
    throw error;
  }

  // 3. Hash password
  const passwordHash = await bcrypt.hash(data.password, 10);

  // 4. Insert doctor record
  const [newDoctor] = await db
    .insert(doctors)
    .values({
      hospitalId,
      name: data.name.trim(),
      email,
      passwordHash,
      specialty: data.specialty || 'General Practice',
      gender: data.gender || null,
    })
    .returning({
      id: doctors.id,
      hospitalId: doctors.hospitalId,
      name: doctors.name,
      email: doctors.email,
      specialty: doctors.specialty,
      gender: doctors.gender,
      createdAt: doctors.createdAt,
    });

  return {
    ...newDoctor,
    hospitalName: hospital.name,
  };
}

export async function listDoctorsByHospital(hospitalId: string) {
  const results = await db
    .select({
      id: doctors.id,
      name: doctors.name,
      email: doctors.email,
      specialty: doctors.specialty,
      gender: doctors.gender,
      createdAt: doctors.createdAt,
    })
    .from(doctors)
    .where(eq(doctors.hospitalId, hospitalId))
    .orderBy(doctors.name);

  return results;
}

export async function getHospitalsDirectory(searchTerm?: string) {
  let query = db
    .select({
      id: hospitals.id,
      name: hospitals.name,
      city: hospitals.city,
      state: hospitals.state,
      phone: hospitals.phone,
    })
    .from(hospitals);

  if (searchTerm && searchTerm.trim()) {
    const term = `%${searchTerm.trim()}%`;
    return await query
      .where(or(ilike(hospitals.name, term), ilike(hospitals.city, term)))
      .limit(50);
  }

  return await query.limit(50);
}
