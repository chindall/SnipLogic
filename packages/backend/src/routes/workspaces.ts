import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';

export const workspacesRouter = Router();
workspacesRouter.use(requireAuth);

// GET /api/v1/workspaces — list workspaces the current user has access to
workspacesRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, organizationId, isGlobalAdmin } = req.user!;

    if (isGlobalAdmin) {
      // Global admins see all workspaces and always have write access
      const workspaces = await prisma.workspace.findMany({
        where: { organizationId },
        include: { _count: { select: { folders: true } } },
        orderBy: [{ isPersonal: 'desc' }, { name: 'asc' }],
      });
      res.json(workspaces.map((ws) => ({ ...ws, canWrite: true })));
      return;
    }

    // Regular users: personal workspace + workspaces they have a role in
    // Include the user's role so we can compute canWrite
    const workspaces = await prisma.workspace.findMany({
      where: {
        organizationId,
        OR: [
          { ownerId: userId },
          { workspaceRoles: { some: { userId } } },
        ],
      },
      include: {
        _count: { select: { folders: true } },
        workspaceRoles: { where: { userId }, select: { role: true } },
      },
      orderBy: [{ isPersonal: 'desc' }, { name: 'asc' }],
    });

    res.json(workspaces.map(({ workspaceRoles, ...ws }) => {
      const isOwner = ws.isPersonal && ws.ownerId === userId;
      const role = workspaceRoles[0]?.role;
      const canWrite = isOwner || role === 'EDITOR' || role === 'WORKSPACE_ADMIN';
      return { ...ws, canWrite };
    }));
  } catch (err) {
    next(err);
  }
});
