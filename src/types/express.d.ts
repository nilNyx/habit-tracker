declare global {
  namespace Express {
    interface Request {
      userId: number;
      habitId: number
    }
  }
}

export {};