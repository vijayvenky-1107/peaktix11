import http from 'node:http';

const LB_PORT = Number.parseInt(process.env.LB_PORT, 10) || 3000;
const DEFAULT_UPSTREAMS = ['http://127.0.0.1:3001', 'http://127.0.0.1:3002', 'http://127.0.0.1:3003'];

const upstreamUrls = (process.env.UPSTREAMS ? process.env.UPSTREAMS.split(',') : DEFAULT_UPSTREAMS)
  .map((s) => s.trim())
  .filter(Boolean);

let roundRobinIndex = 0;
const requestCounts = new Map(upstreamUrls.map((u) => [u, 0]));

export function createLoadBalancer(upstreams = upstreamUrls) {
  const server = http.createServer((req, res) => {
    // Internal Load Balancer status dashboard
    if (req.url === '/lb/status') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(
        JSON.stringify({
          status: 'ok',
          service: 'peaktix-load-balancer',
          port: LB_PORT,
          upstreams,
          distribution: Object.fromEntries(requestCounts),
          timestamp: new Date().toISOString(),
        })
      );
    }

    // Pick upstream in round-robin order
    const targetBase = upstreams[roundRobinIndex % upstreams.length];
    roundRobinIndex++;
    requestCounts.set(targetBase, (requestCounts.get(targetBase) || 0) + 1);

    const targetUrl = new URL(req.url, targetBase);

    const proxyReq = http.request(
      targetUrl,
      {
        method: req.method,
        headers: {
          ...req.headers,
          host: targetUrl.host,
          'x-forwarded-for': req.socket.remoteAddress,
          'x-forwarded-host': req.headers.host || `localhost:${LB_PORT}`,
        },
      },
      (proxyRes) => {
        res.writeHead(proxyRes.statusCode, {
          ...proxyRes.headers,
          'x-proxied-by': 'peaktix-load-balancer',
        });
        proxyRes.pipe(res);
      }
    );

    proxyReq.on('error', (err) => {
      console.error(`[Load Balancer] Upstream failure (${targetBase}):`, err.message);
      if (!res.headersSent) {
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            success: false,
            error: 'Bad Gateway: Selected upstream API instance is unreachable.',
            upstream: targetBase,
          })
        );
      }
    });

    req.pipe(proxyReq);
  });

  return server;
}

// When executed directly via `node server/loadBalancer.js`
if (process.argv[1]?.endsWith('loadBalancer.js')) {
  const lbServer = createLoadBalancer();
  lbServer.listen(LB_PORT, '127.0.0.1', () => {
    console.log(`PeakTix Load Balancer active on http://127.0.0.1:${LB_PORT}`);
    console.log(`Routing round-robin across ${upstreamUrls.length} upstreams:`, upstreamUrls.join(', '));
    console.log(`Status endpoint: http://127.0.0.1:${LB_PORT}/lb/status`);
  });
}
