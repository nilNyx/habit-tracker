import type { NextFunction, Request, Response } from "express";
import { prisma } from "../prisma.js";
import {IdSchema} from "../schemas/global.schema.js";


export const authorize = (req: Request<{id: string}>, res: Response, next: NextFunction) => {
  if (req.userId === IdSchema.parse(req.params.id)) {
    next();
    return;
  }
  res.status(403).json({ error: 'Denied' });
};

export const habitAuthorize = async (req: Request<{ habitId: string }>, res: Response, next: NextFunction) => {
  const habit = await prisma.habit.findFirst({
    where: { id: IdSchema.parse(req.params.habitId) }
  });

  if (habit === null) {
    return res.status(404).json({ error: "Not Found" });
  }

  if (habit.userId === req.userId) {
    next();
    return;
  }
  res.status(403).json({ error: "Denied" });
};