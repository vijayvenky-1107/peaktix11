import React, { useState, useEffect } from 'react';
import { getMovies } from '../services/api';
import { formatINR } from '../utils/formatters';

const MOVIE_LANGUAGES = ['All Languages', 'Hindi', 'Tamil', 'Telugu', 'Malayalam', 'Kannada'];

export default function MoviesRail({ onSelectMovie, currentCity }) {
  const [movies, setMovies] = useState([]);
  const [selectedLanguage, setSelectedLanguage] = useState('All Languages');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    getMovies({
      language: selectedLanguage === 'All Languages' ? undefined : selectedLanguage,
    })
      .then((data) => {
        if (isMounted) {
          setMovies(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Failed to load movies:', err);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedLanguage]);

  return (
    <section style={styles.section} id="movies-section">
      <div style={styles.container}>
        <div style={styles.headerRow}>
          <div>
            <div style={styles.kicker}>BLOCKBUSTER RELEASES IN {currentCity?.toUpperCase() || 'MUMBAI'}</div>
            <h2 style={styles.title}>Trending Movies in Theatres</h2>
            <p style={styles.subtitle}>
              Book IMAX Laser, 4DX, and Dolby Atmos screenings across leading multiplexes and heritage cinema halls.
            </p>
          </div>

          {/* Language filter pills */}
          <div style={styles.langPills}>
            {MOVIE_LANGUAGES.map((lang) => (
              <button
                key={lang}
                style={{
                  ...styles.langPill,
                  borderColor: selectedLanguage === lang ? '#F43F5E' : 'rgba(255, 255, 255, 0.12)',
                  backgroundColor: selectedLanguage === lang ? 'rgba(244, 63, 94, 0.15)' : '#0F172A',
                  color: selectedLanguage === lang ? '#FFFFFF' : '#94A3B8',
                }}
                onClick={() => {
                  setSelectedLanguage(lang);
                  setLoading(true);
                }}
              >
                {lang}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={styles.loadingBox}>
            <div style={styles.spinner} />
            <p>Fetching latest showtimes and ratings...</p>
          </div>
        ) : movies.length === 0 ? (
          <div style={styles.emptyBox}>
            <h3>No movies found for {selectedLanguage}.</h3>
            <button
              style={styles.resetBtn}
              onClick={() => setSelectedLanguage('All Languages')}
            >
              Show All Languages
            </button>
          </div>
        ) : (
          <div style={styles.movieGrid}>
            {movies.map((m) => (
              <div
                key={m.id}
                style={styles.movieCard}
                onClick={() => onSelectMovie && onSelectMovie(m)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    if (onSelectMovie) onSelectMovie(m);
                  }
                }}
              >
                {/* 4:5 Poster Container */}
                <div style={styles.posterWrapper}>
                  <img src={m.poster} alt={m.title} style={styles.posterImg} />
                  <div style={styles.posterGradient} />

                  <span style={styles.certBadge}>{m.certification}</span>
                  <div style={styles.ratingBadge}>
                    <span>★ {m.rating}</span>
                    <span style={styles.votesCount}>({m.votes})</span>
                  </div>

                  {m.trending && (
                    <span style={styles.trendingRibbon}>TRENDING</span>
                  )}
                </div>

                {/* Content */}
                <div style={styles.cardInfo}>
                  <h3 style={styles.movieName}>{m.title}</h3>
                  <div style={styles.metaRow}>
                    <span>{m.languages.slice(0, 2).join(', ')}</span>
                    <span>•</span>
                    <span>{m.genre.slice(0, 2).join('/')}</span>
                  </div>

                  <div style={styles.formatTags}>
                    {m.formats.slice(0, 3).map((f) => (
                      <span key={f} style={styles.formatTag}>{f}</span>
                    ))}
                  </div>

                  <div style={styles.cardFooter}>
                    <div>
                      <span style={styles.fromLabel}>From</span>
                      <strong style={styles.price}>{formatINR(m.basePriceStandard)}</strong>
                    </div>
                    <button style={styles.bookBtn}>
                      Book Seats →
                    </button>
                  </div>
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
    padding: '3.5rem 1.5rem',
    backgroundColor: '#080C16',
  },
  container: {
    maxWidth: '1280px',
    margin: '0 auto',
  },
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    flexWrap: 'wrap',
    gap: '1.25rem',
    marginBottom: '2rem',
  },
  kicker: {
    fontSize: '0.72rem',
    fontWeight: '800',
    letterSpacing: '0.12em',
    color: '#F43F5E',
    marginBottom: '0.3rem',
  },
  title: {
    fontSize: '2rem',
    fontWeight: '800',
    margin: '0 0 0.3rem 0',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: '0.92rem',
    color: '#94A3B8',
    margin: 0,
    maxWidth: '650px',
  },
  langPills: {
    display: 'flex',
    gap: '0.4rem',
    flexWrap: 'wrap',
  },
  langPill: {
    border: '1px solid',
    borderRadius: '20px',
    padding: '0.45rem 0.9rem',
    fontSize: '0.78rem',
    fontWeight: '600',
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 0.15s ease',
  },
  movieGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
    gap: '1.5rem',
  },
  movieCard: {
    backgroundColor: '#0F172A',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '12px',
    overflow: 'hidden',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    transition: 'transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease',
    outline: 'none',
  },
  posterWrapper: {
    position: 'relative',
    width: '100%',
    aspectRatio: '4 / 5',
    overflow: 'hidden',
    backgroundColor: '#162035',
  },
  posterImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    transition: 'transform 0.3s ease',
  },
  posterGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
    background: 'linear-gradient(to top, rgba(15, 23, 42, 0.95), transparent)',
  },
  certBadge: {
    position: 'absolute',
    top: '0.6rem',
    left: '0.6rem',
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    color: '#F8FAFC',
    borderRadius: '4px',
    padding: '0.15rem 0.4rem',
    fontSize: '0.68rem',
    fontWeight: '800',
  },
  ratingBadge: {
    position: 'absolute',
    bottom: '0.6rem',
    left: '0.6rem',
    backgroundColor: 'rgba(245, 158, 11, 0.95)',
    color: '#000000',
    borderRadius: '4px',
    padding: '0.15rem 0.45rem',
    fontSize: '0.75rem',
    fontWeight: '800',
    display: 'flex',
    alignItems: 'center',
    gap: '0.2rem',
  },
  votesCount: {
    fontSize: '0.65rem',
    fontWeight: '600',
    opacity: 0.85,
  },
  trendingRibbon: {
    position: 'absolute',
    top: '0.6rem',
    right: '0.6rem',
    backgroundColor: '#E11D48',
    color: '#FFFFFF',
    borderRadius: '4px',
    padding: '0.15rem 0.45rem',
    fontSize: '0.65rem',
    fontWeight: '800',
    letterSpacing: '0.05em',
  },
  cardInfo: {
    padding: '1rem',
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
  },
  movieName: {
    fontSize: '1.05rem',
    fontWeight: '700',
    color: '#FFFFFF',
    margin: '0 0 0.3rem 0',
    lineHeight: 1.3,
  },
  metaRow: {
    fontSize: '0.78rem',
    color: '#94A3B8',
    display: 'flex',
    gap: '0.4rem',
    marginBottom: '0.6rem',
  },
  formatTags: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.3rem',
    marginBottom: '1rem',
  },
  formatTag: {
    fontSize: '0.65rem',
    fontWeight: '700',
    color: '#06B6D4',
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
    padding: '0.15rem 0.35rem',
    borderRadius: '3px',
  },
  cardFooter: {
    marginTop: 'auto',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: '0.6rem',
    borderTop: '1px solid rgba(255, 255, 255, 0.06)',
  },
  fromLabel: {
    display: 'block',
    fontSize: '0.62rem',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  price: {
    fontSize: '1rem',
    color: '#F43F5E',
  },
  bookBtn: {
    backgroundColor: '#E11D48',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '6px',
    padding: '0.45rem 0.85rem',
    fontSize: '0.8rem',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'background-color 0.15s ease',
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
