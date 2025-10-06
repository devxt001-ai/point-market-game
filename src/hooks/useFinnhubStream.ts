import { useEffect, useMemo, useRef, useState } from "react";
import { finnhubStream, type Tick } from "@/services/finnhubStream";
import { finnhubService } from "@/services/finnhubService";

type Status = "idle" | "connected" | "disconnected";

export function useFinnhubStream(symbols: string[]) {
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const prevSymbols = useRef<string[]>([]);
  const lastTickAt = useRef<Record<string, number>>({});

  const activeSymbols = useMemo(() => Array.from(new Set(symbols.filter(Boolean))), [symbols]);

  useEffect(() => {
    // If no API key, finnhubStream won’t connect; stay idle
    const onTick = (tick: Tick) => {
      if (!activeSymbols.includes(tick.symbol)) return;
      setPrices((prev) => ({ ...prev, [tick.symbol]: tick.price }));
      lastTickAt.current[tick.symbol] = Date.now();
      setLastUpdated(new Date());
      setStatus("connected");
    };

    finnhubStream.addListener(onTick);

    // Diff subscriptions
    const prev = prevSymbols.current;
    const toUnsub = prev.filter((s) => !activeSymbols.includes(s));
    const toSub = activeSymbols.filter((s) => !prev.includes(s));

    if (toUnsub.length) finnhubStream.unsubscribe(toUnsub);
    if (toSub.length) finnhubStream.subscribe(toSub);

    prevSymbols.current = activeSymbols;

    return () => {
      finnhubStream.removeListener(onTick);
      if (activeSymbols.length) finnhubStream.unsubscribe(activeSymbols);
      setStatus("disconnected");
    };
  }, [activeSymbols]);

  // REST fallback polling for symbols without recent ticks
  useEffect(() => {
    const POLL_MS = 5000;
    const STALE_MS = 10000;
    const timer = setInterval(async () => {
      const now = Date.now();
      const toPoll = activeSymbols.filter((s) => {
        const last = lastTickAt.current[s];
        return !last || now - last > STALE_MS;
      });
      if (!toPoll.length) return;
      try {
        const quotes = await Promise.all(toPoll.map((s) => finnhubService.getStockQuote(s)));
        const next: Record<string, number> = {};
        quotes.forEach((q) => {
          if (q && q.price > 0) {
            next[q.symbol] = q.price;
          }
        });
        if (Object.keys(next).length) {
          setPrices((prev) => ({ ...prev, ...next }));
          setLastUpdated(new Date());
        }
      } catch (e) {
        // Silent: REST fallback should not spam errors
        console.debug("REST fallback polling error", e);
      }
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [activeSymbols]);

  return { prices, lastUpdated, status };
}