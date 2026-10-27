import React, { useState, useEffect } from 'react';
import { getExperiences } from '../services/api';
import { formatINR } from '../utils/formatters';

const EXPERIENCE_CATEGORIES = [
  'All Experiences',
  'Comedy & Stand-up',
  'Theatre & Performing Arts',
  'Theme & Amusement Parks',
  'Sports & Outdoor Activities',
  'Kids\' Activities & Family',
  'Arts, Crafts & Workshops',
  'Dance & Masterclasses',
  'Wellness & Fitness',
  'Thrilling Adventure',
];

export default function ExperiencesSection({ currentCity, onBookExperience }) {
  const [experiences, setExperiences] = useState([]);
  const [activeCategory, setActiveCategory] = useState('All Experiences');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    getExperiences({
      category: activeCategory === 'All Experiences' ? undefined : activeCategory,
      city: currentCity === 'All Cities' ? undefined : currentCity,
    })
      .then((data) => {
        if (isMounted) {
          setExperiences(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Failed to load experiences:', err);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [activeCategory, currentCity]);

  return (
    <section style={styles.section} id="experiences-section">
      <div style={styles.container}>
        <div style={styles.header}>
          <div>
            <div style={styles.kicker}>CURATED INDIAN ATTRACTIONS & ADVENTURES</div>
            <h2 style={styles.title}>Top Experiences & Activities</h2>
            <p style={styles.subtitle}>
              Stand-up specials, grand musicals, theme park passes, pottery workshops, and Sahyadri thrills.
            </p>
          </div>
        </div>

        {/* Category Pills */}
        <div style={styles.pillsScroll}>
          {EXPERIENCE_CATEGORIES.map((cat) => (
            <button
              key={cat}
              style={{
                ...styles.pill,
                borderColor: activeCategory === cat ? '#F43F5E' : 'rgba(255, 255, 255, 0.1)',
                backgroundColor: activeCategory === cat ? 'rgba(244, 63, 94, 0.15)' : '#0F172A',
                color: activeCategory === cat ? '#FFFFFF' : '#94A3B8',
              }}
              onClick={() => {
                setActiveCategory(cat);
                setLoading(true);
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Experiences Grid */}
        {loading ? (
          <div style={styles.loadingBox}>
            <div style={styles.spinner} />
            <p>Loading curated experiences in {currentCity}...</p>
          </div>
        ) : experiences.length === 0 ? (
          <div style={styles.emptyBox}>
            <h3>No experiences found in this category for {currentCity}.</h3>
            <p>Try switching to "All Experiences" or choosing another city.</p>
          </div>
        ) : (
          <div style={styles.grid}>
            {experiences.map((exp) => (
              <div key={exp.id} style={styles.card}>
                <div style={styles.imageWrapper}>
                  <img src={exp.image} alt={exp.title} style={styles.image} />
                  <span style={styles.categoryBadge}>{exp.category}</span>
                  <span style={styles.ratingBadge}>★ {exp.rating}</span>
                </div>

                <div style={styles.cardContent}>
                  <h3 style={styles.cardTitle}>{exp.title}</h3>
                  <div style={styles.venueRow}>
                    📍 {exp.venue}, <strong style={{ color: '#F8FAFC' }}>{exp.city}</strong>
                  </div>
                  <div style={styles.scheduleRow}>
                    🕒 {exp.date} • {exp.time}
                  </div>
                  <p style={styles.description}>{exp.description}</p>

                  <div style={styles.cardFooter}>
                    <div>
                      <span style={styles.priceLabel}>From</span>
                      <strong style={styles.priceValue}>{formatINR(exp.price)}</strong>
                    </div>
                    <button
                      style={styles.bookBtn}
                      onClick={() => onBookExperience && onBookExperience(exp)}
                    >
                      Book Now →
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
    padding: '4rem 1.5rem',
    backgroundColor: '#0A0F1D',
    borderTop: '1px solid rgba(255, 255, 255, 0.06)',
  },
  container: {
    maxWidth: '1240px',
    margin: '0 auto',
  },
  header: {
    marginBottom: '2rem',
  },
  kicker: {
    fontSize: '0.72rem',
    fontWeight: '800',
    letterSpacing: '0.12em',
    color: '#06B6D4',
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
  pillsScroll: {
    display: 'flex',
    gap: '0.6rem',
    overflowX: 'auto',
    paddingBottom: '1rem',
    marginBottom: '2rem',
  },
  pill: {
    border: '1px solid',
    borderRadius: '20px',
    padding: '0.55rem 1.1rem',
    fontSize: '0.82rem',
    fontWeight: '600',
    whiteSpace: 'nowrap',
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 0.15s ease',
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
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    transition: 'transform 0.2s ease, border-color 0.2s ease',
  },
  imageWrapper: {
    position: 'relative',
    height: '190px',
    width: '100%',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  categoryBadge: {
    position: 'absolute',
    top: '0.75rem',
    left: '0.75rem',
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    backdropFilter: 'blur(4px)',
    color: '#06B6D4',
    border: '1px solid rgba(6, 182, 212, 0.3)',
    borderRadius: '4px',
    padding: '0.2rem 0.5rem',
    fontSize: '0.7rem',
    fontWeight: '700',
  },
  ratingBadge: {
    position: 'absolute',
    top: '0.75rem',
    right: '0.75rem',
    backgroundColor: 'rgba(245, 158, 11, 0.9)',
    color: '#000000',
    borderRadius: '4px',
    padding: '0.2rem 0.45rem',
    fontSize: '0.75rem',
    fontWeight: '800',
  },
  cardContent: {
    padding: '1.25rem',
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
  },
  cardTitle: {
    fontSize: '1.15rem',
    fontWeight: '700',
    color: '#FFFFFF',
    margin: '0 0 0.5rem 0',
  },
  venueRow: {
    fontSize: '0.8rem',
    color: '#94A3B8',
    marginBottom: '0.25rem',
  },
  scheduleRow: {
    fontSize: '0.78rem',
    color: '#64748B',
    marginBottom: '0.75rem',
  },
  description: {
    fontSize: '0.85rem',
    color: '#CBD5E1',
    lineHeight: 1.5,
    margin: '0 0 1.25rem 0',
    flex: 1,
  },
  cardFooter: {
    marginTop: 'auto',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: '0.75rem',
    borderTop: '1px solid rgba(255, 255, 255, 0.06)',
  },
  priceLabel: {
    display: 'block',
    fontSize: '0.68rem',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  priceValue: {
    fontSize: '1.15rem',
    color: '#F43F5E',
  },
  bookBtn: {
    backgroundColor: '#E11D48',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '6px',
    padding: '0.55rem 1.1rem',
    fontSize: '0.85rem',
    fontWeight: '700',
    cursor: 'pointer',
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
    borderTopColor: '#06B6D4',
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
};
