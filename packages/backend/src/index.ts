import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { authRouter } from './routes/auth';
import { workspacesRouter } from './routes/workspaces';
import { foldersRouter } from './routes/folders';
import { snippetsRouter } from './routes/snippets';
import { usersRouter } from './routes/users';
import { importRouter } from './routes/import';
import { errorHandler } from './middleware/errorHandler';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes — all prefixed with /api/v1
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/workspaces', workspacesRouter);
app.use('/api/v1/folders', foldersRouter);
app.use('/api/v1/snippets', snippetsRouter);
app.use('/api/v1/users', usersRouter);
app.use('/api/v1/import', importRouter);

// Must be last — catches all errors thrown in route handlers
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`SnipLogic API running on http://localhost:${PORT}`);
});
