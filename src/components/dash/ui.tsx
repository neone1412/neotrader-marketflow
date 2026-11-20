import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function Panel({ title, right, children, className }: { title?: ReactNode; right?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-lg border border-border bg-card p-3 md:p-4", className)}>
      {(title || right) && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
          {right}
        </div>
      )}
      {children}
    </section>
  );
}

export function Stat({ label, value, tone }: { label: string; value: ReactNode; tone?: "bull" | "bear" | "warn" | "info" | "violet" }) {
  return (
    <div className="rounded-md border border-border bg-muted/40 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={cn("font-mono text-base font-semibold", tone && { bull: "text-bull", bear: "text-bear", warn: "text-warn", info: "text-info", violet: "text-violet" }[tone])}>{value}</div>
    </div>
  );
}

export function Seg<T extends string | number>({ options, value, onChange, label }: { options: readonly T[]; value: T; onChange: (v: T) => void; label?: (v: T) => string }) {
  return (
    <div className="inline-flex rounded-md border border-border bg-muted/40 p-0.5">
      {options.map((o) => (
        <Button variant="ghost" size="sm"
          key={String(o)}
          onClick={() => onChange(o)}
          className={cn(
            "rounded px-2.5 py-1 font-mono text-xs transition-colors",
            o === value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {label ? label(o) : String(o)}
        </Button>
      ))}
    </div>
  );
}

export function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: readonly string[] }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className="rounded-md border border-border bg-input px-2 py-1 text-xs text-foreground">
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

export function Tag({ children, tone = "info" }: { children: ReactNode; tone?: "bull" | "bear" | "warn" | "info" | "violet" | "muted" }) {
  const map = {
    bull: "bg-bull/15 text-bull", bear: "bg-bear/15 text-bear", warn: "bg-warn/15 text-warn",
    info: "bg-info/15 text-info", violet: "bg-violet/15 text-violet", muted: "bg-muted text-muted-foreground",
  };
  return <span className={cn("inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide", map[tone])}>{children}</span>;
}

export const Note = ({ children }: { children: ReactNode }) => (
  <p className="mt-3 rounded-md border border-warn/30 bg-warn/5 px-3 py-2 text-[11px] text-muted-foreground">{children}</p>
);

export const fmt = (n: number, d = 2) => n.toLocaleString("en-IN", { minimumFractionDigits: d, maximumFractionDigits: d });
export const fmtL = (n: number) => (Math.abs(n) >= 1e5 ? `${(n / 1e5).toFixed(1)}L` : Math.round(n).toLocaleString("en-IN"));
export const toneOf = (n: number) => (n >= 0 ? "text-bull" : "text-bear");
