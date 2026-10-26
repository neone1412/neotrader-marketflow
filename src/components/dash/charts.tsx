import type { Candle, LiqMark, StrikeRow } from "@/lib/demo-data";
import { emas } from "@/lib/demo-data";
import { cn } from "@/lib/utils";
import { fmtL } from "./ui";

const W = 800, H = 320, VH = 60;

export function PriceChart({ cs, mode, showOI, marks }: { cs: Candle[]; mode: "candle" | "line"; showOI?: boolean; marks?: LiqMark[] }) {
  const { e5, e9, e13 } = emas(cs);
  const hi = Math.max(...cs.map((c) => c.h)), lo = Math.min(...cs.map((c) => c.l));
  const ph = H - VH - 10;
  const y = (p: number) => 6 + ((hi - p) / (hi - lo)) * (ph - 12);
  const step = W / cs.length;
  const x = (i: number) => i * step + step / 2;
  const maxV = Math.max(...cs.map((c) => c.v));
  const path = (vals: number[]) => vals.map((v, i) => `${i ? "L" : "M"}${x(i)},${y(v)}`).join(" ");
  const recent = cs.slice(-20);
  const res = Math.max(...recent.map((c) => c.h)), sup = Math.min(...recent.map((c) => c.l));
  const oiMin = Math.min(...cs.map((c) => c.oi)), oiMax = Math.max(...cs.map((c) => c.oi));
  const oiY = (v: number) => H - VH - 6 + -((v - oiMin) / (oiMax - oiMin || 1)) * 70;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-64 w-full md:h-80">
      {[0.25, 0.5, 0.75].map((f) => <line key={f} x1={0} x2={W} y1={ph * f} y2={ph * f} className="stroke-border" strokeWidth={0.5} />)}
      <line x1={0} x2={W} y1={y(res)} y2={y(res)} className="stroke-bear" strokeDasharray="6 4" strokeWidth={1} />
      <line x1={0} x2={W} y1={y(sup)} y2={y(sup)} className="stroke-bull" strokeDasharray="6 4" strokeWidth={1} />
      <text x={4} y={y(res) - 3} className="fill-bear text-[10px]">R {res.toFixed(0)}</text>
      <text x={4} y={y(sup) + 11} className="fill-bull text-[10px]">S {sup.toFixed(0)}</text>
      {mode === "candle"
        ? cs.map((c, i) => (
            <g key={i} className={c.c >= c.o ? "fill-bull stroke-bull" : "fill-bear stroke-bear"}>
              <line x1={x(i)} x2={x(i)} y1={y(c.h)} y2={y(c.l)} strokeWidth={1} />
              <rect x={x(i) - step * 0.32} width={step * 0.64} y={y(Math.max(c.o, c.c))} height={Math.max(1, Math.abs(y(c.o) - y(c.c)))} />
            </g>
          ))
        : <path d={path(cs.map((c) => c.c))} className="fill-none stroke-info" strokeWidth={2} />}
      <path d={path(e5)} className="fill-none stroke-warn" strokeWidth={1.2} />
      <path d={path(e9)} className="fill-none stroke-violet" strokeWidth={1.2} />
      <path d={path(e13)} className="fill-none stroke-info" strokeWidth={1.2} strokeOpacity={0.7} />
      {showOI && <path d={cs.map((c, i) => `${i ? "L" : "M"}${x(i)},${oiY(c.oi)}`).join(" ")} className="fill-none stroke-violet" strokeDasharray="3 3" strokeWidth={1.5} />}
      {cs.map((c, i) => (
        <rect key={i} x={x(i) - step * 0.35} width={step * 0.7} y={H - (c.v / maxV) * VH} height={(c.v / maxV) * VH} className={c.c >= c.o ? "fill-bull/40" : "fill-bear/40"} />
      ))}
      {marks?.map((m, k) => {
        const up = ["Swing High", "Equal Highs", "Sweep", "BOS"].includes(m.kind);
        const cls = { "Swing High": "fill-bear", "Swing Low": "fill-bull", "Equal Highs": "fill-warn", "Equal Lows": "fill-warn", Sweep: "fill-violet", Reclaim: "fill-violet", BOS: "fill-info", CHOCH: "fill-info" }[m.kind];
        const short = { "Swing High": "SH", "Swing Low": "SL", "Equal Highs": "EQH", "Equal Lows": "EQL", Sweep: "SWP", Reclaim: "RCL", BOS: "BOS", CHOCH: "CHoCH" }[m.kind];
        const yy = y(m.price) + (up ? -8 : 14);
        return <text key={k} x={x(m.i)} y={yy} textAnchor="middle" className={cn(cls, "text-[9px] font-semibold")}>{short}</text>;
      })}
    </svg>
  );
}

