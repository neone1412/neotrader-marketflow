import { isStale } from "./engine";
import { DEFAULT_CONFIG, type EngineConfig, type OptionAssessment, type OptionContract, type ResearchSignal } from "./types";

export function assessOption(contract: OptionContract, signal: ResearchSignal, now: number, config: EngineConfig = DEFAULT_CONFIG): OptionAssessment {
  const spreadPct = contract.premium > 0 ? (contract.ask - contract.bid) / contract.premium * 100 : Infinity;
  const reasons: string[] = [];
  if (!signal.plan || signal.stale || isStale(signal.receivedAt, now, config.maxAgeMs)) reasons.push("Underlying not confirmed or stale");
  if (contract.symbol !== signal.instrument.symbol) reasons.push("Contract underlying does not match confirmation");
  if (signal.plan && contract.type !== (signal.plan.direction === "Bullish" ? "CE" : "PE")) reasons.push("Direction mismatch: buying only the confirmed CE/PE side");
  if (isStale(contract.receivedAt, now, config.maxAgeMs)) reasons.push("Stale option quote");
  if (contract.volume < config.minOptionVolume || contract.oi < 10000) reasons.push("Illiquid: volume or OI below minimum");
  if (spreadPct > config.maxSpreadPct || contract.bid <= 0 || contract.ask < contract.bid) reasons.push(`Wide/invalid bid–ask spread (limit ${config.maxSpreadPct}%)`);
  if (contract.delta === null || Math.abs(contract.delta) < 0.3 || Math.abs(contract.delta) > 0.8) reasons.push("Usable delta unavailable or outside 0.30–0.80");
  if (!Number.isInteger(contract.lotSize) || contract.lotSize <= 0) reasons.push("Invalid lot size");
  // First-order delta approximation only; no fabricated option-premium historical stop.
  const plan = signal.plan;
  const delta = Math.abs(contract.delta ?? 0);
  const stop = plan && delta ? contract.ask - Math.abs(plan.entry - plan.stop) * delta : null;
  const targets: [number, number, number] | null = plan && delta ? [contract.ask + Math.abs(plan.targets[0] - plan.entry) * delta, contract.ask + Math.abs(plan.targets[1] - plan.entry) * delta, contract.ask + Math.abs(plan.targets[2] - plan.entry) * delta] : null;
  const risk = stop === null ? 0 : contract.ask - stop;
  const rr = targets && risk > 0 ? (targets[0] - contract.ask - (contract.ask - contract.bid)) / risk : null;
  if (stop !== null && stop <= 0) reasons.push("Premium SL estimate is non-positive");
  if (rr === null || rr < config.minRR) reasons.push(`Poor/unavailable premium R:R (minimum ${config.minRR})`);
  const eligible = reasons.length === 0;
  return { contract, eligible, reasons, spreadPct, stop: eligible ? stop : null, targets: eligible ? targets : null, rr, rank: eligible ? Math.log10(Math.max(1, contract.volume)) * 10 - spreadPct * 3 - Math.abs((Math.abs(contract.delta ?? 0)) - 0.5) * 10 : 0 };
}
export function rankOptions(contracts: OptionContract[], signal: ResearchSignal, now: number, config: EngineConfig = DEFAULT_CONFIG) { return contracts.map((c) => assessOption(c, signal, now, config)).sort((a, b) => b.rank - a.rank); }