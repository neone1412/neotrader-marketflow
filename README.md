# NeoTrader MarketFlow

Create a responsive dark institutional-style web dashboard called NeoTrader MarketFlow for Indian NSE F&O stocks and indices, inspired by the user's attached screenshots (OI flow map, mirrored Call/Put OI chart, money flow, multi-timeframe RSI heatmap). This is a frontend-first prototype; live integration comes later. No broker connection, no order placement, no API key. Use only clearly labeled simulated demo data and show "DEMO DATA • NOT CONNECTED" persistently; never claim live data.

Build a polished working app for Android and laptop with dark navy/charcoal palette, compact cards, green/teal/red/amber/violet signal colors, responsive charts and tables. Add functional tabs: Market Pulse; Option Pulse; Live OI Flow Map; Money Flow; Stock Radar; Liquidity Map; Trade Assistant; RSI Heatmap/Calm Zone; Data Status.

Market Pulse: demo NIFTY 50, BANKNIFTY, FINNIFTY and MIDCPNIFTY cards, market breadth, line/candle-like price chart with volume and timeframe buttons 5m/15m/1h/1D, EMA 5/9/13 only (never EMA50/200, MACD or ATR), support/resistance and price/OI view.

Option Pulse: symbol and expiry selectors, PCR, max pain, largest Call OI/Put OI, estimated writers range; mirrored horizontal bar chart with Put OI left and Call OI right, strike labels in center, current/ATM and max-pain lines, OI change markers, strike-count selector.

Live OI Flow Map: mirrored strike-wise bars, OI added/removed dots, simulated OI speed/min, hottest strikes, fastest Call/Put additions and biggest reductions. Legend and classifications: possible long buildup (price up + OI up), short buildup (price down + OI up), short covering (price up + OI down), long unwinding (price down + OI down). Note OI alone cannot establish intent.

Money Flow: sector-wise illustrative inflow/outflow horizontal bars and leading stocks. Clearly label as derived demo indicators, not actual institutional flows.

Stock Radar: searchable/sortable representative F&O sample list (RELIANCE, HDFCBANK, ICICIBANK, SBIN, INFY, TCS, LT, BHARTIARTL, AXISBANK, ITC, etc.) with demo LTP, % change, relative volume, OI change, PCR, trend, RSI on 5m/15m/1h/1D, EMA 5/9/13 alignment and setup score. Filters bullish/bearish, unusual volume, high OI change and sector. Do not claim sample list is the full current F&O universe.

Liquidity Map: demo swing highs/lows, equal highs/lows, liquidity pools, possible sweep/reclaim and BOS/CHOCH markers.

Trade Assistant: demo CE/PE candidates with underlying, strike, expiry, premium, rationale, entry, stop, targets, risk/reward and invalidation. Quantity calculator starts with ₹7,000 capital and 1% risk (₹70), editable premium, stop, lot size, and risk; compute whole lots as floor(risk budget / ((entry-stop)*lot size)), capped by capital affordability; lot size explicitly editable/demo, never assert it is current. No automatic orders.

RSI Heatmap/Calm Zone: symbol-by-timeframe RSI heatmap for 5m,15m,1h,daily; thresholds default 30/70; agreement count and calm-zone filter.

Data Status: demo/simulated, timestamp, refresh interval and "Not connected"; future provider placeholder. Never ask/store secrets in frontend. All interactions must work: navigation, search, sorting, filters, timeframe buttons, selectors, demo refresh updates timestamp/data, calculator recomputes. Use modular mock data so later live feed can replace it. Include educational disclaimer, state signals are rule-based/unbacktested and not investment advice. Deliver a cohesive usable dashboard, not a static landing page.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://neotrader-marketflow.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/6641e509-92b0-4b5e-85c5-b227f6d09969).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
