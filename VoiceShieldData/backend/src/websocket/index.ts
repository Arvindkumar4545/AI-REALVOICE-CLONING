import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';

interface ClientConnection {
  ws: WebSocket;
  userId?: string | null;
  requestId?: string | null;
  isAlive: boolean;
}

class WebSocketManager {
  private wss: WebSocketServer | null = null;
  private clients: Set<ClientConnection> = new Set();

  init(server: Server): void {
    this.wss = new WebSocketServer({ server, path: '/ws' });

    this.wss.on('connection', (ws: WebSocket, req) => {
      const client: ClientConnection = { ws, isAlive: true };
      this.clients.add(client);

      ws.on('pong', () => {
        client.isAlive = true;
      });

      ws.on('message', (message: string) => {
        try {
          const data = JSON.parse(message.toString());
          if (data.type === 'SUBSCRIBE_REQUEST' && data.requestId) {
            client.requestId = data.requestId;
          }
          if (data.type === 'AUTHENTICATE' && data.userId) {
            client.userId = data.userId;
          }
        } catch (e) {
          // ignore malformed message
        }
      });

      ws.on('close', () => {
        this.clients.delete(client);
      });

      // Send initial connection welcome
      ws.send(JSON.stringify({ type: 'CONNECTED', message: 'VoiceShield WebSocket Gateway Active' }));
    });

    // Heartbeat ping interval every 30s
    setInterval(() => {
      for (const client of this.clients) {
        if (!client.isAlive) {
          client.ws.terminate();
          this.clients.delete(client);
          continue;
        }
        client.isAlive = false;
        client.ws.ping();
      }
    }, 30000);

    console.log('[WebSocket] Initialized on path /ws');
  }

  broadcast(event: string, payload: any): void {
    const msg = JSON.stringify({ type: event, data: payload, timestamp: new Date().toISOString() });
    for (const client of this.clients) {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(msg);
      }
    }
  }

  notifyRequest(requestId: string, event: string, payload: any): void {
    const msg = JSON.stringify({ type: event, requestId, data: payload, timestamp: new Date().toISOString() });
    for (const client of this.clients) {
      if (client.ws.readyState === WebSocket.OPEN) {
        if (!client.requestId || client.requestId === requestId) {
          client.ws.send(msg);
        }
      }
    }
  }

  notifyUser(userId: string, event: string, payload: any): void {
    const msg = JSON.stringify({ type: event, userId, data: payload, timestamp: new Date().toISOString() });
    for (const client of this.clients) {
      if (client.ws.readyState === WebSocket.OPEN && client.userId === userId) {
        client.ws.send(msg);
      }
    }
  }
}

export const wsManager = new WebSocketManager();
