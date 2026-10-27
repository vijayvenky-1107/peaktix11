import React, { useState, useRef, useEffect, useCallback } from 'react';
import { API_BASE, getApiUrl } from '../services/api.js';

export default function PeakDemandLab({ onBack }) {
  // Traffic Simulator State
  const [targetUrl, setTargetUrl] = useState('/api/events');
  const [concurrency, setConcurrency] = useState(5);
  const [totalRequests, setTotalRequests] = useState(25);
  const [isRunning, setIsRunning] = useState(false);
  const [stats, setStats] = useState({
    sent: 0,
    success: 0,
    errors: 0,
    latencies: [],
    cacheHits: 0,
    cacheMisses: 0,
    instanceCounts: {},
    p95: 0,
    avgLatency: 0,
  });

  const stopSignalRef = useRef(false);

  // Queue Live Metrics
  const [queueMetrics, setQueueMetrics] = useState(null);
  const [queueLoading, setQueueLoading] = useState(false);
  const [queueMsg, setQueueMsg] = useState(null);

  // Simulated Autoscaler State
  const [simRps, setSimRps] = useState(1500);
  const [simLatency, setSimLatency] = useState(120);
  const [simQueueBacklog, setSimQueueBacklog] = useState(400);

  const fetchQueueMetrics = useCallback(async () => {
    setQueueLoading(true);
    try {
      const res = await fetch(`${API_BASE}/queue/metrics`);
      const data = await res.json();
      if (data.success) {
        setQueueMetrics(data.metrics);
      }
    } catch (err) {
      console.warn('Queue metrics fetch failed:', err.message);
    } finally {
      setQueueLoading(false);
    }
  }, []);

  // Fetch initial queue metrics on mount
  useEffect(() => {
    let ignore = false;
    fetch(`${API_BASE}/queue/metrics`)
      .then((res) => res.json())
      .then((data) => {
        if (!ignore && data.success) {
          setQueueMetrics(data.metrics);
        }
      })
      .catch((err) => {
        console.warn('Queue metrics fetch failed:', err.message);
      });

    return () => {
      ignore = true;
    };
  }, []);

  const handleSimulateAdmit = async () => {
    setQueueLoading(true);
    try {
      const res = await fetch(`${API_BASE}/queue/admit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchSize: 5 }),
      });
      const data = await res.json();
      if (data.success) {
        setQueueMsg(`Admitted ${data.admittedCount} user(s). Remaining in waiting line: ${data.remainingInQueue}`);
        fetchQueueMetrics();
      }
    } catch (err) {
      setQueueMsg(`Admission failed: ${err.message}`);
    } finally {
      setQueueLoading(false);
    }
  };

  // Run traffic simulator
  const startSimulator = async () => {
    setIsRunning(true);
    stopSignalRef.current = false;

    // Reset stats
    setStats({
      sent: 0,
      success: 0,
      errors: 0,
      latencies: [],
      cacheHits: 0,
      cacheMisses: 0,
      instanceCounts: {},
      p95: 0,
      avgLatency: 0,
    });

    let sentCount = 0;
    let successCount = 0;
    let errorCount = 0;
    const latencies = [];
    let hits = 0;
    let misses = 0;
    const instanceMap = {};

    const updateState = () => {
      latencies.sort((a, b) => a - b);
      const avg = latencies.length > 0
        ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
        : 0;
      const p95Idx = Math.floor(latencies.length * 0.95);
      const p95Val = latencies[p95Idx] || 0;

      setStats({
        sent: sentCount,
        success: successCount,
        errors: errorCount,
        latencies: [...latencies],
        cacheHits: hits,
        cacheMisses: misses,
        instanceCounts: { ...instanceMap },
        p95: p95Val,
        avgLatency: avg,
      });
    };

    let nextRequestId = 0;

    const worker = async () => {
      while (nextRequestId < totalRequests && !stopSignalRef.current) {
        nextRequestId++;
        const t0 = performance.now();
        try {
          const res = await fetch(getApiUrl(targetUrl));
          const t1 = performance.now();
          const latency = Math.round(t1 - t0);
          latencies.push(latency);
          sentCount++;

          if (res.ok) {
            successCount++;
          } else {
            errorCount++;
          }

          // Inspect X-Cache header
          const cacheHeader = res.headers.get('x-cache');
          if (cacheHeader === 'HIT') {
            hits++;
          } else if (cacheHeader === 'MISS') {
            misses++;
          }

          // Inspect X-Instance-Id header
          const inst = res.headers.get('x-instance-id') || 'api-primary';
          instanceMap[inst] = (instanceMap[inst] || 0) + 1;
        } catch {
          sentCount++;
          errorCount++;
        }

        updateState();
        // Yield momentarily to keep UI smooth
        await new Promise((r) => setTimeout(r, 10));
      }
    };

    const workers = [];
    const actualConcurrency = Math.min(concurrency, totalRequests);
    for (let i = 0; i < actualConcurrency; i++) {
      workers.push(worker());
    }

    await Promise.all(workers);
    updateState();
    setIsRunning(false);
  };

  const stopSimulator = () => {
    stopSignalRef.current = true;
    setIsRunning(false);
  };

  // Calculate simulated autoscaler recommendations
  const computeAutoscale = () => {
    // Normal baseline: 10,000 normal users -> ~2 nodes
    // Surge peak: 200,000 users -> up to 24 nodes
    let nodeCount = 2; // base
    let reason = 'Baseline normal traffic load';

    if (simRps > 5000 || simQueueBacklog > 2000 || simLatency > 500) {
      nodeCount = Math.min(24, Math.ceil(simRps / 400) + Math.ceil(simQueueBacklog / 250));
      reason = 'SURGE SCALE OUT: High concurrency & queue backlog detected';
    } else if (simRps > 2000 || simLatency > 250 || simQueueBacklog > 500) {
      nodeCount = Math.min(12, Math.max(4, Math.ceil(simRps / 500)));
      reason = 'MODERATE SCALE OUT: Response latency or queue above target threshold';
    } else if (simRps < 500 && simQueueBacklog < 100 && simLatency < 80) {
      nodeCount = 2;
      reason = 'SCALE IN COOLDOWN: Low idle utilization, minimum replica floor';
    }

    const hourlyCost = (nodeCount * 0.048).toFixed(2); // approximate AWS Fargate 2vCPU task

    return { nodeCount, reason, hourlyCost };
  };

  const scaleRec = computeAutoscale();

  const totalCacheRequests = stats.cacheHits + stats.cacheMisses;
  const hitRatio = totalCacheRequests > 0
    ? Math.round((stats.cacheHits / totalCacheRequests) * 100)
    : 0;

  return (
    <>
      <style>{`
        .ptx-lab-back:hover {
          color: #FFFFFF !important;
          transform: translateX(-3px);
        }
        .ptx-slider {
          accent-color: #F43F5E;
        }
      `}</style>

      <div style={styles.container}>
        {/* Navigation & Header */}
        <button
          type="button"
          className="ptx-lab-back"
          onClick={onBack}
          style={styles.backBtn}
        >
          ← Back to Homepage
        </button>

        <div style={styles.header}>
          <div style={styles.badgeRow}>
            <span style={styles.labBadge}>🔬 ACADEMIC SIMULATION — DESIGNING FOR PEAK DEMAND</span>
            <span style={styles.targetBadge}>Normal 10,000 Users • Surge 200,000 Users</span>
          </div>
          <h1 style={styles.title}>Peak Demand & Scalability Lab</h1>
          <p style={styles.subtitle}>
            Live demonstration of Tatkal-style surge engineering: virtual queue admission, in-memory TTL caching, seat holds, load balancing, and simulated elastic autoscaling.
          </p>
        </div>

        {/* Top 3 Metric Cards */}
        <div style={styles.specGrid}>
          <div style={styles.specCard}>
            <span style={styles.specLabel}>NORMAL USERS BASELINE</span>
            <span style={styles.specValue}>10,000</span>
            <span style={styles.specDesc}>Smooth browsing, catalog discovery, low-latency querying with in-memory caching.</span>
          </div>

          <div style={styles.specCard}>
            <span style={styles.specLabel}>PEAK RUSH SURGE (20X)</span>
            <span style={styles.specValue}>200,000</span>
            <span style={styles.specDesc}>Ticket release window surge regulated by virtual waiting room and small-batch admission.</span>
          </div>

          <div style={styles.specCard}>
            <span style={styles.specLabel}>SEAT-HOLD INVARIANT</span>
            <span style={styles.specValue}>5-Min Hold</span>
            <span style={styles.specDesc}>Checkout holds auto-expire, atomic ACID transactions guarantee zero oversell.</span>
          </div>
        </div>

        {/* PANEL 1: Traffic Simulator */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <div>
              <h2 style={styles.cardTitle}>1. Live Traffic & Cache Simulator</h2>
              <p style={styles.cardSub}>
                Send real HTTP requests to the local Node.js backend to observe response latencies, cache hit ratios, and instance routing.
              </p>
            </div>
            <div style={styles.actions}>
              {isRunning ? (
                <button
                  type="button"
                  style={styles.stopBtn}
                  onClick={stopSimulator}
                >
                  ⏹ Stop Simulator
                </button>
              ) : (
                <button
                  type="button"
                  style={styles.startBtn}
                  onClick={startSimulator}
                >
                  ▶ Run Simulator
                </button>
              )}
            </div>
          </div>

          {/* Controls */}
          <div style={styles.controlsRow}>
            <div style={styles.inputGroup}>
              <label style={styles.inputLabel}>TARGET ENDPOINT</label>
              <select
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                style={styles.selectInput}
                disabled={isRunning}
              >
                <option value="/api/events">/api/events (Catalog List — TTL 30s)</option>
                <option value="/api/events/1">/api/events/1 (Event Detail — TTL 60s)</option>
                <option value="/api/health">/api/health (Health check)</option>
                <option value="/api/instance">/api/instance (Diagnostics)</option>
              </select>
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.inputLabel}>CONCURRENCY ({concurrency})</label>
              <input
                type="range"
                className="ptx-slider"
                min="1"
                max="20"
                value={concurrency}
                onChange={(e) => setConcurrency(Number(e.target.value))}
                style={styles.rangeInput}
                disabled={isRunning}
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.inputLabel}>REQUEST COUNT ({totalRequests})</label>
              <input
                type="range"
                className="ptx-slider"
                min="5"
                max="100"
                step="5"
                value={totalRequests}
                onChange={(e) => setTotalRequests(Number(e.target.value))}
                style={styles.rangeInput}
                disabled={isRunning}
              />
            </div>
          </div>

          <div style={styles.simulatorNotice}>
            <span>⚠️</span>
            <span>Default is a lightweight smoke test (25 requests) to run safely in any environment without flooding the node.</span>
          </div>

          {/* Live Simulator Results */}
          <div style={styles.resultsGrid}>
            <div style={styles.metricItem}>
              <span style={styles.metricLabel}>REQUESTS SENT</span>
              <span style={styles.metricVal}>{stats.sent} / {totalRequests}</span>
            </div>

            <div style={styles.metricItem}>
              <span style={styles.metricLabel}>SUCCESS / ERRORS</span>
              <span style={{ ...styles.metricVal, color: stats.errors > 0 ? '#F43F5E' : '#10B981' }}>
                {stats.success} <span style={{ color: '#64748B' }}>/</span> {stats.errors}
              </span>
            </div>

            <div style={styles.metricItem}>
              <span style={styles.metricLabel}>AVERAGE LATENCY</span>
              <span style={{ ...styles.metricVal, color: '#38BDF8' }}>{stats.avgLatency} ms</span>
            </div>

            <div style={styles.metricItem}>
              <span style={styles.metricLabel}>P95 LATENCY</span>
              <span style={{ ...styles.metricVal, color: '#F59E0B' }}>{stats.p95} ms</span>
            </div>

            <div style={styles.metricItem}>
              <span style={styles.metricLabel}>CACHE HIT RATIO</span>
              <span style={{ ...styles.metricVal, color: hitRatio >= 70 ? '#10B981' : '#FBBF24' }}>
                {hitRatio}% ({stats.cacheHits} Hits / {stats.cacheMisses} Misses)
              </span>
            </div>
          </div>

          {/* Visual Breakdown Bars */}
          <div style={styles.barsContainer}>
            {/* Cache Bar */}
            <div style={styles.barBlock}>
              <div style={styles.barLabelRow}>
                <span style={styles.barTitle}>Cache Distribution (X-Cache Header)</span>
                <span style={styles.barSub}>{stats.cacheHits} Hits • {stats.cacheMisses} Misses</span>
              </div>
              <div style={styles.barTrack}>
                <div
                  style={{
                    ...styles.barFillHit,
                    width: `${hitRatio}%`,
                  }}
                />
              </div>
            </div>

            {/* Instance Routing Bar */}
            {Object.keys(stats.instanceCounts).length > 0 && (
              <div style={styles.barBlock}>
                <div style={styles.barLabelRow}>
                  <span style={styles.barTitle}>Instance Distribution (X-Instance-Id Header)</span>
                  <span style={styles.barSub}>
                    {Object.entries(stats.instanceCounts).map(([k, v]) => `${k}: ${v}`).join(' | ')}
                  </span>
                </div>
                <div style={styles.instancePillsRow}>
                  {Object.entries(stats.instanceCounts).map(([inst, count]) => (
                    <div key={inst} style={styles.instBadge}>
                      <span style={styles.instDot} />
                      <span style={styles.instName}>{inst}</span>
                      <span style={styles.instCount}>({count})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* PANEL 2: Virtual Queue & Batch Admission Controls */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <div>
              <h2 style={styles.cardTitle}>2. Virtual Waiting Room (Admission Control)</h2>
              <p style={styles.cardSub}>
                Ingress throttling prevents database connection starvation during ticket drops. Users poll status until admitted into a 5-minute purchase window.
              </p>
            </div>
            <div style={styles.actions}>
              <button
                type="button"
                style={styles.secondaryBtn}
                onClick={fetchQueueMetrics}
                disabled={queueLoading}
              >
                🔄 Refresh Queue
              </button>
              <button
                type="button"
                style={styles.primaryBtn}
                onClick={handleSimulateAdmit}
                disabled={queueLoading}
              >
                🎟️ Admit Batch (5 Users)
              </button>
            </div>
          </div>

          {queueMsg && (
            <div style={styles.queueAlert}>
              {queueMsg}
            </div>
          )}

          <div style={styles.queueMetricsGrid}>
            <div style={styles.queueCard}>
              <span style={styles.queueCardLabel}>CURRENTLY WAITING</span>
              <span style={styles.queueCardVal}>{queueMetrics?.waitingCount ?? 0}</span>
              <span style={styles.queueCardSub}>Users in virtual queue line</span>
            </div>

            <div style={styles.queueCard}>
              <span style={styles.queueCardLabel}>ACTIVE ADMITTED TOKENS</span>
              <span style={styles.queueCardVal}>{queueMetrics?.admittedActiveCount ?? 0}</span>
              <span style={styles.queueCardSub}>Users in 5-minute checkout window</span>
            </div>

            <div style={styles.queueCard}>
              <span style={styles.queueCardLabel}>TOTAL PROCESSED</span>
              <span style={styles.queueCardVal}>{queueMetrics?.totalProcessed ?? 0}</span>
              <span style={styles.queueCardSub}>Lifetime queue admissions</span>
            </div>

            <div style={styles.queueCard}>
              <span style={styles.queueCardLabel}>ADMISSION TOKEN TTL</span>
              <span style={styles.queueCardVal}>{queueMetrics?.admissionTtlMinutes ?? 5} min</span>
              <span style={styles.queueCardSub}>Window before pass expiry</span>
            </div>
          </div>
        </div>

        {/* PANEL 3: Simulated Elastic Autoscaler */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <div>
              <div style={styles.simBadge}>SIMULATED AUTOSCALER MODEL</div>
              <h2 style={styles.cardTitle}>3. Cloud Autoscaling Policy Simulator</h2>
              <p style={styles.cardSub}>
                Visualizes how an AWS Application Load Balancer and ECS Target Tracking policy scale compute instances up and down based on real-time Tatkal surge telemetry.
              </p>
            </div>
          </div>

          {/* Interactive Sliders */}
          <div style={styles.controlsRow}>
            <div style={styles.inputGroup}>
              <label style={styles.inputLabel}>
                INCOMING TRAFFIC SURGE: {simRps} REQ/SEC
              </label>
              <input
                type="range"
                className="ptx-slider"
                min="100"
                max="8000"
                step="100"
                value={simRps}
                onChange={(e) => setSimRps(Number(e.target.value))}
                style={styles.rangeInput}
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.inputLabel}>
                OBSERVED P95 LATENCY: {simLatency} MS
              </label>
              <input
                type="range"
                className="ptx-slider"
                min="30"
                max="1000"
                step="10"
                value={simLatency}
                onChange={(e) => setSimLatency(Number(e.target.value))}
                style={styles.rangeInput}
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.inputLabel}>
                QUEUE WAITING BACKLOG: {simQueueBacklog} USERS
              </label>
              <input
                type="range"
                className="ptx-slider"
                min="0"
                max="3000"
                step="50"
                value={simQueueBacklog}
                onChange={(e) => setSimQueueBacklog(Number(e.target.value))}
                style={styles.rangeInput}
              />
            </div>
          </div>

          {/* Scale Recommendation Box */}
          <div style={styles.autoscaleResult}>
            <div style={styles.scaleResultRow}>
              <div>
                <span style={styles.scaleLabel}>RECOMMENDED CLUSTER NODES</span>
                <span style={styles.scaleVal}>{scaleRec.nodeCount} Tasks / Containers</span>
              </div>
              <div>
                <span style={styles.scaleLabel}>POLICY STATUS</span>
                <span style={styles.scaleStatusTag}>{scaleRec.reason}</span>
              </div>
              <div>
                <span style={styles.scaleLabel}>ESTIMATED CLUSTER COST</span>
                <span style={styles.scaleCost}>${scaleRec.hourlyCost} / hour</span>
              </div>
            </div>

            <p style={styles.disclaimerNote}>
              📌 <strong>Architecture Note:</strong> In production, an ALB routes traffic across ECS Fargate tasks using a Target Tracking Scaling Policy pegged at <code>ALBRequestCountPerTarget = 1,000</code>. When the Tatkal sale window ends, cooldown timers scale down to 2 minimum replicas to conserve budget.
            </p>
          </div>
        </div>

        {/* PANEL 4: Bottleneck Analysis & SQLite Reality */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>4. Architectural Bottleneck Analysis & Cloud Strategy</h2>
          <div style={styles.analysisGrid}>
            <div style={styles.analysisItem}>
              <h4 style={styles.itemTitle}>1. Database Write Contention (ACID Locking)</h4>
              <p style={styles.itemText}>
                <strong>Bottleneck:</strong> At ticket release time, thousands of users compete for the same rows. In SQLite, transactions take a single process-level write lock.
                <br /><br />
                <strong>Target Solution:</strong> Distributed relational database (Amazon Aurora PostgreSQL) with row-level locks (<code>SELECT ... FOR UPDATE</code>), seat hold reservations, and PgBouncer connection pooling.
              </p>
            </div>

            <div style={styles.analysisItem}>
              <h4 style={styles.itemTitle}>2. Repeated Read Stampede (Thundering Herd)</h4>
              <p style={styles.itemText}>
                <strong>Bottleneck:</strong> 200,000 concurrent refreshes requesting <code>GET /api/events</code> will overwhelm database connections if hit directly.
                <br /><br />
                <strong>Target Solution:</strong> In-memory TTL caching with ETag validation + CloudFront Edge CDN caching with stale-while-revalidate. Automatically invalidated on booking.
              </p>
            </div>

            <div style={styles.analysisItem}>
              <h4 style={styles.itemTitle}>3. Ingress Flood (IRCTC Tatkal Pattern)</h4>
              <p style={styles.itemText}>
                <strong>Bottleneck:</strong> Sudden 20x traffic spikes exhaust server thread pools and socket descriptors.
                <br /><br />
                <strong>Target Solution:</strong> Virtual waiting room with cryptographic admission passes (Cloudflare Waiting Room or Redis queue). Admits users in smooth batches of 50–100/sec.
              </p>
            </div>

            <div style={styles.analysisItem}>
              <h4 style={styles.itemTitle}>4. Local Demo vs. Production Reality</h4>
              <p style={styles.itemText}>
                <strong>Disclaimer:</strong> This project uses local SQLite and in-memory data structures to demonstrate engineering concepts without paid cloud infrastructure. The 10,000 and 200,000 numbers are target scenario parameters, not capacity claims for a single local SQLite process.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

const styles = {
  container: {
    maxWidth: 1100,
    margin: '110px auto 60px',
    padding: '0 24px',
    boxSizing: 'border-box',
    width: '100%',
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
    transition: 'all 0.2s',
  },
  header: {
    marginBottom: 32,
  },
  badgeRow: {
    display: 'flex',
    gap: 10,
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  labBadge: {
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: '0.08em',
    color: '#F43F5E',
    background: 'rgba(244, 63, 94, 0.15)',
    border: '1px solid rgba(244, 63, 94, 0.35)',
    padding: '4px 12px',
    borderRadius: 20,
  },
  targetBadge: {
    fontSize: 11,
    fontWeight: 700,
    color: '#FBBF24',
    background: 'rgba(245, 158, 11, 0.12)',
    border: '1px solid rgba(245, 158, 11, 0.3)',
    padding: '4px 12px',
    borderRadius: 20,
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
    maxWidth: 880,
  },
  specGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: 18,
    marginBottom: 28,
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
  card: {
    background: '#0F172A',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: 20,
    padding: 28,
    marginBottom: 24,
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 20,
  },
  cardTitle: {
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
    maxWidth: 700,
    lineHeight: 1.5,
  },
  actions: {
    display: 'flex',
    gap: 10,
    flexWrap: 'wrap',
  },
  startBtn: {
    padding: '10px 22px',
    background: 'linear-gradient(135deg, #E11D48 0%, #F43F5E 100%)',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  stopBtn: {
    padding: '10px 22px',
    background: '#DC2626',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
  },
  primaryBtn: {
    padding: '9px 18px',
    background: 'linear-gradient(135deg, #E11D48 0%, #F43F5E 100%)',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: 10,
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
  },
  secondaryBtn: {
    padding: '9px 18px',
    background: '#131C31',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    color: '#F8FAFC',
    borderRadius: 10,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  },
  controlsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: 20,
    background: '#131C31',
    padding: 20,
    borderRadius: 14,
    marginBottom: 16,
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: 700,
    color: '#94A3B8',
    letterSpacing: '0.06em',
  },
  selectInput: {
    background: '#0F172A',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: 8,
    color: '#F8FAFC',
    padding: '8px 12px',
    fontSize: 13,
  },
  rangeInput: {
    width: '100%',
    cursor: 'pointer',
  },
  simulatorNotice: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 12,
    color: '#FBBF24',
    marginBottom: 20,
  },
  resultsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: 14,
    marginBottom: 20,
  },
  metricItem: {
    background: '#131C31',
    padding: 16,
    borderRadius: 12,
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: 700,
    color: '#64748B',
    letterSpacing: '0.06em',
  },
  metricVal: {
    fontFamily: "'Outfit', sans-serif",
    fontSize: 18,
    fontWeight: 800,
    color: '#F8FAFC',
  },
  barsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  barBlock: {
    background: '#131C31',
    padding: 16,
    borderRadius: 12,
  },
  barLabelRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 12,
    marginBottom: 8,
  },
  barTitle: {
    color: '#F8FAFC',
    fontWeight: 600,
  },
  barSub: {
    color: '#94A3B8',
  },
  barTrack: {
    height: 12,
    background: '#0F172A',
    borderRadius: 6,
    overflow: 'hidden',
  },
  barFillHit: {
    height: '100%',
    background: 'linear-gradient(90deg, #10B981 0%, #34D399 100%)',
    borderRadius: 6,
    transition: 'width 0.3s ease',
  },
  instancePillsRow: {
    display: 'flex',
    gap: 10,
    flexWrap: 'wrap',
    marginTop: 6,
  },
  instBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    background: '#0F172A',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    padding: '4px 10px',
    borderRadius: 14,
    fontSize: 12,
  },
  instDot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    backgroundColor: '#38BDF8',
  },
  instName: {
    color: '#F8FAFC',
    fontWeight: 600,
  },
  instCount: {
    color: '#94A3B8',
  },
  queueAlert: {
    background: 'rgba(16, 185, 129, 0.12)',
    border: '1px solid rgba(16, 185, 129, 0.3)',
    color: '#34D399',
    padding: '10px 16px',
    borderRadius: 10,
    fontSize: 13,
    marginBottom: 16,
  },
  queueMetricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: 16,
  },
  queueCard: {
    background: '#131C31',
    padding: 18,
    borderRadius: 12,
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  queueCardLabel: {
    fontSize: 10,
    fontWeight: 700,
    color: '#64748B',
    letterSpacing: '0.06em',
  },
  queueCardVal: {
    fontFamily: "'Outfit', sans-serif",
    fontSize: 24,
    fontWeight: 800,
    color: '#F8FAFC',
  },
  queueCardSub: {
    fontSize: 12,
    color: '#94A3B8',
  },
  simBadge: {
    display: 'inline-block',
    fontSize: 10,
    fontWeight: 800,
    letterSpacing: '0.08em',
    color: '#38BDF8',
    background: 'rgba(56, 189, 248, 0.12)',
    border: '1px solid rgba(56, 189, 248, 0.3)',
    padding: '3px 10px',
    borderRadius: 12,
    marginBottom: 6,
  },
  autoscaleResult: {
    background: '#131C31',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: 14,
    padding: 20,
    marginTop: 16,
  },
  scaleResultRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: 18,
    marginBottom: 16,
  },
  scaleLabel: {
    display: 'block',
    fontSize: 11,
    fontWeight: 700,
    color: '#64748B',
    marginBottom: 4,
    letterSpacing: '0.06em',
  },
  scaleVal: {
    fontFamily: "'Outfit', sans-serif",
    fontSize: 22,
    fontWeight: 800,
    color: '#34D399',
  },
  scaleStatusTag: {
    display: 'inline-block',
    fontSize: 13,
    fontWeight: 700,
    color: '#FBBF24',
    background: 'rgba(245, 158, 11, 0.15)',
    padding: '4px 10px',
    borderRadius: 8,
  },
  scaleCost: {
    fontFamily: "'Outfit', sans-serif",
    fontSize: 20,
    fontWeight: 700,
    color: '#F8FAFC',
  },
  disclaimerNote: {
    fontSize: 13,
    color: '#94A3B8',
    margin: 0,
    lineHeight: 1.6,
  },
  analysisGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: 18,
    marginTop: 16,
  },
  analysisItem: {
    background: '#131C31',
    padding: 20,
    borderRadius: 14,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: 700,
    color: '#F8FAFC',
    margin: '0 0 10px',
  },
  itemText: {
    fontSize: 13,
    color: '#94A3B8',
    lineHeight: 1.6,
    margin: 0,
  },
};
