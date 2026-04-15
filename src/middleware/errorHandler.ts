import type { Request, Response, NextFunction } from "express";
import { Prisma } from '../generated/prisma/client.js';
import jwt from "jsonwebtoken";
import {z, ZodError} from "zod";

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    const msg = (err.meta as any)?.driverAdapterError.cause.originalMessage;

    if (err.code === 'P2002') {
      if (msg.includes('user_email_unique')) {
        return res.status(409).json({ error: 'Email already exists.' });
      }
      if (msg.includes('habit_log_per_day')) {
        return res.status(409).json({ error: 'You have already logged this habit today.' });
      }

      return res.status(409).json({ error: 'Conflict'});
    }
    if (err.code === 'P2003') {
      return res.status(404).json({ error: "Not Found" });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Not Found' });
    }
  }
  if (err instanceof jwt.TokenExpiredError) {
    return res.status(401).json({ code: 'TOKEN_EXPIRED', message: 'Token expired' });
  }
  if (err instanceof jwt.NotBeforeError) {
    return res.status(401).json({ code: 'NOT_BEFORE', message: 'Token not active yet' });
  }
  if (err instanceof jwt.JsonWebTokenError) {
    return res.status(401).json({ code: 'JWT_MALFORMED', message: 'Invalid token' });
  }

  if (err instanceof ZodError) {
    return res.status(422).json({
      errors: err.issues.map(i => ({
        field: i.path.length ? i.path.join('.') : null,
        message: i.message,
        code: i.code
      })),
    });
  }
  res.status(500).json({ error: 'Internal Server Error' });
}
