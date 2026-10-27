import React from 'react';

const QUICK_LINKS = [
  { label: '🎬 Blockbuster Movies', key: 'movies' },
  { label: '🎤 Concerts & Shows', key: 'events' },
  { label: '🎪 Curated Experiences', key: 'experiences' },
  { label: '🏛️ 50+ Theatres Network', key: 'theatres' },
  { label: '💳 Bank Card Offers', key: 'offers' },
  { label: '🎟️ My Bookings', key: 'bookings' },
  { label: '⏳ Virtual Waiting Room & Probability', key: 'waiting-room' },
  { label: '⚖️ Load Balancer Monitor (:3000)', key: 'load-balancer' },
  { label: '🔬 Peak Demand Lab (Academic Demo)', key: 'peak-demand-lab' },
  { label: '☁️ Cloud Scalability Demo', key: 'cloud-demo' },
];

const POPULAR_LANGUAGES = ['Hindi', 'Tamil', 'Telugu', 'Malayalam', 'Kannada'];

export default function Footer({ onNavigate }) {
  return (
    <>
      <style>{`
        .ptx-footer-link:hover {
          color: #F8FAFC !important;
        }
      `}</style>
      <footer style={styles.footer}>
        <div style={styles.container}>
          <div style={styles.topRow}>
            {/* Col 1: Brand */}
            <div style={styles.brandCol}>
              <div style={styles.logoRow}>
                <div style={styles.logoMark}>▲</div>
                <span style={styles.brandTitle}>PeakTix</span>
              </div>
              <p style={styles.tagline}>
                India's premier live entertainment and cinematic ticket booking platform demonstration.
              </p>
              <div style={styles.currencyBadge}>
                <span>🇮🇳 Official Currency: Indian Rupee (INR, ₹)</span>
              </div>
            </div>

            {/* Col 2: Quick Links */}
            <div style={styles.linkCol}>
              <h4 style={styles.colHeading}>Navigation</h4>
              <ul style={styles.linkList}>
                {QUICK_LINKS.map((link) => (
                  <li key={link.key}>
                    <button
                      type="button"
                      className="ptx-footer-link"
                      style={styles.linkBtn}
                      onClick={() => onNavigate && onNavigate(link.key)}
                    >
                      {link.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Col 3: Entertainment Categories */}
            <div style={styles.linkCol}>
              <h4 style={styles.colHeading}>Cinema & Languages</h4>
              <p style={styles.categoryPills}>
                {POPULAR_LANGUAGES.map((lang) => (
                  <span key={lang} style={styles.langPill}>
                    {lang}
                  </span>
                ))}
              </p>
              <p style={styles.subtext}>
                Bollywood • Kollywood • Tollywood • Mollywood • Sandalwood Arena
              </p>
            </div>

            {/* Col 4: Demo Notice */}
            <div style={styles.linkCol}>
              <h4 style={styles.colHeading}>Demo Notice</h4>
              <p style={styles.demoDisclaimer}>
                All concert listings, movie showcases, artist lineups, and stadium ticket availabilities shown are fictional sample events created strictly for technology and cloud scalability testing.
              </p>
            </div>
          </div>

          <div style={styles.divider} />

          <div style={styles.bottomRow}>
            <p style={styles.copyright}>
              © 2026 PeakTix Entertainment Technologies. Powered by Node.js, Express & SQLite.
            </p>
            <p style={styles.scalabilityNotice}>
              Target: 10,000 Normal Users • 200,000 Surge Admission Prototype
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}

const styles = {
  footer: {
    backgroundColor: '#050811',
    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
    color: '#94A3B8',
    padding: '60px 24px 36px',
    marginTop: 'auto',
  },
  container: {
    maxWidth: 1240,
    margin: '0 auto',
  },
  topRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: 40,
    marginBottom: 40,
  },
  brandCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  logoRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  logoMark: {
    width: 28,
    height: 28,
    borderRadius: 8,
    background: 'linear-gradient(135deg, #E11D48 0%, #F59E0B 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  brandTitle: {
    fontFamily: "'Outfit', sans-serif",
    fontSize: 22,
    fontWeight: 800,
    color: '#F8FAFC',
    letterSpacing: '-0.02em',
  },
  tagline: {
    fontSize: 14,
    lineHeight: 1.6,
    color: '#94A3B8',
    margin: 0,
  },
  currencyBadge: {
    fontSize: 12,
    fontWeight: 600,
    color: '#FBBF24',
    background: 'rgba(245, 158, 11, 0.1)',
    border: '1px solid rgba(245, 158, 11, 0.25)',
    padding: '6px 12px',
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  linkCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  colHeading: {
    fontFamily: "'Outfit', sans-serif",
    fontSize: 15,
    fontWeight: 700,
    color: '#F8FAFC',
    letterSpacing: '0.02em',
    margin: 0,
  },
  linkList: {
    listStyle: 'none',
    margin: 0,
    padding: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  linkBtn: {
    background: 'none',
    border: 'none',
    color: '#94A3B8',
    fontSize: 14,
    cursor: 'pointer',
    padding: 0,
    textAlign: 'left',
    transition: 'color 0.2s',
  },
  categoryPills: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
    margin: 0,
  },
  langPill: {
    background: 'rgba(255, 255, 255, 0.06)',
    padding: '4px 10px',
    borderRadius: 14,
    fontSize: 12,
    color: '#CBD5E1',
    fontWeight: 500,
  },
  subtext: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 1.5,
    margin: '4px 0 0',
  },
  demoDisclaimer: {
    fontSize: 12,
    lineHeight: 1.6,
    color: '#64748B',
    margin: 0,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 24,
  },
  bottomRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
    fontSize: 13,
  },
  copyright: {
    margin: 0,
    color: '#64748B',
  },
  scalabilityNotice: {
    margin: 0,
    color: '#FB7185',
    fontWeight: 600,
  },
};
