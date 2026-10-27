import React, { useState, useEffect } from 'react';

const INDIAN_CITIES = [
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

export default function Navbar({
  onNavigate,
  currentPage,
  bookingsCount = 0,
  selectedCity = 'Mumbai',
  onSelectCity,
  currentUser,
  onOpenAuth,
  onLogout,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [userDropdown, setUserDropdown] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 960) setIsOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleNav = (key) => {
    if (onNavigate) onNavigate(key);
    setIsOpen(false);
    setUserDropdown(false);
  };

  return (
    <>
      <style>{`
        .ptx-nav-link:hover {
          color: #FFFFFF !important;
        }
        .ptx-city-select:focus {
          border-color: #F43F5E !important;
          outline: none;
        }
        @media (max-width: 959px) {
          .ptx-desktop-nav {
            display: none !important;
          }
          .ptx-hamburger-btn {
            display: flex !important;
          }
        }
      `}</style>

      <nav style={styles.navbar}>
        <div style={styles.container}>
          {/* Brand Logo & City Selector */}
          <div style={styles.leftGroup}>
            <button
              style={styles.logoBtn}
              onClick={() => handleNav('home')}
              aria-label="PeakTix Indian Entertainment Platform"
            >
              <div style={styles.logoMark}>
                <span style={styles.logoTriangle}>▲</span>
              </div>
              <div style={styles.brandText}>
                <span style={styles.brandName}>
                  Peak<span style={{ color: '#F43F5E' }}>Tix</span>
                </span>
                <span style={styles.brandTagline}>CINEMA • LIVE • EXPERIENCES</span>
              </div>
            </button>

            {/* City Selector Dropdown */}
            <div style={styles.cityWrapper}>
              <span style={styles.pinIcon}>📍</span>
              <select
                className="ptx-city-select"
                value={selectedCity}
                onChange={(e) => onSelectCity && onSelectCity(e.target.value)}
                style={styles.citySelect}
                aria-label="Choose current city"
              >
                {INDIAN_CITIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <div className="ptx-desktop-nav" style={styles.navLinks}>
            <button
              style={{
                ...styles.navLink,
                color: currentPage === 'movies' ? '#F43F5E' : '#CBD5E1',
                borderBottom: currentPage === 'movies' ? '2px solid #F43F5E' : '2px solid transparent',
              }}
              onClick={() => handleNav('movies')}
            >
              Movies
            </button>

            <button
              style={{
                ...styles.navLink,
                color: currentPage === 'events' ? '#F43F5E' : '#CBD5E1',
                borderBottom: currentPage === 'events' ? '2px solid #F43F5E' : '2px solid transparent',
              }}
              onClick={() => handleNav('events')}
            >
              Concerts & Live
            </button>

            <button
              style={{
                ...styles.navLink,
                color: currentPage === 'experiences' ? '#F43F5E' : '#CBD5E1',
                borderBottom: currentPage === 'experiences' ? '2px solid #F43F5E' : '2px solid transparent',
              }}
              onClick={() => handleNav('experiences')}
            >
              Experiences
            </button>

            <button
              style={{
                ...styles.navLink,
                color: currentPage === 'theatres' ? '#F43F5E' : '#CBD5E1',
                borderBottom: currentPage === 'theatres' ? '2px solid #F43F5E' : '2px solid transparent',
              }}
              onClick={() => handleNav('theatres')}
            >
              50+ Theatres
            </button>

            <button
              style={{
                ...styles.navLink,
                color: currentPage === 'offers' ? '#F43F5E' : '#CBD5E1',
                borderBottom: currentPage === 'offers' ? '2px solid #F43F5E' : '2px solid transparent',
              }}
              onClick={() => handleNav('offers')}
            >
              Offers
            </button>

            <button
              style={{
                ...styles.navLink,
                color: currentPage === 'waiting-room' ? '#F43F5E' : '#CBD5E1',
                borderBottom: currentPage === 'waiting-room' ? '2px solid #F43F5E' : '2px solid transparent',
              }}
              onClick={() => handleNav('waiting-room')}
            >
              <span>⏳ Waiting Room</span>
            </button>

            <button
              style={{
                ...styles.navLink,
                color: currentPage === 'load-balancer' ? '#F43F5E' : '#38BDF8',
                borderBottom: currentPage === 'load-balancer' ? '2px solid #F43F5E' : '2px solid transparent',
              }}
              onClick={() => handleNav('load-balancer')}
              title="Port 3000 Load Balancer (3 Upstream Nodes)"
            >
              <span>⚖️ Load Balancer</span>
            </button>
          </div>

          {/* Right Group: My Bookings & Auth */}
          <div style={styles.rightGroup}>
            <button
              style={{
                ...styles.myBookingsBtn,
                borderColor: currentPage === 'bookings' ? '#F43F5E' : 'rgba(255, 255, 255, 0.15)',
                color: currentPage === 'bookings' ? '#FFFFFF' : '#CBD5E1',
              }}
              onClick={() => handleNav('bookings')}
            >
              <span>🎟️ My Bookings</span>
              {bookingsCount > 0 && (
                <span style={styles.badge}>{bookingsCount}</span>
              )}
            </button>

            {currentUser ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={styles.userMenuWrapper}>
                  <button
                    style={styles.userProfileBtn}
                    onClick={() => setUserDropdown(!userDropdown)}
                  >
                    <span style={styles.userAvatar}>
                      {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : '👤'}
                    </span>
                    <span style={styles.userName}>{currentUser.name || 'My Account'}</span>
                    <span style={{ fontSize: '0.7rem' }}>▼</span>
                  </button>

                  {userDropdown && (
                    <div style={styles.dropdownMenu}>
                      <div style={styles.dropdownHeader}>
                        <strong style={{ color: '#FFFFFF', fontSize: '0.85rem' }}>{currentUser.name}</strong>
                        <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>{currentUser.email || currentUser.phone}</span>
                      </div>
                      <button style={styles.dropdownItem} onClick={() => handleNav('bookings')}>
                        🎟️ My Passes & Tickets
                      </button>
                      <button style={{ ...styles.dropdownItem, color: '#FCA5A5' }} onClick={onLogout}>
                        🚪 Sign Out
                      </button>
                    </div>
                  )}
                </div>

                <button
                  style={styles.logoutBtn}
                  onClick={onLogout}
                  title="Sign Out"
                >
                  Logout
                </button>
              </div>
            ) : (
              <button style={styles.signInBtn} onClick={onOpenAuth}>
                Sign In
              </button>
            )}

            {/* Mobile Hamburger */}
            <button
              className="ptx-hamburger-btn"
              style={styles.hamburgerBtn}
              onClick={() => setIsOpen(!isOpen)}
              aria-label="Toggle navigation menu"
            >
              {isOpen ? '✕' : '☰'}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Drawer */}
        {isOpen && (
          <div style={styles.mobileDrawer}>
            <button style={styles.mobileLink} onClick={() => handleNav('movies')}>
              🎬 Movies in {selectedCity}
            </button>
            <button style={styles.mobileLink} onClick={() => handleNav('events')}>
              🎤 Concerts & Shows
            </button>
            <button style={styles.mobileLink} onClick={() => handleNav('experiences')}>
              🎪 Curated Experiences
            </button>
            <button style={styles.mobileLink} onClick={() => handleNav('theatres')}>
              🏛️ 50+ Indian Theatres
            </button>
            <button style={styles.mobileLink} onClick={() => handleNav('offers')}>
              💳 Bank Card Offers
            </button>
            <button style={styles.mobileLink} onClick={() => handleNav('waiting-room')}>
              ⏳ Virtual Waiting Room & Probability
            </button>
            <button style={{ ...styles.mobileLink, color: '#38BDF8' }} onClick={() => handleNav('load-balancer')}>
              ⚖️ Load Balancer Monitor (:3000)
            </button>
            <button style={styles.mobileLink} onClick={() => handleNav('bookings')}>
              🎟️ My Bookings ({bookingsCount})
            </button>
            {currentUser ? (
              <button style={{ ...styles.mobileLink, color: '#FCA5A5' }} onClick={onLogout}>
                🚪 Sign Out ({currentUser.name})
              </button>
            ) : (
              <button style={{ ...styles.mobileLink, color: '#F43F5E' }} onClick={onOpenAuth}>
                🔑 Sign In / Register
              </button>
            )}
          </div>
        )}
      </nav>
    </>
  );
}

