import http from 'http';
import { createApp } from './app.js';
import { config } from './config/index.js';
import { initDatabase, getPool } from './database/index.js';
import { initQueue } from './queue/index.js';
import { wsManager } from './websocket/index.js';

async function bootstrap() {
  console.log('============================================================');
  console.log('       VOICE SHIELD — AI VOICE SCAM DETECTION PLATFORM      ');
  console.log('============================================================');
  console.log(`[Bootstrap] Environment: ${config.env}`);

  // 1. Initialize Database
  await initDatabase();

  // 2. Initialize Job Queue
  await initQueue();

  // 3. Create Express App & HTTP Server
  const app = createApp();
  const server = http.createServer(app);

  // 4. Initialize WebSocket Server
  wsManager.init(server);

  // 5. Start Server
  server.listen(config.port, config.host, () => {
    console.log(`[Server] VoiceShield API Gateway running at http://${config.host}:${config.port}`);
    console.log(`[Server] Realtime WebSocket endpoint available at ws://${config.host}:${config.port}/ws`);
    console.log(`[Server] Connected ML Service at ${config.mlService.url}`);
    console.log('============================================================\n');
  });

  // Graceful shutdown handlers
  const shutdown = async (signal: string) => {
    console.log(`\n[Server] Received ${signal}. Starting graceful shutdown...`);
    server.close(async () => {
      console.log('[Server] HTTP and WebSocket listeners closed.');
      const pool = getPool();
      if (pool) {
        await pool.end();
        console.log('[Database] PostgreSQL connection pool closed.');
      }
      process.exit(0);
    });

    // Force exit after 10s if connections linger
    setTimeout(() => {
      console.error('[Server] Forced shutdown after timeout.');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap().catch((err) => {
  console.error('[Server] Fatal bootstrap error:', err);
  process.exit(1);
});
