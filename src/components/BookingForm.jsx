import React, { useState } from 'react';
import { formatINR } from '../utils/formatters.js';

export default function BookingForm({ event, remainingTickets, onBook, queueToken }) {
  const [quantity, setQuantity] = useState(1);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const priceEach = event.price;
  const totalPrice = priceEach * quantity;
  const isSoldOut = remainingTickets <= 0;

  const handleQuantityChange = (delta) => {
    setQuantity((prev) => {
      const next = prev + delta;
      if (next < 1) return 1;
      if (next > remainingTickets) return remainingTickets;
      return next;
    });
    if (errors.quantity) {
      setErrors((prev) => ({ ...prev, quantity: null }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};

    if (!name.trim()) {
      newErrors.name = 'Please enter your full name.';
    }

    if (!email.trim()) {
      newErrors.email = 'Please enter your email address.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      newErrors.email = 'Please enter a valid email address (e.g. name@example.in).';
    }

    if (quantity < 1) {
      newErrors.quantity = 'Please select at least 1 ticket.';
    } else if (quantity > remainingTickets) {
      newErrors.quantity = `Only ${remainingTickets} ticket${remainingTickets === 1 ? '' : 's'} available.`;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    try {
      const result = await onBook({
        event,
        quantity,
        name: name.trim(),
        email: email.trim(),
        queueToken,
      });

      if (result && !result.success) {
        setErrors({ form: result.error || 'Booking could not be processed.' });
      }
    } catch (err) {
      setErrors({ form: err.message || 'An error occurred while processing your booking.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={styles.card}>
      <style>{`
        .ptx-qty-btn:hover:not(:disabled) {
          background: #334155 !important;
          color: #FFFFFF !important;
        }
        .ptx-qty-btn:disabled {
          opacity: 0.35;
          cursor: not-allowed;
        }
        .ptx-book-submit:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(225, 29, 72, 0.45) !important;
        }
        .ptx-input:focus {
          border-color: #F43F5E !important;
          outline: none;
          box-shadow: 0 0 0 3px rgba(244, 63, 94, 0.2) !important;
        }
      `}</style>

      <div style={styles.header}>
        <div>
          <h3 style={styles.title}>Book Seats & Tickets</h3>
          <p style={styles.subtitle}>Instant confirmation recorded in the PeakTix database</p>
        </div>
        <span
          style={{
            ...styles.availabilityBadge,
            ...(isSoldOut ? styles.soldOutBadge : {}),
          }}
        >
          {isSoldOut
            ? '● Sold Out in Demo'
            : remainingTickets <= 10
            ? `● Only ${remainingTickets} seats left`
            : `● ${remainingTickets} seats available`}
        </span>
      </div>

      {errors.form && (
        <div style={styles.errorBanner} role="alert">
          ⚠️ {errors.form}
        </div>
      )}

      {isSoldOut ? (
        <div style={styles.soldOutMessage}>
          <p style={{ margin: 0, fontWeight: 600, color: '#F8FAFC' }}>
            All demo tickets for this showcase have been booked.
          </p>
          <p style={{ margin: '8px 0 0', fontSize: 14, color: '#94A3B8' }}>
            You can visit <strong>My Bookings</strong> to cancel an existing reservation and release tickets back into inventory.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate>
          {/* Quantity Stepper */}
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Number of Tickets</label>
            <div style={styles.quantityRow}>
              <div style={styles.stepperContainer}>
                <button
                  type="button"
                  className="ptx-qty-btn"
                  style={styles.stepBtn}
                  onClick={() => handleQuantityChange(-1)}
                  disabled={quantity <= 1}
                  aria-label="Decrease quantity"
                >
                  −
                </button>
                <span style={styles.quantityDisplay}>{quantity}</span>
                <button
                  type="button"
                  className="ptx-qty-btn"
                  style={styles.stepBtn}
                  onClick={() => handleQuantityChange(1)}
                  disabled={quantity >= remainingTickets}
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>
              <span style={styles.qtyHelper}>
                Max {Math.min(remainingTickets, 100)} tickets per order
              </span>
            </div>
            {errors.quantity && <span style={styles.fieldError}>{errors.quantity}</span>}
          </div>

          {/* Pricing calculation */}
          <div style={styles.priceSummaryBox}>
            <div style={styles.priceRow}>
              <span>Ticket Rate ({quantity} × {formatINR(priceEach)}):</span>
              <span style={styles.subtotalValue}>{formatINR(totalPrice)}</span>
            </div>
            <div style={styles.priceRowTotal}>
              <span>Total Amount (INR):</span>
              <span style={styles.totalAmount}>{formatINR(totalPrice)}</span>
            </div>
          </div>

          {/* Attendee Details */}
          <div style={styles.inputsGrid}>
            <div style={styles.fieldGroup}>
              <label htmlFor="booking-name" style={styles.label}>
                Attendee Full Name <span style={{ color: '#FB7185' }}>*</span>
              </label>
              <input
                id="booking-name"
                type="text"
                className="ptx-input"
                style={{
                  ...styles.input,
                  ...(errors.name ? styles.inputError : {}),
                }}
                placeholder="e.g. Rahul Verma"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (errors.name) setErrors((prev) => ({ ...prev, name: null }));
                }}
              />
              {errors.name && <span style={styles.fieldError}>{errors.name}</span>}
            </div>

            <div style={styles.fieldGroup}>
              <label htmlFor="booking-email" style={styles.label}>
                Email Address <span style={{ color: '#FB7185' }}>*</span>
              </label>
              <input
                id="booking-email"
                type="email"
                className="ptx-input"
                style={{
                  ...styles.input,
                  ...(errors.email ? styles.inputError : {}),
                }}
                placeholder="rahul@example.in"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors((prev) => ({ ...prev, email: null }));
                }}
              />
              {errors.email && <span style={styles.fieldError}>{errors.email}</span>}
            </div>
          </div>

          <div style={styles.demoNotice}>
            ℹ️ <strong>Demonstration Checkout:</strong> No real payment is collected. All reservations are verified and recorded in Indian Rupees (₹) in the backend SQLite database.
          </div>

          <button
            type="submit"
            className="ptx-book-submit"
            style={styles.submitBtn}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Confirming Reservation...' : `Confirm Booking • ${formatINR(totalPrice)}`}
          </button>
        </form>
      )}
    </div>
  );
}

const styles = {
  card: {
    background: '#131C31',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: 18,
    padding: 28,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
    flexWrap: 'wrap',
    gap: 12,
  },
  title: {
    margin: 0,
    fontSize: 22,
    fontWeight: 700,
    color: '#F8FAFC',
  },
  subtitle: {
    margin: '4px 0 0',
    fontSize: 13,
    color: '#94A3B8',
  },
  availabilityBadge: {
    fontSize: 12,
    fontWeight: 700,
    color: '#10B981',
    background: 'rgba(16, 185, 129, 0.12)',
    border: '1px solid rgba(16, 185, 129, 0.25)',
    padding: '4px 12px',
    borderRadius: 20,
  },
  soldOutBadge: {
    color: '#EF4444',
    background: 'rgba(239, 68, 68, 0.12)',
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  soldOutMessage: {
    background: '#0F172A',
    border: '1px dashed rgba(255, 255, 255, 0.1)',
    borderRadius: 14,
    padding: 24,
    textAlign: 'center',
  },
  fieldGroup: {
    marginBottom: 16,
  },
  label: {
    display: 'block',
    fontSize: 13,
    fontWeight: 600,
    color: '#CBD5E1',
    marginBottom: 8,
  },
  quantityRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    flexWrap: 'wrap',
  },
  stepperContainer: {
    display: 'inline-flex',
    alignItems: 'center',
    border: '1.5px solid rgba(255, 255, 255, 0.12)',
    borderRadius: 12,
    background: '#0F172A',
    overflow: 'hidden',
  },
  stepBtn: {
    width: 44,
    height: 44,
    background: '#1A243B',
    border: 'none',
    fontSize: 22,
    fontWeight: 600,
    color: '#F8FAFC',
    cursor: 'pointer',
    transition: 'background 0.2s, color 0.2s',
  },
  quantityDisplay: {
    minWidth: 48,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: 800,
    color: '#F8FAFC',
    fontFamily: "'Outfit', sans-serif",
  },
  qtyHelper: {
    fontSize: 13,
    color: '#64748B',
  },
  priceSummaryBox: {
    background: '#0F172A',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: 14,
    padding: '16px 20px',
    marginBottom: 20,
  },
  priceRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 10,
  },
  subtotalValue: {
    fontFamily: "'Outfit', sans-serif",
    fontWeight: 700,
    color: '#F8FAFC',
  },
  priceRowTotal: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: 15,
    fontWeight: 700,
    color: '#F8FAFC',
    borderTop: '1px dashed rgba(255, 255, 255, 0.1)',
    paddingTop: 12,
  },
  totalAmount: {
    fontFamily: "'Outfit', sans-serif",
    fontSize: 24,
    fontWeight: 800,
    color: '#F43F5E',
  },
  inputsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: 16,
  },
  input: {
    width: '100%',
    padding: '13px 16px',
    borderRadius: 12,
    border: '1.5px solid rgba(255, 255, 255, 0.12)',
    background: '#0F172A',
    fontSize: 14,
    color: '#F8FAFC',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
    transition: 'border-color 0.2s',
  },
  inputError: {
    borderColor: '#EF4444',
    background: '#1F1218',
  },
  fieldError: {
    display: 'block',
    fontSize: 12,
    color: '#FB7185',
    marginTop: 6,
    fontWeight: 600,
  },
  errorBanner: {
    background: 'rgba(239, 68, 68, 0.15)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    color: '#FCA5A5',
    padding: '12px 16px',
    borderRadius: 12,
    fontSize: 14,
    marginBottom: 18,
  },
  demoNotice: {
    background: 'rgba(245, 158, 11, 0.08)',
    border: '1px solid rgba(245, 158, 11, 0.2)',
    borderRadius: 12,
    padding: '12px 16px',
    fontSize: 13,
    color: '#FDE68A',
    marginBottom: 24,
    lineHeight: 1.5,
  },
  submitBtn: {
    width: '100%',
    padding: '16px',
    background: 'linear-gradient(135deg, #E11D48 0%, #F43F5E 100%)',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: 14,
    fontSize: 16,
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 4px 18px rgba(225, 29, 72, 0.35)',
    transition: 'all 0.2s ease',
  },
};
