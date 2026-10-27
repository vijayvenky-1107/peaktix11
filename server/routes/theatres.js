import { Router } from 'express';
import { getDb } from '../db/database.js';
import { moviesData, showtimeSlots } from '../data/moviesData.js';

const router = Router();

/**
 * GET /api/theatres
 * Retrieve 50+ Indian theatre records with city, chain, format, and search filtering.
 */
router.get('/', (req, res) => {
  try {
    const db = getDb();
    const { city, search, chain, premiumOnly } = req.query;

    const conditions = [];
    const params = [];

    if (city && typeof city === 'string' && city !== 'All Cities' && city !== 'All') {
      conditions.push('city = ?');
      params.push(city.trim());
    }

    if (chain && typeof chain === 'string' && chain !== 'All') {
      conditions.push('chain = ?');
      params.push(chain.trim());
    }

    if (premiumOnly === 'true' || premiumOnly === '1') {
      conditions.push('isPremiumFormat = 1');
    }

    if (search && typeof search === 'string' && search.trim() !== '') {
      const term = `%${search.trim().toLowerCase()}%`;
      conditions.push('(LOWER(name) LIKE ? OR LOWER(area) LIKE ? OR LOWER(city) LIKE ? OR LOWER(chain) LIKE ?)');
      params.push(term, term, term, term);
    }

    let query = 'SELECT * FROM theatres';
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }
    query += ' ORDER BY city ASC, name ASC';

    const rows = db.prepare(query).all(...params);

    const theatres = rows.map((row) => ({
      ...row,
      screenFormats: JSON.parse(row.screenFormats || '[]'),
      facilities: JSON.parse(row.facilities || '[]'),
      isPremiumFormat: Boolean(row.isPremiumFormat),
    }));

    res.json({
      success: true,
      count: theatres.length,
      theatres,
    });
  } catch (err) {
    console.error('Error fetching theatres:', err.message);
    res.status(500).json({ success: false, error: 'Failed to retrieve theatre listings.' });
  }
});

/**
 * GET /api/theatres/:id
 * Retrieve single theatre detail with screen formats, facilities, and running movie showtimes.
 */
router.get('/:id', (req, res) => {
  try {
    const theatreId = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(theatreId) || theatreId <= 0) {
      return res.status(400).json({ success: false, error: 'Invalid theatre ID.' });
    }

    const db = getDb();
    const row = db.prepare('SELECT * FROM theatres WHERE id = ?').get(theatreId);

    if (!row) {
      return res.status(404).json({ success: false, error: 'Theatre not found.' });
    }

    const screenFormats = JSON.parse(row.screenFormats || '[]');
    const facilities = JSON.parse(row.facilities || '[]');

    // Generate demo showtimes for currently playing movies at this cinema
    const nowPlaying = moviesData.slice(0, 4).map((m) => {
      const format = screenFormats[0] || '2D Digital';
      return {
        movieId: m.id,
        movieTitle: m.title,
        moviePoster: m.poster,
        certification: m.certification,
        languages: m.languages,
        duration: m.duration,
        format,
        shows: showtimeSlots.map((slot) => ({
          time: slot.time,
          type: slot.type,
          priceStandard: m.basePriceStandard,
          pricePremium: m.basePricePremium,
          availableSeats: 64,
          demoStatus: 'Illustrative Demo Showtime',
        })),
      };
    });

    res.json({
      success: true,
      theatre: {
        ...row,
        screenFormats,
        facilities,
        isPremiumFormat: Boolean(row.isPremiumFormat),
        nowPlaying,
      },
    });
  } catch (err) {
    console.error('Error fetching theatre detail:', err.message);
    res.status(500).json({ success: false, error: 'Failed to retrieve theatre details.' });
  }
});

export default router;
