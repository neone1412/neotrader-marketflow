import { useMemo, useState } from "react";
import { INDICES, TIMEFRAMES, SECTORS, type TF, type Stock, stocks, liquidity, tradeCandidates, rsiTable } from "@/lib/demo-data";
import { computeLots } from "@/lib/calc";
import { Panel, Stat, Seg, Select, Tag, Note, fmt, toneOf } from "./ui";
import { PriceChart } from "./charts";
import { cn } from "@/lib/utils";

type SortKey = "sym" | "ltp" | "chg" | "relVol" | "oiChg" | "pcr" | "score";
const rsiTone = (v: number, lo = 30, hi = 70) => (v >= hi ? "text-bear" : v <= lo ? "text-bull" : "text-foreground");

export function StockRadar({ seed }: { seed: number }) {
  const all = stocks(seed);
  const [q, setQ] = useState("");
  const [bias, setBias] = useState<"All" | "Bullish" | "Bearish">("All");
  const [unVol, setUnVol] = useState(false);
  const [hiOI, setHiOI] = useState(false);
  const [sector, setSector] = useState("All sectors");
  const [sort, setSort] = useState<{ k: SortKey; d: 1 | -1 }>({ k: "score", d: -1 });
  const rows = all
    .filter((s) => s.sym.includes(q.toUpperCase()))
    .filter((s) => bias === "All" || s.ema === bias)
    .filter((s) => !unVol || s.relVol >= 1.8)
    .filter((s) => !hiOI || Math.abs(s.oiChg) >= 8)
    .filter((s) => sector === "All sectors" || s.sector === sector)
    .sort((a, b) => {
      const av = a[sort.k], bv = b[sort.k];
      return (typeof av === "string" ? av.localeCompare(bv as string) : (av as number) - (bv as number)) * sort.d;
    });
  const H = ({ k, children }: { k: SortKey; children: string }) => (
    <th className="cursor-pointer whitespace-nowrap px-2 py-1.5 text-left hover:text-foreground" onClick={() => setSort((s) => ({ k, d: s.k === k ? (-s.d as 1 | -1) : -1 }))}>
      {children}{sort.k === k ? (sort.d === 1 ? " ▲" : " ▼") : ""}
    </th>
  );
  const Toggle = ({ on, set, children }: { on: boolean; set: (v: boolean) => void; children: string }) => (
    <button onClick={() => set(!on)} className={cn("rounded-md border px-2 py-1 text-xs", on ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground")}>{children}</button>
  );
  return (
    <Panel title={`Stock radar • ${rows.length} of ${all.length} representative F&O samples`} right={
      <div className="flex flex-wrap gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search symbol…" className="w-32 rounded-md border border-border bg-input px-2 py-1 text-xs" />
        <Seg options={["All", "Bullish", "Bearish"] as const} value={bias} onChange={setBias} />
        <Toggle on={unVol} set={setUnVol}>Unusual vol</Toggle>
        <Toggle on={hiOI} set={setHiOI}>High OI Δ</Toggle>
        <Select value={sector} onChange={setSector} options={["All sectors", ...SECTORS]} />
      </div>
    }>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-xs">
          <thead className="text-[10px] uppercase tracking-wider text-muted-foreground">
            <tr className="border-b border-border">
              <H k="sym">Symbol</H><H k="ltp">LTP</H><H k="chg">%Chg</H><H k="relVol">RelVol</H><H k="oiChg">OI Δ%</H><H k="pcr">PCR</H>
              <th className="px-2 text-left">Trend</th>{TIMEFRAMES.map((t) => <th key={t} className="px-2 text-left">RSI {t}</th>)}
              <th className="px-2 text-left">EMA 5/9/13</th><H k="score">Score</H>
            </tr>
          </thead>
          <tbody className="font-mono">
            {rows.map((s: Stock) => (
              <tr key={s.sym} className="border-b border-border/50 hover:bg-muted/30">
                <td className="px-2 py-1.5 font-sans font-semibold">{s.sym}<div className="text-[10px] font-normal text-muted-foreground">{s.sector}</div></td>
                <td className="px-2">{fmt(s.ltp)}</td>
                <td className={cn("px-2", toneOf(s.chg))}>{s.chg.toFixed(2)}</td>
                <td className={cn("px-2", s.relVol >= 1.8 && "text-warn")}>{s.relVol.toFixed(2)}x</td>
                <td className={cn("px-2", toneOf(s.oiChg))}>{s.oiChg.toFixed(1)}</td>
                <td className="px-2">{s.pcr.toFixed(2)}</td>
                <td className="px-2"><Tag tone={s.trend === "Up" ? "bull" : s.trend === "Down" ? "bear" : "muted"}>{s.trend}</Tag></td>
                {TIMEFRAMES.map((t) => <td key={t} className={cn("px-2", rsiTone(s.rsi[t]))}>{s.rsi[t].toFixed(0)}</td>)}
                <td className="px-2"><Tag tone={s.ema === "Bullish" ? "bull" : s.ema === "Bearish" ? "bear" : "warn"}>{s.ema}</Tag></td>
                <td className="px-2"><div className="flex items-center gap-1"><div className="h-1.5 w-12 rounded bg-muted"><div className="h-full rounded bg-violet" style={{ width: `${s.score}%` }} /></div>{s.score}</div></td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <div className="py-6 text-center text-xs text-muted-foreground">No stocks match these filters.</div>}
      </div>
      <Note>Sample list only — not the full current NSE F&O universe. Setup score is a rule-based demo metric, unbacktested.</Note>
    </Panel>
  );
}

export function LiquidityMap({ seed }: { seed: number }) {
  const [sym, setSym] = useState<string>("NIFTY 50");
  const [tf, setTf] = useState<TF>("15m");
  const { cs, marks, pools } = useMemo(() => liquidity(sym, tf, seed), [sym, tf, seed]);
  const counts = marks.reduce<Record<string, number>>((a, m) => ({ ...a, [m.kind]: (a[m.kind] ?? 0) + 1 }), {});
  return (
    <div className="grid gap-3 lg:grid-cols-[1fr_300px]">
      <Panel title={`Liquidity map • ${sym} • ${tf}`} right={<div className="flex gap-2"><Select value={sym} onChange={setSym} options={INDICES.map((i) => i.sym)} /><Seg options={TIMEFRAMES} value={tf} onChange={setTf} /></div>}>
        <PriceChart cs={cs} mode="candle" marks={marks} />
        <div className="mt-2 flex flex-wrap gap-3 text-[10px] text-muted-foreground">
          <span className="text-bear">SH swing high</span><span className="text-bull">SL swing low</span><span className="text-warn">EQH/EQL equal highs/lows</span>
          <span className="text-violet">SWP sweep • RCL reclaim</span><span className="text-info">BOS / CHoCH structure</span>
        </div>
      </Panel>
      <div className="space-y-3">
        <Panel title="Liquidity pools">
          {pools.map((p, i) => <div key={i} className="flex justify-between text-xs"><Tag tone={p.side === "Buy-side" ? "bear" : "bull"}>{p.side}</Tag><span className="font-mono">{fmt(p.price)}</span></div>)}
        </Panel>
        <Panel title="Marker counts">
          <div className="grid grid-cols-2 gap-2">{Object.entries(counts).map(([k, v]) => <Stat key={k} label={k} value={v} />)}</div>
          <Note>Possible sweeps/reclaims are mechanically detected on simulated candles; they are not confirmed signals.</Note>
        </Panel>
      </div>
    </div>
  );
}

export function TradeAssistant({ seed }: { seed: number }) {
  const cands = tradeCandidates(seed);
   const [sel, setSel] = useState(cands[0]?.id ?? "");
  const c = cands.find((x) => x.id === sel) ?? cands[0];
  const [capital, setCapital] = useState(7000);
  const [riskPct, setRiskPct] = useState(1);
   const [entry, setEntry] = useState(c?.entry ?? 100);
   const [stop, setStop] = useState(c?.stop ?? 80);
   const [lot, setLot] = useState(c?.demoLot ?? 75);
   const pick = (id: string) => { const n = cands.find((x) => x.id === id); if (!n) return; setSel(id); setEntry(n.entry); setStop(n.stop); setLot(n.demoLot); };
  const r = computeLots({ capital, riskPct, entry, stop, lotSize: lot });
  const Num = ({ label, v, set, step = 1 }: { label: string; v: number; set: (n: number) => void; step?: number }) => (
    <label className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}
      <input type="number" step={step} value={v} onChange={(e) => set(Number(e.target.value))} className="mt-1 w-full rounded-md border border-border bg-input px-2 py-1.5 font-mono text-sm text-foreground" />
    </label>
  );
  return (
    <div className="grid gap-3 lg:grid-cols-[1fr_360px]">
      <div className="grid gap-3 md:grid-cols-2">
        {cands.map((x) => (
          <button key={x.id} onClick={() => pick(x.id)} className={cn("rounded-lg border bg-card p-3 text-left", sel === x.id ? "border-primary" : "border-border")}>
            <div className="flex items-center justify-between">
              <span className="font-semibold">{x.underlying} {x.strike} <span className={x.type === "CE" ? "text-bull" : "text-bear"}>{x.type}</span></span>
              <Tag tone="muted">{x.expiry}</Tag>
            </div>
            <div className="mt-2 grid grid-cols-4 gap-1 font-mono text-[11px]">
              <div><div className="text-muted-foreground">Entry</div>{x.entry}</div>
              <div><div className="text-muted-foreground">Stop</div><span className="text-bear">{x.stop}</span></div>
              <div><div className="text-muted-foreground">T1/T2</div><span className="text-bull">{x.t1}/{x.t2}</span></div>
              <div><div className="text-muted-foreground">R:R</div>{x.rr}</div>
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">{x.rationale}</p>
            <p className="mt-1 text-[11px] text-warn">Invalidation: {x.invalidation}</p>
          </button>
        ))}
      </div>
      <Panel title="Quantity calculator">
        <div className="grid grid-cols-2 gap-2">
          <Num label="Capital ₹" v={capital} set={setCapital} step={500} />
          <Num label="Risk %" v={riskPct} set={setRiskPct} step={0.25} />
          <Num label="Entry premium" v={entry} set={setEntry} step={0.5} />
          <Num label="Stop premium" v={stop} set={setStop} step={0.5} />
          <Num label="Lot size (demo, verify)" v={lot} set={setLot} />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Stat label="Risk budget" value={`₹${fmt(r.riskBudget, 0)}`} tone="warn" />
          <Stat label="Risk / lot" value={`₹${fmt(Math.max(0, r.perLotRisk), 0)}`} />
          <Stat label="Lots by risk" value={r.lotsByRisk} />
          <Stat label="Lots affordable" value={r.lotsByCapital} />
          <Stat label="Suggested lots" value={r.lots} tone={r.lots > 0 ? "bull" : "bear"} />
          <Stat label="Capital used" value={`₹${fmt(r.totalCost, 0)}`} />
        </div>
        {!r.valid && <p className="mt-2 text-xs text-bear">Stop must be below entry; lot size and entry must be positive.</p>}
        {r.valid && r.lots === 0 && <p className="mt-2 text-xs text-bear">Even 1 lot exceeds the risk budget or capital — skip or adjust.</p>}
        {r.cappedByCapital && <p className="mt-2 text-xs text-warn">Capped by capital affordability.</p>}
        <Note>Lots = floor(risk budget ÷ ((entry − stop) × lot size)), capped by capital. Lot sizes shown are demo values — always verify the current exchange lot size. No orders are placed.</Note>
      </Panel>
    </div>
  );
}

export function RsiHeatmap({ seed }: { seed: number }) {
  const data = rsiTable(seed);
  const [lo, setLo] = useState(30);
  const [hi, setHi] = useState(70);
  const [calmOnly, setCalmOnly] = useState(false);
  const cell = (v: number) => (v >= hi ? "bg-bear/70" : v <= lo ? "bg-bull/70" : v >= 55 ? "bg-bear/20" : v <= 45 ? "bg-bull/20" : "bg-info/15");
  const rows = data.map((d) => {
    const vals = TIMEFRAMES.map((t) => d.rsi[t]);
    const ob = vals.filter((v) => v >= hi).length, os = vals.filter((v) => v <= lo).length;
    return { ...d, ob, os, calm: ob === 0 && os === 0 };
  }).filter((r) => !calmOnly || r.calm);
  return (
    <Panel title="RSI heatmap / calm zone" right={
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <label>Oversold ≤ <input type="number" value={lo} onChange={(e) => setLo(Number(e.target.value))} className="w-14 rounded border border-border bg-input px-1 font-mono" /></label>
        <label>Overbought ≥ <input type="number" value={hi} onChange={(e) => setHi(Number(e.target.value))} className="w-14 rounded border border-border bg-input px-1 font-mono" /></label>
        <button onClick={() => setCalmOnly(!calmOnly)} className={cn("rounded-md border px-2 py-1", calmOnly ? "border-info bg-info/15 text-info" : "border-border text-muted-foreground")}>Calm zone only</button>
      </div>
    }>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-xs">
          <thead className="text-[10px] uppercase text-muted-foreground"><tr><th className="p-1 text-left">Symbol</th>{TIMEFRAMES.map((t) => <th key={t} className="p-1">{t === "1D" ? "Daily" : t}</th>)}<th className="p-1">Agreement</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.sym}>
                <td className="p-1 font-mono font-semibold">{r.sym}</td>
                {TIMEFRAMES.map((t) => <td key={t} className="p-0.5"><div className={cn("rounded py-1 text-center font-mono", cell(r.rsi[t]))}>{r.rsi[t].toFixed(0)}</div></td>)}
                <td className="p-1 text-center">{r.calm ? <Tag tone="info">Calm</Tag> : r.ob ? <Tag tone="bear">{r.ob}/4 OB</Tag> : <Tag tone="bull">{r.os}/4 OS</Tag>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Note>Calm zone = no timeframe beyond the thresholds. Agreement = number of timeframes (of 4) in overbought/oversold.</Note>
    </Panel>
  );
}

export function DataStatus({ ts, interval, setInterval, refresh }: { ts: string; interval: number; setInterval: (n: number) => void; refresh: () => void }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <Panel title="Feed status">
        <div className="grid grid-cols-2 gap-2">
          <Stat label="Source" value="Simulated demo" tone="warn" />
          <Stat label="Connection" value="Not connected" tone="bear" />
          <Stat label="Last refresh" value={ts || "—"} />
          <Stat label="Auto refresh" value={interval ? `${interval}s` : "Off"} />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Seg options={[0, 15, 30, 60] as const} value={interval as 0 | 15 | 30 | 60} onChange={setInterval} label={(v) => (v ? `${v}s` : "Off")} />
          <button onClick={refresh} className="rounded-md bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">Refresh demo data</button>
        </div>
      </Panel>
      <Panel title="Future data provider (placeholder)">
        <p className="text-xs text-muted-foreground">A licensed market-data provider will be connected later through a secure server-side adapter. Credentials will never be entered or stored in this browser app.</p>
        <div className="mt-3 space-y-1 text-xs">
          {["Index quotes", "Option chain / OI", "Intraday candles", "F&O stock universe & lot sizes"].map((x) => (
            <div key={x} className="flex justify-between border-b border-border/50 py-1"><span>{x}</span><Tag tone="muted">Pending</Tag></div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
