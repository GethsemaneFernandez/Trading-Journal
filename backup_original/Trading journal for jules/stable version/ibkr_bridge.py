#!/usr/bin/env python3
"""
═════════════════════════════════════════════════════════════════
BASIC JOURNAL - IBKR BRIDGE API
═════════════════════════════════════════════════════════════════
Purpose: Lightweight Flask API that connects Basic Journal to IBKR
Architecture: Frontend (JS) → Flask → ib_insync → TWS/Gateway
Port: 5001 (to avoid conflicts with TWS 7497)

CRITICAL DESIGN DECISIONS:
1. Stateless: Each request connects → fetches → disconnects
   (Avoids stale connections but slower. Production would use pooling.)
2. Error Resilience: Returns partial results if some tickers fail
3. Timeout Protection: 10s max per request to avoid UI hang
4. CORS Enabled: Allow localhost:3000, localhost:5500, file:// origins

INSTALLATION:
    pip install flask flask-cors ib_insync

USAGE:
    python ibkr_bridge.py
    # Server starts on http://127.0.0.1:5001
    # Frontend calls: fetch('http://127.0.0.1:5001/prices?symbols=AAPL,TSLA')
═════════════════════════════════════════════════════════════════
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from ib_insync import IB, Stock, Forex, util
import logging
import json
import urllib.request
import urllib.error
import os
from typing import Dict, List, Optional
from datetime import datetime

# ═══════════════════════════════════════════════════════════════
# CONFIGURATION
# ═══════════════════════════════════════════════════════════════

CONFIG_FILE = 'ibkr_config.json'

# Default config (overridden by ibkr_config.json if exists)
DEFAULT_CONFIG = {
    "ibkr": {
        "host": "127.0.0.1",
        "port": 7497,  # 7497=TWS Live, 7496=TWS Paper, 4001=Gateway Live, 4002=Gateway Paper
        "client_id": 10,
        "timeout": 10
    },
    "server": {
        "host": "127.0.0.1",
        "port": 5001,
        "debug": False
    },
    "exchange_routing": {
        "PSE": "SMART",      # PSE stocks not on IBKR - will fail gracefully
        "NASDAQ": "SMART",
        "NYSE": "SMART",
        "FOREX": "IDEALPRO", # IBKR forex exchange
        "CRYPTO": "PAXOS"    # IBKR crypto exchange (limited support)
    }
}

def load_config():
    """Load config from JSON file or use defaults."""
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, 'r') as f:
                custom = json.load(f)
                # Merge with defaults
                config = DEFAULT_CONFIG.copy()
                config.update(custom)
                return config
        except Exception as e:
            logging.warning(f"Failed to load {CONFIG_FILE}: {e}. Using defaults.")
    return DEFAULT_CONFIG

CONFIG = load_config()

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    datefmt='%H:%M:%S'
)
logger = logging.getLogger(__name__)

# ═══════════════════════════════════════════════════════════════
# FLASK APP
# ═══════════════════════════════════════════════════════════════

app = Flask(__name__)

# Enable CORS for local development (Basic Journal runs from file:// or localhost)
CORS(app, resources={
    r"/*": {
        "origins": [
            "http://localhost:*",
            "http://127.0.0.1:*",
            "file://*",
            "null"  # For file:// protocol
        ]
    }
})

# ═══════════════════════════════════════════════════════════════
# IBKR PRICE ENGINE
# ═══════════════════════════════════════════════════════════════

class IBKRPriceEngine:
    """
    Handles connection to IBKR and price fetching.
    Designed for request-scoped usage (connect → fetch → disconnect).
    """

    def __init__(self):
        self.ib = IB()
        self.config = CONFIG['ibkr']
        self.is_connected = False

    def connect(self) -> bool:
        """Establish connection to IBKR."""
        try:
            self.ib.connect(
                host=self.config['host'],
                port=self.config['port'],
                clientId=self.config['client_id'],
                timeout=self.config['timeout'],
                readonly=True
            )
            # Default to delayed data if user doesn't have live subscription
            self.ib.reqMarketDataType(3)
            self.is_connected = True
            logger.info(f"✓ Connected to IBKR ({self.config['host']}:{self.config['port']})")
            return True
        except Exception as e:
            logger.error(f"✗ IBKR connection failed: {e}")
            return False

    def disconnect(self):
        """Close connection."""
        if self.is_connected:
            self.ib.disconnect()
            self.is_connected = False
            logger.info("✓ Disconnected from IBKR")

    def get_price(self, symbol: str, exchange: str = 'SMART') -> Optional[float]:
        """
        Fetch single ticker price.

        Returns:
            float: Last traded price, or None if unavailable
        """
        if not self.is_connected:
            return None

        try:
            # Determine contract type based on symbol/exchange
            if exchange == 'FOREX' or exchange == 'IDEALPRO':
                # Forex pairs: EURUSD → EUR.USD
                if len(symbol) == 6:
                    base = symbol[:3]
                    quote = symbol[3:]
                    contract = Forex(base + quote)
                else:
                    contract = Forex(symbol)
            else:
                # Stock contract
                contract = Stock(symbol, exchange, 'USD')

            # Qualify contract
            qualified = self.ib.qualifyContracts(contract)
            if not qualified:
                logger.warning(f"⚠ {symbol} not found in IBKR database")
                return None

            contract = qualified[0]

            # Request market data
            ticker = self.ib.reqMktData(contract, snapshot=False)
            self.ib.sleep(1.5)  # Wait for tick

            # Extract price
            price = self._extract_price(ticker)

            # Cancel subscription
            self.ib.cancelMktData(contract)

            if price:
                logger.info(f"✓ {symbol}: ${price:.4f}")

            return price

        except Exception as e:
            logger.error(f"✗ Error fetching {symbol}: {e}")
            return None

    def _extract_price(self, ticker) -> Optional[float]:
        """Extract best available price from ticker."""
        # Priority: last → close → delayedLast → delayedClose → bid/ask midpoint
        if ticker.last and not util.isNan(ticker.last) and ticker.last > 0:
            return ticker.last

        if ticker.close and not util.isNan(ticker.close) and ticker.close > 0:
            return ticker.close

        if hasattr(ticker, 'delayedLast') and ticker.delayedLast and not util.isNan(ticker.delayedLast) and ticker.delayedLast > 0:
            return ticker.delayedLast

        if hasattr(ticker, 'delayedClose') and ticker.delayedClose and not util.isNan(ticker.delayedClose) and ticker.delayedClose > 0:
            return ticker.delayedClose

        if (ticker.bid and ticker.ask and
            not util.isNan(ticker.bid) and not util.isNan(ticker.ask) and
            ticker.bid > 0 and ticker.ask > 0):
            return (ticker.bid + ticker.ask) / 2

        return None

    def batch_fetch(self, positions: List[Dict]) -> Dict[str, float]:
        """
        Fetch prices for multiple positions.

        Args:
            positions: List of dicts with keys: ticker, exchange

        Returns:
            Dict mapping ticker → price
        """
        results = {}
        exchange_routing = CONFIG.get('exchange_routing', {})

        for pos in positions:
            symbol = pos.get('ticker')
            frontend_exchange = pos.get('exchange', 'SMART')

            # Map frontend exchange to IBKR exchange
            ibkr_exchange = exchange_routing.get(frontend_exchange, 'SMART')

            # Skip PSE (not supported by IBKR)
            if frontend_exchange == 'PSE':
                logger.info(f"⊘ Skipping {symbol} (PSE not on IBKR)")
                continue

            price = self.get_price(symbol, ibkr_exchange)
            if price is not None:
                results[symbol] = price

            # Small delay to avoid throttling
            self.ib.sleep(0.1)

        return results

# ═══════════════════════════════════════════════════════════════
# API ENDPOINTS
# ═══════════════════════════════════════════════════════════════

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint."""
    return jsonify({
        'status': 'online',
        'service': 'Basic Journal IBKR Bridge',
        'version': '1.0.0',
        'timestamp': datetime.now().isoformat()
    })

