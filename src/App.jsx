import { useState, useEffect, useRef, useCallback } from 'react';
import './App.css';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import MoviesRail from './components/MoviesRail';
import MovieDetail from './components/MovieDetail';
import SeatLayout from './components/SeatLayout';
import CheckoutModal from './components/CheckoutModal';
import MovieConfirmation from './components/MovieConfirmation';
import TheatresExplorer from './components/TheatresExplorer';
import ExperiencesSection from './components/ExperiencesSection';
import OffersSection from './components/OffersSection';
import AuthModal from './components/AuthModal';
import SearchBar from './components/SearchBar';
import EventCard from './components/EventCard';
import EventDetail from './components/EventDetail';
import BookingConfirmation from './components/BookingConfirmation';
import MyBookings from './components/MyBookings';
import CloudDemo from './components/CloudDemo';
import PeakDemandLab from './components/PeakDemandLab';
import WaitingRoomView from './components/WaitingRoomView';
import LoadBalancerView from './components/LoadBalancerView';
import SplitPaymentFriendView from './components/SplitPaymentFriendView';
import LoginPage from './components/LoginPage';
import Footer from './components/Footer';
import { events as defaultEvents, categories, languages, cities } from './data/events';
import { useEventFilter } from './hooks/useEventFilter';
import { useBookings } from './hooks/useBookings';
import { getEvents, getMe, logout } from './services/api';

