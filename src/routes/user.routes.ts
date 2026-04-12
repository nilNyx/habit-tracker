import { Router } from 'express';
import { prisma } from "../prisma.js";
import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";
import { upload } from "../middleware/upload.js";
import type { User } from "../types/types.js";

const router = Router();

router.use(authenticate);

/**
 * @openapi
 * /users:
 *   get:
 *     summary: List of users
 *     parameters:
 *       - in: query
 *         name: page
 *         required: false
 *         schema:
 *           type: integer
 *           example: 1
 *         description: Page number
 *
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           example: 10
 *         description: Number of users per page
 *
 *       - in: query
 *         name: search
 *         required: false
 *         schema:
 *           type: string
 *           example: john
 *         description: Search users by name
 *
 *     responses:
 *       200:
 *         description: List of users
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 users:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         format: int32
 *                       name:
 *                         type: string
 *                       email:
 *                         type: string
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *
 *       500:
 *         description: Internal server error
 */
router.get('/', async (req, res, next) => {
  try {
    const page: number = Number(req.query.page) || 1;
    const limit: number = Number(req.query.limit) || 10;
    const searchName = req.query.search ? String(req.query.search) : '';

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true
      },
      where: {
        name: {
          contains: searchName,
          mode: 'insensitive'
        },
      },
      take: limit,
      skip: (page - 1) * limit
      });

    res.status(200).json({ users: users });
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /users/{id}:
 *   get:
 *     summary: Get user by id
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           format: int32
 *         description: User ID
 *
 *     responses:
 *       200:
 *         description: User found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       format: int32
 *                     name:
 *                       type: string
 *                     email:
 *                       type: string
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: string
 *                   example: USER_NOT_FOUND
 *                 message:
 *                   type: string
 *
 *       500:
 *         description: Internal server error
 */
router.get('/:id', async (req, res, next) => {
  try {
    const idParam: number = Number(req.params.id);
    const user: User | null = await prisma.user.findUnique({ where: {id: idParam} });

    if (user) {
      return res.json({ user: {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt
      }});
    }
    res.status(404).json({ error: 'Not Found' });
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /users/{id}:
 *   patch:
 *     summary: Update user account info
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           format: int32
 *         description: User ID
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
 *               email:
 *                 type: string
 *             description: Fields to update (partial update allowed)
 *
 *     responses:
 *       200:
 *         description: User successfully updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Updated
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       format: int32
 *                     name:
 *                       type: string
 *                     email:
 *                       type: string
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *
 *       400:
 *         description: Invalid request data
 *
 *       401:
 *         description: Unauthorized
 *
 *       403:
 *         description: Access denied
 *
 *       404:
 *         description: User not found
 *
 *       500:
 *         description: Internal server error
 */
router.patch('/:id', authorize, async (req, res, next) => {
  try {
    const userId = Number(req.params.id);
    const body = req.body;

    const user = await prisma.user.update({
        where: {id: userId},
        data: {
          name: body.name,
          email: body.email
        }
      });

    res.status(200).json({ message: 'Updated', user: {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt
    }});
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /users/{id}:
 *   delete:
 *     summary: Delete user account
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           format: int32
 *         description: User ID
 *
 *     responses:
 *       204:
 *         description: User deleted successfully
 *
 *       400:
 *         description: Invalid user ID
 *
 *       401:
 *         description: Unauthorized
 *
 *       403:
 *         description: Access denied
 *
 *       404:
 *         description: User not found
 *
 *       500:
 *         description: Internal server error
 */
router.delete('/:id', authorize, async (req, res, next) => {
  try {
    const userId: number = Number(req.params.id);

    await prisma.user.delete({ where: {id: userId }});

    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /users/{id}/avatar:
 *   post:
 *     summary: Upload user avatar
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           format: int32
 *         description: User ID
 *
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - avatar
 *             properties:
 *               avatar:
 *                 type: string
 *                 format: binary
 *
 *     responses:
 *       200:
 *         description: Avatar uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 uploaded:
 *                   type: string
 *
 *       400:
 *         description: Avatar file is missing or invalid
 *
 *       401:
 *         description: Unauthorized
 *
 *       403:
 *         description: Access denied
 *
 *       404:
 *         description: User not found
 *
 *       500:
 *         description: Internal server error
 */
router.post('/:id/avatar', authorize, upload.single('avatar'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'File Not Uploaded' });
    }

    res.status(200).json({ uploaded: req.file.path });
  } catch (err) {
    next(err);
  }
});

export default router;