export function MirrorOI({ rows, atm, maxPain, spot, dots }: { rows: StrikeRow[]; atm: number; maxPain: number; spot: number; dots?: boolean }) {
  const max = Math.max(...rows.flatMap((r) => [r.callOI + Math.max(0, r.callChg), r.putOI + Math.max(0, r.putChg)]));
  const maxChg = Math.max(...rows.flatMap((r) => [Math.abs(r.callChg), Math.abs(r.putChg)])) || 1;
  return (
    <div className="space-y-0.5">
      <div className="mb-1 grid grid-cols-[1fr_72px_1fr] text-[10px] uppercase tracking-wider text-muted-foreground">
        <span className="text-right text-bull">Put OI ◂</span><span className="text-center">Strike</span><span className="text-call">▸ Call OI</span>
      </div>
      {rows.map((r) => {
        const isAtm = r.strike === atm, isMp = r.strike === maxPain;
        return (
          <div key={r.strike} className={cn("relative grid grid-cols-[1fr_72px_1fr] items-center gap-1 rounded-sm", isAtm && "bg-info/10 ring-1 ring-info/50", isMp && !isAtm && "ring-1 ring-warn/50")}>
            <div className="flex h-5 items-center justify-end gap-1">
              {dots && <Dot v={r.putChg} max={maxChg} />}
              <span className="font-mono text-[10px] text-muted-foreground">{fmtL(r.putOI)}</span>
              <div className="relative h-3.5 rounded-l-sm bg-bull/70" style={{ width: `${(r.putOI / max) * 70}%` }}>
                {r.putChg > 0 && <span className="absolute right-full top-0 h-full rounded-l-sm bg-bull/30" style={{ width: `${(r.putChg / r.putOI) * 100}%` }} />}
              </div>
            </div>
            <div className={cn("text-center font-mono text-[11px]", isAtm ? "font-bold text-info" : "text-foreground")}>
              {r.strike}
              {isMp && <span className="ml-0.5 text-warn">◆</span>}
            </div>
            <div className="flex h-5 items-center gap-1">
              <div className="relative h-3.5 rounded-r-sm bg-call/70" style={{ width: `${(r.callOI / max) * 70}%` }}>
                {r.callChg > 0 && <span className="absolute left-full top-0 h-full rounded-r-sm bg-call/30" style={{ width: `${(r.callChg / r.callOI) * 100}%` }} />}
              </div>
              <span className="font-mono text-[10px] text-muted-foreground">{fmtL(r.callOI)}</span>
              {dots && <Dot v={r.callChg} max={maxChg} />}
            </div>
          </div>
        );
      })}
      <div className="mt-2 flex flex-wrap gap-3 text-[10px] text-muted-foreground">
        <span><span className="text-info">▭</span> ATM (spot {spot.toFixed(1)})</span>
        <span><span className="text-warn">◆</span> Max pain {maxPain}</span>
        <span><span className="text-bull">●</span> OI added</span>
        <span><span className="text-bear">●</span> OI removed</span>
        <span>Light bar extension = today's addition</span>
      </div>
    </div>
  );
}

function Dot({ v, max }: { v: number; max: number }) {
  const s = 4 + (Math.abs(v) / max) * 8;
  return <span className={cn("inline-block shrink-0 rounded-full", v >= 0 ? "bg-bull" : "bg-bear")} style={{ width: s, height: s }} title={fmtL(v)} />;
}
