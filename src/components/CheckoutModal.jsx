import React, { useState, useEffect } from 'react';
import { formatINR } from '../utils/formatters';
import { getOffers, validateOfferCode, createMovieBooking } from '../services/api';

export default function CheckoutModal({
  isOpen,
  onClose,
  bookingDetails,
  currentUser,
  onBookingSuccess,
}) {
  const [name, setName] = useState(currentUser?.name || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [upiId, setUpiId] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [cardLast4, setCardLast4] = useState('');

  // Offers state
  const [offers, setOffers] = useState([]);
  const [couponInput, setCouponInput] = useState('');
  const [appliedOffer, setAppliedOffer] = useState(null);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [offerError, setOfferError] = useState(null);
  const [offerLoading, setOfferLoading] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    getOffers()
      .then((data) => {
        if (isMounted) setOffers(data);
      })
      .catch((err) => console.error('Failed to load offers:', err));
    return () => {
      isMounted = false;
    };
  }, []);

  if (!isOpen || !bookingDetails) return null;

  const { movie, theatre, showtime, seats, tier, quantity, subtotal } = bookingDetails;
  const convenienceFee = quantity * 30; // ₹30 per seat
  const finalPayable = Math.max(0, subtotal + convenienceFee - discountAmount);

  const handleApplyOffer = async (codeToApply) => {
    const code = codeToApply || couponInput;
    if (!code || !code.trim()) return;

    setOfferLoading(true);
    setOfferError(null);

    try {
      const res = await validateOfferCode({
        code: code.trim().toUpperCase(),
        subtotal,
        category: 'Movies',
        quantity,
      });

      if (!res.success) {
        setOfferError(res.error || 'Offer code could not be applied.');
        setAppliedOffer(null);
        setDiscountAmount(0);
      } else {
        setAppliedOffer(res.offer);
        setDiscountAmount(res.discount);
        setCouponInput(res.offer.code);
      }
    } catch (err) {
      setOfferError(err.message || 'Failed to validate offer.');
    } finally {
      setOfferLoading(false);
    }
  };

  const handleRemoveOffer = () => {
    setAppliedOffer(null);
    setDiscountAmount(0);
    setCouponInput('');
    setOfferError(null);
  };

  const handleConfirmBooking = async (e) => {
    e.preventDefault();
    setCheckoutError(null);

    if (!name.trim() || name.trim().length < 2) {
      setCheckoutError('Please enter a valid customer name.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email.trim())) {
      setCheckoutError('Please enter a valid email address to receive your tickets.');
      return;
    }

    if (paymentMethod === 'UPI' && !upiId.trim()) {
      setCheckoutError('Please enter your UPI ID (e.g. yourname@oksbi).');
      return;
    }

    setSubmitting(true);
    const token = localStorage.getItem('peaktix_token');

    try {
      const payload = {
        movieId: movie?.id || movie?.movieId,
        theatreId: theatre?.id || theatre?.theatreId,
        screenFormat: showtime?.screenFormat || theatre?.screenFormat || 'Dolby Atmos',
        showDate: showtime?.date || '2026-11-28', // demo show date
        showTime: showtime?.time || '07:30 PM',
        tier,
        seats,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim() || null,
        paymentMethod,
        offerCode: appliedOffer ? appliedOffer.code : undefined,
      };

      const res = await createMovieBooking(payload, token);
      if (!res.success) {
        setCheckoutError(res.error || 'Failed to process booking reservation.');
        setSubmitting(false);
        return;
      }

      onBookingSuccess(res.booking);
      onClose();
    } catch (err) {
      setCheckoutError(err.message || 'An unexpected error occurred during checkout.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <div>
            <div style={styles.kicker}>SECURE CHECKOUT & DEMO PAYMENT</div>
            <h2 style={styles.title}>Confirm Your Tickets</h2>
          </div>
          <button style={styles.closeBtn} onClick={onClose} aria-label="Close modal">
            ✕
          </button>
        </div>

        {checkoutError && (
          <div style={styles.alertError} role="alert">
            ⚠️ {checkoutError}
          </div>
        )}

        <div style={styles.contentGrid}>
          {/* LEFT: Customer & Payment Details */}
          <form onSubmit={handleConfirmBooking} style={styles.leftCol}>
            {/* Contact Details */}
            <div style={styles.cardBox}>
              <h3 style={styles.boxTitle}>1. Ticket Delivery Details</h3>
              <div style={styles.formRow}>
                <div style={styles.fieldGroup}>
                  <label style={styles.label}>Full Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Priya Patel"
                    style={styles.input}
                  />
                </div>
                <div style={styles.fieldGroup}>
                  <label style={styles.label}>Email Address *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="priya@example.com"
                    style={styles.input}
                  />
                </div>
              </div>
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Mobile Number (Optional for SMS pass)</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="9876543210"
                  style={styles.input}
                />
              </div>
            </div>

            {/* Payment Method Selector */}
            <div style={styles.cardBox}>
              <h3 style={styles.boxTitle}>2. Choose Payment Method</h3>
              <div style={styles.methodSelector}>
                <label
                  style={{
                    ...styles.methodTab,
                    borderColor: paymentMethod === 'UPI' ? '#F43F5E' : 'rgba(255, 255, 255, 0.1)',
                    backgroundColor: paymentMethod === 'UPI' ? 'rgba(244, 63, 94, 0.1)' : '#162035',
                  }}
                >
                  <input
                    type="radio"
                    name="payMethod"
                    value="UPI"
                    checked={paymentMethod === 'UPI'}
                    onChange={() => setPaymentMethod('UPI')}
                    style={styles.radio}
                  />
                  <span>⚡ Instant UPI (GPay / PhonePe / Paytm)</span>
                </label>

                <label
                  style={{
                    ...styles.methodTab,
                    borderColor: paymentMethod === 'DEBIT_CARD' ? '#F43F5E' : 'rgba(255, 255, 255, 0.1)',
                    backgroundColor: paymentMethod === 'DEBIT_CARD' ? 'rgba(244, 63, 94, 0.1)' : '#162035',
                  }}
                >
                  <input
                    type="radio"
                    name="payMethod"
                    value="DEBIT_CARD"
                    checked={paymentMethod === 'DEBIT_CARD'}
                    onChange={() => setPaymentMethod('DEBIT_CARD')}
                    style={styles.radio}
                  />
                  <span>💳 Debit Card (HDFC, ICICI, SBI, Axis)</span>
                </label>

                <label
                  style={{
                    ...styles.methodTab,
                    borderColor: paymentMethod === 'CREDIT_CARD' ? '#F43F5E' : 'rgba(255, 255, 255, 0.1)',
                    backgroundColor: paymentMethod === 'CREDIT_CARD' ? 'rgba(244, 63, 94, 0.1)' : '#162035',
                  }}
                >
                  <input
                    type="radio"
                    name="payMethod"
                    value="CREDIT_CARD"
                    checked={paymentMethod === 'CREDIT_CARD'}
                    onChange={() => setPaymentMethod('CREDIT_CARD')}
                    style={styles.radio}
                  />
                  <span>💎 Credit Card</span>
                </label>
              </div>

              {/* Dynamic Input based on payment */}
              {paymentMethod === 'UPI' ? (
                <div style={styles.payInputArea}>
                  <label style={styles.label}>Enter Virtual Payment Address (UPI ID) *</label>
                  <input
                    type="text"
                    required
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    placeholder="e.g. mobile@upi or username@okaxis"
                    style={styles.input}
                  />
                  <div style={styles.demoNotice}>
                    🛡️ Demo Sandbox: Simulates instant UPI authorization. No actual bank funds are deducted.
                  </div>
                </div>
              ) : (
                <div style={styles.payInputArea}>
                  <div style={styles.formRow}>
                    <div style={styles.fieldGroup}>
                      <label style={styles.label}>Cardholder Name</label>
                      <input
                        type="text"
                        value={cardHolder}
                        onChange={(e) => setCardHolder(e.target.value)}
                        placeholder="Name on card"
                        style={styles.input}
                      />
                    </div>
                    <div style={styles.fieldGroup}>
                      <label style={styles.label}>Card Number (Demo — Last 4 Digits)</label>
                      <input
                        type="text"
                        maxLength={4}
                        value={cardLast4}
                        onChange={(e) => setCardLast4(e.target.value)}
                        placeholder="•••• •••• •••• 4242"
                        style={styles.input}
                      />
                    </div>
                  </div>
                  <div style={styles.demoNotice}>
                    🛡️ Demo Gateway: We never collect CVV or real PINs. Zero payment credentials are stored in database.
                  </div>
                </div>
              )}
            </div>

            {/* Bank Offers & Promos Section */}
            <div style={styles.cardBox}>
              <h3 style={styles.boxTitle}>3. Bank Card Offers & Coupons</h3>
              <div style={styles.couponRow}>
                <input
                  type="text"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                  placeholder="Enter code (e.g. HDFCWEEKEND)"
                  style={styles.couponInput}
                />
                {appliedOffer ? (
                  <button
                    type="button"
                    onClick={handleRemoveOffer}
                    style={styles.removeOfferBtn}
                  >
                    Remove
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={offerLoading || !couponInput.trim()}
                    onClick={() => handleApplyOffer(couponInput)}
                    style={styles.applyOfferBtn}
                  >
                    {offerLoading ? 'Checking...' : 'Apply Code'}
                  </button>
                )}
              </div>

              {offerError && <div style={styles.offerErrorText}>⚠️ {offerError}</div>}
              {appliedOffer && (
                <div style={styles.offerSuccessText}>
                  🎉 Applied <strong>{appliedOffer.code}</strong>! You save {formatINR(discountAmount)}.
                </div>
              )}

              {/* Quick Offer Chips */}
              <div style={styles.quickOffers}>
                <span style={styles.quickOfferLabel}>Tap to apply offer:</span>
                <div style={styles.offerPills}>
                  {offers.map((off) => (
                    <button
                      key={off.code}
                      type="button"
                      onClick={() => handleApplyOffer(off.code)}
                      style={{
                        ...styles.offerPill,
                        borderColor: appliedOffer?.code === off.code ? '#10B981' : 'rgba(255, 255, 255, 0.15)',
                        backgroundColor: appliedOffer?.code === off.code ? 'rgba(16, 185, 129, 0.15)' : '#162035',
                      }}
                    >
                      <strong>{off.code}</strong> — {off.badge}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              style={{
                ...styles.submitOrderBtn,
                opacity: submitting ? 0.7 : 1,
              }}
            >
              {submitting ? 'Reserving Seats & Confirming...' : `Pay & Confirm ${formatINR(finalPayable)} →`}
            </button>
          </form>

          {/* RIGHT: Order Summary Card */}
          <div style={styles.rightCol}>
            <div style={styles.summaryCard}>
              <h3 style={styles.summaryTitle}>Booking Summary</h3>

              <div style={styles.movieOverview}>
                <img
                  src={movie.poster}
                  alt={movie.title}
                  style={styles.summaryPoster}
                />
                <div>
                  <h4 style={styles.summaryMovieTitle}>{movie.title}</h4>
                  <div style={styles.summaryMeta}>
                    {theatre.name} • {showtime?.screenFormat || 'Dolby Atmos'}
                  </div>
                  <div style={styles.summaryMeta}>
                    🕒 {showtime?.time} • {theatre.city}
                  </div>
                  <div style={styles.tierTag}>{tier} SEATING</div>
                </div>
              </div>

              <div style={styles.divider} />

              <div style={styles.seatsSummaryRow}>
                <span>Selected Seats ({quantity}):</span>
                <strong style={{ color: '#F43F5E' }}>{seats.join(', ')}</strong>
              </div>

              <div style={styles.divider} />

              {/* Price Breakdown */}
              <div style={styles.priceBreakdown}>
                <div style={styles.priceRow}>
                  <span>Tickets Subtotal</span>
                  <span>{formatINR(subtotal)}</span>
                </div>
                <div style={styles.priceRow}>
                  <span>Convenience Fee (incl. 18% GST)</span>
                  <span>{formatINR(convenienceFee)}</span>
                </div>
                {discountAmount > 0 && (
                  <div style={{ ...styles.priceRow, color: '#10B981', fontWeight: '700' }}>
                    <span>Discount ({appliedOffer?.code})</span>
                    <span>- {formatINR(discountAmount)}</span>
                  </div>
                )}
                <div style={styles.divider} />
                <div style={styles.totalRow}>
                  <span>Total Payable (INR)</span>
                  <span style={styles.totalAmount}>{formatINR(finalPayable)}</span>
                </div>
              </div>

              <div style={styles.safeBookingBadge}>
                🔒 Guaranteed Instant Seat Allocation via ACID Transaction
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(3, 7, 18, 0.88)',
    backdropFilter: 'blur(10px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '1rem',
  },
  modal: {
    backgroundColor: '#0A0F1D',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: '16px',
    maxWidth: '960px',
    width: '100%',
    maxHeight: '92vh',
    overflowY: 'auto',
    padding: '2rem',
    color: '#F8FAFC',
    boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.8)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '1.5rem',
  },
  kicker: {
    fontSize: '0.72rem',
    fontWeight: '800',
    letterSpacing: '0.12em',
    color: '#F43F5E',
    marginBottom: '0.2rem',
  },
  title: {
    fontSize: '1.6rem',
    fontWeight: '800',
    margin: 0,
    color: '#FFFFFF',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: '#94A3B8',
    fontSize: '1.3rem',
    cursor: 'pointer',
    padding: '0.4rem',
  },
  alertError: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    border: '1px solid rgba(239, 68, 68, 0.4)',
    color: '#FCA5A5',
    padding: '0.8rem 1.2rem',
    borderRadius: '8px',
    fontSize: '0.88rem',
    marginBottom: '1.5rem',
  },
  contentGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: '1.75rem',
  },
  leftCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
  },
  rightCol: {
    display: 'flex',
    flexDirection: 'column',
  },
  cardBox: {
    backgroundColor: '#0F172A',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '12px',
    padding: '1.25rem',
  },
  boxTitle: {
    fontSize: '0.95rem',
    fontWeight: '700',
    color: '#FFFFFF',
    margin: '0 0 1rem 0',
  },
  formRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '0.75rem',
    marginBottom: '0.75rem',
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.35rem',
  },
  label: {
    fontSize: '0.78rem',
    fontWeight: '600',
    color: '#CBD5E1',
  },
  input: {
    backgroundColor: '#162035',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: '8px',
    padding: '0.7rem 0.9rem',
    color: '#FFFFFF',
    fontSize: '0.88rem',
    outline: 'none',
    fontFamily: 'inherit',
  },
  methodSelector: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    marginBottom: '1rem',
  },
  methodTab: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
    padding: '0.75rem 1rem',
    borderRadius: '8px',
    border: '1px solid',
    cursor: 'pointer',
    fontSize: '0.85rem',
    fontWeight: '600',
    color: '#F8FAFC',
    transition: 'all 0.15s ease',
  },
  radio: {
    accentColor: '#F43F5E',
  },
  payInputArea: {
    marginTop: '0.5rem',
  },
  demoNotice: {
    fontSize: '0.72rem',
    color: '#94A3B8',
    marginTop: '0.5rem',
    lineHeight: 1.4,
  },
  couponRow: {
    display: 'flex',
    gap: '0.5rem',
  },
  couponInput: {
    flex: 1,
    backgroundColor: '#162035',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: '8px',
    padding: '0.7rem 0.9rem',
    color: '#FFFFFF',
    fontSize: '0.88rem',
    fontWeight: '700',
    letterSpacing: '0.05em',
    outline: 'none',
    fontFamily: 'inherit',
  },
  applyOfferBtn: {
    backgroundColor: '#E11D48',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '8px',
    padding: '0.7rem 1.2rem',
    fontSize: '0.82rem',
    fontWeight: '700',
    cursor: 'pointer',
  },
  removeOfferBtn: {
    backgroundColor: '#475569',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '8px',
    padding: '0.7rem 1.2rem',
    fontSize: '0.82rem',
    fontWeight: '700',
    cursor: 'pointer',
  },
  offerErrorText: {
    fontSize: '0.78rem',
    color: '#FCA5A5',
    marginTop: '0.4rem',
  },
  offerSuccessText: {
    fontSize: '0.78rem',
    color: '#34D399',
    marginTop: '0.4rem',
  },
  quickOffers: {
    marginTop: '1rem',
    borderTop: '1px solid rgba(255, 255, 255, 0.06)',
    paddingTop: '0.75rem',
  },
  quickOfferLabel: {
    fontSize: '0.75rem',
    color: '#94A3B8',
    marginBottom: '0.4rem',
    display: 'block',
  },
  offerPills: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.4rem',
  },
  offerPill: {
    border: '1px solid',
    borderRadius: '6px',
    color: '#CBD5E1',
    padding: '0.35rem 0.65rem',
    fontSize: '0.72rem',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  submitOrderBtn: {
    backgroundColor: '#E11D48',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '10px',
    padding: '1rem',
    fontSize: '1rem',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
    boxShadow: '0 10px 20px -5px rgba(225, 29, 72, 0.4)',
  },
  summaryCard: {
    backgroundColor: '#0F172A',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '12px',
    padding: '1.5rem',
  },
  summaryTitle: {
    fontSize: '1.05rem',
    fontWeight: '700',
    margin: '0 0 1.25rem 0',
    color: '#FFFFFF',
  },
  movieOverview: {
    display: 'flex',
    gap: '1rem',
    marginBottom: '1rem',
  },
  summaryPoster: {
    width: '65px',
    height: '90px',
    objectFit: 'cover',
    borderRadius: '6px',
  },
  summaryMovieTitle: {
    fontSize: '0.95rem',
    fontWeight: '700',
    margin: '0 0 0.3rem 0',
  },
  summaryMeta: {
    fontSize: '0.75rem',
    color: '#94A3B8',
    marginBottom: '0.2rem',
  },
  tierTag: {
    display: 'inline-block',
    fontSize: '0.65rem',
    fontWeight: '700',
    color: '#06B6D4',
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
    padding: '0.15rem 0.4rem',
    borderRadius: '4px',
    marginTop: '0.3rem',
  },
  divider: {
    height: '1px',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    margin: '1rem 0',
  },
  seatsSummaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.85rem',
    color: '#CBD5E1',
  },
  priceBreakdown: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  priceRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.85rem',
    color: '#94A3B8',
  },
  totalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    fontSize: '1rem',
    fontWeight: '700',
    color: '#FFFFFF',
  },
  totalAmount: {
    fontSize: '1.3rem',
    fontWeight: '800',
    color: '#F43F5E',
  },
  safeBookingBadge: {
    marginTop: '1.5rem',
    fontSize: '0.72rem',
    color: '#34D399',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    padding: '0.6rem 0.8rem',
    borderRadius: '6px',
    textAlign: 'center',
  },
};
