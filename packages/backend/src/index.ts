import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { authRouter } from './routes/auth';
import { workspacesRouter } from './routes/workspaces';
import { foldersRouter } from './routes/folders';
import { snippetsRouter } from './routes/snippets';
import { usersRouter } from './routes/users';
import { importRouter } from './routes/import';
import { variablesRouter } from './routes/variables';
import { errorHandler } from './middleware/errorHandler';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const allowed = process.env.FRONTEND_URL || 'http://localhost:5173';
    if (origin === allowed || origin === 'http://localhost:5173' || origin.startsWith('chrome-extension://') || origin.startsWith('moz-extension://'))
      return callback(null, true);
    callback(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
}));

// Chrome 94+ Private Network Access: extension pages fetching localhost must receive this header
app.use((_req, res, next) => {
  res.setHeader('Access-Control-Allow-Private-Network', 'true');
  next();
});

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
app.use('/api/v1/variables', variablesRouter);

// Must be last — catches all errors thrown in route handlers
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`SnipLogic API running on http://localhost:${PORT}`);
});
