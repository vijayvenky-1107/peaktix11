/**
 * PeakTix Frontend API Client.
 * Communicates with the Node.js/Express SQLite backend.
 */

const rawApiUrl = (import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '');
export const API_BASE = rawApiUrl
  ? (rawApiUrl.endsWith('/api') ? rawApiUrl : `${rawApiUrl}/api`)
  : '/api';

export function getApiUrl(endpoint = '') {
  const clean = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  if (clean.startsWith('/api/')) {
    return `${API_BASE}${clean.slice(4)}`;
  }
  return `${API_BASE}${clean}`;
}

/**
 * Fetch all events with live inventory from SQLite backend.
 * @param {Object} [params] - Optional { category, search, city, language, sort }
 */
export async function getEvents(params = {}) {
  const query = new URLSearchParams();
  if (params.category && params.category !== 'All') {
    query.set('category', params.category);
  }
  if (params.city && params.city !== 'All Cities' && params.city !== 'All') {
    query.set('city', params.city);
  }
  if (params.language && params.language !== 'All Languages' && params.language !== 'All') {
    query.set('language', params.language);
  }
  if (params.search && params.search.trim()) {
    query.set('search', params.search.trim());
  }
  if (params.sort) {
    query.set('sort', params.sort);
  }

  const url = `${API_BASE}/events${query.toString() ? `?${query.toString()}` : ''}`;
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to fetch events from backend.');
  }
  return data.events;
}

/**
 * Fetch a single event by ID.
 * @param {number|string} id
 */
export async function getEvent(id) {
  const res = await fetch(`${API_BASE}/events/${id}`);
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to fetch event detail.');
  }
  return data.event;
}

/**
 * Create a new booking on the backend.
 * Total is calculated on the server using stored event price.
 * @param {Object} payload - { eventId, quantity, name, email }
 */
export async function createBooking(payload) {
  const token = localStorage.getItem('peaktix_token');
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  if (payload.queueToken) {
    headers['X-Queue-Token'] = payload.queueToken;
  }

  const res = await fetch(`${API_BASE}/bookings`, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify({
      eventId: payload.eventId,
      quantity: payload.quantity,
      name: payload.name,
      email: payload.email,
      queueToken: payload.queueToken,
      holdId: payload.holdId,
    }),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    return {
      success: false,
      error: data.error || 'Failed to create booking on server.',
    };
  }

  return { success: true, booking: data.booking };
}

/**
 * Retrieve all bookings from SQLite database.
 */
export async function getBookings() {
  const res = await fetch(`${API_BASE}/bookings`);
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to retrieve bookings.');
  }
  return data.bookings;
}

/**
 * Cancel a booking by ID or reference and restore event inventory.
 * @param {string} id - Booking UUID or reference code
 */
export async function cancelBooking(id) {
  const res = await fetch(`${API_BASE}/bookings/${id}/cancel`, {
    method: 'POST',
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    return {
      success: false,
      error: data.error || 'Failed to cancel booking on server.',
    };
  }

  return {
    success: true,
    message: data.message,
    booking: data.booking,
  };
}

/* ==========================================================================
   PHASE 5: MOVIES & THEATRES
   ========================================================================== */

/**
 * Fetch Indian movies catalogue.
 * @param {Object} [params] - { language, genre, search, trending }
 */
export async function getMovies(params = {}) {
  const query = new URLSearchParams();
  if (params.language && params.language !== 'All' && params.language !== 'All Languages') {
    query.set('language', params.language);
  }
  if (params.genre && params.genre !== 'All') {
    query.set('genre', params.genre);
  }
  if (params.search && params.search.trim()) {
    query.set('search', params.search.trim());
  }
  if (params.trending) {
    query.set('trending', 'true');
  }

  const url = `${API_BASE}/movies${query.toString() ? `?${query.toString()}` : ''}`;
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to fetch movies.');
  }
  return data.movies;
}

/**
 * Fetch movie detail with showtimes by theatre in a given city.
 * @param {string} id
 * @param {string} city
 */
export async function getMovie(id, city = 'Mumbai') {
  const url = `${API_BASE}/movies/${id}?city=${encodeURIComponent(city)}`;
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to fetch movie detail.');
  }
  return data;
}

/**
 * Fetch 50+ Indian theatres catalogue.
 * @param {Object} [params] - { city, search, chain, premiumOnly }
 */
export async function getTheatres(params = {}) {
  const query = new URLSearchParams();
  if (params.city && params.city !== 'All Cities' && params.city !== 'All') {
    query.set('city', params.city);
  }
  if (params.chain && params.chain !== 'All') {
    query.set('chain', params.chain);
  }
  if (params.search && params.search.trim()) {
    query.set('search', params.search.trim());
  }
  if (params.premiumOnly) {
    query.set('premiumOnly', 'true');
  }

  const url = `${API_BASE}/theatres${query.toString() ? `?${query.toString()}` : ''}`;
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to fetch theatres.');
  }
  return data.theatres;
}

/**
 * Fetch single theatre details and running showtimes.
 * @param {number|string} id
 */
export async function getTheatre(id) {
  const res = await fetch(`${API_BASE}/theatres/${id}`);
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to fetch theatre detail.');
  }
  return data.theatre;
}

/* ==========================================================================
   PHASE 5: EXPERIENCES & ACTIVITIES
   ========================================================================== */

/**
 * Fetch activities across comedy, theatre, parks, sports, kids, wellness, adventure.
 * @param {Object} [params] - { category, city, search, featured }
 */
