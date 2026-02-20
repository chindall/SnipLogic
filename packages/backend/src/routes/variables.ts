import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

export const variablesRouter = Router();
variablesRouter.use(requireAuth);

const VariableSchema = z.object({
  name: z
    .string()
    .min(1)
    .regex(/^[a-zA-Z0-9_]+$/, 'Name can only contain letters, numbers, and underscores'),
  value: z.string(),
  scope: z.enum(['USER', 'WORKSPACE']),
  workspaceId: z.string().optional().nullable(),
});

type IdParam = { id: string };

// GET /api/v1/variables — list all variables accessible to the current user
variablesRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, organizationId } = req.user!;

    // Get all workspace IDs where the user has a role
    const workspaceRoles = await prisma.workspaceRole.findMany({
      where: { userId },
      select: { workspaceId: true },
    });
    const workspaceIds = workspaceRoles.map((wr) => wr.workspaceId);

    const variables = await prisma.variable.findMany({
      where: {
        organizationId,
        OR: [
          { scope: 'USER', userId },
          { scope: 'WORKSPACE', workspaceId: { in: workspaceIds } },
        ],
      },
      orderBy: [{ scope: 'asc' }, { name: 'asc' }],
    });

    res.json(variables);
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/variables — create a variable
variablesRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, organizationId } = req.user!;
    const data = VariableSchema.parse(req.body);

    if (data.scope === 'WORKSPACE' && !data.workspaceId) {
      throw new AppError(400, 'workspaceId is required for WORKSPACE scope');
    }

    // Normalize name to lowercase
    const name = data.name.toLowerCase();

    const variable = await prisma.variable.create({
      data: {
        name,
        value: data.value,
        scope: data.scope,
        userId: data.scope === 'USER' ? userId : null,
        workspaceId: data.scope === 'WORKSPACE' ? (data.workspaceId ?? null) : null,
        organizationId,
      },
    });

    res.status(201).json(variable);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/v1/variables/:id — update a variable (owner only)
variablesRouter.patch('/:id', async (req: Request<IdParam>, res: Response, next: NextFunction) => {
  try {
    const { userId, isGlobalAdmin } = req.user!;

    const existing = await prisma.variable.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new AppError(404, 'Variable not found');

    if (!isGlobalAdmin && existing.userId && existing.userId !== userId) {
      throw new AppError(403, 'You do not have permission to edit this variable');
    }

    const data = VariableSchema.partial().parse(req.body);
    const name = data.name ? data.name.toLowerCase() : undefined;

    const variable = await prisma.variable.update({
      where: { id: req.params.id },
      data: { ...data, ...(name !== undefined ? { name } : {}) },
    });

    res.json(variable);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/v1/variables/:id — delete a variable (owner only)
variablesRouter.delete('/:id', async (req: Request<IdParam>, res: Response, next: NextFunction) => {
  try {
    const { userId, isGlobalAdmin } = req.user!;

    const existing = await prisma.variable.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new AppError(404, 'Variable not found');

    if (!isGlobalAdmin && existing.userId && existing.userId !== userId) {
      throw new AppError(403, 'You do not have permission to delete this variable');
    }

    await prisma.variable.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
