import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth, requireGlobalAdmin } from '../middleware/auth';

export const usersRouter = Router();
usersRouter.use(requireAuth);

// GET /api/v1/users — global admin only, lists all users in org
usersRouter.get('/', requireGlobalAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const users = await prisma.user.findMany({
      where: { organizationId: req.user!.organizationId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isGlobalAdmin: true,
        createdAt: true,
        workspaceRoles: { include: { workspace: { select: { id: true, name: true } } } },
      },
      orderBy: { lastName: 'asc' },
    });
    res.json(users);
  } catch (err) {
    next(err);
  }
});
