import React, { useState, useEffect } from 'react';
import BookingForm from './BookingForm';
import ReleaseCountdown from './ReleaseCountdown';
import { formatINR } from '../utils/formatters.js';
import { API_BASE } from '../services/api.js';

export default function EventDetail({ event, onBack, remainingTickets, onBook }) {
  const [imgError, setImgError] = useState(false);
  const [isSaleOpen, setIsSaleOpen] = useState(() => {
    if (!event?.sale_start) return true;
    return new Date(event.sale_start).getTime() <= Date.now();
  });

  const [queueState, setQueueState] = useState(null);
  const [queueLoading, setQueueLoading] = useState(false);

  // Poll queue status if WAITING
  useEffect(() => {
    if (!queueState || queueState.status !== 'WAITING') return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/queue/status?ticket=${queueState.ticket}`);
        const data = await res.json();
        if (data.success) {
          if (data.status === 'ADMITTED') {
            setQueueState((prev) => ({
              ...prev,
              status: 'ADMITTED',
              token: data.admittedToken,
            }));
          } else {
            setQueueState((prev) => ({
              ...prev,
              position: data.position,
              estimatedWaitSeconds: data.estimatedWaitSeconds,
            }));
          }
        }
      } catch {
        // Ignore polling error
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [queueState]);

  const handleJoinQueue = async () => {
    setQueueLoading(true);
    try {
      const res = await fetch(`${API_BASE}/queue/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId: event.id, email: 'user@peaktix.local' }),
      });
      const data = await res.json();
      if (data.success) {
        setQueueState({
          ticket: data.ticket,
          position: data.position,
          estimatedWaitSeconds: data.estimatedWaitSeconds,
          status: 'WAITING',
          token: null,
        });
      }
    } catch (err) {
      alert(`Could not join queue: ${err.message}`);
    } finally {
      setQueueLoading(false);
    }
  };

  const handleAdmitBatch = async () => {
    setQueueLoading(true);
    try {
      await fetch(`${API_BASE}/queue/admit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchSize: 10 }),
      });
      if (queueState?.ticket) {
        const res = await fetch(`${API_BASE}/queue/status?ticket=${queueState.ticket}`);
        const data = await res.json();
        if (data.success && data.status === 'ADMITTED') {
          setQueueState((prev) => ({
            ...prev,
            status: 'ADMITTED',
            token: data.admittedToken,
          }));
        }
      }
    } catch (err) {
      console.warn('Admit error:', err);
    } finally {
      setQueueLoading(false);
    }
  };

  if (!event) return null;

  const availableCount = remainingTickets !== undefined ? remainingTickets : event.available;
  const isSoldOut = availableCount <= 0;

  return (
    <>
      <style>{`
        .ptx-detail-back:hover {
          color: #FFFFFF !important;
          transform: translateX(-3px);
        }
        @media (max-width: 768px) {
          .ptx-detail-grid {
            grid-template-columns: 1fr !important;
          }
          .ptx-detail-header {
            flex-direction: column !important;
          }
          .ptx-detail-poster {
            max-width: 100% !important;
            aspect-ratio: 16 / 9 !important;
          }
        }
      `}</style>

      <div style={styles.container}>
        {/* Back Link */}
        <button
          type="button"
          className="ptx-detail-back"
          onClick={onBack}
          style={styles.backButton}
        >
          ← Back to All Shows & Concerts
        </button>

        {/* Cinematic Card */}
        <div style={styles.card}>
          {/* Top Banner & Poster Grid */}
          <div className="ptx-detail-header" style={styles.headerGrid}>
            {/* Poster */}
            <div className="ptx-detail-poster" style={styles.posterWrapper}>
              {imgError ? (
                <div style={styles.posterFallback}>
                  <span style={{ fontSize: 48 }}>🎬</span>
                  <span style={{ fontSize: 14, color: '#94A3B8', fontWeight: 600 }}>{event.category}</span>
                </div>
              ) : (
                <img
                  src={event.image}
                  alt={event.title}
                  style={styles.posterImage}
                  onError={() => setImgError(true)}
                />
              )}
            </div>

            {/* Event Primary Info */}
            <div style={styles.infoCol}>
              <div style={styles.tagRow}>
                <span style={styles.categoryBadge}>{event.category}</span>
                {event.language && <span style={styles.languageBadge}>{event.language}</span>}
                <span style={styles.demoPill}>DEMO SHOWCASE</span>
              </div>

              <h1 style={styles.title}>{event.title}</h1>

              {/* Key Details Strip */}
              <div style={styles.detailsStrip}>
                <div style={styles.stripItem}>
                  <span style={styles.stripLabel}>DATE & TIME</span>
                  <span style={styles.stripValue}>🗓️ {event.date} at {event.time}</span>
                </div>
                <div style={styles.stripItem}>
                  <span style={styles.stripLabel}>VENUE & LOCATION</span>
                  <span style={styles.stripValue}>📍 {event.venue}, {event.city}</span>
                </div>
                <div style={styles.stripItem}>
                  <span style={styles.stripLabel}>TICKET PRICE</span>
                  <span style={styles.stripPrice}>{formatINR(event.price)} <span style={styles.perSeat}>per seat</span></span>
                </div>
                <div style={styles.stripItem}>
                  <span style={styles.stripLabel}>AVAILABILITY</span>
                  <span
                    style={{
                      ...styles.stripValue,
                      color: isSoldOut ? '#EF4444' : availableCount <= 10 ? '#F59E0B' : '#10B981',
                      fontWeight: 700,
                    }}
                  >
                    ● {isSoldOut ? 'Sold Out in Demo' : `${availableCount} tickets left`}
                  </span>
                </div>
              </div>

              {/* Description */}
              <div style={styles.descriptionSection}>
                <h3 style={styles.descHeading}>About This Experience</h3>
                <p style={styles.descriptionText}>
                  {event.description}
                </p>
              </div>
            </div>
          </div>

          {/* Interactive Booking Section or Release Countdown / Waiting Room */}
          <div style={styles.bookingWrapper}>
            {!isSaleOpen ? (
              <div>
                <ReleaseCountdown
                  saleStart={event.sale_start}
                  onSaleOpen={() => setIsSaleOpen(true)}
                />
                <div style={styles.saleLockedCard}>
                  <span style={styles.lockIcon}>🔒</span>
                  <h4 style={styles.lockTitle}>Booking is Temporarily Locked</h4>
                  <p style={styles.lockDesc}>
                    Tickets for this drop will become available as soon as the countdown timer reaches zero. At that time, users can enter the queue and secure reservations.
                  </p>
                </div>
              </div>
            ) : event.sale_start && (!queueState || queueState.status === 'WAITING') ? (
              <div style={styles.waitingRoomCard}>
                <div style={styles.queueHeaderRow}>
                  <div>
                    <span style={styles.queueBadge}>⚡ VIRTUAL WAITING ROOM (TRAFFIC REGULATOR)</span>
                    <h3 style={styles.queueTitle}>High-Demand Ticket Release Line</h3>
                  </div>
                </div>

                {!queueState ? (
                  <div style={styles.queueJoinPrompt}>
                    <p style={styles.queuePromptText}>
                      This ticket release is experiencing high traffic. Join the virtual waiting line to secure an admission pass before purchasing.
                    </p>
                    <button
                      type="button"
                      style={styles.joinQueueBtn}
                      onClick={handleJoinQueue}
                      disabled={queueLoading}
                    >
                      {queueLoading ? 'Joining Waiting Line...' : '🎟️ Join Virtual Waiting Line'}
                    </button>
                  </div>
                ) : (
                  <div style={styles.queueActiveBox}>
                    <div style={styles.queueMetricsStrip}>
                      <div style={styles.queueMetric}>
                        <span style={styles.qmLabel}>YOUR TICKET</span>
                        <span style={styles.qmValTicket}>{queueState.ticket}</span>
                      </div>
                      <div style={styles.queueMetric}>
                        <span style={styles.qmLabel}>POSITION IN LINE</span>
                        <span style={styles.qmValPos}>#{queueState.position}</span>
                      </div>
                      <div style={styles.queueMetric}>
                        <span style={styles.qmLabel}>ESTIMATED WAIT</span>
                        <span style={styles.qmVal}>~{queueState.estimatedWaitSeconds}s</span>
                      </div>
                    </div>

                    <div style={styles.queueActionsRow}>
                      <div style={styles.pollingIndicator}>
                        <span style={styles.pulseDot} />
                        <span>Checking status every 2s... Users admitted in small batches.</span>
                      </div>
                      <button
                        type="button"
                        style={styles.admitBatchBtn}
                        onClick={handleAdmitBatch}
                        disabled={queueLoading}
                      >
                        ⚡ Simulate Batch Admission (Admit 10)
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div>
                {queueState?.status === 'ADMITTED' && (
                  <div style={styles.admittedNotice}>
                    ✓ Admitted! Your 5-minute purchase window is active. Server-side inventory checks guarantee zero overselling.
                  </div>
                )}
                <BookingForm
                  event={event}
                  remainingTickets={availableCount}
                  onBook={onBook}
                  queueToken={queueState?.token}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

const styles = {
  container: {
    maxWidth: 1040,
    margin: '110px auto 60px',
    padding: '0 24px',
    boxSizing: 'border-box',
    width: '100%',
  },
  backButton: {
    background: 'none',
    border: 'none',
    color: '#FB7185',
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    marginBottom: 20,
    padding: 0,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    transition: 'all 0.2s ease',
  },
  card: {
    background: '#0F172A',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: 24,
    overflow: 'hidden',
    boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
  },
  headerGrid: {
    display: 'flex',
    gap: 36,
    padding: 36,
    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
    background: 'linear-gradient(180deg, #131C31 0%, #0F172A 100%)',
  },
  posterWrapper: {
    flexShrink: 0,
    width: 280,
    aspectRatio: '4 / 5',
    borderRadius: 16,
    overflow: 'hidden',
    boxShadow: '0 12px 30px rgba(0, 0, 0, 0.4)',
    backgroundColor: '#1E293B',
  },
  posterImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
  },
  posterFallback: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    background: '#1E293B',
  },
  infoCol: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  tagRow: {
    display: 'flex',
    gap: 8,
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 14,
  },
  categoryBadge: {
    background: 'rgba(225, 29, 72, 0.15)',
    border: '1px solid rgba(225, 29, 72, 0.3)',
    color: '#FB7185',
    fontSize: 12,
    fontWeight: 700,
    padding: '4px 12px',
    borderRadius: 20,
    textTransform: 'uppercase',
  },
  languageBadge: {
    background: 'rgba(6, 182, 212, 0.15)',
    border: '1px solid rgba(6, 182, 212, 0.3)',
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: 600,
    padding: '4px 12px',
    borderRadius: 20,
  },
  demoPill: {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.05em',
    color: '#94A3B8',
    background: 'rgba(255, 255, 255, 0.08)',
    padding: '4px 10px',
    borderRadius: 14,
  },
  title: {
    fontFamily: "'Outfit', sans-serif",
    fontSize: 32,
    fontWeight: 800,
    color: '#F8FAFC',
    lineHeight: 1.25,
    margin: '0 0 20px',
    letterSpacing: '-0.02em',
  },
  detailsStrip: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: 16,
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    borderRadius: 14,
    padding: 16,
    marginBottom: 24,
  },
  stripItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  stripLabel: {
    fontSize: 11,
    fontWeight: 700,
    color: '#64748B',
    letterSpacing: '0.06em',
  },
  stripValue: {
    fontSize: 14,
    color: '#F8FAFC',
    fontWeight: 500,
  },
  stripPrice: {
    fontFamily: "'Outfit', sans-serif",
    fontSize: 22,
    fontWeight: 800,
    color: '#F8FAFC',
  },
  perSeat: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: 400,
  },
  descriptionSection: {
    marginTop: 'auto',
  },
  descHeading: {
    fontSize: 16,
    fontWeight: 700,
    color: '#F8FAFC',
    margin: '0 0 8px',
  },
  descriptionText: {
    fontSize: 14,
    lineHeight: 1.65,
    color: '#94A3B8',
    margin: 0,
  },
  bookingWrapper: {
    padding: '24px 36px 36px',
    backgroundColor: '#0F172A',
  },
  saleLockedCard: {
    background: '#131C31',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: '28px 24px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
  },
  lockIcon: {
    fontSize: 32,
    marginBottom: 4,
  },
  lockTitle: {
    fontFamily: "'Outfit', sans-serif",
    fontSize: 18,
    fontWeight: 700,
    color: '#F8FAFC',
    margin: 0,
  },
  lockDesc: {
    fontSize: 14,
    color: '#94A3B8',
    maxWidth: 520,
    margin: 0,
    lineHeight: 1.6,
  },
  waitingRoomCard: {
    background: '#131C31',
    border: '1px solid rgba(244, 63, 94, 0.3)',
    borderRadius: 20,
    padding: '28px 24px',
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  queueHeaderRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  queueBadge: {
    display: 'inline-block',
    fontSize: 11,
    fontWeight: 800,
    color: '#F43F5E',
    letterSpacing: '0.08em',
  },
  queueTitle: {
    fontFamily: "'Outfit', sans-serif",
    fontSize: 22,
    fontWeight: 800,
    color: '#F8FAFC',
    margin: 0,
  },
  queueJoinPrompt: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  queuePromptText: {
    fontSize: 14,
    color: '#94A3B8',
    margin: 0,
    lineHeight: 1.6,
  },
  joinQueueBtn: {
    alignSelf: 'flex-start',
    padding: '12px 24px',
    background: 'linear-gradient(135deg, #E11D48 0%, #F43F5E 100%)',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: 12,
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 4px 16px rgba(225, 29, 72, 0.3)',
  },
  queueActiveBox: {
    display: 'flex',
    flexDirection: 'column',
    gap: 18,
  },
  queueMetricsStrip: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
    gap: 12,
  },
  queueMetric: {
    background: '#0F172A',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: '12px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  qmLabel: {
    fontSize: 10,
    fontWeight: 700,
    color: '#64748B',
    letterSpacing: '0.06em',
  },
  qmValTicket: {
    fontFamily: "'Outfit', monospace",
    fontSize: 16,
    fontWeight: 800,
    color: '#F43F5E',
  },
  qmValPos: {
    fontFamily: "'Outfit', sans-serif",
    fontSize: 20,
    fontWeight: 800,
    color: '#F8FAFC',
  },
  qmVal: {
    fontFamily: "'Outfit', sans-serif",
    fontSize: 18,
    fontWeight: 700,
    color: '#38BDF8',
  },
  queueActionsRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  pollingIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 12,
    color: '#94A3B8',
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    backgroundColor: '#34D399',
    boxShadow: '0 0 8px #34D399',
  },
  admitBatchBtn: {
    padding: '9px 18px',
    background: '#1E293B',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    color: '#F8FAFC',
    borderRadius: 10,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  },
  admittedNotice: {
    background: 'rgba(16, 185, 129, 0.15)',
    border: '1px solid rgba(16, 185, 129, 0.35)',
    color: '#34D399',
    padding: '12px 18px',
    borderRadius: 12,
    fontSize: 13,
    fontWeight: 600,
    marginBottom: 20,
  },
};
