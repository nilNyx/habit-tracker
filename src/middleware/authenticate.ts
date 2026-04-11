import type { Request, Response, NextFunction } from 'express'
import jwt from "jsonwebtoken";

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (token === undefined) {
      return res.status(401).json({error: 'Unauthorized'});
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET!) as { userId: number };
    req.userId = payload.userId;
    next();
  } catch (err) {
    res.status(401).json({error: 'Unauthorized'});
  }
}