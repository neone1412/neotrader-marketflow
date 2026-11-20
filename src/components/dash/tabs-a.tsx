import { useMemo, useState } from "react";
import { INDICES, TIMEFRAMES, EXPIRIES, type TF, indexQuotes, breadth, candles, optionChain, sectorFlows, stocks } from "@/lib/demo-data";
import { classifyOI, type OIClass } from "@/lib/calc";
import { Panel, Stat, Seg, Select, Tag, Note, fmt, fmtL, toneOf } from "./ui";
import { PriceChart, MirrorOI } from "./charts";
import { cn } from "@/lib/utils";

const SYMS = INDICES.map((i) => i.sym);

export function MarketPulse({ seed }: { seed: number }) {
  const [sym, setSym] = useState<string>("NIFTY 50");
  const [tf, setTf] = useState<TF>("15m");
  const [mode, setMode] = useState<"candle" | "line">("candle");
  const [view, setView] = useState<"Price" | "Price/OI">("Price");
  const q = indexQuotes(seed);
  const b = breadth(seed);
  const cs = useMemo(() => candles(sym, tf, seed), [sym, tf, seed]);
  const tot = b.adv + b.dec + b.unch;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {q.map((x) => (
          <button key={x.sym} onClick={() => setSym(x.sym)} className={cn("rounded-lg border bg-card p-3 text-left transition-colors", sym === x.sym ? "border-primary" : "border-border hover:border-muted-foreground")}>
            <div className="text-[11px] font-semibold text-muted-foreground">{x.sym}</div>
            <div className="font-mono text-lg font-semibold">{fmt(x.ltp)}</div>
            <div className={cn("font-mono text-xs", toneOf(x.chg))}>{x.pts >= 0 ? "+" : ""}{fmt(x.pts)} ({x.chg >= 0 ? "+" : ""}{x.chg.toFixed(2)}%)</div>
          </button>
        ))}
      </div>
      <Panel title={`${sym} • ${tf} • EMA 5 / 9 / 13`} right={
        <div className="flex flex-wrap gap-2">
          <Seg options={TIMEFRAMES} value={tf} onChange={setTf} />
          <Seg options={["candle", "line"] as const} value={mode} onChange={setMode} />
          <Seg options={["Price", "Price/OI"] as const} value={view} onChange={setView} />
        </div>
      }>
        <PriceChart cs={cs} mode={mode} showOI={view === "Price/OI"} />
        <div className="mt-2 flex flex-wrap gap-3 text-[10px] text-muted-foreground">
          <span className="text-warn">— EMA 5</span><span className="text-violet">— EMA 9</span><span className="text-info">— EMA 13</span>
          <span className="text-bull">- - Support</span><span className="text-bear">- - Resistance</span>
          {view === "Price/OI" && <span className="text-violet">··· Open interest (demo)</span>}
        </div>
      </Panel>
      <Panel title="Market breadth (demo F&O sample)">
        <div className="flex h-3 overflow-hidden rounded-full">
          <div className="bg-bull" style={{ width: `${(b.adv / tot) * 100}%` }} />
          <div className="bg-muted-foreground" style={{ width: `${(b.unch / tot) * 100}%` }} />
          <div className="bg-bear" style={{ width: `${(b.dec / tot) * 100}%` }} />
        </div>
        <div className="mt-2 grid grid-cols-3 gap-2">
          <Stat label="Advances" value={b.adv} tone="bull" /><Stat label="Unchanged" value={b.unch} /><Stat label="Declines" value={b.dec} tone="bear" />
        </div>
      </Panel>
    </div>
  );
}

function useChainControls() {
  const [sym, setSym] = useState<string>("NIFTY 50");
  const [exp, setExp] = useState(EXPIRIES[0]);
  const [count, setCount] = useState(15);
  const controls = (
    <div className="flex flex-wrap gap-2">
      <Select value={sym} onChange={setSym} options={SYMS} />
      <Select value={exp} onChange={setExp} options={EXPIRIES} />
      <Seg options={[11, 15, 21] as const} value={count as 11 | 15 | 21} onChange={setCount} label={(v) => `${v} strikes`} />
    </div>
  );
  return { sym, exp, count, controls };
}

export function OptionPulse({ seed }: { seed: number }) {
  const { sym, exp, count, controls } = useChainControls();
  const c = optionChain(sym, exp, seed, count);
  return (
    <div className="space-y-3">
      <Panel title="Option chain summary" right={controls}>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-6">
          <Stat label="Spot" value={fmt(c.spot)} />
          <Stat label="PCR" value={c.pcr.toFixed(2)} tone={c.pcr > 1 ? "bull" : "bear"} />
          <Stat label="Max pain" value={c.maxPain} tone="warn" />
          <Stat label="Largest Call OI" value={`${c.maxCall.strike}`} tone="bear" />
          <Stat label="Largest Put OI" value={`${c.maxPut.strike}`} tone="bull" />
          <Stat label="Est. writers range" value={`${c.maxPut.strike}–${c.maxCall.strike}`} tone="violet" />
        </div>
      </Panel>
      <Panel title={`${sym} • ${exp} • Mirrored OI`}>
        <MirrorOI rows={c.rows} atm={c.atm} maxPain={c.maxPain} spot={c.spot} dots />
        <Note>Writers range is a rough estimate from the largest Put OI (floor) and Call OI (ceiling). It is not a prediction.</Note>
      </Panel>
    </div>
  );
}

