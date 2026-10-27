import React, { useState, useEffect } from 'react';

/**
 * ReleaseCountdown
 * Countdown timer for events with a scheduled release window (sale_start).
 * Prevents premature bookings and automatically unlocks admission when the sale opens.
 */
export default function ReleaseCountdown({ saleStart, onSaleOpen }) {
  const [timeLeft, setTimeLeft] = useState(null);

  useEffect(() => {
    if (!saleStart) return;

    const targetTime = new Date(saleStart).getTime();

    const calculateRemaining = () => {
      const now = Date.now();
      const diff = targetTime - now;

      if (diff <= 0) {
        setTimeLeft(null);
        if (onSaleOpen) {
          onSaleOpen();
        }
        return;
      }

      const totalSeconds = Math.floor(diff / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      setTimeLeft({ hours, minutes, seconds, diff });
    };

    calculateRemaining();
    const interval = setInterval(calculateRemaining, 1000);

    return () => clearInterval(interval);
  }, [saleStart, onSaleOpen]);

  if (!timeLeft) {
    return null;
  }

  return (
    <div style={styles.container}>
      <div style={styles.badgeRow}>
        <span style={styles.pulseDot} />
        <span style={styles.badgeText}>TICKET RELEASE WINDOW — UPCOMING DROP</span>
      </div>

      <h3 style={styles.heading}>Booking Opens In</h3>

      <div style={styles.timerRow}>
        <div style={styles.timerBlock}>
          <span style={styles.timerDigit}>{String(timeLeft.hours).padStart(2, '0')}</span>
          <span style={styles.timerUnit}>HOURS</span>
        </div>
        <span style={styles.colon}>:</span>
        <div style={styles.timerBlock}>
          <span style={styles.timerDigit}>{String(timeLeft.minutes).padStart(2, '0')}</span>
          <span style={styles.timerUnit}>MINUTES</span>
        </div>
        <span style={styles.colon}>:</span>
        <div style={styles.timerBlock}>
          <span style={styles.timerDigit}>{String(timeLeft.seconds).padStart(2, '0')}</span>
          <span style={styles.timerUnit}>SECONDS</span>
        </div>
      </div>

      <p style={styles.infoText}>
        🔥 High-demand peak ticket sale! Users will enter the virtual waiting line when the countdown completes. Server-side inventory controls guarantee zero overselling.
      </p>
    </div>
  );
}

const styles = {
  container: {
    background: 'linear-gradient(135deg, rgba(225, 29, 72, 0.12) 0%, rgba(245, 158, 11, 0.08) 100%)',
    border: '1px solid rgba(244, 63, 94, 0.35)',
    borderRadius: 20,
    padding: '28px 24px',
    textAlign: 'center',
    marginBottom: 28,
  },
  badgeRow: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    background: 'rgba(225, 29, 72, 0.2)',
    border: '1px solid rgba(244, 63, 94, 0.4)',
    padding: '4px 14px',
    borderRadius: 20,
    marginBottom: 14,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    backgroundColor: '#F43F5E',
    boxShadow: '0 0 8px #F43F5E',
  },
  badgeText: {
    color: '#FDA4AF',
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: '0.08em',
  },
  heading: {
    fontFamily: "'Outfit', sans-serif",
    fontSize: 18,
    fontWeight: 700,
    color: '#F8FAFC',
    margin: '0 0 16px',
    letterSpacing: '-0.01em',
  },
  timerRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 16,
  },
  timerBlock: {
    background: '#131C31',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: 14,
    padding: '12px 18px',
    minWidth: 70,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  timerDigit: {
    fontFamily: "'Outfit', monospace",
    fontSize: 32,
    fontWeight: 800,
    color: '#F8FAFC',
    lineHeight: 1,
  },
  timerUnit: {
    fontSize: 10,
    fontWeight: 700,
    color: '#94A3B8',
    letterSpacing: '0.06em',
    marginTop: 4,
  },
  colon: {
    fontFamily: "'Outfit', monospace",
    fontSize: 26,
    fontWeight: 800,
    color: '#F43F5E',
  },
  infoText: {
    fontSize: 13,
    color: '#94A3B8',
    maxWidth: 580,
    margin: '0 auto',
    lineHeight: 1.55,
  },
};
