import { RSI } from "technicalindicators";
import { ema } from "@/lib/calc";
import { DEFAULT_CONFIG, SCAN_TFS, type Bar, type Direction, type EngineConfig, type FrameAnalysis, type Instrument, type ResearchSignal, type ScanTF, type ScorePart, type StructureEvent, type UnderlyingPlan, type Zone } from "./types";

const mean = (values: number[]) => values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
const opposite = (direction: Direction) => direction === "Bullish" ? "Bearish" : "Bullish";
export function isStale(receivedAt: number, now: number, maxAgeMs: number) { return !Number.isFinite(receivedAt) || receivedAt <= 0 || now - receivedAt > maxAgeMs || receivedAt > now + 5000; }
export function isDisplacement(bars: Bar[], index: number, config: EngineConfig) {
  const bar = bars[index]; if (!bar || index < 20) return false;
  const average = mean(bars.slice(index - 20, index).map((b) => Math.abs(b.c - b.o)));
  const body = Math.abs(bar.c - bar.o);
  return body >= average * config.bodyMultiplier && body / Math.max(bar.h - bar.l, 0.000001) >= config.minBodyRatio;
}
export function analyzeFrame(bars: Bar[], tf: ScanTF, config: EngineConfig = DEFAULT_CONFIG): FrameAnalysis {
  const events: StructureEvent[] = [], zones: Zone[] = [];
  const radius = Math.max(1, Math.min(10, Math.floor(config.swingRadius)));
  let high: { level: number; index: number; broken: boolean } | null = null;
  let low: { level: number; index: number; broken: boolean } | null = null;
  let trend: Direction = "Mixed";
  for (let i = 0; i < bars.length; i++) {
    const bar = bars[i]; if (!bar) continue;
    const p = i - radius, pivot = bars[p];
    if (p >= radius && pivot) {
      const window = bars.slice(p - radius, i + 1);
      const swingHigh = window.every((b, j) => j === radius || pivot.h > b.h);
      const swingLow = window.every((b, j) => j === radius || pivot.l < b.l);
      if (swingHigh) {
        if (config.enabled.equal && high && Math.abs(high.level - pivot.h) / pivot.h * 100 <= config.equalTolerancePct) events.push({ kind: "Equal highs", index: i, pivotIndex: p, level: pivot.h, direction: "Bearish" });
        high = { level: pivot.h, index: p, broken: false };
        if (config.enabled.swings) events.push({ kind: "Swing high", index: i, pivotIndex: p, level: pivot.h, direction: "Bearish" });
      }
      if (swingLow) {
        if (config.enabled.equal && low && Math.abs(low.level - pivot.l) / pivot.l * 100 <= config.equalTolerancePct) events.push({ kind: "Equal lows", index: i, pivotIndex: p, level: pivot.l, direction: "Bullish" });
        low = { level: pivot.l, index: p, broken: false };
        if (config.enabled.swings) events.push({ kind: "Swing low", index: i, pivotIndex: p, level: pivot.l, direction: "Bullish" });
      }
    }
    const displaced = isDisplacement(bars, i, config);
    if (displaced && config.enabled.displacement) events.push({ kind: "Displacement", index: i, pivotIndex: i, level: bar.c, direction: bar.c >= bar.o ? "Bullish" : "Bearish" });
    if (config.enabled.sweep && low && !low.broken && bar.l < low.level && bar.c > low.level) events.push({ kind: "Sweep", index: i, pivotIndex: low.index, level: low.level, direction: "Bullish" });
    if (config.enabled.sweep && high && !high.broken && bar.h > high.level && bar.c < high.level) events.push({ kind: "Sweep", index: i, pivotIndex: high.index, level: high.level, direction: "Bearish" });
    for (const direction of ["Bullish", "Bearish"] as const) {
      const level = direction === "Bullish" ? high : low;
      if (!level || level.broken || !(direction === "Bullish" ? bar.c > level.level : bar.c < level.level)) continue;
      const kind = trend === opposite(direction) ? "CHoCH" : "BOS";
      level.broken = true; trend = direction;
      if ((kind === "BOS" && config.enabled.bos) || (kind === "CHoCH" && config.enabled.choch)) events.push({ kind, index: i, pivotIndex: level.index, level: level.level, direction });
      if (config.enabled.orderBlock && displaced) {
        const candidate = bars.slice(Math.max(0, i - 8), i).map((b, k) => ({ b, index: Math.max(0, i - 8) + k })).reverse().find(({ b }) => direction === "Bullish" ? b.c < b.o : b.c > b.o);
        if (candidate) zones.push({ id: `${tf}-OB-${i}-${direction}`, kind: "Order block", direction, low: candidate.b.l, high: candidate.b.h, formed: i, state: "Fresh", firstRetest: null });
      }
    }
    const left = bars[i - 2], middle = bars[i - 1];
    if (config.enabled.fvg && left && middle && isDisplacement(bars, i - 1, config)) {
      if (bar.l > left.h && middle.c > middle.o) zones.push({ id: `${tf}-FVG-${i}`, kind: "FVG", direction: "Bullish", low: left.h, high: bar.l, formed: i, state: "Fresh", firstRetest: null });
      if (bar.h < left.l && middle.c < middle.o) zones.push({ id: `${tf}-FVG-${i}`, kind: "FVG", direction: "Bearish", low: bar.h, high: left.l, formed: i, state: "Fresh", firstRetest: null });
    }
  }
  for (const zone of zones) {
    for (let i = zone.formed + 1; i < bars.length; i++) {
      const bar = bars[i]; if (!bar) continue;
      if (zone.direction === "Bullish" ? bar.c < zone.low : bar.c > zone.high) { zone.state = "Invalidated"; break; }
      if (bar.l <= zone.high && bar.h >= zone.low) { zone.state = "Mitigated"; zone.firstRetest ??= i; }
    }
  }
  const closes = bars.map((b) => b.c), last = bars.at(-1);
  const [e5, e9, e13] = [5, 9, 13].map((n) => ema(closes, n).at(-1) ?? 0);
  const emaBias: Direction = e5 !== undefined && e9 !== undefined && e13 !== undefined && e5 > e9 && e9 > e13 ? "Bullish" : e5 !== undefined && e9 !== undefined && e13 !== undefined && e5 < e9 && e9 < e13 ? "Bearish" : "Mixed";
  const rsi = RSI.calculate({ values: closes, period: 14 }).at(-1) ?? null;
  const averageVolume = mean(bars.slice(-21, -1).map((b) => b.v));
  const relVolume = bars.length >= 21 && averageVolume > 0 && last ? last.v / averageVolume : null;
  const rangeBars = bars.slice(-40), rangeLow = Math.min(...rangeBars.map((b) => b.l)), rangeHigh = Math.max(...rangeBars.map((b) => b.h));
  const range = { low: Number.isFinite(rangeLow) ? rangeLow : 0, high: Number.isFinite(rangeHigh) ? rangeHigh : 0, midpoint: Number.isFinite(rangeLow + rangeHigh) ? (rangeLow + rangeHigh) / 2 : 0 };
  const location = !last || !config.enabled.premiumDiscount || Math.abs(last.c - range.midpoint) < (range.high - range.low) * 0.025 ? "Equilibrium" : last.c > range.midpoint ? "Premium" : "Discount";
  const sequence: FrameAnalysis["sequence"] = { sweep: null, choch: null, retest: null, zoneId: null };
  for (const zone of [...zones].reverse()) {
    if (zone.kind !== "FVG" || zone.state === "Invalidated" || zone.firstRetest === null || zone.firstRetest < bars.length - config.sequenceLookback) continue;
    const change = events.filter((e) => e.kind === "CHoCH" && e.direction === zone.direction && e.index <= zone.formed && e.index >= bars.length - config.sequenceLookback).at(-1);
    const sweep = change ? events.filter((e) => e.kind === "Sweep" && e.direction === zone.direction && e.index < change.index && e.index >= bars.length - config.sequenceLookback).at(-1) : undefined;
    if (change && sweep && zone.firstRetest > change.index) { sequence.sweep = sweep.index; sequence.choch = change.index; sequence.retest = zone.firstRetest; sequence.zoneId = zone.id; break; }
  }
  return { tf, bars, bias: bars.length < 30 ? "Mixed" : trend, events, zones, rsi, relVolume, ema: emaBias, displacement: isDisplacement(bars, bars.length - 1, config), range, location, sequence };
}

