import { useState } from "react";
import { ema } from "@/lib/calc";
import { cn } from "@/lib/utils";
import type { FrameAnalysis, UnderlyingPlan } from "@/lib/research/types";
import { fmt } from "@/components/dash/ui";

export function StructureChart({ frame, plan }: { frame: FrameAnalysis; plan: UnderlyingPlan | null }) {
  const [hover, setHover] = useState<number | null>(null);
  const start = Math.max(0, frame.bars.length - 65), bars = frame.bars.slice(start), W = 960, H = 420, plotW = 880, plotH = 325;
  const high = Math.max(...bars.map((b) => b.h)), low = Math.min(...bars.map((b) => b.l)), padding = (high - low) * 0.08;
  const y = (p: number) => 15 + (high + padding - p) / Math.max(0.0001, high - low + padding * 2) * plotH;
  const step = plotW / Math.max(1, bars.length), x = (i: number) => (i - start + 0.5) * step;
  const maxV = Math.max(...bars.map((b) => b.v), 1);
  const selected = frame.bars[hover ?? frame.bars.length - 1];
  const zones = frame.zones.filter((z) => z.formed >= start && z.high >= low && z.low <= high).slice(-6);
  const events = frame.events.filter((e) => e.index >= start && ["Sweep", "BOS", "CHoCH"].includes(e.kind)).slice(-8);
  return <div><div className="mb-2 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[10px] text-muted-foreground">{selected && <><span>O <span className="text-foreground">{fmt(selected.o)}</span></span><span>H <span className="text-foreground">{fmt(selected.h)}</span></span><span>L <span className="text-foreground">{fmt(selected.l)}</span></span><span>C <span className="text-primary">{fmt(selected.c)}</span></span><span>V {selected.v.toLocaleString("en-IN")}</span></>}<span className="ml-auto text-warn">SIMULATED</span></div>
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${frame.tf} simulated candlestick chart with structure and zones`} className="h-[300px] w-full sm:h-[420px]" preserveAspectRatio="none" onMouseLeave={() => setHover(null)}>
      {[0,1,2,3,4].map((i) => { const p = low + (high - low) * i / 4; return <g key={i}><line x1={0} x2={plotW} y1={y(p)} y2={y(p)} className="stroke-border" strokeDasharray="3 5" strokeWidth={0.7} /><text x={plotW + 10} y={y(p) + 4} className="fill-muted-foreground text-[10px] font-mono">{fmt(p)}</text></g>; })}
      {zones.map((z) => <g key={z.id}><rect x={Math.max(0, x(z.formed))} y={y(z.high)} width={plotW - Math.max(0,x(z.formed))} height={Math.max(1,y(z.low)-y(z.high))} className={cn(z.state === "Invalidated" ? "fill-muted/30 stroke-muted-foreground/30" : z.direction === "Bullish" ? "fill-bull/10 stroke-bull/40" : "fill-bear/10 stroke-bear/40")} strokeDasharray={z.state === "Fresh" ? "0" : "4 4"} /><text x={plotW - 8} y={y(z.high) + 12} textAnchor="end" className={cn("text-[9px]", z.direction === "Bullish" ? "fill-bull" : "fill-bear")}>{z.kind} · {z.state}</text></g>)}
      {frame.location !== "Equilibrium" && frame.range.midpoint >= low && frame.range.midpoint <= high && <><line x1={0} x2={plotW} y1={y(frame.range.midpoint)} y2={y(frame.range.midpoint)} className="stroke-warn/50" strokeDasharray="5 5" /><text x={5} y={y(frame.range.midpoint) - 5} className="fill-warn text-[9px]">50% equilibrium</text></>}
      {bars.map((b,k) => { const i = start + k; return <g key={i} className={b.c >= b.o ? "fill-bull stroke-bull" : "fill-bear stroke-bear"}><line x1={x(i)} x2={x(i)} y1={y(b.h)} y2={y(b.l)} strokeWidth={1.2} /><rect x={x(i)-step*0.28} y={y(Math.max(b.o,b.c))} width={step*0.56} height={Math.max(1,Math.abs(y(b.o)-y(b.c)))} /><rect x={x(i)-step*0.28} y={395-b.v/maxV*38} width={step*0.56} height={b.v/maxV*38} opacity={0.3} /><rect x={x(i)-step/2} y={0} width={step} height={H} className="fill-transparent stroke-none" onMouseEnter={() => setHover(i)}><title>{new Date(b.time).toISOString()} — SIMULATED: close {fmt(b.c)}</title></rect></g>; })}
      {[{n:5,cls:"stroke-warn"},{n:9,cls:"stroke-violet"},{n:13,cls:"stroke-info"}].map(({n,cls}) => <path key={n} d={ema(frame.bars.map(b=>b.c),n).slice(start).map((p,k)=>`${k?"L":"M"}${x(k+start)},${y(p)}`).join(" ")} className={cn("fill-none",cls)} strokeWidth={1} />)}
      {events.map((e,i) => <g key={`${e.kind}-${e.index}`}><line x1={Math.max(0,x(e.pivotIndex))} x2={x(e.index)} y1={y(e.level)} y2={y(e.level)} className={e.kind==="Sweep"?"stroke-warn":"stroke-primary"} strokeDasharray="3 3" /><text x={x(e.index)} y={y(e.level)+(i%2 ? 14 : -7)} textAnchor="middle" className={cn("text-[9px]",e.kind==="Sweep"?"fill-warn":"fill-primary")}>{e.kind}</text></g>)}
      {plan && [ {p:plan.stop,label:"SL",cls:"stroke-bear fill-bear"}, {p:plan.entry,label:"Entry",cls:"stroke-primary fill-primary"} ].filter(({p})=>p>=low && p<=high).map(({p,label,cls})=><g key={label} className={cls}><line x1={0} x2={plotW} y1={y(p)} y2={y(p)} strokeDasharray="6 4" strokeWidth={0.8}/><text x={plotW-8} y={y(p)-5} textAnchor="end" className="text-[10px]">{label} {fmt(p)}</text></g>)}
      {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={0} y2={395} className="stroke-muted-foreground/50" strokeDasharray="3 3" />}
      {[0,16,32,48,64].filter((i)=>i<bars.length).map((i)=><text key={i} x={x(start+i)} y={415} textAnchor="middle" className="fill-muted-foreground text-[9px]">{new Date(bars[i]?.time ?? 0).toISOString().slice(frame.tf==="Weekly"||frame.tf==="Daily"?5:11,frame.tf==="Weekly"||frame.tf==="Daily"?10:16)}</text>)}
    </svg><div className="mt-2 flex flex-wrap gap-4 text-[10px] text-muted-foreground"><span className="text-warn">— EMA 5</span><span className="text-violet">— EMA 9</span><span className="text-info">— EMA 13</span><span>FVG / order blocks · dashed = mitigated or invalidated</span><span>Fixture timestamps, not exchange sessions</span></div>
  </div>;
}