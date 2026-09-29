import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../db';
import { systemAdmins, hospitals, doctors, patients } from '../db/schema';
import { AuthUserPayload, UserRole } from '../types/auth.types';

const JWT_SECRET = process.env.JWT_SECRET || 'curaone-default-dev-secret-key-2026';
const JWT_EXPIRES_IN = '7d';

// Helper to check if an email is already taken across ANY of the 4 roles
export async function isEmailTaken(emailInput: string): Promise<boolean> {
  const email = emailInput.trim().toLowerCase();

  const [admin] = await db.select({ id: systemAdmins.id }).from(systemAdmins).where(eq(systemAdmins.email, email)).limit(1);
  if (admin) return true;

  const [hosp] = await db.select({ id: hospitals.id }).from(hospitals).where(eq(hospitals.adminEmail, email)).limit(1);
  if (hosp) return true;

  const [doc] = await db.select({ id: doctors.id }).from(doctors).where(eq(doctors.email, email)).limit(1);
  if (doc) return true;

  const [pat] = await db.select({ id: patients.id }).from(patients).where(eq(patients.email, email)).limit(1);
  if (pat) return true;

  return false;
}

export async function registerPatient(data: {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  birthdate?: string;
  gender?: string;
  city?: string;
  state?: string;
}) {
  const email = data.email.trim().toLowerCase();

  if (await isEmailTaken(email)) {
    const error: any = new Error('Email address is already in use');
    error.statusCode = 409;
    throw error;
  }

  const passwordHash = await bcrypt.hash(data.password, 10);

  const [newPatient] = await db
    .insert(patients)
    .values({
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
      email,
      passwordHash,
      birthdate: data.birthdate || null,
      gender: data.gender || null,
      city: data.city || null,
      state: data.state || null,
    })
    .returning();

  const payload: AuthUserPayload = {
    id: newPatient.id,
    email: newPatient.email!,
    role: 'PATIENT',
    name: `${newPatient.firstName} ${newPatient.lastName}`,
    hospitalId: null,
  };

  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

  return { token, user: payload };
}

export async function loginUser(emailInput: string, passwordInput: string) {
  const email = emailInput.trim().toLowerCase();

  let matchedUser: {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    passwordHash: string | null;
    hospitalId?: string | null;
  } | null = null;

  // 1. Check System Admins
  const [admin] = await db
    .select()
    .from(systemAdmins)
    .where(eq(systemAdmins.email, email))
    .limit(1);

  if (admin) {
    matchedUser = {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: 'SYSTEM_ADMIN',
      passwordHash: admin.passwordHash,
    };
  }

  // 2. Check Hospitals (Hospital Admin login)
  if (!matchedUser) {
    const [hospital] = await db
      .select()
      .from(hospitals)
      .where(eq(hospitals.adminEmail, email))
      .limit(1);

    if (hospital) {
      matchedUser = {
        id: hospital.id,
        email: hospital.adminEmail!,
        name: hospital.name,
        role: 'HOSPITAL',
        passwordHash: hospital.passwordHash,
        hospitalId: hospital.id,
      };
    }
  }

  // 3. Check Doctors
  if (!matchedUser) {
    const [doctor] = await db
      .select()
      .from(doctors)
      .where(eq(doctors.email, email))
      .limit(1);

    if (doctor) {
      matchedUser = {
        id: doctor.id,
        email: doctor.email!,
        name: doctor.name,
        role: 'DOCTOR',
        passwordHash: doctor.passwordHash,
        hospitalId: doctor.hospitalId,
      };
    }
  }

  // 4. Check Patients
  if (!matchedUser) {
    const [patient] = await db
      .select()
      .from(patients)
      .where(eq(patients.email, email))
      .limit(1);

    if (patient) {
      matchedUser = {
        id: patient.id,
        email: patient.email!,
        name: `${patient.firstName} ${patient.lastName}`,
        role: 'PATIENT',
        passwordHash: patient.passwordHash,
      };
    }
  }

  // If no user found in any of the 4 tables
  if (!matchedUser || !matchedUser.passwordHash) {
    const error: any = new Error('Invalid email or password');
    error.statusCode = 401;
    throw error;
  }

  // Verify password with bcrypt
  const isMatch = await bcrypt.compare(passwordInput, matchedUser.passwordHash);
  if (!isMatch) {
    const error: any = new Error('Invalid email or password');
    error.statusCode = 401;
    throw error;
  }

  // Generate JWT token
  const payload: AuthUserPayload = {
    id: matchedUser.id,
    email: matchedUser.email,
    role: matchedUser.role,
    name: matchedUser.name,
    hospitalId: matchedUser.hospitalId || null,
  };

  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

  return {
    token,
    user: payload,
  };
}

export async function getUserProfile(user: AuthUserPayload) {
  if (user.role === 'DOCTOR') {
    const [doc] = await db
      .select({
        id: doctors.id,
        name: doctors.name,
        specialty: doctors.specialty,
        email: doctors.email,
        hospitalId: doctors.hospitalId,
        hospitalName: hospitals.name,
      })
      .from(doctors)
      .leftJoin(hospitals, eq(doctors.hospitalId, hospitals.id))
      .where(eq(doctors.id, user.id))
      .limit(1);

    return { ...user, details: doc };
  }

  if (user.role === 'PATIENT') {
    const [pat] = await db
      .select({
        id: patients.id,
        firstName: patients.firstName,
        lastName: patients.lastName,
        birthdate: patients.birthdate,
        gender: patients.gender,
        city: patients.city,
        state: patients.state,
        email: patients.email,
      })
      .from(patients)
      .where(eq(patients.id, user.id))
      .limit(1);

    return { ...user, details: pat };
  }

  if (user.role === 'HOSPITAL') {
    const [hosp] = await db
      .select()
      .from(hospitals)
      .where(eq(hospitals.id, user.id))
      .limit(1);

    return { ...user, details: hosp };
  }

  // System Admin
  return { ...user, details: { name: user.name, email: user.email } };
}
