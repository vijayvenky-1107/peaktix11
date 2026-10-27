import { Router } from 'express';
import crypto from 'node:crypto';
import { getDb } from '../db/database.js';

const router = Router();

/**
 * POST /api/split-payments/create
 * Creates a split bill session for a movie or event booking.
 */
router.post('/create', (req, res) => {
  const { bookingRef, title, totalAmount, splitCount, organizerName, organizerEmail } = req.body || {};

  if (!bookingRef || !title) {
    return res.status(400).json({ success: false, error: 'Booking reference and event/movie title are required.' });
  }

  const total = Number.parseInt(totalAmount, 10);
  if (Number.isNaN(total) || total <= 0) {
    return res.status(400).json({ success: false, error: 'Total amount must be a positive integer.' });
  }

  const count = Number.parseInt(splitCount, 10) || 2;
  if (count < 2 || count > 10) {
    return res.status(400).json({ success: false, error: 'Split count must be between 2 and 10 people.' });
  }

  const db = getDb();

  // Check if a split already exists for this bookingRef
  const existingStmt = db.prepare('SELECT * FROM split_payments WHERE bookingRef = ?');
  const existing = existingStmt.get(bookingRef);
  if (existing) {
    return res.json({
      success: true,
      split: {
        ...existing,
        shares: JSON.parse(existing.shares),
      },
    });
  }

  const splitId = `SPL-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  const amountPerPerson = Math.ceil(total / count);

  const shares = [];
  // Organizer is first person, already paid
  shares.push({
    shareId: 'SHARE-1',
    name: (organizerName || 'Organizer').trim(),
    email: (organizerEmail || '').trim(),
    amount: amountPerPerson,
    status: 'PAID',
    upiId: 'organizer@okhdfcbank',
    paidAt: new Date().toISOString(),
    isOrganizer: true,
  });

  for (let i = 2; i <= count; i++) {
    shares.push({
      shareId: `SHARE-${i}`,
      name: `Friend ${i - 1}`,
      email: '',
      amount: amountPerPerson,
      status: 'PENDING',
      upiId: null,
      paidAt: null,
      isOrganizer: false,
    });
  }

  const createdAt = new Date().toISOString();

  const insertStmt = db.prepare(`
    INSERT INTO split_payments (
      id, bookingRef, title, totalAmount, splitCount, amountPerPerson,
      organizerName, organizerEmail, status, shares, createdAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?)
  `);

  insertStmt.run(
    splitId,
    bookingRef,
    title,
    total,
    count,
    amountPerPerson,
    organizerName || 'Organizer',
    organizerEmail || '',
    JSON.stringify(shares),
    createdAt
  );

  res.status(201).json({
    success: true,
    split: {
      id: splitId,
      bookingRef,
      title,
      totalAmount: total,
      splitCount: count,
      amountPerPerson,
      organizerName: organizerName || 'Organizer',
      organizerEmail: organizerEmail || '',
      status: 'PENDING',
      shares,
      createdAt,
    },
  });
});

/**
 * GET /api/split-payments/:id
 * Retrieve split status and participant payment details.
 */
router.get('/:id', (req, res) => {
  const { id } = req.params;
  const db = getDb();

  const stmt = db.prepare('SELECT * FROM split_payments WHERE id = ?');
  const split = stmt.get(id);

  if (!split) {
    return res.status(404).json({ success: false, error: 'Split payment request not found.' });
  }

  const shares = JSON.parse(split.shares);
  const paidCount = shares.filter((s) => s.status === 'PAID').length;
  const paidAmount = shares.reduce((acc, s) => (s.status === 'PAID' ? acc + s.amount : acc), 0);

  res.json({
    success: true,
    split: {
      ...split,
      shares,
      paidCount,
      paidAmount,
      remainingAmount: Math.max(0, split.totalAmount - paidAmount),
    },
  });
});

/**
 * GET /api/split-payments/by-booking/:bookingRef
 * Find split record associated with a booking reference.
 */
router.get('/by-booking/:bookingRef', (req, res) => {
  const { bookingRef } = req.params;
  const db = getDb();

  const stmt = db.prepare('SELECT * FROM split_payments WHERE bookingRef = ?');
  const split = stmt.get(bookingRef);

  if (!split) {
    return res.status(404).json({ success: false, error: 'No split payment found for this booking.' });
  }

  const shares = JSON.parse(split.shares);
  const paidCount = shares.filter((s) => s.status === 'PAID').length;
  const paidAmount = shares.reduce((acc, s) => (s.status === 'PAID' ? acc + s.amount : acc), 0);

  res.json({
    success: true,
    split: {
      ...split,
      shares,
      paidCount,
      paidAmount,
      remainingAmount: Math.max(0, split.totalAmount - paidAmount),
    },
  });
});

/**
 * POST /api/split-payments/:id/pay
 * Friend pays their allocated share using UPI.
 */
router.post('/:id/pay', (req, res) => {
  const { id } = req.params;
  const { shareId, friendName, upiId } = req.body || {};

  if (!friendName || !friendName.trim()) {
    return res.status(400).json({ success: false, error: 'Your name is required to complete payment.' });
  }

  if (!upiId || !upiId.trim() || !upiId.includes('@')) {
    return res.status(400).json({ success: false, error: 'Valid UPI ID (e.g. yourname@oksbi or phone@paytm) is required.' });
  }

  const db = getDb();
  const stmt = db.prepare('SELECT * FROM split_payments WHERE id = ?');
  const split = stmt.get(id);

  if (!split) {
    return res.status(404).json({ success: false, error: 'Split payment session not found.' });
  }

  const shares = JSON.parse(split.shares);

  // Find target share to pay
  let targetShare = null;
  if (shareId) {
    targetShare = shares.find((s) => s.shareId === shareId);
  } else {
    // Pick first pending share
    targetShare = shares.find((s) => s.status === 'PENDING');
  }

  if (!targetShare) {
    return res.status(400).json({ success: false, error: 'All shares in this split have already been settled!' });
  }

  if (targetShare.status === 'PAID') {
    return res.status(400).json({ success: false, error: 'This specific share has already been paid.' });
  }

  // Update target share
  targetShare.name = friendName.trim();
  targetShare.upiId = upiId.trim();
  targetShare.status = 'PAID';
  targetShare.paidAt = new Date().toISOString();

  // Check if all shares are now paid
  const allPaid = shares.every((s) => s.status === 'PAID');
  const newStatus = allPaid ? 'COMPLETED' : 'PENDING';

  const updateStmt = db.prepare(`
    UPDATE split_payments
    SET shares = ?, status = ?
    WHERE id = ?
  `);
  updateStmt.run(JSON.stringify(shares), newStatus, id);

  res.json({
    success: true,
    message: `Payment of ₹${targetShare.amount} confirmed via UPI (${upiId.trim()})!`,
    split: {
      ...split,
      status: newStatus,
      shares,
    },
    paidShare: targetShare,
  });
});

export default router;
