export interface LotInput {
  capital: number;
  riskPct: number;
  entry: number;
  stop: number;
  lotSize: number;
}

export function computeLots({ capital, riskPct, entry, stop, lotSize }: LotInput) {
  const riskBudget = Math.max(0, (capital * riskPct) / 100);
  const perUnitRisk = entry - stop;
  const perLotRisk = perUnitRisk * lotSize;
  const perLotCost = entry * lotSize;
  const valid = perUnitRisk > 0 && lotSize > 0 && entry > 0;
  const lotsByRisk = valid ? Math.floor(riskBudget / perLotRisk) : 0;
  const lotsByCapital = valid ? Math.floor(capital / perLotCost) : 0;
  const lots = Math.max(0, Math.min(lotsByRisk, lotsByCapital));
  return {
    valid,
    riskBudget,
    perLotRisk,
    perLotCost,
    lotsByRisk,
    lotsByCapital,
    lots,
    cappedByCapital: valid && lotsByCapital < lotsByRisk,
    totalCost: lots * perLotCost,
    totalRisk: lots * perLotRisk,
  };
}

export function ema(values: number[], n: number) {
  const k = 2 / (n + 1);
  const out: number[] = [];
  values.forEach((v, i) => out.push(i === 0 ? v : v * k + out[i - 1] * (1 - k)));
  return out;
}

export type OIClass = "Long buildup" | "Short buildup" | "Short covering" | "Long unwinding";
export function classifyOI(priceChg: number, oiChg: number): OIClass {
  if (priceChg >= 0) return oiChg >= 0 ? "Long buildup" : "Short covering";
  return oiChg >= 0 ? "Short buildup" : "Long unwinding";
}
