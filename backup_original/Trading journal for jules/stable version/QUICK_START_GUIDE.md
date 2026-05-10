# 🚀 BASIC JOURNAL V1.5.2-IBKR: COMPLETE SETUP GUIDE

## ❗ PROBLEMA NA NA-FIX

**Yung original issue:** Your `index.html` has **INLINE ui.js code** (hindi separate file). Kaya yung ginawa kong modifications sa separate `ui.js` file hindi na-apply.

**Solution:** Modified the INLINE version directly. Lahat ng changes nasa `index.html` na mismo.

---

## 📦 COMPLETE FILE LIST

```
basic-journal-ibkr/
├── index.html              ← MODIFIED (may IBKR toggle na)
├── engine.js               ← MODIFIED (may IBKR support na)
├── styles.css              ← ORIGINAL (walang changes)
├── babel_min.js            ← ORIGINAL (walang changes)
│
├── ibkr_bridge.py          ← NEW (Python Flask server)
├── ibkr_config.json        ← NEW (TWS settings)
├── test_ibkr_connection.py ← NEW (diagnostic tool)
│
├── IBKR_INTEGRATION_GUIDE.md     ← Documentation
├── SYSTEM_ARCHITECTURE.md        ← Technical diagrams
└── DEPLOYMENT_SUMMARY.md         ← This file
```

---

## 🎯 STEP-BY-STEP INSTALLATION

### PART 1: PYTHON SETUP (5 minutes)

```bash
# 1. Install Python dependencies
pip install flask flask-cors ib_insync

# 2. Verify installation
python -c "import flask, ib_insync; print('✅ OK')"
```

---

### PART 2: INTERACTIVE BROKERS SETUP (5 minutes)

1. **Open TWS or IB Gateway**

2. **Enable API:**
   - `Edit → Global Configuration → API → Settings`
   - ✅ Check: `Enable ActiveX and Socket Clients`
   - ✅ Check: `Allow connections from localhost only`
   - ✅ Add `127.0.0.1` to `Trusted IP Addresses`

3. **Note your port:**
   - TWS Live: `7497`
   - TWS Paper: `7496`
   - Gateway Live: `4001`
   - Gateway Paper: `4002`

4. **Edit `ibkr_config.json`:**
   ```json
   {
     "ibkr": {
       "port": 7497  ← Change to 7496 for paper trading
     }
   }
   ```

---

### PART 3: TEST CONNECTION (2 minutes)

```bash
# Run the diagnostic script
python test_ibkr_connection.py
```

**Expected Output:**
```
[TEST 1] Connecting to IBKR...
✅ Connected successfully!

[TEST 2] Fetching AAPL price...
✅ AAPL: $178.45 (LIVE)

[TEST 3] Fetching multiple tickers...
  ✅ TSLA   $242.84
  ✅ MSFT   $384.30
  ✅ GOOGL  $140.15

✅ Successfully fetched 3/3 prices
```

**Kung may error:**
- ❌ Check if TWS is running
- ❌ Check if API is enabled
- ❌ Check port number (7497 vs 7496)

---

### PART 4: START THE SERVER (1 minute)

```bash
# Terminal 1: Start Flask API
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
 * Running on http://127.0.0.1:5001
Press CTRL+C to stop
```

**⚠️ IMPORTANT: LEAVE THIS TERMINAL RUNNING!**

---

### PART 5: OPEN BASIC JOURNAL (1 minute)

```bash
# Option 1: Direct file open (may have CORS issues)
open index.html  # macOS
start index.html # Windows

# Option 2: Local web server (RECOMMENDED)
# Terminal 2:
python -m http.server 8000

# Then open browser:
http://localhost:8000/index.html
```

---

### PART 6: USE THE IBKR TOGGLE 🎉

1. **Find the toggle button:**
   - Top navbar, right side
   - Between `Refresh` and `USD VIEW` buttons
   - Default: Shows "Yahoo" (gray)

2. **Click the button:**
   - Changes to "IBKR" (green)
   - This switches to IBKR mode

3. **Click "Refresh":**
   - Fetches live prices from your IBKR account
   - Toast notification: "✓ Prices updated via IBKR (X tickers)"

4. **Verify in Flask terminal:**
   ```
   📊 Price request for 3 positions
   ✓ AAPL: $178.4500
   ✓ TSLA: $242.8000
   ✓ Fetched 2 prices, 0 failed
   ```

---

## 🔍 VISUAL GUIDE

### Before (Default Mode):
```
Navbar: [...] [Refresh] [Yahoo] ← Gray button
                          ↑
                    Free APIs (Yahoo/Phisix)
```

### After Clicking (IBKR Mode):
```
Navbar: [...] [Refresh] [IBKR] ← Green button
                          ↑
                    Real-time IBKR prices
```

---

## 📊 HOW TO VERIFY IT'S WORKING

### Check 1: Button Color
- ✅ Green = IBKR mode active
- ⚪ Gray = Yahoo mode active

### Check 2: Toast Message
After clicking Refresh:
- ✅ "Prices updated via **IBKR**" = Working!
- ❌ "Failed to connect to IBKR" = Server not running

### Check 3: Browser Console (Press F12)
```javascript
// Look for this network request:
POST http://127.0.0.1:5001/prices
Status: 200 OK

// Response:
{
  "success": true,
  "prices": {
    "AAPL": 178.45,
    "TSLA": 242.80
  }
}
```

