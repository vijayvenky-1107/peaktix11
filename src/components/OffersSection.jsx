import React, { useState, useEffect } from 'react';
import { getOffers } from '../services/api';

export default function OffersSection({ onApplyOfferCode }) {
  const [offers, setOffers] = useState([]);
  const [copiedCode, setCopiedCode] = useState(null);

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

  const handleCopy = (code) => {
    navigator.clipboard?.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2500);
    if (onApplyOfferCode) {
      onApplyOfferCode(code);
    }
  };

  return (
    <section style={styles.section} id="offers-section">
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={styles.kicker}>INSTANT SAVINGS & EXCLUSIVE PARTNERSHIPS</div>
          <h2 style={styles.title}>Bank Card Offers & Movie Discounts</h2>
          <p style={styles.subtitle}>
            Save up to ₹300 on your entertainment bookings with premier credit, debit, and UPI card promotions.
          </p>
        </div>

        <div style={styles.grid}>
          {offers.map((off) => (
            <div key={off.code} style={styles.card}>
              <div style={styles.cardHeader}>
                <span style={styles.bankTag}>{off.bank}</span>
                <span style={styles.badge}>{off.badge}</span>
              </div>

              <h3 style={styles.offerTitle}>{off.title}</h3>
              <p style={styles.description}>{off.description}</p>

              <div style={styles.termsBox}>
                <span style={styles.termsText}>ℹ️ {off.terms}</span>
              </div>

              <div style={styles.cardFooter}>
                <div style={styles.codeBox}>
                  <span style={styles.codeLabel}>PROMO CODE</span>
                  <span style={styles.codeText}>{off.code}</span>
                </div>
                <button
                  style={{
                    ...styles.copyBtn,
                    backgroundColor: copiedCode === off.code ? '#10B981' : '#E11D48',
                  }}
                  onClick={() => handleCopy(off.code)}
                >
                  {copiedCode === off.code ? '✓ Copied!' : 'Copy Code'}
                </button>
              </div>
            </div>
          ))}
        </div>

        <div style={styles.disclaimer}>
          ⚠️ <strong>Promotional Terms Note:</strong> Bank offers are demonstration promotional rules calculated strictly on the PeakTix server. Minimum spend and card eligibility conditions apply.
        </div>
      </div>
    </section>
  );
}

const styles = {
  section: {
    padding: '4rem 1.5rem',
    backgroundColor: '#080C16',
    borderTop: '1px solid rgba(255, 255, 255, 0.06)',
  },
  container: {
    maxWidth: '1240px',
    margin: '0 auto',
  },
  header: {
    marginBottom: '2.5rem',
  },
  kicker: {
    fontSize: '0.72rem',
    fontWeight: '800',
    letterSpacing: '0.12em',
    color: '#F59E0B',
    marginBottom: '0.4rem',
  },
  title: {
    fontSize: '2rem',
    fontWeight: '800',
    margin: '0 0 0.4rem 0',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: '0.92rem',
    color: '#94A3B8',
    margin: 0,
    maxWidth: '680px',
    lineHeight: 1.5,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
    gap: '1.5rem',
  },
  card: {
    backgroundColor: '#0F172A',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '14px',
    padding: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
    transition: 'transform 0.2s ease, border-color 0.2s ease',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.8rem',
  },
  bankTag: {
    fontSize: '0.72rem',
    fontWeight: '700',
    color: '#06B6D4',
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
    padding: '0.2rem 0.5rem',
    borderRadius: '4px',
  },
  badge: {
    fontSize: '0.72rem',
    fontWeight: '800',
    color: '#F59E0B',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    border: '1px solid rgba(245, 158, 11, 0.3)',
    padding: '0.2rem 0.5rem',
    borderRadius: '4px',
  },
  offerTitle: {
    fontSize: '1.05rem',
    fontWeight: '700',
    color: '#FFFFFF',
    margin: '0 0 0.4rem 0',
  },
  description: {
    fontSize: '0.85rem',
    color: '#CBD5E1',
    lineHeight: 1.5,
    margin: '0 0 1rem 0',
    flex: 1,
  },
  termsBox: {
    backgroundColor: '#162035',
    padding: '0.6rem 0.8rem',
    borderRadius: '6px',
    marginBottom: '1.25rem',
  },
  termsText: {
    fontSize: '0.72rem',
    color: '#94A3B8',
    lineHeight: 1.4,
    display: 'block',
  },
  cardFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: '0.8rem',
    borderTop: '1px solid rgba(255, 255, 255, 0.06)',
  },
  codeBox: {
    display: 'flex',
    flexDirection: 'column',
  },
  codeLabel: {
    fontSize: '0.62rem',
    color: '#64748B',
    fontWeight: '700',
    letterSpacing: '0.05em',
  },
  codeText: {
    fontSize: '0.95rem',
    fontWeight: '800',
    color: '#F43F5E',
    fontFamily: 'monospace',
    letterSpacing: '0.05em',
  },
  copyBtn: {
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '6px',
    padding: '0.45rem 0.9rem',
    fontSize: '0.8rem',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
  },
  disclaimer: {
    marginTop: '2.5rem',
    textAlign: 'center',
    fontSize: '0.78rem',
    color: '#64748B',
    lineHeight: 1.5,
  },
};