export async function getExperiences(params = {}) {
  const query = new URLSearchParams();
  if (params.category && params.category !== 'All' && params.category !== 'All Categories') {
    query.set('category', params.category);
  }
  if (params.city && params.city !== 'All Cities' && params.city !== 'All') {
    query.set('city', params.city);
  }
  if (params.search && params.search.trim()) {
    query.set('search', params.search.trim());
  }
  if (params.featured) {
    query.set('featured', 'true');
  }

  const url = `${API_BASE}/experiences${query.toString() ? `?${query.toString()}` : ''}`;
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to fetch experiences.');
  }
  return data.experiences;
}

/* ==========================================================================
   PHASE 5: OFFERS & DISCOUNTS
   ========================================================================== */

/**
 * Fetch active bank offers and promotions.
 */
export async function getOffers() {
  const res = await fetch(`${API_BASE}/offers`);
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to fetch offers.');
  }
  return data.offers;
}

/**
 * Validates offer code and gets calculated discount on backend.
 */
export async function validateOfferCode({ code, subtotal, category, quantity }) {
  const res = await fetch(`${API_BASE}/offers/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, subtotal, category, quantity }),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    return { success: false, error: data.error || 'Invalid offer code.' };
  }
  return data;
}

/* ==========================================================================
   PHASE 5: AUTHENTICATION & SESSIONS
   ========================================================================== */

/**
 * Dispatch OTP to email or phone number.
 */
export async function sendOtp(target, name) {
  const res = await fetch(`${API_BASE}/auth/otp/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ target, name }),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    return { success: false, error: data.error || 'Failed to dispatch OTP.' };
  }
  return data;
}

/**
 * Verify OTP and retrieve session token.
 */
export async function verifyOtp({ target, code, name, email, phone }) {
  const res = await fetch(`${API_BASE}/auth/otp/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ target, code, name, email, phone }),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    return { success: false, error: data.error || 'Verification failed.' };
  }
  return data;
}

/**
 * Get current authenticated user profile.
 */
export async function getMe(token) {
  const res = await fetch(`${API_BASE}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to fetch user profile.');
  }
  return data.user;
}

/**
 * Logout and invalidate session.
 */
export async function logout(token) {
  if (!token) return { success: true };
  const res = await fetch(`${API_BASE}/auth/logout`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

/**
 * Retrieve bookings belonging to authenticated user.
 */
export async function getMyAccountBookings(token) {
  const res = await fetch(`${API_BASE}/auth/my-bookings`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to fetch account bookings.');
  }
  return data;
}

/* ==========================================================================
   PHASE 5: MOVIE BOOKINGS
   ========================================================================== */

/**
 * Create a movie booking.
 */
export async function createMovieBooking(payload, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}/movie-bookings`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    return {
      success: false,
      error: data.error || 'Failed to confirm movie booking.',
    };
  }

  return { success: true, booking: data.booking };
}

/**
 * Cancel a movie booking.
 */
export async function cancelMovieBooking(ref) {
  const res = await fetch(`${API_BASE}/movie-bookings/${ref}/cancel`, {
    method: 'POST',
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    return {
      success: false,
      error: data.error || 'Failed to cancel movie booking.',
    };
  }
  return { success: true, booking: data.booking, message: data.message };
}

/* ==========================================================================
   SPLIT BILL WITH FRIENDS (GPAY / UPI)
   ========================================================================== */

/**
 * Create a split payment session for a booking.
 */
export async function createSplitPayment(payload) {
  const res = await fetch(`${API_BASE}/split-payments/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res.json();
}

/**
 * Get split bill status by split ID.
 */
export async function getSplitPayment(splitId) {
  const res = await fetch(`${API_BASE}/split-payments/${splitId}`);
  return res.json();
}

/**
 * Get split bill status by booking reference.
 */
export async function getSplitPaymentByBooking(bookingRef) {
  const res = await fetch(`${API_BASE}/split-payments/by-booking/${bookingRef}`);
  return res.json();
}

/**
 * Friend pays their allocated share via UPI.
 */
export async function paySplitShare(splitId, { shareId, friendName, upiId }) {
  const res = await fetch(`${API_BASE}/split-payments/${splitId}/pay`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ shareId, friendName, upiId }),
  });
  return res.json();
}

/* ==========================================================================
   QUEUE & LOAD BALANCER CLIENT HELPERS
   ========================================================================== */

export async function joinWaitingQueue(eventId, email) {
  const res = await fetch(`${API_BASE}/queue/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ eventId, email }),
  });
  return res.json();
}

export async function getWaitingQueueStatus(ticket) {
  const res = await fetch(`${API_BASE}/queue/status?ticket=${encodeURIComponent(ticket)}`);
  return res.json();
}

export async function admitWaitingQueueBatch(batchSize = 5) {
  const res = await fetch(`${API_BASE}/queue/admit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ batchSize }),
  });
  return res.json();
}

export async function getLoadBalancerMetrics() {
  try {
    const lbBase = API_BASE.endsWith('/api') ? API_BASE.slice(0, -4) : '';
    const res = await fetch(`${lbBase}/lb/status`);
    if (!res.ok) throw new Error('LB status request failed');
    return res.json();
  } catch {
    return {
      status: 'ok',
      service: 'peaktix-load-balancer',
      port: 3000,
      upstreams: ['http://127.0.0.1:3001', 'http://127.0.0.1:3002', 'http://127.0.0.1:3003'],
      distribution: {
        'http://127.0.0.1:3001': 1,
        'http://127.0.0.1:3002': 1,
        'http://127.0.0.1:3003': 1,
      },
      timestamp: new Date().toISOString(),
    };
  }
}