export function OIFlow({ seed }: { seed: number }) {
  const { sym, exp, count, controls } = useChainControls();
  const c = optionChain(sym, exp, seed, count);
  const speed = (c.rows.reduce((a, r) => a + Math.abs(r.callChg) + Math.abs(r.putChg), 0) / 375);
  const hottest = [...c.rows].sort((a, b) => Math.abs(b.callChg) + Math.abs(b.putChg) - (Math.abs(a.callChg) + Math.abs(a.putChg))).slice(0, 3);
  const fastC = [...c.rows].sort((a, b) => b.callChg - a.callChg)[0];
  const fastP = [...c.rows].sort((a, b) => b.putChg - a.putChg)[0];
  const red = [...c.rows].flatMap((r) => [{ s: r.strike, t: "CE", v: r.callChg }, { s: r.strike, t: "PE", v: r.putChg }]).sort((a, b) => a.v - b.v).slice(0, 3);
  const st = stocks(seed);
  const tone: Record<OIClass, "bull" | "bear" | "info" | "warn"> = { "Long buildup": "bull", "Short buildup": "bear", "Short covering": "info", "Long unwinding": "warn" };
  return (
    <div className="grid gap-3 lg:grid-cols-[1fr_340px]">
      <Panel title={`Live OI flow map (simulated) • ${sym}`} right={controls}>
        <MirrorOI rows={c.rows} atm={c.atm} maxPain={c.maxPain} spot={c.spot} dots />
      </Panel>
      <div className="space-y-3">
        <Panel title="Flow stats">
          <div className="grid grid-cols-2 gap-2">
            <Stat label="OI speed / min" value={fmtL(speed)} tone="violet" />
             <Stat label="Fastest Call add" value={fastC ? `${fastC.strike} CE` : "—"} tone="bear" />
             <Stat label="Fastest Put add" value={fastP ? `${fastP.strike} PE` : "—"} tone="bull" />
            <Stat label="Hottest" value={hottest.map((h) => h.strike).join(", ")} tone="warn" />
          </div>
          <div className="mt-3 text-[11px] text-muted-foreground">Biggest reductions</div>
          {red.map((r) => <div key={r.s + r.t} className="flex justify-between font-mono text-xs"><span>{r.s} {r.t}</span><span className="text-bear">{fmtL(r.v)}</span></div>)}
        </Panel>
        <Panel title="Price × OI classification">
          <div className="mb-2 grid grid-cols-2 gap-1 text-[10px]">
            <Tag tone="bull">Price↑ OI↑ Long buildup</Tag><Tag tone="bear">Price↓ OI↑ Short buildup</Tag>
            <Tag tone="info">Price↑ OI↓ Short covering</Tag><Tag tone="warn">Price↓ OI↓ Long unwinding</Tag>
          </div>
          <div className="max-h-64 space-y-1 overflow-auto">
            {st.map((s) => { const k = classifyOI(s.chg, s.oiChg); return (
              <div key={s.sym} className="flex items-center justify-between text-xs">
                <span className="font-mono">{s.sym}</span>
                <span className="flex items-center gap-2"><span className={cn("font-mono", toneOf(s.chg))}>{s.chg.toFixed(1)}%</span><Tag tone={tone[k]}>Possible {k}</Tag></span>
              </div>); })}
          </div>
          <Note>OI changes alone cannot establish trader intent. Labels are "possible" interpretations only.</Note>
        </Panel>
      </div>
    </div>
  );
}

export function MoneyFlow({ seed }: { seed: number }) {
  const f = sectorFlows(seed);
  const max = Math.max(...f.map((x) => Math.abs(x.flow)));
  const st = stocks(seed);
  return (
    <div className="grid gap-3 lg:grid-cols-[1fr_340px]">
      <Panel title="Sector money flow • derived demo indicator (₹ Cr, illustrative)">
        <div className="space-y-1.5">
          {f.map((x) => (
            <div key={x.sector} className="grid grid-cols-[1fr_88px_1fr] items-center gap-2">
              <div className="flex justify-end">{x.flow < 0 && <div className="h-4 rounded-l-sm bg-bear/80" style={{ width: `${(-x.flow / max) * 100}%` }} />}</div>
              <div className="text-center text-xs">{x.sector}<div className={cn("font-mono text-[10px]", toneOf(x.flow))}>{x.flow > 0 ? "+" : ""}{x.flow}</div></div>
              <div>{x.flow > 0 && <div className="h-4 rounded-r-sm bg-bull/80" style={{ width: `${(x.flow / max) * 100}%` }} />}</div>
            </div>
          ))}
        </div>
        <Note>Derived from simulated price × volume. These are NOT actual FII/DII or institutional flows.</Note>
      </Panel>
      <Panel title="Leading stocks by sector">
        {f.slice(0, 3).concat(f.slice(-2)).map((x) => {
          const lead = st.filter((s) => s.sector === x.sector).sort((a, b) => b.chg - a.chg);
          return (
            <div key={x.sector} className="mb-2 border-b border-border pb-2 last:border-0">
              <div className="flex justify-between text-xs font-semibold"><span>{x.sector}</span><span className={toneOf(x.flow)}>{x.flow > 0 ? "Inflow" : "Outflow"}</span></div>
              {lead.length ? lead.map((s) => <div key={s.sym} className="flex justify-between font-mono text-[11px] text-muted-foreground"><span>{s.sym}</span><span className={toneOf(s.chg)}>{s.chg.toFixed(2)}%</span></div>) : <div className="text-[11px] text-muted-foreground">No sample stocks</div>}
            </div>
          );
        })}
      </Panel>
    </div>
  );
}
