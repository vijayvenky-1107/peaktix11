import React, { useState, useEffect } from 'react';
import { getTheatres } from '../services/api';

const INDIAN_CITIES = [
  'All Cities',
  'Mumbai',
  'Delhi-NCR',
  'Bengaluru',
  'Chennai',
  'Hyderabad',
  'Kochi',
  'Kolkata',
  'Pune',
  'Ahmedabad',
  'Chandigarh',
];

const CHAINS = ['All', 'PVR INOX', 'Cinepolis', 'Miraj Cinemas', 'Independent'];

export default function TheatresExplorer({ onSelectTheatre, currentCity, onCityChange }) {
  const [theatres, setTheatres] = useState([]);
  const [city, setCity] = useState(currentCity || 'All Cities');
  const [chain, setChain] = useState('All');
  const [search, setSearch] = useState('');
  const [premiumOnly, setPremiumOnly] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    getTheatres({
      city: city === 'All Cities' ? undefined : city,
      chain: chain === 'All' ? undefined : chain,
      search: search.trim() || undefined,
      premiumOnly: premiumOnly || undefined,
    })
      .then((data) => {
        if (isMounted) {
          setTheatres(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Failed to load theatres:', err);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [city, chain, search, premiumOnly]);

  const handleCityFilter = (newCity) => {
    setCity(newCity);
    if (onCityChange && newCity !== 'All Cities') {
      onCityChange(newCity);
    }
  };

  return (
    <section style={styles.section} id="theatres-section">
      <div style={styles.container}>
        <div style={styles.headerRow}>
          <div>
            <div style={styles.kicker}>EXPANSIVE INDIAN CINEMA NETWORK</div>
            <h2 style={styles.title}>50+ Premier Theatres & Multiplexes</h2>
            <p style={styles.subtitle}>
              Discover verified IMAX Laser, 4DX, Dolby Atmos, and heritage movie halls across 10 major metropolitan circuits.
            </p>
          </div>
          <div style={styles.statsBadge}>
            <span style={styles.statsNum}>{theatres.length}</span>
            <span style={styles.statsLabel}>Cinemas Listed</span>
          </div>
        </div>

        {/* Filter Controls */}
        <div style={styles.filterBar}>
          <div style={styles.searchWrapper}>
            <span style={styles.searchIcon}>🔍</span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by theatre name, locality, or mall..."
              style={styles.searchInput}
            />
            {search && (
              <button style={styles.clearSearchBtn} onClick={() => setSearch('')}>
                ✕
              </button>
            )}
          </div>

          <div style={styles.selectGroup}>
            <select
              value={city}
              onChange={(e) => handleCityFilter(e.target.value)}
              style={styles.select}
              aria-label="Filter by City"
            >
              {INDIAN_CITIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            <select
              value={chain}
              onChange={(e) => setChain(e.target.value)}
              style={styles.select}
              aria-label="Filter by Cinema Chain"
            >
              {CHAINS.map((ch) => (
                <option key={ch} value={ch}>
                  {ch === 'All' ? 'All Cinema Chains' : ch}
                </option>
              ))}
            </select>

            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={premiumOnly}
                onChange={(e) => setPremiumOnly(e.target.checked)}
                style={styles.checkbox}
              />
              <span>IMAX & 4DX Only</span>
            </label>
          </div>
        </div>

        {/* Grid of Theatres */}
        {loading ? (
          <div style={styles.loadingBox}>
            <div style={styles.spinner} />
            <p>Searching theatre network across India...</p>
          </div>
        ) : theatres.length === 0 ? (
          <div style={styles.emptyBox}>
            <h3>No theatres match your search criteria.</h3>
            <p>Try clearing filters or switching cities.</p>
            <button
              style={styles.resetBtn}
              onClick={() => {
                setCity('All Cities');
                setChain('All');
                setSearch('');
                setPremiumOnly(false);
              }}
            >
              Reset All Filters
            </button>
          </div>
        ) : (
          <div style={styles.theatreGrid}>
            {theatres.map((th) => (
              <div key={th.id} style={styles.theatreCard}>
                <div style={styles.cardHeader}>
                  <div>
                    <span style={styles.chainBadge}>{th.chain}</span>
                    <h3 style={styles.theatreName}>{th.name}</h3>
                    <div style={styles.locationMeta}>
                      📍 {th.area}, <strong style={{ color: '#F8FAFC' }}>{th.city}</strong>
                    </div>
                  </div>
                  {th.isPremiumFormat && (
                    <span style={styles.premiumBadge}>IMAX / PREMIUM</span>
                  )}
                </div>

                <p style={styles.addressText}>{th.address}</p>

                {/* Formats Tags */}
                <div style={styles.formatsRow}>
                  {th.screenFormats.map((fmt) => (
                    <span key={fmt} style={styles.formatTag}>{fmt}</span>
                  ))}
                </div>

                {/* Facilities Tags */}
                <div style={styles.facilitiesRow}>
                  {th.facilities.map((fac) => (
                    <span key={fac} style={styles.facilityTag}>✓ {fac}</span>
                  ))}
                </div>

                <div style={styles.cardFooter}>
                  <span style={styles.screenCount}>
                    {th.screensCount} {th.screensCount === 1 ? 'Screen' : 'Screens'} • {th.demoStatus}
                  </span>
                  <button
                    style={styles.viewShowtimesBtn}
                    onClick={() => onSelectTheatre && onSelectTheatre(th)}
                  >
                    View Showtimes →
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

const styles = {
  section: {
    padding: '3rem 1.5rem',
    backgroundColor: '#080C16',
    borderTop: '1px solid rgba(255, 255, 255, 0.06)',
  },
  container: {
    maxWidth: '1240px',
    margin: '0 auto',
  },
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: '1.5rem',
    marginBottom: '2rem',
  },
  kicker: {
    fontSize: '0.75rem',
    fontWeight: '800',
    letterSpacing: '0.12em',
    color: '#F43F5E',
    marginBottom: '0.5rem',
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
    maxWidth: '700px',
    lineHeight: 1.5,
  },
  statsBadge: {
    backgroundColor: '#0F172A',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '12px',
    padding: '0.8rem 1.4rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  statsNum: {
    fontSize: '1.8rem',
    fontWeight: '800',
    color: '#06B6D4',
  },
  statsLabel: {
    fontSize: '0.75rem',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  filterBar: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '1rem',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0F172A',
    padding: '1rem',
    borderRadius: '12px',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    marginBottom: '2rem',
  },
  searchWrapper: {
    position: 'relative',
    flex: '1 1 300px',
    display: 'flex',
    alignItems: 'center',
  },
  searchIcon: {
    position: 'absolute',
    left: '1rem',
    pointerEvents: 'none',
    opacity: 0.6,
  },
  searchInput: {
    width: '100%',
    padding: '0.7rem 2.2rem 0.7rem 2.5rem',
    backgroundColor: '#162035',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: '8px',
    color: '#FFFFFF',
    fontSize: '0.9rem',
    outline: 'none',
    fontFamily: 'inherit',
  },
  clearSearchBtn: {
    position: 'absolute',
    right: '0.8rem',
    background: 'none',
    border: 'none',
    color: '#94A3B8',
    cursor: 'pointer',
  },
  selectGroup: {
    display: 'flex',
    gap: '0.75rem',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  select: {
    backgroundColor: '#162035',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: '8px',
    color: '#F8FAFC',
    padding: '0.7rem 1rem',
    fontSize: '0.88rem',
    outline: 'none',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    fontSize: '0.85rem',
    color: '#CBD5E1',
    cursor: 'pointer',
    userSelect: 'none',
  },
  checkbox: {
    accentColor: '#F43F5E',
    cursor: 'pointer',
  },
  theatreGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
    gap: '1.25rem',
  },
  theatreCard: {
    backgroundColor: '#0F172A',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '12px',
    padding: '1.25rem',
    display: 'flex',
    flexDirection: 'column',
    transition: 'transform 0.2s ease, border-color 0.2s ease',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '0.75rem',
    marginBottom: '0.5rem',
  },
  chainBadge: {
    display: 'inline-block',
    fontSize: '0.7rem',
    fontWeight: '700',
    color: '#06B6D4',
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
    padding: '0.15rem 0.4rem',
    borderRadius: '4px',
    marginBottom: '0.3rem',
  },
  premiumBadge: {
    fontSize: '0.68rem',
    fontWeight: '800',
    color: '#F59E0B',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    border: '1px solid rgba(245, 158, 11, 0.3)',
    padding: '0.2rem 0.45rem',
    borderRadius: '4px',
    whiteSpace: 'nowrap',
  },
  theatreName: {
    fontSize: '1.1rem',
    fontWeight: '700',
    color: '#FFFFFF',
    margin: '0 0 0.2rem 0',
  },
  locationMeta: {
    fontSize: '0.82rem',
    color: '#94A3B8',
  },
  addressText: {
    fontSize: '0.8rem',
    color: '#64748B',
    margin: '0.5rem 0 0.8rem 0',
    lineHeight: 1.4,
  },
  formatsRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.35rem',
    marginBottom: '0.6rem',
  },
  formatTag: {
    fontSize: '0.7rem',
    fontWeight: '600',
    color: '#F43F5E',
    backgroundColor: 'rgba(244, 63, 94, 0.1)',
    padding: '0.2rem 0.45rem',
    borderRadius: '4px',
  },
  facilitiesRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.4rem',
    marginBottom: '1rem',
  },
  facilityTag: {
    fontSize: '0.72rem',
    color: '#94A3B8',
  },
  cardFooter: {
    marginTop: 'auto',
    paddingTop: '0.75rem',
    borderTop: '1px solid rgba(255, 255, 255, 0.06)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  screenCount: {
    fontSize: '0.75rem',
    color: '#64748B',
  },
  viewShowtimesBtn: {
    backgroundColor: '#1E293B',
    color: '#FFFFFF',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: '6px',
    padding: '0.45rem 0.85rem',
    fontSize: '0.8rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
  },
  loadingBox: {
    textAlign: 'center',
    padding: '4rem 1rem',
    color: '#94A3B8',
  },
  spinner: {
    width: '36px',
    height: '36px',
    border: '3px solid rgba(255, 255, 255, 0.1)',
    borderTopColor: '#F43F5E',
    borderRadius: '50%',
    margin: '0 auto 1rem auto',
    animation: 'spin 1s linear infinite',
  },
  emptyBox: {
    textAlign: 'center',
    padding: '3rem 1rem',
    backgroundColor: '#0F172A',
    borderRadius: '12px',
    color: '#94A3B8',
  },
  resetBtn: {
    marginTop: '1rem',
    backgroundColor: '#E11D48',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '6px',
    padding: '0.6rem 1.2rem',
    fontSize: '0.85rem',
    fontWeight: '600',
    cursor: 'pointer',
  },
};
