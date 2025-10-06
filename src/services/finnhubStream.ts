// Lightweight Finnhub WebSocket client for streaming trade ticks
// Uses browser WebSocket; reconnects with backoff; supports subscribe/unsubscribe
// Message format: { type: "subscribe"|"unsubscribe", symbol: "AAPL" }

type Tick = {
  symbol: string;
  price: number;
  timestamp: number;
};

type TickHandler = (tick: Tick) => void;

const API_KEY: string = import.meta.env?.VITE_FINNHUB_API_KEY ?? "";
const WS_URL = `wss://ws.finnhub.io?token=${API_KEY}`;

class FinnhubStream {
  private ws: WebSocket | null = null;
  private connected = false;
  private reconnectAttempts = 0;
  private pendingSubscriptions = new Set<string>();
  private handlers = new Set<TickHandler>();
  private lastConnectAt: number | null = null;

  connect() {
    if (this.connected || this.ws) return;
    if (!API_KEY) {
      console.warn("FinnhubStream: Missing VITE_FINNHUB_API_KEY, skipping WS connect");
      return;
    }
    this.ws = new WebSocket(WS_URL);
    this.lastConnectAt = Date.now();

    this.ws.onopen = () => {
      this.connected = true;
      this.reconnectAttempts = 0;
      // Resubscribe symbols
      for (const sym of this.pendingSubscriptions) {
        this.send({ type: "subscribe", symbol: sym });
      }
    };

    this.ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg.type === "trade" && Array.isArray(msg.data)) {
          for (const d of msg.data) {
            const tick: Tick = {
              symbol: d.s,
              price: d.p,
              timestamp: d.t,
            };
            this.emit(tick);
          }
        }
      } catch (e) {
        console.error("FinnhubStream parse error", e);
      }
    };

    this.ws.onclose = () => {
      this.connected = false;
      this.ws = null;
      this.scheduleReconnect();
    };

    this.ws.onerror = (e) => {
      console.error("FinnhubStream error", e);
    };
  }

  private scheduleReconnect() {
    // Exponential backoff up to ~10s
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000);
    this.reconnectAttempts += 1;
    setTimeout(() => this.connect(), delay);
  }

  private send(obj: unknown) {
    const payload = JSON.stringify(obj);
    if (this.ws && this.connected) {
      this.ws.send(payload);
    }
  }

  subscribe(symbols: string[]) {
    for (const sym of symbols) {
      if (!sym) continue;
      this.pendingSubscriptions.add(sym);
      this.send({ type: "subscribe", symbol: sym });
    }
    if (!this.connected && !this.ws) this.connect();
  }

  unsubscribe(symbols: string[]) {
    for (const sym of symbols) {
      if (!sym) continue;
      this.pendingSubscriptions.delete(sym);
      this.send({ type: "unsubscribe", symbol: sym });
    }
  }

  addListener(handler: TickHandler) {
    this.handlers.add(handler);
  }

  removeListener(handler: TickHandler) {
    this.handlers.delete(handler);
  }

  private emit(tick: Tick) {
    for (const h of this.handlers) {
      try {
        h(tick);
      } catch (e) {
        console.error("FinnhubStream handler error", e);
      }
    }
  }

  close() {
    try {
      this.ws?.close();
    } finally {
      this.ws = null;
      this.connected = false;
      this.pendingSubscriptions.clear();
    }
  }
}

export const finnhubStream = new FinnhubStream();
export type { Tick };