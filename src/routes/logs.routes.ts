import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { prisma } from "../prisma.js";
import { habitAuthorize } from "../middleware/authorize.js";

const router = Router();
router.use(authenticate);

/**
 * @openapi
 * /logs/{habitId}:
 *   post:
 *     summary: Refreshing access token
 *     responses:
 *       201:
 *         description: Mark habit as done
 *       401:
 *         description: JSON Web Token expired, malformed, or used before it's signed
 *       403:
 *         description: Access denied
 *       404:
 *         description: Habit not found
 *       409:
 *         description: Already marked the habit as done for today
 */
router.post('/:habitId', habitAuthorize, async (req, res, next) => {
  try {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const habitLog = await prisma.habitLog.create({
      data: {
        date: today,
        habitId: IdSchema.parse(req.params.habitId)
      }
    });

    res.status(201).json({ log: habitLog });
  } catch (err) {
    next(err);
  }
});

export default router;