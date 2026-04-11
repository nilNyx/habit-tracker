import type { Request, Response, NextFunction } from "express";
import { Prisma } from '../generated/prisma/client.js';
import jwt from "jsonwebtoken";

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.error(err)
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    const target = err.meta?.target;

    if (err.code === 'P2025') {
      return res.status(404).json({error: 'Not Found'});
    }
    if (err.code === 'P2002') {
      if (
        Array.isArray(target) &&
        target.includes('habitId') &&
        target.includes('date')
      ) {
        return res.status(409).json({
          error: 'You have already logged this habit today'
        });
      }

      return res.status(409).json({ error: 'Conflict'});
    }
    if (err.code === 'P2003') {
      return res.status(404).json({ error: "Not Found" });
    }
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ error: 'TOKEN_EXPIRED' });
  }
  if (err.name === 'NotBeforeError') {
    return res.status(401).json({ error: 'NOT_BEFORE' });
  }
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ error: 'JWT_MALFORMED' });
  }

  res.status(500).json({ error: 'Internal Server Error' });
}