import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.error('Unhandled server error:', err);

  if (err instanceof ZodError) {
    const issues = err.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));
    return res.status(400).json({
      error: 'Validation Error',
      message: issues.map((i) => i.message).join(', '),
      issues,
    });
  }

  const statusCode = err.statusCode || 500;
  const statusName =
    statusCode === 400
      ? 'BadRequest'
      : statusCode === 401
      ? 'Unauthorized'
      : statusCode === 403
      ? 'Forbidden'
      : statusCode === 404
      ? 'NotFound'
      : statusCode === 409
      ? 'Conflict'
      : 'InternalServerError';

  res.status(statusCode).json({
    error: err.name && err.name !== 'Error' ? err.name : statusName,
    message: err.message || 'An unexpected error occurred',
  });
}
