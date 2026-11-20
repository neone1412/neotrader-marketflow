export const SCAN_TFS = ["Weekly", "Daily", "1H", "15m", "5m"] as const;
export type ScanTF = (typeof SCAN_TFS)[number];
export type Direction = "Bullish" | "Bearish" | "Mixed";
export type SignalStatus = "Bullish" | "Bearish" | "Watch" | "No trade";
export interface Bar { time: number; o: number; h: number; l: number; c: number; v: number }
export interface Instrument { symbol: string; kind: "stock" | "index"; lotSize: number; lotExpiry: string; exchange: string; instrumentToken: number }
export type EventKind = "Swing high" | "Swing low" | "BOS" | "CHoCH" | "Sweep" | "Equal highs" | "Equal lows" | "Displacement";
export interface StructureEvent { kind: EventKind; index: number; pivotIndex: number; level: number; direction: Direction }
export interface Zone { id: string; kind: "FVG" | "Order block"; direction: "Bullish" | "Bearish"; low: number; high: number; formed: number; state: "Fresh" | "Mitigated" | "Invalidated"; firstRetest: number | null }
export const DETECTORS = ["swings", "bos", "choch", "sweep", "equal", "fvg", "orderBlock", "displacement", "premiumDiscount"] as const;
export type Detector = (typeof DETECTORS)[number];
export interface EngineConfig {
  swingRadius: number; equalTolerancePct: number; bodyMultiplier: number; minBodyRatio: number;
  minRelVolume: number; minScore: number; minRR: number; maxSpreadPct: number; minOptionVolume: number;
  maxAgeMs: number; sequenceLookback: number; enabled: Record<Detector, boolean>;
}
export const DEFAULT_CONFIG: EngineConfig = {
  swingRadius: 2, equalTolerancePct: 0.12, bodyMultiplier: 1.3, minBodyRatio: 0.6,
  minRelVolume: 1.2, minScore: 75, minRR: 1.5, maxSpreadPct: 2, minOptionVolume: 1000,
  maxAgeMs: 120_000, sequenceLookback: 16,
  enabled: { swings: true, bos: true, choch: true, sweep: true, equal: true, fvg: true, orderBlock: true, displacement: true, premiumDiscount: true },
};
export interface FrameAnalysis {
  tf: ScanTF; bars: Bar[]; bias: Direction; events: StructureEvent[]; zones: Zone[]; rsi: number | null;
  relVolume: number | null; ema: Direction; displacement: boolean; location: "Premium" | "Discount" | "Equilibrium";
  range: { low: number; high: number; midpoint: number }; sequence: { sweep: number | null; choch: number | null; retest: number | null; zoneId: string | null };
}
export interface ScorePart { name: string; points: number; max: number; passed: boolean; reason: string }
export interface UnderlyingPlan { direction: "Bullish" | "Bearish"; entryLow: number; entryHigh: number; entry: number; stop: number; targets: [number, number, number]; rr: number; confirmation: "Confirmed on demo bars"; levels: "Estimated structure levels" }
export interface ResearchSignal { instrument: Instrument; frames: Record<ScanTF, FrameAnalysis>; status: SignalStatus; direction: Direction; score: number; parts: ScorePart[]; reasons: string[]; plan: UnderlyingPlan | null; receivedAt: number; stale: boolean; source: "SIMULATED" }
export interface OptionContract {
  id: string; symbol: string; expiry: string; strike: number; type: "CE" | "PE"; oi: number; oiChange: number; volume: number;
  bid: number; ask: number; premium: number; lotSize: number; moneyness: "ATM" | "ITM" | "OTM";
  iv: number | null; ivPercentile: number | null; delta: number | null; theta: number | null; vega: number | null; gamma: number | null;
  source: "SIMULATED"; receivedAt: number;
}
export interface OptionAssessment { contract: OptionContract; eligible: boolean; reasons: string[]; spreadPct: number; stop: number | null; targets: [number, number, number] | null; rr: number | null; rank: number }
export interface FeedCapabilities { quotes: boolean; candles: boolean; universe: boolean; options: boolean; iv: boolean; greeks: boolean; history: boolean }
export interface MarketDataProvider {
  id: string; label: string; mode: "demo" | "delayed" | "live"; capabilities: FeedCapabilities;
  getUniverse(): Promise<Instrument[]>;
  getBars(instrument: Instrument, tf: ScanTF, seed: number): Promise<Bar[]>;
  getOptionChain(instrument: Instrument, expiry: string, spot: number, seed: number, receivedAt: number): Promise<OptionContract[]>;
}