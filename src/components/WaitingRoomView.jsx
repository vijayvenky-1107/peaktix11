import React, { useState, useEffect, useRef } from 'react';
import {
  joinWaitingQueue,
  getWaitingQueueStatus,
  admitWaitingQueueBatch,
} from '../services/api';

export default function WaitingRoomView({
  events = [],
  currentUser,
  onProceedToBooking,
  onBackToHome,
}) {
  const [selectedEventId, setSelectedEventId] = useState(() => (events[0]?.id ? String(events[0].id) : '1'));
  const [ticket, setTicket] = useState(() => localStorage.getItem('peaktix_active_ticket') || null);
  const [queueData, setQueueData] = useState(null);
  const [isAdmitted, setIsAdmitted] = useState(false);
  const [admittedTimeRemaining, setAdmittedTimeRemaining] = useState(300);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [admitCount, setAdmitCount] = useState(0);
  const pollTimerRef = useRef(null);

  const selectedEvent = events.find((e) => String(e.id) === String(selectedEventId)) || events[0] || {
    id: 1,
    title: 'Arijit Singh - Soulful Symphony India Tour',
    venue: 'DY Patil Stadium, Navi Mumbai',
    price: 1500,
    available: 48,
  };

  // Poll status if ticket exists
  useEffect(() => {
    if (!ticket) return;

    let isMounted = true;

    const checkStatus = async () => {
      try {
        const res = await getWaitingQueueStatus(ticket);
        if (!isMounted) return;

        if (res.success) {
          setQueueData(res);
          if (res.status === 'ADMITTED') {
            setIsAdmitted(true);
            setAdmittedTimeRemaining(res.expiresInSeconds || 300);
          } else {
            setIsAdmitted(false);
          }
        } else if (res.status === 'NOT_FOUND' || res.status === 'EXPIRED') {
          setQueueData(null);
          setIsAdmitted(false);
          setTicket(null);
          localStorage.removeItem('peaktix_active_ticket');
        }
      } catch (err) {
        console.warn('Queue status poll error:', err.message);
      }
    };

    checkStatus();
    pollTimerRef.current = setInterval(checkStatus, 2500);

    return () => {
      isMounted = false;
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [ticket]);

  // Admitted countdown timer
  useEffect(() => {
    if (!isAdmitted) return;
    const interval = setInterval(() => {
      setAdmittedTimeRemaining((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [isAdmitted]);

  const handleJoinQueue = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const email = currentUser?.email || 'guest@peaktix.in';
      const res = await joinWaitingQueue(selectedEvent.id, email);
      if (res.success) {
        setTicket(res.ticket);
        setQueueData(res);
        localStorage.setItem('peaktix_active_ticket', res.ticket);
        setIsAdmitted(false);
      } else {
        setErrorMsg(res.error || 'Failed to enter queue.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Error joining queue.');
    } finally {
      setLoading(false);
    }
  };

  const handleSimulateAdmission = async () => {
    try {
      setLoading(true);
      const res = await admitWaitingQueueBatch(5);
      if (res.success) {
        setAdmitCount((prev) => prev + (res.admittedCount || 5));
        // Refresh status immediately
        if (ticket) {
          const statusRes = await getWaitingQueueStatus(ticket);
          if (statusRes.success) {
            setQueueData(statusRes);
            if (statusRes.status === 'ADMITTED') {
              setIsAdmitted(true);
              setAdmittedTimeRemaining(statusRes.expiresInSeconds || 300);
            }
          }
        }
      }
    } catch (err) {
      console.error('Failed to trigger batch admission:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveQueue = () => {
    setTicket(null);
    setQueueData(null);
    setIsAdmitted(false);
    localStorage.removeItem('peaktix_active_ticket');
  };

  // Compute unique ticket confirmation probability
  const calculateProbability = () => {
    if (isAdmitted) return { score: 100, label: 'CONFIRMED ADMISSION', color: '#10B981', note: 'Spot is guaranteed during your 5-minute checkout window!' };
    if (!queueData) return { score: 92, label: 'HIGH CHANCE', color: '#10B981', note: 'Tickets currently available in live inventory.' };

    const pos = queueData.position || 1;
    const avail = selectedEvent?.available || 50;

    if (pos <= Math.max(1, avail * 0.6)) {
      return {
        score: Math.min(98, Math.max(88, 100 - pos * 2)),
        label: 'VERY HIGH PROBABILITY (Likely Confirmed)',
        color: '#10B981',
        note: 'Seats are safely within current inventory allocation. Have your UPI / Card ready!',
      };
    } else if (pos <= avail) {
      return {
        score: Math.min(85, Math.max(65, 90 - pos * 3)),
        label: 'MODERATE CHANCE (Fast Selling)',
        color: '#F59E0B',
        note: 'High concurrency! Several users ahead of you are completing checkout.',
      };
    } else {
      return {
        score: Math.min(48, Math.max(15, 60 - (pos - avail) * 4)),
        label: 'WAITLIST RISK (Overflow Demand)',
        color: '#EF4444',
        note: 'Tickets are in carts ahead of you. Confirmation depends on cart drops and 5-min expirations.',
      };
    }
  };

  const prob = calculateProbability();

  const formatSecs = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div style={styles.container}>
      {/* Header Banner */}
      <div style={styles.header}>
        <div style={styles.badgeRow}>
          <span style={styles.liveIndicator}>
            <span style={styles.pulsingDot} /> LIVE QUEUE ENGINE
          </span>
          <span style={styles.secureBadge}>🛡️ ACID CONCURRENCY PROTECTED</span>
        </div>
        <h1 style={styles.title}>PeakTix Virtual Waiting Room</h1>
        <p style={styles.subtitle}>
          BookMyShow-style high-demand traffic regulator with real-time ticket confirmation likelihood forecasting.
        </p>
      </div>

      {/* Main Queue Dashboard */}
      <div style={styles.card}>
        {/* Event Selection Bar */}
        <div style={styles.eventPickerRow}>
          <div style={styles.pickerLeft}>
            <span style={styles.pickerLabel}>SELECT TARGET EVENT:</span>
            <select
              style={styles.pickerSelect}
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              disabled={Boolean(ticket)}
            >
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.title} — {ev.city} (Seats left: {ev.available})
                </option>
              ))}
            </select>
          </div>

          <div style={styles.stockPill}>
            <span>Available Seats:</span>
            <strong style={{ color: selectedEvent.available > 10 ? '#34D399' : '#F87171', fontSize: '1.1rem' }}>
              {selectedEvent.available}
            </strong>
          </div>
        </div>

        {/* ACTIVE ADMISSION BANNER */}
        {isAdmitted && (
          <div style={styles.admittedBanner}>
            <div style={styles.admittedIcon}>🎉</div>
            <div style={{ flex: 1 }}>
              <div style={styles.admittedTitle}>YOU ARE ADMITTED! YOUR SPOT IS RESERVED</div>
              <div style={styles.admittedDesc}>
                You have been cleared by the traffic regulator. Complete your ticket selection within{' '}
                <strong style={{ color: '#FDE047', fontSize: '1.2rem' }}>{formatSecs(admittedTimeRemaining)}</strong> before seats are released.
              </div>
            </div>
            <button
              style={styles.bookNowBtn}
              onClick={() => onProceedToBooking && onProceedToBooking(selectedEvent)}
            >
              Proceed to Book Seats →
            </button>
          </div>
        )}

        {/* QUEUE STATUS BOARD */}
        {ticket && !isAdmitted && (
          <div style={styles.inQueueSection}>
            <div style={styles.ticketBadgeRow}>
              <div>
                <span style={styles.ticketLabel}>YOUR QUEUE PASS</span>
                <span style={styles.ticketId}>{ticket}</span>
              </div>
              <div style={styles.statusPillWaiting}>WAITING IN LINE</div>
            </div>

            <div style={styles.statsGrid}>
              <div style={styles.statBox}>
                <span style={styles.statLabel}>Position in Line</span>
                <span style={styles.statNumber}>#{queueData?.position ?? 1}</span>
                <span style={styles.statSub}>of {queueData?.totalWaiting || 1} users waiting</span>
              </div>

              <div style={styles.statBox}>
                <span style={styles.statLabel}>Estimated Wait</span>
                <span style={styles.statNumber}>~{queueData?.estimatedWaitSeconds || 5}s</span>
                <span style={styles.statSub}>Processing in batches of 10</span>
              </div>

              <div style={styles.statBox}>
                <span style={styles.statLabel}>Throughput Rate</span>
                <span style={styles.statNumber}>120 / min</span>
                <span style={styles.statSub}>Auto-balanced ingress</span>
              </div>
            </div>

            {/* PROGRESS BAR */}
            <div style={styles.progressContainer}>
              <div style={styles.progressLabels}>
                <span>Queue Ingress</span>
                <span>Moving to Checkout</span>
              </div>
              <div style={styles.progressBarTrack}>
                <div
                  style={{
                    ...styles.progressBarFill,
                    width: `${Math.min(95, Math.max(15, 100 - (queueData?.position || 1) * 8))}%`,
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* NOT IN QUEUE STATE */}
        {!ticket && (
          <div style={styles.notQueuedState}>
            <div style={styles.queueGraphic}>🎟️</div>
            <h3 style={styles.notQueuedTitle}>Join the Line for High-Demand Access</h3>
            <p style={styles.notQueuedText}>
              During stadium tours and blockbuster premieres, the waiting room regulates traffic to guarantee zero overselling.
            </p>
            <button
              style={styles.joinQueueBtn}
              onClick={handleJoinQueue}
              disabled={loading}
            >
              {loading ? 'Entering Line...' : `Enter Waiting Line for "${selectedEvent.title}"`}
            </button>
          </div>
        )}

        {/* UNIQUE FEATURE: DYNAMIC CONFIRMATION PROBABILITY METER */}
        <div style={styles.probabilityCard}>
          <div style={styles.probHeader}>
            <div style={styles.probTitleRow}>
              <span style={styles.probIcon}>📊</span>
              <div>
                <h3 style={styles.probTitle}>Ticket Confirmation Likelihood Meter</h3>
                <p style={styles.probSubtitle}>
                  Computed live: Available Inventory ({selectedEvent.available} seats) vs Queue Rank (#{queueData?.position || 1})
                </p>
              </div>
            </div>
            <div style={{ ...styles.probScoreBadge, borderColor: prob.color, color: prob.color }}>
              {prob.score}% Likelihood
            </div>
          </div>

          {/* Meter Bar */}
          <div style={styles.meterTrack}>
            <div
              style={{
                ...styles.meterFill,
                width: `${prob.score}%`,
                background: `linear-gradient(90deg, #F59E0B, ${prob.color})`,
              }}
            />
          </div>

          <div style={styles.probVerdictRow}>
            <span style={{ fontWeight: 700, color: prob.color }}>{prob.label}</span>
            <span style={styles.probNote}>{prob.note}</span>
          </div>
        </div>

        {/* BATCH ADMISSION SIMULATOR CONTROLS */}
        <div style={styles.simControlsCard}>
          <div style={styles.simHeader}>
            <span style={{ fontSize: '1.1rem' }}>⚡</span>
            <div>
              <strong style={{ color: '#FFFFFF', fontSize: '0.95rem' }}>Live Batch Admission Simulator</strong>
              <div style={{ fontSize: '0.8rem', color: '#94A3B8' }}>
                Test immediate admission like peak BookMyShow / IRCTC rush hours.
              </div>
            </div>
          </div>

          <div style={styles.simActions}>
            <button
              style={styles.simAdmitBtn}
              onClick={handleSimulateAdmission}
              disabled={loading}
            >
              🚀 Admit Next Batch of 5 Users
            </button>

            {ticket && (
              <button style={styles.leaveQueueBtn} onClick={handleLeaveQueue}>
                Leave Waiting Room
              </button>
            )}

            <button style={styles.backHomeBtn} onClick={onBackToHome}>
              ← Back to Shows
            </button>
          </div>

          {admitCount > 0 && (
            <div style={styles.admitNotice}>
              ✓ {admitCount} users admitted to purchase window via simulation.
            </div>
          )}
        </div>

        {errorMsg && <div style={styles.errorBanner}>{errorMsg}</div>}
      </div>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '960px',
    margin: '2rem auto 5rem auto',
    padding: '0 1.5rem',
    color: '#F8FAFC',
  },
  header: {
    textAlign: 'center',
    marginBottom: '2rem',
  },
  badgeRow: {
    display: 'flex',
    justifyContent: 'center',
    gap: '12px',
    marginBottom: '0.75rem',
  },
  liveIndicator: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    background: 'rgba(239, 68, 68, 0.2)',
    border: '1px solid rgba(239, 68, 68, 0.4)',
    color: '#FCA5A5',
    padding: '4px 12px',
    borderRadius: '999px',
    fontSize: '0.75rem',
    fontWeight: 700,
    letterSpacing: '0.05em',
  },
  pulsingDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: '#EF4444',
  },
  secureBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    background: 'rgba(16, 185, 129, 0.15)',
    border: '1px solid rgba(16, 185, 129, 0.3)',
    color: '#6EE7B7',
    padding: '4px 12px',
    borderRadius: '999px',
    fontSize: '0.75rem',
    fontWeight: 600,
  },
  title: {
    fontSize: '2.2rem',
    fontWeight: 800,
    color: '#FFFFFF',
    margin: '0.5rem 0',
  },
  subtitle: {
    fontSize: '0.95rem',
    color: '#94A3B8',
    maxWidth: '640px',
    margin: '0 auto',
  },
  card: {
    background: '#1E293B',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '16px',
    padding: '2rem',
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
  },
  eventPickerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '1rem',
    background: '#0F172A',
    padding: '1rem',
    borderRadius: '12px',
    marginBottom: '1.5rem',
    width: '100%',
    boxSizing: 'border-box',
  },

  pickerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flex: '1 1 500px',
    minWidth: 0,
    maxWidth: '100%',

  },
  pickerLabel: {
    fontSize: '0.75rem',
    fontWeight: 700,
    color: '#94A3B8',
    letterSpacing: '0.05em',
    flexShrink: 0,
  },
  pickerSelect: {
    flex: '1 1 0',
    minWidth: 0,
    width: '100%',
    boxSizing: 'border-box',
    background: '#1E293B',
    color: '#FFFFFF',
    border: '1px solid #334155',
    borderRadius: '8px',
    padding: '8px 12px',
    fontSize: '0.85rem',
    outline: 'none',
  },

  stockPill: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: '8px',
    fontSize: '0.85rem',
    color: '#CBD5E1',
    flexShrink: 0,
    whiteSpace: 'nowrap',
  },
  admittedBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '1.25rem',
    background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.25), rgba(5, 150, 105, 0.35))',
    border: '2px solid #10B981',
    borderRadius: '12px',
    padding: '1.5rem',
    marginBottom: '1.5rem',
  },
  admittedIcon: {
    fontSize: '2.5rem',
  },
  admittedTitle: {
    fontSize: '1.15rem',
    fontWeight: 800,
    color: '#FFFFFF',
    letterSpacing: '0.02em',
  },
  admittedDesc: {
    fontSize: '0.85rem',
    color: '#D1FAE5',
    marginTop: '4px',
  },
  bookNowBtn: {
    background: '#10B981',
    color: '#064E3B',
    fontWeight: 800,
    fontSize: '0.95rem',
    padding: '12px 20px',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  inQueueSection: {
    background: '#0F172A',
    borderRadius: '12px',
    padding: '1.5rem',
    marginBottom: '1.5rem',
  },
  ticketBadgeRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid #1E293B',
    paddingBottom: '1rem',
    marginBottom: '1rem',
  },
  ticketLabel: {
    display: 'block',
    fontSize: '0.7rem',
    color: '#94A3B8',
    letterSpacing: '0.05em',
  },
  ticketId: {
    fontSize: '1.3rem',
    fontWeight: 800,
    color: '#F43F5E',
    fontFamily: 'monospace',
  },
  statusPillWaiting: {
    background: 'rgba(245, 158, 11, 0.2)',
    color: '#FBBF24',
    border: '1px solid rgba(245, 158, 11, 0.4)',
    padding: '6px 14px',
    borderRadius: '999px',
    fontSize: '0.75rem',
    fontWeight: 700,
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '1rem',
    marginBottom: '1.25rem',
  },
  statBox: {
    background: '#1E293B',
    padding: '1rem',
    borderRadius: '10px',
    textAlign: 'center',
  },
  statLabel: {
    display: 'block',
    fontSize: '0.75rem',
    color: '#94A3B8',
    marginBottom: '4px',
  },
  statNumber: {
    display: 'block',
    fontSize: '1.8rem',
    fontWeight: 800,
    color: '#FFFFFF',
  },
  statSub: {
    fontSize: '0.7rem',
    color: '#64748B',
  },
  progressContainer: {
    marginTop: '0.5rem',
  },
  progressLabels: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.75rem',
    color: '#94A3B8',
    marginBottom: '6px',
  },
  progressBarTrack: {
    width: '100%',
    height: '10px',
    background: '#1E293B',
    borderRadius: '999px',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #F43F5E, #EC4899)',
    borderRadius: '999px',
    transition: 'width 0.4s ease',
  },
  notQueuedState: {
    textAlign: 'center',
    padding: '2.5rem 1rem',
    background: '#0F172A',
    borderRadius: '12px',
    marginBottom: '1.5rem',
  },
  queueGraphic: {
    fontSize: '3rem',
    marginBottom: '0.5rem',
  },
  notQueuedTitle: {
    fontSize: '1.25rem',
    color: '#FFFFFF',
    fontWeight: 700,
    margin: '0.5rem 0',
  },
  notQueuedText: {
    fontSize: '0.85rem',
    color: '#94A3B8',
    maxWidth: '480px',
    margin: '0 auto 1.5rem auto',
    lineHeight: 1.5,
  },
  joinQueueBtn: {
    background: 'linear-gradient(135deg, #F43F5E, #BE123C)',
    color: '#FFFFFF',
    border: 'none',
    padding: '12px 28px',
    borderRadius: '8px',
    fontWeight: 700,
    fontSize: '0.95rem',
    cursor: 'pointer',
    boxShadow: '0 8px 20px rgba(244, 63, 94, 0.35)',
  },
  probabilityCard: {
    background: '#0F172A',
    border: '1px solid #334155',
    borderRadius: '12px',
    padding: '1.25rem',
    marginBottom: '1.5rem',
  },
  probHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem',
  },
  probTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  probIcon: {
    fontSize: '1.5rem',
  },
  probTitle: {
    fontSize: '1rem',
    fontWeight: 700,
    color: '#FFFFFF',
    margin: 0,
  },
  probSubtitle: {
    fontSize: '0.75rem',
    color: '#94A3B8',
    margin: '2px 0 0 0',
  },
  probScoreBadge: {
    padding: '6px 14px',
    border: '1.5px solid',
    borderRadius: '8px',
    fontWeight: 800,
    fontSize: '0.9rem',
  },
  meterTrack: {
    width: '100%',
    height: '12px',
    background: '#1E293B',
    borderRadius: '999px',
    overflow: 'hidden',
    marginBottom: '0.75rem',
  },
  meterFill: {
    height: '100%',
    borderRadius: '999px',
    transition: 'width 0.5s ease',
  },
  probVerdictRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '0.8rem',
  },
  probNote: {
    color: '#94A3B8',
  },
  simControlsCard: {
    background: '#0F172A',
    borderRadius: '12px',
    padding: '1.25rem',
    border: '1px dashed #334155',
  },
  simHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '1rem',
  },
  simActions: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap',
  },
  simAdmitBtn: {
    background: '#2563EB',
    color: '#FFFFFF',
    border: 'none',
    padding: '10px 18px',
    borderRadius: '8px',
    fontWeight: 700,
    fontSize: '0.85rem',
    cursor: 'pointer',
  },
  leaveQueueBtn: {
    background: 'transparent',
    color: '#94A3B8',
    border: '1px solid #475569',
    padding: '10px 18px',
    borderRadius: '8px',
    fontWeight: 600,
    fontSize: '0.85rem',
    cursor: 'pointer',
  },
  backHomeBtn: {
    background: 'transparent',
    color: '#CBD5E1',
    border: '1px solid #334155',
    padding: '10px 18px',
    borderRadius: '8px',
    fontWeight: 600,
    fontSize: '0.85rem',
    cursor: 'pointer',
    marginLeft: 'auto',
  },
  admitNotice: {
    marginTop: '0.75rem',
    fontSize: '0.8rem',
    color: '#34D399',
  },
  errorBanner: {
    marginTop: '1rem',
    padding: '10px 14px',
    background: 'rgba(239, 68, 68, 0.2)',
    color: '#F87171',
    borderRadius: '8px',
    fontSize: '0.85rem',
  },
};
