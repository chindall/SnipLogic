import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth, requireGlobalAdmin } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

export const workspacesRouter = Router();
workspacesRouter.use(requireAuth);

type IdParam = { id: string };

// GET /api/v1/workspaces — list workspaces the current user has access to
workspacesRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, organizationId, isGlobalAdmin } = req.user!;

    if (isGlobalAdmin) {
      // Global admins see: their own personal workspace + all shared workspaces
      // They do NOT see other users' personal workspaces in the sidebar
      const workspaces = await prisma.workspace.findMany({
        where: {
          organizationId,
          OR: [
            { isPersonal: false },          // all shared workspaces
            { isPersonal: true, ownerId: userId }, // only their own personal
          ],
        },
        include: { _count: { select: { folders: true } } },
        orderBy: [{ isPersonal: 'desc' }, { name: 'asc' }],
      });
      res.json(workspaces.map((ws) => ({ ...ws, canWrite: true })));
      return;
    }

    // Regular users: personal workspace + workspaces they have a role in
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

// GET /api/v1/workspaces/managed — all shared workspaces for admin management UI
workspacesRouter.get('/managed', requireGlobalAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const workspaces = await prisma.workspace.findMany({
      where: { organizationId: req.user!.organizationId, isPersonal: false },
      include: {
        _count: { select: { folders: true } },
        workspaceRoles: {
          include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
        },
      },
      orderBy: { name: 'asc' },
    });
    res.json(workspaces);
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/workspaces — create a shared workspace (admin only)
const CreateWorkspaceSchema = z.object({
  name: z.string().min(1),
  memberRoles: z.array(z.object({
    userId: z.string(),
    role: z.enum(['WORKSPACE_ADMIN', 'EDITOR', 'VIEWER']),
  })).optional(),
});

workspacesRouter.post('/', requireGlobalAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, memberRoles = [] } = CreateWorkspaceSchema.parse(req.body);
    const { userId, organizationId } = req.user!;

    // Creator is always WORKSPACE_ADMIN; merge with any provided roles
    const rolesMap = new Map<string, 'WORKSPACE_ADMIN' | 'EDITOR' | 'VIEWER'>();
    rolesMap.set(userId, 'WORKSPACE_ADMIN');
    for (const mr of memberRoles) {
      if (mr.userId !== userId) rolesMap.set(mr.userId, mr.role);
    }

    const workspace = await prisma.workspace.create({
      data: {
        name,
        isPersonal: false,
        organizationId,
        workspaceRoles: {
          create: Array.from(rolesMap.entries()).map(([uid, role]) => ({ userId: uid, role })),
        },
      },
      include: {
        _count: { select: { folders: true } },
        workspaceRoles: {
          include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
        },
      },
    });

    res.status(201).json(workspace);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/v1/workspaces/:id — rename a shared workspace (admin only)
const UpdateWorkspaceSchema = z.object({
  name: z.string().min(1),
});

workspacesRouter.patch('/:id', requireGlobalAdmin, async (req: Request<IdParam>, res: Response, next: NextFunction) => {
  try {
    const existing = await prisma.workspace.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.organizationId !== req.user!.organizationId) {
      throw new AppError(404, 'Workspace not found');
    }
    if (existing.isPersonal) throw new AppError(400, 'Personal workspaces cannot be renamed here');

    const { name } = UpdateWorkspaceSchema.parse(req.body);
    const workspace = await prisma.workspace.update({
      where: { id: req.params.id },
      data: { name },
      include: {
        _count: { select: { folders: true } },
        workspaceRoles: {
          include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
        },
      },
    });
    res.json(workspace);
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/workspaces/:id/export — export workspace data as JSON before deletion
workspacesRouter.get('/:id/export', requireGlobalAdmin, async (req: Request<IdParam>, res: Response, next: NextFunction) => {
  try {
    const workspace = await prisma.workspace.findUnique({
      where: { id: req.params.id },
      include: {
        folders: {
          include: {
            snippets: {
              select: { name: true, shortcut: true, content: true, htmlContent: true, isActive: true, sortOrder: true },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
        workspaceRoles: {
          include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
        },
      },
    });

    if (!workspace || workspace.organizationId !== req.user!.organizationId) {
      throw new AppError(404, 'Workspace not found');
    }
    if (workspace.isPersonal) throw new AppError(400, 'Use the user export endpoint for personal workspaces');

    const exportData = {
      exportedAt: new Date().toISOString(),
      workspace: {
        name: workspace.name,
        members: workspace.workspaceRoles.map((wr) => ({
          user: wr.user,
          role: wr.role,
        })),
        folders: workspace.folders.map((f) => ({
          name: f.name,
          description: f.description,
          sortOrder: f.sortOrder,
          snippets: f.snippets,
        })),
      },
    };

    res.setHeader('Content-Disposition', `attachment; filename="workspace-${workspace.name.replace(/\s+/g, '-').toLowerCase()}.json"`);
    res.setHeader('Content-Type', 'application/json');
    res.json(exportData);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/v1/workspaces/:id — delete a shared workspace (admin only, irreversible)
workspacesRouter.delete('/:id', requireGlobalAdmin, async (req: Request<IdParam>, res: Response, next: NextFunction) => {
  try {
    const existing = await prisma.workspace.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.organizationId !== req.user!.organizationId) {
      throw new AppError(404, 'Workspace not found');
    }
    if (existing.isPersonal) throw new AppError(400, 'Personal workspaces cannot be deleted directly');

    // Cascade: folders → snippets deleted via Prisma onDelete: Cascade
    await prisma.workspace.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
