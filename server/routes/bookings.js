import { Router } from 'express';
import crypto from 'node:crypto';
import { getDb } from '../db/database.js';
import { admissionQueue } from '../admissionQueue.js';
import { cache } from '../cache.js';
import { authenticateUser } from './auth.js';

const router = Router();

/**
 * Generates an 8-character unique alphanumeric booking reference code.
 * Example: PTX-7K9MB3PW
 */
function generateBookingRef() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let ref = 'PTX-';
  const bytes = crypto.randomBytes(8);
  for (let i = 0; i < 8; i++) {
    ref += chars[bytes[i] % chars.length];
  }
  return ref;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validates booking creation payload.
 */
function validateBookingInput(body) {
  const { eventId, quantity, name, email } = body || {};

  const parsedEventId = Number.parseInt(eventId, 10);
  if (!Number.isInteger(parsedEventId) || parsedEventId <= 0) {
    return { valid: false, error: 'A valid event ID is required.' };
  }

  const parsedQty = Number(quantity);
  if (!Number.isInteger(parsedQty) || parsedQty < 1) {
    return { valid: false, error: 'Quantity must be an integer of at least 1.' };
  }
  if (parsedQty > 100) {
    return { valid: false, error: 'Maximum 100 tickets allowed per reservation.' };
  }

  if (typeof name !== 'string' || name.trim().length === 0) {
    return { valid: false, error: 'Full name is required.' };
  }
  if (name.trim().length > 100) {
    return { valid: false, error: 'Name must not exceed 100 characters.' };
  }

  if (typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
    return { valid: false, error: 'A valid email address is required.' };
  }
  if (email.trim().length > 254) {
    return { valid: false, error: 'Email must not exceed 254 characters.' };
  }

  return {
    valid: true,
    data: {
      eventId: parsedEventId,
      quantity: parsedQty,
      name: name.trim(),
      email: email.trim().toLowerCase(),
    },
  };
}

/**
 * Releases expired seat holds and restores inventory back to events.
 * Safe to call opportunistically before booking and hold operations.
 */
export function cleanupExpiredHolds() {
  const db = getDb();
  let inTx = false;
  try {
    const now = Date.now();
    const expired = db.prepare('SELECT id, eventId, quantity FROM seat_holds WHERE expiresAt <= ?').all(now);

    if (expired.length > 0) {
      db.exec('BEGIN IMMEDIATE');
      inTx = true;

      for (const hold of expired) {
        db.prepare('UPDATE events SET available = available + ? WHERE id = ?').run(hold.quantity, hold.eventId);
        db.prepare('DELETE FROM seat_holds WHERE id = ?').run(hold.id);
      }

      db.exec('COMMIT');
      inTx = false;
      cache.invalidatePattern('events:');
    }
    return expired.length;
  } catch (err) {
    if (inTx) {
      try {
        db.exec('ROLLBACK');
      } catch {
        // Ignore rollback failure
      }
    }
    console.error('Failed to cleanup expired holds:', err.message);
    return 0;
  }
}

// Periodic cleanup of expired seat holds every 30 seconds
const holdCleanupTimer = setInterval(cleanupExpiredHolds, 30000);
if (holdCleanupTimer.unref) {
  holdCleanupTimer.unref();
}

/**
 * POST /api/bookings/hold
 * Temporarily reserve seats for 5 minutes during checkout.
 * Atomically decrements available inventory and sets an expiration timestamp.
 */