function App() {
  const [eventsList, setEventsList] = useState(defaultEvents);
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [confirmedBooking, setConfirmedBooking] = useState(null);

  // Phase 5 Movie & Theatre state
  const [selectedMovieId, setSelectedMovieId] = useState(null);
  const [activeShowtimeSelection, setActiveShowtimeSelection] = useState(null);
  const [checkoutDetails, setCheckoutDetails] = useState(null);
  const [confirmedMovieBooking, setConfirmedMovieBooking] = useState(null);

  // Split payment URL deep-link handling (?split=SPL-XXXXXX)
  const [friendSplitId, setFriendSplitId] = useState(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      return urlParams.get('split');
    } catch {
      return null;
    }
  });

  // Authentication state with lazy initialization
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('peaktix_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);

  // Navigation View State
  // 'home' | 'movies' | 'movie-detail' | 'seat-selection' | 'movie-confirmation' | 'theatres' | 'experiences' | 'offers' | 'events' | 'event-detail' | 'confirmation' | 'bookings' | 'cloud-demo'
  const [currentView, setCurrentView] = useState('home');
  const [currentPage, setCurrentPage] = useState('home');

  const eventsRef = useRef(null);

  // Verify authenticated session on mount if token exists
  useEffect(() => {
    const token = localStorage.getItem('peaktix_token');
    if (token) {
      getMe(token)
        .then((user) => setCurrentUser(user))
        .catch(() => {
          localStorage.removeItem('peaktix_token');
          localStorage.removeItem('peaktix_user');
          setCurrentUser(null);
        });
    }
  }, []);

  // Load live events from SQLite backend
  useEffect(() => {
    let ignore = false;
    getEvents()
      .then((liveEvents) => {
        if (!ignore && Array.isArray(liveEvents) && liveEvents.length > 0) {
          setEventsList(liveEvents);
        }
      })
      .catch((err) => {
        console.warn('Backend events API unavailable, using local sample events:', err.message);
      });
    return () => {
      ignore = true;
    };
  }, []);

  const refreshEvents = useCallback(async () => {
    try {
      const liveEvents = await getEvents();
      if (Array.isArray(liveEvents) && liveEvents.length > 0) {
        setEventsList(liveEvents);
      }
    } catch (err) {
      console.warn('Backend events API unavailable, using local sample events:', err.message);
    }
  }, []);

  // Hook backed by backend API
  const { bookings, addBooking, cancelBooking } = useBookings(refreshEvents);

  const {
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
  } = useEventFilter(eventsList);

  const handleNavigate = (page) => {
    setCurrentPage(page);

    if (page === 'home') {
      setCurrentView('home');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (page === 'movies') {
      setCurrentView('movies');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (page === 'events') {
      setCurrentView('home');
      setTimeout(() => {
        eventsRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else if (page === 'theatres') {
      setCurrentView('theatres');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (page === 'experiences') {
      setCurrentView('experiences');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (page === 'offers') {
      setCurrentView('offers');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (page === 'bookings') {
      setCurrentView('bookings');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (page === 'cloud-demo') {
      setCurrentView('cloud-demo');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (page === 'peak-demand-lab') {
      setCurrentView('peak-demand-lab');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (page === 'waiting-room') {
      setCurrentView('waiting-room');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (page === 'load-balancer') {
      setCurrentView('load-balancer');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleLogout = async () => {
    const token = localStorage.getItem('peaktix_token');
    await logout(token);
    localStorage.removeItem('peaktix_token');
    localStorage.removeItem('peaktix_user');
    setCurrentUser(null);
  };

  // Movie Flow Handlers
  const handleSelectMovie = (movie) => {
    setSelectedMovieId(movie.id);
    setCurrentView('movie-detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectShowtime = ({ movie, theatre, showtime }) => {
    setActiveShowtimeSelection({ movie, theatre, showtime });
    setCurrentView('seat-selection');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleProceedToPayment = (details) => {
    setCheckoutDetails(details);
    setCheckoutModalOpen(true);
  };

  const handleMovieBookingSuccess = (booking) => {
    setConfirmedMovieBooking(booking);
    setCheckoutModalOpen(false);
    setCurrentView('movie-confirmation');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Event Flow Handlers
  const handleEventClick = (event) => {
    setSelectedEventId(event.id);
    setConfirmedBooking(null);
    setCurrentView('event-detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToEvents = () => {
    setSelectedEventId(null);
    setConfirmedBooking(null);
    setCurrentView('home');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBookTicket = async (bookingPayload) => {
    const result = await addBooking(bookingPayload);
    if (result.success) {
      setConfirmedBooking(result.booking);
      setSelectedEventId(null);
      setCurrentView('confirmation');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      await refreshEvents();
    }
    return result;
  };

  const handleViewMyBookings = () => {
    setSelectedEventId(null);
    setConfirmedBooking(null);
    setConfirmedMovieBooking(null);
    setCurrentView('bookings');
    setCurrentPage('bookings');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const currentSelectedEvent = selectedEventId
    ? eventsList.find((e) => e.id === selectedEventId) || defaultEvents.find((e) => e.id === selectedEventId)
    : null;

  const activeBookingsCount = bookings.filter((b) => b.status !== 'CANCELLED').length;

  // Deep-link split bill recipient view
  if (friendSplitId) {
    return (
      <SplitPaymentFriendView
        splitId={friendSplitId}
        onGoToHome={() => {
          try {
            window.history.replaceState({}, document.title, window.location.pathname);
          } catch {
            // ignore
          }
          setFriendSplitId(null);
          setCurrentView('home');
          setCurrentPage('home');
        }}
      />
    );
  }

  // Enforce authentication: Login page is the FIRST page users see
  if (!currentUser) {
    return (
      <LoginPage
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          setCurrentView('home');
          setCurrentPage('home');
        }}
      />
    );
  }

  return (
    <div className="app">
      <Navbar
        onNavigate={handleNavigate}
        currentPage={currentPage}
        bookingsCount={activeBookingsCount}
        selectedCity={activeCity}
        onSelectCity={(city) => {
          setActiveCity(city);
        }}
        currentUser={currentUser}
        onOpenAuth={() => setAuthModalOpen(true)}
        onLogout={handleLogout}
      />

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onAuthSuccess={(user) => {
          setCurrentUser(user);
        }}
      />

      {/* Checkout Modal */}
      <CheckoutModal
        isOpen={checkoutModalOpen}
        onClose={() => setCheckoutModalOpen(false)}
        bookingDetails={checkoutDetails}
        currentUser={currentUser}
        onBookingSuccess={handleMovieBookingSuccess}
      />

      {/* VIEW: Movie Detail View */}
      {currentView === 'movie-detail' && selectedMovieId && (
        <MovieDetail
          movieId={selectedMovieId}
          city={activeCity}
          onBack={() => setCurrentView('home')}
          onSelectShowtime={handleSelectShowtime}
        />
      )}

      {/* VIEW: Seat Selection View */}
      {currentView === 'seat-selection' && activeShowtimeSelection && (
        <SeatLayout
          movie={activeShowtimeSelection.movie}
          theatre={activeShowtimeSelection.theatre}
          showtime={activeShowtimeSelection.showtime}
          onProceedToPayment={handleProceedToPayment}
          onBack={() => setCurrentView('movie-detail')}
        />
      )}

      {/* VIEW: Movie Booking Confirmation Pass */}
      {currentView === 'movie-confirmation' && confirmedMovieBooking && (
        <MovieConfirmation
          booking={confirmedMovieBooking}
          onNewBooking={() => setCurrentView('home')}
          onViewMyBookings={handleViewMyBookings}
        />
      )}

      {/* VIEW: Event Detail View */}
      {currentView === 'event-detail' && currentSelectedEvent && (
        <EventDetail
          event={currentSelectedEvent}
          remainingTickets={currentSelectedEvent.available}
          onBack={handleBackToEvents}
          onBook={handleBookTicket}
        />
      )}

      {/* VIEW: Event Booking Confirmation */}
      {currentView === 'confirmation' && confirmedBooking && (
        <BookingConfirmation
          booking={confirmedBooking}
          onBackToEvents={handleBackToEvents}
          onViewMyBookings={handleViewMyBookings}
        />
      )}

      {/* VIEW: Dedicated Movies Page */}
      {currentView === 'movies' && (
        <main className="main-content">
          <MoviesRail onSelectMovie={handleSelectMovie} currentCity={activeCity} />
        </main>
      )}

      {/* VIEW: Dedicated 50+ Theatres Page */}
      {currentView === 'theatres' && (
        <main className="main-content">
          <TheatresExplorer
            currentCity={activeCity}
            onCityChange={setActiveCity}
            onSelectTheatre={(_th) => {
              // Scroll to movies or show cinema details
              setCurrentView('movies');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        </main>
      )}

      {/* VIEW: Dedicated Experiences Page */}
      {currentView === 'experiences' && (
        <main className="main-content">
          <ExperiencesSection
            currentCity={activeCity}
            onBookExperience={(exp) => {
              // Route to checkout or events view
              alert(`Booking reserved for "${exp.title}" in ${exp.city}. Price: ₹${exp.price}`);
            }}
          />
        </main>
      )}

      {/* VIEW: Dedicated Bank Offers Page */}
      {currentView === 'offers' && (
        <main className="main-content">
          <OffersSection onApplyOfferCode={(code) => alert(`Code ${code} copied! Apply at ticket checkout.`)} />
        </main>
      )}

      {/* VIEW: My Bookings & Account View */}
      {currentView === 'bookings' && (
        <MyBookings
          bookings={bookings}
          onCancelBooking={async (bookingId) => {
            const res = await cancelBooking(bookingId);
            await refreshEvents();
            return res;
          }}
          onBrowseEvents={handleBackToEvents}
          currentUser={currentUser}
        />
      )}

      {/* VIEW: Cloud Architecture Demo View */}
      {currentView === 'cloud-demo' && (
        <CloudDemo onBackToEvents={handleBackToEvents} />
      )}

      {/* VIEW: Peak Demand Lab (Academic Demo) */}
      {currentView === 'peak-demand-lab' && (
        <PeakDemandLab onBack={handleBackToEvents} />
      )}

      {/* VIEW: Virtual Waiting Room & Probability Forecasting */}
      {currentView === 'waiting-room' && (
        <WaitingRoomView
          events={eventsList}
          currentUser={currentUser}
          onProceedToBooking={(ev) => handleEventClick(ev)}
          onBackToHome={() => handleNavigate('home')}
        />
      )}

      {/* VIEW: Port 3000 Load Balancer Dashboard */}
      {currentView === 'load-balancer' && (
        <LoadBalancerView onBack={() => handleNavigate('home')} />
      )}

      {/* VIEW: Rich Entertainment Homepage */}
      {currentView === 'home' && (
        <>
          <Hero
            onExploreMovies={() => {
              setCurrentView('movies');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onExploreEvents={() => {
              eventsRef.current?.scrollIntoView({ behavior: 'smooth' });
            }}
            onExploreTheatres={() => {
              setCurrentView('theatres');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onSelectFeatured={(slide) => {
              if (slide.type === 'MOVIE') {
                setSelectedMovieId(slide.id);
                setCurrentView('movie-detail');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              } else if (slide.type === 'EXPERIENCE') {
                setCurrentView('experiences');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              } else {
                eventsRef.current?.scrollIntoView({ behavior: 'smooth' });
              }
            }}
          />

          <main className="main-content">
            {/* 1. Trending Indian Movies Rail */}
            <MoviesRail onSelectMovie={handleSelectMovie} currentCity={activeCity} />

            {/* 2. Live Concerts & Shows Filter Bar & Grid */}
            <div ref={eventsRef} style={{ paddingTop: '2rem' }}>
              <SearchBar
                categories={categories}
                activeCategory={activeCategory}
                onCategoryChange={setActiveCategory}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                languages={languages}
                activeLanguage={activeLanguage}
                onLanguageChange={setActiveLanguage}
                cities={cities}
                activeCity={activeCity}
                onCityChange={setActiveCity}
                sortBy={sortBy}
                onSortChange={setSortBy}
              />

              <section className="events-section">
                <div className="events-header">
                  <h2 className="events-title">
                    <span>{activeCategory === 'All' ? 'Popular Concerts & Stadium Tours' : activeCategory}</span>
                    {activeCity !== 'All Cities' && <span className="events-title-pill">{activeCity}</span>}
                    {activeLanguage !== 'All Languages' && <span className="events-title-pill">{activeLanguage}</span>}
                  </h2>
                  <p className="events-count">
                    {filteredEvents.length} live show{filteredEvents.length !== 1 ? 's' : ''} available
                  </p>
                </div>

                {filteredEvents.length > 0 ? (
                  <div className="events-grid">
                    {filteredEvents.map((event) => (
                      <EventCard
                        key={event.id}
                        event={event}
                        remainingTickets={event.available}
                        onClick={handleEventClick}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="no-events">
                    <span className="no-events-icon">🎤</span>
                    <h3>No live shows found matching your criteria</h3>
                    <p>Try resetting your search, language filter, or selecting "All Cities".</p>
                  </div>
                )}
              </section>
            </div>

            {/* 3. Curated Indian Experiences & Activities */}
            <ExperiencesSection
              currentCity={activeCity}
              onBookExperience={(exp) => {
                alert(`Selected experience "${exp.title}" in ${exp.city}. Price: ₹${exp.price}`);
              }}
            />

            {/* 4. 50+ Theatres Catalogue Explorer */}
            <TheatresExplorer
              currentCity={activeCity}
              onCityChange={setActiveCity}
              onSelectTheatre={(_th) => {
                setCurrentView('movies');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />

            {/* 5. Bank Offers & Promos */}
            <OffersSection onApplyOfferCode={(code) => alert(`Code ${code} copied! Apply at ticket checkout.`)} />
          </main>
        </>
      )}

      <Footer onNavigate={handleNavigate} />
    </div>
  );
}

export default App;
