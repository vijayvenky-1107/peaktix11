import React, { useState } from 'react';
import { formatINR } from '../utils/formatters.js';
import SplitPaymentModal from './SplitPaymentModal.jsx';

export default function BookingConfirmation({ booking, onBackToEvents, onViewMyBookings }) {
  const [splitModalOpen, setSplitModalOpen] = useState(false);

  if (!booking) return null;

  return (
    <div style={styles.container}>
      <style>{`
        .ptx-btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(225, 29, 72, 0.45) !important;
        }
        .ptx-btn-secondary:hover {
          background: rgba(255, 255, 255, 0.1) !important;
          color: #FFFFFF !important;
        }
      `}</style>

      <div style={styles.card}>
        {/* Celebration Badge */}
        <div style={styles.badgeIcon}>✓</div>

        <h1 style={styles.title}>Reservation Confirmed!</h1>
        <p style={styles.subtitle}>
          Your demo tickets have been confirmed and recorded in Indian Rupees (₹) in the PeakTix SQLite database.
        </p>

        {/* Reference Highlight */}
        <div style={styles.refBox}>
          <span style={styles.refLabel}>Booking Reference Code</span>
          <span style={styles.refValue}>{booking.ref}</span>
        </div>

        {/* Event Ticket Pass Summary */}
        <div style={styles.summaryCard}>
          <div style={styles.summaryHeader}>
            <span style={styles.categoryBadge}>{booking.category}</span>
            <span style={styles.statusConfirmed}>CONFIRMED</span>
          </div>

          <h2 style={styles.eventTitle}>{booking.eventTitle}</h2>

          <div style={styles.grid}>
            <div style={styles.gridItem}>
              <span style={styles.itemLabel}>Date & Time</span>
              <span style={styles.itemValue}>
                🗓️ {booking.eventDate} at {booking.eventTime}
              </span>
            </div>
            <div style={styles.gridItem}>
              <span style={styles.itemLabel}>Venue & City</span>
              <span style={styles.itemValue}>
                📍 {booking.eventVenue}, {booking.eventCity}
              </span>
            </div>
            <div style={styles.gridItem}>
              <span style={styles.itemLabel}>Seats</span>
              <span style={styles.itemValue}>
                🎟️ {booking.quantity} ticket{booking.quantity !== 1 ? 's' : ''} ({formatINR(booking.priceEach)} each)
              </span>
            </div>
            <div style={styles.gridItem}>
              <span style={styles.itemLabel}>Total Amount (INR)</span>
              <span style={styles.itemTotal}>{formatINR(booking.total)}</span>
            </div>
          </div>

          <div style={styles.attendeeRow}>
            <div>
              <span style={styles.itemLabel}>Ticket Holder</span>
              <div style={styles.attendeeValue}>{booking.name}</div>
            </div>
            <div>
              <span style={styles.itemLabel}>Confirmation Sent To</span>
              <div style={styles.attendeeValue}>{booking.email}</div>
            </div>
          </div>
        </div>

        {/* Database Persistence Note */}
        <div style={styles.demoNote}>
          🗄️ <strong>Database Recorded:</strong> This booking is saved in the server's SQLite database. You can manage or cancel it anytime in <strong>My Bookings</strong>.
        </div>

        {/* Action Buttons */}
        <div style={styles.actions}>
          <button
            type="button"
            style={{
              ...styles.primaryBtn,
              background: 'linear-gradient(135deg, #10B981, #059669)',
              boxShadow: '0 4px 15px rgba(16, 185, 129, 0.4)',
            }}
            onClick={() => setSplitModalOpen(true)}
          >
            👥 Split Bill with Friends (GPay / UPI)
          </button>
          <button
            type="button"
            className="ptx-btn-primary"
            style={styles.primaryBtn}
            onClick={onViewMyBookings}
          >
            View in My Bookings
          </button>
          <button
            type="button"
            className="ptx-btn-secondary"
            style={styles.secondaryBtn}
            onClick={onBackToEvents}
          >
            Explore More Shows
          </button>
        </div>

        {/* Split Payment Modal */}
        <SplitPaymentModal
          isOpen={splitModalOpen}
          onClose={() => setSplitModalOpen(false)}
          booking={booking}
        />
      </div>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: 760,
    margin: '110px auto 60px',
    padding: '0 24px',
    boxSizing: 'border-box',
    width: '100%',
  },
  card: {
    background: '#0F172A',
    borderRadius: 24,
    padding: '44px 36px',
    boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    textAlign: 'center',
  },
  badgeIcon: {
    width: 64,
    height: 64,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: 'bold',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 20px',
    boxShadow: '0 4px 16px rgba(16, 185, 129, 0.35)',
  },
  title: {
    fontFamily: "'Outfit', sans-serif",
    fontSize: 32,
    fontWeight: 800,
    color: '#F8FAFC',
    margin: '0 0 10px',
  },
  subtitle: {
    fontSize: 15,
    color: '#94A3B8',
    margin: '0 auto 24px',
    maxWidth: 520,
    lineHeight: 1.5,
  },
  refBox: {
    background: '#131C31',
    border: '1.5px dashed #FB7185',
    borderRadius: 14,
    padding: '16px 24px',
    display: 'inline-flex',
    flexDirection: 'column',
    gap: 4,
    marginBottom: 28,
  },
  refLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: '#94A3B8',
    fontWeight: 700,
  },
  refValue: {
    fontFamily: "'Outfit', monospace",
    fontSize: 26,
    fontWeight: 800,
    color: '#F43F5E',
    letterSpacing: '0.1em',
  },
  summaryCard: {
    background: '#131C31',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: 18,
    padding: 24,
    textAlign: 'left',
    marginBottom: 24,
  },
  summaryHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryBadge: {
    background: 'rgba(225, 29, 72, 0.15)',
    color: '#FB7185',
    fontSize: 11,
    fontWeight: 700,
    padding: '3px 10px',
    borderRadius: 12,
    textTransform: 'uppercase',
  },
  statusConfirmed: {
    background: 'rgba(16, 185, 129, 0.15)',
    color: '#34D399',
    fontSize: 11,
    fontWeight: 700,
    padding: '3px 10px',
    borderRadius: 12,
  },
  eventTitle: {
    fontFamily: "'Outfit', sans-serif",
    fontSize: 22,
    fontWeight: 700,
    color: '#F8FAFC',
    margin: '0 0 18px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
    paddingBottom: 14,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: 16,
    marginBottom: 16,
  },
  gridItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  itemLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    color: '#64748B',
    fontWeight: 700,
  },
  itemValue: {
    fontSize: 14,
    color: '#E2E8F0',
    fontWeight: 500,
  },
  itemTotal: {
    fontFamily: "'Outfit', sans-serif",
    fontSize: 22,
    fontWeight: 800,
    color: '#F43F5E',
  },
  attendeeRow: {
    display: 'flex',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 16,
    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
    paddingTop: 16,
  },
  attendeeValue: {
    fontSize: 14,
    fontWeight: 600,
    color: '#F8FAFC',
  },
  demoNote: {
    background: 'rgba(245, 158, 11, 0.08)',
    border: '1px solid rgba(245, 158, 11, 0.2)',
    borderRadius: 12,
    padding: '12px 18px',
    fontSize: 13,
    color: '#FDE68A',
    lineHeight: 1.5,
    textAlign: 'left',
    marginBottom: 28,
  },
  actions: {
    display: 'flex',
    justifyContent: 'center',
    gap: 16,
    flexWrap: 'wrap',
  },
  primaryBtn: {
    padding: '14px 28px',
    background: 'linear-gradient(135deg, #E11D48 0%, #F43F5E 100%)',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: 12,
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 4px 16px rgba(225, 29, 72, 0.3)',
    transition: 'all 0.2s',
  },
  secondaryBtn: {
    padding: '14px 28px',
    background: '#131C31',
    color: '#E2E8F0',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
};
