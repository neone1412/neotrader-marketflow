import { Link, useRouterState } from "@tanstack/react-router";
import { Activity, ArrowUpRight, ChartNoAxesCombined, Clock3, Download, ListFilter, Menu, Radio, RefreshCw, Settings2, ShieldCheck, Star, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useResearch, formatTime, exportCSV } from "./context";
import type { ReactNode } from "react";

const NAV = [
  { to: "/", label: "SMC Scanner", icon: ListFilter },
  { to: "/watchlist", label: "Watchlist", icon: Star },
  { to: "/market", label: "Market analytics", icon: ChartNoAxesCombined },
  { to: "/history", label: "Signal history", icon: Clock3 },
  { to: "/setup", label: "Rules & data setup", icon: Settings2 },
] as const;
export function ResearchShell({ children }: { children: ReactNode }) {
  const state = useResearch(); const path = useRouterState({ select: (s) => s.location.pathname });
  const [menu, setMenu] = useState(false);
  return <div className="min-h-screen bg-background">
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
      <div className="flex min-h-16 flex-wrap items-center justify-between gap-3 px-4 py-3 lg:px-6">
        <div className="flex items-center gap-3">
          <Button size="icon" variant="ghost" className="lg:hidden" onClick={() => setMenu(!menu)} aria-label={menu ? "Close navigation" : "Open navigation"}>{menu ? <X /> : <Menu />}</Button>
          <Link to="/" className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-md bg-primary text-primary-foreground"><Activity size={23} /></span><span><span className="block text-base font-semibold">NeoTrader <span className="text-primary">MarketFlow</span></span><span className="block text-[10px] text-muted-foreground">NSE F&O RESEARCH TERMINAL</span></span></Link>
        </div>
        <div className="flex flex-wrap items-center gap-3"><span className="flex items-center gap-1.5 rounded border border-warn/30 bg-warn/10 px-2 py-1.5 font-mono text-[10px] font-semibold text-warn"><Radio size={12} />DEMO DATA • NOT CONNECTED</span><span className="hidden items-center gap-1.5 text-xs text-muted-foreground xl:flex"><ShieldCheck size={14} />Research only</span></div>
      </div>
    </header>
    <div className="flex">
      {menu && <div className="fixed inset-x-0 bottom-0 top-[112px] z-20 bg-background/80 lg:hidden" onClick={() => setMenu(false)} />}
      <aside className={cn("fixed bottom-0 left-0 top-16 z-30 w-56 border-r border-border bg-background px-3 py-6 lg:sticky lg:top-16 lg:h-[calc(100dvh-4rem)] lg:shrink-0", menu ? "block" : "hidden lg:block")}>
        <div className="mb-3 px-3 text-[10px] font-semibold text-muted-foreground">WORKSPACE</div>
        <nav className="space-y-1">{NAV.map(({ to, label, icon: Icon }) => <Button asChild key={to} variant="ghost" className={cn("h-10 w-full justify-start text-xs", path === to ? "border-l-2 border-primary bg-primary/10 text-primary" : "text-muted-foreground")}><Link to={to} onClick={() => setMenu(false)}><Icon />{label}{to === "/watchlist" && <span className="ml-auto font-mono">{state.watchlist.length}</span>}</Link></Button>)}</nav>
        <div className="absolute bottom-6 left-6 right-6 space-y-3 border-t border-border pt-4"><span className="flex items-center gap-2 text-xs"><span className="size-1.5 rounded-full bg-warn" />Simulated feed</span><p className="text-[11px] leading-relaxed text-muted-foreground">No broker session.<br />No execution permissions.</p><Link to="/setup" className="flex items-center justify-between text-xs text-primary">Data connection setup<ArrowUpRight size={14} /></Link></div>
      </aside>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/20 px-4 py-2.5 lg:px-7"><div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground"><span className="font-medium text-foreground">NSE • F&O</span><span className="h-3 border-l border-border" /><span>SIMULATED OHLCV</span><span className={state.now - state.receivedAt > state.config.maxAgeMs ? "text-bear" : "text-muted-foreground"}>{state.now - state.receivedAt > state.config.maxAgeMs ? "STALE" : "Generated"} {formatTime(state.receivedAt)} IST</span></div><div className="flex items-center gap-2"><select aria-label="Auto refresh" value={state.interval} onChange={(e) => state.setInterval(Number(e.target.value))} className="h-8 rounded border border-border bg-background px-2 text-[11px]"><option value={0}>Auto refresh off</option><option value={30}>Every 30s</option><option value={60}>Every 60s</option></select><Button variant="outline" size="sm" onClick={() => void state.refresh()} disabled={state.loading}><RefreshCw className={state.loading ? "animate-spin" : ""} />{state.loading ? "Scanning…" : "Refresh scan"}</Button><Button variant="ghost" size="icon" aria-label="Export all demo scans" title="Export all demo scans" onClick={() => exportCSV("neotrader-demo-scans.csv", [["Source", "Symbol", "Status", "Score", "Generated IST", "Reasons"], ...state.rows.map((s) => [s.source, s.instrument.symbol, s.status, s.score, formatTime(s.receivedAt), s.reasons.join("; ")])])}><Download /></Button></div></div>
        {state.error && <div role="alert" className="border-b border-bear/40 bg-bear/10 px-5 py-3 text-sm text-bear">{state.error}</div>}
        <main className="mx-auto max-w-[1600px] px-4 py-6 lg:px-7">{children}<footer className="mt-8 border-t border-border py-4 text-[10px] leading-relaxed text-muted-foreground">SIMULATED / DEMO • Rule-based research, not an AI prediction or investment advice. Unbacktested, no broker connection, no orders. Confirmation means rules passed on closed demo candles, not a guaranteed outcome. Consult a SEBI-registered adviser before trading derivatives.</footer></main>
      </div>
    </div>
  </div>;
}