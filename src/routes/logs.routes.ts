import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { prisma } from "../prisma.js";
import { habitAuthorize } from "../middleware/authorize.js";

const router = Router();

router.post('/:habitId', habitAuthorize, async (req, res, next) => {
  try {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const habitLog = await prisma.habitLog.create({
      data: {
        date: today,
        habitId: Number(req.params.habitId)
      }
    });

    res.status(201).json({ log: habitLog });
  } catch (err) {
    next(err);
  }
});

export default router;