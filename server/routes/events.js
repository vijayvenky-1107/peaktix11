import { Router } from 'express';
import { getDb } from '../db/database.js';
import { cache } from '../cache.js';

const router = Router();

/**
 * Calculates release-window status and seconds remaining for an event.
 */
function computeSaleWindow(saleStartStr) {
  if (!saleStartStr) {
    return { saleStatus: 'OPEN', secondsUntilSale: 0 };
  }

  const startTime = new Date(saleStartStr).getTime();
  const now = Date.now();

  if (Number.isNaN(startTime) || now >= startTime) {
    return { saleStatus: 'OPEN', secondsUntilSale: 0 };
  }

  const secondsUntilSale = Math.max(0, Math.round((startTime - now) / 1000));
  return { saleStatus: 'PENDING', secondsUntilSale };
}

/**
 * GET /api/events
 * Retrieve list of events with optional filtering and TTL in-memory caching.
 * Sends X-Cache, Cache-Control, and ETag response headers.
 */
router.get('/', (req, res) => {
  try {
    const { category, language, city, search, sort } = req.query;

    const cacheKey = `events:list:${category || ''}:${language || ''}:${city || ''}:${search || ''}:${sort || ''}`;
    const cached = cache.get(cacheKey);

    if (cached) {
      res.setHeader('X-Cache', 'HIT');
      res.setHeader('Cache-Control', 'public, max-age=30');
      res.setHeader('ETag', cached.etag);

      if (req.headers['if-none-match'] === cached.etag) {
        return res.status(304).end();
      }

      return res.json(cached.data);
    }

    const db = getDb();
    const conditions = [];
    const params = [];

    if (category && typeof category === 'string' && category !== 'All') {
      conditions.push('category = ?');
      params.push(category.trim());
    }

    if (language && typeof language === 'string' && language !== 'All Languages') {
      conditions.push('language LIKE ?');
      params.push(`%${language.trim()}%`);
    }

    if (city && typeof city === 'string' && city !== 'All Cities') {
      conditions.push('city = ?');
      params.push(city.trim());
    }

    if (search && typeof search === 'string' && search.trim() !== '') {
      const term = `%${search.trim().toLowerCase()}%`;
      conditions.push('(LOWER(title) LIKE ? OR LOWER(venue) LIKE ? OR LOWER(city) LIKE ? OR LOWER(category) LIKE ?)');
      params.push(term, term, term, term);
    }

    let query = 'SELECT * FROM events';
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    // Sorting
    if (sort === 'price_asc') {
      query += ' ORDER BY price ASC, id ASC';
    } else if (sort === 'price_desc') {
      query += ' ORDER BY price DESC, id ASC';
    } else if (sort === 'available') {
      query += ' ORDER BY available DESC, id ASC';
    } else {
      // Default: featured first, then id ASC
      query += ' ORDER BY featured DESC, id ASC';
    }

    const rows = db.prepare(query).all(...params);

    const events = rows.map((row) => {
      const saleInfo = computeSaleWindow(row.sale_start);
      return {
        ...row,
        featured: Boolean(row.featured),
        saleStatus: saleInfo.saleStatus,
        secondsUntilSale: saleInfo.secondsUntilSale,
      };
    });

    const responseData = { success: true, count: events.length, events };

    // Cache for 30 seconds
    cache.set(cacheKey, responseData, 30000);
    const entry = cache.store.get(cacheKey);

    res.setHeader('X-Cache', 'MISS');
    res.setHeader('Cache-Control', 'public, max-age=30');
    if (entry?.etag) {
      res.setHeader('ETag', entry.etag);
    }

    res.json(responseData);
  } catch (err) {
    console.error('Error fetching events:', err.message);
    res.status(500).json({ success: false, error: 'Failed to retrieve events.' });
  }
});

/**
 * GET /api/events/:id
 * Retrieve detail of a single event with TTL caching.
 */
router.get('/:id', (req, res) => {
  try {
    const eventId = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(eventId) || eventId <= 0) {
      return res.status(400).json({ success: false, error: 'Invalid event ID.' });
    }

    const cacheKey = `events:detail:${eventId}`;
    const cached = cache.get(cacheKey);

    if (cached) {
      res.setHeader('X-Cache', 'HIT');
      res.setHeader('Cache-Control', 'public, max-age=60');
      res.setHeader('ETag', cached.etag);

      if (req.headers['if-none-match'] === cached.etag) {
        return res.status(304).end();
      }

      return res.json(cached.data);
    }

    const db = getDb();
    const row = db.prepare('SELECT * FROM events WHERE id = ?').get(eventId);

    if (!row) {
      return res.status(404).json({ success: false, error: 'Event not found.' });
    }

    const saleInfo = computeSaleWindow(row.sale_start);

    const event = {
      ...row,
      featured: Boolean(row.featured),
      saleStatus: saleInfo.saleStatus,
      secondsUntilSale: saleInfo.secondsUntilSale,
    };

    const responseData = { success: true, event };

    // Cache for 60 seconds
    cache.set(cacheKey, responseData, 60000);
    const entry = cache.store.get(cacheKey);

    res.setHeader('X-Cache', 'MISS');
    res.setHeader('Cache-Control', 'public, max-age=60');
    if (entry?.etag) {
      res.setHeader('ETag', entry.etag);
    }

    res.json(responseData);
  } catch (err) {
    console.error('Error fetching event detail:', err.message);
    res.status(500).json({ success: false, error: 'Failed to retrieve event details.' });
  }
});

export default router;
