import crypto from 'node:crypto';

/**
 * In-Memory Virtual Waiting Room & Admission Control Prototype.
 *
 * Simulates an enterprise traffic regulator used by large ticketing platforms
 * during high-demand surges (e.g., 200,000 concurrent ticket seekers).
 *
 * Crucial Safety Invariant:
 * The admission queue regulates ingress rate to prevent server exhaustion,
 * but it NEVER bypasses database ACID transactions or inventory validation.
 */
class AdmissionQueue {
  constructor() {
    this.waitingQueue = []; // array of { ticket, eventId, email, joinedAt }
    this.admittedTokens = new Map(); // token -> { ticket, eventId, email, admittedAt, expiresAt }
    this.admissionTtlMs = 5 * 60 * 1000; // 5 minutes to complete booking
    this.totalProcessed = 0;
  }

  /**
   * Enqueue a user waiting to book a high-demand event.
   * @param {number} eventId
   * @param {string} email
   */
  join(eventId, email) {
    const ticket = `QTX-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
    const entry = {
      ticket,
      eventId: Number(eventId),
      email: email ? email.trim().toLowerCase() : '',
      joinedAt: Date.now(),
    };

    this.waitingQueue.push(entry);

    const position = this.waitingQueue.length;
    const estimatedWaitSeconds = Math.max(2, Math.ceil(position * 1.5));

    return {
      ticket,
      position,
      status: 'WAITING',
      estimatedWaitSeconds,
      joinedAt: new Date(entry.joinedAt).toISOString(),
    };
  }

  /**
   * Check queue status for a given ticket.
   * @param {string} ticket
   */
  getStatus(ticket) {
    if (!ticket || typeof ticket !== 'string') {
      return { status: 'INVALID', error: 'Ticket is required.' };
    }

    const cleanTicket = ticket.trim();

    // Check if already admitted
    for (const [token, data] of this.admittedTokens.entries()) {
      if (data.ticket === cleanTicket) {
        if (Date.now() > data.expiresAt) {
          this.admittedTokens.delete(token);
          return { status: 'EXPIRED', error: 'Admission pass has expired. Please rejoin the queue.' };
        }
        return {
          status: 'ADMITTED',
          ticket: cleanTicket,
          admittedToken: token,
          expiresInSeconds: Math.max(0, Math.round((data.expiresAt - Date.now()) / 1000)),
        };
      }
    }

    // Check position in waiting line
    const index = this.waitingQueue.findIndex((entry) => entry.ticket === cleanTicket);
    if (index === -1) {
      return { status: 'NOT_FOUND', error: 'Queue ticket was not found or has expired.' };
    }

    const position = index + 1;
    const estimatedWaitSeconds = Math.max(1, Math.ceil(position * 1.5));

    return {
      status: 'WAITING',
      ticket: cleanTicket,
      position,
      totalWaiting: this.waitingQueue.length,
      estimatedWaitSeconds,
    };
  }

  /**
   * Admit a batch of users from the front of the queue into the booking window.
   * @param {number} [batchSize=10]
   */
  admitBatch(batchSize = 10) {
    const admitted = [];
    const count = Math.min(batchSize, this.waitingQueue.length);

    for (let i = 0; i < count; i++) {
      const entry = this.waitingQueue.shift();
      if (!entry) break;

      const token = `ADM-${crypto.randomBytes(8).toString('hex').toUpperCase()}`;
      const expiresAt = Date.now() + this.admissionTtlMs;

      this.admittedTokens.set(token, {
        ticket: entry.ticket,
        eventId: entry.eventId,
        email: entry.email,
        admittedAt: Date.now(),
        expiresAt,
      });

      this.totalProcessed++;
      admitted.push({
        ticket: entry.ticket,
        token,
        eventId: entry.eventId,
        expiresAt: new Date(expiresAt).toISOString(),
      });
    }

    return {
      admittedCount: admitted.length,
      remainingInQueue: this.waitingQueue.length,
      admissions: admitted,
    };
  }

  /**
   * Validates and consumes an admission token when a booking is finalized.
   * @param {string} token
   * @param {number} eventId
   */
  validateAndConsume(token, eventId) {
    if (!token) return { valid: false, error: 'Admission token is required.' };

    const data = this.admittedTokens.get(token);
    if (!data) {
      return { valid: false, error: 'Invalid or expired admission token.' };
    }

    if (Date.now() > data.expiresAt) {
      this.admittedTokens.delete(token);
      return { valid: false, error: 'Admission token has expired.' };
    }

    if (eventId && data.eventId !== Number(eventId)) {
      return { valid: false, error: 'Admission token was issued for a different event.' };
    }

    // Token is valid; consume it to prevent token reuse
    this.admittedTokens.delete(token);
    return { valid: true };
  }

  /**
   * Get queue health and traffic metrics.
   */
  getMetrics() {
    return {
      waitingCount: this.waitingQueue.length,
      admittedActiveCount: this.admittedTokens.size,
      totalProcessed: this.totalProcessed,
      admissionTtlMinutes: this.admissionTtlMs / 60000,
    };
  }

  /**
   * Reset the queue (primarily for automated testing).
   */
  reset() {
    this.waitingQueue = [];
    this.admittedTokens.clear();
    this.totalProcessed = 0;
  }
}

export const admissionQueue = new AdmissionQueue();
