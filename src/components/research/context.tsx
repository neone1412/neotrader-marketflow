import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { demoBars, demoProvider, FIXTURE_END, UNIVERSE } from "@/lib/research/provider";
import { scanInstrument } from "@/lib/research/engine";
import { DEFAULT_CONFIG, SCAN_TFS, type Bar, type EngineConfig, type ResearchSignal, type ScanTF } from "@/lib/research/types";

export interface HistoryEntry { id: string; symbol: string; status: string; score: number; time: number; reason: string; source: "SIMULATED" }
interface ResearchState {
  rows: ResearchSignal[]; seed: number; receivedAt: number; now: number; loading: boolean; error: string | null;
  config: EngineConfig; setConfig: (config: EngineConfig) => void; refresh: () => Promise<void>;
  watchlist: string[]; toggleWatch: (symbol: string) => void; history: HistoryEntry[];
  interval: number; setInterval: (seconds: number) => void;
}
const Context = createContext<ResearchState | null>(null);
export function ResearchProvider({ children }: { children: ReactNode }) {
  const [seed, setSeed] = useState(1), [receivedAt, setReceivedAt] = useState(FIXTURE_END), [now, setNow] = useState(FIXTURE_END);
  const [config, setConfig] = useState(DEFAULT_CONFIG), [loading, setLoading] = useState(false), [error, setError] = useState<string | null>(null);
  const [watchlist, setWatchlist] = useState(["RELIANCE", "NIFTY", "HDFCBANK", "INFY"]), [history, setHistory] = useState<HistoryEntry[]>([]);
  const [interval, setIntervalSec] = useState(0);
  const [loadedBars, setLoadedBars] = useState<Record<string, Record<ScanTF, Bar[]>> | null>(null);
  const rows = useMemo(() => UNIVERSE.map((instrument) => scanInstrument(instrument, loadedBars?.[instrument.symbol] ?? demoBars(instrument, seed), receivedAt, now, config)), [seed, loadedBars, receivedAt, now, config]);
  useEffect(() => { const current = Date.now(); setNow(current); setReceivedAt(current); const id = window.setInterval(() => setNow(Date.now()), 15000); return () => window.clearInterval(id); }, []);
  const refresh = useCallback(async () => {
    if (loading) return;
    setLoading(true); setError(null);
    try {
      // Yield so the visible loading state renders before local fixture analysis.
      await new Promise<void>((resolve) => window.setTimeout(resolve, 120));
      const next = seed + 1, time = Date.now(), instruments = await demoProvider.getUniverse();
      const entries = await Promise.all(instruments.map(async (instrument) => {
        const frames = await Promise.all(SCAN_TFS.map(async (tf) => [tf, await demoProvider.getBars(instrument, tf, next)] as const));
        return [instrument.symbol, Object.fromEntries(frames) as Record<ScanTF, Bar[]>] as const;
      }));
      const data = Object.fromEntries(entries);
      const signals = instruments.map((i) => scanInstrument(i, data[i.symbol] ?? demoBars(i, next), time, time, config));
      setHistory((prior) => [...signals.filter((s) => s.status !== "No trade" || watchlist.includes(s.instrument.symbol)).map((s) => ({ id: `${time}-${s.instrument.symbol}`, symbol: s.instrument.symbol, status: s.status, score: s.score, time, reason: s.reasons[0] ?? "Underlying confirmation passed; estimated levels", source: "SIMULATED" as const })), ...prior].slice(0, 300));
      setLoadedBars(data); setSeed(next); setReceivedAt(time); setNow(time);
    } catch { setError("The demo scan could not be refreshed. Existing results are retained; try again."); }
    finally { setLoading(false); }
  }, [seed, loading, config, watchlist]);
  useEffect(() => { if (!interval) return; const id = window.setInterval(() => { void refresh(); }, interval * 1000); return () => window.clearInterval(id); }, [interval, refresh]);
  const toggleWatch = (symbol: string) => setWatchlist((list) => list.includes(symbol) ? list.filter((s) => s !== symbol) : [...list, symbol]);
  return <Context.Provider value={{ rows, seed, receivedAt, now, loading, error, config, setConfig, refresh, watchlist, toggleWatch, history, interval, setInterval: setIntervalSec }}>{children}</Context.Provider>;
}
export function useResearch() { const value = useContext(Context); if (!value) throw new Error("ResearchProvider is required"); return value; }
export function formatTime(time: number) { return new Date(time).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour12: false }); }
export function exportCSV(filename: string, rows: (string | number)[][]) {
  const content = "\uFEFF" + rows.map((r) => r.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a"); anchor.href = url; anchor.download = filename; anchor.click(); URL.revokeObjectURL(url);
}