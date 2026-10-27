import React, { useState } from 'react';
import { formatINR } from '../utils/formatters.js';

export default function EventCard({ event, onClick, remainingTickets }) {
  const [imgError, setImgError] = useState(false);

  const availableCount = remainingTickets !== undefined ? remainingTickets : event.available;
  const isSoldOut = availableCount <= 0;

  return (
    <>
      <style>{`
        .ptx-event-card {
          background: #0F172A;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 18px;
          overflow: hidden;
          cursor: pointer;
          transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
          display: flex;
          flex-direction: column;
          position: relative;
        }
        .ptx-event-card:hover {
          transform: translateY(-6px);
          box-shadow: 0 16px 36px rgba(0, 0, 0, 0.5);
          border-color: rgba(244, 63, 94, 0.4);
        }
        .ptx-card-img {
          transition: transform 0.4s ease;
        }
        .ptx-event-card:hover .ptx-card-img {
          transform: scale(1.04);
        }
      `}</style>

      <div
        className="ptx-event-card"
        onClick={() => {
          if (onClick) onClick(event);
        }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (onClick) onClick(event);
          }
        }}
        aria-label={`View details for ${event.title}`}
      >
        {/* Poster Image Container with fixed 4:5 cinematic ratio */}
        <div style={styles.imageWrapper}>
          {imgError ? (
            <div style={styles.imageFallback}>
              <span style={styles.fallbackIcon}>🎬</span>
              <span style={styles.fallbackCategory}>{event.category}</span>
            </div>
          ) : (
            <img
              src={event.image}
              alt={`Event poster for ${event.title}`}
              className="ptx-card-img"
              style={styles.image}
              onError={() => setImgError(true)}
              loading="lazy"
            />
          )}

          {/* Gradient Overlay for readable badges */}
          <div style={styles.imageGradient} />

          {/* Top badges */}
          <div style={styles.topBadgeRow}>
            {event.featured && (
              <span style={styles.featuredBadge}>FEATURED</span>
            )}
            {event.language && (
              <span style={styles.languageBadge}>{event.language}</span>
            )}
          </div>

          {/* Demo Badge */}
          <div style={styles.demoWatermark}>DEMO</div>
        </div>

        {/* Content Section */}
        <div style={styles.content}>
          {/* Category Tag */}
          <div style={styles.categoryTag}>{event.category}</div>

          {/* Event Title */}
          <h3 style={styles.title} title={event.title}>
            {event.title}
          </h3>

          {/* Date & Location */}
          <div style={styles.metaRow}>
            <span style={styles.metaIcon}>🗓️</span>
            <span style={styles.metaText}>{event.date} • {event.time}</span>
          </div>
          <div style={styles.metaRow}>
            <span style={styles.metaIcon}>📍</span>
            <span style={styles.metaText}>{event.venue}, {event.city}</span>
          </div>

          {/* Availability Status */}
          <div style={styles.availabilityRow}>
            <span
              style={{
                ...styles.availDot,
                color: isSoldOut ? '#EF4444' : availableCount <= 10 ? '#F59E0B' : '#10B981',
              }}
            >
              ●
            </span>
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: isSoldOut ? '#EF4444' : availableCount <= 10 ? '#FBBF24' : '#94A3B8',
              }}
            >
              {isSoldOut
                ? 'Sold Out in Demo'
                : availableCount <= 10
                ? `Only ${availableCount} seats left!`
                : `${availableCount} tickets available`}
            </span>
          </div>

          {/* Bottom Pricing Row */}
          <div style={styles.footerRow}>
            <div style={styles.priceContainer}>
              <span style={styles.priceLabel}>From</span>
              <span style={styles.priceValue}>{formatINR(event.price)}</span>
            </div>
            <span style={styles.actionPrompt}>Book Now →</span>
          </div>
        </div>
      </div>
    </>
  );
}

const styles = {
  imageWrapper: {
    position: 'relative',
    width: '100%',
    aspectRatio: '4 / 5',
    overflow: 'hidden',
    backgroundColor: '#1E293B',
  },
  image: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
  },
  imageFallback: {
    width: '100%',
    height: '100%',
    background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  fallbackIcon: {
    fontSize: 40,
  },
  fallbackCategory: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: 600,
    textAlign: 'center',
    padding: '0 12px',
  },
  imageGradient: {
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(180deg, rgba(8, 12, 22, 0.4) 0%, transparent 40%, rgba(15, 23, 42, 0.95) 100%)',
    pointerEvents: 'none',
  },
  topBadgeRow: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 6,
    zIndex: 2,
  },
  featuredBadge: {
    background: 'linear-gradient(135deg, #E11D48 0%, #F59E0B 100%)',
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 800,
    letterSpacing: '0.08em',
    padding: '3px 8px',
    borderRadius: 6,
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.4)',
  },
  languageBadge: {
    background: 'rgba(15, 23, 42, 0.85)',
    backdropFilter: 'blur(8px)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    color: '#F8FAFC',
    fontSize: 11,
    fontWeight: 600,
    padding: '3px 8px',
    borderRadius: 6,
    marginLeft: 'auto',
  },
  demoWatermark: {
    position: 'absolute',
    bottom: 8,
    right: 10,
    fontSize: 9,
    fontWeight: 700,
    color: 'rgba(255, 255, 255, 0.5)',
    letterSpacing: '0.1em',
    background: 'rgba(0, 0, 0, 0.4)',
    padding: '2px 6px',
    borderRadius: 4,
    zIndex: 2,
  },
  content: {
    padding: '16px 18px 20px',
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    backgroundColor: '#0F172A',
  },
  categoryTag: {
    fontSize: 11,
    fontWeight: 700,
    color: '#FB7185',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    marginBottom: 6,
  },
  title: {
    fontSize: 17,
    fontWeight: 700,
    color: '#F8FAFC',
    margin: '0 0 10px',
    lineHeight: 1.35,
    overflow: 'hidden',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
  },
  metaRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    color: '#94A3B8',
    fontSize: 13,
    marginBottom: 4,
  },
  metaIcon: {
    fontSize: 12,
  },
  metaText: {
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  availabilityRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    marginBottom: 12,
  },
  availDot: {
    fontSize: 10,
  },
  footerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 'auto',
    paddingTop: 14,
    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
  },
  priceContainer: {
    display: 'flex',
    flexDirection: 'column',
  },
  priceLabel: {
    fontSize: 11,
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  priceValue: {
    fontFamily: "'Outfit', sans-serif",
    fontSize: 20,
    fontWeight: 800,
    color: '#F8FAFC',
    letterSpacing: '-0.02em',
  },
  actionPrompt: {
    fontSize: 13,
    fontWeight: 700,
    color: '#FB7185',
    transition: 'color 0.2s',
  },
};