export function buildUnderlyingPlan(frame: FrameAnalysis, direction: Direction, minRR: number): UnderlyingPlan | null {
  if (direction === "Mixed") return null;
  const last = frame.bars.at(-1), zone = frame.zones.find((z) => z.id === frame.sequence.zoneId);
  if (!last || !zone || zone.state === "Invalidated") return null;
  const sweep = frame.events.find((e) => e.kind === "Sweep" && e.index === frame.sequence.sweep && e.direction === direction);
  const sweepBar = sweep ? frame.bars[sweep.index] : undefined;
  if (!sweepBar) return null;
  const stop = direction === "Bullish" ? Math.min(sweepBar.l, zone.low) : Math.max(sweepBar.h, zone.high);
  const entry = last.c, risk = Math.abs(entry - stop);
  if (risk <= 0 || (direction === "Bullish" ? stop >= entry : stop <= entry)) return null;
  // External pre-sweep liquidity; post-sweep internal pivots are not projected as external objectives.
  const levels = frame.events.filter((e) => e.pivotIndex < sweep.index && (e.kind === (direction === "Bullish" ? "Swing high" : "Swing low") || e.kind === (direction === "Bullish" ? "Equal highs" : "Equal lows"))).map((e) => e.level);
  const targets = [...new Set(levels)].filter((p) => direction === "Bullish" ? p > entry : p < entry).sort((a, b) => direction === "Bullish" ? a - b : b - a);
  const [t1, t2, t3] = targets;
  if (t1 === undefined || t2 === undefined || t3 === undefined || Math.abs(t1 - entry) / risk < minRR) return null;
  return { direction, entryLow: zone.low, entryHigh: zone.high, entry, stop, targets: [t1, t2, t3], rr: Math.abs(t1 - entry) / risk, confirmation: "Confirmed on demo bars", levels: "Estimated structure levels" };
}

