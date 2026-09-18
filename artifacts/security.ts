import type { Request, Response, NextFunction } from 'express';

/**
 * Middleware to prevent XSS attacks by sanitizing user input
 */
export function sanitizeInput(req: Request, res: Response, next: NextFunction): void {
  const sanitizeString = (str: string): string => {
    if (typeof str !== 'string') return str;
    return str
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+=/gi, ''); // Remove event handlers
  };

  const sanitizeObject = (obj: any): any => {
    if (typeof obj === 'string') {
      return sanitizeString(obj);
    }
    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    }
    if (obj && typeof obj === 'object') {
      const sanitized: any = {};
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          sanitized[key] = sanitizeObject(obj[key]);
        }
      }
      return sanitized;
    }
    return obj;
  };

  // Sanitize request body
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }

  // Sanitize query parameters
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }

  // Sanitize URL parameters
  if (req.params) {
    req.params = sanitizeObject(req.params);
  }

  next();
}

/**
 * Middleware to prevent NoSQL injection
 */
export function preventNoSQLInjection(req: Request, res: Response, next: NextFunction): void {
  const checkForNoSQL = (obj: any): boolean => {
    if (typeof obj === 'string') {
      // Check for common NoSQL injection patterns
      const noSQLPatterns = [
        /\$where/i,
        /\$ne/i,
        /\$gt/i,
        /\$lt/i,
        /\$in/i,
        /\$or/i,
        /\$and/i,
        /\$not/i,
        /\$exists/i,
        /\$regex/i,
      ];
      return noSQLPatterns.some(pattern => pattern.test(obj));
    }
    if (Array.isArray(obj)) {
      return obj.some(checkForNoSQL);
    }
    if (obj && typeof obj === 'object') {
      return Object.values(obj).some(checkForNoSQL);
    }
    return false;
  };

  if (checkForNoSQL(req.body) || checkForNoSQL(req.query) || checkForNoSQL(req.params)) {
    res.status(400).json({ error: 'Invalid input detected' });
    return;
  }

  next();
}

/**
 * Middleware to add security headers
 */
export function addSecurityHeaders(req: Request, res: Response, next: NextFunction): void {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Enable XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Permissions policy
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  next();
}

/**
 * Middleware to validate content type
 */
export function validateContentType(allowedTypes: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const contentType = req.headers['content-type'];
    
    if (!contentType && req.method !== 'GET' && req.method !== 'DELETE') {
      res.status(415).json({ error: 'Content-Type header is required' });
      return;
    }

    if (contentType && !allowedTypes.some(type => contentType.includes(type))) {
      res.status(415).json({ 
        error: `Unsupported Media Type. Allowed types: ${allowedTypes.join(', ')}` 
      });
      return;
    }

    next();
  };
}