# PeakTix — Indian Entertainment & Experiences Booking Platform

PeakTix is a modern, high-performance Indian entertainment ticket-booking web application built with **React 19**, **Vite**, **Node.js (Express 5)**, and an ACID-compliant **SQLite database**.

PeakTix provides comprehensive discovery and ticket reservations for Indian cinema (Bollywood, Kollywood, Tollywood, Mollywood, Sandalwood), playback singer concerts, stand-up comedy, theme parks, thrilling outdoor activities, bank card discount offers, and a target catalogue of 50+ theatres across 10 major metropolitan cities.

---

## Key Features

### 1. Cinema & Movie Booking (Part 3)
- **Indian Cinema Discovery:** Blockbuster movies across Hindi, Tamil, Telugu, Malayalam, and Kannada with certification badges (U/A, A), ratings, durations, cast/director credits, and high-res posters.
- **Cinematic Showtimes & Formats:** Real-time screening schedules across IMAX Laser, 4DX, Dolby Atmos, and 2D Digital.
- **Interactive Seat Selection:** Curved screen orientation, Premium Recliners (₹450) and Standard Seating (₹250) tiers, live seat selection counter (max 8 tickets), and availability status.
- **ACID Seat Reservation:** Atomic transactions prevent double-booking or race conditions on the same seat.
- **Boarding Pass Ticket Confirmation:** Digital pass with booking reference (`PMB-...`), seat numbers, and barcode representation.

### 2. 50+ Verified Theatre Listings (Part 4)
- **Extensive Theatre Network:** 54 theatre records across 10 Indian cities: Mumbai, Delhi-NCR, Bengaluru, Chennai, Hyderabad, Kochi, Kolkata, Pune, Ahmedabad, and Chandigarh.
- **Multiplexes & Heritage Halls:** PVR INOX, Cinepolis, Miraj Cinemas, Asian Cinemas, SPI Cinemas, and iconic heritage single-screen venues (Regal, Urvashi, Sathyam, Prasads).
- **Format & Facility Filtering:** Filter by city, cinema chain, and premium formats (IMAX / 4DX). Displays facilities such as gourmet food, recliners, valet parking, and wheelchair access.

### 3. Live Concerts, Comedy, Theme Parks & Activities (Parts 2 & 5)
- **Live Concerts:** Playback singer arena tours (Arijit Singh, Anirudh Ravichander, AR Rahman, Diljit Dosanjh, Shreya Ghoshal).
- **Comedy & Theatre:** Stand-up comedy specials and grand stage musicals (Mughal-e-Azam, Zakir Khan, Aravind SA).
- **Theme Parks:** Passes for Imagicaa, Wonderla Bengaluru & Kochi, and Ramoji Film City.
- **Adventures & Sports:** Kolad white-water rafting, Kamshet paragliding, pro go-karting, and Mumbai midnight cycling.

### 4. Authentication, Sessions & Protected Bookings (Part 6)
- **Passwordless Verification:** Sign in with email address or 10-digit Indian mobile number.
- **Cryptographic OTP Flow:** Time-limited 6-digit OTP verification with brute-force rate-limiting and session token generation (`Bearer ptx_sess_...`).
- **Development OTP Helper:** In local test environments, auto-displays test OTP code in the UI for instant testing.
- **Protected User Account:** Authenticated endpoint (`/api/auth/my-bookings`) retrieves user-specific passes and strictly rejects unauthenticated access.

### 5. Safe Checkout & Bank Card Offers Engine (Parts 7 & 8)
- **Itemized Checkout:** Clear breakdown of ticket subtotal, convenience fee (₹30/seat incl. 18% GST), bank discount, and final payable amount in INR.
- **Bank Card Offer Engine:** Backend-calculated discounts for HDFC Bank (20% off up to ₹250), ICICI Bank (Buy 1 Get 1 up to ₹300), RuPay Platinum (Flat ₹150 off), and UPI Instant Discount (Flat ₹50). Client discounts are never trusted.
- **Simulated Payment Gateway:** Supports UPI (VPA input), Debit Card, and Credit Card in demonstration mode without collecting raw card CVV or banking PINs.

### 6. Indian Rupee (INR, ₹) Consistency (Part 9)
- All monetary values formatted via JavaScript `Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' })`.
- Stored as integer rupees to eliminate floating-point rounding errors.

