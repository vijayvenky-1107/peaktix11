import React, { useState } from 'react';
import { formatINR } from '../utils/formatters';
import SplitPaymentModal from './SplitPaymentModal';

export default function MovieConfirmation({ booking, onNewBooking, onViewMyBookings }) {
  const [splitModalOpen, setSplitModalOpen] = useState(false);

  if (!booking) return null;

  return (
    <div style={styles.container}>
      {/* Success Banner */}
      <div style={styles.successBanner}>
        <div style={styles.iconCircle}>✓</div>
        <h1 style={styles.title}>Movie Tickets Confirmed!</h1>
        <p style={styles.subtitle}>
          Your seats are locked and your pass has been generated. Confirmation sent to <strong>{booking.email}</strong>.
        </p>
      </div>

      {/* Boarding Pass Ticket Card */}
      <div style={styles.ticketCard}>
        {/* Ticket Left: Movie & Seat Details */}
        <div style={styles.ticketMain}>
          <div style={styles.cardHeader}>
            <div>
              <span style={styles.kicker}>PEAKTIX CINEMA PASS</span>
              <h2 style={styles.movieTitle}>{booking.movieTitle}</h2>
              <div style={styles.screenBadge}>{booking.screenFormat} • {booking.tier} SEATING</div>
            </div>
            <div style={styles.statusBadge}>CONFIRMED</div>
          </div>

          <div style={styles.detailsGrid}>
            <div style={styles.detailItem}>
              <span style={styles.label}>Cinema Hall</span>
              <strong style={styles.value}>{booking.theatreName}</strong>
              <span style={styles.subValue}>{booking.theatreAddress || `${booking.city}`}</span>
            </div>

            <div style={styles.detailItem}>
              <span style={styles.label}>Date & Showtime</span>
              <strong style={{ ...styles.value, color: '#F43F5E' }}>
                {booking.showDate} • {booking.showTime}
              </strong>
            </div>

            <div style={styles.detailItem}>
              <span style={styles.label}>Reserved Seats</span>
              <strong style={{ ...styles.value, fontSize: '1.25rem', color: '#06B6D4' }}>
                {Array.isArray(booking.seats) ? booking.seats.join(', ') : booking.seats}
              </strong>
              <span style={styles.subValue}>({booking.quantity} {booking.quantity === 1 ? 'ticket' : 'tickets'})</span>
            </div>

            <div style={styles.detailItem}>
              <span style={styles.label}>Attendee</span>
              <strong style={styles.value}>{booking.name}</strong>
              <span style={styles.subValue}>{booking.email}</span>
            </div>
          </div>

          {/* Pricing Summary */}
          <div style={styles.paymentSummary}>
            <div style={styles.summaryItem}>
              <span>Payment Mode:</span>
              <strong>{booking.paymentMethod}</strong>
            </div>
            <div style={styles.summaryItem}>
              <span>Status:</span>
              <span style={{ color: '#34D399' }}>Paid (Demo Authorized)</span>
            </div>
            <div style={styles.summaryItem}>
              <span>Total Amount:</span>
              <strong style={{ fontSize: '1.15rem', color: '#FFFFFF' }}>{formatINR(booking.total)}</strong>
            </div>
          </div>
        </div>

        {/* Perforated Divider */}
        <div style={styles.perforation}>
          <div style={styles.notchTop} />
          <div style={styles.dottedLine} />
          <div style={styles.notchBottom} />
        </div>

        {/* Ticket Right: Barcode & Reference */}
        <div style={styles.ticketStub}>
          <div style={styles.stubKicker}>ENTRY PASS</div>
          <div style={styles.refCode}>{booking.ref}</div>

          {/* Barcode representation */}
          <div style={styles.barcodeWrapper} aria-label="Simulated Ticket Barcode">
            <div style={styles.barcodeLines}>
              {Array.from({ length: 28 }, (_, i) => (
                <div
                  key={i}
                  style={{
                    ...styles.barLine,
                    width: (i % 3 === 0 ? '3px' : i % 2 === 0 ? '2px' : '1px'),
                    opacity: (i % 7 === 0 ? 0.4 : 1),
                  }}
                />
              ))}
            </div>
            <span style={styles.barcodeText}>SCAN AT AUDITORIUM TURNSTILE</span>
          </div>

          <div style={styles.stubMeta}>
            <div>PeakTix Digital Access</div>
            <div>Valid on show date only</div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={styles.actionsRow}>
        <button
          style={{
            ...styles.primaryActionBtn,
            background: 'linear-gradient(135deg, #10B981, #059669)',
            border: 'none',
          }}
          onClick={() => setSplitModalOpen(true)}
        >
          👥 Split Bill with Friends (GPay / UPI)
        </button>
        <button style={styles.primaryActionBtn} onClick={onViewMyBookings}>
          View in My Bookings →
        </button>
        <button style={styles.secondaryActionBtn} onClick={onNewBooking}>
          Browse More Entertainment
        </button>
      </div>

      {/* Split Payment Modal */}
      <SplitPaymentModal
        isOpen={splitModalOpen}
        onClose={() => setSplitModalOpen(false)}
        booking={booking}
      />

      <p style={styles.demoDisclaimer}>
        💡 <strong>Demonstration Showcase:</strong> This cinema reservation was processed inside your local database transaction. No actual currency was debited from your bank or card.
      </p>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '860px',
    margin: '3rem auto 6rem auto',
    padding: '0 1.5rem',
    color: '#F8FAFC',
  },
  successBanner: {
    textAlign: 'center',
    marginBottom: '2.5rem',
  },
  iconCircle: {
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    backgroundColor: '#10B981',
    color: '#022C22',
    fontSize: '2rem',
    fontWeight: '800',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 1rem auto',
    boxShadow: '0 0 25px rgba(16, 185, 129, 0.4)',
  },
  title: {
    fontSize: '2rem',
    fontWeight: '800',
    margin: '0 0 0.5rem 0',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: '0.95rem',
    color: '#94A3B8',
    margin: 0,
    lineHeight: 1.5,
  },
  ticketCard: {
    display: 'flex',
    backgroundColor: '#0F172A',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: '16px',
    overflow: 'hidden',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
    flexWrap: 'wrap',
  },
  ticketMain: {
    flex: '1 1 500px',
    padding: '2rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  kicker: {
    fontSize: '0.7rem',
    fontWeight: '800',
    letterSpacing: '0.12em',
    color: '#F43F5E',
  },
  movieTitle: {
    fontSize: '1.5rem',
    fontWeight: '800',
    margin: '0.2rem 0',
    color: '#FFFFFF',
  },
  screenBadge: {
    fontSize: '0.78rem',
    color: '#06B6D4',
    fontWeight: '600',
  },
  statusBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    color: '#34D399',
    border: '1px solid rgba(16, 185, 129, 0.3)',
    borderRadius: '4px',
    padding: '0.25rem 0.6rem',
    fontSize: '0.72rem',
    fontWeight: '800',
  },
  detailsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1.25rem',
  },
  detailItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.2rem',
  },
  label: {
    fontSize: '0.72rem',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  value: {
    fontSize: '0.92rem',
    color: '#F8FAFC',
    fontWeight: '600',
  },
  subValue: {
    fontSize: '0.78rem',
    color: '#94A3B8',
  },
  paymentSummary: {
    display: 'flex',
    justifyContent: 'space-between',
    backgroundColor: '#162035',
    padding: '0.85rem 1.25rem',
    borderRadius: '8px',
    fontSize: '0.82rem',
    color: '#CBD5E1',
    flexWrap: 'wrap',
    gap: '0.75rem',
  },
  summaryItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.1rem',
  },
  perforation: {
    width: '24px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    position: 'relative',
    backgroundColor: '#0F172A',
  },
  notchTop: {
    width: '24px',
    height: '12px',
    backgroundColor: '#080C16',
    borderRadius: '0 0 12px 12px',
  },
  dottedLine: {
    flex: 1,
    borderLeft: '2px dashed rgba(255, 255, 255, 0.15)',
    margin: '0.5rem 0',
  },
  notchBottom: {
    width: '24px',
    height: '12px',
    backgroundColor: '#080C16',
    borderRadius: '12px 12px 0 0',
  },
  ticketStub: {
    flex: '0 0 220px',
    backgroundColor: '#0A0F1D',
    padding: '2rem 1.5rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'space-between',
    textAlign: 'center',
  },
  stubKicker: {
    fontSize: '0.7rem',
    fontWeight: '800',
    letterSpacing: '0.15em',
    color: '#94A3B8',
  },
  refCode: {
    fontSize: '1.4rem',
    fontWeight: '800',
    color: '#F43F5E',
    letterSpacing: '0.08em',
    fontFamily: 'monospace',
  },
  barcodeWrapper: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.5rem',
    width: '100%',
  },
  barcodeLines: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '3px',
    height: '50px',
    width: '100%',
  },
  barLine: {
    height: '100%',
    backgroundColor: '#FFFFFF',
  },
  barcodeText: {
    fontSize: '0.62rem',
    color: '#64748B',
    letterSpacing: '0.05em',
  },
  stubMeta: {
    fontSize: '0.7rem',
    color: '#64748B',
    lineHeight: 1.4,
  },
  actionsRow: {
    display: 'flex',
    justifyContent: 'center',
    gap: '1rem',
    marginTop: '2.5rem',
    flexWrap: 'wrap',
  },
  primaryActionBtn: {
    backgroundColor: '#E11D48',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '8px',
    padding: '0.85rem 1.8rem',
    fontSize: '0.95rem',
    fontWeight: '700',
    cursor: 'pointer',
  },
  secondaryActionBtn: {
    backgroundColor: '#1E293B',
    color: '#CBD5E1',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '8px',
    padding: '0.85rem 1.5rem',
    fontSize: '0.9rem',
    fontWeight: '600',
    cursor: 'pointer',
  },
  demoDisclaimer: {
    textAlign: 'center',
    fontSize: '0.8rem',
    color: '#64748B',
    marginTop: '2rem',
    lineHeight: 1.5,
  },
};
