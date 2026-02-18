import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

export const importRouter = Router();
importRouter.use(requireAuth);

// Store uploaded files in memory as Buffers (no temp files on disk)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB per file
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/json' || file.originalname.endsWith('.json')) {
      cb(null, true);
    } else {
      cb(new Error('Only JSON files are accepted'));
    }
  },
});

// ─── TextBlaze v7 JSON types ─────────────────────────────────────────────────

interface TextBlazeSnippet {
  name: string;
  shortcut?: string;
  type?: string;
  text?: string;
  html?: string;
}

interface TextBlazeFolder {
  name: string;
  info?: string;
  snippets?: TextBlazeSnippet[];
}

interface TextBlazeExport {
  version?: number;
  folders?: TextBlazeFolder[];
}

// ─── Import result types ──────────────────────────────────────────────────────

interface FileResult {
  filename: string;
  foldersCreated: number;
  snippetsImported: number;
  snippetsSkipped: number;
  warnings: string[];
  error?: string;
}

// ─── POST /api/v1/import/textblaze ───────────────────────────────────────────
// Body (multipart/form-data):
//   workspaceId: string
//   files: JSON file(s)

importRouter.post(
  '/textblaze',
  upload.array('files', 25), // max 25 files at once
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const workspaceId: string = req.body.workspaceId;
      if (!workspaceId) throw new AppError(400, 'workspaceId is required');

      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) throw new AppError(400, 'At least one file is required');

      // Verify workspace exists and belongs to this org
      const workspace = await prisma.workspace.findFirst({
        where: { id: workspaceId, organizationId: req.user!.organizationId },
      });
      if (!workspace) throw new AppError(404, 'Workspace not found');

      // Load all existing shortcuts for this org to detect conflicts
      const existingShortcuts = new Set(
        (await prisma.snippet.findMany({
          where: { organizationId: req.user!.organizationId, shortcut: { not: null } },
          select: { shortcut: true },
        })).map((s) => s.shortcut as string)
      );

      const results: FileResult[] = [];
      let totalFolders = 0;
      let totalSnippets = 0;

      for (const file of files) {
        const result = await importFile(
          file,
          workspaceId,
          req.user!.organizationId,
          existingShortcuts
        );
        results.push(result);
        totalFolders += result.foldersCreated;
        totalSnippets += result.snippetsImported;
      }

      res.json({
        summary: {
          filesProcessed: files.length,
          totalFoldersCreated: totalFolders,
          totalSnippetsImported: totalSnippets,
        },
        files: results,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ─── Per-file import logic ────────────────────────────────────────────────────

async function importFile(
  file: Express.Multer.File,
  workspaceId: string,
  organizationId: string,
  existingShortcuts: Set<string>
): Promise<FileResult> {
  const result: FileResult = {
    filename: file.originalname,
    foldersCreated: 0,
    snippetsImported: 0,
    snippetsSkipped: 0,
    warnings: [],
  };

  let data: TextBlazeExport;
  try {
    data = JSON.parse(file.buffer.toString('utf-8')) as TextBlazeExport;
  } catch {
    result.error = 'Invalid JSON — could not parse file';
    return result;
  }

  if (!data.folders || !Array.isArray(data.folders)) {
    result.error = 'Not a valid TextBlaze export (missing "folders" array)';
    return result;
  }

  for (const tbFolder of data.folders) {
    if (!tbFolder.name) continue;

    // Create the folder in the target workspace
    const folder = await prisma.folder.create({
      data: {
        name: tbFolder.name.replace(/^[>_ ]+/, '').trim() || tbFolder.name, // strip leading >>>> and ____
        workspaceId,
      },
    });
    result.foldersCreated++;

    if (!tbFolder.snippets || tbFolder.snippets.length === 0) continue;

    // Build snippet rows for bulk insert
    const snippetRows = [];
    for (const tbSnippet of tbFolder.snippets) {
      if (!tbSnippet.name) continue;

      let shortcut: string | null = tbSnippet.shortcut?.trim() || null;

      // Deduplicate shortcuts within this import session too
      if (shortcut && existingShortcuts.has(shortcut)) {
        result.warnings.push(
          `Shortcut "${shortcut}" already exists — imported "${tbSnippet.name}" without a shortcut`
        );
        shortcut = null;
        result.snippetsSkipped++;
      } else if (shortcut) {
        existingShortcuts.add(shortcut); // mark as taken for subsequent files
      }

      snippetRows.push({
        name: tbSnippet.name,
        shortcut,
        content: tbSnippet.text || '',
        htmlContent: tbSnippet.html || null,
        folderId: folder.id,
        organizationId,
      });
    }

    if (snippetRows.length > 0) {
      await prisma.snippet.createMany({ data: snippetRows });
      result.snippetsImported += snippetRows.length;
    }
  }

  return result;
}
