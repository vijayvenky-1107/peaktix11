import 'dotenv/config';
import { createApp } from './app.js';
import { initDb } from './db/database.js';

const PORT = Number.parseInt(process.env.PORT, 10) || 3001;

// Initialize database schema and seed data
initDb();

const app = createApp();

const server = app.listen(PORT, () => {
  console.log(`PeakTix API server running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
  console.log(`Events API:   http://localhost:${PORT}/api/events`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nGracefully shutting down PeakTix server...');
  server.close(() => {
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  server.close(() => {
    process.exit(0);
  });
});
