import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { canWriteWorkspace } from '../lib/permissions';

export const foldersRouter = Router();
foldersRouter.use(requireAuth);

const FolderSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  sortOrder: z.number().int().optional(),
});

type IdParam = { id: string };

// GET /api/v1/folders?workspaceId=xxx
foldersRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const workspaceId = typeof req.query.workspaceId === 'string' ? req.query.workspaceId : undefined;
    if (!workspaceId) {
      throw new AppError(400, 'workspaceId query parameter is required');
    }
    const folders = await prisma.folder.findMany({
      where: { workspaceId },
      include: { _count: { select: { snippets: true } } },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    res.json(folders);
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/folders
foldersRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const workspaceId: string = req.body.workspaceId;
    if (!workspaceId) throw new AppError(400, 'workspaceId is required');

    const { userId, isGlobalAdmin } = req.user!;
    if (!isGlobalAdmin && !await canWriteWorkspace(userId, workspaceId)) {
      throw new AppError(403, 'You do not have permission to create folders in this workspace');
    }

    const data = FolderSchema.parse(req.body);
    const folder = await prisma.folder.create({ data: { ...data, workspaceId } });
    res.status(201).json(folder);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/v1/folders/:id
foldersRouter.patch('/:id', async (req: Request<IdParam>, res: Response, next: NextFunction) => {
  try {
    const { userId, isGlobalAdmin } = req.user!;
    if (!isGlobalAdmin) {
      const existing = await prisma.folder.findUnique({ where: { id: req.params.id }, select: { workspaceId: true } });
      if (!existing) throw new AppError(404, 'Folder not found');
      if (!await canWriteWorkspace(userId, existing.workspaceId)) {
        throw new AppError(403, 'You do not have permission to edit folders in this workspace');
      }
    }
    const data = FolderSchema.partial().parse(req.body);
    const folder = await prisma.folder.update({ where: { id: req.params.id }, data });
    res.json(folder);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/v1/folders/:id
foldersRouter.delete('/:id', async (req: Request<IdParam>, res: Response, next: NextFunction) => {
  try {
    const { userId, isGlobalAdmin } = req.user!;
    if (!isGlobalAdmin) {
      const existing = await prisma.folder.findUnique({ where: { id: req.params.id }, select: { workspaceId: true } });
      if (!existing) throw new AppError(404, 'Folder not found');
      if (!await canWriteWorkspace(userId, existing.workspaceId)) {
        throw new AppError(403, 'You do not have permission to delete folders in this workspace');
      }
    }
    await prisma.folder.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
