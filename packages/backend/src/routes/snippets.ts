import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

export const snippetsRouter = Router();
snippetsRouter.use(requireAuth);

const SnippetSchema = z.object({
  name: z.string().min(1),
  shortcut: z.string().optional().nullable(),
  content: z.string().min(1),
  htmlContent: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

type IdParam = { id: string };
type ShortcutParam = { shortcut: string };

// GET /api/v1/snippets?folderId=xxx&search=xxx
snippetsRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const folderId = typeof req.query.folderId === 'string' ? req.query.folderId : undefined;
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;

    if (!folderId && !search) throw new AppError(400, 'folderId or search query parameter required');

    const snippets = await prisma.snippet.findMany({
      where: {
        organizationId: req.user!.organizationId,
        ...(folderId ? { folderId } : {}),
        ...(search ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { shortcut: { contains: search, mode: 'insensitive' } },
            { content: { contains: search, mode: 'insensitive' } },
          ],
        } : {}),
        isActive: true,
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    res.json(snippets);
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/snippets/shortcut/:shortcut — used by the browser extension
snippetsRouter.get('/shortcut/:shortcut', async (req: Request<ShortcutParam>, res: Response, next: NextFunction) => {
  try {
    const snippet = await prisma.snippet.findFirst({
      where: {
        organizationId: req.user!.organizationId,
        shortcut: req.params.shortcut,
        isActive: true,
      },
    });
    if (!snippet) throw new AppError(404, 'Snippet not found');
    res.json(snippet);
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/snippets
snippetsRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const folderId: string = req.body.folderId;
    if (!folderId) throw new AppError(400, 'folderId is required');
    const data = SnippetSchema.parse(req.body);
    const snippet = await prisma.snippet.create({
      data: { ...data, folderId, organizationId: req.user!.organizationId },
    });
    res.status(201).json(snippet);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/v1/snippets/:id
snippetsRouter.patch('/:id', async (req: Request<IdParam>, res: Response, next: NextFunction) => {
  try {
    const data = SnippetSchema.partial().parse(req.body);
    const snippet = await prisma.snippet.update({ where: { id: req.params.id }, data });
    res.json(snippet);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/v1/snippets/:id
snippetsRouter.delete('/:id', async (req: Request<IdParam>, res: Response, next: NextFunction) => {
  try {
    await prisma.snippet.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
