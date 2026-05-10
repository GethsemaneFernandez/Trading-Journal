# 🚀 BASIC JOURNAL V1.5.2-IBKR: INSTALLATION & SETUP GUIDE

## 📋 WHAT'S NEW IN V1.5.2-IBKR

This version integrates **real-time IBKR price feeds** into Basic Journal. You now have TWO price sources:

1. **Yahoo/Phisix Mode** (Default) - Free public APIs
2. **IBKR Mode** - Real-time prices from your Interactive Brokers account

---

## 🏗️ ARCHITECTURE OVERVIEW

```
┌─────────────────────┐
│  Basic Journal UI   │ (Your Browser)
│   (index.html)      │
└──────────┬──────────┘
           │
           ├─── Toggle OFF → Yahoo Finance + Phisix API
           │
           └─── Toggle ON  → IBKR Bridge API (Flask)
                             └─→ ib_insync Library
                                 └─→ TWS/Gateway (Port 7497)
                                     └─→ IBKR Servers
```

---

## 📦 INSTALLATION

### STEP 1: Install Python Dependencies

```bash
# Install required libraries
pip install flask flask-cors ib_insync

# Verify installation
python -c "import flask, ib_insync; print('✓ Dependencies installed')"
```

### STEP 2: Configure Interactive Brokers TWS/Gateway

1. **Open TWS or IB Gateway**
2. **Enable API Access:**
   - Navigate to: `Edit → Global Configuration → API → Settings`
   - Check: ✅ `Enable ActiveX and Socket Clients`
   - Check: ✅ `Allow connections from localhost only` (for security)
   - Add `127.0.0.1` to **Trusted IP Addresses**
   - **Port Settings:**
     - TWS Live: `7497`
     - TWS Paper: `7496`
     - Gateway Live: `4001`
     - Gateway Paper: `4002`

3. **Disable Read-Only API:**
   - Uncheck: ❌ `Read-Only API`
   - (We need market data permissions, not trading)

4. **Click OK** and restart TWS/Gateway

### STEP 3: Configure IBKR Bridge

Edit `ibkr_config.json` to match your setup:

```json
{
  "ibkr": {
    "host": "127.0.0.1",
    "port": 7497,           ← Change to 7496 for paper trading
    "client_id": 10,        ← Unique ID (1-32, avoid conflicts)
    "timeout": 10
  },
  "server": {
    "host": "127.0.0.1",
    "port": 5001,           ← Flask API port
    "debug": false
  }
}
```

---

## 🚀 USAGE

### STEP 1: Start IBKR Bridge API

```bash
# In your terminal
python ibkr_bridge.py
```

**Expected Output:**
```
════════════════════════════════════════════════════════════
BASIC JOURNAL - IBKR BRIDGE API
════════════════════════════════════════════════════════════
IBKR Target: 127.0.0.1:7497
API Server: http://127.0.0.1:5001
════════════════════════════════════════════════════════════
Press CTRL+C to stop
════════════════════════════════════════════════════════════
 * Running on http://127.0.0.1:5001
```

**⚠️ LEAVE THIS TERMINAL RUNNING** - This is your price bridge!

### STEP 2: Open Basic Journal

```bash
# Option A: Open index.html directly in browser
open index.html   # macOS
start index.html  # Windows
xdg-open index.html  # Linux

# Option B: Use a local web server (recommended)
python -m http.server 8000
# Then visit: http://localhost:8000
```

### STEP 3: Toggle IBKR Mode

1. Look at the **top navbar** (right side)
2. Find the button that says **"Yahoo"** (default mode)
3. **Click it** → It changes to **"IBKR"** (green when active)
4. Click **"Refresh"** to fetch prices

**Visual Indicators:**
- 🟢 **Green "IBKR"** = Using real-time IBKR prices
- ⚪ **Gray "Yahoo"** = Using free Yahoo/Phisix APIs

---

## 🔍 HOW IT WORKS

### When You Click "Refresh":

**IBKR Mode ON:**
```
1. Frontend sends positions to http://127.0.0.1:5001/prices
2. Flask API connects to TWS/Gateway
3. ib_insync fetches live market data
4. Prices stream back to UI
5. PSE stocks still use Phisix (IBKR doesn't support PSE)
```

**IBKR Mode OFF:**
```
1. Frontend calls Yahoo Finance API (NASDAQ/NYSE)
2. Frontend calls Phisix API (PSE stocks)
3. No local server needed
```

---

## 🎯 WHICH STOCKS GET IBKR PRICES?

| Exchange | IBKR Mode | Yahoo Mode |
|----------|-----------|------------|
| **PSE** (Philippine) | ❌ Phisix API | ✅ Phisix API |
| **NASDAQ** | ✅ IBKR Real-time | ✅ Yahoo Finance |
| **NYSE** | ✅ IBKR Real-time | ✅ Yahoo Finance |
| **FOREX** | ✅ IBKR Real-time | ✅ Yahoo Finance |
| **CRYPTO** | ⚠️ Limited (PAXOS) | ✅ Yahoo Finance |

**Why no PSE on IBKR?**
Interactive Brokers doesn't provide data for Philippine Stock Exchange. The system automatically uses Phisix API for PSE tickers regardless of mode.

---

## ⚙️ ADVANCED CONFIGURATION

### Changing IBKR Connection Port

Edit `ibkr_config.json`:

```json
{
  "ibkr": {
    "port": 7496  // Paper trading
  }
}
```

### Using IB Gateway Instead of TWS

Gateway uses different ports:
- Live: `4001`
- Paper: `4002`

Update config:
```json
{
  "ibkr": {
    "port": 4001
  }
}
```

