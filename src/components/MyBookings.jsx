import React, { useState, useEffect } from 'react';
import { formatINR } from '../utils/formatters.js';
import { getMyAccountBookings, cancelMovieBooking } from '../services/api.js';
import SplitPaymentModal from './SplitPaymentModal.jsx';

export default function MyBookings({
  bookings: propEventBookings = [],
  onCancelBooking,
  onBrowseEvents,
  currentUser,
}) {
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'MOVIES' | 'EVENTS'
  const [movieBookings, setMovieBookings] = useState([]);
  const [accountEventBookings, setAccountEventBookings] = useState(null);
  const [cancellingRef, setCancellingRef] = useState(null);
  const [feedbackMessage, setFeedbackMessage] = useState(null);
  const [loading, setLoading] = useState(() => Boolean(localStorage.getItem('peaktix_token')));
  const [splitBooking, setSplitBooking] = useState(null);

  const eventBookings = accountEventBookings || propEventBookings;

  // Load account bookings if user has active session
  useEffect(() => {
    const token = localStorage.getItem('peaktix_token');
    if (token) {
      let isMounted = true;
      getMyAccountBookings(token)
        .then((res) => {
          if (isMounted && res.success) {
            setMovieBookings(res.movieBookings || []);
            if (res.eventBookings && res.eventBookings.length > 0) {
              setAccountEventBookings(res.eventBookings);
            }
          }
        })
        .catch((err) => {
          console.error('Failed to load user account bookings:', err);
        })
        .finally(() => {
          if (isMounted) setLoading(false);
        });

      return () => {
        isMounted = false;
      };
    }
  }, [currentUser]);

  const handleCancelMovie = async (movieBooking) => {
    if (movieBooking.status === 'CANCELLED') return;

    const confirmed = window.confirm(
      `Are you sure you want to cancel movie booking ${movieBooking.ref} for "${movieBooking.movieTitle}"? This will release seats ${Array.isArray(movieBooking.seats) ? movieBooking.seats.join(', ') : movieBooking.seats}.`
    );

    if (confirmed) {
      setCancellingRef(movieBooking.ref);
      try {
        const res = await cancelMovieBooking(movieBooking.ref);
        if (res.success) {
          setMovieBookings((prev) =>
            prev.map((b) => (b.ref === movieBooking.ref ? { ...b, status: 'CANCELLED' } : b))
          );
          setFeedbackMessage({
            type: 'success',
            text: `Movie pass ${movieBooking.ref} cancelled. Seats released.`,
          });
        } else {
          setFeedbackMessage({
            type: 'error',
            text: res.error || 'Failed to cancel movie booking.',
          });
        }
      } catch (err) {
        setFeedbackMessage({ type: 'error', text: err.message });
      } finally {
        setCancellingRef(null);
      }
    }
  };

  const handleCancelEvent = async (eventBooking) => {
    if (eventBooking.status === 'CANCELLED') return;

    const confirmed = window.confirm(
      `Are you sure you want to cancel event booking ${eventBooking.ref} for "${eventBooking.eventTitle}"? This will restore ${eventBooking.quantity} ticket(s) back to inventory.`
    );

    if (confirmed) {
      setCancellingRef(eventBooking.id);
      const res = await onCancelBooking(eventBooking.id);
      setCancellingRef(null);

      if (res && res.success) {
        setFeedbackMessage({
          type: 'success',
          text: `Booking ${eventBooking.ref} cancelled. ${eventBooking.quantity} ticket(s) restored.`,
        });
      } else {
        setFeedbackMessage({
          type: 'error',
          text: (res && res.error) || 'Failed to cancel booking.',
        });
      }
    }
  };

  const totalActiveMovies = movieBookings.filter((b) => b.status === 'CONFIRMED').length;
  const totalActiveEvents = eventBookings.filter((b) => b.status === 'CONFIRMED').length;
  const totalActive = totalActiveMovies + totalActiveEvents;

  const showMovies = activeTab === 'ALL' || activeTab === 'MOVIES';
  const showEvents = activeTab === 'ALL' || activeTab === 'EVENTS';

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <div style={styles.kicker}>MY ENTERTAINMENT PASSES</div>
          <h1 style={styles.title}>My Bookings & Tickets</h1>
          <p style={styles.subtitle}>
            Manage and view your cinema seats, concert passes, and activity reservations in Indian Rupees (₹).
          </p>
        </div>

        <div style={styles.counterBadge}>
          {totalActive} Active {totalActive === 1 ? 'Pass' : 'Passes'}
        </div>
      </div>

      {/* Tab Filter */}
      <div style={styles.tabBar}>
        <button
          style={{
            ...styles.tabBtn,
            backgroundColor: activeTab === 'ALL' ? '#E11D48' : '#0F172A',
            color: activeTab === 'ALL' ? '#FFFFFF' : '#94A3B8',
          }}
          onClick={() => setActiveTab('ALL')}
        >
          All Bookings ({movieBookings.length + eventBookings.length})
        </button>
        <button
          style={{
            ...styles.tabBtn,
            backgroundColor: activeTab === 'MOVIES' ? '#E11D48' : '#0F172A',
            color: activeTab === 'MOVIES' ? '#FFFFFF' : '#94A3B8',
          }}
          onClick={() => setActiveTab('MOVIES')}
        >
          🎬 Movies & Theatres ({movieBookings.length})
        </button>
        <button
          style={{
            ...styles.tabBtn,
            backgroundColor: activeTab === 'EVENTS' ? '#E11D48' : '#0F172A',
            color: activeTab === 'EVENTS' ? '#FFFFFF' : '#94A3B8',
          }}
          onClick={() => setActiveTab('EVENTS')}
        >
          🎤 Concerts & Live ({eventBookings.length})
        </button>
      </div>

      {/* Feedback Alert */}
      {feedbackMessage && (
        <div
          style={{
            ...styles.feedbackBanner,
            ...(feedbackMessage.type === 'error' ? styles.feedbackError : {}),
          }}
          role="status"
        >
          <span>{feedbackMessage.type === 'error' ? '⚠️ ' : '✓ '}{feedbackMessage.text}</span>
          <button
            type="button"
            style={styles.closeBannerBtn}
            onClick={() => setFeedbackMessage(null)}
          >
            ✕
          </button>
        </div>
      )}

      {loading && (
        <div style={styles.loadingBox}>
          <div style={styles.spinner} />
          <p>Syncing account bookings with database...</p>
        </div>
      )}

      {/* MOVIE BOOKINGS SECTION */}
      {showMovies && movieBookings.length > 0 && (
        <div style={styles.sectionGroup}>
          <h2 style={styles.sectionHeading}>Cinema Passes</h2>
          <div style={styles.cardsGrid}>
            {movieBookings.map((b) => (
              <div
                key={b.id || b.ref}
                style={{
                  ...styles.card,
                  opacity: b.status === 'CANCELLED' ? 0.6 : 1,
                }}
              >
                <div style={styles.cardTop}>
                  <div>
                    <span style={styles.typeBadge}>CINEMA PASS</span>
                    <h3 style={styles.itemTitle}>{b.movieTitle}</h3>
                    <div style={styles.itemMeta}>
                      📍 {b.theatreName} ({b.city}) • <span style={{ color: '#06B6D4' }}>{b.screenFormat}</span>
                    </div>
                  </div>
                  <span
                    style={{
                      ...styles.statusBadge,
                      backgroundColor: b.status === 'CANCELLED' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                      color: b.status === 'CANCELLED' ? '#FCA5A5' : '#34D399',
                      borderColor: b.status === 'CANCELLED' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)',
                    }}
                  >
                    {b.status}
                  </span>
                </div>

                <div style={styles.cardDetails}>
                  <div style={styles.detailCol}>
                    <span style={styles.detailLabel}>Schedule</span>
                    <strong style={styles.detailVal}>{b.showDate} • {b.showTime}</strong>
                  </div>
                  <div style={styles.detailCol}>
                    <span style={styles.detailLabel}>Seats ({b.quantity})</span>
                    <strong style={{ ...styles.detailVal, color: '#F43F5E' }}>
                      {Array.isArray(b.seats) ? b.seats.join(', ') : b.seats}
                    </strong>
                  </div>
                  <div style={styles.detailCol}>
                    <span style={styles.detailLabel}>Amount Paid</span>
                    <strong style={styles.detailVal}>{formatINR(b.total)}</strong>
                  </div>
                  <div style={styles.detailCol}>
                    <span style={styles.detailLabel}>Reference</span>
                    <strong style={styles.refCode}>{b.ref}</strong>
                  </div>
                </div>

                {b.status === 'CONFIRMED' && (
                  <div style={styles.cardActions}>
                    <span style={styles.bookedDate}>
                      Booked {new Date(b.bookedAt).toLocaleDateString('en-IN')}
                    </span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        style={{
                          ...styles.cancelBtn,
                          color: '#34D399',
                          borderColor: 'rgba(16, 185, 129, 0.4)',
                          background: 'rgba(16, 185, 129, 0.1)',
                        }}
                        onClick={() => setSplitBooking(b)}
                      >
                        👥 Split Bill (UPI)
                      </button>
                      <button
                        style={styles.cancelBtn}
                        disabled={cancellingRef === b.ref}
                        onClick={() => handleCancelMovie(b)}
                      >
                        {cancellingRef === b.ref ? 'Cancelling...' : 'Cancel Movie Pass'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* EVENT BOOKINGS SECTION */}
      {showEvents && eventBookings.length > 0 && (
        <div style={styles.sectionGroup}>
          <h2 style={styles.sectionHeading}>Live Concerts & Performances</h2>
          <div style={styles.cardsGrid}>
            {eventBookings.map((b) => (
              <div
                key={b.id || b.ref}
                style={{
                  ...styles.card,
                  opacity: b.status === 'CANCELLED' ? 0.6 : 1,
                }}
              >
                <div style={styles.cardTop}>
                  <div>
                    <span style={{ ...styles.typeBadge, color: '#F59E0B', backgroundColor: 'rgba(245, 158, 11, 0.1)' }}>
                      CONCERT PASS
                    </span>
                    <h3 style={styles.itemTitle}>{b.eventTitle}</h3>
                    <div style={styles.itemMeta}>
                      📍 {b.eventVenue}, <strong style={{ color: '#F8FAFC' }}>{b.eventCity}</strong>
                    </div>
                  </div>
                  <span
                    style={{
                      ...styles.statusBadge,
                      backgroundColor: b.status === 'CANCELLED' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                      color: b.status === 'CANCELLED' ? '#FCA5A5' : '#34D399',
                      borderColor: b.status === 'CANCELLED' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)',
                    }}
                  >
                    {b.status}
                  </span>
                </div>

                <div style={styles.cardDetails}>
                  <div style={styles.detailCol}>
                    <span style={styles.detailLabel}>Schedule</span>
                    <strong style={styles.detailVal}>{b.eventDate} • {b.eventTime}</strong>
                  </div>
                  <div style={styles.detailCol}>
                    <span style={styles.detailLabel}>Quantity</span>
                    <strong style={{ ...styles.detailVal, color: '#F43F5E' }}>
                      {b.quantity} {b.quantity === 1 ? 'ticket' : 'tickets'}
                    </strong>
                  </div>
                  <div style={styles.detailCol}>
                    <span style={styles.detailLabel}>Total Paid</span>
                    <strong style={styles.detailVal}>{formatINR(b.total)}</strong>
                  </div>
                  <div style={styles.detailCol}>
                    <span style={styles.detailLabel}>Reference</span>
                    <strong style={styles.refCode}>{b.ref}</strong>
                  </div>
                </div>

                {b.status === 'CONFIRMED' && (
                  <div style={styles.cardActions}>
                    <span style={styles.bookedDate}>
                      Booked {new Date(b.bookedAt).toLocaleDateString('en-IN')}
                    </span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        style={{
                          ...styles.cancelBtn,
                          color: '#34D399',
                          borderColor: 'rgba(16, 185, 129, 0.4)',
                          background: 'rgba(16, 185, 129, 0.1)',
                        }}
                        onClick={() => setSplitBooking(b)}
                      >
                        👥 Split Bill (UPI)
                      </button>
                      <button
                        style={styles.cancelBtn}
                        disabled={cancellingRef === b.id}
                        onClick={() => handleCancelEvent(b)}
                      >
                        {cancellingRef === b.id ? 'Cancelling...' : 'Cancel Concert Pass'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {movieBookings.length === 0 && eventBookings.length === 0 && !loading && (
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>🎟️</div>
          <h2 style={styles.emptyTitle}>No Entertainment Bookings Yet</h2>
          <p style={styles.emptyText}>
            You haven't reserved any movie tickets or live concert passes. Explore trending Indian cinema or high-energy stadium tours!
          </p>
          <button style={styles.browseBtn} onClick={onBrowseEvents}>
            Explore Entertainment Catalog →
          </button>
        </div>
      )}
      {/* Split Bill Modal */}
      <SplitPaymentModal
        isOpen={Boolean(splitBooking)}
        onClose={() => setSplitBooking(null)}
        booking={splitBooking}
      />
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '1180px',
    margin: '3rem auto 6rem auto',
    padding: '0 1.5rem',
    color: '#F8FAFC',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: '1.5rem',
    marginBottom: '2rem',
  },
  kicker: {
    fontSize: '0.72rem',
    fontWeight: '800',
    letterSpacing: '0.12em',
    color: '#F43F5E',
    marginBottom: '0.2rem',
  },
  title: {
    fontSize: '2.2rem',
    fontWeight: '800',
    margin: '0 0 0.4rem 0',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: '0.92rem',
    color: '#94A3B8',
    margin: 0,
    maxWidth: '650px',
    lineHeight: 1.5,
  },
  counterBadge: {
    backgroundColor: '#0F172A',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '10px',
    padding: '0.6rem 1.2rem',
    fontSize: '0.9rem',
    fontWeight: '700',
    color: '#06B6D4',
  },
  tabBar: {
    display: 'flex',
    gap: '0.75rem',
    marginBottom: '2rem',
    flexWrap: 'wrap',
  },
  tabBtn: {
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '8px',
    padding: '0.6rem 1.2rem',
    fontSize: '0.85rem',
    fontWeight: '600',
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 0.15s ease',
  },
  feedbackBanner: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    border: '1px solid rgba(16, 185, 129, 0.3)',
    color: '#34D399',
    padding: '0.85rem 1.25rem',
    borderRadius: '8px',
    fontSize: '0.9rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2rem',
  },
  feedbackError: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    color: '#FCA5A5',
  },
  closeBannerBtn: {
    background: 'none',
    border: 'none',
    color: 'inherit',
    cursor: 'pointer',
    fontSize: '1rem',
  },
  sectionGroup: {
    marginBottom: '3rem',
  },
  sectionHeading: {
    fontSize: '1.3rem',
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: '1rem',
  },
  cardsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
    gap: '1.25rem',
  },
  card: {
    backgroundColor: '#0F172A',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '14px',
    padding: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  cardTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '1rem',
  },
  typeBadge: {
    display: 'inline-block',
    fontSize: '0.65rem',
    fontWeight: '800',
    letterSpacing: '0.08em',
    color: '#06B6D4',
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
    padding: '0.15rem 0.45rem',
    borderRadius: '4px',
    marginBottom: '0.4rem',
  },
  itemTitle: {
    fontSize: '1.1rem',
    fontWeight: '700',
    color: '#FFFFFF',
    margin: '0 0 0.2rem 0',
  },
  itemMeta: {
    fontSize: '0.8rem',
    color: '#94A3B8',
  },
  statusBadge: {
    border: '1px solid',
    borderRadius: '4px',
    padding: '0.2rem 0.5rem',
    fontSize: '0.68rem',
    fontWeight: '800',
  },
  cardDetails: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '0.75rem',
    backgroundColor: '#162035',
    padding: '0.85rem 1rem',
    borderRadius: '8px',
  },
  detailCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.1rem',
  },
  detailLabel: {
    fontSize: '0.65rem',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  detailVal: {
    fontSize: '0.85rem',
    color: '#F8FAFC',
    fontWeight: '600',
  },
  refCode: {
    fontSize: '0.95rem',
    color: '#F43F5E',
    fontFamily: 'monospace',
    fontWeight: '800',
  },
  cardActions: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: '0.5rem',
    borderTop: '1px solid rgba(255, 255, 255, 0.06)',
  },
  bookedDate: {
    fontSize: '0.72rem',
    color: '#64748B',
  },
  cancelBtn: {
    backgroundColor: 'transparent',
    color: '#FCA5A5',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: '6px',
    padding: '0.4rem 0.8rem',
    fontSize: '0.75rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  emptyState: {
    textAlign: 'center',
    padding: '6rem 1.5rem',
    backgroundColor: '#0F172A',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '16px',
  },
  emptyIcon: {
    fontSize: '3rem',
    marginBottom: '1rem',
  },
  emptyTitle: {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: '0.5rem',
  },
  emptyText: {
    fontSize: '0.92rem',
    color: '#94A3B8',
    maxWidth: '500px',
    margin: '0 auto 2rem auto',
    lineHeight: 1.5,
  },
  browseBtn: {
    backgroundColor: '#E11D48',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '8px',
    padding: '0.85rem 1.75rem',
    fontSize: '0.95rem',
    fontWeight: '700',
    cursor: 'pointer',
  },
  loadingBox: {
    textAlign: 'center',
    padding: '4rem 1rem',
    color: '#94A3B8',
  },
  spinner: {
    width: '32px',
    height: '32px',
    border: '3px solid rgba(255, 255, 255, 0.1)',
    borderTopColor: '#F43F5E',
    borderRadius: '50%',
    margin: '0 auto 1rem auto',
    animation: 'spin 1s linear infinite',
  },
};