router.post('/hold', (req, res) => {
  const { eventId, quantity, email } = req.body || {};

  const parsedEventId = Number.parseInt(eventId, 10);
  if (!Number.isInteger(parsedEventId) || parsedEventId <= 0) {
    return res.status(400).json({ success: false, error: 'A valid event ID is required.' });
  }

  const parsedQty = Number(quantity);
  if (!Number.isInteger(parsedQty) || parsedQty < 1 || parsedQty > 100) {
    return res.status(400).json({ success: false, error: 'Quantity must be an integer between 1 and 100.' });
  }

  if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
    return res.status(400).json({ success: false, error: 'A valid email is required to hold seats.' });
  }

  cleanupExpiredHolds();

  const db = getDb();
  let inTransaction = false;

  try {
    db.exec('BEGIN IMMEDIATE');
    inTransaction = true;

    const event = db.prepare('SELECT id, title, available, price, sale_start FROM events WHERE id = ?').get(parsedEventId);
    if (!event) {
      db.exec('ROLLBACK');
      inTransaction = false;
      return res.status(404).json({ success: false, error: 'Event not found.' });
    }

    if (event.sale_start && new Date(event.sale_start).getTime() > Date.now()) {
      db.exec('ROLLBACK');
      inTransaction = false;
      return res.status(403).json({ success: false, error: 'Ticket sales have not opened yet for this event.' });
    }

    if (event.available < parsedQty) {
      db.exec('ROLLBACK');
      inTransaction = false;
      return res.status(409).json({
        success: false,
        error: event.available <= 0
          ? 'Event is completely sold out.'
          : `Only ${event.available} ticket${event.available === 1 ? '' : 's'} available to hold.`,
      });
    }

    const updateResult = db.prepare('UPDATE events SET available = available - ? WHERE id = ? AND available >= ?')
      .run(parsedQty, parsedEventId, parsedQty);

    if (updateResult.changes !== 1) {
      db.exec('ROLLBACK');
      inTransaction = false;
      return res.status(409).json({ success: false, error: 'Tickets are no longer available. Please retry.' });
    }

    const holdId = `HLD-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
    const expiresAt = Date.now() + (5 * 60 * 1000); // 5 minutes

    db.prepare(`
      INSERT INTO seat_holds (id, eventId, quantity, email, expiresAt)
      VALUES (?, ?, ?, ?, ?)
    `).run(holdId, parsedEventId, parsedQty, email.trim().toLowerCase(), expiresAt);

    db.exec('COMMIT');
    inTransaction = false;

    cache.invalidatePattern('events:');

    res.status(201).json({
      success: true,
      holdId,
      eventId: parsedEventId,
      quantity: parsedQty,
      email: email.trim().toLowerCase(),
      expiresAt: new Date(expiresAt).toISOString(),
      expiresInSeconds: 300,
      priceEach: event.price,
      estimatedTotal: Math.round(event.price * parsedQty),
    });
  } catch (err) {
    if (inTransaction) {
      try {
        db.exec('ROLLBACK');
      } catch {
        // Ignore rollback failure
      }
    }
    console.error('Error creating seat hold:', err.message);
    res.status(500).json({ success: false, error: 'Failed to place seat hold.' });
  }
});

/**
 * DELETE /api/bookings/hold/:id
 * Explicitly release a seat hold and return inventory.
 */
router.delete('/hold/:id', (req, res) => {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json({ success: false, error: 'Hold identifier is required.' });
  }

  const db = getDb();
  let inTransaction = false;

  try {
    db.exec('BEGIN IMMEDIATE');
    inTransaction = true;

    const hold = db.prepare('SELECT * FROM seat_holds WHERE id = ?').get(id);
    if (!hold) {
      db.exec('ROLLBACK');
      inTransaction = false;
      return res.status(404).json({ success: false, error: 'Seat hold not found.' });
    }

    db.prepare('DELETE FROM seat_holds WHERE id = ?').run(id);
    db.prepare('UPDATE events SET available = available + ? WHERE id = ?').run(hold.quantity, hold.eventId);

    db.exec('COMMIT');
    inTransaction = false;

    cache.invalidatePattern('events:');

    res.json({ success: true, message: 'Seat hold released and inventory restored.' });
  } catch (err) {
    if (inTransaction) {
      try {
        db.exec('ROLLBACK');
      } catch {
        // Ignore rollback failure
      }
    }
    console.error('Error releasing seat hold:', err.message);
    res.status(500).json({ success: false, error: 'Failed to release seat hold.' });
  }
});

/**
 * POST /api/bookings
 * Create a new ticket booking inside an ACID transaction.
 * Supports completing reservations with a valid seat hold or direct booking.
 * Price is calculated strictly on the server in INR (₹).
 */
router.post('/', (req, res) => {
  const validation = validateBookingInput(req.body);
  if (!validation.valid) {
    return res.status(400).json({ success: false, error: validation.error });
  }

  const { eventId, quantity, name, email } = validation.data;
  const queueToken = req.headers['x-queue-token'] || req.body.queueToken;
  const holdId = req.body.holdId;

  // Never trust client user identity; bind to authenticated user if session exists
  const authUser = authenticateUser(req);
  if (req.headers['x-require-auth'] === 'true' && !authUser) {
    return res.status(401).json({ success: false, error: 'Authentication required. Please sign in to book.' });
  }
  if ((req.headers.authorization || req.cookies?.ptx_session) && !authUser) {
    return res.status(401).json({ success: false, error: 'Unauthorized. Invalid or expired session.' });
  }

  const effectiveName = authUser ? authUser.name : name;
  const effectiveEmail = authUser ? authUser.email : email;

  // If a queue token was supplied, validate admission status
  if (queueToken) {
    const queueCheck = admissionQueue.validateAndConsume(queueToken, eventId);
    if (!queueCheck.valid) {
      return res.status(403).json({
        success: false,
        error: queueCheck.error || 'Invalid or expired admission pass.',
      });
    }
  }

  cleanupExpiredHolds();

  const db = getDb();
  let inTransaction = false;

  try {
    db.exec('BEGIN IMMEDIATE');
    inTransaction = true;

    // 1. Fetch current event details and lock row for update
    const event = db.prepare(`
      SELECT id, title, category, language, date, time, venue, city, price, available
      FROM events
      WHERE id = ?
    `).get(eventId);

    if (!event) {
      db.exec('ROLLBACK');
      inTransaction = false;
      return res.status(404).json({ success: false, error: 'Event not found.' });
    }

    // 2. Handle seat hold redemption or direct inventory decrement
    if (holdId) {
      const hold = db.prepare('SELECT * FROM seat_holds WHERE id = ?').get(holdId);
      if (!hold) {
        db.exec('ROLLBACK');
        inTransaction = false;
        return res.status(400).json({ success: false, error: 'Seat hold was not found or already consumed.' });
      }

      if (Date.now() > hold.expiresAt) {
        db.prepare('DELETE FROM seat_holds WHERE id = ?').run(holdId);
        db.prepare('UPDATE events SET available = available + ? WHERE id = ?').run(hold.quantity, hold.eventId);
        db.exec('ROLLBACK');
        inTransaction = false;
        return res.status(409).json({ success: false, error: 'Your seat hold has expired. Please reselect your seats.' });
      }

      if (hold.eventId !== eventId) {
        db.exec('ROLLBACK');
        inTransaction = false;
        return res.status(400).json({ success: false, error: 'Seat hold does not match this event.' });
      }

      // Consume hold
      db.prepare('DELETE FROM seat_holds WHERE id = ?').run(holdId);

      // If hold was for more than booked quantity, restore difference
      if (hold.quantity > quantity) {
        db.prepare('UPDATE events SET available = available + ? WHERE id = ?').run(hold.quantity - quantity, eventId);
      }
    } else {
      // Direct booking without hold
      if (event.available < quantity) {
        db.exec('ROLLBACK');
        inTransaction = false;
        return res.status(409).json({
          success: false,
          error: event.available <= 0
            ? 'This event is completely sold out.'
            : `Insufficient inventory: only ${event.available} ticket${event.available === 1 ? '' : 's'} remaining.`,
        });
      }

      const updateResult = db.prepare(`
        UPDATE events
        SET available = available - ?
        WHERE id = ? AND available >= ?
      `).run(quantity, eventId, quantity);

      if (updateResult.changes !== 1) {
        db.exec('ROLLBACK');
        inTransaction = false;
        return res.status(409).json({
          success: false,
          error: 'Tickets are no longer available. Please retry with a smaller quantity.',
        });
      }
    }

    // 3. Calculate total in integer rupees on server (never trust client total)
    const total = Math.round(event.price * quantity);
    const bookingId = crypto.randomUUID();
    const ref = generateBookingRef();
    const bookedAt = new Date().toISOString();

    // 4. Insert booking record
    db.prepare(`
      INSERT INTO bookings (
        id, ref, eventId, eventTitle, eventDate, eventTime, eventVenue, eventCity,
        category, priceEach, quantity, total, name, email, status, bookedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'CONFIRMED', ?)
    `).run(
      bookingId,
      ref,
      event.id,
      event.title,
      event.date,
      event.time,
      event.venue,
      event.city,
      event.category,
      event.price,
      quantity,
      total,
      effectiveName,
      effectiveEmail,
      bookedAt
    );

    db.exec('COMMIT');
    inTransaction = false;

    // Invalidate cached event queries so subsequent requests get fresh inventory
    cache.invalidatePattern('events:');

    const newBooking = {
      id: bookingId,
      ref,
      eventId: event.id,
      eventTitle: event.title,
      eventDate: event.date,
      eventTime: event.time,
      eventVenue: event.venue,
      eventCity: event.city,
      category: event.category,
      language: event.language,
      currency: 'INR',
      priceEach: event.price,
      quantity,
      total,
      name: effectiveName,
      email: effectiveEmail,
      status: 'CONFIRMED',
      bookedAt,
    };

    res.status(201).json({ success: true, booking: newBooking });
  } catch (err) {
    if (inTransaction) {
      try {
        db.exec('ROLLBACK');
      } catch {
        // Ignore rollback failure
      }
    }
    console.error('Error processing booking:', err.message);
    res.status(500).json({ success: false, error: 'Unable to process booking at this time.' });
  }
});

/**
 * GET /api/bookings
 * Retrieve list of bookings, optionally filtered by status or email.
 */
router.get('/', (req, res) => {
  try {
    const db = getDb();
    const { status, email } = req.query;

    const conditions = [];
    const params = [];

    if (status && typeof status === 'string') {
      conditions.push('status = ?');
      params.push(status.trim().toUpperCase());
    }

    if (email && typeof email === 'string') {
      conditions.push('email = ?');
      params.push(email.trim().toLowerCase());
    }

    let query = 'SELECT * FROM bookings';
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }
    query += ' ORDER BY bookedAt DESC';

    const rawBookings = db.prepare(query).all(...params);

    const bookings = rawBookings.map((b) => ({
      ...b,
      currency: 'INR',
    }));

    res.json({ success: true, count: bookings.length, bookings });
  } catch (err) {
    console.error('Error retrieving bookings:', err.message);
    res.status(500).json({ success: false, error: 'Failed to retrieve bookings.' });
  }
});

/**
 * Cancellation handler logic shared between POST and DELETE.
 */
function handleCancelBooking(req, res) {
  const { id } = req.params;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ success: false, error: 'Booking identifier is required.' });
  }

  const db = getDb();
  let inTransaction = false;

  try {
    db.exec('BEGIN IMMEDIATE');
    inTransaction = true;

    // 1. Locate booking by UUID id or by ref
    const booking = db.prepare(`
      SELECT * FROM bookings WHERE id = ? OR ref = ?
    `).get(id, id);

    if (!booking) {
      db.exec('ROLLBACK');
      inTransaction = false;
      return res.status(404).json({ success: false, error: 'Booking not found.' });
    }

    // 2. Prevent repeated cancellation from restoring inventory twice
    if (booking.status === 'CANCELLED') {
      db.exec('ROLLBACK');
      inTransaction = false;
      return res.status(400).json({
        success: false,
        error: 'Booking has already been cancelled. Inventory cannot be restored repeatedly.',
      });
    }

    const cancelledAt = new Date().toISOString();

    // 3. Mark booking as CANCELLED
    const updateBookingResult = db.prepare(`
      UPDATE bookings
      SET status = 'CANCELLED', cancelledAt = ?
      WHERE id = ? AND status = 'CONFIRMED'
    `).run(cancelledAt, booking.id);

    if (updateBookingResult.changes !== 1) {
      db.exec('ROLLBACK');
      inTransaction = false;
      return res.status(400).json({
        success: false,
        error: 'Unable to cancel booking: status conflict.',
      });
    }

    // 4. Restore available inventory to event
    db.prepare(`
      UPDATE events
      SET available = available + ?
      WHERE id = ?
    `).run(booking.quantity, booking.eventId);

    db.exec('COMMIT');
    inTransaction = false;

    // Invalidate cached event listings
    cache.invalidatePattern('events:');

    const updatedBooking = {
      ...booking,
      currency: 'INR',
      status: 'CANCELLED',
      cancelledAt,
    };

    res.json({
      success: true,
      message: 'Booking cancelled successfully. Inventory restored.',
      booking: updatedBooking,
    });
  } catch (err) {
    if (inTransaction) {
      try {
        db.exec('ROLLBACK');
      } catch {
        // Ignore rollback failure
      }
    }
    console.error('Error cancelling booking:', err.message);
    res.status(500).json({ success: false, error: 'Failed to cancel booking.' });
  }
}

router.post('/:id/cancel', handleCancelBooking);
router.delete('/:id', handleCancelBooking);

export default router;
