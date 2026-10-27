import React, { useState, useEffect } from 'react';

const FEATURED_SLIDES = [
  {
    id: 'mov-1',
    title: 'Kalki 2898 AD: Chapter Echo',
    tagline: 'Prabhas • Amitabh Bachchan • Kamal Haasan • Deepika Padukone',
    format: 'IMAX Laser 3D & 4DX',
    banner: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1600&h=650&fit=crop&q=80',
    type: 'MOVIE',
    actionText: 'Book IMAX Seats →',
  },
  {
    id: 'mov-2',
    title: 'Thalapathy 69: Final Salute',
    tagline: 'The Mass Hero\'s Grand Farewell • Directed by H. Vinoth',
    format: 'Dolby Atmos & 4K RGB Laser',
    banner: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1600&h=650&fit=crop&q=80',
    type: 'MOVIE',
    actionText: 'Select Showtimes →',
  },
  {
    id: 'exp-4',
    title: 'Imagicaa & Wonderla Mega Adventure Passes',
    tagline: 'Roller Coasters, Tropical Wave Pools & Nitro Drops',
    format: 'Theme & Water Parks',
    banner: 'https://images.unsplash.com/photo-1513889961551-628c1e5e2ee9?w=1600&h=650&fit=crop&q=80',
    type: 'EXPERIENCE',
    actionText: 'Get Park Passes →',
  },
  {
    id: '1',
    title: 'Arijit Singh — Soulful Symphony Arena Tour',
    tagline: '40-Piece Grand Live Symphony Orchestra',
    format: 'Stadium Concert Tour',
    banner: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1600&h=650&fit=crop&q=80',
    type: 'CONCERT',
    actionText: 'Reserve Concert Passes →',
  },
];

export default function Hero({ onExploreMovies, onExploreEvents, onExploreTheatres, onSelectFeatured }) {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % FEATURED_SLIDES.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const slide = FEATURED_SLIDES[currentSlide];

  return (
    <section style={styles.heroWrapper}>
      {/* Background Banner with Crossfade */}
      <div style={styles.bannerContainer}>
        <img
          key={slide.banner}
          src={slide.banner}
          alt={slide.title}
          style={styles.bannerImg}
        />
        <div style={styles.gradientOverlay} />
      </div>

      <div style={styles.contentContainer}>
        <div style={styles.heroCard}>
          <div style={styles.badgeRow}>
            <span style={styles.formatBadge}>🔥 {slide.format}</span>
            <span style={styles.demoBadge}>DEMO SHOWCASE</span>
          </div>

          <h1 style={styles.heroTitle}>{slide.title}</h1>
          <p style={styles.heroTagline}>{slide.tagline}</p>

          <div style={styles.ctaRow}>
            <button
              style={styles.primaryCta}
              onClick={() => onSelectFeatured && onSelectFeatured(slide)}
            >
              {slide.actionText}
            </button>
            <button style={styles.secondaryCta} onClick={onExploreMovies}>
              Trending Movies
            </button>
            <button style={styles.secondaryCta} onClick={onExploreTheatres}>
              Find 50+ Theatres
            </button>
            <button style={styles.ghostCta} onClick={onExploreEvents}>
              Concerts & Shows
            </button>
          </div>

          {/* Slide Indicator Dots */}
          <div style={styles.dotsRow}>
            {FEATURED_SLIDES.map((_, i) => (
              <button
                key={i}
                style={{
                  ...styles.dot,
                  backgroundColor: currentSlide === i ? '#F43F5E' : 'rgba(255, 255, 255, 0.3)',
                  width: currentSlide === i ? '24px' : '8px',
                }}
                onClick={() => setCurrentSlide(i)}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

const styles = {
  heroWrapper: {
    position: 'relative',
    height: '480px',
    width: '100%',
    overflow: 'hidden',
    backgroundColor: '#080C16',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
  },
  bannerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  bannerImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    filter: 'brightness(0.38) saturate(1.25)',
    transition: 'opacity 0.6s ease',
  },
  gradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background:
      'linear-gradient(to right, rgba(8, 12, 22, 0.95) 0%, rgba(8, 12, 22, 0.65) 50%, rgba(8, 12, 22, 0.3) 100%), linear-gradient(to bottom, transparent 60%, #080C16 100%)',
  },
  contentContainer: {
    position: 'relative',
    maxWidth: '1280px',
    margin: '0 auto',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    padding: '0 1.5rem',
  },
  heroCard: {
    maxWidth: '680px',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.8rem',
  },
  badgeRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
  },
  formatBadge: {
    backgroundColor: 'rgba(244, 63, 94, 0.2)',
    color: '#F43F5E',
    border: '1px solid rgba(244, 63, 94, 0.4)',
    borderRadius: '4px',
    padding: '0.2rem 0.5rem',
    fontSize: '0.75rem',
    fontWeight: '800',
    letterSpacing: '0.05em',
  },
  demoBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    color: '#94A3B8',
    borderRadius: '4px',
    padding: '0.2rem 0.5rem',
    fontSize: '0.7rem',
    fontWeight: '600',
  },
  heroTitle: {
    fontFamily: 'var(--font-display)',
    fontSize: '2.8rem',
    fontWeight: '800',
    lineHeight: 1.15,
    margin: 0,
    color: '#FFFFFF',
    letterSpacing: '-0.02em',
  },
  heroTagline: {
    fontSize: '1.05rem',
    color: '#CBD5E1',
    margin: 0,
    lineHeight: 1.5,
  },
  ctaRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.85rem',
    marginTop: '0.8rem',
    flexWrap: 'wrap',
  },
  primaryCta: {
    backgroundColor: '#E11D48',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '8px',
    padding: '0.85rem 1.6rem',
    fontSize: '0.95rem',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease, transform 0.2s ease',
    boxShadow: '0 8px 20px rgba(225, 29, 72, 0.4)',
  },
  secondaryCta: {
    backgroundColor: '#0F172A',
    color: '#F8FAFC',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: '8px',
    padding: '0.85rem 1.4rem',
    fontSize: '0.9rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
  },
  ghostCta: {
    backgroundColor: 'transparent',
    color: '#94A3B8',
    border: 'none',
    padding: '0.85rem 1rem',
    fontSize: '0.9rem',
    fontWeight: '600',
    cursor: 'pointer',
  },
  dotsRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginTop: '1rem',
  },
  dot: {
    height: '8px',
    borderRadius: '4px',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
    transition: 'all 0.3s ease',
  },
};
