import { describe, expect, it } from "vitest";
import { analyzeFrame, isStale, scanInstrument } from "@/lib/research/engine";
import { DEFAULT_CONFIG, SCAN_TFS, type Bar, type ResearchSignal } from "@/lib/research/types";
import { demoBars, FIXTURE_END, makeDemoOptions, sequenceFixture, UNIVERSE } from "@/lib/research/provider";
import { assessOption } from "@/lib/research/options";

const instrument = UNIVERSE.find((i) => i.symbol === "RELIANCE");
if (!instrument) throw new Error("Demo RELIANCE fixture required");
const signal = () => scanInstrument(instrument, demoBars(instrument, 1), FIXTURE_END, FIXTURE_END);
describe("Deterministic SMC research", () => {
  it("uses Weekly, Daily, 1H, 15m and 5m exactly", () => expect(SCAN_TFS).toEqual(["Weekly", "Daily", "1H", "15m", "5m"]));
  it("produces identical output from identical inputs", () => expect(signal()).toEqual(signal()));
  it("detects the ordered sweep → CHoCH → FVG retest fixture", () => {
    const frame = analyzeFrame(sequenceFixture(), "5m");
    expect(frame.sequence.sweep).not.toBeNull(); expect(frame.sequence.choch).not.toBeNull(); expect(frame.sequence.retest).not.toBeNull();
    expect(frame.sequence.sweep ?? 1000).toBeLessThan(frame.sequence.choch ?? 0);
    expect(frame.sequence.choch ?? 1000).toBeLessThan(frame.sequence.retest ?? 0);
  });
  it("does not confirm swings before right-side bars close", () => {
    const bars: Bar[] = [1,2,5,2,1].map((v,i) => ({time:i,o:v,c:v,h:v+0.1,l:v-0.1,v:100}));
    expect(analyzeFrame(bars.slice(0,4),"5m").events.some(e=>e.kind==="Swing high")).toBe(false);
    expect(analyzeFrame(bars,"5m").events.find(e=>e.kind==="Swing high")?.index).toBe(4);
  });
  it("RSI14 stays within 0–100 and relative volume uses prior 20 bars", () => {
    const f=analyzeFrame(sequenceFixture(),"5m");
    expect(f.rsi).toBeGreaterThanOrEqual(0);expect(f.rsi).toBeLessThanOrEqual(100);expect(f.relVolume).toBe(2.4);
  });
  it("distinguishes retested and close-invalidated FVG zones", () => {
    const fixture=sequenceFixture();const first=analyzeFrame(fixture,"5m");
    expect(first.zones.some(z=>z.kind==="FVG" && z.state==="Mitigated")).toBe(true);
    const invalid=analyzeFrame([...fixture,{time:FIXTURE_END+300000,o:100,c:90,h:101,l:89,v:10000}],"5m");
    expect(invalid.zones.filter(z=>z.kind==="FVG" && z.direction==="Bullish").every(z=>z.state==="Invalidated")).toBe(true);
  });
  it("turning FVG detection off prevents the preferred sequence and plan", () => {
    const result=scanInstrument(instrument,demoBars(instrument,1),FIXTURE_END,FIXTURE_END,{...DEFAULT_CONFIG,enabled:{...DEFAULT_CONFIG.enabled,fvg:false}});
    expect(result.frames["15m"].zones.some(z=>z.kind==="FVG")).toBe(false);expect(result.plan).toBeNull();
  });
  it("blocks stale data after the 120-second threshold", () => {
    expect(isStale(FIXTURE_END,FIXTURE_END+120000,120000)).toBe(false);
    const stale=scanInstrument(instrument,demoBars(instrument,1),FIXTURE_END,FIXTURE_END+120001);
    expect(stale.status).toBe("No trade");expect(stale.plan).toBeNull();
  });
  it("blocks a trade with missing higher timeframe candles", () => {
    const bars=demoBars(instrument,1);const result=scanInstrument(instrument,{...bars,Weekly:[]},FIXTURE_END,FIXTURE_END);
    expect(result.plan).toBeNull();expect(result.status).toBe("No trade");
  });
  it("component points sum to the published score (out of 100)", () => {
    const s=signal();expect(s.parts.reduce((n,p)=>n+p.max,0)).toBe(100);expect(s.score).toBe(s.parts.reduce((n,p)=>n+p.points,0));
  });
});
describe("Option-buying safeguards", () => {
  const contract=makeDemoOptions(instrument,"DEMO",1480,1,FIXTURE_END)[10];
  if(!contract)throw new Error("Demo option fixture required");
  const approved: ResearchSignal={...signal(),stale:false,plan:{direction:"Bullish",entryLow:100,entryHigh:101,entry:101,stop:100,targets:[104,106,108],rr:3,confirmation:"Confirmed on demo bars",levels:"Estimated structure levels"}};
  it("requires an underlying plan",()=>expect(assessOption(contract,{...approved,plan:null},FIXTURE_END).eligible).toBe(false));
  it("rejects PE buying after bullish underlying confirmation",()=>expect(assessOption({...contract,type:"PE"},approved,FIXTURE_END).reasons).toContain("Direction mismatch: buying only the confirmed CE/PE side"));
  it("rejects illiquid contracts below 1000 volume",()=>expect(assessOption({...contract,volume:999},approved,FIXTURE_END).eligible).toBe(false));
  it("rejects bid-ask spread above 2 percent",()=>expect(assessOption({...contract,bid:90,ask:110,premium:100},approved,FIXTURE_END).eligible).toBe(false));
  it("rejects premium R:R below 1.5",()=>expect(assessOption({...contract,bid:99.8,ask:100,premium:100}, {...approved,plan:{...approved.plan as NonNullable<ResearchSignal['plan']>,targets:[101.2,102,103]}},FIXTURE_END).eligible).toBe(false));
  it("rejects stale quotes",()=>expect(assessOption(contract,approved,FIXTURE_END+120001).eligible).toBe(false));
  it("does not invent Greek values the provider lacks",()=>{expect(contract.gamma).toBeNull();expect(contract.theta).toBeNull();expect(contract.ivPercentile).toBeNull()});
});