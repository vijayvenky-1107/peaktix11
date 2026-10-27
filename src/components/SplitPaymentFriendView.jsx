import React, { useState, useEffect } from 'react';
import { formatINR } from '../utils/formatters';
import { getSplitPayment, paySplitShare } from '../services/api';

export default function SplitPaymentFriendView({ splitId, onGoToHome }) {
  const [split, setSplit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [friendName, setFriendName] = useState('');
  const [upiId, setUpiId] = useState('');
  const [paying, setPaying] = useState(false);
  const [paidSuccess, setPaidSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    if (!splitId) return;

    let isMounted = true;
    getSplitPayment(splitId)
      .then((res) => {
        if (isMounted && res.success && res.split) {
          setSplit(res.split);
        } else if (isMounted) {
          setErrorMessage(res.error || 'Split bill request not found.');
        }
      })
      .catch((err) => {
        if (isMounted) setErrorMessage(err.message || 'Error fetching split details.');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [splitId]);

  const handlePay = async (e) => {
    e.preventDefault();
    if (!friendName.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }
    if (!upiId.trim() || !upiId.includes('@')) {
      setErrorMessage('Please enter a valid UPI ID (e.g., name@okhdfcbank or 9876543210@paytm).');
      return;
    }

    setPaying(true);
    setErrorMessage(null);

    try {
      const res = await paySplitShare(splitId, {
        friendName: friendName.trim(),
        upiId: upiId.trim(),
      });

      if (res.success && res.split) {
        setSplit(res.split);
        setPaidSuccess(true);
      } else {
        setErrorMessage(res.error || 'Payment failed.');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Payment error.');
    } finally {
      setPaying(false);
    }
  };

  const handleQuickUpi = (handle) => {
    const prefix = friendName ? friendName.toLowerCase().replace(/\s+/g, '') : 'friend';
    setUpiId(`${prefix}${handle}`);
  };

  if (loading) {
    return (
      <div style={styles.centerContainer}>
        <div style={styles.spinner}>📱</div>
        <p style={{ color: '#94A3B8' }}>Loading PeakTix UPI Split Request...</p>
      </div>
    );
  }

  if (errorMessage && !split) {
    return (
      <div style={styles.centerContainer}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
        <h2 style={{ color: '#FFFFFF' }}>Split Bill Request Not Found</h2>
        <p style={{ color: '#94A3B8', maxWidth: '400px', margin: '0 auto 1.5rem auto' }}>{errorMessage}</p>
        <button style={styles.homeBtn} onClick={onGoToHome}>
          Go to PeakTix Homepage →
        </button>
      </div>
    );
  }

  const shares = split?.shares || [];
  const paidShares = shares.filter((s) => s.status === 'PAID');
  const pendingShare = shares.find((s) => s.status === 'PENDING');
  const progressPct = Math.round((paidShares.length / (shares.length || 1)) * 100);

  return (
    <div style={styles.container}>
      {/* Brand Header */}
      <div style={styles.header}>
        <div style={styles.logoPill}>
          <span style={{ color: '#F43F5E', fontWeight: 800 }}>▲ PeakTix</span>
          <span style={{ color: '#64748B' }}>•</span>
          <span style={{ color: '#38BDF8' }}>UPI Split Pay</span>
        </div>
        <h1 style={styles.title}>Split Bill Payment Request</h1>
        <p style={styles.subtitle}>
          <strong>{split.organizerName}</strong> booked tickets and invited you to pay your equal share via UPI.
        </p>
      </div>

      <div style={styles.card}>
        {/* Event Banner */}
        <div style={styles.eventBox}>
          <div>
            <span style={styles.eventTag}>CONFIRMED BOOKING</span>
            <h2 style={styles.eventTitle}>{split.title}</h2>
            <div style={styles.bookingRef}>Ref: {split.bookingRef}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={styles.eventTag}>TOTAL BILL</span>
            <div style={styles.totalAmount}>{formatINR(split.totalAmount)}</div>
            <span style={styles.splitSub}>Split among {split.splitCount} people</span>
          </div>
        </div>

        {/* Share Highlight Banner */}
        <div style={styles.shareHighlight}>
          <div>
            <span style={styles.highlightLabel}>YOUR ALLOCATED SHARE:</span>
            <div style={styles.highlightAmount}>{formatINR(split.amountPerPerson)}</div>
          </div>
          <div style={styles.gpayBadge}>
            <span style={{ fontSize: '1.25rem' }}>⚡</span>
            <span>Zero-Fee UPI Transfer</span>
          </div>
        </div>

        {/* Payment Form (If not already paid in this session) */}
        {!paidSuccess ? (
          <form onSubmit={handlePay} style={styles.form}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>YOUR FULL NAME</label>
              <input
                type="text"
                required
                placeholder="e.g. Rahul Verma"
                value={friendName}
                onChange={(e) => setFriendName(e.target.value)}
                style={styles.input}
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>ENTER YOUR UPI ID (VPA)</label>
              <input
                type="text"
                required
                placeholder="e.g. rahul@okhdfcbank or 9876543210@paytm"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                style={styles.input}
              />

              {/* Quick Pick Pills */}
              <div style={styles.quickPillRow}>
                <span style={styles.quickLabel}>Quick Pick:</span>
                <button
                  type="button"
                  style={styles.quickPill}
                  onClick={() => handleQuickUpi('@okhdfcbank')}
                >
                  Google Pay (@okhdfcbank)
                </button>
                <button
                  type="button"
                  style={styles.quickPill}
                  onClick={() => handleQuickUpi('@ybl')}
                >
                  PhonePe (@ybl)
                </button>
                <button
                  type="button"
                  style={styles.quickPill}
                  onClick={() => handleQuickUpi('@paytm')}
                >
                  Paytm (@paytm)
                </button>
              </div>
            </div>

            {errorMessage && <div style={styles.errorBox}>{errorMessage}</div>}

            <button
              type="submit"
              disabled={paying || !pendingShare}
              style={styles.payBtn}
            >
              {paying ? 'Authorizing UPI Payment...' : `Pay My Share (${formatINR(split.amountPerPerson)}) via UPI`}
            </button>
          </form>
        ) : (
          <div style={styles.successBox}>
            <div style={styles.successIcon}>✓</div>
            <h3 style={styles.successTitle}>UPI Payment Confirmed!</h3>
            <p style={styles.successText}>
              You have settled your share of <strong>{formatINR(split.amountPerPerson)}</strong> for <strong>{split.title}</strong>. {split.organizerName} has been notified.
            </p>
          </div>
        )}

        {/* Live Settlement Tracker */}
        <div style={styles.trackerSection}>
          <div style={styles.trackerHeader}>
            <span style={styles.trackerTitle}>Settlement Progress</span>
            <span style={styles.trackerStats}>
              {paidShares.length} of {shares.length} settled ({progressPct}%)
            </span>
          </div>

          <div style={styles.track}>
            <div
              style={{
                ...styles.fill,
                width: `${progressPct}%`,
                background: progressPct === 100 ? '#10B981' : 'linear-gradient(90deg, #F43F5E, #38BDF8)',
              }}
            />
          </div>

          <div style={styles.sharesList}>
            {shares.map((s) => (
              <div key={s.shareId} style={styles.shareRow}>
                <div style={styles.shareNameGroup}>
                  <span>{s.isOrganizer ? '👑' : '👤'}</span>
                  <div>
                    <strong style={{ color: '#FFFFFF', fontSize: '0.85rem' }}>{s.name}</strong>
                    <div style={{ color: '#64748B', fontSize: '0.7rem' }}>
                      {s.upiId ? `UPI: ${s.upiId}` : 'Pending Settlement'}
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: '#FFFFFF', fontWeight: 700, fontSize: '0.85rem' }}>
                    {formatINR(s.amount)}
                  </div>
                  <span
                    style={{
                      ...styles.statusTag,
                      background: s.status === 'PAID' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                      color: s.status === 'PAID' ? '#34D399' : '#FBBF24',
                    }}
                  >
                    {s.status === 'PAID' ? 'PAID ✓' : 'PENDING'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Navigation to home */}
        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <button style={styles.homeBtn} onClick={onGoToHome}>
            Browse Movies & Concerts on PeakTix →
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  centerContainer: {
    maxWidth: '500px',
    margin: '6rem auto',
    textAlign: 'center',
    padding: '2rem',
  },
  spinner: {
    fontSize: '3rem',
    marginBottom: '1rem',
    animation: 'spin 1.5s infinite linear',
  },
  container: {
    maxWidth: '640px',
    margin: '3rem auto 6rem auto',
    padding: '0 1.5rem',
    color: '#F8FAFC',
  },
  header: {
    textAlign: 'center',
    marginBottom: '2rem',
  },
  logoPill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    background: '#1E293B',
    padding: '4px 14px',
    borderRadius: '999px',
    fontSize: '0.8rem',
    marginBottom: '0.75rem',
    border: '1px solid #334155',
  },
  title: {
    fontSize: '2rem',
    fontWeight: 800,
    color: '#FFFFFF',
    margin: '0.25rem 0',
  },
  subtitle: {
    fontSize: '0.9rem',
    color: '#94A3B8',
    margin: 0,
  },
  card: {
    background: '#1E293B',
    borderRadius: '16px',
    padding: '1.75rem',
    border: '1px solid #334155',
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
  },
  eventBox: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: '#0F172A',
    borderRadius: '12px',
    padding: '1.25rem',
    border: '1px solid #334155',
    marginBottom: '1.25rem',
  },
  eventTag: {
    display: 'block',
    fontSize: '0.7rem',
    color: '#64748B',
    letterSpacing: '0.05em',
  },
  eventTitle: {
    fontSize: '1.1rem',
    color: '#FFFFFF',
    margin: '2px 0',
  },
  bookingRef: {
    fontSize: '0.75rem',
    color: '#94A3B8',
    fontFamily: 'monospace',
  },
  totalAmount: {
    fontSize: '1.3rem',
    fontWeight: 800,
    color: '#FFFFFF',
  },
  splitSub: {
    fontSize: '0.7rem',
    color: '#94A3B8',
  },
  shareHighlight: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: 'linear-gradient(135deg, rgba(244, 63, 94, 0.15), rgba(225, 29, 72, 0.25))',
    border: '1.5px solid #F43F5E',
    borderRadius: '12px',
    padding: '1.25rem',
    marginBottom: '1.5rem',
  },
  highlightLabel: {
    display: 'block',
    fontSize: '0.75rem',
    color: '#FECDD3',
    fontWeight: 700,
    letterSpacing: '0.05em',
  },
  highlightAmount: {
    fontSize: '2rem',
    fontWeight: 800,
    color: '#FFFFFF',
  },
  gpayBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    background: 'rgba(0, 0, 0, 0.3)',
    color: '#FEE2E2',
    padding: '6px 12px',
    borderRadius: '8px',
    fontSize: '0.8rem',
    fontWeight: 600,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
    marginBottom: '1.5rem',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '0.75rem',
    color: '#94A3B8',
    fontWeight: 700,
    letterSpacing: '0.05em',
  },
  input: {
    background: '#0F172A',
    border: '1px solid #334155',
    borderRadius: '8px',
    padding: '10px 14px',
    color: '#FFFFFF',
    fontSize: '0.9rem',
    outline: 'none',
  },
  quickPillRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    flexWrap: 'wrap',
    marginTop: '4px',
  },
  quickLabel: {
    fontSize: '0.7rem',
    color: '#64748B',
  },
  quickPill: {
    background: '#0F172A',
    border: '1px solid #334155',
    color: '#38BDF8',
    padding: '3px 8px',
    borderRadius: '6px',
    fontSize: '0.7rem',
    cursor: 'pointer',
  },
  payBtn: {
    background: 'linear-gradient(135deg, #10B981, #059669)',
    color: '#FFFFFF',
    border: 'none',
    padding: '14px',
    borderRadius: '10px',
    fontWeight: 800,
    fontSize: '1rem',
    cursor: 'pointer',
    boxShadow: '0 8px 24px rgba(16, 185, 129, 0.35)',
  },
  successBox: {
    textAlign: 'center',
    background: 'rgba(16, 185, 129, 0.15)',
    border: '1px solid #10B981',
    borderRadius: '12px',
    padding: '1.5rem',
    marginBottom: '1.5rem',
  },
  successIcon: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    background: '#10B981',
    color: '#064E3B',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.5rem',
    fontWeight: 900,
    margin: '0 auto 10px auto',
  },
  successTitle: {
    fontSize: '1.25rem',
    fontWeight: 800,
    color: '#FFFFFF',
    margin: '0 0 6px 0',
  },
  successText: {
    fontSize: '0.85rem',
    color: '#D1FAE5',
    margin: 0,
    lineHeight: 1.5,
  },
  errorBox: {
    background: 'rgba(239, 68, 68, 0.2)',
    border: '1px solid #EF4444',
    color: '#FCA5A5',
    padding: '8px 12px',
    borderRadius: '6px',
    fontSize: '0.8rem',
  },
  trackerSection: {
    background: '#0F172A',
    borderRadius: '12px',
    padding: '1.25rem',
    border: '1px solid #334155',
  },
  trackerHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  trackerTitle: {
    fontSize: '0.85rem',
    fontWeight: 700,
    color: '#FFFFFF',
  },
  trackerStats: {
    fontSize: '0.75rem',
    color: '#34D399',
    fontWeight: 600,
  },
  track: {
    width: '100%',
    height: '8px',
    background: '#1E293B',
    borderRadius: '999px',
    overflow: 'hidden',
    marginBottom: '1rem',
  },
  fill: {
    height: '100%',
    borderRadius: '999px',
    transition: 'width 0.4s ease',
  },
  sharesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  shareRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: '#1E293B',
    padding: '8px 12px',
    borderRadius: '8px',
  },
  shareNameGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  statusTag: {
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '0.7rem',
    fontWeight: 700,
  },
  homeBtn: {
    background: 'transparent',
    color: '#94A3B8',
    border: '1px solid #475569',
    padding: '10px 20px',
    borderRadius: '8px',
    fontWeight: 600,
    fontSize: '0.85rem',
    cursor: 'pointer',
  },
};
