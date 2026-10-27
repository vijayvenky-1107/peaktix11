import React, { useState, useEffect } from 'react';
import { API_BASE } from '../services/api.js';

export default function CloudDemo({ onBackToEvents }) {
  const [instanceData, setInstanceData] = useState(null);
  const [queueState, setQueueState] = useState(null); // { ticket, position, status, token }
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  // Poll instance info on mount
  useEffect(() => {
    let ignore = false;
    fetch(`${API_BASE}/instance`)
      .then((res) => res.json())
      .then((data) => {
        if (!ignore && data.success) {
          setInstanceData(data);
        }
      })
      .catch((err) => {
        console.warn('Instance query failed:', err.message);
      });

    return () => {
      ignore = true;
    };
  }, []);

  // Poll queue status if user holds a waiting ticket
  useEffect(() => {
    if (!queueState || queueState.status !== 'WAITING') return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/queue/status?ticket=${queueState.ticket}`);
        const data = await res.json();
        if (data.success) {
          setQueueState((prev) => ({
            ...prev,
            status: data.status,
            position: data.position,
            token: data.admittedToken,
          }));
        }
      } catch {
        // ignore polling errors
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [queueState]);

  const handleJoinQueue = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`${API_BASE}/queue/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId: 1, email: 'clouduser@peaktix.local' }),
      });
      const data = await res.json();
      if (data.success) {
        setQueueState({
          ticket: data.ticket,
          position: data.position,
          status: data.status,
        });
        setMessage({ type: 'success', text: `Joined virtual waiting room. Ticket: ${data.ticket}` });
      } else {
        setMessage({ type: 'error', text: data.error });
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleAdmitBatch = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/queue/admit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchSize: 5 }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({
          type: 'success',
          text: `Admitted ${data.admittedCount} user(s) into purchase window. Remaining waiting: ${data.remainingInQueue}`,
        });
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <button
          type="button"
          onClick={onBackToEvents}
          style={styles.backBtn}
        >
          ← Back to Events
        </button>
        <h1 style={styles.title}>Cloud Scalability & Traffic Regulation Demo</h1>
        <p style={styles.subtitle}>
          Educational demonstration of PeakTix's high-demand ticketing architecture designed for a normal baseline of 10,000 users and surge peaks of 200,000 ticket seekers.
        </p>
      </div>

      {message && (
        <div style={{ ...styles.alert, ...(message.type === 'error' ? styles.alertError : styles.alertSuccess) }}>
          {message.text}
        </div>
      )}

      {/* Target Specifications Grid */}
      <div style={styles.specGrid}>
        <div style={styles.specCard}>
          <span style={styles.specLabel}>NORMAL TRAFFIC TARGET</span>
          <span style={styles.specValue}>10,000 Users</span>
          <span style={styles.specDesc}>Smooth browsing, catalog discovery, low latency querying</span>
        </div>
        <div style={styles.specCard}>
          <span style={styles.specLabel}>PEAK RUSH SURGE TARGET</span>
          <span style={styles.specValue}>200,000 Users</span>
          <span style={styles.specDesc}>High-demand stadium ticket drops, virtual waiting line regulation</span>
        </div>
        <div style={styles.specCard}>
          <span style={styles.specLabel}>INVENTORY INTEGRITY INVARIANT</span>
          <span style={styles.specValue}>Zero Oversell</span>
          <span style={styles.specDesc}>Database-level CHECK constraint & ACID transactions</span>
        </div>
      </div>

      {/* Live Server Diagnostic Card */}
      <div style={styles.sectionCard}>
        <h2 style={styles.cardHeading}>Responding Backend Node Diagnostics</h2>
        <div style={styles.diagRow}>
          <div style={styles.diagItem}>
            <span style={styles.diagLabel}>Instance Identifier</span>
            <span style={styles.diagValue}>{instanceData?.instanceId || 'api-standalone'}</span>
          </div>
          <div style={styles.diagItem}>
            <span style={styles.diagLabel}>Listening Port</span>
            <span style={styles.diagValue}>:{instanceData?.port || 3001}</span>
          </div>
          <div style={styles.diagItem}>
            <span style={styles.diagLabel}>Process Uptime</span>
            <span style={styles.diagValue}>{instanceData?.uptimeSeconds || 0} seconds</span>
          </div>
          <div style={styles.diagItem}>
            <span style={styles.diagLabel}>Node Memory (RSS)</span>
            <span style={styles.diagValue}>{instanceData?.memoryMb?.rss || 0} MB</span>
          </div>
        </div>
      </div>

      {/* Interactive Admission Control Prototype */}
      <div style={styles.sectionCard}>
        <div style={styles.sectionHeaderRow}>
          <div>
            <h2 style={styles.cardHeading}>Virtual Waiting Room Prototype (Traffic Regulator)</h2>
            <p style={styles.cardSub}>
              During massive 200,000-user surges, direct database access is regulated via queue admission tokens.
            </p>
          </div>
          <div style={styles.buttonGroup}>
            <button
              type="button"
              style={styles.primaryBtn}
              onClick={handleJoinQueue}
              disabled={loading || (queueState && queueState.status === 'WAITING')}
            >
              Join Queue
            </button>
            <button
              type="button"
              style={styles.secondaryBtn}
              onClick={handleAdmitBatch}
              disabled={loading}
            >
              Admit Next Batch (Simulate Batch Release)
            </button>
          </div>
        </div>

        {queueState && (
          <div style={styles.queueStatusBox}>
            <div style={styles.queueStatusRow}>
              <div>
                <span style={styles.queueLabel}>Queue Ticket:</span>
                <span style={styles.queueTicket}>{queueState.ticket}</span>
              </div>
              <div>
                <span style={styles.queueLabel}>Current Status:</span>
                <span
                  style={{
                    ...styles.statusTag,
                    ...(queueState.status === 'ADMITTED' ? styles.statusAdmitted : styles.statusWaiting),
                  }}
                >
                  {queueState.status}
                </span>
              </div>
              {queueState.status === 'WAITING' && (
                <div>
                  <span style={styles.queueLabel}>Position in Line:</span>
                  <span style={styles.queuePos}>#{queueState.position}</span>
                </div>
              )}
              {queueState.token && (
                <div>
                  <span style={styles.queueLabel}>Admission Pass:</span>
                  <span style={styles.queueToken}>{queueState.token}</span>
                </div>
              )}
            </div>
            {queueState.status === 'ADMITTED' && (
              <p style={{ margin: '12px 0 0', color: '#34D399', fontSize: 14 }}>
                ✓ Admitted! You have been granted access to purchase. The server-side inventory check still safely prevents overselling.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Production Scalability Architecture & SQLite Limitations */}
      <div style={styles.sectionCard}>
        <h2 style={styles.cardHeading}>Production Cloud Architecture & Database Reality</h2>
        <div style={styles.notesGrid}>
          <div style={styles.noteItem}>
            <h4 style={styles.noteTitle}>Local Demo SQLite vs. Production</h4>
            <p style={styles.noteText}>
              SQLite utilizes single-writer process file locking. While excellent for local development and embedded tests, it cannot serve as a shared concurrent database across distributed cloud container clusters.
            </p>
          </div>
          <div style={styles.noteItem}>
            <h4 style={styles.noteTitle}>Target Production Stack</h4>
            <p style={styles.noteText}>
              For a 200,000 peak user target, production requires a managed relational database cluster (such as Amazon Aurora PostgreSQL or Cloud SQL) with connection pooling (PgBouncer), read replicas, and distributed Redis queue regulation.
            </p>
          </div>
          <div style={styles.noteItem}>
            <h4 style={styles.noteTitle}>Local Simulation Commands</h4>
            <p style={styles.noteText}>
              Test multi-instance load balancing locally with <code>npm run cluster</code> and benchmark throughput with <code>npm run simulate:traffic</code> or <code>npm run simulate:peak</code>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: 1040,
    margin: '110px auto 60px',
    padding: '0 24px',
    boxSizing: 'border-box',
    width: '100%',
  },
  header: {
    marginBottom: 28,
  },
  backBtn: {
    background: 'none',
    border: 'none',
    color: '#FB7185',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    padding: 0,
    marginBottom: 16,
  },
  title: {
    fontFamily: "'Outfit', sans-serif",
    fontSize: 34,
    fontWeight: 800,
    color: '#F8FAFC',
    margin: '0 0 10px',
    letterSpacing: '-0.02em',
  },
  subtitle: {
    fontSize: 15,
    color: '#94A3B8',
    lineHeight: 1.6,
    margin: 0,
    maxWidth: 820,
  },
  alert: {
    padding: '12px 18px',
    borderRadius: 12,
    fontSize: 14,
    marginBottom: 24,
  },
  alertSuccess: {
    background: 'rgba(16, 185, 129, 0.15)',
    border: '1px solid rgba(16, 185, 129, 0.3)',
    color: '#34D399',
  },
  alertError: {
    background: 'rgba(239, 68, 68, 0.15)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    color: '#FCA5A5',
  },
  specGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: 18,
    marginBottom: 24,
  },
  specCard: {
    background: '#0F172A',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: 18,
    padding: 24,
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  specLabel: {
    fontSize: 11,
    fontWeight: 700,
    color: '#F59E0B',
    letterSpacing: '0.08em',
  },
  specValue: {
    fontFamily: "'Outfit', sans-serif",
    fontSize: 28,
    fontWeight: 800,
    color: '#F8FAFC',
  },
  specDesc: {
    fontSize: 13,
    color: '#94A3B8',
    lineHeight: 1.5,
  },
  sectionCard: {
    background: '#0F172A',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: 20,
    padding: 28,
    marginBottom: 24,
  },
  cardHeading: {
    fontFamily: "'Outfit', sans-serif",
    fontSize: 20,
    fontWeight: 700,
    color: '#F8FAFC',
    margin: '0 0 6px',
  },
  cardSub: {
    fontSize: 14,
    color: '#94A3B8',
    margin: 0,
  },
  sectionHeaderRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 20,
  },
  buttonGroup: {
    display: 'flex',
    gap: 12,
    flexWrap: 'wrap',
  },
  primaryBtn: {
    padding: '10px 20px',
    background: 'linear-gradient(135deg, #E11D48 0%, #F43F5E 100%)',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  secondaryBtn: {
    padding: '10px 20px',
    background: '#131C31',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    color: '#F8FAFC',
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  diagRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: 16,
    marginTop: 16,
  },
  diagItem: {
    background: '#131C31',
    padding: 16,
    borderRadius: 12,
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  diagLabel: {
    fontSize: 11,
    fontWeight: 700,
    color: '#64748B',
    textTransform: 'uppercase',
  },
  diagValue: {
    fontFamily: "'Outfit', sans-serif",
    fontSize: 18,
    fontWeight: 700,
    color: '#38BDF8',
  },
  queueStatusBox: {
    background: '#131C31',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: 14,
    padding: 20,
    marginTop: 16,
  },
  queueStatusRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 24,
    flexWrap: 'wrap',
  },
  queueLabel: {
    display: 'block',
    fontSize: 11,
    fontWeight: 700,
    color: '#94A3B8',
    marginBottom: 2,
  },
  queueTicket: {
    fontFamily: "'Outfit', monospace",
    fontSize: 16,
    fontWeight: 800,
    color: '#F43F5E',
  },
  statusTag: {
    fontSize: 12,
    fontWeight: 700,
    padding: '3px 10px',
    borderRadius: 10,
    display: 'inline-block',
  },
  statusWaiting: {
    background: 'rgba(245, 158, 11, 0.15)',
    color: '#FBBF24',
  },
  statusAdmitted: {
    background: 'rgba(16, 185, 129, 0.15)',
    color: '#34D399',
  },
  queuePos: {
    fontFamily: "'Outfit', sans-serif",
    fontSize: 20,
    fontWeight: 800,
    color: '#F8FAFC',
  },
  queueToken: {
    fontFamily: "'Outfit', monospace",
    fontSize: 14,
    fontWeight: 700,
    color: '#38BDF8',
  },
  notesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: 20,
    marginTop: 18,
  },
  noteItem: {
    background: '#131C31',
    padding: 20,
    borderRadius: 14,
  },
  noteTitle: {
    fontSize: 15,
    fontWeight: 700,
    color: '#F8FAFC',
    margin: '0 0 8px',
  },
  noteText: {
    fontSize: 13,
    color: '#94A3B8',
    lineHeight: 1.6,
    margin: 0,
  },
};
