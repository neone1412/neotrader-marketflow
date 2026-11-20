import snapshot from "./universe.json";
import { rng } from "@/lib/demo-data";
import { SCAN_TFS, type Bar, type Instrument, type MarketDataProvider, type OptionContract, type ScanTF } from "./types";

export const UNIVERSE: Instrument[] = snapshot.instruments.map((i) => ({ ...i, kind: i.kind === "index" ? "index" : "stock" }));
export const UNIVERSE_CAPTURED_AT = snapshot.capturedAt;
export const UNIVERSE_SOURCE = snapshot.source;
export const DEMO_EXPIRIES = ["Demo near expiry", "Demo next expiry", "Demo monthly"];
const hash = (s: string) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
const bases: Record<string, number> = { NIFTY: 24350, BANKNIFTY: 52100, FINNIFTY: 23800, MIDCPNIFTY: 12600, RELIANCE: 1480, HDFCBANK: 980, ICICIBANK: 1330, SBIN: 840, INFY: 1700, TCS: 3300 };
export const demoBase = (symbol: string) => bases[symbol] ?? 300 + hash(symbol) % 3700;
const PERIODS: Record<ScanTF, number> = { Weekly: 604800000, Daily: 86400000, "1H": 3600000, "15m": 900000, "5m": 300000 };
export const FIXTURE_END = Date.parse("2026-11-20T09:55:00Z");

