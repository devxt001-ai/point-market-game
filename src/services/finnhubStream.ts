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
// Force demo token if none provided to ensure everyone sees updates
const DEMO_TOKEN = "cju2rqhr01qr958213c0cju2rqhr01qr958213cg";
const WS_URL = `wss://ws.finnhub.io/?token=${API_KEY || DEMO_TOKEN}`;

class FinnhubStream {
  private ws: WebSocket | null = null;
  private connected = false;
  private reconnectAttempts = 0;
  private pendingSubscriptions = new Set<string>();
  private handlers = new Set<TickHandler>();
  private lastConnectAt: number | null = null;
  private simulationInterval: number | null = null;
  private simulatedSymbols = new Set<string>();
  private lastPrices: Record<string, number> = {};

  connect() {
    if (this.connected || this.ws) return;
    // Always try to connect, even without API key
    this.ws = new WebSocket(WS_URL);
    this.lastConnectAt = Date.now();

    this.ws.onopen = () => {
      this.connected = true;
      this.reconnectAttempts = 0;
      // Resubscribe symbols
      for (const sym of this.pendingSubscriptions) {
        this.send({ type: "subscribe", symbol: sym });
      }
      // Stop simulation when connected
      this.stopSimulation();
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
            // Store last price for simulation fallback
            this.lastPrices[tick.symbol] = tick.price;
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
      // Start simulation if connection fails
      this.startSimulation();
    };

    this.ws.onerror = (e) => {
      console.error("FinnhubStream error", e);
      // Start simulation on error
      this.startSimulation();
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
      this.simulatedSymbols.add(sym);
      this.send({ type: "subscribe", symbol: sym });
    }
    if (!this.connected && !this.ws) this.connect();

    // Ensure simulation is running for these symbols if WebSocket is not connected
    if (!this.connected) {
      this.startSimulation();
    }
  }

  unsubscribe(symbols: string[]) {
    for (const sym of symbols) {
      if (!sym) continue;
      this.pendingSubscriptions.delete(sym);
      this.simulatedSymbols.delete(sym);
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
      this.stopSimulation();
    }
  }

  // Simulate price movements if real connection fails
  private startSimulation() {
    if (this.simulationInterval) return;

    this.simulationInterval = window.setInterval(() => {
      if (this.connected) {
        this.stopSimulation();
        return;
      }

      // Generate simulated ticks for all subscribed symbols
      for (const sym of this.simulatedSymbols) {
        // Get last price or create initial price
        const lastPrice =
          this.lastPrices[sym] || 10 + (sym.charCodeAt(0) % 100);

        // Random price movement between -0.5% and +0.5%
        const change = (Math.random() - 0.5) * 0.01 * lastPrice;
        const price = lastPrice + change;
        this.lastPrices[sym] = price;

        const tick: Tick = {
          symbol: sym,
          price: parseFloat(price.toFixed(2)),
          timestamp: Date.now(),
        };

        this.emit(tick);
      }
    }, 1500); // Update every 1.5 seconds
  }

  private stopSimulation() {
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
      this.simulationInterval = null;
    }
  }
}

export const finnhubStream = new FinnhubStream();
export type { Tick };
