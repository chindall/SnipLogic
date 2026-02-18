import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';

export const workspacesRouter = Router();

// All workspace routes require authentication
workspacesRouter.use(requireAuth);

// GET /api/v1/workspaces — list workspaces the current user has access to
workspacesRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, organizationId, isGlobalAdmin } = req.user!;

    if (isGlobalAdmin) {
      // Global admins see all workspaces in their org
      const workspaces = await prisma.workspace.findMany({
        where: { organizationId },
        include: { _count: { select: { folders: true } } },
        orderBy: [{ isPersonal: 'desc' }, { name: 'asc' }],
      });
      res.json(workspaces);
      return;
    }

    // Regular users see: their personal workspace + workspaces they have a role in
    const workspaces = await prisma.workspace.findMany({
      where: {
        organizationId,
        OR: [
          { ownerId: userId },   // personal workspace
          { workspaceRoles: { some: { userId } } },
        ],
      },
      include: { _count: { select: { folders: true } } },
      orderBy: [{ isPersonal: 'desc' }, { name: 'asc' }],
    });
    res.json(workspaces);
  } catch (err) {
    next(err);
  }
});
