import cors from 'cors';
import express from 'express';

import errorMiddleware from './middlewares/errorMiddleware.js';
import authRoutes from './routes/authRoutes.js';
import shareRoutes from './routes/shareRoutes.js';
import taskRoutes from './routes/taskRoutes.js';

const app = express();

app.use(
  cors(
    process.env.CORS_ORIGIN
      ? { origin: process.env.CORS_ORIGIN }
      : undefined,
  ),
);
app.use(express.json());

app.get('/api/health', (_request, response) => {
  response.status(200).json({
    status: 'ok',
    timestamp: new Date(),
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/tasks', shareRoutes);
app.use('/api/tasks', taskRoutes);

app.use((request, response) => {
  response.status(404).json({
    message: `Route not found: ${request.method} ${request.originalUrl}`,
  });
});

app.use(errorMiddleware);

export default app;
