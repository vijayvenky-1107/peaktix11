import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { seedEvents } from './seedData.js';
import { theatresData } from '../data/theatresData.js';
import { moviesData } from '../data/moviesData.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let db = null;

/**
 * Initializes the SQLite database, creates tables, and seeds initial events.
 * @param {string} [customPath] - Optional path or ':memory:'
 * @returns {DatabaseSync}
 */
export function initDb(customPath) {
  if (db && !customPath) {
    return db;
  }

  const dbPath = customPath || process.env.DB_PATH || path.join(__dirname, '../../data/peaktix.db');

  if (dbPath !== ':memory:') {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  db = new DatabaseSync(dbPath);

  // Enable foreign keys and WAL journal mode for concurrency & integrity
  db.exec('PRAGMA foreign_keys = ON;');
  if (dbPath !== ':memory:') {
    db.exec('PRAGMA journal_mode = WAL;');
  }

  createSchema(db);
  seedDatabase(db);

  return db;
}

/**
 * Returns the active database instance. Initializes default DB if not yet open.
 * @returns {DatabaseSync}
 */
export function getDb() {
  if (!db) {
    return initDb();
  }
  return db;
}

/**
 * Closes the active database connection.
 */
export function closeDb() {
  if (db) {
    try {
      db.close();
    } catch {
      // Ignore if already closed
    }
    db = null;
  }
}

/**
 * Creates schema with data integrity constraints.
 * @param {DatabaseSync} dbInstance
 */
function createSchema(dbInstance) {
  dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      language TEXT NOT NULL DEFAULT 'Hindi',
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      venue TEXT NOT NULL,
      city TEXT NOT NULL,
      price INTEGER NOT NULL CHECK (price >= 0),
      available INTEGER NOT NULL CHECK (available >= 0),
      image TEXT NOT NULL,
      description TEXT NOT NULL,
      featured INTEGER NOT NULL DEFAULT 0,
      sale_start TEXT
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id TEXT PRIMARY KEY,
      ref TEXT NOT NULL UNIQUE,
      eventId INTEGER NOT NULL,
      eventTitle TEXT NOT NULL,
      eventDate TEXT NOT NULL,
      eventTime TEXT NOT NULL,
      eventVenue TEXT NOT NULL,
      eventCity TEXT NOT NULL,
      category TEXT NOT NULL,
      priceEach INTEGER NOT NULL CHECK (priceEach >= 0),
      quantity INTEGER NOT NULL CHECK (quantity > 0),
      total INTEGER NOT NULL CHECK (total >= 0),
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'CONFIRMED' CHECK (status IN ('CONFIRMED', 'CANCELLED')),
      bookedAt TEXT NOT NULL,
      cancelledAt TEXT,
      FOREIGN KEY (eventId) REFERENCES events(id)
    );

    CREATE TABLE IF NOT EXISTS theatres (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      chain TEXT NOT NULL,
      city TEXT NOT NULL,
      area TEXT NOT NULL,
      address TEXT NOT NULL,
      screenFormats TEXT NOT NULL,
      facilities TEXT NOT NULL,
      screensCount INTEGER NOT NULL DEFAULT 1,
      isPremiumFormat INTEGER NOT NULL DEFAULT 0,
      demoStatus TEXT NOT NULL DEFAULT 'Verified Location'
    );

    CREATE TABLE IF NOT EXISTS movies (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      tagline TEXT,
      languages TEXT NOT NULL,
      genre TEXT NOT NULL,
      duration TEXT NOT NULL,
      certification TEXT NOT NULL DEFAULT 'U/A',
      rating REAL NOT NULL DEFAULT 8.5,
      votes TEXT NOT NULL DEFAULT '100K',
      director TEXT NOT NULL,
      cast TEXT NOT NULL,
      synopsis TEXT NOT NULL,
      poster TEXT NOT NULL,
      banner TEXT NOT NULL,
      formats TEXT NOT NULL,
      basePriceStandard INTEGER NOT NULL DEFAULT 250,
      basePricePremium INTEGER NOT NULL DEFAULT 450,
      featured INTEGER NOT NULL DEFAULT 0,
      trending INTEGER NOT NULL DEFAULT 0,
      demoStatus TEXT NOT NULL DEFAULT 'Demo Showcase'
    );

    CREATE TABLE IF NOT EXISTS movie_bookings (
      id TEXT PRIMARY KEY,
      ref TEXT NOT NULL UNIQUE,
      movieId TEXT NOT NULL,
      movieTitle TEXT NOT NULL,
      theatreId INTEGER NOT NULL,
      theatreName TEXT NOT NULL,
      city TEXT NOT NULL,
      screenFormat TEXT NOT NULL,
      showDate TEXT NOT NULL,
      showTime TEXT NOT NULL,
      tier TEXT NOT NULL CHECK (tier IN ('STANDARD', 'PREMIUM')),
      seats TEXT NOT NULL,
      quantity INTEGER NOT NULL CHECK (quantity > 0),
      subtotal INTEGER NOT NULL CHECK (subtotal >= 0),
      convenienceFee INTEGER NOT NULL DEFAULT 0,
      discount INTEGER NOT NULL DEFAULT 0,
      offerCode TEXT,
      total INTEGER NOT NULL CHECK (total >= 0),
      paymentMethod TEXT NOT NULL CHECK (paymentMethod IN ('UPI', 'DEBIT_CARD', 'CREDIT_CARD', 'DEMO_PAY')),
      paymentStatus TEXT NOT NULL DEFAULT 'DEMO_PAID',
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      userId TEXT,
      status TEXT NOT NULL DEFAULT 'CONFIRMED' CHECK (status IN ('CONFIRMED', 'CANCELLED')),
      bookedAt TEXT NOT NULL,
      cancelledAt TEXT
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      address TEXT,
      email TEXT UNIQUE,
      phone TEXT UNIQUE,
      password_hash TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      createdAt TEXT
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      expiresAt TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (userId) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS otps (
      target TEXT PRIMARY KEY,
      code TEXT NOT NULL,
      expiresAt INTEGER NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS seat_holds (
      id TEXT PRIMARY KEY,
      eventId INTEGER NOT NULL,
      quantity INTEGER NOT NULL CHECK (quantity > 0),
      email TEXT NOT NULL,
      expiresAt INTEGER NOT NULL,
      FOREIGN KEY (eventId) REFERENCES events(id)
    );
    CREATE INDEX IF NOT EXISTS idx_holds_event ON seat_holds(eventId);
    CREATE INDEX IF NOT EXISTS idx_holds_expiry ON seat_holds(expiresAt);

    CREATE TABLE IF NOT EXISTS split_payments (
      id TEXT PRIMARY KEY,
      bookingRef TEXT NOT NULL,
      title TEXT NOT NULL,
      totalAmount INTEGER NOT NULL CHECK (totalAmount >= 0),
      splitCount INTEGER NOT NULL CHECK (splitCount >= 2),
      amountPerPerson INTEGER NOT NULL CHECK (amountPerPerson >= 0),
      organizerName TEXT NOT NULL,
      organizerEmail TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'COMPLETED')),
      shares TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_splits_ref ON split_payments(bookingRef);

    CREATE INDEX IF NOT EXISTS idx_events_category ON events(category);
    CREATE INDEX IF NOT EXISTS idx_bookings_eventId ON bookings(eventId);
    CREATE INDEX IF NOT EXISTS idx_bookings_ref ON bookings(ref);
    CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
    CREATE INDEX IF NOT EXISTS idx_theatres_city ON theatres(city);
    CREATE INDEX IF NOT EXISTS idx_movie_bookings_ref ON movie_bookings(ref);
    CREATE INDEX IF NOT EXISTS idx_movie_bookings_user ON movie_bookings(userId);
  `);

  // Migration: Ensure 'language' column exists if upgrading from an older DB schema
  const cols = dbInstance.prepare("PRAGMA table_info(events)").all().map((c) => c.name);
  if (!cols.includes('language')) {
    try {
      dbInstance.exec("ALTER TABLE events ADD COLUMN language TEXT NOT NULL DEFAULT 'Hindi';");
    } catch {
      // Column may have been added in a concurrent execution
    }
  }

  // Migration: Ensure 'sale_start' column exists
  if (!cols.includes('sale_start')) {
    try {
      dbInstance.exec("ALTER TABLE events ADD COLUMN sale_start TEXT;");
    } catch {
      // Column may have been added in a concurrent execution
    }
  }

  // Migration: Ensure 'address', 'password_hash', 'created_at' exist in users table
  const userCols = dbInstance.prepare("PRAGMA table_info(users)").all().map((c) => c.name);
  if (!userCols.includes('address')) {
    try {
      dbInstance.exec("ALTER TABLE users ADD COLUMN address TEXT;");
    } catch {
      // Column may have been added in a concurrent execution
    }
  }
  if (!userCols.includes('password_hash')) {
    try {
      dbInstance.exec("ALTER TABLE users ADD COLUMN password_hash TEXT;");
    } catch {
      // Column may have been added in a concurrent execution
    }
  }
  if (!userCols.includes('created_at')) {
    try {
      dbInstance.exec("ALTER TABLE users ADD COLUMN created_at TEXT;");
    } catch {
      // Column may have been added in a concurrent execution
    }
  }
}

/**
 * Seeds sample Indian entertainment events.
 * Safely updates event metadata and INR pricing while preserving existing booking records.
 * @param {DatabaseSync} dbInstance
 */
export function seedDatabase(dbInstance) {
  const row = dbInstance.prepare('SELECT COUNT(*) as count FROM events').get();
  const hasOldData = dbInstance.prepare("SELECT id FROM events WHERE title LIKE '%Midnight Echoes%'").get();

  if (!row || row.count === 0 || hasOldData) {
    dbInstance.exec('BEGIN IMMEDIATE');
    try {
      const upsertStmt = dbInstance.prepare(`
        INSERT INTO events (
          id, title, category, language, date, time, venue, city, price, available, image, description, featured, sale_start
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          title = excluded.title,
          category = excluded.category,
          language = excluded.language,
          date = excluded.date,
          time = excluded.time,
          venue = excluded.venue,
          city = excluded.city,
          price = excluded.price,
          image = excluded.image,
          description = excluded.description,
          featured = excluded.featured,
          sale_start = excluded.sale_start
      `);

      for (const ev of seedEvents) {
        // Query active confirmed bookings to calculate preserved available stock
        const booked = dbInstance.prepare(
          "SELECT COALESCE(SUM(quantity), 0) as qty FROM bookings WHERE eventId = ? AND status = 'CONFIRMED'"
        ).get(ev.id);
        const bookedQty = booked?.qty || 0;
        const netAvailable = Math.max(0, ev.available - bookedQty);

        const saleStart = (ev.id === 2 || ev.id === 11)
          ? new Date(Date.now() + 15 * 60 * 1000).toISOString()
          : null;

        upsertStmt.run(
          ev.id,
          ev.title,
          ev.category,
          ev.language || 'Hindi',
          ev.date,
          ev.time,
          ev.venue,
          ev.city,
          ev.price,
          netAvailable,
          ev.image,
          ev.description,
          ev.featured ? 1 : 0,
          saleStart
        );
      }
      dbInstance.exec('COMMIT');
    } catch (err) {
      dbInstance.exec('ROLLBACK');
      throw err;
    }
  }

  // Ensure demo events 2 and 11 have a future sale_start if not yet set
  try {
    const ev2 = dbInstance.prepare('SELECT sale_start FROM events WHERE id = 2').get();
    if (ev2 && !ev2.sale_start) {
      const futureSale = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      dbInstance.prepare('UPDATE events SET sale_start = ? WHERE id IN (2, 11)').run(futureSale);
    }
  } catch {
    // Ignore if table or rows not yet present
  }

  // Seed / Upsert 50+ Theatres
  const theatreCountRow = dbInstance.prepare('SELECT COUNT(*) as count FROM theatres').get();
  if (!theatreCountRow || theatreCountRow.count < theatresData.length) {
    dbInstance.exec('BEGIN IMMEDIATE');
    try {
      const theatreStmt = dbInstance.prepare(`
        INSERT INTO theatres (
          id, name, chain, city, area, address, screenFormats, facilities, screensCount, isPremiumFormat, demoStatus
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          name = excluded.name,
          chain = excluded.chain,
          city = excluded.city,
          area = excluded.area,
          address = excluded.address,
          screenFormats = excluded.screenFormats,
          facilities = excluded.facilities,
          screensCount = excluded.screensCount,
          isPremiumFormat = excluded.isPremiumFormat,
          demoStatus = excluded.demoStatus
      `);

      for (const th of theatresData) {
        theatreStmt.run(
          th.id,
          th.name,
          th.chain,
          th.city,
          th.area,
          th.address,
          JSON.stringify(th.screenFormats || []),
          JSON.stringify(th.facilities || []),
          th.screensCount || 1,
          th.isPremiumFormat ? 1 : 0,
          th.demoStatus || 'Verified Location'
        );
      }
      dbInstance.exec('COMMIT');
    } catch (err) {
      dbInstance.exec('ROLLBACK');
      throw err;
    }
  }

  // Seed / Upsert Movies
  const movieCountRow = dbInstance.prepare('SELECT COUNT(*) as count FROM movies').get();
  if (!movieCountRow || movieCountRow.count < moviesData.length) {
    dbInstance.exec('BEGIN IMMEDIATE');
    try {
      const movieStmt = dbInstance.prepare(`
        INSERT INTO movies (
          id, title, tagline, languages, genre, duration, certification, rating, votes,
          director, cast, synopsis, poster, banner, formats, basePriceStandard,
          basePricePremium, featured, trending, demoStatus
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          title = excluded.title,
          tagline = excluded.tagline,
          languages = excluded.languages,
          genre = excluded.genre,
          duration = excluded.duration,
          certification = excluded.certification,
          rating = excluded.rating,
          votes = excluded.votes,
          director = excluded.director,
          cast = excluded.cast,
          synopsis = excluded.synopsis,
          poster = excluded.poster,
          banner = excluded.banner,
          formats = excluded.formats,
          basePriceStandard = excluded.basePriceStandard,
          basePricePremium = excluded.basePricePremium,
          featured = excluded.featured,
          trending = excluded.trending,
          demoStatus = excluded.demoStatus
      `);

      for (const m of moviesData) {
        movieStmt.run(
          m.id,
          m.title,
          m.tagline || '',
          JSON.stringify(m.languages || []),
          JSON.stringify(m.genre || []),
          m.duration,
          m.certification || 'U/A',
          m.rating || 8.5,
          m.votes || '100K',
          m.director,
          JSON.stringify(m.cast || []),
          m.synopsis,
          m.poster,
          m.banner,
          JSON.stringify(m.formats || []),
          m.basePriceStandard || 250,
          m.basePricePremium || 450,
          m.featured ? 1 : 0,
          m.trending ? 1 : 0,
          m.demoStatus || 'Demo Showcase'
        );
      }
      dbInstance.exec('COMMIT');
    } catch (err) {
      dbInstance.exec('ROLLBACK');
      throw err;
    }
  }
}
