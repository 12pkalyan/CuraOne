export type UserRole = 'SYSTEM_ADMIN' | 'HOSPITAL' | 'DOCTOR' | 'PATIENT';

export interface AuthUserPayload {
  id: string;
  email: string;
  role: UserRole;
  name: string;
  hospitalId?: string | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUserPayload;
    }
  }
}
