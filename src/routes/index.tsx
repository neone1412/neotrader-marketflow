import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { MarketPulse, OptionPulse, OIFlow, MoneyFlow } from "@/components/dash/tabs-a";
import { StockRadar, LiquidityMap, TradeAssistant, RsiHeatmap, DataStatus } from "@/components/dash/tabs-b";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NeoTrader MarketFlow — NSE F&O Demo Dashboard" },
      { name: "description", content: "Prototype NSE F&O dashboard: OI flow map, option pulse, money flow, RSI heatmap. Simulated demo data only." },
      { property: "og:title", content: "NeoTrader MarketFlow — NSE F&O Demo Dashboard" },
      { property: "og:description", content: "OI flow, option pulse, RSI heatmap and trade assistant on simulated demo data." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

const TABS = ["Market Pulse", "Option Pulse", "Live OI Flow Map", "Money Flow", "Stock Radar", "Liquidity Map", "Trade Assistant", "RSI Heatmap", "Data Status"] as const;
type Tab = (typeof TABS)[number];

function Dashboard() {
  const [tab, setTab] = useState<Tab>("Market Pulse");
  const [seed, setSeed] = useState(1);
  const [ts, setTs] = useState("");
  const [interval, setIntervalSec] = useState(0);
  const refresh = useCallback(() => {
    setSeed((s) => s + 1);
    setTs(new Date().toLocaleTimeString("en-IN", { hour12: false }));
  }, []);
  useEffect(() => setTs(new Date().toLocaleTimeString("en-IN", { hour12: false })), []);
  useEffect(() => {
    if (!interval) return;
    const id = window.setInterval(refresh, interval * 1000);
    return () => window.clearInterval(id);
  }, [interval, refresh]);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 md:px-5">
          <div className="flex items-center gap-2">
            <div className="grid h-7 w-7 place-items-center rounded bg-primary font-mono text-xs font-bold text-primary-foreground">NT</div>
            <div>
              <div className="text-sm font-semibold leading-tight">NeoTrader <span className="text-info">MarketFlow</span></div>
              <div className="text-[10px] text-muted-foreground">NSE F&O • prototype</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded border border-warn/50 bg-warn/10 px-2 py-1 font-mono text-[10px] font-bold tracking-wider text-warn">DEMO DATA • NOT CONNECTED</span>
            <span className="hidden font-mono text-[10px] text-muted-foreground sm:inline">{ts}</span>
            <button onClick={refresh} className="rounded-md border border-border px-2 py-1 text-xs hover:bg-muted">↻ Refresh</button>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-2 md:px-5">
          {TABS.map((t) => (
            <button key={t} onClick={() => setTab(t)} className={cn("whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-colors", tab === t ? "bg-secondary text-foreground ring-1 ring-primary/60" : "text-muted-foreground hover:text-foreground")}>{t}</button>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-[1500px] p-3 md:p-5">
        {tab === "Market Pulse" && <MarketPulse seed={seed} />}
        {tab === "Option Pulse" && <OptionPulse seed={seed} />}
        {tab === "Live OI Flow Map" && <OIFlow seed={seed} />}
        {tab === "Money Flow" && <MoneyFlow seed={seed} />}
        {tab === "Stock Radar" && <StockRadar seed={seed} />}
        {tab === "Liquidity Map" && <LiquidityMap seed={seed} />}
        {tab === "Trade Assistant" && <TradeAssistant key={seed} seed={seed} />}
        {tab === "RSI Heatmap" && <RsiHeatmap seed={seed} />}
        {tab === "Data Status" && <DataStatus ts={ts} interval={interval} setInterval={setIntervalSec} refresh={refresh} />}
        <footer className="mt-6 border-t border-border pt-3 text-[11px] leading-relaxed text-muted-foreground">
          Educational prototype. All figures are simulated demo data, not live market data. Signals are rule-based and unbacktested and are not investment advice. No broker connection; no orders are placed. Consult a SEBI-registered adviser before trading derivatives.
        </footer>
      </main>
    </div>
  );
}
