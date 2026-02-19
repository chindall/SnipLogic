import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth, requireGlobalAdmin } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

export const usersRouter = Router();
usersRouter.use(requireAuth);

// Reusable select shape for returning user data (no passwordHash)
const userSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  isGlobalAdmin: true,
  createdAt: true,
  workspaceRoles: { include: { workspace: { select: { id: true, name: true } } } },
} as const;

// GET /api/v1/users — global admin only, lists all users in org
usersRouter.get('/', requireGlobalAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const users = await prisma.user.findMany({
      where: { organizationId: req.user!.organizationId },
      select: userSelect,
      orderBy: { lastName: 'asc' },
    });
    res.json(users);
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/users/invite — create a new user in the org (admin only)
const InviteSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  password: z.string().min(8),
});

usersRouter.post('/invite', requireGlobalAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = InviteSchema.parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw new AppError(409, 'Email already in use');

    const passwordHash = await bcrypt.hash(data.password, 12);
    const user = await prisma.user.create({
      data: {
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        passwordHash,
        isGlobalAdmin: false,
        organizationId: req.user!.organizationId,
        personalWorkspace: {
          create: {
            name: `${data.firstName}'s Workspace`,
            isPersonal: true,
            organizationId: req.user!.organizationId,
          },
        },
      },
      select: userSelect,
    });

    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/users/:id/workspace-roles — assign or update a workspace role
const WorkspaceRoleSchema = z.object({
  workspaceId: z.string().min(1),
  role: z.enum(['WORKSPACE_ADMIN', 'EDITOR', 'VIEWER']),
});

type UserIdParam = { id: string };
type UserWorkspaceParam = { id: string; workspaceId: string };

usersRouter.post('/:id/workspace-roles', requireGlobalAdmin, async (req: Request<UserIdParam>, res: Response, next: NextFunction) => {
  try {
    const { workspaceId, role } = WorkspaceRoleSchema.parse(req.body);
    await prisma.workspaceRole.upsert({
      where: { userId_workspaceId: { userId: req.params.id, workspaceId } },
      create: { userId: req.params.id, workspaceId, role },
      update: { role },
    });
    // Return the updated user
    const user = await prisma.user.findUniqueOrThrow({ where: { id: req.params.id }, select: userSelect });
    res.json(user);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/v1/users/:id/workspace-roles/:workspaceId — remove a workspace role
usersRouter.delete('/:id/workspace-roles/:workspaceId', requireGlobalAdmin, async (req: Request<UserWorkspaceParam>, res: Response, next: NextFunction) => {
  try {
    await prisma.workspaceRole.delete({
      where: { userId_workspaceId: { userId: req.params.id, workspaceId: req.params.workspaceId } },
    });
    const user = await prisma.user.findUniqueOrThrow({ where: { id: req.params.id }, select: userSelect });
    res.json(user);
  } catch (err) {
    next(err);
  }
});
