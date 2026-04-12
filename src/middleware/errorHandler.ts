import type { Request, Response, NextFunction } from "express";
import { Prisma } from '../generated/prisma/client.js';
import jwt from "jsonwebtoken";

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    const msg = (err.meta as any)?.driverAdapterError.cause.originalMessage;

    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Not Found' });
    }
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
  }
  if (err instanceof jwt.TokenExpiredError) {
    return res.status(401).json({ error: 'TOKEN_EXPIRED' });
  }
  if (err instanceof jwt.NotBeforeError) {
    return res.status(401).json({ error: 'NOT_BEFORE' });
  }
  if (err instanceof jwt.JsonWebTokenError) {
    return res.status(401).json({ error: 'JWT_MALFORMED' });
  }

  res.status(500).json({ error: 'Internal Server Error' });
}