import { Router } from 'express';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { getDb } from '../db/database.js';

const router = Router();

// In-memory rate limiter maps for auth routes
const authRateMap = new Map();
const otpRateMap = new Map();

function checkRateLimit(key, maxRequests = 10, windowMs = 60000) {
  const now = Date.now();
  const record = authRateMap.get(key) || { count: 0, resetAt: now + windowMs };

  if (now > record.resetAt) {
    record.count = 1;
    record.resetAt = now + windowMs;
    authRateMap.set(key, record);
    return true;
  }

  record.count++;
  authRateMap.set(key, record);

  return record.count <= maxRequests;
}

function checkOtpRateLimit(target) {
  const now = Date.now();
  const record = otpRateMap.get(target);
  if (record && now - record.lastSent < 30000) {
    return false;
  }
  otpRateMap.set(target, { lastSent: now });
  return true;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[6-9]\d{9}$/;

/**
 * Authentication Middleware helper
 * Extracts session from either httpOnly cookie or Authorization Bearer header.
 */
export function authenticateUser(req) {
  let token = null;

  // 1. Check cookies
  if (req.cookies && req.cookies.ptx_session) {
    token = req.cookies.ptx_session;
  } else if (req.signedCookies && req.signedCookies.ptx_session) {
    token = req.signedCookies.ptx_session;
  }

  // 2. Check Authorization header
  if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.slice(7).trim();
  }

  if (!token) {
    return null;
  }

  try {
    const db = getDb();
    const session = db.prepare(`
      SELECT s.*, u.name, u.email, u.phone, u.address
      FROM sessions s
      JOIN users u ON s.userId = u.id
      WHERE s.token = ?
    `).get(token);

    if (!session) return null;

    if (new Date(session.expiresAt) < new Date()) {
      db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
      return null;
    }

    return {
      id: session.userId,
      name: session.name,
      email: session.email,
      phone: session.phone,
      address: session.address,
    };
  } catch {
    return null;
  }
}

/**
 * Helper to set standard session cookie
 */
function setSessionCookie(res, token) {
  const isCrossSite = process.env.CROSS_SITE === 'true';
  const isProduction = process.env.NODE_ENV === 'production';
  res.cookie('ptx_session', token, {
    httpOnly: true,
    sameSite: isCrossSite ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    secure: isCrossSite || isProduction,
  });
}

/**
 * POST /api/auth/register
 * New User Registration with password hashing.
 */
