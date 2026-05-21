/* ═══════════════════════════════════════════════════════════
   BASIC JOURNAL V1.5.1-MASSIVE — FINANCIAL ENGINE
   window.BasicEngine  (primary) | window.SovereignEngine (alias)
   ─────────────────────────────────────────────────────────
   V1.5.1 CORRECTIONS:
   1. FOREX PIP ENGINE V2: Unrealized_P&L = (Current_Price - Entry_Price) * Units.
   2. ANALYTICS ENGINE: Profit Factor, Max Drawdown, Avg Hold Time.
   3. PSE PRICE FETCH: Improved Yahoo Finance v8 chart fetch with historical support.
   4. OPTION A MATH preserved: newCost = initialCost − netProceeds
   5. SMART USD DEDUCTION: Cross-currency balance usage.
   6. PERSISTENT MARKET PRICES: LocalStorage caching.
═══════════════════════════════════════════════════════════ */
(function (window) {
  'use strict';

  var SEED_TICKERS = {
    PSE:    ['AC','ALI','AP','BDO','BPI','BLOOM','DMC','DITO','EMP','FGEN','GLO','GTCAP','ICT','JFC','JGS','LTG','MBT','MEG','MER','MPI','PGOLD','RRHI','SECB','SM','SMPH','TEL','URC'],
    NASDAQ: ['AAPL','AMZN','AMD','ADBE','AVGO','GOOGL','INTC','META','MSFT','MU','NFLX','NVDA','PYPL','QCOM','TSLA','TXN','CRM','KLAC','LRCX','ASML'],
    NYSE:   ['BAC','BRK.B','CVX','DIS','GE','GS','HD','IBM','JNJ','JPM','KO','MA','MS','PEP','PFE','PG','UNH','V','WFC','WMT','XOM'],
    CRYPTO: ['BTC','ETH','SOL','BNB','ADA','XRP','DOGE','AVAX','DOT','MATIC'],
    FOREX:  ['EURUSD','GBPUSD','USDJPY','USDPHP','AUDUSD','USDCAD','NZDUSD','EURGBP','XAUUSD','BTCUSD'],
  };

  var SOURCES = ['BPI','BDO','Wise','GCash','Maya','UnionBank','Cash'];
  var PIE_COLORS = ['#475569','#334155','#1e293b','#64748b','#94a3b8','#0f172a','#111827','#1c1d26','#3e3e42','#2d2d30'];

  var K = {
    t: 'bj15_t', f: 'bj15_f', ok: 'bj15_ok', th: 'bj15_th', sc: 'bj15_sc',
    pr: 'bj15_pr', fe: 'bj15_fe', fx: 'bj15_fx', tk: 'bj15_tk', ss: 'bj15_ss',
    sp: 'bj15_sp', mock: 'bj15_mock', mkt: 'bj15_mkt'
  };

  function isUSD(ex)    { return ex === 'NASDAQ' || ex === 'NYSE'; }
  function isCrypto(ex) { return ex === 'CRYPTO'; }
  function isForex(ex)  { return ex === 'FOREX'; }

  function toPHP(amount, exchange, fxRate) {
    var rate = parseFloat(fxRate) || 60;
    if (isUSD(exchange) || isCrypto(exchange) || isForex(exchange)) return amount * rate;
    return amount;
  }

  function calcFee(side, price, qty, usePse, exchange) {
    var p = Math.max(0, parseFloat(price) || 0), q = Math.max(0, parseFloat(qty) || 0), gross = p * q;
    if (!gross || exchange !== 'PSE' || !usePse) return 0;
    var rate = side === 'BUY' ? 0.00295 : 0.00395, fee = gross * rate;
    return fee < 20 ? 20 : fee;
  }

  function breakEven(totalCostNative, qty, exchange, usePse) {
    if (qty <= 0 || totalCostNative <= 0) return 0;
    if (isForex(exchange)) return totalCostNative / qty;
    var rate = (exchange === 'PSE' && usePse) ? 0.00395 : 0;
    return totalCostNative / (qty * (1 - rate));
  }

  function calculatePositions(rawT, rawF, usePse, fxRate) {
    var trades = Array.isArray(rawT) ? rawT : [], funding = Array.isArray(rawF) ? rawF : [], rate = parseFloat(fxRate) || 60;
    var cash = { php: 0, usd: 0 }, totalDep = 0, totalWdw = 0;

    funding.forEach(function(ff) {
      if (!ff) return;
      var amt = Math.max(0, parseFloat(ff.amount) || 0), cur = (ff.currency || 'PHP').toUpperCase();
      if (ff.type === 'DEPOSIT') {
        totalDep += (cur === 'USD' ? amt * rate : amt);
        if (cur === 'USD') cash.usd += amt; else cash.php += amt;
      } else {
        totalWdw += (cur === 'USD' ? amt * rate : amt);
        if (cur === 'USD') cash.usd -= amt; else cash.php -= amt;
      }
    });

    var positions = {}, cycles = [], realPnLPHP = 0;
    var sorted = trades.filter(function(t) { return t && t.ticker && t.price && t.qty; })
      .slice().sort(function(a, b) {
        return +(new Date((a.date||'1970-01-01')+'T'+(a.time||'00:00'))) - +(new Date((b.date||'1970-01-01')+'T'+(b.time||'00:00')));
      });

    sorted.forEach(function(t) {
      var type = (t.type || '').toUpperCase(), ex = t.exchange || 'PSE', tk = t.ticker;
      var p = parseFloat(t.price) || 0, q = parseFloat(t.qty) || 0, fee = calcFee(type, p, q, usePse, ex);

      if (type === 'BUY') {
        var nativeCost = isForex(ex) ? p * q : p * q + fee, phpCost = toPHP(nativeCost, ex, fxRate);
        if (!isForex(ex)) {
          if (isUSD(ex) || isCrypto(ex)) {
            if (cash.usd >= nativeCost) cash.usd -= nativeCost;
            else { var delta = nativeCost - cash.usd; cash.usd = 0; cash.php -= delta * rate; }
          } else {
            if (cash.php >= nativeCost) cash.php -= nativeCost;
            else { var delta = nativeCost - cash.php; cash.php = 0; cash.usd -= delta / rate; }
          }
        }
        if (!positions[tk]) {
          positions[tk] = { qty: 0, totalCostNative: 0, initialCostNative: 0, exchange: ex, ticker: tk, lots: [] };
          cycles.push({ ticker: tk, exchange: ex, buyCostPHP: 0, sellProceedsPHP: 0, closed: false, win: false });
        }
        positions[tk].qty += q; positions[tk].totalCostNative += nativeCost; positions[tk].initialCostNative += nativeCost;
        positions[tk].lots.push({ id: t.id, date: t.date, type: 'BUY', price: p, qty: q, fee: fee, nativeCost: nativeCost, phpCost: phpCost });
        var oc = cycles.filter(function(c){ return c.ticker === tk && !c.closed; }).pop();
        if (oc && !isForex(ex)) oc.buyCostPHP += phpCost;
      } else if (type === 'SELL') {
        if (!positions[tk] || positions[tk].qty < 0.000001) return;
        var nativeProceeds, phpProceeds, thisPnLPHP;
        if (isForex(ex)) {
          var entryAvg = positions[tk].totalCostNative / positions[tk].qty, pipPnL = (p - entryAvg) * q;
          nativeProceeds = pipPnL; phpProceeds = pipPnL * rate; thisPnLPHP = phpProceeds;
          cash.usd += pipPnL; positions[tk].totalCostNative -= entryAvg * q;
        } else {
          nativeProceeds = p * q - fee; phpProceeds = toPHP(nativeProceeds, ex, fxRate);
          var avgNative = positions[tk].totalCostNative / positions[tk].qty, avgPHP = toPHP(avgNative, ex, fxRate);
          thisPnLPHP = phpProceeds - (q * avgPHP);
          if (isUSD(ex) || isCrypto(ex)) cash.usd += nativeProceeds; else cash.php += phpProceeds;
          positions[tk].totalCostNative -= nativeProceeds;
        }
        realPnLPHP += thisPnLPHP; positions[tk].qty -= q;
        positions[tk].lots.push({ id: t.id, date: t.date, type: 'SELL', price: p, qty: q, fee: fee, nativeProceeds: nativeProceeds, phpProceeds: phpProceeds, realizedPnLPHP: thisPnLPHP });
        var oc2 = cycles.filter(function(c){ return c.ticker === tk && !c.closed; }).pop();
        if (oc2 && !isForex(ex)) oc2.sellProceedsPHP += phpProceeds;
        if (positions[tk].qty <= 0.000001) {
          if (oc2) { oc2.closed = true; oc2.win = isForex(ex) ? thisPnLPHP > 0 : oc2.sellProceedsPHP > oc2.buyCostPHP; }
          delete positions[tk];
        }
      }
    });

    var active = Object.values(positions).map(function(pos) {
      return Object.assign({}, pos, {
        avgNative: pos.totalCostNative / pos.qty, totalCostPHP: toPHP(pos.totalCostNative, pos.exchange, fxRate),
        avgPHP: toPHP(pos.totalCostNative / pos.qty, pos.exchange, fxRate),
        initialCostPHP: toPHP(pos.initialCostNative, pos.exchange, fxRate), isForex: isForex(pos.exchange)
      });
    });

    var closed = cycles.filter(function(c) { return c.closed; }), wins = closed.filter(function(c) { return c.win; });
    return { cashPHP: cash.php, cashUSD: cash.usd, cash: cash, totalDep: totalDep, totalWdw: totalWdw, active: active, realPnLPHP: realPnLPHP, winRate: closed.length ? (wins.length/closed.length)*100 : 0, closed: closed, wins: wins };
  }

  function getPerformanceStats(closed) {
    if (!closed.length) return { winRate: 0, bestTk: '—', worstTk: '—', bestPnL: 0, worstPnL: 0, avgProfit: 0, totalRealized: 0, closedCount: 0 };
    var tr = 0, best = null, worst = null;
    closed.forEach(function(c) {
      var pnl = c.sellProceedsPHP - c.buyCostPHP; tr += pnl;
      if (best === null || pnl > best.pnl) best = { tk: c.ticker, pnl: pnl };
      if (worst === null || pnl < worst.pnl) worst = { tk: c.ticker, pnl: pnl };
    });
    return { winRate: (closed.filter(function(c){return c.win;}).length/closed.length)*100, bestTk: best?best.tk:'—', worstTk: worst?worst.tk:'—', bestPnL: best?best.pnl:0, worstPnL: worst?worst.pnl:0, avgProfit: tr/closed.length, totalRealized: tr, closedCount: closed.length };
  }

  function getFundingStats(funding) {
    var sm = {}, tin = 0, tout = 0;
    (funding || []).forEach(function(f) {
      if (!f) return;
      var a = parseFloat(f.amount) || 0, s = f.source || 'Unknown';
      if (f.type === 'DEPOSIT') { tin += a; sm[s] = (sm[s] || 0) + a; } else tout += a;
    });
    var srcs = Object.keys(sm).map(function(k) { return { name: k, amount: sm[k] }; }).sort(function(a,b){ return b.amount-a.amount; });
    return { totalIn: tin, totalOut: tout, sources: srcs, net: tin - tout };
  }

  function getRiskMetrics(enriched, totalMVPHP) {
    var conc = (enriched || []).map(function(p) { return { ticker: p.ticker, share: totalMVPHP > 0 ? (p.mvPHP / totalMVPHP) * 100 : 0 }; }).sort(function(a,b){ return b.share-a.share; });
    return { topConc: conc[0] || { ticker: '—', share: 0 }, concentration: conc, overConcentrated: conc.filter(function(c){ return c.share > 30; }) };
  }

  function validateWithdrawal(amount, currency, cashState) {
    var amt = parseFloat(amount) || 0; if (amt <= 0) return { ok: false, message: 'Withdrawal amount must be positive.' };
    var cur = (currency || 'PHP').toUpperCase(), avail = cur === 'USD' ? (cashState.usd || 0) : (cashState.php || 0);
    if (amt > avail) return { ok: false, message: 'Insufficient ' + cur + '. Available: ' + (cur === 'PHP' ? '₱' : '$') + f2(avail) };
    return { ok: true };
  }

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

  function getAdvancedMetrics(trades, funding, fxRate) {
    var gp = 0, gl = 0, hw = [], hl = [], pm = {}, od = {}, re = 0;
    (funding || []).forEach(function(f) { re += (f.type === 'DEPOSIT' ? 1 : -1) * (parseFloat(f.amount) || 0); });
    var eq = [re], sorted = (trades || []).filter(function(t){return t.ticker && t.price && t.qty;}).slice().sort(function(a,b){ return ((a.date||'')+(a.time||'')).localeCompare((b.date||'')+(b.time||'')); });
    sorted.forEach(function(t) {
      var tk = t.ticker, ex = t.exchange || 'PSE', p = parseFloat(t.price) || 0, q = parseFloat(t.qty) || 0, f = calcFee(t.type, p, q, true, ex);
      if (t.type === 'BUY') { if (!pm[tk]) { pm[tk] = { qty: 0, costPHP: 0 }; od[tk] = t.date || ''; } pm[tk].qty += q; pm[tk].costPHP += toPHP(p * q + f, ex, fxRate); }
      else if (t.type === 'SELL' && pm[tk] && pm[tk].qty > 0) {
        var avg = pm[tk].costPHP / pm[tk].qty, pnl = toPHP(p * q - f, ex, fxRate) - (avg * q);
        if (pnl >= 0) gp += pnl; else gl += pnl;
        if (od[tk] && t.date) { var d = Math.max(0, Math.round((new Date(t.date) - new Date(od[tk])) / 86400000)); if (pnl >= 0) hw.push(d); else hl.push(d); }
        re += pnl; eq.push(re); pm[tk].qty -= q; pm[tk].costPHP -= avg * q; if (pm[tk].qty <= 0) { delete pm[tk]; delete od[tk]; }
      }
    });
    var peak = 0, mdd = 0; eq.forEach(function(v){ if (v > peak) peak = v; if (peak > 0) { var d = ((peak - v) / peak) * 100; if (d > mdd) mdd = d; } });
    function avgA(a) { return a.length ? a.reduce(function(s,v){return s+v;},0)/a.length : 0; }
    return { profitFactor: gl !== 0 ? gp / Math.abs(gl) : (gp > 0 ? 999 : 1), maxDrawdown: mdd, avgHoldWin: avgA(hw), avgHoldLoss: avgA(hl), grossProfit: gp, grossLoss: gl, totalRealized: gp + gl, equityPoints: eq };
  }

  function toYahooForex(s) { return s.indexOf('=') === -1 ? s + '=X' : s; }
  function toYahooCrypto(s){ return s.indexOf('-') === -1 ? s + '-USD' : s; }
  function toYahooPSE(s)   { return s.indexOf('.') === -1 ? s + '.PS' : s; }

  function fetchPrices(positionList, dateStr) {
    var updated = {}, globalFailed = false, map = {};
    (positionList || []).forEach(function(p) { if (p.ticker) map[p.ticker.toUpperCase()] = p.exchange || 'PSE'; });
    if (!map['USDPHP']) map['USDPHP'] = 'FOREX';

    var p1, p2;
    if (dateStr) {
      var d = new Date(dateStr);
      p1 = Math.floor(d.getTime() / 1000);
      p2 = p1 + 86400; // Look at a 24h window for historical
    }

    var tasks = Object.keys(map).map(function(sym) {
      var ex = map[sym], ys = sym;
      if (ex === 'PSE') ys = toYahooPSE(sym);
      else if (isForex(ex)) ys = toYahooForex(sym);
      else if (isCrypto(ex)) ys = toYahooCrypto(sym);
      else if (ex === 'NYSE') ys = sym.replace('.', '-');

      var useProxy = window.location.hostname === 'localhost' || window.location.hostname.includes('github.io');
      var url;
      if (useProxy) {
        var yUrl = 'https://query1.finance.yahoo.com/v8/finance/chart/' + ys + '?interval=1d&includePrePost=false&events=div|split';
        if (p1 && p2) yUrl += '&period1=' + p1 + '&period2=' + p2;
        url = 'https://api.allorigins.win/get?url=' + encodeURIComponent(yUrl);
      } else {
        url = '/api/prices?symbol=' + encodeURIComponent(ys);
        if (p1 && p2) url += '&period1=' + p1 + '&period2=' + p2;
      }

      return fetch(url).then(function(r) { return r.json(); })
        .then(function(j) {
          var d = j;
          if (j && j.contents) {
            try { d = JSON.parse(j.contents); } catch(e) { d = null; }
          }
          if (d && d.chart && d.chart.result && d.chart.result[0]) {
            var c = d.chart.result[0], m = c.meta;
            var px = m.regularMarketPrice || m.chartPreviousClose || m.previousClose;
            if (!px && c.indicators && c.indicators.quote && c.indicators.quote[0].close) {
              var cls = c.indicators.quote[0].close.filter(function(v){return v!==null;});
              if (cls.length) px = cls[cls.length-1];
            }
            if (px) updated[sym] = px;
          }
        }).catch(function() { globalFailed = true; });
    });

    return Promise.all(tasks).then(function() {
      if (!dateStr && Object.keys(updated).length > 0) {
        var existing = {};
        try { existing = JSON.parse(localStorage.getItem(K.mkt)) || {}; } catch(e){}
        var merged = Object.assign({}, existing, updated, { _lastUpdate: new Date().toISOString() });
        localStorage.setItem(K.mkt, JSON.stringify(merged));
      }
      return { updated: updated, pseFailed: false, globalFailed: globalFailed };
    });
  }

  function f0(v) { return (parseFloat(v)||0).toLocaleString('en-US',{maximumFractionDigits:0}); }
  function f2(v) { return (parseFloat(v)||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}); }
  function f4(v) { return (parseFloat(v)||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:4}); }
  function f5(v) { return (parseFloat(v)||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:5}); }
  function pct(v){ return ((parseFloat(v)||0).toFixed(2)) + '%'; }
  function sgn(v){ return v >= 0 ? '+' : ''; }
  function G(v)  { return v >= 0 ? '#c7e2f7' : '#5a6472'; }
  function S(ex) { return (isUSD(ex)||isCrypto(ex)||isForex(ex)) ? '$' : '₱'; }

  var engine = {
    SEED_TICKERS: SEED_TICKERS, SOURCES: SOURCES, PIE_COLORS: PIE_COLORS, K: K,
    isUSD: isUSD, isCrypto: isCrypto, isForex: isForex, toPHP: toPHP, calcFee: calcFee, breakEven: breakEven,
    calculatePositions: calculatePositions, runPortfolio: calculatePositions, runMockPortfolio: calculatePositions,
    getPerformanceStats: getPerformanceStats, getFundingStats: getFundingStats, getRiskMetrics: getRiskMetrics,
    validateWithdrawal: validateWithdrawal, runSimulation: runSimulation, getAdvancedMetrics: getAdvancedMetrics, fetchPrices: fetchPrices,
    f0: f0, f2: f2, f4: f4, f5: f5, pct: pct, sgn: sgn, G: G, S: S
  };
  window.BasicEngine = window.SovereignEngine = window.SovEngine = engine;
})(window);
