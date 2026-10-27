import React, { useState } from 'react';
import { formatINR } from '../utils/formatters';

const ROWS_STANDARD = ['A', 'B', 'C', 'D', 'E'];
const ROWS_PREMIUM = ['F', 'G', 'H'];
const SEATS_PER_ROW = 12;

// Demo occupied seats for realism
const OCCUPIED_SEATS = new Set([
  'A3', 'A4', 'B6', 'B7', 'C1', 'C2', 'D8', 'D9', 'F6', 'F7', 'G3', 'G4', 'H10', 'H11'
]);

export default function SeatLayout({
  movie,
  theatre,
  showtime,
  onProceedToPayment,
  onBack,
}) {
  const [selectedSeats, setSelectedSeats] = useState([]);

  const standardPrice = showtime?.priceStandard || movie?.basePriceStandard || 250;
  const premiumPrice = showtime?.pricePremium || movie?.basePricePremium || 450;

  const toggleSeat = (seatId, isPremium) => {
    if (OCCUPIED_SEATS.has(seatId)) return;

    if (selectedSeats.some((s) => s.id === seatId)) {
      setSelectedSeats(selectedSeats.filter((s) => s.id !== seatId));
    } else {
      if (selectedSeats.length >= 8) {
        alert('You can select a maximum of 8 tickets per booking.');
        return;
      }
      setSelectedSeats([
        ...selectedSeats,
        {
          id: seatId,
          tier: isPremium ? 'PREMIUM' : 'STANDARD',
          price: isPremium ? premiumPrice : standardPrice,
        },
      ]);
    }
  };

  const calculateSubtotal = () => {
    return selectedSeats.reduce((sum, s) => sum + s.price, 0);
  };

  const handleProceed = () => {
    if (selectedSeats.length === 0) return;
    const tier = selectedSeats.some((s) => s.tier === 'PREMIUM') ? 'PREMIUM' : 'STANDARD';
    onProceedToPayment({
      movie,
      theatre: {
        ...theatre,
        id: theatre.id || theatre.theatreId,
      },
      showtime,
      seats: selectedSeats.map((s) => s.id),
      tier,
      quantity: selectedSeats.length,
      subtotal: calculateSubtotal(),
    });
  };

  return (
    <div style={styles.container}>
      {/* Top Header */}
      <div style={styles.topBar}>
        <button style={styles.backBtn} onClick={onBack}>
          ← Change Showtime
        </button>
        <div style={styles.showInfo}>
          <h2 style={styles.movieTitle}>{movie?.title}</h2>
          <div style={styles.metaRow}>
            <span>{theatre?.name} ({theatre?.city})</span>
            <span>•</span>
            <span style={{ color: '#F43F5E', fontWeight: '700' }}>{showtime?.time}</span>
            <span>•</span>
            <span style={styles.formatTag}>{showtime?.screenFormat || 'Dolby Atmos'}</span>
          </div>
        </div>
      </div>

      {/* Screen Graphic */}
      <div style={styles.screenContainer}>
        <div style={styles.screenCurve} />
        <div style={styles.screenLabel}>CINEMA SCREEN THIS WAY</div>
      </div>

      {/* Seat Map */}
      <div style={styles.seatMapWrapper}>
        {/* PREMIUM RECLINERS SECTION */}
        <div style={styles.tierSection}>
          <div style={styles.tierHeader}>
            <span style={styles.tierName}>👑 PREMIUM RECLINERS</span>
            <span style={styles.tierPrice}>{formatINR(premiumPrice)} / ticket</span>
          </div>
          <div style={styles.grid}>
            {ROWS_PREMIUM.map((row) => (
              <div key={row} style={styles.row}>
                <span style={styles.rowLabel}>{row}</span>
                <div style={styles.seatRow}>
                  {Array.from({ length: SEATS_PER_ROW }, (_, idx) => {
                    const seatNumber = idx + 1;
                    const seatId = `${row}${seatNumber}`;
                    const isOccupied = OCCUPIED_SEATS.has(seatId);
                    const isSelected = selectedSeats.some((s) => s.id === seatId);

                    return (
                      <button
                        key={seatId}
                        style={{
                          ...styles.seat,
                          ...styles.seatPremium,
                          backgroundColor: isSelected
                            ? '#E11D48'
                            : isOccupied
                            ? '#1E293B'
                            : '#162035',
                          borderColor: isSelected
                            ? '#F43F5E'
                            : isOccupied
                            ? '#0F172A'
                            : 'rgba(255, 255, 255, 0.2)',
                          color: isOccupied ? '#475569' : '#FFFFFF',
                          cursor: isOccupied ? 'not-allowed' : 'pointer',
                        }}
                        disabled={isOccupied}
                        onClick={() => toggleSeat(seatId, true)}
                        title={isOccupied ? `${seatId} (Sold Out)` : `${seatId} (${formatINR(premiumPrice)})`}
                        aria-label={`Seat ${seatId}`}
                      >
                        {seatNumber}
                      </button>
                    );
                  })}
                </div>
                <span style={styles.rowLabel}>{row}</span>
              </div>
            ))}
          </div>
        </div>

        {/* AISLE GAP */}
        <div style={styles.aisleGap}>
          <span>— CINEMA AISLE —</span>
        </div>

        {/* STANDARD SECTION */}
        <div style={styles.tierSection}>
          <div style={styles.tierHeader}>
            <span style={styles.tierName}>🎬 STANDARD SEATING</span>
            <span style={styles.tierPrice}>{formatINR(standardPrice)} / ticket</span>
          </div>
          <div style={styles.grid}>
            {ROWS_STANDARD.map((row) => (
              <div key={row} style={styles.row}>
                <span style={styles.rowLabel}>{row}</span>
                <div style={styles.seatRow}>
                  {Array.from({ length: SEATS_PER_ROW }, (_, idx) => {
                    const seatNumber = idx + 1;
                    const seatId = `${row}${seatNumber}`;
                    const isOccupied = OCCUPIED_SEATS.has(seatId);
                    const isSelected = selectedSeats.some((s) => s.id === seatId);

                    return (
                      <button
                        key={seatId}
                        style={{
                          ...styles.seat,
                          backgroundColor: isSelected
                            ? '#E11D48'
                            : isOccupied
                            ? '#1E293B'
                            : '#0F172A',
                          borderColor: isSelected
                            ? '#F43F5E'
                            : isOccupied
                            ? '#0F172A'
                            : 'rgba(255, 255, 255, 0.15)',
                          color: isOccupied ? '#475569' : '#FFFFFF',
                          cursor: isOccupied ? 'not-allowed' : 'pointer',
                        }}
                        disabled={isOccupied}
                        onClick={() => toggleSeat(seatId, false)}
                        title={isOccupied ? `${seatId} (Sold Out)` : `${seatId} (${formatINR(standardPrice)})`}
                        aria-label={`Seat ${seatId}`}
                      >
                        {seatNumber}
                      </button>
                    );
                  })}
                </div>
                <span style={styles.rowLabel}>{row}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Seat Legend */}
      <div style={styles.legendRow}>
        <div style={styles.legendItem}>
          <div style={{ ...styles.legendBox, backgroundColor: '#0F172A', borderColor: 'rgba(255, 255, 255, 0.2)' }} />
          <span>Available</span>
        </div>
        <div style={styles.legendItem}>
          <div style={{ ...styles.legendBox, backgroundColor: '#E11D48', borderColor: '#F43F5E' }} />
          <span>Selected</span>
        </div>
        <div style={styles.legendItem}>
          <div style={{ ...styles.legendBox, backgroundColor: '#1E293B', borderColor: '#0F172A' }} />
          <span>Sold Out</span>
        </div>
      </div>

      {/* Floating Bottom Action Bar */}
      {selectedSeats.length > 0 && (
        <div style={styles.bottomBar}>
          <div style={styles.bottomInfo}>
            <div style={styles.selectedSeatsText}>
              Seats: <strong>{selectedSeats.map((s) => s.id).join(', ')}</strong> ({selectedSeats.length} {selectedSeats.length === 1 ? 'ticket' : 'tickets'})
            </div>
            <div style={styles.subtotalText}>
              Subtotal: <strong style={{ color: '#F43F5E' }}>{formatINR(calculateSubtotal())}</strong>
              <span style={{ fontSize: '0.75rem', color: '#94A3B8', marginLeft: '0.5rem' }}>
                (+ Convenience fee & tax at checkout)
              </span>
            </div>
          </div>
          <button style={styles.proceedBtn} onClick={handleProceed}>
            Proceed to Payment →
          </button>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '960px',
    margin: '0 auto',
    padding: '2rem 1rem 6rem 1rem',
    color: '#F8FAFC',
  },
  topBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '1.5rem',
    marginBottom: '2.5rem',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
    paddingBottom: '1.25rem',
  },
  backBtn: {
    backgroundColor: '#1E293B',
    color: '#CBD5E1',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '8px',
    padding: '0.6rem 1rem',
    fontSize: '0.85rem',
    fontWeight: '600',
    cursor: 'pointer',
  },
  showInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.2rem',
  },
  movieTitle: {
    fontSize: '1.4rem',
    fontWeight: '800',
    margin: 0,
    color: '#FFFFFF',
  },
  metaRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.85rem',
    color: '#94A3B8',
  },
  formatTag: {
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
    color: '#06B6D4',
    padding: '0.1rem 0.4rem',
    borderRadius: '4px',
    fontSize: '0.75rem',
    fontWeight: '700',
  },
  screenContainer: {
    textAlign: 'center',
    marginBottom: '2.5rem',
  },
  screenCurve: {
    height: '10px',
    width: '80%',
    margin: '0 auto',
    borderRadius: '50% 50% 0 0',
    backgroundColor: '#38BDF8',
    boxShadow: '0 4px 20px rgba(56, 189, 248, 0.4)',
  },
  screenLabel: {
    fontSize: '0.75rem',
    fontWeight: '700',
    letterSpacing: '0.2em',
    color: '#64748B',
    marginTop: '0.6rem',
  },
  seatMapWrapper: {
    backgroundColor: '#0A0F1D',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '16px',
    padding: '2rem 1rem',
    overflowX: 'auto',
  },
  tierSection: {
    marginBottom: '1.5rem',
  },
  tierHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.8rem',
    fontWeight: '700',
    color: '#94A3B8',
    paddingBottom: '0.75rem',
    marginBottom: '0.75rem',
    borderBottom: '1px dashed rgba(255, 255, 255, 0.08)',
  },
  tierName: {
    letterSpacing: '0.05em',
  },
  tierPrice: {
    color: '#06B6D4',
  },
  grid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.6rem',
    alignItems: 'center',
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.8rem',
  },
  rowLabel: {
    fontSize: '0.75rem',
    fontWeight: '700',
    color: '#64748B',
    width: '18px',
    textAlign: 'center',
  },
  seatRow: {
    display: 'flex',
    gap: '0.45rem',
  },
  seat: {
    width: '32px',
    height: '32px',
    borderRadius: '6px',
    border: '1px solid',
    fontSize: '0.72rem',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.15s ease',
  },
  seatPremium: {
    borderRadius: '8px',
  },
  aisleGap: {
    textAlign: 'center',
    fontSize: '0.68rem',
    color: '#475569',
    letterSpacing: '0.15em',
    margin: '1.25rem 0',
  },
  legendRow: {
    display: 'flex',
    justifyContent: 'center',
    gap: '2rem',
    marginTop: '1.5rem',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.82rem',
    color: '#94A3B8',
  },
  legendBox: {
    width: '18px',
    height: '18px',
    borderRadius: '4px',
    border: '1px solid',
  },
  bottomBar: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#0F172A',
    borderTop: '1px solid rgba(255, 255, 255, 0.15)',
    padding: '1rem 2rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 -10px 25px rgba(0, 0, 0, 0.5)',
    zIndex: 100,
  },
  bottomInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.2rem',
  },
  selectedSeatsText: {
    fontSize: '0.9rem',
    color: '#F8FAFC',
  },
  subtotalText: {
    fontSize: '1.1rem',
  },
  proceedBtn: {
    backgroundColor: '#E11D48',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '8px',
    padding: '0.85rem 1.75rem',
    fontSize: '0.95rem',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
  },
};
