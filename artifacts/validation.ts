import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

/**
 * Middleware to validate request body against a Zod schema
 */
export function validateBody<T>(schema: z.ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const result = schema.safeParse(req.body);
      if (!result.success) {
        res.status(400).json({
          error: 'Validation failed',
          details: result.error.errors,
        });
        return;
      }
      req.body = result.data;
      next();
    } catch (error) {
      res.status(400).json({ error: 'Invalid request body' });
    }
  };
}

/**
 * Middleware to validate request query parameters against a Zod schema
 */
export function validateQuery<T>(schema: z.ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const result = schema.safeParse(req.query);
      if (!result.success) {
        res.status(400).json({
          error: 'Validation failed',
          details: result.error.errors,
        });
        return;
      }
      req.query = result.data as any;
      next();
    } catch (error) {
      res.status(400).json({ error: 'Invalid query parameters' });
    }
  };
}

/**
 * Middleware to validate request parameters against a Zod schema
 */
export function validateParams<T>(schema: z.ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const result = schema.safeParse(req.params);
      if (!result.success) {
        res.status(400).json({
          error: 'Validation failed',
          details: result.error.errors,
        });
        return;
      }
      req.params = result.data as any;
      next();
    } catch (error) {
      res.status(400).json({ error: 'Invalid request parameters' });
    }
  };
}

/**
 * Common validation schemas
 */
export const uuidSchema = z.string().uuid('Invalid UUID format');
export const emailSchema = z.string().email('Invalid email format');
export const positiveNumberSchema = z.number().positive('Must be a positive number');

export const paginationSchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
});

export const sortSchema = z.object({
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export {};