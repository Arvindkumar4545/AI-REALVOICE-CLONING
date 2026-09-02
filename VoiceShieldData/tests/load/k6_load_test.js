/**
 * VoiceShield Production Load & Concurrency Test Script (k6)
 *
 * Simulates high-concurrency API traffic across the Node.js API Gateway and
 * measures RPS, latency percentiles (p50, p95, p99), and error thresholds.
 *
 * Usage:
 *   k6 run tests/load/k6_load_test.js
 *   k6 run --vus 100 --duration 30s tests/load/k6_load_test.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom Metrics
const errorRate = new Rate('error_rate');
const apiLatency = new Trend('api_latency_ms');

// Safe, staged ramping profile
export const options = {
  stages: [
    { duration: '10s', target: 50 },   // Warm-up to 50 concurrent users
    { duration: '30s', target: 200 },  // Ramp to 200 concurrent users
    { duration: '20s', target: 500 },  // Stress test at 500 concurrent users
    { duration: '10s', target: 0 },    // Graceful ramp-down
  ],
  thresholds: {
    'http_req_duration': ['p(95)<500', 'p(99)<1000'], // 95% of requests under 500ms
    'error_rate': ['rate<0.01'],                       // Less than 1% error rate
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:5000/api/v1';

export default function () {
  // 1. Health Probe
  const healthRes = http.get(`${BASE_URL}/health`);
  check(healthRes, {
    'health status is 200': (r) => r.status === 200,
  });
  apiLatency.add(healthRes.timings.duration);
  errorRate.add(healthRes.status !== 200);

  // 2. Statistics Aggregate Read (High Read Concurrency)
  const statsRes = http.get(`${BASE_URL}/statistics`);
  check(statsRes, {
    'stats status is 200': (r) => r.status === 200,
    'stats has total_analyses': (r) => r.json().data.total_analyses !== undefined,
  });
  apiLatency.add(statsRes.timings.duration);
  errorRate.add(statsRes.status !== 200);

  // 3. Location Threat Map Coordinate Ingestion
  const mapRes = http.get(`${BASE_URL}/location/threats`);
  check(mapRes, {
    'threat map status is 200': (r) => r.status === 200,
  });
  apiLatency.add(mapRes.timings.duration);
  errorRate.add(mapRes.status !== 200);

  // 4. Paginated History Query
  const historyRes = http.get(`${BASE_URL}/history?page=1&limit=10`);
  check(historyRes, {
    'history status is 200': (r) => r.status === 200,
  });
  apiLatency.add(historyRes.timings.duration);
  errorRate.add(historyRes.status !== 200);

  sleep(0.5);
}
