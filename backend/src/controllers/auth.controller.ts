import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as authService from '../services/auth.service';

const loginSchema = z.object({
  email: z.email('Please provide a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

const registerSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.email('Please provide a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  birthdate: z.string().optional(),
  gender: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
});

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const validatedData = registerSchema.parse(req.body);
    const result = await authService.registerPatient(validatedData);

    res.status(201).json({
      message: 'Registration successful',
      ...result,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      const issues = error.issues.map((issue: any) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      return res.status(400).json({
        error: 'Validation Error',
        message: issues.map((i) => i.message).join(', '),
        issues,
      });
    }
    next(error);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const validatedData = loginSchema.parse(req.body);
    const result = await authService.loginUser(
      validatedData.email,
      validatedData.password
    );

    res.json({
      message: 'Login successful',
      ...result,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      const issues = error.issues.map((issue: any) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      return res.status(400).json({
        error: 'Validation Error',
        message: issues.map((i) => i.message).join(', '),
        issues,
      });
    }
    next(error);
  }
}

export async function getMe(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const profile = await authService.getUserProfile(req.user);
    res.json(profile);
  } catch (error) {
    next(error);
  }
}
