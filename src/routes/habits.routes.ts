import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { prisma } from "../prisma.js";
import { habitAuthorize } from "../middleware/authorize.js";
import { HabitSchema } from "../schemas/habit.schema.js";


const router = Router();

router.post('/', authenticate, async (req, res, next) => {
  try {
    const parse = HabitSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(422).json({
        errors: parse.error.issues.map(i => i.message)
      });
    }

    const newHabit = await prisma.habit.create({
      data: {
        name: parse.data.name,
        userId: req.userId
      },
      select: {
        id: true,
        name: true,
        createdAt: true,
        public: true
      }
    });
    res.status(201).json({ habit: newHabit});
  } catch (err) {
    next(err);
  }
});

// get own habit list
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