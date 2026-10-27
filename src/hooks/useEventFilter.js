import { useState, useMemo } from 'react';

/**
 * Custom hook to filter and sort events across categories, languages, cities, and search terms.
 */
export function useEventFilter(events = []) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [activeLanguage, setActiveLanguage] = useState('All Languages');
  const [activeCity, setActiveCity] = useState('All Cities');
  const [sortBy, setSortBy] = useState('featured');

  const filteredEvents = useMemo(() => {
    const list = events.filter((event) => {
      // 1. Category Filter
      const matchesCategory =
        activeCategory === 'All' || event.category === activeCategory;

      // 2. Language Filter
      const matchesLanguage =
        activeLanguage === 'All Languages' ||
        (event.language && event.language.toLowerCase().includes(activeLanguage.toLowerCase()));

      // 3. City Filter
      const matchesCity =
        activeCity === 'All Cities' ||
        (event.city && event.city.toLowerCase() === activeCity.toLowerCase());

      // 4. Search Filter (matches title, venue, city, category, language)
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch =
        query === '' ||
        event.title.toLowerCase().includes(query) ||
        event.venue.toLowerCase().includes(query) ||
        event.city.toLowerCase().includes(query) ||
        event.category.toLowerCase().includes(query) ||
        (event.language && event.language.toLowerCase().includes(query));

      return matchesCategory && matchesLanguage && matchesCity && matchesSearch;
    });

    // 5. Sorting
    const sorted = [...list];
    if (sortBy === 'price_asc') {
      sorted.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price_desc') {
      sorted.sort((a, b) => b.price - a.price);
    } else if (sortBy === 'available') {
      sorted.sort((a, b) => (b.available ?? 0) - (a.available ?? 0));
    } else {
      // Default: Featured first, then id
      sorted.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0) || a.id - b.id);
    }

    return sorted;
  }, [events, searchQuery, activeCategory, activeLanguage, activeCity, sortBy]);

  return {
    searchQuery,
    setSearchQuery,
    activeCategory,
    setActiveCategory,
    activeLanguage,
    setActiveLanguage,
    activeCity,
    setActiveCity,
    sortBy,
    setSortBy,
    filteredEvents,
  };
}
