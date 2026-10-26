// SIMULATED DEMO DATA ONLY. Replace these generators with a live provider adapter later.
import { ema } from "./calc";

export function rng(seed: number) {
  let s = (seed * 2654435761) >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
const hash = (str: string) => [...str].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);

export const INDICES = [
  { sym: "NIFTY 50", base: 24350, step: 50 },
  { sym: "BANKNIFTY", base: 52100, step: 100 },
  { sym: "FINNIFTY", base: 23800, step: 50 },
  { sym: "MIDCPNIFTY", base: 12600, step: 25 },
] as const;
export type IndexSym = (typeof INDICES)[number]["sym"];
export const TIMEFRAMES = ["5m", "15m", "1h", "1D"] as const;
export type TF = (typeof TIMEFRAMES)[number];
export const EXPIRIES = ["Demo Weekly", "Demo Next Weekly", "Demo Monthly"];

export function indexQuotes(seed: number) {
  return INDICES.map((ix) => {
    const r = rng(seed + hash(ix.sym));
    const chg = (r() - 0.45) * 1.8;
    const ltp = ix.base * (1 + chg / 100);
    return { ...ix, ltp, chg, pts: ltp - ix.base, high: ltp * (1 + r() * 0.004), low: ltp * (1 - r() * 0.006) };
  });
}

export function breadth(seed: number) {
  const r = rng(seed + 99);
  const adv = Math.round(80 + r() * 100);
  return { adv, dec: 210 - adv - 8, unch: 8 };
}

export interface Candle { o: number; h: number; l: number; c: number; v: number; oi: number }
export function candles(sym: string, tf: TF, seed: number, n = 60): Candle[] {
  const r = rng(seed + hash(sym + tf));
  const base = INDICES.find((i) => i.sym === sym)?.base ?? 1000;
  const vol = { "5m": 0.0015, "15m": 0.0025, "1h": 0.004, "1D": 0.009 }[tf];
  let p = base * (1 - vol * 5);
  let oi = 1e7;
  const out: Candle[] = [];
  for (let i = 0; i < n; i++) {
    const o = p;
    const c = o * (1 + (r() - 0.48) * vol * 2);
    const h = Math.max(o, c) * (1 + r() * vol * 0.6);
    const l = Math.min(o, c) * (1 - r() * vol * 0.6);
    oi *= 1 + (r() - 0.47) * 0.02;
    out.push({ o, h, l, c, v: Math.round(5e4 + r() * 2e5), oi });
    p = c;
  }
  return out;
}
export const emas = (cs: Candle[]) => {
  const cl = cs.map((c) => c.c);
  return { e5: ema(cl, 5), e9: ema(cl, 9), e13: ema(cl, 13) };
};

export interface StrikeRow { strike: number; callOI: number; putOI: number; callChg: number; putChg: number }
export function optionChain(sym: string, expiry: string, seed: number, count: number) {
  const ix = INDICES.find((i) => i.sym === sym) ?? INDICES[0];
  const spot = indexQuotes(seed).find((q) => q.sym === sym)!.ltp;
  const r = rng(seed + hash(sym + expiry));
  const atm = Math.round(spot / ix.step) * ix.step;
  const half = Math.floor(count / 2);
  const rows: StrikeRow[] = [];
  for (let k = -half; k <= half; k++) {
    const strike = atm + k * ix.step;
    const d = Math.abs(k) / (half + 1);
    const callOI = Math.round((k >= 0 ? 1 - d * 0.6 : 0.3 - d * 0.2) * (2e6 + r() * 5e6));
    const putOI = Math.round((k <= 0 ? 1 - d * 0.6 : 0.3 - d * 0.2) * (2e6 + r() * 5e6));
    rows.push({ strike, callOI, putOI, callChg: Math.round((r() - 0.4) * callOI * 0.3), putChg: Math.round((r() - 0.4) * putOI * 0.3) });
  }
  const totC = rows.reduce((a, x) => a + x.callOI, 0);
  const totP = rows.reduce((a, x) => a + x.putOI, 0);
  let maxPain = atm, best = Infinity;
  for (const s of rows) {
    const pain = rows.reduce((a, x) => a + Math.max(0, s.strike - x.strike) * x.callOI + Math.max(0, x.strike - s.strike) * x.putOI, 0);
    if (pain < best) { best = pain; maxPain = s.strike; }
  }
  const maxCall = rows.reduce((a, x) => (x.callOI > a.callOI ? x : a));
  const maxPut = rows.reduce((a, x) => (x.putOI > a.putOI ? x : a));
  return { spot, atm, step: ix.step, rows, pcr: totP / totC, maxPain, maxCall, maxPut, totC, totP };
}

