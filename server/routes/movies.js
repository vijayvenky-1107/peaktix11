import { Router } from 'express';
import { getDb } from '../db/database.js';
import { showtimeSlots } from '../data/moviesData.js';

const router = Router();

/**
 * GET /api/movies
 * List movies with filters for language, genre, search, and trending/featured status.
 */
router.get('/', (req, res) => {
  try {
    const db = getDb();
    const { language, genre, search, trending } = req.query;

    const conditions = [];
    const params = [];

    if (language && typeof language === 'string' && language !== 'All Languages' && language !== 'All') {
      conditions.push('languages LIKE ?');
      params.push(`%"${language.trim()}"%`);
    }

    if (genre && typeof genre === 'string' && genre !== 'All') {
      conditions.push('genre LIKE ?');
      params.push(`%"${genre.trim()}"%`);
    }

    if (trending === 'true' || trending === '1') {
      conditions.push('trending = 1');
    }

    if (search && typeof search === 'string' && search.trim() !== '') {
      const term = `%${search.trim().toLowerCase()}%`;
      conditions.push('(LOWER(title) LIKE ? OR LOWER(director) LIKE ? OR LOWER(cast) LIKE ?)');
      params.push(term, term, term);
    }

    let query = 'SELECT * FROM movies';
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }
    query += ' ORDER BY trending DESC, rating DESC, title ASC';

    const rows = db.prepare(query).all(...params);

    const movies = rows.map((row) => ({
      ...row,
      languages: JSON.parse(row.languages || '[]'),
      genre: JSON.parse(row.genre || '[]'),
      cast: JSON.parse(row.cast || '[]'),
      formats: JSON.parse(row.formats || '[]'),
      featured: Boolean(row.featured),
      trending: Boolean(row.trending),
    }));

    res.json({
      success: true,
      count: movies.length,
      movies,
    });
  } catch (err) {
    console.error('Error fetching movies:', err.message);
    res.status(500).json({ success: false, error: 'Failed to retrieve movie listings.' });
  }
});

/**
 * GET /api/movies/:id
 * Retrieve single movie detail with showtimes across theatres in a specified city.
 */
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const city = req.query.city || 'Mumbai';

    const db = getDb();
    const row = db.prepare('SELECT * FROM movies WHERE id = ?').get(id);

    if (!row) {
      return res.status(404).json({ success: false, error: 'Movie not found.' });
    }

    const movie = {
      ...row,
      languages: JSON.parse(row.languages || '[]'),
      genre: JSON.parse(row.genre || '[]'),
      cast: JSON.parse(row.cast || '[]'),
      formats: JSON.parse(row.formats || '[]'),
      featured: Boolean(row.featured),
      trending: Boolean(row.trending),
    };

    // Find theatres in the selected city (or fallback to top 3 if city has few)
    let theatresInCity = db.prepare('SELECT * FROM theatres WHERE city = ? LIMIT 6').all(city);
    if (!theatresInCity || theatresInCity.length === 0) {
      theatresInCity = db.prepare('SELECT * FROM theatres LIMIT 4').all();
    }

    // Attach showtime schedules with seat pricing and formats
    const showtimesByTheatre = theatresInCity.map((th) => {
      const screenFormats = JSON.parse(th.screenFormats || '[]');
      const chosenFormat = screenFormats[0] || 'Dolby Atmos';

      return {
        theatreId: th.id,
        theatreName: th.name,
        chain: th.chain,
        city: th.city,
        area: th.area,
        address: th.address,
        screenFormat: chosenFormat,
        isPremiumFormat: Boolean(th.isPremiumFormat),
        shows: showtimeSlots.map((slot) => {
          let standardPrice = movie.basePriceStandard;
          let premiumPrice = movie.basePricePremium;

          if (slot.discountPercent > 0) {
            standardPrice = Math.round(standardPrice * (1 - slot.discountPercent / 100));
            premiumPrice = Math.round(premiumPrice * (1 - slot.discountPercent / 100));
          }

          return {
            showId: `${th.id}-${slot.time.replace(/[^a-zA-Z0-9]/g, '')}`,
            time: slot.time,
            type: slot.type,
            priceStandard: standardPrice,
            pricePremium: premiumPrice,
            screenFormat: chosenFormat,
            availableSeatsCount: 58,
            demoStatus: 'Illustrative Demo Showtime',
          };
        }),
      };
    });

    res.json({
      success: true,
      movie,
      selectedCity: city,
      showtimesByTheatre,
    });
  } catch (err) {
    console.error('Error fetching movie detail:', err.message);
    res.status(500).json({ success: false, error: 'Failed to retrieve movie details.' });
  }
});

export default router;