@app.route('/config', methods=['GET'])
def get_config():
    """Return current configuration (sanitized)."""
    safe_config = {
        'ibkr': {
            'host': CONFIG['ibkr']['host'],
            'port': CONFIG['ibkr']['port'],
            'timeout': CONFIG['ibkr']['timeout']
        },
        'server': CONFIG['server']
    }
    return jsonify(safe_config)

def fetch_yahoo_fallback(positions: List[Dict]) -> Dict[str, float]:
    """Fallback to Yahoo Finance API for tickers that failed via IBKR or when IBKR is down."""
    if not positions:
        return {}

    try:
        import yfinance as yf
    except ImportError:
        logger.error("yfinance is not installed. Run 'pip install yfinance'")
        return {}

    yahoo_symbols = []
    symbol_map = {}

    for p in positions:
        sym = p.get('ticker')
        ex = p.get('exchange')
        if not sym or ex == 'PSE':
            continue

        ysym = sym
        if ex == 'FOREX' and '=' not in sym:
            ysym = f"{sym}=X"
        elif ex == 'CRYPTO' and '-' not in sym:
            ysym = f"{sym}-USD"

        yahoo_symbols.append(ysym)
        symbol_map[ysym] = sym

    if not yahoo_symbols:
        return {}

    results = {}
    try:
        # Fetch data for all symbols at once
        tickers = yf.Tickers(' '.join(yahoo_symbols))
        for ysym, ticker in tickers.tickers.items():
            price = None
            try:
                info = ticker.fast_info
                if 'lastPrice' in info and info['lastPrice'] is not None:
                    price = info['lastPrice']
                elif 'previousClose' in info and info['previousClose'] is not None:
                    price = info['previousClose']
            except Exception:
                pass

            if price is not None:
                orig_sym = symbol_map.get(ysym, ysym)
                results[orig_sym] = float(price)

        logger.info(f"✓ Yahoo Fallback successful for {len(results)} tickers")
    except Exception as e:
        logger.error(f"✗ Yahoo Fallback error: {e}")

    return results

