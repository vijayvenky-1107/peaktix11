import { Router } from 'express';
import { experiencesData } from '../data/experiencesData.js';

const router = Router();

/**
 * GET /api/experiences
 * List experiences with filtering by category, city, search, and featured status.
 */
router.get('/', (req, res) => {
  try {
    const { category, city, search, featured } = req.query;

    let items = [...experiencesData];

    if (category && category !== 'All' && category !== 'All Categories') {
      items = items.filter((item) =>
        item.category.toLowerCase().includes(category.toLowerCase().trim())
      );
    }

    if (city && city !== 'All Cities' && city !== 'All') {
      items = items.filter((item) =>
        item.city.toLowerCase() === city.toLowerCase().trim()
      );
    }

    if (featured === 'true' || featured === '1') {
      items = items.filter((item) => item.featured);
    }

    if (search && typeof search === 'string' && search.trim() !== '') {
      const term = search.trim().toLowerCase();
      items = items.filter(
        (item) =>
          item.title.toLowerCase().includes(term) ||
          item.venue.toLowerCase().includes(term) ||
          item.city.toLowerCase().includes(term) ||
          item.category.toLowerCase().includes(term) ||
          item.description.toLowerCase().includes(term)
      );
    }

    res.json({
      success: true,
      count: items.length,
      experiences: items,
    });
  } catch (err) {
    console.error('Error fetching experiences:', err.message);
    res.status(500).json({ success: false, error: 'Failed to retrieve experiences.' });
  }
});

/**
 * GET /api/experiences/:id
 * Retrieve details for a single experience.
 */
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const item = experiencesData.find((exp) => exp.id === id);

    if (!item) {
      return res.status(404).json({ success: false, error: 'Experience not found.' });
    }

    res.json({
      success: true,
      experience: item,
    });
  } catch (err) {
    console.error('Error fetching experience detail:', err.message);
    res.status(500).json({ success: false, error: 'Failed to retrieve experience details.' });
  }
});

export default router;
