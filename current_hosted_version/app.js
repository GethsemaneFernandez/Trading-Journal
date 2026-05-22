(function (window) {
  'use strict';
  var R = window.React;
  var E = window.BasicEngine || {};
  var C = window.BJComponents || {};
  var CH = window.BJCharts || {};
  var SL = window.StudyLabEngine || {};

  console.log('app.js starting...');

  if (!R) { console.error('app.js: React not found'); return; }

  var h = R.createElement;
  var useState = R.useState;
  var useEffect = R.useEffect;
  var useMemo = R.useMemo;
  var useCallback = R.useCallback;
  var useRef = R.useRef;

  var f0 = E.f0; var f2 = E.f2; var f4 = E.f4; var f5 = E.f5;
  var pct = E.pct; var sgn = E.sgn; var G = E.G; var S = E.S;

  /* ── DASHBOARD BODY ── */
  function DashboardBody(props) {
    var enriched = props.enriched || [], port = props.port || {}, trades = props.trades || [], funding = props.funding || [];
    var tickerLists = props.tickerLists || {}, mktPx = props.mktPx || {}, setMktPx = props.setMktPx;
    var psiFee = props.psiFee, fxRate = props.fxRate;
    var isDark = props.isDark, priv = props.priv, scale = props.scale;
    var addTicker = props.addTicker, deleteTicker = props.deleteTicker;
    var onExecTrade = props.onExecTrade, isMock = props.isMock || false;
    var savedScenarios = props.savedScenarios || [], setSavedScenarios = props.setSavedScenarios, addToast = props.addToast;
    var saveTrades = props.saveTrades;

    var totalMVPHP = useMemo(function () { return (enriched || []).reduce(function (s, p) { return s + (p.mvPHP || 0); }, 0); }, [enriched]);
    var totalEqPHP = (port.cashPHP || 0) + totalMVPHP;
    var advMetrics = useMemo(function () {
      return E.getAdvancedMetrics ? E.getAdvancedMetrics(trades, funding, fxRate) : null;
    }, [trades, funding, fxRate]);
    var compact = scale === 'compact';

    var _pf = useState(null); var prefill = _pf[0]; var setPrefill = _pf[1];
    var _ac = useState(false); var isAnalyticsCollapsed = _ac[0]; var setAnalyticsCollapsed = _ac[1];
    var _as = useState(false); var isAnalyticsCompact = _as[0]; var setAnalyticsCompact = _as[1];
    var _ami = useState(false); var isAnalyticsMinimized = _ami[0]; var setAnalyticsMinimized = _ami[1];
    var _ama = useState(false); var isAnalyticsMaximized = _ama[0]; var setAnalyticsMaximized = _ama[1];
    var _ito = useState(false); var isTradeOpen = _ito[0]; var setTradeOpen = _ito[1];

    var cashTrailData = useMemo(function () {
      var allRaw = [];
      funding.forEach(function (f) {
        if (!f || !f.date) return;
        allRaw.push({ _t: f.date + 'T' + (f.time || '00:00'), date: f.date, time: f.time || '', kind: f.type === 'DEPOSIT' ? 'deposit' : 'withdraw', amount: parseFloat(f.amount) || 0, source: f.source || '', notes: f.notes || '' });
      });
      trades.filter(function (t) { return t && t.ticker && t.price && t.qty; }).forEach(function (t) {
        var k = (t.type || '').toUpperCase() === 'BUY' ? 'buy' : 'sell';
        allRaw.push({ _t: (t.date || '') + 'T' + (t.time || '00:00'), date: t.date || '', time: t.time || '', kind: k, ticker: t.ticker, price: parseFloat(t.price) || 0, qty: parseFloat(t.qty) || 0, exchange: t.exchange || 'PSE', notes: t.notes || '' });
      });
      allRaw.sort(function (a, b) { return (a._t || '').localeCompare(b._t || ''); });
      var runCash = 0; var pos = {};
      return allRaw.map(function (ev) {
        var out = Object.assign({}, ev); var ex = ev.exchange || 'PSE'; var sym = ex === 'PSE' ? '₱' : '$';
        if (ev.kind === 'deposit') { out.cashBefore = runCash; runCash += ev.amount; out.cashAfter = runCash; out.flowAmt = ev.amount; out.story = 'Cash in' + (ev.source ? ' via ' + ev.source : '') + ': ₱' + f2(ev.amount) + '.'; }
        else if (ev.kind === 'withdraw') { out.cashBefore = runCash; runCash -= ev.amount; out.cashAfter = runCash; out.flowAmt = -ev.amount; out.story = 'Withdrawal of ₱' + f2(ev.amount) + '.'; }
        else if (ev.kind === 'buy') { var bFee = E.calcFee ? E.calcFee('BUY', ev.price, ev.qty, psiFee, ex) : 0; var bCost = E.toPHP ? E.toPHP(ev.price * ev.qty + bFee, ex, fxRate) : (ev.price * ev.qty + bFee); if (!pos[ev.ticker]) pos[ev.ticker] = { qty: 0, totalCostPHP: 0 }; pos[ev.ticker].qty += ev.qty; pos[ev.ticker].totalCostPHP += bCost; out.cashBefore = runCash; runCash -= bCost; out.cashAfter = runCash; out.flowAmt = -bCost; out.story = 'Bought ' + ev.ticker + ' \u00d7' + f0(ev.qty) + ' @ ' + sym + f4(ev.price) + '.'; }
        else if (ev.kind === 'sell') { var p = pos[ev.ticker]; var sFee = E.calcFee ? E.calcFee('SELL', ev.price, ev.qty, psiFee, ex) : 0; var proc = E.toPHP ? E.toPHP(ev.price * ev.qty - sFee, ex, fxRate) : (ev.price * ev.qty - sFee); var avg = p && p.qty > 0 ? p.totalCostPHP / p.qty : 0; var basis = avg * ev.qty; var pnl = proc - basis; if (p) { p.qty -= ev.qty; p.totalCostPHP -= basis; if (p.qty <= 0) { p.qty = 0; p.totalCostPHP = 0; } } out.cashBefore = runCash; runCash += proc; out.cashAfter = runCash; out.kind = pnl >= 0 ? 'profit' : 'loss'; out.flowAmt = pnl; out.pnl = pnl; out.story = 'Sold ' + ev.ticker + ' \u00d7' + f0(ev.qty) + ' @ ' + sym + f4(ev.price) + '. ' + (pnl >= 0 ? '↑ Profit +₱' + f2(pnl) : '↓ Loss −₱' + f2(Math.abs(pnl))) + '.'; }
        return out;
      });
    }, [trades, funding, psiFee, fxRate]);

    var pieData = useMemo(function () { return (enriched || []).map(function (p) { return { label: p.ticker, v: p.mvPHP }; }); }, [enriched]);
    var pnlData = useMemo(function () { return (enriched || []).filter(function (p) { return Math.abs(p.uplPHP || 0) > 0.01; }).map(function (p) { return { label: p.ticker, v: Math.abs(p.uplPHP), color: (p.uplPHP || 0) >= 0 ? '#c7e2f7' : '#5a6472' }; }); }, [enriched]);

    var trendData = useMemo(function () {
      if (!trades.length) return [];
      var dates = []; var seen = {};
      trades.forEach(function (t) { if (t && t.date && !seen[t.date]) { seen[t.date] = true; dates.push(t.date); } });
      dates.sort(); if (dates.length > 30) dates = dates.slice(dates.length - 30);
      return dates.map(function (d) {
        var trUp = trades.filter(function (t) { return t && t.date && t.date <= d; });
        var fuUp = funding.filter(function (f) { return f && f.date && f.date <= d; });
        var snap = E.runPortfolio(trUp, fuUp, psiFee, fxRate);
        var val = (snap.cashPHP || 0) + (snap.active || []).reduce(function (s, p) { return s + (E.toPHP ? E.toPHP(p.avgNative * p.qty, p.exchange, fxRate) : p.avgNative * p.qty); }, 0);
        return { label: d.slice(5), value: val };
      });
    }, [trades, funding, psiFee, fxRate]);

    function quickSell(p) { setPrefill(Object.assign({}, p, { ts: Date.now() })); setTradeOpen(true); }

    var analyticsHeader = h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 12px', background: 'rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.08)' } },
      h('span', { className: "sec-hd tm", style: { fontSize: 10, fontWeight: 700 } }, isAnalyticsMaximized ? "Analytics Dashboard (Fullscreen)" : "Analytics Dashboard"),
      h('div', { style: { display: 'flex', alignItems: 'center', gap: 2 } },
        h('button', { onClick: function () { if (isAnalyticsMaximized) { setAnalyticsMinimized(true); setAnalyticsMaximized(false); } else { setAnalyticsMinimized(function (v) { return !v; }); } }, className: "win-btn" }, h(C.IcMin)),
        h('button', { onClick: function () { setAnalyticsMaximized(function (v) { return !v; }); setAnalyticsMinimized(false); }, className: "win-btn" }, h(C.IcMax)),
        h('button', { onClick: function () { setAnalyticsCollapsed(true); setAnalyticsMaximized(false); }, className: "win-btn close" }, h(C.IcX))
      )
    );

    return h('div', { style: { position: 'relative', width: '100%', height: '100%', overflow: 'hidden' } },
      h('div', { style: { width: '100%', height: '100%', padding: 'var(--pad)', overflow: 'hidden' } },
        h('div', { style: { display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', gap: 'var(--gap)' } },
          !isAnalyticsCollapsed ? (
            isAnalyticsMaximized ? h('div', { className: 'panel', style: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' } },
              analyticsHeader,
              h('div', { style: { flex: 1, overflow: 'auto', padding: '16px 20px' } },
                h(CH.AnalyticsRow, { pieData: pieData, pnlData: pnlData, trendData: trendData, cashTrailData: cashTrailData, isDark: isDark, compact: false, enriched: enriched, advMetrics: advMetrics }),
                h('div', { style: { marginTop: 16 } }, h(CH.CashTrailChart, { data: cashTrailData, isDark: isDark, full: true }))
              )
            ) : h(C.VSplitPane, { storageKey: 'bj151_vsplit', defaultSplit: 40, minTop: 15, maxTop: 85,
                top: h('div', { className: 'panel', style: { flexShrink: 0, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' } },
                  analyticsHeader,
                  !isAnalyticsMinimized && h('div', { style: { flex: 1, minHeight: 0, overflow: 'auto', padding: 'var(--pad)' } },
                    h(CH.AnalyticsRow, { pieData: pieData, pnlData: pnlData, trendData: trendData, cashTrailData: cashTrailData, isDark: isDark, compact: isAnalyticsCompact || compact, enriched: enriched, advMetrics: advMetrics })
                  )
                ),
                bottom: h('div', { style: { display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' } },
                  h(C.PositionsTable, { enriched: enriched, totalMVPHP: totalMVPHP, mktPx: mktPx, setMktPx: setMktPx, quickSell: quickSell, priv: priv, isDark: isDark })
                )
              })
          ) : h('div', { style: { display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' } },
                h(C.PositionsTable, { enriched: enriched, totalMVPHP: totalMVPHP, mktPx: mktPx, setMktPx: setMktPx, quickSell: quickSell, priv: priv, isDark: isDark })
              )
        )
      ),
      h('button', { onClick: function () { setTradeOpen(function (v) { return !v; }); }, className: 'chat-head' + (isTradeOpen ? ' active' : ''), style: { position: 'absolute', bottom: 25, left: 25, zIndex: 1000 } }, "TRADE"),
      isTradeOpen && h('div', { className: "floating-panel", style: { position: 'absolute', bottom: 85, left: 25, width: 380, zIndex: 999, background: '#0d1117', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' } },
        h(C.TradeForm, { enriched: enriched, psiFee: psiFee, fxRate: fxRate, tickerLists: tickerLists, mktPx: mktPx, onExec: onExecTrade, addTicker: addTicker, deleteTicker: deleteTicker, isDark: isDark, priv: priv, isMock: isMock, prefill: prefill, port: port })
      )
    );
  }
  window.DashboardBody = DashboardBody;

  /* ── APP ── */
  function App() {
    var _dark = useState(true); var isDark = _dark[0]; var setDark = _dark[1];
    var _fs = useState('medium'); var fontSize = _fs[0]; var setFontSize = _fs[1];
    var _view = useState('dashboard'); var view = _view[0]; var setView = _view[1];
    var _trades = useState([]); var trades = _trades[0]; var setTrades = _trades[1];
    var _funding = useState([]); var funding = _funding[0]; var setFunding = _funding[1];
    var _tl = useState({ PSE: [], NASDAQ: [], NYSE: [], CRYPTO: [], FOREX: [] }); var tickerLists = _tl[0]; var setTickerLists = _tl[1];
    var _mp = useState({}); var mktPx = _mp[0]; var setMktPx = _mp[1];
    var _fx = useState(60); var fxRate = _fx[0]; var setFxRate = _fx[1];
    var _ps = useState(true); var psiFee = _ps[0]; var setPsiFee = _ps[1];
    var _pr = useState(false); var priv = _pr[0]; var setPriv = _pr[1];
    var _ss = useState(false); var showSettings = _ss[0]; var setShowSettings = _ss[1];
    var _sfx = useState(false); var showFx = _sfx[0]; var setShowFx = _sfx[1];
    var _uv = useState(false); var usdView = _uv[0]; var setUsdView = _uv[1];
    var _scale = useState('default'); var scale = _scale[0]; var setScale = _scale[1];
    var _rfr = useState(false); var refreshing = _rfr[0]; var setRefreshing = _rfr[1];
    var _tlist = C.useToasts(); var toasts = _tlist[0]; var addToast = _tlist[1];

    useEffect(function () {
      var th = localStorage.getItem(E.K.th); if (th === 'light') setDark(false);
      var sc = localStorage.getItem(E.K.sc); if (sc === 'compact' || sc === 'wide') setScale(sc);
      if (localStorage.getItem(E.K.pr) === '1') setPriv(true);
      if (localStorage.getItem(E.K.fe) === '0') setPsiFee(false);
      var fx = parseFloat(localStorage.getItem(E.K.fx)); if (fx > 0) setFxRate(fx);
      var t, f, tk;
      try { t = JSON.parse(localStorage.getItem(E.K.t)); } catch (e) { }
      try { f = JSON.parse(localStorage.getItem(E.K.f)); } catch (e) { }
      try { tk = JSON.parse(localStorage.getItem(E.K.tk)); } catch (e) { }
      if (Array.isArray(t)) setTrades(t);
      if (Array.isArray(f)) setFunding(f);
      if (tk && typeof tk === 'object') setTickerLists(tk);
    }, []);

    useEffect(function () { document.body.className = isDark ? 'dark' : 'light'; if (scale !== 'default') document.body.classList.add('sc-' + scale); }, [isDark, scale]);

    var port = useMemo(function () { return E.runPortfolio ? E.runPortfolio(trades, funding, psiFee, fxRate) : { cashPHP: 0, active: [], realPnLPHP: 0, winRate: 0, totalDep: 0 }; }, [trades, funding, psiFee, fxRate]);
    var enriched = useMemo(function () {
      return (port.active || []).map(function (p) {
        var mp = parseFloat(mktPx[p.ticker]) || p.avgNative;
        var mvPHP = E.toPHP ? E.toPHP(mp * p.qty, p.exchange, fxRate) : mp * p.qty;
        var uplPHP = E.toPHP ? E.toPHP((mp - p.avgNative) * p.qty, p.exchange, fxRate) : (mp - p.avgNative) * p.qty;
        return Object.assign({}, p, { mp: mp, mvPHP: mvPHP, uplPHP: uplPHP });
      });
    }, [port.active, mktPx, fxRate, psiFee]);

    var totalMVPHP = (enriched || []).reduce(function (s, p) { return s + (p.mvPHP || 0); }, 0);
    var totalEqPHP = (port.cashPHP || 0) + totalMVPHP;
    var exposure = totalEqPHP > 0 ? (totalMVPHP / totalEqPHP) * 100 : 0;

    function save(nT, nF) {
      if (nT !== undefined) { setTrades(nT); localStorage.setItem(E.K.t, JSON.stringify(nT)); }
      if (nF !== undefined) { setFunding(nF); localStorage.setItem(E.K.f, JSON.stringify(nF)); }
    }

    function addTicker(ex, tk) {
      var u = tk.toUpperCase().trim(); if (!u) return;
      var updated = Object.assign({}, tickerLists); updated[ex] = (tickerLists[ex] || []).concat([u]);
      setTickerLists(updated); localStorage.setItem(E.K.tk, JSON.stringify(updated));
    }
    function deleteTicker(ex, tk) {
      var updated = Object.assign({}, tickerLists); updated[ex] = (tickerLists[ex] || []).filter(function (t) { return t !== tk; });
      setTickerLists(updated); localStorage.setItem(E.K.tk, JSON.stringify(updated));
    }

    function execLiveTrade(t, side) {
      if (!(tickerLists[t.exchange] && tickerLists[t.exchange].includes(t.ticker))) addTicker(t.exchange, t.ticker);
      save(trades.concat([t]));
      addToast(side + ' ' + f0(t.qty) + ' ' + t.ticker, 'ok');
    }

    function doRefresh(dateStr, targetPositions) {
      var all = targetPositions || enriched;
      if (!all.length && !dateStr) { addToast('No positions to refresh', 'info'); return; }
      setRefreshing(true);
      if(E.fetchPrices) {
        E.fetchPrices(all, dateStr).then(function(res){
          setRefreshing(false);
          if (res && res.updated) {
            setMktPx(function(prev){ return Object.assign({}, prev, res.updated); });
            if (res.updated['USDPHP']) { setFxRate(res.updated['USDPHP']); localStorage.setItem(E.K.fx, res.updated['USDPHP']); }
          }
          addToast(dateStr ? 'Traveled to ' + dateStr : 'Market synced', 'ok');
        }).catch(function(){ setRefreshing(false); addToast('Fetch failed', 'err'); });
      } else { setRefreshing(false); }
    }

    function onImportJSON() {
      var input = document.createElement('input');
      input.type = 'file'; input.accept = '.json';
      input.onchange = function(e){
        var file = e.target.files[0]; if(!file) return;
        var reader = new FileReader();
        reader.onload = function(ev){
          try {
            var data = JSON.parse(ev.target.result);
            if(confirm('Overwrite local data with this backup?')){
              if(data.trades) { setTrades(data.trades); localStorage.setItem(E.K.t, JSON.stringify(data.trades)); }
              if(data.funding) { setFunding(data.funding); localStorage.setItem(E.K.f, JSON.stringify(data.funding)); }
              if(data.tickerLists) { setTickerLists(data.tickerLists); localStorage.setItem(E.K.tk, JSON.stringify(data.tickerLists)); }
              addToast('Data Imported', 'ok');
            }
          } catch(err){ addToast('Invalid JSON', 'err'); }
        };
        reader.readAsText(file);
      };
      input.click();
    }

    function onExportJSON() {
      var data = { trades: trades, funding: funding, tickerLists: tickerLists };
      var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a'); a.href = url; a.download = 'BasicJournal_Backup_' + new Date().toISOString().slice(0, 10) + '.json'; a.click();
      addToast('Backup Exported', 'ok');
    }

    var displayVal = function(php) { return usdView ? ('$' + f2(php/fxRate)) : ('₱' + f2(php)); };
    var today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    return h('div', { style: { height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' } },
      h(C.Toasts, { list: toasts }),
      showFx && h('div', { className: "glass", style: { position: 'fixed', inset: 0, zIndex: 1001, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(10px)' } },
        h('div', { style: { background: '#111', padding: 20, borderRadius: 10, width: 300, border: '1px solid rgba(255,255,255,0.1)' } },
          h('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 15 } }, h('span', { className: "tp", style: { fontWeight: 700 } }, "FX Settings"), h('button', { onClick: function(){ setShowFx(false); }, className: "ic" }, h(C.IcX))),
          h(C.F, { label: "USD/PHP Rate" }, h('input', { type: "number", value: fxRate, onChange: function(e){ var v = parseFloat(e.target.value); setFxRate(v); localStorage.setItem(E.K.fx, v); }, className: "inp", style: { width: '100%' } })),
          h('button', { onClick: function(){ setShowFx(false); }, className: "btn btn-blue", style: { width: '100%', marginTop: 10 } }, "Done")
        )
      ),
      showSettings && h('div', { className: "glass", style: { position: 'fixed', inset: 0, zIndex: 1001, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(10px)' } },
        h('div', { style: { background: '#111', padding: 20, borderRadius: 10, width: 300, border: '1px solid rgba(255,255,255,0.1)' } },
          h('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 15 } }, h('span', { className: "tp", style: { fontWeight: 700 } }, "System Settings"), h('button', { onClick: function(){ setShowSettings(false); }, className: "ic" }, h(C.IcX))),
          h('button', { onClick: function(){ setShowSettings(false); }, className: "btn btn-blue", style: { width: '100%' } }, "Close")
        )
      ),
      h('nav', { className: "nav-bar", style: { height: 60, flexShrink: 0, display: 'flex', alignItems: 'center', padding: '0 20px', gap: 10, borderBottom: '1px solid rgba(255,255,255,0.05)', background: '#0d1117' } },
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginRight: 10 } },
          h('svg', { width: 24, height: 24, viewBox: "0 0 24 24", fill: "none" }, h('path', { d: "M12 2L2 7L2 17L12 22L22 17L22 7L12 2Z", stroke: "#3b82f6", strokeWidth: 2, fill: "rgba(59,130,246,0.1)" })),
          h('div', null, h('div', { style: { color: '#c7e2f7', fontWeight: 900, fontSize: 11, letterSpacing: '0.1em' } }, "BASIC JOURNAL"), h('div', { className: "mono tf", style: { fontSize: 7, opacity: 0.6 } }, "V1.5.1-MASSIVE"))
        ),
        [{ v: 'dashboard', l: 'Dashboard' }, { v: 'ledger', l: 'Ledger' }, { v: 'wallet', l: 'Wallet' }, { v: 'studylab', l: 'Study Lab' }, { v: 'sandbox', l: 'Predictor' }].map(function (item) {
          return h('button', { key: item.v, id: 'nav-' + item.v, onClick: function () { setView(item.v); }, className: 'nl' + (view === item.v ? ' on' : '') }, item.l);
        }),
        h('div', { style: { marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 } },
          h('button', { onClick: onExportJSON, className: "ghost", style: { fontSize: 8 } }, "💾 Export"),
          h('button', { onClick: onImportJSON, className: "ghost", style: { fontSize: 8 } }, "📂 Import"),
          h('button', { onClick: function(){ setShowFx(true); }, className: "ghost", style: { fontSize: 8, padding: '4px 8px', border: '1px solid rgba(16,185,129,0.2)', color: '#6ee7b7' } }, "₱" + fxRate),
          h('button', { onClick: function(){ setPsiFee(!psiFee); localStorage.setItem(E.K.fe, !psiFee?'1':'0'); }, className: psiFee ? "fee-on" : "fee-off", style: { fontSize: 8 } }, psiFee ? "PSE FEE" : "0 FEE"),
          h('button', { onClick: function(){ setDark(!isDark); localStorage.setItem(E.K.th, !isDark?'dark':'light'); }, className: "ic" }, isDark ? h(C.IcSun) : h(C.IcMoon)),
          h('button', { onClick: function(){ setShowSettings(true); }, className: "ic" }, h(C.IcSettings)),
          h('button', { onClick: function(){ setPriv(!priv); localStorage.setItem(E.K.pr, !priv?'1':'0'); }, className: "ic" + (priv ? " on" : "") }, h(C.IcEye)),
          h('button', { onClick: function(){ doRefresh(); }, className: 'refresh-btn' + (refreshing ? ' loading' : '') }, h(C.IcRefresh), refreshing ? "Syncing" : "Refresh")
        )
      ),
      h('div', { className: "hud-bar", style: { height: 80, flexShrink: 0, display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.01)' } },
        [{ id: 'hud-equity', l: 'Total Equity', v: displayVal(totalEqPHP), s: pct(exposure) + ' in market', cls: 'hud-violet' },
         { id: 'hud-cash', l: 'Available Cash', v: displayVal(port.cashPHP), s: 'NET LIQUIDITY', cls: 'hud-emerald' },
         { id: 'hud-rpnl', l: 'Realized P&L', v: displayVal(port.realPnLPHP), s: 'ROI ' + sgn(port.realPnLPHP) + pct(port.totalDep > 0 ? (port.realPnLPHP / port.totalDep) * 100 : 0), cls: port.realPnLPHP >= 0 ? 'hud-emerald' : 'hud-rose' },
         { id: 'hud-win', l: 'Win Rate', v: pct(port.winRate), s: 'CLOSED TRADES', cls: port.winRate >= 50 ? 'hud-emerald' : 'hud-rose' },
         { id: 'hud-mv', l: 'Market Value', v: displayVal(totalMVPHP), s: (enriched.length) + ' active pos', cls: 'hud-blue' }].map(function(c, i){
          return h('div', { key: i, id: c.id, style: { flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 20px', borderRight: i < 4 ? '1px solid rgba(255,255,255,0.05)' : 'none' } },
            h('div', { className: "sec-hd tf", style: { fontSize: 8, marginBottom: 2 } }, c.l),
            h(C.N, { v: c.v, priv: priv, cls: c.cls, style: { fontSize: 16, fontWeight: 800, lineHeight: 1.2 } }),
            h('div', { className: "mono tf", style: { fontSize: 7, opacity: 0.5, marginTop: 2 } }, c.s)
          );
        })
      ),
      h('div', { style: { flex: 1, minHeight: 0, overflow: 'hidden', position: 'relative' } },
        view === 'dashboard' && h(DashboardBody, { enriched: enriched, port: port, trades: trades, funding: funding, mktPx: mktPx, fxRate: fxRate, psiFee: psiFee, isDark: isDark, priv: priv, scale: scale, onExecTrade: execLiveTrade, addToast: addToast, tickerLists: tickerLists, addTicker: addTicker, deleteTicker: deleteTicker }),
        view === 'ledger' && h('div', { style: { height: '100%', padding: 'var(--pad)', overflow: 'auto' } }, h('table', { className: "tbl accounting-tbl" }, h('thead', null, h('tr', null, ['DATE', 'TYPE', 'TICKER', 'PRICE', 'QTY', 'GROSS', 'FEE', 'NET'].map(function(t){ return h('th', { key: t, className: "th mono" }, t); }))), h('tbody', null, trades.slice().reverse().map(function(t, i){
          var isB = t.type === 'BUY';
          var fee = E.calcFee ? E.calcFee(t.type, t.price, t.qty, psiFee, t.exchange) : 0;
          return h('tr', { key: i, className: "tr-h" }, h('td', { className: "td mono" }, t.date), h('td', { className: "td" }, h('span', { className: 'tag tag-' + t.type.toLowerCase() }, t.type)), h('td', { className: "td mono tm" }, t.ticker), h('td', { className: "td mono" }, f2(t.price)), h('td', { className: "td mono" }, f0(t.qty)), h('td', { className: "td mono" }, f2(t.price*t.qty)), h('td', { className: "td mono", style: { color: '#f59e0b' } }, f2(fee)), h('td', { className: "td mono tm", style: { fontWeight: 700, color: isB ? '#f43f5e' : '#10b981' } }, f2(isB ? -(t.price*t.qty+fee) : (t.price*t.qty-fee))));
        })))),
        view === 'wallet' && h('div', { style: { height: '100%', padding: 'var(--pad)', display: 'flex', gap: 'var(--gap)' } },
          h('div', { className: "panel", style: { width: 300, padding: 20 } }, h('h3', { className: "sec-hd tm" }, "Funding"), h(C.F, { label: "Amount" }, h('input', { type: "number", className: "inp", id: "w-amt" })), h('button', { className: "btn btn-blue", style: { width: '100%', marginTop: 15 }, onClick: function(){ var a = parseFloat(document.getElementById('w-amt').value); if(a) save(undefined, funding.concat([{ type: 'DEPOSIT', amount: a, date: new Date().toISOString().slice(0, 10), id: Date.now() }])); addToast('Deposit recorded', 'ok'); } }, "Record Deposit")),
          h('div', { className: "panel", style: { flex: 1, padding: 20, overflow: 'auto' } }, h('h3', { className: "sec-hd tm" }, "History"), h('table', { className: "tbl" }, h('thead', null, h('tr', null, h('th', { className: "th" }, "Date"), h('th', { className: "th" }, "Type"), h('th', { className: "th" }, "Amount"))), h('tbody', null, funding.slice().reverse().map(function(f, i){ return h('tr', { key: i }, h('td', { className: "td mono" }, f.date), h('td', { className: "td" }, f.type), h('td', { className: "td mono tm" }, "₱" + f2(f.amount))); }))))
        ),
        view === 'studylab' && h(window.StudyLabEngine ? window.StudyLabEngine.StudyLabUI : 'div', { liveTrades: trades, fxRate: fxRate, isDark: isDark, doRefresh: doRefresh, DashboardBody: DashboardBody, tickerLists: tickerLists, mktPx: mktPx, psiFee: psiFee, addToast: addToast, addTicker: addTicker, deleteTicker: deleteTicker }),
        view === 'sandbox' && h(window.StudyLabEngine ? window.StudyLabEngine.PredictorV42 : 'div', { enriched: enriched, trades: trades, fxRate: fxRate, isDark: isDark, DashboardBody: DashboardBody, usePse: psiFee, addToast: addToast, tickerLists: tickerLists })
      )
    );
  }

  var rootEl = document.getElementById('root');
  if (rootEl) { window.ReactDOM.createRoot(rootEl).render(h(App)); }
})(window);
