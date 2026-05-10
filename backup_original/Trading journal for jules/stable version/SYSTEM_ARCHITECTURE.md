# BASIC JOURNAL V1.5.2-IBKR SYSTEM ARCHITECTURE

```
┌────────────────────────────────────────────────────────────────────────────┐
│                        BASIC JOURNAL FRONTEND                              │
│                          (Your Web Browser)                                │
│                                                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │ NAVBAR                                                                │ │
│  │  [Dashboard] [Ledger] [Wallet] [Study Lab] [Predictor]               │ │
│  │                                    [Yahoo] ← Toggle → [IBKR] [Refresh]│ │
│  └──────────────────────────────────────────────────────────────────────┘ │
│                                                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │ HOLDINGS TABLE                                                        │ │
│  │ ┌────────┬──────┬──────┬────────┬──────────┬──────────┐              │ │
│  │ │ Ticker │ Qty  │ Avg  │ Market │ Unr. P&L │ Gain %   │              │ │
│  │ ├────────┼──────┼──────┼────────┼──────────┼──────────┤              │ │
│  │ │ AAPL   │  100 │ $150 │ $178 ← │  +$2,800 │  +18.7%  │              │ │
│  │ │ TSLA   │   50 │ $220 │ $242 ← │  +$1,100 │  +10.0%  │              │ │
│  │ └────────┴──────┴──────┴────────┴──────────┴──────────┘              │ │
│  │                          ↑                                            │ │
│  │                    Market Price                                       │ │
│  │              (Updates when you click Refresh)                         │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
│                                                                            │
└──────────────────────────┬─────────────────────────────────────────────────┘
                           │
                           │ Click Refresh
                           ↓
                    ┌──────────────┐
                    │  engine.js   │
                    │ fetchPrices()│
                    └──────┬───────┘
                           │
              ┌────────────┴────────────┐
              │                         │
       Toggle OFF                 Toggle ON
       (Default)                  (IBKR Mode)
              │                         │
              ↓                         ↓
    ┌─────────────────┐      ┌──────────────────────┐
    │ YAHOO FINANCE   │      │  IBKR BRIDGE API     │
    │  + PHISIX API   │      │  (Flask Server)      │
    │                 │      │  Port 5001           │
    │ Free, Public    │      │  http://127.0.0.1    │
    │ 15-min delay    │      │                      │
    └─────────────────┘      └──────────┬───────────┘
              │                         │
              │                         │ ib_insync library
              │                         ↓
              │              ┌──────────────────────┐
              │              │  TWS / IB GATEWAY    │
              │              │  Port 7497 (Live)    │
              │              │  Port 7496 (Paper)   │
              │              │                      │
              │              │  Interactive Brokers │
              │              └──────────┬───────────┘
              │                         │
              │                         │ IBKR API
              │                         ↓
              │              ┌──────────────────────┐
              │              │   IBKR SERVERS       │
              │              │   (Real-time Data)   │
              │              └──────────────────────┘
              │
              ↓
    ┌─────────────────────────────────────┐
    │  Public Market Data Providers       │
    │  - Yahoo Finance (US Stocks/Forex)  │
    │  - Phisix API (PSE Stocks)          │
    └─────────────────────────────────────┘
```

---

## DATA FLOW: WHEN YOU CLICK "REFRESH"

### MODE 1: Yahoo/Phisix (Toggle OFF)

```
User clicks Refresh
     │
     ↓
UI calls fetchPrices(positions, useIBKR=false)
     │
     ├─→ PSE Stocks   → https://phisix-api4.appspot.com/stocks.json
     │                  └─→ Returns: { "stock": [{"symbol": "ALI", "price": {"amount": 35.50}}] }
     │
     └─→ US Stocks    → https://query1.finance.yahoo.com/v7/finance/quote?symbols=AAPL,TSLA
                        └─→ Returns: { "quoteResponse": { "result": [{"symbol": "AAPL", "regularMarketPrice": 178.45}] }}
     │
     ↓
Prices merged into: { "AAPL": 178.45, "TSLA": 242.80, "ALI": 35.50 }
     │
     ↓
UI updates mktPx state → Table re-renders with new prices
```

### MODE 2: IBKR (Toggle ON)

