import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as adminService from '../services/admin.service';

const createHospitalSchema = z.object({
  name: z.string().min(1, 'Hospital name is required'),
  adminEmail: z.email('Please provide a valid admin email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  city: z.string().optional(),
  state: z.string().optional(),
  phone: z.string().optional(),
});

export async function createHospital(req: Request, res: Response, next: NextFunction) {
  try {
    const validatedData = createHospitalSchema.parse(req.body);
    const hospital = await adminService.createHospital(validatedData);

    res.status(201).json({
      message: 'Hospital created successfully',
      hospital,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation Error',
        issues: error.issues.map((issue: any) => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
      });
    }
    next(error);
  }
}

export async function listHospitals(req: Request, res: Response, next: NextFunction) {
  try {
    const hospitals = await adminService.listHospitals();
    res.json({
      count: hospitals.length,
      hospitals,
    });
  } catch (error) {
    next(error);
  }
}