### Troubleshooting Client ID Conflicts

If you see `clientId already in use`, change it:

```json
{
  "ibkr": {
    "client_id": 15  // Try different number (1-32)
  }
}
```

---

## 🐛 TROUBLESHOOTING

### Problem: "Connection refused" when clicking Refresh

**Diagnosis:**
```bash
# Test if API is running
curl http://127.0.0.1:5001/health
```

**Solutions:**
1. ✅ Start `ibkr_bridge.py` in terminal
2. ✅ Check Flask is running on port 5001
3. ✅ Verify TWS/Gateway is running

---

### Problem: "Failed to connect to IBKR"

**Check TWS Settings:**
```
1. TWS → Edit → Global Configuration → API → Settings
2. Verify "Enable ActiveX and Socket Clients" is CHECKED
3. Verify port matches ibkr_config.json (usually 7497)
4. Add 127.0.0.1 to Trusted IPs
5. Restart TWS
```

**Check Firewall:**
```bash
# macOS/Linux: Allow port 7497
sudo ufw allow 7497

# Windows: Add firewall exception for TWS
```

---

### Problem: Some tickers return no price

**Expected Behavior:**
- Invalid tickers (typos) → No price returned
- Market closed → Returns last close price
- No market data subscription → API returns error

**Check IBKR Subscriptions:**
1. Log into IBKR Account Management
2. Navigate to: `Settings → Market Data Subscriptions`
3. Verify you have data for:
   - US Securities Snapshot (free)
   - Real-time quotes (if you have an active subscription)

---

### Problem: "CORS Error" in browser console

**Solution:**
The Flask API already has CORS enabled. If you still see errors:

1. Use a local web server instead of `file://` protocol:
   ```bash
   python -m http.server 8000
   ```

2. Open: `http://localhost:8000/index.html`

---

## 📊 TESTING THE INTEGRATION

### Test Checklist:

1. **Start TWS/Gateway** ✅
2. **Run `python ibkr_bridge.py`** ✅
3. **Open Basic Journal in browser** ✅
4. **Add a test position:**
   - Ticker: `AAPL`
   - Exchange: `NASDAQ`
   - Buy 10 shares @ $150
5. **Toggle to IBKR mode** ✅
6. **Click Refresh** ✅
7. **Verify:**
   - Toast message shows "✓ Prices updated via IBKR"
   - Market Price column updates
   - Check browser console for errors

---

## 🔒 SECURITY NOTES

### Port Exposure
- **5001** (Flask API) → Only accessible from `127.0.0.1`
- **7497** (TWS) → Should be localhost-only
- **DO NOT** expose these ports to the internet

### Read-Only Mode
The IBKR connection is set to `readonly=True`:
```python
self.ib.connect(
    readonly=True  # ← Prevents accidental order placement
)
```

This means the API can ONLY:
- ✅ Fetch market prices
- ✅ Read account data
- ❌ Place orders
- ❌ Modify positions

---

## 🚦 PRODUCTION DEPLOYMENT (Optional)

For a more robust setup:

### 1. Use Process Manager

```bash
# Install PM2 (Node.js process manager)
npm install -g pm2

# Create ecosystem.config.js
module.exports = {
  apps: [{
    name: 'ibkr-bridge',
    script: 'ibkr_bridge.py',
    interpreter: 'python3',
    restart_delay: 5000
  }]
}

# Start with PM2
pm2 start ecosystem.config.js
pm2 save
```

### 2. Add Connection Pooling

Modify `ibkr_bridge.py` to keep one persistent connection instead of reconnecting per request (reduces latency).

### 3. Add Caching

Implement Redis/Memcached to cache prices for 1-2 seconds (reduces IBKR API load).

---

## 📝 FILES INCLUDED

| File | Purpose |
|------|---------|
| `index.html` | Main HTML shell |
| `styles.css` | Obsidian Slick 2.0 styling |
| `engine.js` | Financial calculations + dual price fetcher |
| `ui.js` | React UI with IBKR toggle |
| `ibkr_bridge.py` | Flask API server |
| `ibkr_config.json` | Configuration file |
| `babel_min.js` | JSX transpiler |

---

## 🆘 SUPPORT

### Common Questions

**Q: Do I need an IBKR subscription for real-time data?**
A: No, but you'll get 15-min delayed quotes without one. US Securities Snapshot is free.

**Q: Can I use this with paper trading account?**
A: Yes! Change port to `7496` in `ibkr_config.json`.

**Q: Does this work with cryptocurrency?**
A: Limited. IBKR only supports crypto via PAXOS exchange (limited pairs).

**Q: Will this place trades automatically?**
A: NO. The connection is read-only. It ONLY fetches prices.

**Q: Can I run this on a server?**
A: Yes, but you'll need TWS/Gateway running on that server.

---

## 🎓 NEXT STEPS

1. **Test with paper trading first** (port 7496)
2. **Add your real positions** once comfortable
3. **Set up auto-refresh** (modify ui.js to call `doRefresh()` every 30s)
4. **Explore the Study Lab** for scenario modeling

---

## 📞 DEBUGGING LOGS

### Enable Debug Mode

Edit `ibkr_config.json`:
```json
{
  "server": {
    "debug": true  // ← Enable Flask debug output
  }
}
```

Restart `ibkr_bridge.py` to see detailed request logs.

### Check Browser Console

Press `F12` → Console tab to see:
- API request/response details
- Network errors
- Price update confirmations

---

**Built with ruthless precision for the sovereign trader.**

**Version:** 1.5.2-IBKR
**Last Updated:** 2024-01-15
**Architect:** Jarvis (Agentic AI) + User Co-Founder
