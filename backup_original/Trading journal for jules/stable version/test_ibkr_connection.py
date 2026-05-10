#!/usr/bin/env python3
"""
Quick Test Script for IBKR Integration
========================================
This script tests your IBKR connection WITHOUT starting the full Flask server.
Use this to diagnose connection issues before running the main application.

USAGE:
    python test_ibkr_connection.py

WHAT IT TESTS:
    1. Can we connect to TWS/Gateway?
    2. Can we fetch a single stock price (AAPL)?
    3. Can we fetch multiple tickers?
    4. Can we fetch a forex pair?
"""

import sys
import json
from ib_insync import IB, Stock, Forex, util

# Ensure stdout uses utf-8 encoding to support emojis on Windows
if sys.stdout.encoding.lower() != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

# Load config
try:
    with open('ibkr_config.json', 'r') as f:
        config = json.load(f)
except FileNotFoundError:
    print("❌ ibkr_config.json not found!")
    print("Run the main ibkr_bridge.py first to generate it.")
    sys.exit(1)

IBKR_CONFIG = config['ibkr']

print("=" * 60)
print("IBKR CONNECTION TEST")
print("=" * 60)
print(f"Target: {IBKR_CONFIG['host']}:{IBKR_CONFIG['port']}")
print(f"Client ID: {IBKR_CONFIG['client_id']}")
print("=" * 60)

# Test 1: Connection
print("\n[TEST 1] Connecting to IBKR...")
ib = IB()

try:
    ib.connect(
        host=IBKR_CONFIG['host'],
        port=IBKR_CONFIG['port'],
        clientId=IBKR_CONFIG['client_id'],
        timeout=IBKR_CONFIG['timeout'],
        readonly=True
    )
    # Request delayed data (type 3) in case user doesn't have live subscription
    ib.reqMarketDataType(3)
    print("✅ Connected successfully!")
except Exception as e:
    print(f"❌ Connection failed: {e}")
    print("\nTROUBLESHOOTING:")
    print("1. Is TWS/Gateway running?")
    print("2. Is API enabled in TWS settings?")
    print("3. Is port correct? (7497=TWS Live, 7496=TWS Paper)")
    print("4. Is 127.0.0.1 in Trusted IPs?")
    sys.exit(1)

# Test 2: Single stock price
print("\n[TEST 2] Fetching AAPL price...")
try:
    contract = Stock('AAPL', 'SMART', 'USD')
    qualified = ib.qualifyContracts(contract)

    if not qualified:
        print("❌ AAPL contract not found")
    else:
        contract = qualified[0]
        ticker = ib.reqMktData(contract, snapshot=False)
        ib.sleep(2)

        # Extract price
        if hasattr(ticker, 'last') and ticker.last and not util.isNan(ticker.last) and ticker.last > 0:
            price = ticker.last
            print(f"✅ AAPL: ${price:.2f} (LIVE)")
        elif hasattr(ticker, 'close') and ticker.close and not util.isNan(ticker.close) and ticker.close > 0:
            price = ticker.close
            print(f"✅ AAPL: ${price:.2f} (CLOSE)")
        elif hasattr(ticker, 'delayedLast') and ticker.delayedLast and not util.isNan(ticker.delayedLast) and ticker.delayedLast > 0:
            price = ticker.delayedLast
            print(f"✅ AAPL: ${price:.2f} (DELAYED 15-MIN)")
        elif hasattr(ticker, 'delayedClose') and ticker.delayedClose and not util.isNan(ticker.delayedClose) and ticker.delayedClose > 0:
            price = ticker.delayedClose
            print(f"✅ AAPL: ${price:.2f} (DELAYED CLOSE)")
        else:
            print("⚠️ No price data available (check market hours or subscriptions)")

        ib.cancelMktData(contract)
except Exception as e:
    print(f"❌ Failed: {e}")

# Test 3: Batch fetch
print("\n[TEST 3] Fetching multiple tickers (TSLA, MSFT, GOOGL)...")
test_symbols = ['TSLA', 'MSFT', 'GOOGL']
results = {}

for symbol in test_symbols:
    try:
        contract = Stock(symbol, 'SMART', 'USD')
        qualified = ib.qualifyContracts(contract)

        if qualified:
            contract = qualified[0]
            ticker = ib.reqMktData(contract, snapshot=False)
            ib.sleep(1.5)

            # Extract price
            price = None
            if hasattr(ticker, 'last') and ticker.last and not util.isNan(ticker.last) and ticker.last > 0:
                price = ticker.last
                print(f"  ✅ {symbol:6} ${price:8.2f} (LIVE)")
            elif hasattr(ticker, 'close') and ticker.close and not util.isNan(ticker.close) and ticker.close > 0:
                price = ticker.close
                print(f"  ✅ {symbol:6} ${price:8.2f} (CLOSE)")
            elif hasattr(ticker, 'delayedLast') and ticker.delayedLast and not util.isNan(ticker.delayedLast) and ticker.delayedLast > 0:
                price = ticker.delayedLast
                print(f"  ✅ {symbol:6} ${price:8.2f} (DELAYED 15-MIN)")
            elif hasattr(ticker, 'delayedClose') and ticker.delayedClose and not util.isNan(ticker.delayedClose) and ticker.delayedClose > 0:
                price = ticker.delayedClose
                print(f"  ✅ {symbol:6} ${price:8.2f} (DELAYED CLOSE)")
            else:
                print(f"  ⚠️ {symbol:6} No data (check market hours or subscriptions)")

            if price:
                results[symbol] = price

            ib.cancelMktData(contract)
            ib.sleep(0.1)
        else:
            print(f"  ❌ {symbol:6} Invalid ticker")
    except Exception as e:
        print(f"  ❌ {symbol:6} Error: {e}")

print(f"\n✅ Successfully fetched {len(results)}/{len(test_symbols)} prices")

# Test 4: Forex pair
print("\n[TEST 4] Fetching EURUSD forex pair...")
try:
    contract = Forex('EURUSD')
    qualified = ib.qualifyContracts(contract)

    if qualified:
        contract = qualified[0]
        ticker = ib.reqMktData(contract, snapshot=False)
        ib.sleep(2)

        if ticker.last and not util.isNan(ticker.last):
            print(f"✅ EURUSD: {ticker.last:.5f}")
        elif ticker.close and not util.isNan(ticker.close):
            print(f"✅ EURUSD: {ticker.close:.5f} (CLOSE)")
        else:
            print("⚠️ No forex data (check if forex market is open)")

        ib.cancelMktData(contract)
except Exception as e:
    print(f"❌ Forex test failed: {e}")

# Cleanup
print("\n[CLEANUP] Disconnecting...")
ib.disconnect()
print("✅ Disconnected")

print("\n" + "=" * 60)
print("TEST SUMMARY")
print("=" * 60)
print("If all tests passed, your IBKR integration is working!")
print("You can now start the Flask server: python ibkr_bridge.py")
print("=" * 60)
