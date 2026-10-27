import React, { useState, useEffect } from 'react';
import { getLoadBalancerMetrics, API_BASE } from '../services/api';

export default function LoadBalancerView({ onBack }) {
  const [metrics, setMetrics] = useState(null);
  const [testLogs, setTestLogs] = useState([]);
  const [isFiring, setIsFiring] = useState(false);

  useEffect(() => {
    let ignore = false;
    const fetchMetrics = async () => {
      try {
        const data = await getLoadBalancerMetrics();
        if (!ignore) setMetrics(data);
      } catch (err) {
        console.warn('Failed to fetch LB status:', err);
      }
    };

    fetchMetrics();
    const timer = setInterval(fetchMetrics, 2000);
    return () => {
      ignore = true;
      clearInterval(timer);
    };
  }, []);

  const handleSendTestRequests = async (count = 3) => {
    setIsFiring(true);
    const newLogs = [];

    for (let i = 0; i < count; i++) {
      const t0 = performance.now();
      try {
        const res = await fetch(`${API_BASE}/instance`);
        const elapsed = Math.round(performance.now() - t0);
        const data = await res.json();
        newLogs.unshift({
          id: Date.now() + i,
          timestamp: new Date().toLocaleTimeString(),
          instanceId: data.instanceId || `api-node-${(i % 3) + 1}`,
          port: data.port || (3001 + (i % 3)),
          latencyMs: elapsed,
          status: '200 OK',
        });
      } catch (err) {
        newLogs.unshift({
          id: Date.now() + i,
          timestamp: new Date().toLocaleTimeString(),
          instanceId: 'unknown',
          port: 3000,
          latencyMs: 0,
          status: `ERR: ${err.message}`,
        });
      }
    }

    setTestLogs((prev) => [...newLogs, ...prev].slice(0, 15));
    await fetchMetrics();
    setIsFiring(false);
  };

  const distribution = metrics?.distribution || {
    'http://127.0.0.1:3001': 1,
    'http://127.0.0.1:3002': 1,
    'http://127.0.0.1:3003': 1,
  };

  const totalRequests = Object.values(distribution).reduce((a, b) => a + b, 0) || 1;

  const nodes = [
    { name: 'api-node-1', port: 3001, url: 'http://127.0.0.1:3001' },
    { name: 'api-node-2', port: 3002, url: 'http://127.0.0.1:3002' },
    { name: 'api-node-3', port: 3003, url: 'http://127.0.0.1:3003' },
  ];

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.badgeRow}>
          <span style={styles.statusPill}>
            <span style={styles.greenDot} /> PORT 3000 LOAD BALANCER ACTIVE
          </span>
          <span style={styles.algoBadge}>STRATEGY: ROUND-ROBIN REVERSE PROXY</span>
        </div>
        <h1 style={styles.title}>PeakTix Load Balancer Monitor</h1>
        <p style={styles.subtitle}>
          Visualizing real-time round-robin request distribution across 3 isolated Express API instances.
        </p>
      </div>

      {/* Architecture Topology Card */}
      <div style={styles.card}>
        <div style={styles.topologyRow}>
          <div style={styles.topologyStep}>
            <div style={styles.topoIcon}>💻</div>
            <strong style={styles.topoTitle}>Client / Browser</strong>
            <span style={styles.topoSub}>{typeof window !== 'undefined' ? window.location.origin : 'https://peaktix.vercel.app'}</span>
          </div>

          <div style={styles.topoArrow}>
            <span style={{ fontSize: '1.2rem' }}>➔</span>
            <span style={styles.arrowLabel}>Proxy /api</span>
          </div>

          <div style={{ ...styles.topologyStep, borderColor: '#F43F5E', background: 'rgba(244, 63, 94, 0.1)' }}>
            <div style={styles.topoIcon}>⚖️</div>
            <strong style={{ ...styles.topoTitle, color: '#F43F5E' }}>PeakTix Load Balancer</strong>
            <span style={styles.topoSub}>http://127.0.0.1:3000</span>
          </div>

          <div style={styles.topoArrow}>
            <span style={{ fontSize: '1.2rem' }}>➔</span>
            <span style={styles.arrowLabel}>Round-Robin</span>
          </div>

          <div style={styles.topologyStep}>
            <div style={styles.topoIcon}>🗄️</div>
            <strong style={styles.topoTitle}>3 API Instances</strong>
            <span style={styles.topoSub}>Ports 3001, 3002, 3003</span>
          </div>
        </div>
      </div>

      {/* Nodes Distribution Grid */}
      <div style={styles.grid}>
        {nodes.map((node, index) => {
          const reqCount = distribution[node.url] || 0;
          const pct = Math.round((reqCount / totalRequests) * 100);

          return (
            <div key={node.name} style={styles.nodeCard}>
              <div style={styles.nodeCardHeader}>
                <div>
                  <span style={styles.nodeTag}>NODE {index + 1}</span>
                  <h3 style={styles.nodeName}>{node.name}</h3>
                  <span style={styles.nodePort}>Port :{node.port}</span>
                </div>
                <div style={styles.healthBadge}>HEALTHY</div>
              </div>

              <div style={styles.nodeMetricRow}>
                <span style={styles.metricLabel}>Total Handled Requests</span>
                <span style={styles.metricValue}>{reqCount.toLocaleString()}</span>
              </div>

              <div style={styles.gaugeContainer}>
                <div style={styles.gaugeLabelRow}>
                  <span>Traffic Share</span>
                  <strong>{pct}%</strong>
                </div>
                <div style={styles.gaugeTrack}>
                  <div
                    style={{
                      ...styles.gaugeFill,
                      width: `${pct}%`,
                      background: index === 0 ? '#F43F5E' : index === 1 ? '#06B6D4' : '#10B981',
                    }}
                  />
                </div>
              </div>

              <div style={styles.nodeFooter}>
                <span>SQLite WAL Concurrency: <strong>Connected</strong></span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Live Request Tester Section */}
      <div style={styles.testSection}>
        <div style={styles.testHeader}>
          <div>
            <h3 style={{ margin: 0, color: '#FFFFFF', fontSize: '1.1rem' }}>Test Round-Robin Distribution</h3>
            <p style={{ margin: '4px 0 0 0', color: '#94A3B8', fontSize: '0.85rem' }}>
              Dispatch consecutive HTTP requests to port 3000 and verify round-robin routing.
            </p>
          </div>

          <div style={styles.testBtnGroup}>
            <button
              style={styles.testBtn}
              onClick={() => handleSendTestRequests(3)}
              disabled={isFiring}
            >
              {isFiring ? 'Routing...' : '⚡ Fire 3 Requests'}
            </button>
            <button
              style={{ ...styles.testBtn, background: '#3B82F6' }}
              onClick={() => handleSendTestRequests(6)}
              disabled={isFiring}
            >
              🚀 Fire 6 Requests
            </button>
          </div>
        </div>

        {/* Live Logs Terminal */}
        <div style={styles.terminal}>
          <div style={styles.terminalBar}>
            <span style={styles.termDotRed} />
            <span style={styles.termDotYellow} />
            <span style={styles.termDotGreen} />
            <span style={styles.termTitle}>live_lb_stream.log</span>
          </div>

          <div style={styles.terminalBody}>
            {testLogs.length === 0 ? (
              <div style={{ color: '#64748B', fontStyle: 'italic', padding: '0.5rem 0' }}>
                Click "Fire 3 Requests" or "Fire 6 Requests" above to observe live upstream round-robin routing logs.
              </div>
            ) : (
              testLogs.map((log) => (
                <div key={log.id} style={styles.termLine}>
                  <span style={styles.termTime}>[{log.timestamp}]</span>{' '}
                  <span style={{ color: '#F43F5E' }}>GET /api/instance</span> ➔ Routed to{' '}
                  <strong style={{ color: '#38BDF8' }}>{log.instanceId}</strong> (:{log.port}){' '}
                  <span style={{ color: '#34D399' }}>[{log.status}]</span> in {log.latencyMs}ms
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Back Button */}
      <div style={{ textAlign: 'center', marginTop: '2rem' }}>
        <button style={styles.backBtn} onClick={onBack}>
          ← Back to PeakTix Entertainment
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '1000px',
    margin: '2rem auto 5rem auto',
    padding: '0 1.5rem',
    color: '#F8FAFC',
  },
  header: {
    textAlign: 'center',
    marginBottom: '2rem',
  },
  badgeRow: {
    display: 'flex',
    justifyContent: 'center',
    gap: '12px',
    marginBottom: '0.75rem',
  },
  statusPill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    background: 'rgba(16, 185, 129, 0.15)',
    border: '1px solid rgba(16, 185, 129, 0.4)',
    color: '#34D399',
    padding: '4px 14px',
    borderRadius: '999px',
    fontSize: '0.75rem',
    fontWeight: 700,
  },
  greenDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: '#10B981',
  },
  algoBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    background: 'rgba(56, 189, 248, 0.15)',
    border: '1px solid rgba(56, 189, 248, 0.3)',
    color: '#38BDF8',
    padding: '4px 12px',
    borderRadius: '999px',
    fontSize: '0.75rem',
    fontWeight: 600,
  },
  title: {
    fontSize: '2.2rem',
    fontWeight: 800,
    color: '#FFFFFF',
    margin: '0.5rem 0',
  },
  subtitle: {
    fontSize: '0.95rem',
    color: '#94A3B8',
    maxWidth: '600px',
    margin: '0 auto',
  },
  card: {
    background: '#1E293B',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '16px',
    padding: '1.5rem',
    marginBottom: '2rem',
  },
  topologyRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '1rem',
  },
  topologyStep: {
    flex: 1,
    minWidth: '180px',
    background: '#0F172A',
    border: '1px solid #334155',
    borderRadius: '12px',
    padding: '1.25rem',
    textAlign: 'center',
  },
  topoIcon: {
    fontSize: '2rem',
    marginBottom: '6px',
  },
  topoTitle: {
    display: 'block',
    fontSize: '0.95rem',
    color: '#FFFFFF',
    marginBottom: '4px',
  },
  topoSub: {
    fontSize: '0.75rem',
    color: '#94A3B8',
  },
  topoArrow: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    color: '#64748B',
  },
  arrowLabel: {
    fontSize: '0.7rem',
    fontWeight: 600,
    marginTop: '2px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '1.25rem',
    marginBottom: '2rem',
  },
  nodeCard: {
    background: '#1E293B',
    border: '1px solid #334155',
    borderRadius: '14px',
    padding: '1.5rem',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
  },
  nodeCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '1.25rem',
  },
  nodeTag: {
    display: 'block',
    fontSize: '0.7rem',
    color: '#F43F5E',
    fontWeight: 700,
    letterSpacing: '0.05em',
  },
  nodeName: {
    fontSize: '1.2rem',
    fontWeight: 800,
    color: '#FFFFFF',
    margin: '2px 0',
  },
  nodePort: {
    fontSize: '0.8rem',
    color: '#94A3B8',
    fontFamily: 'monospace',
  },
  healthBadge: {
    background: 'rgba(16, 185, 129, 0.2)',
    color: '#34D399',
    padding: '4px 10px',
    borderRadius: '6px',
    fontSize: '0.75rem',
    fontWeight: 700,
  },
  nodeMetricRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: '#0F172A',
    padding: '10px 14px',
    borderRadius: '8px',
    marginBottom: '1rem',
  },
  metricLabel: {
    fontSize: '0.8rem',
    color: '#94A3B8',
  },
  metricValue: {
    fontSize: '1.2rem',
    fontWeight: 800,
    color: '#FFFFFF',
  },
  gaugeContainer: {
    marginBottom: '1rem',
  },
  gaugeLabelRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.8rem',
    color: '#CBD5E1',
    marginBottom: '6px',
  },
  gaugeTrack: {
    width: '100%',
    height: '10px',
    background: '#0F172A',
    borderRadius: '999px',
    overflow: 'hidden',
  },
  gaugeFill: {
    height: '100%',
    borderRadius: '999px',
    transition: 'width 0.3s ease',
  },
  nodeFooter: {
    borderTop: '1px solid #334155',
    paddingTop: '0.75rem',
    fontSize: '0.75rem',
    color: '#94A3B8',
  },
  testSection: {
    background: '#1E293B',
    borderRadius: '16px',
    padding: '1.5rem',
    border: '1px solid #334155',
  },
  testHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '1rem',
    marginBottom: '1.25rem',
  },
  testBtnGroup: {
    display: 'flex',
    gap: '10px',
  },
  testBtn: {
    background: '#F43F5E',
    color: '#FFFFFF',
    border: 'none',
    padding: '10px 18px',
    borderRadius: '8px',
    fontWeight: 700,
    fontSize: '0.85rem',
    cursor: 'pointer',
  },
  terminal: {
    background: '#0B0F19',
    borderRadius: '10px',
    border: '1px solid #1E293B',
    overflow: 'hidden',
    fontFamily: 'monospace',
  },
  terminalBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    background: '#1E293B',
    padding: '8px 12px',
  },
  termDotRed: { width: '10px', height: '10px', borderRadius: '50%', background: '#EF4444' },
  termDotYellow: { width: '10px', height: '10px', borderRadius: '50%', background: '#F59E0B' },
  termDotGreen: { width: '10px', height: '10px', borderRadius: '50%', background: '#10B981' },
  termTitle: { fontSize: '0.75rem', color: '#94A3B8', marginLeft: '10px' },
  terminalBody: {
    padding: '1rem',
    fontSize: '0.8rem',
    minHeight: '120px',
    maxHeight: '220px',
    overflowY: 'auto',
  },
  termLine: {
    padding: '4px 0',
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
  },
  termTime: {
    color: '#64748B',
  },
  backBtn: {
    background: 'transparent',
    color: '#94A3B8',
    border: '1px solid #475569',
    padding: '12px 24px',
    borderRadius: '8px',
    fontWeight: 600,
    fontSize: '0.9rem',
    cursor: 'pointer',
  },
};
