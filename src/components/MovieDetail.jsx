import React, { useState, useEffect } from 'react';
import { getMovie } from '../services/api';
import { formatINR } from '../utils/formatters';

const DATES = [
  { label: 'Today', dateStr: 'Nov 28', day: 'Fri' },
  { label: 'Tomorrow', dateStr: 'Nov 29', day: 'Sat' },
  { label: 'Weekend', dateStr: 'Nov 30', day: 'Sun' },
  { label: 'Next Week', dateStr: 'Dec 01', day: 'Mon' },
];

export default function MovieDetail({
  movieId,
  city,
  onBack,
  onSelectShowtime,
}) {
  const [movieData, setMovieData] = useState(null);
  const [selectedDateIndex, setSelectedDateIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    getMovie(movieId, city)
      .then((data) => {
        if (isMounted) {
          setMovieData(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [movieId, city]);

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner} />
        <p>Loading cinema schedules & movie experience...</p>
      </div>
    );
  }

  if (error || !movieData) {
    return (
      <div style={styles.errorContainer}>
        <h3>Unable to load movie details</h3>
        <p>{error || 'Movie not found.'}</p>
        <button style={styles.backBtn} onClick={onBack}>← Back to Movies</button>
      </div>
    );
  }

  const { movie, showtimesByTheatre } = movieData;

  return (
    <div style={styles.container}>
      {/* Cinematic Hero Backdrop */}
      <div style={styles.backdropWrapper}>
        <img src={movie.banner} alt={movie.title} style={styles.backdropImg} />
        <div style={styles.backdropOverlay} />
      </div>

      <div style={styles.mainContent}>
        {/* Back Link */}
        <button style={styles.backLink} onClick={onBack}>
          ← Back to Discovery
        </button>

        {/* Movie Header Card */}
        <div style={styles.headerCard}>
          <img src={movie.poster} alt={movie.title} style={styles.poster} />

          <div style={styles.headerDetails}>
            <div style={styles.badgeRow}>
              <span style={styles.certBadge}>{movie.certification}</span>
              <span style={styles.durationBadge}>⏱️ {movie.duration}</span>
              <span style={styles.ratingBadge}>★ {movie.rating}/10 ({movie.votes})</span>
            </div>

            <h1 style={styles.movieTitle}>{movie.title}</h1>
            {movie.tagline && <p style={styles.tagline}>"{movie.tagline}"</p>}

            <div style={styles.tagsRow}>
              <span style={styles.tagLabel}>Languages:</span>
              {movie.languages.map((l) => (
                <span key={l} style={styles.langTag}>{l}</span>
              ))}
            </div>

            <div style={styles.tagsRow}>
              <span style={styles.tagLabel}>Genre:</span>
              {movie.genre.map((g) => (
                <span key={g} style={styles.genreTag}>{g}</span>
              ))}
            </div>

            <p style={styles.synopsis}>{movie.synopsis}</p>

            <div style={styles.creditsRow}>
              <div>
                <span style={styles.creditLabel}>Director</span>
                <span style={styles.creditValue}>{movie.director}</span>
              </div>
              <div>
                <span style={styles.creditLabel}>Key Cast</span>
                <span style={styles.creditValue}>{movie.cast.join(', ')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Showtimes Section */}
        <div style={styles.showtimesSection}>
          <div style={styles.sectionHeader}>
            <div>
              <h2 style={styles.sectionTitle}>Select Cinema & Showtime</h2>
              <p style={styles.sectionSubtitle}>
                Showing available screens in <strong>{city}</strong> for {DATES[selectedDateIndex].label} ({DATES[selectedDateIndex].dateStr})
              </p>
            </div>

            {/* Date Tabs */}
            <div style={styles.dateTabs}>
              {DATES.map((d, idx) => (
                <button
                  key={d.label}
                  style={{
                    ...styles.dateTab,
                    borderColor: selectedDateIndex === idx ? '#F43F5E' : 'rgba(255, 255, 255, 0.12)',
                    backgroundColor: selectedDateIndex === idx ? 'rgba(244, 63, 94, 0.15)' : '#0F172A',
                    color: selectedDateIndex === idx ? '#FFFFFF' : '#94A3B8',
                  }}
                  onClick={() => setSelectedDateIndex(idx)}
                >
                  <span style={styles.dateDay}>{d.day}</span>
                  <strong style={styles.dateNum}>{d.dateStr}</strong>
                  <span style={styles.dateLabel}>{d.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Theatre Showtimes List */}
          <div style={styles.theatreList}>
            {showtimesByTheatre.map((th) => (
              <div key={th.theatreId} style={styles.theatreItem}>
                <div style={styles.theatreInfo}>
                  <div style={styles.theatreHeader}>
                    <h3 style={styles.theatreName}>{th.theatreName}</h3>
                    {th.isPremiumFormat && (
                      <span style={styles.premiumPill}>IMAX / 4DX</span>
                    )}
                  </div>
                  <div style={styles.theatreAddress}>
                    📍 {th.area}, {th.city} • <span style={{ color: '#06B6D4' }}>{th.screenFormat}</span>
                  </div>
                </div>

                {/* Showtimes Pills */}
                <div style={styles.showtimePills}>
                  {th.shows.map((slot) => (
                    <button
                      key={slot.showId}
                      style={styles.showtimePill}
                      onClick={() =>
                        onSelectShowtime({
                          movie,
                          theatre: th,
                          showtime: slot,
                        })
                      }
                      title={`Standard ${formatINR(slot.priceStandard)} | Premium ${formatINR(slot.pricePremium)}`}
                    >
                      <span style={styles.pillTime}>{slot.time}</span>
                      <span style={styles.pillFormat}>{slot.screenFormat}</span>
                      <span style={styles.pillPrice}>from {formatINR(slot.priceStandard)}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    backgroundColor: '#080C16',
    minHeight: '100vh',
    color: '#F8FAFC',
    paddingBottom: '5rem',
  },
  backdropWrapper: {
    position: 'relative',
    width: '100%',
    height: '380px',
    overflow: 'hidden',
  },
  backdropImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    filter: 'brightness(0.4) saturate(1.2)',
  },
  backdropOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'linear-gradient(to bottom, transparent 30%, #080C16 100%)',
  },
  mainContent: {
    maxWidth: '1180px',
    margin: '-160px auto 0 auto',
    padding: '0 1.5rem',
    position: 'relative',
    zIndex: 10,
  },
  backLink: {
    background: 'none',
    border: 'none',
    color: '#CBD5E1',
    fontSize: '0.9rem',
    fontWeight: '600',
    cursor: 'pointer',
    marginBottom: '1rem',
    padding: 0,
  },
  headerCard: {
    display: 'flex',
    gap: '2rem',
    backgroundColor: '#0F172A',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '16px',
    padding: '2rem',
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)',
    flexWrap: 'wrap',
  },
  poster: {
    width: '220px',
    height: '310px',
    objectFit: 'cover',
    borderRadius: '12px',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.7)',
  },
  headerDetails: {
    flex: '1 1 500px',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.6rem',
  },
  badgeRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
  },
  certBadge: {
    backgroundColor: 'rgba(244, 63, 94, 0.15)',
    color: '#F43F5E',
    border: '1px solid rgba(244, 63, 94, 0.3)',
    borderRadius: '4px',
    padding: '0.15rem 0.5rem',
    fontSize: '0.75rem',
    fontWeight: '800',
  },
  durationBadge: {
    fontSize: '0.8rem',
    color: '#94A3B8',
  },
  ratingBadge: {
    fontSize: '0.82rem',
    color: '#F59E0B',
    fontWeight: '700',
  },
  movieTitle: {
    fontSize: '2.2rem',
    fontWeight: '800',
    margin: '0.2rem 0',
    color: '#FFFFFF',
  },
  tagline: {
    fontSize: '0.95rem',
    fontStyle: 'italic',
    color: '#06B6D4',
    margin: 0,
  },
  tagsRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    flexWrap: 'wrap',
    fontSize: '0.82rem',
  },
  tagLabel: {
    color: '#64748B',
    fontWeight: '600',
  },
  langTag: {
    backgroundColor: '#162035',
    color: '#F8FAFC',
    padding: '0.2rem 0.6rem',
    borderRadius: '4px',
    fontSize: '0.75rem',
  },
  genreTag: {
    backgroundColor: '#1E293B',
    color: '#CBD5E1',
    padding: '0.2rem 0.6rem',
    borderRadius: '4px',
    fontSize: '0.75rem',
  },
  synopsis: {
    fontSize: '0.92rem',
    color: '#CBD5E1',
    lineHeight: 1.6,
    margin: '0.6rem 0',
  },
  creditsRow: {
    display: 'flex',
    gap: '2rem',
    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
    paddingTop: '0.8rem',
    marginTop: 'auto',
  },
  creditLabel: {
    display: 'block',
    fontSize: '0.72rem',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  creditValue: {
    fontSize: '0.88rem',
    color: '#F8FAFC',
    fontWeight: '600',
  },
  showtimesSection: {
    marginTop: '3rem',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    flexWrap: 'wrap',
    gap: '1.5rem',
    marginBottom: '2rem',
  },
  sectionTitle: {
    fontSize: '1.6rem',
    fontWeight: '800',
    margin: '0 0 0.3rem 0',
  },
  sectionSubtitle: {
    fontSize: '0.9rem',
    color: '#94A3B8',
    margin: 0,
  },
  dateTabs: {
    display: 'flex',
    gap: '0.5rem',
  },
  dateTab: {
    border: '1px solid',
    borderRadius: '8px',
    padding: '0.6rem 0.9rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 0.15s ease',
  },
  dateDay: {
    fontSize: '0.68rem',
    textTransform: 'uppercase',
  },
  dateNum: {
    fontSize: '0.95rem',
    margin: '0.1rem 0',
  },
  dateLabel: {
    fontSize: '0.68rem',
  },
  theatreList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
  },
  theatreItem: {
    backgroundColor: '#0F172A',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '12px',
    padding: '1.5rem',
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '1.5rem',
  },
  theatreInfo: {
    flex: '1 1 300px',
  },
  theatreHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
    marginBottom: '0.3rem',
  },
  theatreName: {
    fontSize: '1.15rem',
    fontWeight: '700',
    margin: 0,
    color: '#FFFFFF',
  },
  premiumPill: {
    fontSize: '0.68rem',
    fontWeight: '800',
    color: '#F59E0B',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    border: '1px solid rgba(245, 158, 11, 0.3)',
    padding: '0.15rem 0.4rem',
    borderRadius: '4px',
  },
  theatreAddress: {
    fontSize: '0.82rem',
    color: '#94A3B8',
  },
  showtimePills: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.75rem',
  },
  showtimePill: {
    backgroundColor: '#162035',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: '8px',
    padding: '0.6rem 1rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    cursor: 'pointer',
    color: '#FFFFFF',
    fontFamily: 'inherit',
    transition: 'all 0.15s ease',
  },
  pillTime: {
    fontSize: '0.95rem',
    fontWeight: '700',
    color: '#F43F5E',
  },
  pillFormat: {
    fontSize: '0.65rem',
    color: '#06B6D4',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginTop: '0.1rem',
  },
  pillPrice: {
    fontSize: '0.68rem',
    color: '#94A3B8',
    marginTop: '0.2rem',
  },
  loadingContainer: {
    textAlign: 'center',
    padding: '8rem 1rem',
    color: '#94A3B8',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '3px solid rgba(255, 255, 255, 0.1)',
    borderTopColor: '#F43F5E',
    borderRadius: '50%',
    margin: '0 auto 1.5rem auto',
    animation: 'spin 1s linear infinite',
  },
  errorContainer: {
    textAlign: 'center',
    padding: '6rem 1rem',
  },
  backBtn: {
    backgroundColor: '#E11D48',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '8px',
    padding: '0.75rem 1.5rem',
    cursor: 'pointer',
    marginTop: '1rem',
  },
};