@app.route('/prices', methods=['POST'])
def fetch_prices():
    """
    Fetch prices for multiple tickers.

    Request Body (JSON):
        {
            "positions": [
                {"ticker": "AAPL", "exchange": "NASDAQ"},
                {"ticker": "TSLA", "exchange": "NASDAQ"},
                {"ticker": "EURUSD", "exchange": "FOREX"}
            ]
        }

    Response:
        {
            "success": true,
            "prices": {"AAPL": 178.45, "TSLA": 242.80},
            "failed": ["MSFT"],
            "timestamp": "2024-01-15T10:30:00"
        }
    """
    try:
        data = request.get_json()

        if not data or 'positions' not in data:
            return jsonify({
                'success': False,
                'error': 'Missing "positions" array in request body'
            }), 400

        positions = data['positions']

        if not isinstance(positions, list):
            return jsonify({
                'success': False,
                'error': '"positions" must be an array'
            }), 400

        logger.info(f"📊 Price request for {len(positions)} positions")

        import asyncio
        # Ensure there is an asyncio event loop in this thread
        try:
            loop = asyncio.get_event_loop()
        except RuntimeError:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)

        # Connect to IBKR
        engine = IBKRPriceEngine()
        prices = {}
        ibkr_connected = False

        if engine.connect():
            ibkr_connected = True
            try:
                # Fetch prices from IBKR
                prices = engine.batch_fetch(positions)
            finally:
                engine.disconnect()
        else:
            logger.warning("IBKR connection failed. Falling back completely to Yahoo Finance.")

        # Determine which tickers failed or if IBKR was down
        requested_dict = {p['ticker']: p for p in positions if p.get('exchange') != 'PSE'}
        fetched = set(prices.keys())
        failed_tickers = list(set(requested_dict.keys()) - fetched)

        # Fallback to Yahoo Finance for missing data
        if failed_tickers:
            logger.info(f"Falling back to Yahoo Finance for {len(failed_tickers)} tickers...")
            failed_positions = [requested_dict[t] for t in failed_tickers]
            yahoo_prices = fetch_yahoo_fallback(failed_positions)

            # Merge prices
            prices.update(yahoo_prices)

        # Final status
        final_fetched = set(prices.keys())
        final_failed = list(set(requested_dict.keys()) - final_fetched)

        response = {
            'success': True,
            'prices': prices,
            'failed': final_failed,
            'count': len(prices),
            'timestamp': datetime.now().isoformat(),
            'source': 'Yahoo' if not ibkr_connected else ('Mixed' if failed_tickers else 'IBKR')
        }

        logger.info(f"✓ Fetched {len(prices)} prices, {len(final_failed)} failed")
        return jsonify(response)

    except Exception as e:
        logger.error(f"✗ Request error: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# ═══════════════════════════════════════════════════════════════
# STARTUP
# ═══════════════════════════════════════════════════════════════

def create_default_config():
    """Create default config file if it doesn't exist."""
    if not os.path.exists(CONFIG_FILE):
        with open(CONFIG_FILE, 'w') as f:
            json.dump(DEFAULT_CONFIG, f, indent=2)
        logger.info(f"✓ Created {CONFIG_FILE} with default settings")

if __name__ == '__main__':
    logger.info("═" * 60)
    logger.info("BASIC JOURNAL - IBKR BRIDGE API")
    logger.info("═" * 60)

    # Create config file if missing
    create_default_config()

    # Log configuration
    logger.info(f"IBKR Target: {CONFIG['ibkr']['host']}:{CONFIG['ibkr']['port']}")
    logger.info(f"API Server: http://{CONFIG['server']['host']}:{CONFIG['server']['port']}")
    logger.info("═" * 60)
    logger.info("Press CTRL+C to stop")
    logger.info("═" * 60)

    # Start Flask server
    app.run(
        host=CONFIG['server']['host'],
        port=CONFIG['server']['port'],
        debug=CONFIG['server']['debug']
    )
