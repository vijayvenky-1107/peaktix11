import { Router } from 'express';
import crypto from 'node:crypto';
import { getDb } from '../db/database.js';
import { calculateBackendDiscount } from '../data/offersData.js';
import { authenticateUser } from './auth.js';

const router = Router();

function generateBookingRef() {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  const bytes = crypto.randomBytes(6);
  let ref = 'PMB-';
  for (let i = 0; i < 6; i++) {
    ref += chars[bytes[i] % chars.length];
  }
  return ref;
}

/**
 * POST /api/movie-bookings
 * Create a movie ticket reservation.
 */
router.post('/', (req, res) => {
  try {
    const {
      movieId,
      theatreId,
      screenFormat,
      showDate,
      showTime,
      tier,
      seats,
      name,
      email,
      phone,
      paymentMethod,
      offerCode,
    } = req.body || {};

    // Basic required validations
    if (!movieId || !theatreId || !showDate || !showTime) {
      return res.status(400).json({ success: false, error: 'Movie, theatre, date, and showtime are required.' });
    }

    if (!Array.isArray(seats) || seats.length === 0 || seats.length > 8) {
      return res.status(400).json({ success: false, error: 'Please select between 1 and 8 seats.' });
    }

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return res.status(400).json({ success: false, error: 'A valid customer name is required.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email.trim())) {
      return res.status(400).json({ success: false, error: 'A valid email address is required for ticket delivery.' });
    }

    const validTiers = ['STANDARD', 'PREMIUM'];
    const chosenTier = (tier && validTiers.includes(tier.toUpperCase())) ? tier.toUpperCase() : 'STANDARD';

    const validPaymentMethods = ['UPI', 'DEBIT_CARD', 'CREDIT_CARD', 'DEMO_PAY'];
    const chosenPayment = (paymentMethod && validPaymentMethods.includes(paymentMethod.toUpperCase()))
      ? paymentMethod.toUpperCase()
      : 'UPI';

    const db = getDb();

    // Verify Movie exists
    const movie = db.prepare('SELECT * FROM movies WHERE id = ?').get(movieId);
    if (!movie) {
      return res.status(404).json({ success: false, error: 'Selected movie not found.' });
    }

    // Verify Theatre exists
    const theatre = db.prepare('SELECT * FROM theatres WHERE id = ?').get(theatreId);
    if (!theatre) {
      return res.status(404).json({ success: false, error: 'Selected cinema not found.' });
    }

    // Determine seat price strictly on server
    const pricePerSeat = chosenTier === 'PREMIUM'
      ? movie.basePricePremium
      : movie.basePriceStandard;

    const quantity = seats.length;
    const subtotal = pricePerSeat * quantity;

    // Standard convenience fee: ₹25 base + ₹4.5 GST per ticket (approx ₹30/ticket)
    const convenienceFee = quantity * 30;

    // Apply Backend Offer Discount if provided
    let discount = 0;
    let appliedOffer = null;
    if (offerCode) {
      const offerResult = calculateBackendDiscount(offerCode, subtotal, 'Movies', quantity);
      if (offerResult.valid) {
        discount = offerResult.discount;
        appliedOffer = offerResult.offer;
      }
    }

    // Final total calculation in integer INR
    const finalTotal = Math.max(0, subtotal + convenienceFee - discount);

    // Optional user attachment from session (never trusts client-supplied userId)
    const authUser = authenticateUser(req);
    if (req.headers['x-require-auth'] === 'true' && !authUser) {
      return res.status(401).json({ success: false, error: 'Authentication required to book movie tickets.' });
    }
    const userId = authUser ? authUser.id : null;

    const bookingId = crypto.randomUUID();
    const bookingRef = generateBookingRef();
    const bookedAt = new Date().toISOString();

    db.exec('BEGIN IMMEDIATE');
    try {
      // Check if any of the selected seats are already booked for this theatre/movie/date/time
      const existingBookings = db.prepare(`
        SELECT seats FROM movie_bookings
        WHERE theatreId = ? AND movieId = ? AND showDate = ? AND showTime = ? AND status = 'CONFIRMED'
      `).all(theatreId, movieId, showDate, showTime);

      const alreadyBookedSeats = new Set();
      for (const row of existingBookings) {
        const bookedList = JSON.parse(row.seats || '[]');
        for (const s of bookedList) {
          alreadyBookedSeats.add(s);
        }
      }

      for (const seat of seats) {
        if (alreadyBookedSeats.has(seat)) {
          db.exec('ROLLBACK');
          return res.status(409).json({
            success: false,
            error: `Seat ${seat} has just been reserved by another guest. Please select alternative seats.`,
          });
        }
      }

      // Insert booking record
      db.prepare(`
        INSERT INTO movie_bookings (
          id, ref, movieId, movieTitle, theatreId, theatreName, city, screenFormat,
          showDate, showTime, tier, seats, quantity, subtotal, convenienceFee, discount,
          offerCode, total, paymentMethod, paymentStatus, name, email, phone, userId,
          status, bookedAt
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?, ?, ?,
          'CONFIRMED', ?
        )
      `).run(
        bookingId,
        bookingRef,
        movie.id,
        movie.title,
        theatre.id,
        theatre.name,
        theatre.city,
        screenFormat || 'Dolby Atmos',
        showDate,
        showTime,
        chosenTier,
        JSON.stringify(seats),
        quantity,
        subtotal,
        convenienceFee,
        discount,
        appliedOffer ? appliedOffer.code : null,
        finalTotal,
        chosenPayment,
        'DEMO_PAID',
        name.trim(),
        email.trim().toLowerCase(),
        phone ? phone.trim() : null,
        userId,
        bookedAt
      );

      db.exec('COMMIT');

      res.status(201).json({
        success: true,
        message: 'Movie tickets successfully confirmed!',
        booking: {
          id: bookingId,
          ref: bookingRef,
          movieTitle: movie.title,
          theatreName: theatre.name,
          theatreAddress: theatre.address,
          city: theatre.city,
          screenFormat: screenFormat || 'Dolby Atmos',
          showDate,
          showTime,
          tier: chosenTier,
          seats,
          quantity,
          subtotal,
          convenienceFee,
          discount,
          appliedOffer,
          total: finalTotal,
          currency: 'INR',
          paymentMethod: chosenPayment,
          paymentStatus: 'DEMO_PAID (Demonstration Transaction)',
          name: name.trim(),
          email: email.trim().toLowerCase(),
          bookedAt,
          demoNotice: 'Demonstration booking. No monetary charges were collected.',
        },
      });
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
  } catch (err) {
    console.error('Error creating movie booking:', err.message);
    res.status(500).json({ success: false, error: 'Failed to process movie booking.' });
  }
});

/**
 * GET /api/movie-bookings/:ref
 * Retrieve movie booking by reference or ID.
 */
router.get('/:ref', (req, res) => {
  try {
    const { ref } = req.params;
    const db = getDb();
    const row = db.prepare('SELECT * FROM movie_bookings WHERE ref = ? OR id = ?').get(ref, ref);

    if (!row) {
      return res.status(404).json({ success: false, error: 'Movie booking not found.' });
    }

    res.json({
      success: true,
      booking: {
        ...row,
        seats: JSON.parse(row.seats || '[]'),
      },
    });
  } catch (err) {
    console.error('Error fetching movie booking:', err.message);
    res.status(500).json({ success: false, error: 'Failed to retrieve movie booking.' });
  }
});

/**
 * POST /api/movie-bookings/:ref/cancel
 * Cancel a movie booking.
 */
router.post('/:ref/cancel', (req, res) => {
  try {
    const { ref } = req.params;
    const db = getDb();

    db.exec('BEGIN IMMEDIATE');
    try {
      const booking = db.prepare('SELECT * FROM movie_bookings WHERE ref = ? OR id = ?').get(ref, ref);
      if (!booking) {
        db.exec('ROLLBACK');
        return res.status(404).json({ success: false, error: 'Movie booking not found.' });
      }

      if (booking.status === 'CANCELLED') {
        db.exec('ROLLBACK');
        return res.status(400).json({ success: false, error: 'Booking has already been cancelled.' });
      }

      const cancelledAt = new Date().toISOString();
      db.prepare("UPDATE movie_bookings SET status = 'CANCELLED', cancelledAt = ? WHERE id = ?").run(cancelledAt, booking.id);

      db.exec('COMMIT');

      res.json({
        success: true,
        message: 'Movie booking successfully cancelled. Seats have been released.',
        booking: {
          ...booking,
          status: 'CANCELLED',
          cancelledAt,
          seats: JSON.parse(booking.seats || '[]'),
        },
      });
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
  } catch (err) {
    console.error('Error cancelling movie booking:', err.message);
    res.status(500).json({ success: false, error: 'Failed to cancel movie booking.' });
  }
});

export default router;
