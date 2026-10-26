import { describe, it, expect } from "vitest";
import { computeLots, classifyOI } from "@/lib/calc";

describe("computeLots", () => {
  it("default ₹7,000 at 1% gives ₹70 risk budget", () => {
    expect(computeLots({ capital: 7000, riskPct: 1, entry: 10, stop: 9, lotSize: 25 }).riskBudget).toBe(70);
  });
  it("floors lots by risk budget", () => {
    expect(computeLots({ capital: 7000, riskPct: 1, entry: 10, stop: 9, lotSize: 25 }).lots).toBe(2);
  });
  it("returns 0 lots when one lot exceeds risk", () => {
    expect(computeLots({ capital: 7000, riskPct: 1, entry: 100, stop: 90, lotSize: 75 }).lots).toBe(0);
  });
  it("caps by capital affordability", () => {
    const r = computeLots({ capital: 7000, riskPct: 1, entry: 150, stop: 149.9, lotSize: 25 });
    expect(r.lots).toBe(1);
    expect(r.cappedByCapital).toBe(true);
  });
  it("stop above entry is invalid", () => {
    expect(computeLots({ capital: 7000, riskPct: 1, entry: 10, stop: 12, lotSize: 25 }).lots).toBe(0);
  });
});

describe("classifyOI", () => {
  it("maps four quadrants", () => {
    expect(classifyOI(1, 1)).toBe("Long buildup");
    expect(classifyOI(-1, 1)).toBe("Short buildup");
    expect(classifyOI(1, -1)).toBe("Short covering");
    expect(classifyOI(-1, -1)).toBe("Long unwinding");
  });
});