```
User clicks Refresh
     │
     ↓
UI calls fetchPrices(positions, useIBKR=true)
     │
     ├─→ PSE Stocks   → https://phisix-api4.appspot.com/stocks.json (unchanged)
     │
     └─→ US Stocks    → POST http://127.0.0.1:5001/prices
                        Body: { "positions": [
                                  {"ticker": "AAPL", "exchange": "NASDAQ"},
                                  {"ticker": "TSLA", "exchange": "NASDAQ"}
                                ]}
          │
          ↓
     Flask API receives request
          │
          ↓
     ib_insync connects to TWS (port 7497)
          │
          ↓
     For each ticker:
       - Create Stock contract
       - Qualify contract (resolve ambiguities)
       - Request market data snapshot
       - Wait for tick (1.5 seconds)
       - Extract price (last → close → bid/ask midpoint)
       - Cancel subscription
          │
          ↓
     Flask returns: { "success": true, "prices": {"AAPL": 178.45, "TSLA": 242.80} }
          │
          ↓
Prices merged with PSE data
     │
     ↓
UI updates mktPx state → Table re-renders
```

---

## FILE RESPONSIBILITIES

```
index.html
├─ Loads React, Babel
├─ Defines <div id="root">
└─ Loads scripts in order: engine.js → ui.js

styles.css
├─ Obsidian Slick 2.0 theme
├─ Dark mode colors
└─ Button styles (including IBKR toggle)

engine.js (THE BRAIN)
├─ calculatePositions() - Portfolio math (Option A recovery)
├─ fetchPrices(positions, useIBKR) - Dual-mode price fetcher
│   ├─ If useIBKR=false → Yahoo + Phisix
│   └─ If useIBKR=true  → IBKR API + Phisix
└─ Exposes: window.BasicEngine

ui.js (THE INTERFACE)
├─ App Component
│   ├─ State: useIBKR (toggle state)
│   ├─ doRefresh() - calls fetchPrices(enriched, useIBKR)
│   └─ Navbar with IBKR/Yahoo toggle button
├─ PositionsTable - Displays holdings with Market Px column
└─ TradeForm - Buy/Sell interface

ibkr_bridge.py (THE MIDDLEWARE)
├─ Flask API server (port 5001)
├─ Endpoint: POST /prices
├─ IBKRPriceEngine class
│   ├─ connect() - Establish TWS connection
│   ├─ get_price(symbol, exchange) - Fetch single ticker
│   ├─ batch_fetch(positions) - Fetch multiple tickers
│   └─ disconnect() - Clean shutdown
└─ Error handling + CORS support

ibkr_config.json
├─ TWS connection settings (host, port, client_id)
└─ Flask server settings (port, debug mode)
```

---

## SECURITY BOUNDARIES

```
┌──────────────────────────────────────────────────────────┐
│  INTERNET                                                 │
│  (Public APIs - Yahoo Finance, Phisix)                   │
└────────────────────┬─────────────────────────────────────┘
                     │
                     │ HTTPS (read-only, no auth required)
                     ↓
            ┌────────────────────┐
            │  Your Browser      │
            │  (Basic Journal)   │
            └────────┬───────────┘
                     │
         ┌───────────┴───────────┐
         │                       │
    Yahoo Mode              IBKR Mode
         │                       │
         ↓                       ↓
    Public APIs        ┌──────────────────┐
                       │ Flask API        │
                       │ (127.0.0.1:5001) │ ← localhost only
                       └────────┬─────────┘
                                │
                                ↓
                       ┌──────────────────┐
                       │ TWS/Gateway      │
                       │ (127.0.0.1:7497) │ ← localhost only
                       └────────┬─────────┘
                                │
                                │ Authenticated connection
                                ↓
                       ┌──────────────────┐
                       │ IBKR Servers     │
                       │ (Your Account)   │
                       └──────────────────┘

KEY SECURITY FEATURES:
✅ Flask API bound to 127.0.0.1 (not exposed to network)
✅ TWS configured for localhost connections only
✅ IBKR connection is readonly=True (can't place orders)
✅ CORS restricted to localhost origins
✅ No API keys stored in frontend code
```

---

## TESTING MATRIX

| Scenario | Expected Behavior |
|----------|-------------------|
| IBKR Mode + TWS Running + Valid Ticker | ✅ Real-time price |
| IBKR Mode + TWS Closed | ❌ Toast: "Failed to connect to IBKR" |
| IBKR Mode + Invalid Ticker | ⚠️ No price, but doesn't break UI |
| IBKR Mode + PSE Stock (e.g., ALI) | ✅ Uses Phisix API (IBKR doesn't support PSE) |
| Yahoo Mode + Any Ticker | ✅ Uses Yahoo/Phisix (no local server needed) |
| Toggle IBKR ON/OFF | ✅ Instant switch, persists in session |
| Market Closed | ⚠️ Returns last close price (not live) |

---

**This diagram is your debugging reference. When something breaks, trace the flow.**
