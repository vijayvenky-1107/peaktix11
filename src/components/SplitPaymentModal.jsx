import React, { useState, useEffect } from 'react';
import { formatINR } from '../utils/formatters';
import {
  createSplitPayment,
  getSplitPaymentByBooking,
  paySplitShare,
} from '../services/api';

export default function SplitPaymentModal({
  isOpen,
  onClose,
  booking, // { ref, title or movieTitle or eventTitle, total, name, email }
}) {
  const [splitCount, setSplitCount] = useState(2);
  const [splitData, setSplitData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [simulatingFriend, setSimulatingFriend] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const title = booking?.title || booking?.movieTitle || booking?.eventTitle || 'PeakTix Ticket';
  const totalAmount = booking?.total || 0;
  const organizerName = booking?.name || 'Organizer';
  const organizerEmail = booking?.email || '';

  // Check if split session already exists for this booking
  useEffect(() => {
    if (!isOpen || !booking?.ref) return;

    let isMounted = true;

    getSplitPaymentByBooking(booking.ref)
      .then((res) => {
        if (isMounted && res.success && res.split) {
          setSplitData(res.split);
          setSplitCount(res.split.splitCount || 2);
        }
      })
      .catch(() => {
        // No existing split found, user will create new
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, booking?.ref]);

  if (!isOpen || !booking) return null;

  const amountPerPerson = Math.ceil(totalAmount / splitCount);

  const handleCreateSplit = async () => {
    setLoading(true);
    setFeedback(null);
    try {
      const res = await createSplitPayment({
        bookingRef: booking.ref,
        title,
        totalAmount,
        splitCount,
        organizerName,
        organizerEmail,
      });

      if (res.success && res.split) {
        setSplitData(res.split);
        setFeedback('Split payment session created! Share the link with your friends.');
      } else {
        setFeedback(res.error || 'Failed to create split.');
      }
    } catch (err) {
      setFeedback(err.message || 'Error creating split.');
    } finally {
      setLoading(false);
    }
  };

  const shareUrl = splitData
    ? `${window.location.origin}/?split=${splitData.id}`
    : `${window.location.origin}/?split=SPL-DEMO`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Simulate a friend paying right now for instant demonstration
  const handleSimulateFriendPay = async (shareId, defaultName) => {
    if (!splitData?.id) return;
    setSimulatingFriend(true);
    try {
      const res = await paySplitShare(splitData.id, {
        shareId,
        friendName: defaultName || 'Rahul Verma',
        upiId: 'rahul@okhdfcbank',
      });
      if (res.success && res.split) {
        setSplitData(res.split);
        setFeedback(`✓ ${defaultName || 'Friend'} successfully paid ${formatINR(splitData.amountPerPerson)} via UPI!`);
      }
    } catch (err) {
      setFeedback(`Simulation error: ${err.message}`);
    } finally {
      setSimulatingFriend(false);
    }
  };

  const shares = splitData?.shares || [];
  const paidCount = shares.filter((s) => s.status === 'PAID').length;
  const totalShares = shares.length || splitCount;
  const progressPct = Math.round((paidCount / totalShares) * 100);

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerTitleRow}>
            <span style={styles.upiIcon}>📱</span>
            <div>
              <h2 style={styles.title}>Split Bill with Friends (GPay / UPI)</h2>
              <p style={styles.subtitle}>
                Send a payment link. Friends can pay their exact share with any UPI app.
              </p>
            </div>
          </div>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* Bill Info Card */}
        <div style={styles.billCard}>
          <div style={styles.billRow}>
            <div>
              <span style={styles.billLabel}>EVENT / SHOW</span>
              <strong style={styles.billTitle}>{title}</strong>
              <div style={styles.bookingRef}>Ref: {booking.ref}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={styles.billLabel}>TOTAL BILL</span>
              <div style={styles.billTotal}>{formatINR(totalAmount)}</div>
            </div>
          </div>
        </div>

        {/* Step 1: Configure Split (If not created yet) */}
        {!splitData && (
          <div style={styles.setupSection}>
            <div style={styles.pickerSection}>
              <span style={styles.sectionLabel}>HOW MANY PEOPLE ARE SPLITTING?</span>
              <div style={styles.pillGroup}>
                {[2, 3, 4, 5].map((num) => (
                  <button
                    key={num}
                    type="button"
                    style={{
                      ...styles.splitCountPill,
                      borderColor: splitCount === num ? '#F43F5E' : '#334155',
                      background: splitCount === num ? 'rgba(244, 63, 94, 0.2)' : '#0F172A',
                      color: splitCount === num ? '#FFFFFF' : '#94A3B8',
                    }}
                    onClick={() => setSplitCount(num)}
                  >
                    {num} People
                  </button>
                ))}
              </div>
            </div>

            <div style={styles.previewBox}>
              <div style={styles.previewRow}>
                <span>Each Person Pays:</span>
                <strong style={{ fontSize: '1.25rem', color: '#34D399' }}>
                  {formatINR(amountPerPerson)}
                </strong>
              </div>
              <div style={styles.previewNote}>
                You (Organizer) have already authorized the primary booking. Friends will send their ₹{amountPerPerson} share via UPI.
              </div>
            </div>

            <button
              style={styles.createBtn}
              onClick={handleCreateSplit}
              disabled={loading}
            >
              {loading ? 'Creating UPI Split...' : `Generate GPay Split Link (${formatINR(amountPerPerson)} / person)`}
            </button>
          </div>
        )}

        {/* Step 2: Active Split Session & Friend Link */}
        {splitData && (
          <div style={styles.activeSection}>
            {/* Shareable Link Box */}
            <div style={styles.shareBox}>
              <span style={styles.shareBoxLabel}>SHARE THIS LINK WITH YOUR FRIENDS:</span>
              <div style={styles.linkRow}>
                <input
                  type="text"
                  readOnly
                  value={shareUrl}
                  style={styles.linkInput}
                />
                <button style={styles.copyBtn} onClick={handleCopyLink}>
                  {copied ? '✓ Copied!' : '📋 Copy Link'}
                </button>
              </div>
              <div style={styles.shareTips}>
                💡 Friends open this link on their mobile or laptop, enter their UPI ID (GPay / PhonePe / Paytm), and pay {formatINR(splitData.amountPerPerson)}.
              </div>
            </div>

            {/* Live Settlement Tracker */}
            <div style={styles.trackerCard}>
              <div style={styles.trackerHeader}>
                <span style={styles.trackerTitle}>Live Settlement Tracker</span>
                <span style={styles.trackerProgress}>
                  {paidCount} of {totalShares} Paid ({progressPct}%)
                </span>
              </div>

              {/* Progress Bar */}
              <div style={styles.trackerTrack}>
                <div
                  style={{
                    ...styles.trackerFill,
                    width: `${progressPct}%`,
                    background: progressPct === 100 ? '#10B981' : 'linear-gradient(90deg, #F43F5E, #38BDF8)',
                  }}
                />
              </div>

              {/* Shares List */}
              <div style={styles.sharesList}>
                {shares.map((share, idx) => (
                  <div key={share.shareId} style={styles.shareItem}>
                    <div style={styles.shareLeft}>
                      <span style={styles.personAvatar}>
                        {share.isOrganizer ? '👑' : '👤'}
                      </span>
                      <div>
                        <strong style={styles.shareName}>
                          {share.name} {share.isOrganizer && '(You)'}
                        </strong>
                        <div style={styles.shareUpi}>
                          {share.upiId ? `UPI: ${share.upiId}` : 'Awaiting payment via link'}
                        </div>
                      </div>
                    </div>

                    <div style={styles.shareRight}>
                      <strong style={styles.shareAmount}>{formatINR(share.amount)}</strong>
                      {share.status === 'PAID' ? (
                        <span style={styles.paidBadge}>PAID ✓</span>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={styles.pendingBadge}>PENDING</span>
                          <button
                            style={styles.simPayBtn}
                            onClick={() => handleSimulateFriendPay(share.shareId, `Friend ${idx}`)}
                            disabled={simulatingFriend}
                            title="Simulate this friend paying via UPI"
                          >
                            Simulate Pay
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {feedback && <div style={styles.feedbackBanner}>{feedback}</div>}

        <div style={styles.footer}>
          <button style={styles.doneBtn} onClick={onClose}>
            Done
          </button>
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
    background: 'rgba(0, 0, 0, 0.75)',
    backdropFilter: 'blur(6px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: '1rem',
  },
  modal: {
    background: '#1E293B',
    borderRadius: '16px',
    maxWidth: '560px',
    width: '100%',
    maxHeight: '90vh',
    overflowY: 'auto',
    border: '1px solid #334155',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
    padding: '1.5rem',
    color: '#F8FAFC',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '1.25rem',
  },
  headerTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  upiIcon: {
    fontSize: '2rem',
  },
  title: {
    fontSize: '1.2rem',
    fontWeight: 800,
    color: '#FFFFFF',
    margin: 0,
  },
  subtitle: {
    fontSize: '0.8rem',
    color: '#94A3B8',
    margin: '3px 0 0 0',
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    color: '#94A3B8',
    fontSize: '1.25rem',
    cursor: 'pointer',
  },
  billCard: {
    background: '#0F172A',
    borderRadius: '12px',
    padding: '1rem 1.25rem',
    border: '1px solid #334155',
    marginBottom: '1.25rem',
  },
  billRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  billLabel: {
    display: 'block',
    fontSize: '0.7rem',
    color: '#64748B',
    letterSpacing: '0.05em',
  },
  billTitle: {
    fontSize: '1rem',
    color: '#FFFFFF',
  },
  bookingRef: {
    fontSize: '0.75rem',
    color: '#94A3B8',
    fontFamily: 'monospace',
    marginTop: '2px',
  },
  billTotal: {
    fontSize: '1.4rem',
    fontWeight: 800,
    color: '#F43F5E',
  },
  setupSection: {},
  pickerSection: {
    marginBottom: '1.25rem',
  },
  sectionLabel: {
    display: 'block',
    fontSize: '0.75rem',
    color: '#94A3B8',
    fontWeight: 700,
    letterSpacing: '0.05em',
    marginBottom: '8px',
  },
  pillGroup: {
    display: 'flex',
    gap: '8px',
  },
  splitCountPill: {
    flex: 1,
    padding: '10px 0',
    border: '1.5px solid',
    borderRadius: '8px',
    fontSize: '0.85rem',
    fontWeight: 700,
    cursor: 'pointer',
    textAlign: 'center',
  },
  previewBox: {
    background: 'rgba(56, 189, 248, 0.1)',
    border: '1px solid rgba(56, 189, 248, 0.25)',
    borderRadius: '10px',
    padding: '1rem',
    marginBottom: '1.25rem',
  },
  previewRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    color: '#E2E8F0',
    fontSize: '0.9rem',
    fontWeight: 600,
  },
  previewNote: {
    fontSize: '0.75rem',
    color: '#94A3B8',
    marginTop: '6px',
    lineHeight: 1.4,
  },
  createBtn: {
    width: '100%',
    background: 'linear-gradient(135deg, #F43F5E, #E11D48)',
    color: '#FFFFFF',
    border: 'none',
    padding: '12px 18px',
    borderRadius: '8px',
    fontWeight: 700,
    fontSize: '0.95rem',
    cursor: 'pointer',
    boxShadow: '0 4px 15px rgba(244, 63, 94, 0.35)',
  },
  activeSection: {},
  shareBox: {
    background: '#0F172A',
    borderRadius: '12px',
    padding: '1rem',
    border: '1px solid #334155',
    marginBottom: '1.25rem',
  },
  shareBoxLabel: {
    display: 'block',
    fontSize: '0.7rem',
    color: '#94A3B8',
    fontWeight: 700,
    letterSpacing: '0.05em',
    marginBottom: '6px',
  },
  linkRow: {
    display: 'flex',
    gap: '8px',
    marginBottom: '8px',
  },
  linkInput: {
    flex: 1,
    background: '#1E293B',
    border: '1px solid #475569',
    borderRadius: '6px',
    padding: '8px 12px',
    color: '#38BDF8',
    fontSize: '0.8rem',
    fontFamily: 'monospace',
    outline: 'none',
  },
  copyBtn: {
    background: '#2563EB',
    color: '#FFFFFF',
    border: 'none',
    padding: '8px 14px',
    borderRadius: '6px',
    fontWeight: 700,
    fontSize: '0.8rem',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  shareTips: {
    fontSize: '0.75rem',
    color: '#64748B',
    lineHeight: 1.4,
  },
  trackerCard: {
    background: '#0F172A',
    borderRadius: '12px',
    padding: '1rem',
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
  trackerProgress: {
    fontSize: '0.75rem',
    color: '#34D399',
    fontWeight: 600,
  },
  trackerTrack: {
    width: '100%',
    height: '8px',
    background: '#1E293B',
    borderRadius: '999px',
    overflow: 'hidden',
    marginBottom: '1rem',
  },
  trackerFill: {
    height: '100%',
    borderRadius: '999px',
    transition: 'width 0.4s ease',
  },
  sharesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  shareItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: '#1E293B',
    padding: '10px 12px',
    borderRadius: '8px',
  },
  shareLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  personAvatar: {
    fontSize: '1.2rem',
  },
  shareName: {
    display: 'block',
    fontSize: '0.85rem',
    color: '#FFFFFF',
  },
  shareUpi: {
    fontSize: '0.7rem',
    color: '#94A3B8',
  },
  shareRight: {
    textAlign: 'right',
  },
  shareAmount: {
    display: 'block',
    fontSize: '0.9rem',
    color: '#FFFFFF',
    marginBottom: '2px',
  },
  paidBadge: {
    background: 'rgba(16, 185, 129, 0.2)',
    color: '#34D399',
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '0.7rem',
    fontWeight: 700,
  },
  pendingBadge: {
    background: 'rgba(245, 158, 11, 0.2)',
    color: '#FBBF24',
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '0.7rem',
    fontWeight: 700,
  },
  simPayBtn: {
    background: 'rgba(56, 189, 248, 0.15)',
    color: '#38BDF8',
    border: '1px solid rgba(56, 189, 248, 0.4)',
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '0.7rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  feedbackBanner: {
    marginTop: '1rem',
    padding: '8px 12px',
    background: 'rgba(16, 185, 129, 0.15)',
    color: '#34D399',
    borderRadius: '6px',
    fontSize: '0.8rem',
  },
  footer: {
    marginTop: '1.25rem',
    textAlign: 'right',
  },
  doneBtn: {
    background: '#334155',
    color: '#FFFFFF',
    border: 'none',
    padding: '8px 20px',
    borderRadius: '6px',
    fontWeight: 600,
    fontSize: '0.85rem',
    cursor: 'pointer',
  },
};