router.post('/register', async (req, res) => {
  const ip = req.ip || req.socket.remoteAddress || 'ip';
  if (!checkRateLimit(`reg:${ip}`, 15, 60000)) {
    return res.status(429).json({ success: false, error: 'Too many registration requests. Please wait a moment.' });
  }

  try {
    const { name, address, email, phone, password, confirmPassword } = req.body || {};

    // 1. Required fields
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return res.status(400).json({ success: false, error: 'Full name is required (at least 2 characters).' });
    }
    if (!address || typeof address !== 'string' || address.trim().length < 3) {
      return res.status(400).json({ success: false, error: 'Address is required (at least 3 characters).' });
    }
    if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
      return res.status(400).json({ success: false, error: 'A valid email address is required.' });
    }
    if (!phone || typeof phone !== 'string' || !PHONE_REGEX.test(phone.trim())) {
      return res.status(400).json({ success: false, error: 'A valid 10-digit Indian mobile number is required.' });
    }
    if (!password || typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({ success: false, error: 'Password must be at least 8 characters long.' });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ success: false, error: 'Passwords do not match.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone.trim();
    const cleanName = name.trim();
    const cleanAddress = address.trim();

    const db = getDb();

    // 2. Uniqueness check
    const existingEmail = db.prepare('SELECT id FROM users WHERE LOWER(email) = LOWER(?)').get(cleanEmail);
    if (existingEmail) {
      return res.status(400).json({ success: false, error: 'An account with this email address already exists.' });
    }

    const existingPhone = db.prepare('SELECT id FROM users WHERE phone = ?').get(cleanPhone);
    if (existingPhone) {
      return res.status(400).json({ success: false, error: 'An account with this phone number already exists.' });
    }

    // 3. Hash password using bcrypt
    const passwordHash = await bcrypt.hash(password, 10);
    const userId = `usr_${crypto.randomUUID()}`;
    const nowIso = new Date().toISOString();

    db.prepare(`
      INSERT INTO users (id, name, address, email, phone, password_hash, created_at, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(userId, cleanName, cleanAddress, cleanEmail, cleanPhone, passwordHash, nowIso, nowIso);

    // 4. Create server-managed session
    const token = `ptx_sess_${crypto.randomBytes(32).toString('hex')}`;
    const sessionExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    db.prepare(`
      INSERT INTO sessions (token, userId, expiresAt, createdAt)
      VALUES (?, ?, ?, ?)
    `).run(token, userId, sessionExpiresAt, nowIso);

    setSessionCookie(res, token);

    const safeUser = {
      id: userId,
      name: cleanName,
      address: cleanAddress,
      email: cleanEmail,
      phone: cleanPhone,
    };

    res.status(201).json({
      success: true,
      message: 'Account registered successfully.',
      token,
      user: safeUser,
    });
  } catch (err) {
    console.error('Registration error:', err.message);
    res.status(500).json({ success: false, error: 'Registration failed due to a server error.' });
  }
});

/**
 * POST /api/auth/login
 * Existing User Login (Email or Phone + Password).
 */
router.post('/login', async (req, res) => {
  const ip = req.ip || req.socket.remoteAddress || 'ip';
  const { identifier, emailOrPhone, password } = req.body || {};
  const loginTarget = (identifier || emailOrPhone || '').trim();

  if (!checkRateLimit(`login:${ip}:${loginTarget}`, 10, 60000)) {
    return res.status(429).json({ success: false, error: 'Too many login attempts. Please wait 1 minute.' });
  }

  if (!loginTarget || !password) {
    return res.status(400).json({ success: false, error: 'Phone/email and password are required.' });
  }

  try {
    const db = getDb();
    const isEmail = loginTarget.includes('@');

    // Query user by email or phone
    const user = isEmail
      ? db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)').get(loginTarget.toLowerCase())
      : db.prepare('SELECT * FROM users WHERE phone = ?').get(loginTarget);

    // Generic error message for both non-existent user and wrong password
    const GENERIC_ERROR = 'Invalid phone/email or password.';

    if (!user || !user.password_hash) {
      return res.status(401).json({ success: false, error: GENERIC_ERROR });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: GENERIC_ERROR });
    }

    // Create session
    const token = `ptx_sess_${crypto.randomBytes(32).toString('hex')}`;
    const nowIso = new Date().toISOString();
    const sessionExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    db.prepare(`
      INSERT INTO sessions (token, userId, expiresAt, createdAt)
      VALUES (?, ?, ?, ?)
    `).run(token, user.id, sessionExpiresAt, nowIso);

    setSessionCookie(res, token);

    const safeUser = {
      id: user.id,
      name: user.name,
      address: user.address,
      email: user.email,
      phone: user.phone,
    };

    res.json({
      success: true,
      message: 'Signed in successfully.',
      token,
      user: safeUser,
    });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ success: false, error: 'Login failed due to a server error.' });
  }
});

/**
 * GET /api/auth/me
 * Retrieve currently logged-in user profile.
 */
router.get('/me', (req, res) => {
  const user = authenticateUser(req);
  if (!user) {
    return res.status(401).json({ success: false, error: 'Unauthorized or session expired.' });
  }
  res.json({ success: true, user });
});

/**
 * POST /api/auth/logout
 * Terminate active user session and clear cookie.
 */
router.post('/logout', (req, res) => {
  let token = null;
  if (req.cookies && req.cookies.ptx_session) {
    token = req.cookies.ptx_session;
  } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.slice(7).trim();
  }

  if (token) {
    try {
      getDb().prepare('DELETE FROM sessions WHERE token = ?').run(token);
    } catch {
      // Ignore
    }
  }

  const isCrossSite = process.env.CROSS_SITE === 'true';
  const isProduction = process.env.NODE_ENV === 'production';
  res.clearCookie('ptx_session', {
    httpOnly: true,
    sameSite: isCrossSite ? 'none' : 'lax',
    secure: isCrossSite || isProduction,
  });
  res.json({ success: true, message: 'Logged out successfully.' });
});

/**
 * GET /api/auth/my-bookings
 * Protected endpoint returning bookings belonging strictly to the authenticated user.
 */
router.get('/my-bookings', (req, res) => {
  const user = authenticateUser(req);
  if (!user) {
    return res.status(401).json({ success: false, error: 'Unauthorized. Please sign in to view your bookings.' });
  }

  try {
    const db = getDb();

    // Query movie bookings belonging strictly to this user
    const movieBookings = db.prepare(`
      SELECT * FROM movie_bookings
      WHERE userId = ? OR email = ?
      ORDER BY bookedAt DESC
    `).all(user.id, user.email || '');

    const parsedMovieBookings = movieBookings.map((b) => ({
      ...b,
      seats: JSON.parse(b.seats || '[]'),
      type: 'MOVIE',
    }));

    // Query event bookings belonging strictly to this user
    const eventBookings = db.prepare(`
      SELECT * FROM bookings
      WHERE email = ?
      ORDER BY bookedAt DESC
    `).all(user.email || '');

    const parsedEventBookings = eventBookings.map((b) => ({
      ...b,
      type: 'EVENT',
    }));

    res.json({
      success: true,
      user: { id: user.id, name: user.name, email: user.email },
      movieBookings: parsedMovieBookings,
      eventBookings: parsedEventBookings,
      totalCount: parsedMovieBookings.length + parsedEventBookings.length,
    });
  } catch (err) {
    console.error('Error fetching user bookings:', err.message);
    res.status(500).json({ success: false, error: 'Failed to retrieve account bookings.' });
  }
});

// ==========================================
// PRESERVED OTP ENDPOINTS (Backward Compatibility)
// ==========================================

router.post('/otp/send', (req, res) => {
  try {
    const { target } = req.body || {};
    if (!target || typeof target !== 'string') {
      return res.status(400).json({ success: false, error: 'Email or 10-digit phone number is required.' });
    }

    const cleanTarget = target.trim();
    const isEmail = EMAIL_REGEX.test(cleanTarget);
    const isPhone = PHONE_REGEX.test(cleanTarget);

    if (!isEmail && !isPhone) {
      return res.status(400).json({
        success: false,
        error: 'Please enter a valid email address or 10-digit Indian mobile number (starting with 6-9).',
      });
    }

    if (!checkOtpRateLimit(cleanTarget)) {
      return res.status(429).json({
        success: false,
        error: 'Too many OTP requests. Please wait 30 seconds before requesting a new code.',
      });
    }

    const otpCode = crypto.randomInt(100000, 999999).toString();
    const hashedCode = crypto.createHash('sha256').update(otpCode).digest('hex');
    const expiresAt = Date.now() + 5 * 60 * 1000;

    const db = getDb();
    db.prepare(`
      INSERT INTO otps (target, code, expiresAt, attempts)
      VALUES (?, ?, ?, 0)
      ON CONFLICT(target) DO UPDATE SET
        code = excluded.code,
        expiresAt = excluded.expiresAt,
        attempts = 0
    `).run(cleanTarget, hashedCode, expiresAt);

    console.log(`[AUTH-DEV] Generated 6-digit OTP for ${cleanTarget}: ${otpCode}`);

    res.json({
      success: true,
      message: `Verification code sent to ${cleanTarget}.`,
      target: cleanTarget,
      targetType: isEmail ? 'email' : 'phone',
      devOtpHint: process.env.NODE_ENV === 'production' ? undefined : otpCode,
    });
  } catch (err) {
    console.error('Error sending OTP:', err.message);
    res.status(500).json({ success: false, error: 'Failed to dispatch verification code.' });
  }
});

router.post('/otp/verify', (req, res) => {
  try {
    const { target, code, name } = req.body || {};
    if (!target || !code) {
      return res.status(400).json({ success: false, error: 'Target and verification code are required.' });
    }

    const cleanTarget = target.trim();
    const cleanCode = code.trim();
    const db = getDb();

    const otpRow = db.prepare('SELECT * FROM otps WHERE target = ?').get(cleanTarget);
    if (!otpRow) {
      return res.status(400).json({ success: false, error: 'No verification code was requested for this target.' });
    }

    if (Date.now() > otpRow.expiresAt) {
      db.prepare('DELETE FROM otps WHERE target = ?').run(cleanTarget);
      return res.status(400).json({ success: false, error: 'Verification code has expired. Please request a new one.' });
    }

    const inputHash = crypto.createHash('sha256').update(cleanCode).digest('hex');
    if (inputHash !== otpRow.code) {
      db.prepare('UPDATE otps SET attempts = attempts + 1 WHERE target = ?').run(cleanTarget);
      return res.status(400).json({ success: false, error: 'Invalid verification code. Please check and retry.' });
    }

    db.prepare('DELETE FROM otps WHERE target = ?').run(cleanTarget);

    const isEmail = cleanTarget.includes('@');
    let user = isEmail
      ? db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)').get(cleanTarget.toLowerCase())
      : db.prepare('SELECT * FROM users WHERE phone = ?').get(cleanTarget);

    if (!user) {
      const newUserId = `usr_${crypto.randomUUID()}`;
      const fallbackName = name ? name.trim() : (isEmail ? cleanTarget.split('@')[0] : `User-${cleanTarget.slice(-4)}`);
      const now = new Date().toISOString();

      db.prepare(`
        INSERT INTO users (id, name, address, email, phone, created_at, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(newUserId, fallbackName, 'India', isEmail ? cleanTarget.toLowerCase() : null, isEmail ? null : cleanTarget, now, now);

      user = {
        id: newUserId,
        name: fallbackName,
        email: isEmail ? cleanTarget.toLowerCase() : null,
        phone: isEmail ? null : cleanTarget,
      };
    }

    const sessionToken = `ptx_sess_${crypto.randomBytes(32).toString('hex')}`;
    const expiresAtIso = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const nowIso = new Date().toISOString();

    db.prepare(`
      INSERT INTO sessions (token, userId, expiresAt, createdAt)
      VALUES (?, ?, ?, ?)
    `).run(sessionToken, user.id, expiresAtIso, nowIso);

    setSessionCookie(res, sessionToken);

    res.json({
      success: true,
      message: 'Authentication successful.',
      token: sessionToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
      },
    });
  } catch (err) {
    console.error('Error verifying OTP:', err.message);
    res.status(500).json({ success: false, error: 'Verification failed. Please try again.' });
  }
});

export default router;
