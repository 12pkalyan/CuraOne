export type Role = 'SYSTEM_ADMIN' | 'HOSPITAL' | 'DOCTOR' | 'PATIENT';

export interface User {
  id: string;
  email: string;
  role: Role;
  name: string;
  hospitalId?: string | null;
  details?: Record<string, any>;
}

export interface AuthResponse {
  message: string;
  token: string;
  user: User;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterPatientDto {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  birthdate?: string;
  gender?: string;
  city?: string;
  state?: string;
}
