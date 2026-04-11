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
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *       - in: query
 *         name: search
 *         required: false
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Returns list of users
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

    res.status(200).json({users: users});
  } catch(err) {
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
 *     responses:
 *       200:
 *         description: Returns exact user by id
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
router.get('/:id', async (req, res, next) => {
  try {
    const idParam: number = Number(req.params.id);
    const user: User | null = await prisma.user.findUnique({ where: {id: idParam} });

    if (user) {
      return res.json({user: {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt
      }});
    }
    res.status(404).json({error: 'Not Found'});
  } catch(err) {
    next(err);
  }
});

/**
 * @openapi
 * /users/{id}:
 *   patch:
 *     summary: Updates account info
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
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
 *     responses:
 *       200:
 *         description: Updates account info
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
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

    res.status(200).json({message: 'Updated', user: {
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
 *     summary: Deletes the account
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       204:
 *         description: Deletes the account
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       500:
 *         description: Internal server error
 */
router.delete('/:id', authorize, async (req, res, next) => {
  try {
    const userId: number = Number(req.params.id);

    await prisma.user.delete({where: {id: userId}});

    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /users/{id}/avatar:
 *   post:
 *     summary: Uploading an avatar
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             properties:
 *               avatar:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Uploading the given avatar
 *       401:
 *         description: Unauthorized or file no uploaded
 *       500:
 *         description: Internal server error
 */
router.post('/:id/avatar', authorize, upload.single('avatar'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(401).json({error: 'File Not Uploaded'});
    }

    res.status(200).json({uploaded: req.file.path});
  } catch (err) {
    next(err);
  }
});

export default router;