/** Purpose-built closed OHLCV fixture, NOT historical market data. Values are scaled per underlying. */
export function sequenceFixture(direction: "Bullish" | "Bearish" = "Bullish", scale = 1, tf: ScanTF = "5m"): Bar[] {
  const out: Bar[] = [];
  for (let i = 0; i < 80; i++) {
    const center = i < 60 ? 140 - i * 0.12 + Math.sin(i * 0.55) * 12 : 130 - (i - 60) * 1.3;
    out.push({ time: FIXTURE_END - (99 - i) * PERIODS[tf], o: center + 0.5, c: center - 0.5, h: center + 1.5, l: center - 1.5, v: 10000 });
  }
  const tail: [number, number, number, number][] = [
    [108, 109, 106, 107], [107, 108, 103, 104], [104, 105, 101, 102], [102, 103, 100, 101],
    [101, 104, 100.5, 103], [103, 105, 102, 104], [104, 104.5, 102, 103], [103, 103.5, 100, 101],
    [101, 103, 100.5, 102], [102, 104, 101, 103], [103, 103.5, 101, 102],
    [102, 103, 98, 101], [101, 109, 100.5, 108], [108, 110, 106, 109],
    [109, 112, 108, 111], [111, 111.5, 109, 110], [110, 111, 108, 109],
    [109, 110, 107, 108], [108, 109, 106.5, 107], [104.5, 110, 104, 109.5],
  ];
  tail.forEach(([o, h, l, c], k) => out.push({ time: FIXTURE_END - (19 - k) * PERIODS[tf], o, h, l, c, v: k === 19 ? 24000 : 10000 }));
  return out.map((b) => direction === "Bullish" ? { ...b, o: b.o * scale, h: b.h * scale, l: b.l * scale, c: b.c * scale } : { ...b, o: (260 - b.o) * scale, h: (260 - b.l) * scale, l: (260 - b.h) * scale, c: (260 - b.c) * scale });
}
export function makeDemoBars(instrument: Instrument, tf: ScanTF, seed: number): Bar[] {
  const symbol = instrument.symbol;
  const curated = ["RELIANCE", "NIFTY", "HDFCBANK", "INFY"].includes(symbol);
  const direction = ["RELIANCE", "NIFTY"].includes(symbol) ? "Bullish" : ["HDFCBANK", "INFY"].includes(symbol) || hash(symbol) % 2 === 0 ? "Bearish" : "Bullish";
  if (curated || hash(symbol) % 8 === 0) {
    const scale = demoBase(symbol) / (direction === "Bullish" ? 109.5 : 150.5) * (1 + (seed - 1) * 0.0005);
    if (tf === "15m" || tf === "5m") return sequenceFixture(direction, scale, tf);
    const sign = direction === "Bullish" ? 1 : -1;
    return Array.from({ length: 100 }, (_, i) => {
      const center = demoBase(symbol) * (1 + (seed - 1) * 0.0005) * (0.94 + sign * i * 0.001 + Math.sin(i * 0.6) * 0.008);
      return { time: FIXTURE_END - (99 - i) * PERIODS[tf], o: center * 0.999, c: center * 1.001, h: center * 1.003, l: center * 0.997, v: 10000 };
    });
  }
  const r = rng(seed + hash(symbol + tf)); let close = demoBase(symbol);
  return Array.from({ length: 100 }, (_, i) => {
    const o = close; close = o * (1 + (r() - 0.5) * 0.014);
    return { time: FIXTURE_END - (99 - i) * PERIODS[tf], o, c: close, h: Math.max(o, close) * (1 + r() * 0.004), l: Math.min(o, close) * (1 - r() * 0.004), v: Math.round(5000 + r() * 15000) };
  });
}
export function demoBars(instrument: Instrument, seed: number): Record<ScanTF, Bar[]> { return Object.fromEntries(SCAN_TFS.map((tf) => [tf, makeDemoBars(instrument, tf, seed)])) as Record<ScanTF, Bar[]>; }
export function makeDemoOptions(instrument: Instrument, expiry: string, spot: number, seed: number, receivedAt: number): OptionContract[] {
  const step = instrument.kind === "index" ? (instrument.symbol === "BANKNIFTY" ? 100 : 50) : Math.max(5, Math.round(spot * 0.01 / 5) * 5);
  const atm = Math.round(spot / step) * step, r = rng(seed + hash(instrument.symbol + expiry));
  return Array.from({ length: 11 }, (_, i) => atm + (i - 5) * step).flatMap((strike, i) => (["CE", "PE"] as const).map((type) => {
    const intrinsic = Math.max(0, type === "CE" ? spot - strike : strike - spot);
    const premium = Math.round((spot * 0.009 + intrinsic + r() * spot * 0.002) * 100) / 100;
    const spread = premium * (Math.abs(i - 5) > 3 ? 0.055 : 0.009);
    const moneyness = strike === atm ? "ATM" : (type === "CE" ? strike < spot : strike > spot) ? "ITM" : "OTM";
    return { id: `${instrument.symbol}-${expiry}-${strike}-${type}`, symbol: instrument.symbol, expiry, strike, type,
      oi: Math.round(100000 + r() * 2000000), oiChange: Math.round((r() - 0.4) * 100000), volume: Math.abs(i - 5) > 3 ? 200 : Math.round(3000 + r() * 40000),
      bid: premium - spread / 2, ask: premium + spread / 2, premium, lotSize: instrument.lotSize, moneyness,
      iv: Math.round((16 + r() * 12) * 10) / 10, ivPercentile: null, delta: type === "CE" ? 0.5 : -0.5, theta: null, vega: null, gamma: null,
      source: "SIMULATED", receivedAt };
  }));
}
export const demoProvider: MarketDataProvider = {
  id: "demo-fixtures", label: "Deterministic demo fixtures", mode: "demo",
  capabilities: { quotes: false, candles: true, universe: true, options: true, iv: true, greeks: false, history: false },
  getUniverse: async () => UNIVERSE,
  getBars: async (instrument, tf, seed) => makeDemoBars(instrument, tf, seed),
  getOptionChain: async (instrument, expiry, spot, seed, receivedAt) => makeDemoOptions(instrument, expiry, spot, seed, receivedAt),
};

/** Interface-only: no SDK, credentials, requests, sockets, MCP or order methods. */
export const KITE_ADAPTER_REQUIREMENTS = {
  name: "Zerodha Kite Connect (not implemented)",
  required: ["Licensed app registration and permitted market-data usage", "Server-held API key and secret with registered redirect URL", "User-authorised session and daily token renewal", "Instrument master per exchange/expiry and current lot sizes", "Historical closed candles and authenticated quote stream", "Entitled options source; IV history and Greeks may need a separate licensed provider"],
};