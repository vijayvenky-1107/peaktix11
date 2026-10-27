import { Router } from 'express';
import { admissionQueue } from '../admissionQueue.js';

const router = Router();

/**
 * POST /api/queue/join
 * Join the virtual waiting line for an event.
 */
router.post('/join', (req, res) => {
  const { eventId, email } = req.body || {};
  if (!eventId) {
    return res.status(400).json({ success: false, error: 'Event ID is required to join the queue.' });
  }

  const result = admissionQueue.join(eventId, email);
  res.status(201).json({ success: true, ...result });
});

/**
 * GET /api/queue/status
 * Poll current waiting position or retrieve admission pass.
 */
router.get('/status', (req, res) => {
  const { ticket } = req.query;
  if (!ticket) {
    return res.status(400).json({ success: false, error: 'Queue ticket query parameter is required.' });
  }

  const status = admissionQueue.getStatus(ticket);
  if (status.status === 'NOT_FOUND' || status.status === 'INVALID') {
    return res.status(404).json({ success: false, ...status });
  }

  res.json({ success: true, ...status });
});

/**
 * POST /api/queue/admit
 * Admits the next batch of users into the purchase window.
 */
router.post('/admit', (req, res) => {
  const batchSize = Math.max(1, Math.min(100, Number(req.body?.batchSize) || 10));
  const result = admissionQueue.admitBatch(batchSize);
  res.json({ success: true, ...result });
});

/**
 * GET /api/queue/metrics
 * Retrieve queue and traffic regulation metrics.
 */
router.get('/metrics', (req, res) => {
  res.json({ success: true, metrics: admissionQueue.getMetrics() });
});

export default router;
