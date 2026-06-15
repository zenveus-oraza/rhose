import express from 'express';
import cors from 'cors';
import path from 'path';
import { env } from './config/env.js';
import { errorHandler } from './middleware/errorHandler.js';
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import adminRouter from './routes/admin.routes.js';
import learnerRouter from './routes/learner.routes.js';
import uploadRouter from './routes/upload.routes.js';
import progressRouter from './routes/progress.routes.js';

const app = express();
const PORT = env.PORT;
const FRONTEND_ORIGIN = env.FRONTEND_URL;

// Middleware
app.use(cors({ origin: FRONTEND_ORIGIN, credentials: true }));
app.use(express.json({ limit: '10mb' }));

// Serve uploaded files as static assets
app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok', timestamp: new Date().toISOString() } });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRouter);
app.use('/api/learner', learnerRouter);
app.use('/api/uploads', uploadRouter);
app.use('/api/progress', progressRouter);

// --- Register routes above this line ---

// Global error handler (must be registered AFTER all routes)
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});

export default app;