export const SECTORS = ["Banking", "IT", "Energy", "FMCG", "Auto", "Pharma", "Metals", "Infra", "Telecom", "Financials"] as const;
const STOCK_DEF: [string, (typeof SECTORS)[number], number][] = [
  ["RELIANCE", "Energy", 2890], ["HDFCBANK", "Banking", 1680], ["ICICIBANK", "Banking", 1240],
  ["SBIN", "Banking", 820], ["INFY", "IT", 1870], ["TCS", "IT", 4120], ["LT", "Infra", 3600],
  ["BHARTIARTL", "Telecom", 1650], ["AXISBANK", "Banking", 1170], ["ITC", "FMCG", 470],
  ["KOTAKBANK", "Banking", 1790], ["HINDUNILVR", "FMCG", 2480], ["MARUTI", "Auto", 12400],
  ["TATAMOTORS", "Auto", 960], ["SUNPHARMA", "Pharma", 1810], ["TATASTEEL", "Metals", 152],
  ["HCLTECH", "IT", 1760], ["BAJFINANCE", "Financials", 7100], ["M&M", "Auto", 2950], ["ONGC", "Energy", 280],
];
export interface Stock {
  sym: string; sector: string; ltp: number; chg: number; relVol: number; oiChg: number; pcr: number;
  rsi: Record<TF, number>; ema: "Bullish" | "Bearish" | "Mixed"; trend: "Up" | "Down" | "Sideways"; score: number;
}
export function stocks(seed: number): Stock[] {
  return STOCK_DEF.map(([sym, sector, base]) => {
    const r = rng(seed + hash(sym));
    const chg = (r() - 0.48) * 4;
    const bias = chg / 4;
    const rsi = Object.fromEntries(TIMEFRAMES.map((t) => [t, Math.max(8, Math.min(92, 50 + bias * 30 + (r() - 0.5) * 40))])) as Record<TF, number>;
    const ema = chg > 0.6 ? "Bullish" : chg < -0.6 ? "Bearish" : "Mixed";
    const relVol = 0.5 + r() * 2.5;
    const oiChg = (r() - 0.45) * 18;
    const score = Math.round(Math.min(100, Math.abs(chg) * 12 + relVol * 12 + Math.abs(oiChg) * 1.5 + (ema !== "Mixed" ? 15 : 0)));
    return { sym, sector, ltp: base * (1 + chg / 100), chg, relVol, oiChg, pcr: 0.5 + r() * 1.1, rsi, ema, trend: chg > 0.5 ? "Up" : chg < -0.5 ? "Down" : "Sideways", score };
  });
}

export function sectorFlows(seed: number) {
  return SECTORS.map((s) => {
    const r = rng(seed + hash(s));
    return { sector: s, flow: Math.round((r() - 0.45) * 2000) };
  }).sort((a, b) => b.flow - a.flow);
}

export function rsiTable(seed: number) {
  const ix = INDICES.map((i) => {
    const r = rng(seed + hash("rsi" + i.sym));
    return { sym: i.sym, rsi: Object.fromEntries(TIMEFRAMES.map((t) => [t, 20 + r() * 60])) as Record<TF, number> };
  });
  return [...ix, ...stocks(seed).map((s) => ({ sym: s.sym, rsi: s.rsi }))];
}