### 7. Release-Window Booking & Peak Demand Lab (Phase 5A)
- **Release Window Countdown (`sale_start`):** Scheduled ticket releases display a live countdown timer (`<ReleaseCountdown />`) disabling bookings until opening time.
- **In-Memory TTL Caching:** `ETag` and `X-Cache: HIT/MISS` headers with automatic cache invalidation on transactions.
- **5-Minute Seat Holds:** Temporary seat reservations during checkout with background expiration cleanup and ACID non-oversell invariants.
- **Peak Demand Lab (`/peak-demand-lab`):** Footer-accessible academic demo page featuring a live traffic simulator, P95 latency tracking, cache hit monitor, and simulated cloud autoscaler model.
- **Architecture Documentation:** Detailed analysis in [`ARCHITECTURE.md`](file:///c:/Users/Vijay/PeakTix/ARCHITECTURE.md) covering the 10,000 baseline vs 200,000 Tatkal surge cloud strategy.

---

## Quick Start & Commands

### Prerequisites
- Node.js v20+ or v24+
- npm v10+

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Automated Tests
Executes 34 automated unit, concurrency, authentication, queue, and peak demand tests against an isolated in-memory database:
```bash
npm test
```

### 3. Start the Backend API Server
Starts the Express server on port `3001` and initializes `data/peaktix.db` with seeded events, theatres, and movies:
```bash
npm run server
```
- API Base URL: `http://localhost:3001/api`
- Health check: `http://localhost:3001/api/health`

### 4. Start the Frontend Development Server
In a separate terminal window:
```bash
npm run dev
```
Open `http://localhost:5173` in your browser.

### 5. Multi-Instance Cluster & Load Balancer (Academic Demonstration)
```bash
# Starts 3 API worker instances (:3001, :3002, :3003) and a reverse proxy on :3000
npm run cluster

# Run traffic simulator:
node scripts/trafficSimulator.js --scenario normal --target http://127.0.0.1:3001
```

### 6. Run Code Quality Checks
```bash
# Linter (oxlint)
npm run lint

# Production Frontend Build (Vite)
npm run build
```

---

## Project Structure

```
PeakTix/
├── server/
│   ├── app.js               # Express 5 application & route mounting
│   ├── server.js            # Standalone API server entry point (:3001)
│   ├── loadBalancer.js      # Round-robin reverse proxy load balancer (:3000)
│   ├── admissionQueue.js    # Virtual waiting room queue state machine
│   ├── data/
│   │   ├── theatresData.js  # 54 authentic Indian theatre records across 10 cities
│   │   ├── moviesData.js    # Indian blockbuster movies catalog & showtime slots
│   │   ├── experiencesData.js # Comedy, theme parks, sports, adventure catalog
│   │   └── offersData.js    # Bank promotions & backend discount calculation engine
│   ├── db/
│   │   ├── database.js      # SQLite schema, migrations, and ACID transactions
│   │   └── seedData.js      # 12 Indian entertainment concert events
│   ├── routes/
│   │   ├── movies.js        # GET /api/movies, GET /api/movies/:id
│   │   ├── theatres.js      # GET /api/theatres, GET /api/theatres/:id
│   │   ├── experiences.js   # GET /api/experiences, GET /api/experiences/:id
│   │   ├── offers.js        # GET /api/offers, POST /api/offers/validate
│   │   ├── auth.js          # POST /api/auth/otp/*, GET /api/auth/me, my-bookings
│   │   ├── movieBookings.js # POST /api/movie-bookings, cancel routes
│   │   ├── events.js        # GET /api/events, GET /api/events/:id
│   │   ├── bookings.js      # Live concert booking routes
│   │   └── queue.js         # Virtual waiting room queue routes
├── src/
│   ├── components/
│   │   ├── Navbar.jsx       # Dark cinematic navigation with city selector & auth
│   │   ├── Hero.jsx         # Entertainment carousel with featured movies & CTAs
│   │   ├── MoviesRail.jsx   # Trending Indian cinema cards with 4:5 posters
│   │   ├── MovieDetail.jsx  # Movie synopsis, cast, and theatre showtimes
│   │   ├── SeatLayout.jsx   # Interactive seat map (Standard vs Recliner)
│   │   ├── CheckoutModal.jsx# Itemized checkout, coupon codes, UPI/Card payment
│   │   ├── MovieConfirmation.jsx # Boarding-pass confirmation ticket in ₹
│   │   ├── TheatresExplorer.jsx # 50+ Indian theatres catalogue with filters
│   │   ├── ExperiencesSection.jsx # Curated activities (comedy, parks, sports)
│   │   ├── OffersSection.jsx # Bank card offers & promo codes
│   │   ├── AuthModal.jsx    # Email/Phone OTP verification modal
│   │   ├── EventCard.jsx    # Concert event card with availability badge
│   │   ├── EventDetail.jsx  # Concert details & BookingForm
│   │   ├── MyBookings.jsx   # Tabbed view for movie passes & concert tickets
│   │   ├── CloudDemo.jsx    # Academic scalability & virtual queue dashboard
│   │   └── Footer.jsx       # Multi-column footer with categories & disclaimer
│   ├── services/
│   │   └── api.js           # Frontend client for all REST endpoints
│   ├── utils/
│   │   └── formatters.js    # Indian Rupee (₹) formatting helpers
│   ├── App.jsx              # Main React application & routing
│   ├── App.css              # Responsive layout styles
│   └── index.css            # Cinematic theme tokens & 'Syne' + 'DM Sans' typography
├── test/
│   ├── backend.test.js      # 12 automated unit, concurrency, & queue tests
│   └── phase5.test.js       # 6 Phase 5 tests (theatres, movies, offers, auth, seats)
└── package.json
```

---

## Demonstration Scope & Limitations

1. **Demonstration Data:**
   - All concert tour dates, cinema showtimes, ticket seat matrices, and promotional bank discounts are simulated demo records created strictly for product evaluation.
2. **Safe Payment Architecture:**
   - Checkout simulates instant UPI and card authorization without real monetary transactions. PeakTix does not store sensitive card numbers, CVVs, UPI PINs, or banking passwords.
3. **Development OTP:**
   - In environments without an integrated SMS/Email gateway (e.g. Twilio/SendGrid), generated verification codes are logged to the console and displayed via the developer hint helper in `AuthModal`.
4. **Local Database Scope:**
   - SQLite provides ACID transaction isolation on a single node. High-concurrency enterprise deployments with hundreds of thousands of users require managed relational databases (AWS RDS Aurora PostgreSQL) and distributed caching (Redis).
