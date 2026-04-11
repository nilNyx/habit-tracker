import { z } from 'zod';

export const UserSchema = z.object({
  name: z.string().min(5),
  email: z.email(),
  password: z.string().regex(/^(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9]).+$/).min(8)
});

export const LoginSchema = z.object({
  email: z.email(),
  password: z.string().regex(/^(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9]).+$/).min(8)
});