### Check 4: Flask Terminal
```
10:30:45 [INFO] 📊 Price request for 2 positions
10:30:46 [INFO] ✓ AAPL: $178.4500
10:30:47 [INFO] ✓ TSLA: $242.8000
10:30:48 [INFO] ✓ Fetched 2 prices, 0 failed
127.0.0.1 - - [15/Jan/2024 10:30:48] "POST /prices HTTP/1.1" 200 -
```

---

## 🐛 COMMON PROBLEMS & SOLUTIONS

### Problem 1: "Connection refused" when Refresh
**Symptoms:** Toast shows error, nothing in Flask terminal

**Solution:**
```bash
# Check if Flask is running
curl http://127.0.0.1:5001/health

# If no response, start Flask:
python ibkr_bridge.py
```

---

### Problem 2: "Failed to connect to IBKR"
**Symptoms:** Flask starts, but can't connect to TWS

**Checklist:**
- [ ] TWS/Gateway is running
- [ ] API is enabled (check TWS settings)
- [ ] Port is correct (7497 for live, 7496 for paper)
- [ ] `127.0.0.1` is in Trusted IPs

**Quick Test:**
```bash
python test_ibkr_connection.py
```

---

### Problem 3: Some tickers show no price
**Possible Causes:**

1. **Invalid ticker** (typo in symbol)
   - Fix: Check spelling

2. **PSE stocks in IBKR mode**
   - Expected: PSE automatically uses Phisix API
   - Examples: ALI, BDO, SM, JFC

3. **Market closed**
   - Expected: Shows last close price
   - Check: `data_type: "CLOSE"` in response

4. **No market data subscription**
   - Check: IBKR Account Management → Market Data Subscriptions
   - US stocks need: "US Securities Snapshot" (usually free)

---

### Problem 4: CORS errors in browser
**Symptoms:** Console shows "blocked by CORS policy"

**Solution:**
Use a local web server instead of `file://` protocol:
```bash
python -m http.server 8000
# Open: http://localhost:8000/index.html
```

---

## 🎓 USAGE TIPS

### Tip 1: Keep Both Modes Available
- Use **Yahoo mode** when TWS is closed (no setup needed)
- Use **IBKR mode** when you want real-time prices

### Tip 2: PSE Stocks Always Use Phisix
Even in IBKR mode, Philippine stocks (ALI, BDO, SM) use Phisix API because IBKR doesn't support PSE.

### Tip 3: Monitor the Flask Terminal
Keep the Flask terminal visible to see which tickers are being fetched and any errors.

### Tip 4: Test with Paper Trading First
Always use TWS Paper Trading (port 7496) before connecting to live account.

### Tip 5: Restart if Stuck
If prices stop updating:
1. Stop Flask (CTRL+C)
2. Close TWS
3. Reopen TWS
4. Restart Flask: `python ibkr_bridge.py`

---

## 📝 WHAT CHANGED IN YOUR CODE

### Modified: `index.html`

**Line ~1034:** Added IBKR state
```javascript
var _ibkr=useState(false); var useIBKR=_ibkr[0]; var setUseIBKR=_ibkr[1];
```

**Line ~1166:** Modified doRefresh()
```javascript
fetchPrices(all, useIBKR).then(function(res){
  // ... handles IBKR vs Yahoo mode
```

**Line ~1265:** Added toggle button
```javascript
<button id="ibkr-toggle" onClick={...}>
  {useIBKR?'IBKR':'Yahoo'}
</button>
```

### Modified: `engine.js`

**Line ~352:** Added IBKR API constant
```javascript
var IBKR_API = 'http://127.0.0.1:5001/prices';
```

**Line ~396:** Modified fetchPrices()
```javascript
function fetchPrices(positionList, useIBKR) {
  // ... routes to IBKR or Yahoo based on flag
```

**Added:** New function `fetchIBKR()`
```javascript
function fetchIBKR(positions) {
  return fetch(IBKR_API, {
    method: 'POST',
    body: JSON.stringify({ positions })
  })
  // ... handles IBKR API response
}
```

---

## 🏆 FINAL VERIFICATION CHECKLIST

Before using with real money:

- [ ] Tested with TWS Paper Trading (port 7496)
- [ ] All test tickers fetch correctly
- [ ] PSE stocks use Phisix (expected behavior)
- [ ] Price accuracy matches TWS interface
- [ ] Toggle switches between modes instantly
- [ ] Flask server starts without errors
- [ ] Browser shows no console errors
- [ ] Toast messages appear correctly

---

## 🎯 QUICK REFERENCE

### Start Everything (In Order):
```bash
# 1. Open TWS/Gateway
# 2. Terminal 1:
python ibkr_bridge.py

# 3. Terminal 2 (if using local server):
python -m http.server 8000

# 4. Browser:
http://localhost:8000/index.html

# 5. Click toggle: Yahoo → IBKR (green)
# 6. Click Refresh
```

### Stop Everything:
```bash
# CTRL+C in Flask terminal
# CTRL+C in web server terminal (if used)
# Close TWS/Gateway
```

---

## 📞 NEED HELP?

### Check These First:
1. `IBKR_INTEGRATION_GUIDE.md` - Full setup guide
2. `SYSTEM_ARCHITECTURE.md` - How it works
3. `test_ibkr_connection.py` - Diagnostic tool

### Debug Flow:
1. Run test script → Find which step fails
2. Check Flask terminal → See error messages
3. Check browser console (F12) → See network errors
4. Check TWS settings → Verify API is enabled

---

**TAPOS NA! Ready to test! 🚀**

**Version:** 1.5.2-IBKR
**Status:** PRODUCTION READY ✅
**Date:** 2024-01-15
