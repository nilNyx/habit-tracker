import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { prisma } from "../prisma.js";
import { habitAuthorize } from "../middleware/authorize.js";
import { HabitSchema } from "../schemas/habit.schema.js";


const router = Router();

/**
 * @openapi
 * /habits:
 *   post:
 *     summary: Creates a new habit in DB
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *     responses:
 *       201:
 *         description: Habit created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 habit:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       format: int32
 *                     name:
 *                       type: string
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     public:
 *                       type: boolean
 *       401:
 *         description: Invalid or expired token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: string
 *                   enum:
 *                     - TOKEN_EXPIRED
 *                     - JWT_MALFORMED
 *                     - NOT_BEFORE
 *                 message:
 *                   type: string
 *       422:
 *         description: Validation error - request body does not match schema
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       field:
 *                         type: string
 *                       message:
 *                         type: string
 *                       code:
 *                         type: string
 *                         enum:
 *                           - too_short
 *                           - too_big
 *                           - invalid_type
 *       500:
 *         description: Internal server error
 */
router.post('/', authenticate, async (req, res, next) => {
  try {
    const parse = HabitSchema.parse(req.body);

    const newHabit = await prisma.habit.create({
      data: {
        name: parse.name,
        userId: req.userId
      },
      select: {
        id: true,
        name: true,
        createdAt: true,
        public: true
      }
    });
    res.status(201).json({ habit: newHabit });
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /habits:
 *   get:
 *     summary: Shows user's habits
 *     responses:
 *       200:
 *         description: Habits shows correctly
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 habits:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         format: int32
 *                       name:
 *                         type: string
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       public:
 *                         type: boolean
 *       401:
 *         description: Invalid or expired token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: string
 *                   enum:
 *                     - TOKEN_EXPIRED
 *                     - JWT_MALFORMED
 *                     - NOT_BEFORE
 *                 message:
 *                   type: string
 *       500:
 *         description: Internal server error
 */
router.get('/', authenticate, async (req, res, next) => {
  try {
    const habits = await prisma.habit.findMany({
      select: {
        id: true,
        name: true,
        createdAt: true,
        public: true
      },
      where: { userId: req.userId }
    });

    return res.status(200).json({ habits: habits });
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /habits/public:
 *   get:
 *     summary: Get public habits with pagination and optional search
 *     parameters:
 *       - in: query
 *         name: page
 *         required: false
 *         schema:
 *           type: integer
 *           example: 1
 *         description: Page number for pagination
 *
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           example: 10
 *         description: Number of items per page
 *
 *       - in: query
 *         name: search
 *         required: false
 *         schema:
 *           type: string
 *           example: gym
 *         description: Search by habit name (case-insensitive)
 *
 *     responses:
 *       200:
 *         description: List of public habits
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 habits:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         format: int32
 *                       name:
 *                         type: string
 *                       userId:
 *                         type: string
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *
 *       500:
 *         description: Internal server error
 */
router.get('/public', async (req, res, next) => {
  try {
    const page: number = Number(req.query.page) || 1;
    const limit: number = Number(req.query.limit) || 10;
    const searchName = req.query.search ? String(req.query.search) : '';

    const habits = await prisma.habit.findMany({
      select: {
        id: true,
        name: true,
        userId: true,
        createdAt: true
      },
      where: {
        name: {
          contains: searchName,
          mode: 'insensitive'
        },
        public: true
      },
      take: limit,
      skip: (page - 1) * limit
    });

    res.status(200).json({ habits: habits });
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /habits/{habitId}:
 *   patch:
 *     summary: Update habit fields
 *     parameters:
 *       - in: path
 *         name: habitId
 *         required: true
 *         schema:
 *           type: integer
 *           format: int32
 *         description: ID of the habit to update
 *
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Habit name
 *               public:
 *                 type: boolean
 *                 description: Visibility flag
 *
 *     responses:
 *       200:
 *         description: Habit successfully updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 habit:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       format: int32
 *                     name:
 *                       type: string
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     public:
 *                       type: boolean
 *
 *       400:
 *         description: Invalid habitId or request body
 *
 *       401:
 *         description: Unauthorized (invalid or missing token)
 *
 *       403:
 *         description: Forbidden (no access to this habit)
 *
 *       404:
 *         description: Habit not found
 *
 *       500:
 *         description: Internal server error
 */
router.patch('/:habitId', authenticate, habitAuthorize, async (req, res, next) => {
  try {
    const habitId = Number(req.params.habitId);
    const body = req.body;

    const updatedHabit = await prisma.habit.update({
      where: { id: habitId },
      data: {
        name: body.name,
        public: body.public
      },
      select: {
        id: true,
        name: true,
        createdAt: true,
        public: true
      }
    });

    res.status(200).json({
      message: 'Updated',
      habit: updatedHabit
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /habits/{habitId}:
 *   delete:
 *     summary: Delete habit
 *     parameters:
 *       - in: path
 *         name: habitId
 *         required: true
 *         schema:
 *           type: integer
 *           format: int32
 *     responses:
 *       204:
 *         description: Habit deleted successfully
 *       400:
 *         description: Invalid habitId
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Habit not found
 */
router.delete('/:habitId', authenticate, habitAuthorize, async (req, res, next) => {
  try {
    const habitId: number = Number(req.params.habitId);

    await prisma.habit.delete({ where: { id: habitId }});

    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;