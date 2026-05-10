/* ═══════════════════════════════════════════════════════════
   BASIC JOURNAL V1.5.0-MASSIVE — FINANCIAL ENGINE
   window.BasicEngine  (primary) | window.SovereignEngine (alias)
   ─────────────────────────────────────────────────────────
   V1.5.1 CORRECTIONS vs V1.5.0:
   1. FOREX PIP ENGINE V2: Force f5() precision. Base calculation on Raw Units.
      Unrealized_P&L = (Current_Price - Entry_Price) * Units.
   2. ANALYTICS ENGINE: Profit Factor, Max Drawdown, Avg Hold Time (Win vs Loss).
   3. WITHDRAWAL LAW: Hard validation in withdrawal handler.
   4. DUAL-PORTFOLIO:  Isolated environments.
   5. PSE PRICE FIX:  phisix-api4.appspot.com
   6. OPTION A MATH preserved: newCost = initialCost − netProceeds
   7. SMART USD DEDUCTION preserved (manifest §3.2)
   No import / export — pure ES5 IIFE attached to window.
═══════════════════════════════════════════════════════════ */
(function (window) {
  'use strict';

  /* ── Seed data ───────────────────────────────────────── */
  var SEED_TICKERS = {
    PSE:    ['AC','ALI','AP','BDO','BPI','BLOOM','DMC','DITO','EMP','FGEN','GLO','GTCAP','ICT','JFC','JGS','LTG','MBT','MEG','MER','MPI','PGOLD','RRHI','SECB','SM','SMPH','TEL','URC'],
    NASDAQ: ['AAPL','AMZN','AMD','ADBE','AVGO','GOOGL','INTC','META','MSFT','MU','NFLX','NVDA','PYPL','QCOM','TSLA','TXN','CRM','KLAC','LRCX','ASML'],
    NYSE:   ['BAC','BRK.B','CVX','DIS','GE','GS','HD','IBM','JNJ','JPM','KO','MA','MS','PEP','PFE','PG','UNH','V','WFC','WMT','XOM'],
    CRYPTO: ['BTC','ETH','SOL','BNB','ADA','XRP','DOGE','AVAX','DOT','MATIC'],
    FOREX:  ['EURUSD','GBPUSD','USDJPY','USDPHP','AUDUSD','USDCAD','NZDUSD','EURGBP','XAUUSD','BTCUSD'],
  };

  var SOURCES = ['BPI','BDO','Wise','GCash','Maya','UnionBank','Cash'];

  var PIE_COLORS = [
    '#475569', '#334155', '#1e293b', '#64748b', '#94a3b8',
    '#0f172a', '#111827', '#1c1d26', '#3e3e42', '#2d2d30'
  ];

  /* ── localStorage keys ────────────────────────────────── */
  var K = {
    t:    'bj15_t',    /* live trades       */
    f:    'bj15_f',    /* live funding      */
    ok:   'bj15_ok',
    th:   'bj15_th',
    sc:   'bj15_sc',
    pr:   'bj15_pr',
    fe:   'bj15_fe',
    fx:   'bj15_fx',
    tk:   'bj15_tk',
    ss:   'bj15_ss',
    sp:   'bj15_sp',
    mock: 'bj15_mock', /* mock/study-lab trades — NEVER mixed with live */
  };

  /* ── Currency / exchange helpers ─────────────────────── */
  function isUSD(ex)    { return ex === 'NASDAQ' || ex === 'NYSE'; }
  function isCrypto(ex) { return ex === 'CRYPTO'; }
  function isForex(ex)  { return ex === 'FOREX'; }

  /* Convert a native amount to PHP. Forex P&L is already in the
     quote currency (USD for most pairs) so treat like USD. */
  function toPHP(amount, exchange, fxRate) {
    var rate = parseFloat(fxRate) || 60;
    if (isUSD(exchange) || isCrypto(exchange)) return amount * rate;
    if (isForex(exchange)) return amount * rate; /* Forex P&L is in USD base for major pairs */
    return amount;
  }

  /* ── Fee engine ──────────────────────────────────────────
     PSE BUY  0.295 % (min ₱20)
     PSE SELL 0.395 % (min ₱20)
     All other exchanges = 0 (broker handles externally)
  ─────────────────────────────────────────────────────── */
  function calcFee(side, price, qty, usePse, exchange) {
    var p = Math.max(0, parseFloat(price) || 0);
    var q = Math.max(0, parseFloat(qty)   || 0);
    var gross = p * q;
    if (!gross || exchange !== 'PSE' || !usePse) return 0;
    var rate = side === 'BUY' ? 0.00295 : 0.00395;
    var fee  = gross * rate;
    return fee < 20 ? 20 : fee;
  }

  /* ── Breakeven (stocks only — Forex has no fee) ──────── */
  function breakEven(totalCostNative, qty, exchange, usePse) {
    if (qty <= 0 || totalCostNative <= 0) return 0;
    if (isForex(exchange)) return totalCostNative / qty;   /* avg entry price */
    var rate = (exchange === 'PSE' && usePse) ? 0.00395 : 0;
    return totalCostNative / (qty * (1 - rate));
  }

  /* ══════════════════════════════════════════════════════
     GENERIC CALCULATE-POSITIONS
     ──────────────────────────────────────────────────────
     Pure function — takes any trade array + funding array.
     Used by BOTH live and mock portfolios so data never
     crosses.

     FOREX PIP ENGINE (manifest §2.3.3):
       BUY:  records entry_price and raw qty (units)
       SELL: realizedPnL = (exitPrice - entryPrice) * qty
             This means short-selling is also supported:
             if exitPrice < entryPrice → loss.
  ══════════════════════════════════════════════════════ */
  function calculatePositions(rawT, rawF, usePse, fxRate) {
    var trades  = Array.isArray(rawT) ? rawT : [];
    var funding = Array.isArray(rawF) ? rawF : [];
    var rate    = parseFloat(fxRate) || 60;

    /* ── Dual-cash init ── */
    var cash = { php: 0, usd: 0 };
    var totalDep = 0, totalWdw = 0;
    for (var fi = 0; fi < funding.length; fi++) {
      var ff = funding[fi];
      if (!ff || typeof ff !== 'object') continue;
      var amt = Math.max(0, parseFloat(ff.amount) || 0);
      var cur = (ff.currency || 'PHP').toUpperCase();
      if (ff.type === 'DEPOSIT') {
        totalDep += (cur === 'USD') ? amt * rate : amt;
        if (cur === 'USD') cash.usd += amt; else cash.php += amt;
      } else {
        totalWdw += (cur === 'USD') ? amt * rate : amt;
        if (cur === 'USD') cash.usd -= amt; else cash.php -= amt;
      }
    }

    var positions  = {};
    var cycles     = [];
    var realPnLPHP = 0;

    var sorted = trades
      .filter(function(t) { return t && typeof t === 'object' && t.ticker && t.price && t.qty; })
      .slice()
      .sort(function(a, b) {
        var da = +(new Date((a.date || '1970-01-01') + 'T' + (a.time || '00:00')));
        var db = +(new Date((b.date || '1970-01-01') + 'T' + (b.time || '00:00')));
        return da - db;
      });

    for (var ti = 0; ti < sorted.length; ti++) {
      var t    = sorted[ti];
      var type = (t.type || '').toUpperCase();
      var ex   = t.exchange || 'PSE';
      var tk   = t.ticker;
      var p    = parseFloat(t.price) || 0;
      var q    = parseFloat(t.qty)   || 0;
      var fee  = calcFee(type, p, q, usePse, ex);

      /* ────────────────────── BUY / LONG ────────────────── */
      if (type === 'BUY') {
        var nativeCost, phpCost;

        if (isForex(ex)) {
          /* Forex: cost = entry_price * qty (no fee, no cash drain) */
          nativeCost = p * q;
          phpCost    = 0;   /* Forex positions don't drain PHP cash */
        } else {
          nativeCost = p * q + fee;
          phpCost    = toPHP(nativeCost, ex, fxRate);

          /* Smart Cash Deduction (manifest §3.2) */
          if (isUSD(ex) || isCrypto(ex)) {
            if (cash.usd >= nativeCost) {
              cash.usd -= nativeCost;
            } else {
              var deltaUSD    = nativeCost - cash.usd;
              var phpRequired = deltaUSD * rate;
              cash.usd = 0;
              cash.php -= phpRequired;
            }
          } else {
            cash.php -= phpCost;
          }
        }

        if (!positions[tk]) {
          positions[tk] = {
            qty: 0, totalCostNative: 0,
            initialCostNative: 0,
            exchange: ex, ticker: tk, lots: [],
          };
          cycles.push({ ticker: tk, exchange: ex, buyCostPHP: 0, sellProceedsPHP: 0, closed: false, win: false });
        }
        positions[tk].qty               += q;
        positions[tk].totalCostNative   += nativeCost;
        positions[tk].initialCostNative += nativeCost;
        positions[tk].lots.push({ id: t.id, date: t.date, type: 'BUY', price: p, qty: q, fee: fee, nativeCost: nativeCost, phpCost: phpCost });

        var oc = null;
        for (var ci = cycles.length - 1; ci >= 0; ci--) {
          if (cycles[ci].ticker === tk && !cycles[ci].closed) { oc = cycles[ci]; break; }
        }
        if (oc && !isForex(ex)) oc.buyCostPHP += phpCost;

      /* ────────────────────── SELL / CLOSE ────────────── */
      } else if (type === 'SELL') {
        if (!positions[tk] || positions[tk].qty < 0.000001) continue;

        var nativeProceeds, phpProceeds, thisPnLPHP;

        if (isForex(ex)) {
          /* ── FOREX PIP ENGINE (manifest §2.3.3) ── */
          var entryAvg = positions[tk].totalCostNative / positions[tk].qty;
          /* realizedPnL = (exitPrice - entryPrice) * qty */
          var pipPnL   = (p - entryAvg) * q;
          nativeProceeds = pipPnL;   /* native = USD for most pairs */
          phpProceeds    = pipPnL * rate;
          thisPnLPHP     = phpProceeds;

          /* Forex cash: winning trade adds USD, losing subtracts */
          cash.usd += pipPnL;

          /* Option A: cost basis moves by entryAvg * qty (not proceeds) */
          positions[tk].totalCostNative -= entryAvg * q;

        } else {
          /* ── STOCKS / CRYPTO (original Option A math) ── */
          nativeProceeds = p * q - fee;
          phpProceeds    = toPHP(nativeProceeds, ex, fxRate);
          var avgNativeAtSell = positions[tk].totalCostNative / positions[tk].qty;
          var avgPHPAtSell    = toPHP(avgNativeAtSell, ex, fxRate);
          thisPnLPHP = phpProceeds - (q * avgPHPAtSell);

          /* Proceeds back to correct wallet */
          if (isUSD(ex) || isCrypto(ex)) {
            cash.usd += nativeProceeds;
          } else {
            cash.php += phpProceeds;
          }

          /* Option A Capital Recovery */
          positions[tk].totalCostNative -= nativeProceeds;
        }

        realPnLPHP += thisPnLPHP;
        positions[tk].qty -= q;
        positions[tk].lots.push({
          id: t.id, date: t.date, type: 'SELL',
          price: p, qty: q, fee: fee,
          nativeProceeds: nativeProceeds, phpProceeds: phpProceeds,
          realizedPnLPHP: thisPnLPHP,
        });

        var oc2 = null;
        for (var ci2 = cycles.length - 1; ci2 >= 0; ci2--) {
          if (cycles[ci2].ticker === tk && !cycles[ci2].closed) { oc2 = cycles[ci2]; break; }
        }
        if (oc2 && !isForex(ex)) oc2.sellProceedsPHP += phpProceeds;

        /* Ghost position fix */
        if (positions[tk].qty <= 0.000001) {
          if (oc2) {
            oc2.closed = true;
            oc2.win    = isForex(ex)
              ? thisPnLPHP > 0
              : oc2.sellProceedsPHP > oc2.buyCostPHP;
          }
          delete positions[tk];
        }
      }
    }

    var active = Object.values(positions).map(function(pos) {
      return Object.assign({}, pos, {
        avgNative:      pos.totalCostNative / pos.qty,
        totalCostPHP:   toPHP(pos.totalCostNative,   pos.exchange, fxRate),
        avgPHP:         toPHP(pos.totalCostNative / pos.qty, pos.exchange, fxRate),
        initialCostPHP: toPHP(pos.initialCostNative, pos.exchange, fxRate),
        isForex:        isForex(pos.exchange),
      });
    });

    var closed  = cycles.filter(function(c) { return c.closed; });
    var wins    = closed.filter(function(c) { return c.win; });
    var winRate = closed.length > 0 ? (wins.length / closed.length) * 100 : 0;

    return {
      cashPHP:    cash.php,
      cashUSD:    cash.usd,
      cash:       { php: cash.php, usd: cash.usd },
      totalDep:   totalDep,
      totalWdw:   totalWdw,
      active:     active,
      realPnLPHP: realPnLPHP,
      winRate:    winRate,
      closed:     closed,
      wins:       wins,
    };
  }

  /* ── Thin wrappers (live vs mock — data NEVER crosses) ── */
  function runPortfolio(rawT, rawF, usePse, fxRate) {
    return calculatePositions(rawT, rawF, usePse, fxRate);
  }
  function runMockPortfolio(rawT, rawF, usePse, fxRate) {
    return calculatePositions(rawT, rawF, usePse, fxRate);
  }

  /* ── Performance analytics ───────────────────────────── */
  function getPerformanceStats(closed) {
    if (!closed.length) return {
      winRate: 0, bestTk: '—', worstTk: '—',
      bestPnL: 0, worstPnL: 0,
      avgProfit: 0, totalRealized: 0, closedCount: 0,
    };
    var totalRealized = 0;
    var best = null, worst = null;
    closed.forEach(function(c) {
      var pnl = c.sellProceedsPHP - c.buyCostPHP;
      totalRealized += pnl;
      if (best  === null || pnl > best.pnl)  best  = { tk: c.ticker, pnl: pnl };
      if (worst === null || pnl < worst.pnl) worst = { tk: c.ticker, pnl: pnl };
    });
    return {
      winRate:       closed.length > 0 ? (closed.filter(function(c){ return c.win; }).length / closed.length) * 100 : 0,
      bestTk:        best  ? best.tk  : '—',
      worstTk:       worst ? worst.tk : '—',
      bestPnL:       best  ? best.pnl  : 0,
      worstPnL:      worst ? worst.pnl : 0,
      avgProfit:     totalRealized / closed.length,
      totalRealized: totalRealized,
      closedCount:   closed.length,
    };
  }

  /* ── Funding analytics ───────────────────────────────── */
  function getFundingStats(funding) {
    var sourceMap = {};
    var totalIn = 0, totalOut = 0;
    (funding || []).forEach(function(f) {
      if (!f || typeof f !== 'object') return;
      var amt = parseFloat(f.amount) || 0;
      var src = f.source || 'Unknown';
      if (f.type === 'DEPOSIT') {
        totalIn += amt;
        sourceMap[src] = (sourceMap[src] || 0) + amt;
      } else {
        totalOut += amt;
      }
    });
    var sources = Object.keys(sourceMap)
      .map(function(k) { return { name: k, amount: sourceMap[k] }; })
      .sort(function(a, b) { return b.amount - a.amount; });
    return { totalIn: totalIn, totalOut: totalOut, sources: sources, net: totalIn - totalOut };
  }

  /* ── Risk analytics ──────────────────────────────────── */
  function getRiskMetrics(enriched, totalMVPHP) {
    var concentration = [];
    (enriched || []).forEach(function(p) {
      var share = totalMVPHP > 0 ? (p.mvPHP / totalMVPHP) * 100 : 0;
      concentration.push({ ticker: p.ticker, share: share });
    });
    concentration.sort(function(a, b) { return b.share - a.share; });
    var topConc = concentration.length > 0 ? concentration[0] : { ticker: '—', share: 0 };
    var overConcentrated = concentration.filter(function(c) { return c.share > 30; });
    return { topConc: topConc, concentration: concentration, overConcentrated: overConcentrated };
  }

  /* ══ WITHDRAWAL LAW V1.6 ════════════════════════════════
     Hard-validates before any withdrawal is persisted.
     cashState: { php: number, usd: number }
     Returns { ok: true } | { ok: false, message: string }
  ═════════════════════════════════════════════════════════ */
  function validateWithdrawal(amount, currency, cashState) {
    var amt = parseFloat(amount) || 0;
    if (amt <= 0) return { ok: false, message: 'Withdrawal amount must be positive.' };
    var cur = (currency || 'PHP').toUpperCase();
    var available = cur === 'USD' ? (cashState.usd || 0) : (cashState.php || 0);
    if (amt > available) {
      var sym = cur === 'PHP' ? '₱' : '$';
      return { ok: false, message: 'Insufficient Cash. Available ' + cur + ': ' + sym + f2(available) + '. Liquidation required.' };
    }
    return { ok: true };
  }

  /* ══ ADVANCED METRICS V1.6 ══════════════════════════════
     Returns: profitFactor, maxDrawdown%, avgHoldWin/Loss,
              grossProfit, grossLoss, totalRealized, equityPoints[]
  ═════════════════════════════════════════════════════════ */
  function getAdvancedMetrics(trades, funding, fxRate) {
    var grossProfit = 0, grossLoss = 0;
    var holdWinDays = [], holdLossDays = [];
    var posMap = {}, openDates = {};
    var sorted = (trades || []).filter(function(t) { return t && t.ticker && t.price && t.qty; })
      .slice().sort(function(a, b) { return ((a.date||'')+(a.time||'')).localeCompare((b.date||'')+(b.time||'')); });

    var runEq = 0;
    (funding || []).forEach(function(f) {
      if (f && f.type === 'DEPOSIT') runEq += parseFloat(f.amount) || 0;
      else if (f) runEq -= parseFloat(f.amount) || 0;
    });

    var equityPoints = [runEq];
    sorted.forEach(function(t) {
      var tk = t.ticker, ex = t.exchange || 'PSE';
      var p = parseFloat(t.price) || 0, q = parseFloat(t.qty) || 0;
      var fee = calcFee(t.type === 'BUY' ? 'BUY' : 'SELL', p, q, true, ex);

      if ((t.type || '').toUpperCase() === 'BUY') {
        if (!posMap[tk]) {
          posMap[tk] = { qty: 0, totalCostPHP: 0 };
          openDates[tk] = t.date || '';
        }
        posMap[tk].qty += q;
        posMap[tk].totalCostPHP += toPHP(p * q + fee, ex, fxRate);
      } else if ((t.type || '').toUpperCase() === 'SELL' && posMap[tk] && posMap[tk].qty > 0) {
        var avg = posMap[tk].totalCostPHP / posMap[tk].qty;
        var procPHP = toPHP(p * q - fee, ex, fxRate);
        var pnl = procPHP - (avg * q);

        if (pnl >= 0) { grossProfit += pnl; } else { grossLoss += pnl; }

        var openD = openDates[tk], closeD = t.date || '';
        if (openD && closeD) {
          var start = new Date(openD), end = new Date(closeD);
          var days = Math.max(0, Math.round((end - start) / 86400000));
          if (pnl >= 0) holdWinDays.push(days); else holdLossDays.push(days);
        }

        runEq += pnl;
        equityPoints.push(runEq);

        posMap[tk].qty -= q;
        posMap[tk].totalCostPHP -= avg * q;
        if (posMap[tk].qty <= 0) { delete posMap[tk]; delete openDates[tk]; }
      }
    });

    var peak = 0, maxDD = 0;
    equityPoints.forEach(function(v) {
      if (v > peak) peak = v;
      if (peak > 0) {
        var dd = ((peak - v) / peak) * 100;
        if (dd > maxDD) maxDD = dd;
      }
    });

    function avgArr(arr) { return arr.length ? arr.reduce(function(s,v){return s+v;},0)/arr.length : 0; }

    return {
      profitFactor:  grossLoss !== 0 ? grossProfit / Math.abs(grossLoss) : (grossProfit > 0 ? 999 : 1),
      maxDrawdown:   maxDD,
      avgHoldWin:    avgArr(holdWinDays),
      avgHoldLoss:   avgArr(holdLossDays),
      grossProfit:   grossProfit,
      grossLoss:     grossLoss,
      totalRealized: grossProfit + grossLoss,
      equityPoints:  equityPoints,
    };
  }

  /* ── Simulation (for Predictor / Study Lab) ──────────── */
  function runSimulation(baseTk, enriched, steps, usePse, fxRate, onError) {
    var base = null;
    for (var i = 0; i < enriched.length; i++) {
      if (enriched[i].ticker === baseTk) { base = enriched[i]; break; }
    }
    var ex   = base ? base.exchange : 'PSE';
    var qty  = base ? base.qty  : 0;
    var cost = base ? base.totalCostNative : 0;
    var totalRealGLPHP = 0;
    var log  = [];
    var rate = parseFloat(fxRate) || 60;

    for (var si = 0; si < steps.length; si++) {
      var step = steps[si];
      var fee  = calcFee(step.side, step.price, step.qty, usePse, ex);
      var sp   = parseFloat(step.price);
      var sq   = parseFloat(step.qty);

      if (step.side === 'BUY') {
        var nc = isForex(ex) ? sp * sq : sp * sq + fee;
        cost += nc; qty += sq;
        log.push({ step: step.label, side: 'BUY', price: sp, qty: sq, fee: fee, newQty: qty, newAvg: qty > 0 ? cost / qty : 0, newCost: cost, realGL: null, realGLPHP: null, ex: ex });

      } else {
        if (sq > qty + 0.000001) {
          if (typeof onError === 'function') onError('Sim: cannot sell more than owned');
          return null;
        }
        var natGL, phpGL;
        if (isForex(ex)) {
          var entryAvg = qty > 0 ? cost / qty : 0;
          natGL    = (sp - entryAvg) * sq;
          phpGL    = natGL * rate;
          cost    -= entryAvg * sq;
        } else {
          var proceeds = sp * sq - fee;
          var avgAt    = qty > 0 ? cost / qty : 0;
          natGL        = proceeds - sq * avgAt;
          phpGL        = toPHP(natGL, ex, fxRate);
          cost        -= proceeds;
        }
        totalRealGLPHP += phpGL;
        qty -= sq;
        if (qty < 0.000001) { qty = 0; cost = Math.max(0, cost); }
        log.push({ step: step.label, side: 'SELL', price: sp, qty: sq, fee: fee, newQty: qty, newAvg: qty > 0 ? cost / qty : 0, newCost: cost, realGL: natGL, realGLPHP: phpGL, ex: ex });
      }
    }

    return {
      ex: ex, qty: qty, cost: cost,
      newAvgNative:   qty > 0 ? cost / qty : 0,
      bev:            breakEven(cost, qty, ex, usePse),
      costPHP:        toPHP(cost, ex, fxRate),
      totalRealGLPHP: totalRealGLPHP,
      log: log,
    };
  }

  /* ══════════════════════════════════════════════════════
     DUAL-MARKET + FOREX PRICE FETCH — V1.5.2-IBKR
     ────────────────────────────────────────────────────
     CORS Proxy : https://api.allorigins.win/raw?url=
     PSE        : phisix-api4.appspot.com/stocks.json
     NASDAQ/NYSE: Yahoo Finance v7 OR IBKR Bridge API
     CRYPTO/FOREX: Yahoo Finance v7 OR IBKR Bridge API

     IBKR MODE  : When useIBKR=true, routes to local Python bridge
     ────────────────────────────────────────────────────
     fetchPrices(positionList, useIBKR)
       - useIBKR=false → Yahoo + Phisix (current behavior)
       - useIBKR=true  → IBKR API for NASDAQ/NYSE/FOREX, Phisix for PSE
  ══════════════════════════════════════════════════════ */
  var CORS       = 'https://api.allorigins.win/raw?url=';
  var YAHOO_BASE = 'https://query1.finance.yahoo.com/v7/finance/quote?symbols=';
  var IBKR_API   = 'http://127.0.0.1:5001/prices';

  /* Map symbols to Yahoo Finance format */
  function toYahooForex(sym)  { return sym.indexOf('=') === -1 ? sym + '=X' : sym; }
  function toYahooCrypto(sym) { return sym.indexOf('-') === -1 ? sym + '-USD' : sym; }
  function toYahooPSE(sym)    { return sym.indexOf('.') === -1 ? sym + '.PS' : sym; }
  function toYahooNikkei(sym) { return sym.indexOf('.') === -1 ? sym + '.T' : sym; }

  function fetchIBKR(positions) {
    if (!positions || !positions.length) return Promise.resolve({ success: true, prices: {} });
    return fetch(IBKR_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ positions: positions })
    })
    .then(function(res) { return res.json(); })
    .then(function(data) { return data.prices || {}; })
    .catch(function() { return {}; });
  }

  function fetchPrices(positionList, useIBKR) {
    var ibkrPositions = [];
    var yahooTickers  = [];
    var yahooMap      = {};
    var updated       = {};
    var globalFailed  = false;

    (positionList || []).forEach(function(p) {
      var ex  = p.exchange || 'PSE';
      var sym = (p.ticker || '').toUpperCase();

      if (useIBKR && (ex === 'NASDAQ' || ex === 'NYSE')) {
        ibkrPositions.push({ ticker: sym, exchange: ex });
      } else {
        var ys = sym;
        if (ex === 'PSE')          ys = toYahooPSE(sym);
        else if (isForex(ex))     ys = toYahooForex(sym);
        else if (isCrypto(ex))    ys = toYahooCrypto(sym);
        else if (ex === 'NIKKEI')  ys = toYahooNikkei(sym);

        yahooMap[ys.toUpperCase()] = sym;
        yahooTickers.push(ys);
      }
    });

    function fetchYahoo() {
      if (!yahooTickers.length) return Promise.resolve();
      var url = CORS + encodeURIComponent(YAHOO_BASE + yahooTickers.join(','));
      return fetch(url).then(function(res) { return res.json(); })
        .then(function(json) {
          var results = (json && json.quoteResponse && json.quoteResponse.result) || [];
          results.forEach(function(q) {
            var ysym = (q.symbol || '').toUpperCase();
            var orig = yahooMap[ysym] || ysym;
            if (q.regularMarketPrice) updated[orig.toUpperCase()] = q.regularMarketPrice;
          });
        }).catch(function() { globalFailed = true; });
    }

    function fetchIBKRPositions() {
      if (!ibkrPositions.length) return Promise.resolve();
      return fetchIBKR(ibkrPositions).then(function(prices) {
        Object.keys(prices).forEach(function(tk) { updated[tk.toUpperCase()] = prices[tk]; });
      }).catch(function() { globalFailed = true; });
    }

    var tasks = [fetchYahoo()];
    if (useIBKR) tasks.push(fetchIBKRPositions());

    return Promise.all(tasks).then(function() {
      return { updated: updated, pseFailed: false, globalFailed: globalFailed };
    });
  }

  /* ── Formatters ─────────────────────────────────────── */
  function f0(v)  { return (parseFloat(v)||0).toLocaleString('en-US',{minimumFractionDigits:0,maximumFractionDigits:0}); }
  function f2(v)  { return (parseFloat(v)||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}); }
  function f4(v)  { return (parseFloat(v)||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:4}); }
  function f5(v)  { return (parseFloat(v)||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:5}); }
  function pct(v) { return ((parseFloat(v)||0).toFixed(2)) + '%'; }
  function sgn(v) { return v >= 0 ? '+' : ''; }
  function G(v)   { return v >= 0 ? '#c7e2f7' : '#5a6472'; }
  function S(ex)  {
    if (isUSD(ex) || isCrypto(ex) || isForex(ex)) return '$';
    return '₱';   /* literal peso — UTF-8 file */
  }

  /* ── Expose on window ────────────────────────────────── */
  var engine = {
    SEED_TICKERS: SEED_TICKERS, SOURCES: SOURCES, PIE_COLORS: PIE_COLORS, K: K,
    isUSD: isUSD, isCrypto: isCrypto, isForex: isForex,
    toPHP: toPHP, calcFee: calcFee, breakEven: breakEven,
    calculatePositions: calculatePositions,
    runPortfolio: runPortfolio, runMockPortfolio: runMockPortfolio, runSimulation: runSimulation,
    getPerformanceStats: getPerformanceStats, getFundingStats: getFundingStats,
    getRiskMetrics: getRiskMetrics,
    validateWithdrawal: validateWithdrawal,
    getAdvancedMetrics: getAdvancedMetrics,
    fetchPrices: fetchPrices,
    f0: f0, f2: f2, f4: f4, f5: f5, pct: pct, sgn: sgn, G: G, S: S,
  };

  window.BasicEngine     = engine;
  window.SovereignEngine = engine;
  window.SovEngine       = engine;

})(window);
