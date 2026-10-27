import { useState, useEffect, useCallback } from 'react';
import { createBooking as apiCreateBooking, getBookings as apiGetBookings, cancelBooking as apiCancelBooking } from '../services/api.js';

const STORAGE_KEY = 'peaktix_bookings';

function loadCachedBookings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCachedBookings(bookings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bookings));
  } catch {
    // ignore
  }
}

/**
 * Custom hook for managing bookings backed by the Express/SQLite backend.
 * LocalStorage serves as an offline client cache, while the backend is authoritative.
 *
 * @param {Function} [onInventoryChange] - Callback invoked when inventory changes on server
 */
export function useBookings(onInventoryChange) {
  const [bookings, setBookings] = useState(loadCachedBookings);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Sync bookings from backend API on mount
  useEffect(() => {
    let ignore = false;
    apiGetBookings()
      .then((serverBookings) => {
        if (!ignore && Array.isArray(serverBookings)) {
          setBookings(serverBookings);
          saveCachedBookings(serverBookings);
        }
      })
      .catch((err) => {
        console.warn('Could not load bookings from backend, using cached state:', err.message);
      });
    return () => {
      ignore = true;
    };
  }, []);

  const refreshBookings = useCallback(async () => {
    setIsLoading(true);
    try {
      const serverBookings = await apiGetBookings();
      if (Array.isArray(serverBookings)) {
        setBookings(serverBookings);
        saveCachedBookings(serverBookings);
      }
      setError(null);
    } catch (err) {
      console.warn('Could not load bookings from backend, using cached state:', err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /** Count tickets currently booked for an event */
  const getBookedCount = useCallback(
    (eventId) =>
      bookings
        .filter((b) => b.eventId === eventId && b.status !== 'CANCELLED')
        .reduce((sum, b) => sum + b.quantity, 0),
    [bookings]
  );

  /**
   * Create a new booking via the backend API.
   * Total is verified and computed on the server.
   */
  const addBooking = useCallback(
    async ({ event, quantity, name, email }) => {
      try {
        const result = await apiCreateBooking({
          eventId: event.id,
          quantity,
          name,
          email,
        });

        if (!result.success) {
          return { success: false, error: result.error };
        }

        const newBooking = result.booking;
        setBookings((prev) => {
          const updated = [newBooking, ...prev.filter((b) => b.id !== newBooking.id)];
          saveCachedBookings(updated);
          return updated;
        });

        if (onInventoryChange) {
          onInventoryChange();
        }

        return { success: true, booking: newBooking };
      } catch (err) {
        return { success: false, error: err.message || 'Network request failed.' };
      }
    },
    [onInventoryChange]
  );

  /**
   * Cancel a booking on the backend API.
   * Restores inventory in SQLite and updates status.
   */
  const cancelBooking = useCallback(
    async (bookingId) => {
      try {
        const result = await apiCancelBooking(bookingId);
        if (!result.success) {
          return { success: false, error: result.error };
        }

        setBookings((prev) => {
          const updated = prev.map((b) =>
            b.id === bookingId || b.ref === bookingId
              ? { ...b, status: 'CANCELLED', cancelledAt: new Date().toISOString() }
              : b
          );
          saveCachedBookings(updated);
          return updated;
        });

        if (onInventoryChange) {
          onInventoryChange();
        }

        return { success: true, message: result.message };
      } catch (err) {
        return { success: false, error: err.message || 'Failed to cancel booking.' };
      }
    },
    [onInventoryChange]
  );

  return {
    bookings,
    isLoading,
    error,
    addBooking,
    cancelBooking,
    refreshBookings,
    getBookedCount,
  };
}
