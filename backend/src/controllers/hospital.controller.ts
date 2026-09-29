import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as hospitalService from '../services/hospital.service';

const createDoctorSchema = z.object({
  name: z.string().min(1, 'Doctor name is required'),
  email: z.email('Please provide a valid doctor email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  specialty: z.string().optional(),
  gender: z.string().optional(),
});

export async function createDoctor(req: Request, res: Response, next: NextFunction) {
  try {
    const validatedData = createDoctorSchema.parse(req.body);
    // Hospital Admin's user ID is their hospital ID
    const hospitalId = req.user!.id;

    const doctor = await hospitalService.createDoctor(hospitalId, validatedData);

    res.status(201).json({
      message: 'Doctor created successfully and provisioned to hospital',
      doctor,
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

export async function listDoctors(req: Request, res: Response, next: NextFunction) {
  try {
    const hospitalId = req.user!.id;
    const doctors = await hospitalService.listDoctorsByHospital(hospitalId);

    res.json({
      count: doctors.length,
      doctors,
    });
  } catch (error) {
    next(error);
  }
}

export async function getHospitals(req: Request, res: Response, next: NextFunction) {
  try {
    const search = req.query.search as string | undefined;
    const hospitals = await hospitalService.getHospitalsDirectory(search);

    res.json({
      count: hospitals.length,
      hospitals,
    });
  } catch (error) {
    next(error);
  }
}
