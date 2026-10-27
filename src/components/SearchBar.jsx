import React from 'react';

export default function SearchBar({
  categories = [],
  activeCategory,
  onCategoryChange,
  searchQuery,
  onSearchChange,
  languages = [],
  activeLanguage,
  onLanguageChange,
  cities = [],
  activeCity,
  onCityChange,
  sortBy,
  onSortChange,
}) {
  return (
    <div style={styles.container}>
      <style>{`
        .ptx-search-input:focus {
          border-color: #F43F5E !important;
          box-shadow: 0 0 0 3px rgba(244, 63, 94, 0.2) !important;
        }
        .ptx-filter-select:focus {
          border-color: #F43F5E !important;
        }
        .ptx-cat-chip:hover {
          border-color: rgba(255, 255, 255, 0.3) !important;
          color: #FFFFFF !important;
        }
        @media (max-width: 768px) {
          .ptx-filter-row {
            flex-direction: column !important;
            align-items: stretch !important;
          }
        }
      `}</style>

      {/* Primary Search Bar */}
      <div style={styles.searchRow}>
        <div style={styles.inputWrapper}>
          <span style={styles.searchIcon}>🔍</span>
          <input
            className="ptx-search-input"
            type="text"
            placeholder="Search by artist, film theme, stadium, or city (e.g. Arijit, Rahman, Chennai)..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            style={styles.searchInput}
            aria-label="Search events"
          />
          {searchQuery && (
            <button
              type="button"
              style={styles.clearBtn}
              onClick={() => onSearchChange('')}
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Filter Row: Languages, Cities, Sorting */}
      <div className="ptx-filter-row" style={styles.filterRow}>
        {/* Language Filter */}
        {languages && languages.length > 0 && onLanguageChange && (
          <div style={styles.selectGroup}>
            <label style={styles.selectLabel} htmlFor="filter-language">Language:</label>
            <select
              id="filter-language"
              className="ptx-filter-select"
              style={styles.selectInput}
              value={activeLanguage || 'All Languages'}
              onChange={(e) => onLanguageChange(e.target.value)}
            >
              {languages.map((lang) => (
                <option key={lang} value={lang}>
                  {lang}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* City Filter */}
        {cities && cities.length > 0 && onCityChange && (
          <div style={styles.selectGroup}>
            <label style={styles.selectLabel} htmlFor="filter-city">City:</label>
            <select
              id="filter-city"
              className="ptx-filter-select"
              style={styles.selectInput}
              value={activeCity || 'All Cities'}
              onChange={(e) => onCityChange(e.target.value)}
            >
              {cities.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Sort Order */}
        {onSortChange && (
          <div style={styles.selectGroup}>
            <label style={styles.selectLabel} htmlFor="filter-sort">Sort by:</label>
            <select
              id="filter-sort"
              className="ptx-filter-select"
              style={styles.selectInput}
              value={sortBy || 'featured'}
              onChange={(e) => onSortChange(e.target.value)}
            >
              <option value="featured">Featured First</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="available">Most Available Tickets</option>
            </select>
          </div>
        )}
      </div>

      {/* Category Chips Scroll/Wrap */}
      <div style={styles.categoryContainer}>
        {categories && categories.map((cat) => {
          const isActive = activeCategory === cat;
          return (
            <button
              key={cat}
              type="button"
              className="ptx-cat-chip"
              style={{
                ...styles.categoryChip,
                ...(isActive ? styles.categoryChipActive : {}),
              }}
              onClick={() => onCategoryChange(cat)}
            >
              {cat}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const styles = {
  container: {
    background: '#0F172A',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: 20,
    padding: '24px',
    boxShadow: '0 8px 30px rgba(0, 0, 0, 0.35)',
    margin: '-36px auto 36px',
    maxWidth: 1240,
    position: 'relative',
    zIndex: 10,
    boxSizing: 'border-box',
  },
  searchRow: {
    display: 'flex',
    gap: 16,
    marginBottom: 18,
  },
  inputWrapper: {
    position: 'relative',
    flex: 1,
    display: 'flex',
    alignItems: 'center',
  },
  searchIcon: {
    position: 'absolute',
    left: 18,
    fontSize: 16,
    color: '#64748B',
    pointerEvents: 'none',
  },
  searchInput: {
    width: '100%',
    padding: '16px 44px 16px 48px',
    border: '1.5px solid rgba(255, 255, 255, 0.12)',
    borderRadius: 14,
    fontSize: 15,
    background: '#131C31',
    color: '#F8FAFC',
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
    transition: 'all 0.2s ease',
  },
  clearBtn: {
    position: 'absolute',
    right: 14,
    background: 'none',
    border: 'none',
    color: '#94A3B8',
    cursor: 'pointer',
    fontSize: 16,
    padding: 6,
  },
  filterRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 20,
    flexWrap: 'wrap',
    paddingBottom: 18,
    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
    marginBottom: 16,
  },
  selectGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  selectLabel: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: 600,
    whiteSpace: 'nowrap',
  },
  selectInput: {
    background: '#131C31',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: 10,
    color: '#F8FAFC',
    padding: '8px 12px',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    outline: 'none',
    fontFamily: 'inherit',
  },
  categoryContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    padding: '8px 16px',
    borderRadius: 30,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    background: '#131C31',
    color: '#94A3B8',
    transition: 'all 0.2s ease',
    whiteSpace: 'nowrap',
    fontFamily: 'inherit',
  },
  categoryChipActive: {
    background: 'linear-gradient(135deg, #E11D48 0%, #F43F5E 100%)',
    color: '#FFFFFF',
    borderColor: '#E11D48',
    boxShadow: '0 2px 10px rgba(225, 29, 72, 0.35)',
  },
};
