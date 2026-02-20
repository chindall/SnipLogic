import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';

export const setupRouter = Router();

// GET /api/v1/setup/status — no auth required
// Returns { configured: true } if any users exist, { configured: false } if fresh install
setupRouter.get('/status', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const count = await prisma.user.count();
    res.json({ configured: count > 0 });
  } catch (err) {
    next(err);
  }
});
