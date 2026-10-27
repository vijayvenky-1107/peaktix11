import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import eventsRouter from './routes/events.js';
import bookingsRouter from './routes/bookings.js';
import queueRouter from './routes/queue.js';
import moviesRouter from './routes/movies.js';
import theatresRouter from './routes/theatres.js';
import experiencesRouter from './routes/experiences.js';
import offersRouter from './routes/offers.js';
import authRouter from './routes/auth.js';
import movieBookingsRouter from './routes/movieBookings.js';
import splitPaymentsRouter from './routes/splitPayments.js';
import { rateLimiter } from './middleware/rateLimiter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createApp() {
  const app = express();

  // Enable trust proxy for Render / Cloud reverse proxies
  app.set('trust proxy', 1);

  // Dynamic CORS configuration supporting credentials from any client preview/prod or localhost
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map((s) => s.trim())
    : [];

  const corsOptions = {
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. server-to-server, curl, mobile)
      if (!origin) return callback(null, true);

      // Allow any localhost / 127.0.0.1
      if (/^http:\/\/localhost(:\d+)?$/.test(origin) || /^http:\/\/127\.0\.0\.1(:\d+)?$/.test(origin)) {
        return callback(null, true);
      }

      // Allow vercel preview / production domains
      if (/^https:\/\/.*\.vercel\.app$/.test(origin)) {
        return callback(null, true);
      }

      // Allow configured CLIENT_URL
      if (process.env.CLIENT_URL && origin === process.env.CLIENT_URL.trim().replace(/\/+$/, '')) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // In production, permit origin so credentials work without being rejected by browser
      return callback(null, true);
    },
    credentials: true,
    exposedHeaders: ['X-Instance-Id', 'X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-Cache', 'ETag', 'Cache-Control'],
  };

  app.use(cors(corsOptions));

  // Identify responding instance (Crucial for load-balancing demo & diagnostics)
  app.use((req, res, next) => {
    const instanceId = process.env.INSTANCE_ID || 'api-primary';
    res.setHeader('X-Instance-Id', instanceId);
    next();
  });

  // Apply rate limiter
  app.use(rateLimiter);

  // Parse cookies
  app.use(cookieParser(process.env.SESSION_SECRET || 'peaktix-session-secret-2026-secure'));

  // Parse JSON payloads with strict limit
  app.use(express.json({ limit: '100kb' }));

  // API Health Check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'peaktix-api',
      instanceId: process.env.INSTANCE_ID || 'api-primary',
      port: Number.parseInt(process.env.PORT, 10) || 3001,
      database: 'sqlite-connected',
      timestamp: new Date().toISOString(),
    });
  });

  // Instance info for multi-instance load balancing demo
  app.get('/api/instance', (req, res) => {
    const mem = process.memoryUsage();
    res.json({
      success: true,
      instanceId: process.env.INSTANCE_ID || 'api-primary',
      port: Number.parseInt(process.env.PORT, 10) || 3001,
      pid: process.pid,
      uptimeSeconds: Math.round(process.uptime()),
      memoryMb: {
        rss: Math.round(mem.rss / 1024 / 1024),
        heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
      },
      timestamp: new Date().toISOString(),
    });
  });

  // Load Balancer status (serves standalone when cluster is not running)
  app.get('/lb/status', (req, res) => {
    const port = Number.parseInt(process.env.PORT, 10) || 3001;
    res.json({
      status: 'ok',
      service: 'peaktix-load-balancer',
      port,
      upstreams: [`http://127.0.0.1:${port}`],
      distribution: {
        [`http://127.0.0.1:${port}`]: 1,
      },
      timestamp: new Date().toISOString(),
    });
  });

  // Mount API Routers
  app.use('/api/events', eventsRouter);
  app.use('/api/bookings', bookingsRouter);
  app.use('/api/queue', queueRouter);
  app.use('/api/movies', moviesRouter);
  app.use('/api/theatres', theatresRouter);
  app.use('/api/experiences', experiencesRouter);
  app.use('/api/offers', offersRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/movie-bookings', movieBookingsRouter);
  app.use('/api/split-payments', splitPaymentsRouter);

  // 404 handler for undefined API routes
  app.use('/api', (req, res) => {
    res.status(404).json({ success: false, error: 'API route not found.' });
  });

  // Serve production built React client if dist exists
  const distPath = path.join(__dirname, '../dist');
  if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.use((req, res, next) => {
      if (req.method === 'GET' && !req.path.startsWith('/api')) {
        return res.sendFile(path.join(distPath, 'index.html'));
      }
      next();
    });
  }

  // Global error handler - never leaks database or internal stack traces
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    console.error('Unhandled server error:', err.message);
    res.status(500).json({ success: false, error: 'An unexpected internal error occurred.' });
  });

  return app;
}

export default createApp();