export interface LiqMark { i: number; price: number; kind: "Swing High" | "Swing Low" | "Equal Highs" | "Equal Lows" | "Sweep" | "Reclaim" | "BOS" | "CHOCH" }
export function liquidity(sym: string, tf: TF, seed: number) {
  const cs = candles(sym, tf, seed, 70);
  const marks: LiqMark[] = [];
  const highs: number[] = [], lows: number[] = [];
  for (let i = 2; i < cs.length - 2; i++) {
    const w = cs.slice(i - 2, i + 3);
    if (cs[i].h === Math.max(...w.map((c) => c.h))) { highs.push(i); marks.push({ i, price: cs[i].h, kind: "Swing High" }); }
    if (cs[i].l === Math.min(...w.map((c) => c.l))) { lows.push(i); marks.push({ i, price: cs[i].l, kind: "Swing Low" }); }
  }
  const tol = cs[0].c * 0.0012;
  for (let a = 1; a < highs.length; a++) if (Math.abs(cs[highs[a]].h - cs[highs[a - 1]].h) < tol) marks.push({ i: highs[a], price: cs[highs[a]].h, kind: "Equal Highs" });
  for (let a = 1; a < lows.length; a++) if (Math.abs(cs[lows[a]].l - cs[lows[a - 1]].l) < tol) marks.push({ i: lows[a], price: cs[lows[a]].l, kind: "Equal Lows" });
  // sweeps / BOS: compare later closes to prior swing levels
  for (const hi of highs) {
    for (let j = hi + 1; j < Math.min(cs.length, hi + 15); j++) {
      if (cs[j].h > cs[hi].h && cs[j].c < cs[hi].h) { marks.push({ i: j, price: cs[j].h, kind: "Sweep" }); break; }
      if (cs[j].c > cs[hi].h) { marks.push({ i: j, price: cs[j].c, kind: "BOS" }); break; }
    }
  }
  for (const lo of lows) {
    for (let j = lo + 1; j < Math.min(cs.length, lo + 15); j++) {
      if (cs[j].l < cs[lo].l && cs[j].c > cs[lo].l) { marks.push({ i: j, price: cs[j].l, kind: "Reclaim" }); break; }
      if (cs[j].c < cs[lo].l) { marks.push({ i: j, price: cs[j].c, kind: "CHOCH" }); break; }
    }
  }
  const pools = [
    ...highs.slice(-3).map((i) => ({ side: "Buy-side", price: cs[i].h })),
    ...lows.slice(-3).map((i) => ({ side: "Sell-side", price: cs[i].l })),
  ];
  return { cs, marks, pools };
}

export function tradeCandidates(seed: number) {
  const ch = INDICES.map((i) => optionChain(i.sym, EXPIRIES[0], seed, 11));
  const q = indexQuotes(seed);
  return INDICES.map((ix, k) => {
    const r = rng(seed + hash("tc" + ix.sym));
    const bull = q[k].chg >= 0;
    const strike = ch[k].atm + (bull ? ix.step : -ix.step);
    const premium = Math.round((40 + r() * 140) * 10) / 10;
    const stop = Math.round(premium * 0.78 * 10) / 10;
    const risk = premium - stop;
    return {
      id: ix.sym, underlying: ix.sym, type: bull ? "CE" : "PE", strike, expiry: EXPIRIES[0], premium, entry: premium, stop,
      t1: Math.round((premium + risk * 1.5) * 10) / 10, t2: Math.round((premium + risk * 2.5) * 10) / 10, rr: "1 : 1.5 / 2.5",
      rationale: bull ? "Price above EMA 5/9/13 stack, put writers adding near ATM (demo)." : "Price below EMA 5/9/13 stack, call writers adding near ATM (demo).",
      invalidation: `Underlying ${bull ? "closes below" : "closes above"} ${(bull ? ch[k].maxPut.strike : ch[k].maxCall.strike).toLocaleString("en-IN")} on 15m`,
      demoLot: { "NIFTY 50": 75, BANKNIFTY: 30, FINNIFTY: 65, MIDCPNIFTY: 120 }[ix.sym],
    };
  });
}