export function scanInstrument(instrument: Instrument, bars: Record<ScanTF, Bar[]>, receivedAt: number, now: number, config: EngineConfig = DEFAULT_CONFIG): ResearchSignal {
  const frames = Object.fromEntries(SCAN_TFS.map((tf) => [tf, analyzeFrame(bars[tf], tf, config)])) as Record<ScanTF, FrameAnalysis>;
  const stale = isStale(receivedAt, now, config.maxAgeMs);
  const direction = frames["1H"].bias;
  const higher = direction !== "Mixed" && ["Weekly", "Daily", "1H"].every((tf) => frames[tf as ScanTF].bias === direction);
  const setup = frames["15m"], trigger = frames["5m"];
  const sequence = setup.sequence.retest !== null && setup.bias === direction;
  const zone = trigger.zones.find((z) => z.id === trigger.sequence.zoneId), last = trigger.bars.at(-1);
  const triggered = !!zone && !!last && zone.direction === direction && zone.state !== "Invalidated" && trigger.sequence.retest === trigger.bars.length - 1 && (direction === "Bullish" ? last.c > zone.high && last.c > last.o : last.c < zone.low && last.c < last.o);
  const momentum = trigger.rsi !== null && (direction === "Bullish" ? trigger.rsi >= 50 && trigger.rsi < 80 : direction === "Bearish" && trigger.rsi <= 50 && trigger.rsi > 20);
  const volume = (trigger.relVolume ?? 0) >= config.minRelVolume;
  const emaAligned = direction !== "Mixed" && trigger.ema === direction;
  const displacement = config.enabled.displacement && trigger.displacement;
  const location = !!zone && (direction === "Bullish" ? zone.low <= setup.range.midpoint : zone.high >= setup.range.midpoint) && config.enabled.premiumDiscount;
  const parts: ScorePart[] = [
    { name: "Higher-TF bias", max: 25, points: higher ? 25 : 0, passed: higher, reason: "Weekly / Daily / 1H structure must agree" },
    { name: "15m sequence", max: 25, points: sequence ? 25 : 0, passed: sequence, reason: "Sweep → CHoCH → non-invalidated FVG retest" },
    { name: "5m trigger", max: 15, points: triggered ? 15 : 0, passed: triggered, reason: "Latest closed bar retests FVG and closes beyond its proximal edge" },
    { name: "RSI(14)", max: 10, points: momentum ? 10 : 0, passed: momentum, reason: "Bull 50–80 (exclusive 80); bear 20–50 (exclusive 20)" },
    { name: "Relative volume", max: 10, points: volume ? 10 : 0, passed: volume, reason: `Latest volume / prior 20-bar mean ≥ ${config.minRelVolume}×` },
    { name: "EMA 5/9/13", max: 5, points: emaAligned ? 5 : 0, passed: emaAligned, reason: "Ordered in the direction of higher-TF bias" },
    { name: "Displacement", max: 5, points: displacement ? 5 : 0, passed: displacement, reason: `Body ≥ ${config.bodyMultiplier}× prior 20 body mean; body/range ≥ ${config.minBodyRatio}` },
    { name: "Premium / discount", max: 5, points: location ? 5 : 0, passed: location, reason: "Bull zone in discount; bear zone in premium of 15m 40-bar range" },
  ];
  const score = parts.reduce((a, p) => a + p.points, 0);
  const reasons = parts.filter((p) => !p.passed).map((p) => `${p.name}: ${p.reason}`);
  const sufficient = SCAN_TFS.every((tf) => bars[tf].length >= 40 && bars[tf].every((b) => [b.o, b.h, b.l, b.c, b.v, b.time].every(Number.isFinite) && b.h >= Math.max(b.o, b.c) && b.l <= Math.min(b.o, b.c) && b.v >= 0));
  if (!sufficient) reasons.unshift("Insufficient or invalid closed-bar history (minimum 40 bars per timeframe)");
  if (stale) reasons.unshift("Stale or unavailable data: refresh the scan");
  if (score < config.minScore) reasons.push(`Score ${score} below ${config.minScore}`);
  const candidate = higher && sequence && triggered && momentum && volume && emaAligned && displacement && sufficient && !stale && score >= config.minScore ? buildUnderlyingPlan(setup, direction, config.minRR) : null;
  if (higher && sequence && triggered && !candidate) reasons.push(`No viable structure plan: requires three distinct liquidity targets and T1 R:R ≥ ${config.minRR}`);
  const status = candidate ? direction as "Bullish" | "Bearish" : !stale && sufficient && higher && score >= 35 ? "Watch" : "No trade";
  return { instrument, frames, status, direction, score, parts, reasons, plan: candidate, receivedAt, stale, source: "SIMULATED" };
}