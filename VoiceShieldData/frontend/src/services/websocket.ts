type WebSocketCallback = (data: any) => void;

class RealtimeService {
  private ws: WebSocket | null = null;
  private listeners: Map<string, Set<WebSocketCallback>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private isConnecting = false;

  connect(): void {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const apiUrl = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.host}/api/v1`;
    const wsUrl = import.meta.env.VITE_WS_URL || `${apiUrl.replace(/^http/, 'ws').replace(/\/api\/v1\/?$/, '')}/ws`;
    this.isConnecting = true;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('[WebSocket] Connected to VoiceShield Gateway');
        this.reconnectAttempts = 0;
        this.isConnecting = false;
        this.emit('STATUS_CHANGE', { connected: true });
      };

      this.ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type) {
            this.emit(payload.type, payload.data || payload);
          }
        } catch (e) {
          console.error('[WebSocket] Failed to parse event payload:', e);
        }
      };

      this.ws.onclose = () => {
        this.isConnecting = false;
        this.emit('STATUS_CHANGE', { connected: false });
        this.scheduleReconnect();
      };

      this.ws.onerror = () => {
        this.isConnecting = false;
      };
    } catch (e) {
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), 10000);
      setTimeout(() => this.connect(), delay);
    }
  }

  subscribe(event: string, callback: WebSocketCallback): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    // Return unsubscribe function
    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  emit(event: string, data: any): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach((cb) => {
        try {
          cb(data);
        } catch (err) {
          console.error(`[WebSocket] Callback error for ${event}:`, err);
        }
      });
    }
  }

  subscribeToRequest(requestId: string): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'SUBSCRIBE_REQUEST', requestId }));
    }
  }
}

export const realtimeService = new RealtimeService();
