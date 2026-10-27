import { Router } from 'express';
import { offersData, calculateBackendDiscount } from '../data/offersData.js';

const router = Router();

/**
 * GET /api/offers
 * List active bank promotions, card offers, and discount codes.
 */
router.get('/', (req, res) => {
  try {
    res.json({
      success: true,
      count: offersData.length,
      offers: offersData,
    });
  } catch (err) {
    console.error('Error fetching offers:', err.message);
    res.status(500).json({ success: false, error: 'Failed to retrieve offers.' });
  }
});

/**
 * POST /api/offers/validate
 * Validates offer code and calculates discount amount strictly on the backend.
 * Body: { code: string, subtotal: number, category?: string, quantity?: number }
 */
router.post('/validate', (req, res) => {
  try {
    const { code, subtotal, category, quantity } = req.body || {};

    const numSubtotal = Number.parseInt(subtotal, 10);
    const numQty = Number.parseInt(quantity, 10) || 1;

    if (!Number.isInteger(numSubtotal) || numSubtotal <= 0) {
      return res.status(400).json({ success: false, error: 'Subtotal must be a positive integer.' });
    }

    const result = calculateBackendDiscount(code, numSubtotal, category || 'All', numQty);

    if (!result.valid) {
      return res.status(400).json({
        success: false,
        error: result.error || 'Offer code is not valid for this order.',
      });
    }

    res.json({
      success: true,
      discount: result.discount,
      offer: result.offer,
      payableSubtotal: numSubtotal - result.discount,
    });
  } catch (err) {
    console.error('Error validating offer:', err.message);
    res.status(500).json({ success: false, error: 'Failed to validate offer.' });
  }
});

export default router;
