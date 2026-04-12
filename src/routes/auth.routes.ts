import { prisma } from "../prisma.js";
import { Router } from "express";
import argon2 from "argon2";
import type { User } from "../types/types.js";
import jwt from "jsonwebtoken";
import { UserSchema, LoginSchema } from "../schemas/user.schema.js";
import { Prisma } from '../generated/prisma/client.js';
import { sendWelcomeEmail } from "../mail.js";
import { loginLimiter, registerLimiter } from "../middleware/rateLimiter.js";

const router = Router();

/**
 * @openapi
 * /auth/register:
 *   post:
 *     summary: Register user in DB
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
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: Creates a new account
 *       409:
 *         description: Email already in use
 *       422:
 *         description: Body parse failed
 *       429:
 *         description: Too many requests
 */
router.post('/register', registerLimiter, async (req, res, next) => {
  try {
    const parse = UserSchema.parse(req.body);

    const hashedPassword = await argon2.hash(parse.password);

    const newUser = await prisma.user.create({
      data: {
        name: parse.name,
        email: parse.email,
        password: hashedPassword
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true
      }
    });

    await sendWelcomeEmail(newUser.email, newUser.name);

    res.status(201).json({ received: newUser });
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /auth/login:
 *   post:
 *     summary: Login user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Returns access token
 *       400:
 *         description: Wrong email or password
 *       422:
 *         description: Body parse failed
 *       429:
 *         description: Too many requests
 */
router.post('/login', loginLimiter, async (req, res, next) => {
  try {
    const parse = LoginSchema.parse(req.body);

    const user: User | null = await prisma.user.findUnique({ where: { email: parse.email }});

    if (user === null || !(await argon2.verify(user.password, parse.password))) {
      return res.status(400).json({ error: 'Wrong email or password' });
    }

    const accessToken = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET!,
      { expiresIn: '15m' }
    );
    const refreshToken = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: expiresAt
      }
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.status(200).json({ accessToken: accessToken });
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /auth/refresh:
 *   post:
 *     summary: Refresh access token using refresh token cookie
 *
 *     responses:
 *       200:
 *         description: New access token generated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 *
 *       401:
 *         description: Invalid or expired refresh token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: string
 *                   example: UNAUTHORIZED
 *                 message:
 *                   type: string
 */
router.post('/refresh', async (req, res, next) => {
  try {
    const cookieRefreshToken = req.cookies.refreshToken;

    if (!cookieRefreshToken) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const payload = jwt.verify(cookieRefreshToken, process.env.JWT_SECRET!) as { userId: number };

    const refreshToken = await prisma.refreshToken.findUnique({
      where: {
        token: cookieRefreshToken
      },
    })

    if (refreshToken === null) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (refreshToken.expiresAt < new Date()) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const accessToken = jwt.sign(
      { userId: payload.userId },
      process.env.JWT_SECRET!,
      { expiresIn: '15m'}
    );

    res.status(200).json({ accessToken: accessToken });
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     summary: Logout user and delete refresh token
 *
 *     responses:
 *       204:
 *         description: Successfully logged out
 *
 *       401:
 *         description: Refresh token is missing or invalid
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: string
 *                   example: UNAUTHORIZED
 *                 message:
 *                   type: string
 *
 *       500:
 *         description: Internal server error
 */
router.post('/logout', async (req, res, next) => {
  try {
    const cookieRefreshToken = req.cookies.refreshToken;

    if (!cookieRefreshToken) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    await prisma.refreshToken.deleteMany({
      where: {
        token: cookieRefreshToken
      }
    });
    res.clearCookie('refreshToken');

    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;