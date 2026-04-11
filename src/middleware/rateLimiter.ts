import rateLimit from "express-rate-limit";

export const loginLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 5,
  message: { error: 'Too many requests' }
});

export const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  message: { error: 'Too many requests' }
});