const styles = {
  navbar: {
    backgroundColor: 'rgba(8, 12, 22, 0.95)',
    backdropFilter: 'blur(12px)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
    position: 'sticky',
    top: 0,
    zIndex: 200,
    width: '100%',
  },
  container: {
    maxWidth: '1280px',
    margin: '0 auto',
    padding: '0 1.5rem',
    height: '68px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '1rem',
  },
  leftGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '1.25rem',
  },
  logoBtn: {
    background: 'none',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    cursor: 'pointer',
    padding: 0,
  },
  logoMark: {
    width: '36px',
    height: '36px',
    borderRadius: '10px',
    background: 'linear-gradient(135deg, #E11D48 0%, #F59E0B 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 14px rgba(225, 29, 72, 0.4)',
  },
  logoTriangle: {
    color: '#FFFFFF',
    fontSize: '1.1rem',
    lineHeight: 1,
  },
  brandText: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  brandName: {
    fontFamily: 'var(--font-display)',
    fontSize: '1.35rem',
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: '-0.02em',
    lineHeight: 1.1,
  },
  brandTagline: {
    fontSize: '0.62rem',
    fontWeight: '800',
    letterSpacing: '0.12em',
    color: '#06B6D4',
  },
  cityWrapper: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: '8px',
    padding: '0.35rem 0.65rem',
  },
  pinIcon: {
    fontSize: '0.85rem',
    marginRight: '0.25rem',
  },
  citySelect: {
    background: 'none',
    border: 'none',
    color: '#F8FAFC',
    fontSize: '0.85rem',
    fontWeight: '600',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  navLinks: {
    display: 'flex',
    gap: '1.25rem',
    height: '68px',
  },
  navLink: {
    background: 'none',
    border: 'none',
    padding: '0 0.5rem',
    fontSize: '0.88rem',
    fontWeight: '600',
    cursor: 'pointer',
    fontFamily: 'inherit',
    display: 'flex',
    alignItems: 'center',
    transition: 'color 0.15s ease',
  },
  rightGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.85rem',
  },
  myBookingsBtn: {
    backgroundColor: '#0F172A',
    border: '1px solid',
    borderRadius: '8px',
    padding: '0.5rem 0.9rem',
    fontSize: '0.82rem',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontFamily: 'inherit',
  },
  badge: {
    backgroundColor: '#E11D48',
    color: '#FFFFFF',
    borderRadius: '10px',
    padding: '0.1rem 0.45rem',
    fontSize: '0.7rem',
    fontWeight: '800',
  },
  signInBtn: {
    backgroundColor: '#E11D48',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '8px',
    padding: '0.55rem 1.1rem',
    fontSize: '0.85rem',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'background-color 0.15s ease',
  },
  userMenuWrapper: {
    position: 'relative',
  },
  userProfileBtn: {
    backgroundColor: '#0F172A',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: '8px',
    padding: '0.4rem 0.8rem',
    color: '#FFFFFF',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  userAvatar: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    backgroundColor: '#F43F5E',
    color: '#FFFFFF',
    fontSize: '0.75rem',
    fontWeight: '800',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userName: {
    fontSize: '0.82rem',
    fontWeight: '600',
    maxWidth: '100px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  logoutBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    border: '1px solid rgba(239, 68, 68, 0.35)',
    color: '#FCA5A5',
    borderRadius: '8px',
    padding: '0.4rem 0.8rem',
    fontSize: '0.82rem',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  dropdownMenu: {
    position: 'absolute',
    top: 'calc(100% + 8px)',
    right: 0,
    backgroundColor: '#0F172A',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: '10px',
    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.5)',
    minWidth: '200px',
    overflow: 'hidden',
    zIndex: 100,
  },
  dropdownHeader: {
    padding: '0.85rem 1rem',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.15rem',
  },
  dropdownItem: {
    width: '100%',
    padding: '0.75rem 1rem',
    background: 'none',
    border: 'none',
    textAlign: 'left',
    color: '#CBD5E1',
    fontSize: '0.82rem',
    cursor: 'pointer',
    fontFamily: 'inherit',
    borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
  },
  hamburgerBtn: {
    display: 'none',
    background: 'none',
    border: 'none',
    color: '#FFFFFF',
    fontSize: '1.4rem',
    cursor: 'pointer',
    padding: '0.4rem',
  },
  mobileDrawer: {
    backgroundColor: '#0F172A',
    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
    padding: '1rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.6rem',
  },
  mobileLink: {
    background: 'none',
    border: 'none',
    textAlign: 'left',
    color: '#CBD5E1',
    fontSize: '0.95rem',
    fontWeight: '600',
    padding: '0.6rem 0.5rem',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
};
