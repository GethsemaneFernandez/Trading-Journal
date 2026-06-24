(function (window) {
  'use strict';
  var R = window.React;
  var E = window.BasicEngine || {};
  var C = window.BJComponents || {};
  var CH = window.BJCharts || {};
  var SL = window.StudyLabEngine || {};

  console.log('app.js starting...');
  console.log('DEBUG SL Keys: ' + Object.keys(SL).join(', '));
  console.log('DEBUG StudyLabUI Type: ' + typeof SL.StudyLabUI);
  console.log('DEBUG PredictorV42 Type: ' + typeof SL.PredictorV42);

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

    var _pos = useState(function() {
      try {
        var p = JSON.parse(localStorage.getItem('bj_panel_pos') || '{}');
        return { x: p.x || 28, y: p.y || 28 };
      } catch(e) { return { x: 28, y: 28 }; }
    });
    var bubblePos = _pos[0]; var setBubblePos = _pos[1];
    var isDragging = useRef(false);
    var dragStart = useRef({ mx: 0, my: 0, bx: 0, by: 0 });
    var hasDragged = useRef(false);

    var _pw = useState(function() { return parseInt(localStorage.getItem('bj_panel_w') || '420'); });
    var panelW = _pw[0]; var setPanelW = _pw[1];
    var _ph = useState(function() { return parseInt(localStorage.getItem('bj_panel_h') || '600'); });
    var panelH = _ph[0]; var setPanelH = _ph[1];

    var _fm = useState(false); var isForexMode = _fm[0]; var setForexMode = _fm[1];
    var _fsl = useState(''); var fxSL = _fsl[0]; var setFxSL = _fsl[1];
    var _ftp = useState(''); var fxTP = _ftp[0]; var setFxTP = _ftp[1];
    var _fxc = useState(null); var fxCalc = _fxc[0]; var setFxCalc = _fxc[1];

    var dwRef = useRef(panelW); var dhRef = useRef(panelH);
    useEffect(function() { dwRef.current = panelW; dhRef.current = panelH; }, [panelW, panelH]);

    var handleResizeStart = function(e) {
      e.preventDefault();
      var startX = e.clientX; var startY = e.clientY;
      var startW = dwRef.current; var startH = dhRef.current;
      var lastW = startW; var lastH = startH;
      function onMove(me) {
        lastW = Math.min(560, Math.max(320, startW + (startX - me.clientX)));
        lastH = Math.min(window.innerHeight - 130, Math.max(400, startH + (startY - me.clientY)));
        setPanelW(lastW); setPanelH(lastH);
      }
      function onUp() {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        localStorage.setItem('bj_panel_w', lastW);
        localStorage.setItem('bj_panel_h', lastH);
      }
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    };

    function updateFxCalc() {
      var entry = prefill ? parseFloat(prefill.mp || prefill.avgNative || 0) : 0;
      var sl = parseFloat(fxSL); var tp = parseFloat(fxTP);
      if (!entry || !sl || !tp) { setFxCalc(null); return; }
      var slPips = Math.abs(entry - sl) * 10000;
      var tpPips = Math.abs(tp - entry) * 10000;
      var rr = slPips > 0 ? (tpPips / slPips).toFixed(2) : '—';
      var rrNum = parseFloat(rr);
      setFxCalc({
        slPips: slPips.toFixed(1),
        tpPips: tpPips.toFixed(1),
        rr: isNaN(rrNum) ? '—' : '1:' + rr,
        rrColor: rrNum >= 2 ? '#10b981' : rrNum >= 1 ? '#f59e0b' : '#f43f5e'
      });
    }

    useEffect(function() {
      if (prefill && prefill.exchange && E.isForex(prefill.exchange)) {
        setForexMode(true);
      } else if (prefill && prefill.exchange) {
        setForexMode(false);
      }
    }, [prefill]);

    useEffect(function() { updateFxCalc(); }, [prefill, fxSL, fxTP]);

    // Inject chat head CSS keyframes once on mount
    useEffect(function() {
      if (document.getElementById('chat-head-styles')) return;
      var style = document.createElement('style');
      style.id = 'chat-head-styles';
      style.textContent = [
        '@keyframes chatHeadPulse {',
        '  0%,100% { box-shadow: 0 4px 24px rgba(59,130,246,0.5), 0 0 0 0 rgba(59,130,246,0.4); }',
        '  50% { box-shadow: 0 4px 24px rgba(59,130,246,0.5), 0 0 0 8px rgba(59,130,246,0); }',
        '}',
        '@keyframes panelSlideIn {',
        '  from { opacity: 0; transform: translateY(12px) scale(0.98); }',
        '  to   { opacity: 1; transform: translateY(0)    scale(1); }',
        '}',
        '.chat-head-bubble { animation: chatHeadPulse 2s infinite; }',
        '.trade-panel-open { animation: panelSlideIn 0.25s ease forwards; }'
      ].join('\n');
      document.head.appendChild(style);
    }, []);

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
      var runCash = 0;
      var pos = {};
      return allRaw.map(function (ev) {
        var out = Object.assign({}, ev);
        var ex = ev.exchange || 'PSE';
        var sym = ex === 'PSE' ? '₱' : '$';
        if (ev.kind === 'deposit') {
          out.cashBefore = runCash; runCash += ev.amount; out.cashAfter = runCash;
          out.flowAmt = ev.amount;
          out.story = 'Cash in' + (ev.source ? ' via ' + ev.source : '') + ': ₱' + f2(ev.amount) + '. Available cash \u2192 ₱' + f2(runCash) + '.';
        } else if (ev.kind === 'withdraw') {
          out.cashBefore = runCash; runCash -= ev.amount; out.cashAfter = runCash;
          out.flowAmt = -ev.amount;
          out.story = 'Withdrawal of ₱' + f2(ev.amount) + '. Remaining \u2192 ₱' + f2(runCash) + '.';
        } else if (ev.kind === 'buy') {
          var bFee = E.calcFee ? E.calcFee('BUY', ev.price, ev.qty, psiFee, ex) : 0;
          var bCost = E.toPHP ? E.toPHP(ev.price * ev.qty + bFee, ex, fxRate) : (ev.price * ev.qty + bFee);
          if (!pos[ev.ticker]) pos[ev.ticker] = { qty: 0, totalCostPHP: 0 };
          pos[ev.ticker].qty += ev.qty; pos[ev.ticker].totalCostPHP += bCost;
          out.cashBefore = runCash; runCash -= bCost; out.cashAfter = runCash;
          out.flowAmt = -bCost; out.costPHP = bCost; out.fee = E.toPHP ? E.toPHP(bFee, ex, fxRate) : bFee;
          out.story = 'Bought ' + ev.ticker + ' \u00d7' + f0(ev.qty) + ' @ ' + sym + f4(ev.price) + ' = ₱' + f2(bCost) + ' (fee ₱' + f2(out.fee) + '). Cash left \u2192 ₱' + f2(runCash) + '.';
        } else if (ev.kind === 'sell') {
          var p = pos[ev.ticker];
          var sFee = E.calcFee ? E.calcFee('SELL', ev.price, ev.qty, psiFee, ex) : 0;
          var proc = E.toPHP ? E.toPHP(ev.price * ev.qty - sFee, ex, fxRate) : (ev.price * ev.qty - sFee);
          var avg = p && p.qty > 0 ? p.totalCostPHP / p.qty : 0;
          var basis = avg * ev.qty;
          var pnl = proc - basis;
          if (p) { p.qty -= ev.qty; p.totalCostPHP -= basis; if (p.qty <= 0) { p.qty = 0; p.totalCostPHP = 0; } }
          out.cashBefore = runCash; runCash += proc; out.cashAfter = runCash;
          out.kind = pnl >= 0 ? 'profit' : 'loss';
          out.flowAmt = pnl; out.procPHP = proc; out.costBasis = basis; out.pnl = pnl;
          out.story = 'Sold ' + ev.ticker + ' \u00d7' + f0(ev.qty) + ' @ ' + sym + f4(ev.price) + '. Cost basis ₱' + f2(basis) + ', proceeds ₱' + f2(proc) + '. ' + (pnl >= 0 ? '↑ Profit +₱' + f2(pnl) : '↓ Loss −₱' + f2(Math.abs(pnl))) + '. Cash \u2192 ₱' + f2(runCash) + '.';
        }
        return out;
      });
    }, [trades, funding, psiFee, fxRate]);

    var pieData = useMemo(function () { return (enriched || []).map(function (p) { return { label: p.ticker, v: p.initialCostPHP || p.totalCostPHP || p.mvPHP }; }); }, [enriched]);
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

    function quickSell(p) {
      setPrefill(Object.assign({}, p, { ts: Date.now() }));
      if (addToast) addToast('Quick-Sell: ' + p.ticker, 'info');
      setTradeOpen(true);
    }

    var analyticsHeader = h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 12px', background: 'rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.08)' } },
      h('span', { className: "sec-hd tm", style: { fontSize: 10, fontWeight: 700 } }, isAnalyticsMaximized ? "Analytics Dashboard (Fullscreen)" : "Analytics Dashboard"),
      h('div', { style: { display: 'flex', alignItems: 'center', gap: 2 } },
        h('button', { onMouseDown: function (e) { e.stopPropagation(); if (isAnalyticsMaximized) { setAnalyticsMinimized(true); setAnalyticsMaximized(false); } else { setAnalyticsMinimized(function (v) { return !v; }); } }, className: "win-btn", title: "Minimize/Expand" }, h(C.IcMin)),
        h('button', { onMouseDown: function (e) { e.stopPropagation(); setAnalyticsMaximized(function (v) { return !v; }); setAnalyticsMinimized(false); }, className: "win-btn", title: isAnalyticsMaximized ? "Restore" : "Fullscreen" }, h(C.IcMax)),
        h('button', { onMouseDown: function (e) { e.stopPropagation(); setAnalyticsCollapsed(true); setAnalyticsMaximized(false); }, className: "win-btn close", title: "Close" }, h(C.IcX))
      )
    );

    var quantMetricsGrid = h('div', { style: { marginTop: 20, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 } },
      /* Block 1: Performance */
      h('div', { style: { background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '14px 16px' } },
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 } },
          h('span', { style: { color: '#94a3b8', fontSize: 10 } }, "◆"),
          h('span', { className: "sec-hd tm", style: { fontSize: 9.5 } }, "Performance Metrics")
        ),
        (function () {
          var closed = port.closed || [];
          var wins = port.wins || [];
          var totalR = trades.filter(function (t) { return (t.type || '').toUpperCase() === 'SELL'; }).length;
          var totalB = trades.filter(function (t) { return (t.type || '').toUpperCase() === 'BUY'; }).length;
          var wr = closed.length > 0 ? (wins.length / closed.length * 100).toFixed(1) : '—';
          var allPnLs = cashTrailData.filter(function (d) { return d.kind === 'profit' || d.kind === 'loss'; });
          var totalRPnL = allPnLs.reduce(function (s, d) { return s + (d.pnl || 0); }, 0);
          var avgPerTrade = allPnLs.length ? totalRPnL / allPnLs.length : 0;
          var profitTrades = cashTrailData.filter(function (d) { return d.kind === 'profit'; });
          var lossTrades = cashTrailData.filter(function (d) { return d.kind === 'loss'; });
          var rows = [
            ['Win Rate', wr + (wr !== '—' ? '%' : ''), (closed.length > 0 && wins.length / closed.length >= 0.5) ? '#c7e2f7' : '#5a6472'],
            ['Profit Factor', advMetrics ? (advMetrics.profitFactor >= 999 ? '∞' : advMetrics.profitFactor.toFixed(2)) : '—', (advMetrics && advMetrics.profitFactor >= 1) ? '#c7e2f7' : '#f43f5e'],
            ['Max Drawdown', advMetrics ? advMetrics.maxDrawdown.toFixed(1) + '%' : '—', (advMetrics && advMetrics.maxDrawdown > 20) ? '#f43f5e' : '#94a3b8'],
            ['Total Closed', closed.length, '#94a3b8'],
            ['Winning Trades', profitTrades.length, '#c7e2f7'],
            ['Losing Trades', lossTrades.length, '#f43f5e'],
            ['Avg P&L / Trade', (avgPerTrade >= 0 ? '+' : '') + '₱' + f2(Math.abs(avgPerTrade)), avgPerTrade >= 0 ? '#c7e2f7' : '#f43f5e'],
            ['Total Realized', (totalRPnL >= 0 ? '+' : '') + '₱' + f2(Math.abs(totalRPnL)), totalRPnL >= 0 ? '#c7e2f7' : '#f43f5e'],
            ['Buy Orders', totalB, '#94a3b8'],
            ['Sell Orders', totalR, '#64748b'],
          ];
          return rows.map(function (r, i) {
            return h('div', { key: i, style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' } },
              h('span', { className: "tf", style: { fontSize: 9, opacity: 0.7 } }, r[0]),
              h('span', { className: "mono", style: { fontSize: 10, fontWeight: 700, color: r[2] } }, r[1])
            );
          });
        })()
      ),
      /* Block 2: Active Positions Audit */
      h('div', { style: { background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '14px 16px' } },
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 } },
          h('span', { style: { color: '#64748b', fontSize: 10 } }, "◆"),
          h('span', { className: "sec-hd tm", style: { fontSize: 9.5 } }, "Positions Audit")
        ),
        h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          enriched.length === 0 && h('span', { className: "tf", style: { fontSize: 9, opacity: 0.4 } }, "No open positions"),
          enriched.map(function (p, i) {
            var alloc = totalMVPHP > 0 ? (p.mvPHP / totalMVPHP * 100).toFixed(1) : '0.0';
            var lots = (p.lots || []).filter(function (l) { return l.type === 'BUY'; }).length;
            return h('div', { key: i, style: { background: 'rgba(255,255,255,0.02)', borderRadius: 6, padding: '7px 9px', border: '1px solid rgba(255,255,255,0.04)' } },
              h('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 4 } },
                h('span', { className: "mono", style: { fontSize: 10, fontWeight: 800, color: '#c7e2f7' } }, p.ticker),
                h('span', { className: "tf", style: { fontSize: 8.5 } }, p.exchange + " · " + lots + " lot" + (lots !== 1 ? 's' : ''))
              ),
              h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 10px' } },
                [['Qty', f0(p.qty)], ['Avg Entry', (S(p.exchange)) + (E.isForex(p.exchange)?f5(p.avgNative):f4(p.avgNative))], ['Alloc', alloc + '%'], ['UPnL', ((p.uplPHP || 0) >= 0 ? '+' : '') + f2(p.uplPHP || 0)]].map(function (row, j) {
                  return h('div', { key: j, style: { display: 'flex', justifyContent: 'space-between' } },
                    h('span', { className: "tf", style: { fontSize: 7.5, opacity: 0.55 } }, row[0]),
                    h('span', { className: "mono", style: { fontSize: 8.5, fontWeight: 600, color: row[0] === 'UPnL' ? ((p.uplPHP || 0) >= 0 ? '#c7e2f7' : '#f43f5e') : '#94a3b8' } }, row[1])
                  );
                })
              )
            );
          })
        )
      ),
      /* Block 3: Cash Flow + Risk */
      h('div', { style: { background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '14px 16px' } },
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 } },
          h('span', { style: { color: '#475569', fontSize: 10 } }, "◆"),
          h('span', { className: "sec-hd tm", style: { fontSize: 9.5 } }, "Cash & Risk Audit")
        ),
        (function () {
          var deps = funding.filter(function (f) { return f.type === 'DEPOSIT'; });
          var wdws = funding.filter(function (f) { return f.type !== 'DEPOSIT'; });
          var totalDep = deps.reduce(function (s, f) { return s + (parseFloat(f.amount) || 0); }, 0);
          var totalWdw = wdws.reduce(function (s, f) { return s + (parseFloat(f.amount) || 0); }, 0);
          var netFlow = totalDep - totalWdw;
          var topPos = (enriched || []).slice().sort(function (a, b) { return b.mvPHP - a.mvPHP; }).slice(0, 3);
          var rows = [
            ['Cash ₱', '₱' + f2(port.cashPHP || 0), '#94a3b8'],
            ['Total Deposited', '₱' + f2(totalDep), '#c7e2f7'],
            ['Total Withdrawn', '₱' + f2(totalWdw), '#5a6472'],
            ['Net Cash Flow', (netFlow >= 0 ? '+' : '') + '₱' + f2(netFlow), netFlow >= 0 ? '#c7e2f7' : '#f43f5e'],
            ['Market Value', '₱' + f2(totalMVPHP), '#94a3b8'],
            ['Total Equity', '₱' + f2(totalEqPHP), '#c7e2f7'],
          ];
          return h('div', null,
            rows.map(function (r, i) {
              return h('div', { key: i, style: { display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' } },
                h('span', { className: "tf", style: { fontSize: 9, opacity: 0.7 } }, r[0]),
                h('span', { className: "mono", style: { fontSize: 10, fontWeight: 700, color: r[2] } }, r[1])
              );
            }),
            h('div', { style: { marginTop: 10, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.06)' } },
              h('div', { className: "tf", style: { fontSize: 7.5, letterSpacing: '.07em', textTransform: 'uppercase', opacity: 0.5, marginBottom: 6 } }, "Top Concentrations"),
              topPos.map(function (p, i) {
                var share = totalMVPHP > 0 ? (p.mvPHP / totalMVPHP * 100) : 0;
                return h('div', { key: i, style: { marginBottom: 5 } },
                  h('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 2 } },
                    h('span', { className: "mono", style: { fontSize: 9, color: '#94a3b8' } }, p.ticker),
                    h('span', { className: "mono", style: { fontSize: 9, color: share > 40 ? '#f59e0b' : '#64748b' } }, share.toFixed(1) + "%")
                  ),
                  h('div', { style: { height: 2, background: 'rgba(255,255,255,0.06)', borderRadius: 1 } },
                    h('div', { style: { height: '100%', width: share + '%', background: share > 40 ? '#f59e0b' : '#94a3b8', borderRadius: 1 } })
                  )
                );
              })
            )
          );
        })()
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
                quantMetricsGrid,
                h('div', { style: { marginTop: 16, background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '14px 16px' } },
                  h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 } },
                    h('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
                      h('div', { style: { width: 8, height: 8, borderRadius: '50%', background: '#c7e2f7', boxShadow: '0 0 8px #c7e2f755' } }),
                      h('span', { className: 'sec-hd tm', style: { fontSize: 10 } }, 'Cash Story Ledger'),
                      h('span', { className: 'tf', style: { fontSize: 8, opacity: 0.5 } }, '— Full chronological audit trail · every peso accounted for')
                    ),
                    h('span', { className: 'mono tf', style: { fontSize: 8.5, opacity: 0.5 } }, (cashTrailData ? cashTrailData.length : 0) + ' event' + (cashTrailData && cashTrailData.length !== 1 ? 's' : ''))
                  ),
                  h(CH.CashTrailChart, { data: cashTrailData, isDark: isDark, full: true })
                )
              )
            ) : h(C.VSplitPane, { storageKey: 'bj151_vsplit', defaultSplit: 40, minTop: 15, maxTop: 85,
                top: h('div', { className: 'panel', style: { flexShrink: 0, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' } },
                  analyticsHeader,
                  !isAnalyticsMinimized && h('div', { style: { flex: 1, minHeight: 0, overflow: 'auto', padding: 'var(--pad)' } },
                    (enriched && enriched.length > 0)
                      ? h(CH.AnalyticsRow, { pieData: pieData, pnlData: pnlData, trendData: trendData, cashTrailData: cashTrailData, isDark: isDark, compact: isAnalyticsCompact || compact, enriched: enriched, advMetrics: advMetrics })
                      : h('div', { style: { textAlign: 'center', padding: '14px 0' }, className: 'tf' }, 'No positions yet')
                  )
                ),
                bottom: h('div', { style: { display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' } },
                  h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, marginBottom: 8, marginTop: 4 } },
                    h('span', { className: 'sec-hd tm' }, 'Active Positions ', h('span', { className: 'tf', style: { marginLeft: 3, fontWeight: 400 } }, (enriched ? enriched.length : 0))),
                    h('span', { className: 'tf', style: { fontSize: 7.5 } }, '▶ expand lots')
                  ),
                  h(C.PositionsTable, { enriched: enriched, totalMVPHP: totalMVPHP, mktPx: mktPx, setMktPx: setMktPx, quickSell: quickSell, priv: priv, isDark: isDark })
                )
              })
          ) : h('div', { style: { display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' } },
                h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, marginBottom: 12 } },
                  h('div', { style: { display: 'flex', alignItems: 'center', gap: 12 } },
                    h('span', { className: "sec-hd tm", style: { fontSize: 13 } }, "Active Positions ", h('span', { className: "tf", style: { marginLeft: 4, fontWeight: 400 } }, (enriched ? enriched.length : 0))),
                    h('button', { onMouseDown: function (e) { e.stopPropagation(); setAnalyticsCollapsed(false); }, className: "btn", style: { padding: '3px 10px', fontSize: 9, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' } }, "+ Restore Analytics")
                  ),
                  h(C.N, { v: 'MV: ₱' + f2(totalMVPHP), priv: priv, cls: "tf", style: { fontSize: 'var(--fz-sm)', fontWeight: 600 } })
                ),
                h(C.PositionsTable, { enriched: enriched, totalMVPHP: totalMVPHP, mktPx: mktPx, setMktPx: setMktPx, quickSell: quickSell, priv: priv, isDark: isDark })
              )
        )
      ),
      /* ── Chat Head Bubble ── */
      h('button', {
        onMouseDown: function(e) {
          e.stopPropagation();
          isDragging.current = true;
          hasDragged.current = false;
          dragStart.current = { mx: e.clientX, my: e.clientY, bx: bubblePos.x, by: bubblePos.y };
          var currentPos = { x: bubblePos.x, y: bubblePos.y };
          function onMove(me) {
            var dx = Math.abs(me.clientX - dragStart.current.mx);
            var dy = Math.abs(me.clientY - dragStart.current.my);
            if (dx > 4 || dy > 4) hasDragged.current = true;
            var newX = Math.max(8, Math.min(window.innerWidth - 64, dragStart.current.bx - (me.clientX - dragStart.current.mx)));
            var newY = Math.max(8, Math.min(window.innerHeight - 64, dragStart.current.by - (me.clientY - dragStart.current.my)));
            currentPos = { x: newX, y: newY };
            setBubblePos(currentPos);
          }
          function onUp() {
            isDragging.current = false;
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
            localStorage.setItem('bj_panel_pos', JSON.stringify(currentPos));
            if (!hasDragged.current) { setTradeOpen(function(v) { return !v; }); }
          }
          document.addEventListener('mousemove', onMove);
          document.addEventListener('mouseup', onUp);
        },
        className: isTradeOpen ? 'chat-head active' : 'chat-head chat-head-bubble',
        style: {
          position: 'fixed',
          bottom: bubblePos.y,
          right: bubblePos.x,
          zIndex: 1000,
          width: 56, height: 56, borderRadius: '50%', border: 'none',
          background: 'radial-gradient(circle at 35% 35%, #1e40af, #3b82f6)',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'transform 0.2s, box-shadow 0.2s',
          boxShadow: isTradeOpen ? '0 4px 20px rgba(59,130,246,0.6)' : undefined,
          transform: 'scale(1)'
        },
        onMouseEnter: function(e) { e.currentTarget.style.transform = 'scale(1.08)'; },
        onMouseLeave: function(e) { e.currentTarget.style.transform = 'scale(1)'; }
      },
        h('span', { style: { fontSize: isTradeOpen ? 18 : 9, fontWeight: 800, color: '#fff', letterSpacing: isTradeOpen ? 0 : '.06em', lineHeight: 1 } },
          isTradeOpen ? '✕' : 'TRADE')
      ),
      /* ── Expanded Terminal Panel ── */
      isTradeOpen && h('div', {
        className: 'trade-panel-open',
        style: {
          position: 'fixed', bottom: bubblePos.y + 68, right: bubblePos.x,
          width: panelW, height: panelH, maxHeight: 'calc(100vh - 130px)',
          zIndex: 999,
          background: '#0a0f1a',
          border: '1px solid rgba(59,130,246,0.25)',
          borderRadius: 18,
          boxShadow: '0 24px 80px rgba(0,0,0,0.85), 0 0 0 1px rgba(255,255,255,0.04)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden'
        }
      },
        /* BUY/SELL accent bar — reactive to isForexMode */
        h('div', {
          style: {
            height: 3,
            background: isForexMode
              ? 'linear-gradient(90deg, #065f46, #10b981)'
              : 'linear-gradient(90deg, #1e40af, #3b82f6)',
            flexShrink: 0,
            transition: 'background 0.3s ease'
          }
        }),
        /* Header */
        h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px 10px', borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 } },
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
            h('div', { style: { width: 7, height: 7, borderRadius: '50%', background: '#3b82f6', boxShadow: '0 0 8px #3b82f6, 0 0 0 3px rgba(59,130,246,0.2)', animation: 'chatHeadPulse 2s infinite' } }),
            h('span', { className: 'sec-hd tm', style: { fontSize: 11, letterSpacing: '.08em', color: '#c7e2f7' } }, 'EXECUTION TERMINAL')
          ),
          h('button', {
            onMouseDown: function(e) { e.stopPropagation(); setTradeOpen(false); },
            className: 'win-btn close', style: { width: 24, height: 24, borderRadius: '50%' }
          }, h(C.IcX))
        ),
        /* Body */
        h('div', { style: { flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 14 } },
          /* Market price context row */
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 12, padding: '6px 10px', background: 'rgba(59,130,246,0.06)', borderRadius: 8, border: '1px solid rgba(59,130,246,0.12)' } },
            h('span', { style: { fontSize: 8, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.07em', fontFamily: 'Inter,sans-serif' } }, 'PRICE'),
            h('span', { className: 'mono', style: { fontSize: 9, color: '#60a5fa', fontWeight: 700 } },
              (function() {
                var tks = Object.keys(mktPx);
                if (!tks.length) return 'MKT: —';
                var active = prefill && prefill.ticker ? prefill.ticker : (enriched.length ? enriched[0].ticker : null);
                var px = active && mktPx[active] ? mktPx[active] : null;
                if (!px) return 'MKT: —';
                var ex = enriched.find(function(p){ return p.ticker === active; });
                var sym = ex ? S(ex.exchange) : '₱';
                return 'MKT: ' + sym + f4(px);
              })()
            ),
            h('span', {
              style: {
                fontSize: 7.5, color: '#475569',
                background: 'rgba(255,255,255,0.04)',
                padding: '1px 5px', borderRadius: 4,
                fontFamily: 'JetBrains Mono, monospace',
                marginLeft: 4
              }
            }, 'AUTO'),
            h('span', { style: { fontSize: 8, color: '#334155', marginLeft: 'auto' } }, isMock ? '[ MOCK MODE ]' : '[ LIVE ]')
          ),
          /* Mode toggle row */
          h('div', {
            style: {
              display: 'flex', gap: 4,
              padding: '4px 0'
            }
          },
            h('button', {
              onClick: function() { setForexMode(false); },
              style: {
                flex: 1, padding: '5px 0', fontSize: 8.5,
                fontFamily: 'Inter, sans-serif', fontWeight: 600,
                borderRadius: 6, border: 'none', cursor: 'pointer',
                background: !isForexMode ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.04)',
                color: !isForexMode ? '#60a5fa' : '#475569',
                transition: 'all 0.15s'
              }
            }, 'PSE / STOCKS'),
            h('button', {
              onClick: function() { setForexMode(true); },
              style: {
                flex: 1, padding: '5px 0', fontSize: 8.5,
                fontFamily: 'Inter, sans-serif', fontWeight: 600,
                borderRadius: 6, border: 'none', cursor: 'pointer',
                background: isForexMode ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.04)',
                color: isForexMode ? '#10b981' : '#475569',
                transition: 'all 0.15s'
              }
            }, 'FOREX')
          ),
          h(C.TradeForm, {
            enriched: enriched, psiFee: psiFee, fxRate: fxRate,
            tickerLists: tickerLists, mktPx: mktPx,
            onExec: onExecTrade, addTicker: addTicker, deleteTicker: deleteTicker,
            isDark: isDark, priv: priv, isMock: isMock,
            prefill: prefill, port: port
          }),
          /* Forex Additional Info Panel */
          isForexMode && h('div', {
            style: {
              background: 'rgba(16,185,129,0.04)',
              border: '1px solid rgba(16,185,129,0.15)',
              borderRadius: 10, padding: '10px 12px',
              display: 'flex', flexDirection: 'column', gap: 8
            }
          },
            h('div', { style: { fontSize: 8, color: '#10b981', fontFamily: 'Inter,sans-serif', fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase', marginBottom: 2 } }, 'Forex Context'),
            h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 } },
              h('div', null,
                h('div', { style: { fontSize: 7.5, color: '#475569', marginBottom: 3, fontFamily: 'Inter,sans-serif' } }, 'STOP LOSS'),
                h('input', {
                  type: 'number', step: '0.00001', placeholder: '0.00000',
                  value: fxSL, onChange: function(e) { setFxSL(e.target.value); updateFxCalc(); },
                  style: { width: '100%', fontFamily: 'JetBrains Mono, monospace', fontSize: 11, padding: '6px 8px', background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.2)', borderRadius: 6, color: '#f43f5e', outline: 'none' }
                })
              ),
              h('div', null,
                h('div', { style: { fontSize: 7.5, color: '#475569', marginBottom: 3, fontFamily: 'Inter,sans-serif' } }, 'TAKE PROFIT'),
                h('input', {
                  type: 'number', step: '0.00001', placeholder: '0.00000',
                  value: fxTP, onChange: function(e) { setFxTP(e.target.value); updateFxCalc(); },
                  style: { width: '100%', fontFamily: 'JetBrains Mono, monospace', fontSize: 11, padding: '6px 8px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 6, color: '#10b981', outline: 'none' }
                })
              )
            ),
            fxCalc && h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, paddingTop: 6, borderTop: '1px solid rgba(255,255,255,0.05)' } },
              [
                ['SL PIPS', fxCalc.slPips, '#f43f5e'],
                ['TP PIPS', fxCalc.tpPips, '#10b981'],
                ['R:R', fxCalc.rr, fxCalc.rrColor]
              ].map(function(item) {
                return h('div', { key: item[0] },
                  h('div', { style: { fontSize: 7, color: '#475569', fontFamily: 'Inter,sans-serif', textTransform: 'uppercase', letterSpacing: '.06em' } }, item[0]),
                  h('div', { style: { fontSize: 12, fontWeight: 700, color: item[2], fontFamily: 'JetBrains Mono, monospace', marginTop: 2 } }, item[1])
                );
              })
            )
          ),
          h('div', { style: { background: 'rgba(255,255,255,0.02)', borderRadius: 10, padding: '10px 12px', border: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 } },
            h(C.RiskCard, { enriched: enriched, totalMVPHP: totalMVPHP, totalEqPHP: totalEqPHP, cashPHP: (port.cashPHP || 0), isDark: isDark })
          )
        ),
        /* Resize handle */
        h('div', {
          style: {
            position: 'absolute', bottom: 0, right: 0,
            width: 16, height: 16, cursor: 'nwse-resize',
            background: 'linear-gradient(135deg, transparent 50%, rgba(59,130,246,0.4) 50%)',
            borderBottomRightRadius: 18,
            zIndex: 10
          },
          onMouseDown: handleResizeStart
        })
      )
    );
  }

  /* ── APP ── */
  function App() {
    var _dark = useState(true); var isDark = _dark[0]; var setDark = _dark[1];
    var _fs = useState(function () { return localStorage.getItem('__bj151fs') || 'medium'; });
    var fontSize = _fs[0]; var setFontSize = _fs[1];
    var _ss = useState(false); var showSettings = _ss[0]; var setShowSettings = _ss[1];
    var _scale = useState('default'); var scale = _scale[0]; var setScale = _scale[1];
    var _priv = useState(false); var priv = _priv[0]; var setPriv = _priv[1];
    var _pse = useState(true); var psiFee = _pse[0]; var setPsiFee = _pse[1];
    var _fx = useState(60); var fxRate = _fx[0]; var setFxRate = _fx[1];
    var _sfx = useState(false); var showFx = _sfx[0]; var setShowFx = _sfx[1];
    var _uv = useState(false); var usdView = _uv[0]; var setUsdView = _uv[1];
    var _view = useState('dashboard'); var view = _view[0]; var setView = _view[1];
    var _rfr = useState(false); var refreshing = _rfr[0]; var setRefreshing = _rfr[1];
    var _lp = useState(true); var showLedgerPerf = _lp[0]; var setShowLedgerPerf = _lp[1];

    var _trades = useState([]); var trades = _trades[0]; var setTrades = _trades[1];
    var _funding = useState([]); var funding = _funding[0]; var setFunding = _funding[1];
    var _mockTrades = useState([]); var mockTrades = _mockTrades[0]; var setMockTrades = _mockTrades[1];

    var _tl = useState(function () { return { PSE: [].concat(E.SEED_TICKERS ? E.SEED_TICKERS.PSE : []), NASDAQ: [].concat(E.SEED_TICKERS ? E.SEED_TICKERS.NASDAQ : []), NYSE: [].concat(E.SEED_TICKERS ? E.SEED_TICKERS.NYSE : []), CRYPTO: [].concat(E.SEED_TICKERS ? E.SEED_TICKERS.CRYPTO : []), FOREX: [].concat(E.SEED_TICKERS ? E.SEED_TICKERS.FOREX : []) }; });
    var tickerLists = _tl[0]; var setTickerLists = _tl[1];
    var _ssv = useState([]); var savedScenarios = _ssv[0]; var setSavedScenarios = _ssv[1];
    var _mp = useState(function(){
        try { return JSON.parse(localStorage.getItem(E.K.mkt)) || {}; } catch(e){ return {}; }
    }); var mktPx = _mp[0]; var setMktPx = _mp[1];
    var _tlist = C.useToasts(); var toasts = _tlist[0]; var addToast = _tlist[1];

    useEffect(function () {
      var th = localStorage.getItem(E.K.th); if (th === 'light') setDark(false);
      var sc = localStorage.getItem(E.K.sc); if (sc === 'compact' || sc === 'wide') setScale(sc);
      if (localStorage.getItem(E.K.pr) === '1') setPriv(true);
      if (localStorage.getItem(E.K.fe) === '0') setPsiFee(false);
      var fx = parseFloat(localStorage.getItem(E.K.fx)); if (fx > 0) setFxRate(fx);
      var t, f, tk, ss, mt;
      try { t = JSON.parse(localStorage.getItem(E.K.t)); } catch (e) { }
      try { f = JSON.parse(localStorage.getItem(E.K.f)); } catch (e) { }
      try { tk = JSON.parse(localStorage.getItem(E.K.tk)); } catch (e) { }
      try { ss = JSON.parse(localStorage.getItem(E.K.ss)); } catch (e) { }
      try { mt = JSON.parse(localStorage.getItem(E.K.mock)); } catch (e) { }
      if (localStorage.getItem(E.K.ok) !== '1') { t = []; f = []; }
      setTrades(Array.isArray(t) ? t : []);
      setFunding(Array.isArray(f) ? f : []);
      setMockTrades(Array.isArray(mt) ? mt : []);
      if (tk && typeof tk === 'object') {
        setTickerLists({
            PSE: tk.PSE || (E.SEED_TICKERS ? [].concat(E.SEED_TICKERS.PSE) : []),
            NASDAQ: tk.NASDAQ || (E.SEED_TICKERS ? [].concat(E.SEED_TICKERS.NASDAQ) : []),
            NYSE: tk.NYSE || (E.SEED_TICKERS ? [].concat(E.SEED_TICKERS.NYSE) : []),
            CRYPTO: tk.CRYPTO || (E.SEED_TICKERS ? [].concat(E.SEED_TICKERS.CRYPTO) : []),
            FOREX: tk.FOREX || (E.SEED_TICKERS ? [].concat(E.SEED_TICKERS.FOREX) : [])
        });
      }
      if (Array.isArray(ss)) setSavedScenarios(ss);
    }, []);

    useEffect(function () {
      document.body.classList.remove('dark', 'light', 'sc-compact', 'sc-wide');
      document.body.classList.add(isDark ? 'dark' : 'light');
      if (scale === 'compact') document.body.classList.add('sc-compact');
      else if (scale === 'wide') document.body.classList.add('sc-wide');
      localStorage.setItem(E.K.th, isDark ? 'dark' : 'light');
      localStorage.setItem(E.K.sc, scale);
      var root = document.documentElement;
      var s = 1;
      if (fontSize === 'small') s = 0.88;
      if (fontSize === 'large') s = 1.15;
      root.style.setProperty('--fs-scale', s);
      localStorage.setItem('__bj151fs', fontSize);
    }, [isDark, scale, fontSize]);

    useEffect(function () { localStorage.setItem(E.K.pr, priv ? '1' : '0'); }, [priv]);
    useEffect(function () { localStorage.setItem(E.K.fe, psiFee ? '1' : '0'); }, [psiFee]);
    useEffect(function () { localStorage.setItem(E.K.fx, fxRate); }, [fxRate]);

    function addTicker(exchange, tk) {
      var u = tk.toUpperCase().trim(); if (!u) return;
      var updated = Object.assign({}, tickerLists); updated[exchange] = (tickerLists[exchange] || []).concat([u]);
      setTickerLists(updated); localStorage.setItem(E.K.tk, JSON.stringify(updated));
      addToast('Added ' + u + ' to ' + exchange, 'info');
    }
    function deleteTicker(exchange, tk) {
      var updated = Object.assign({}, tickerLists); updated[exchange] = (tickerLists[exchange] || []).filter(function (t) { return t !== tk; });
      setTickerLists(updated); localStorage.setItem(E.K.tk, JSON.stringify(updated));
    }

    var save = useCallback(function (nT, nF) {
      if (nT !== undefined) { setTrades(nT); localStorage.setItem(E.K.t, JSON.stringify(nT)); }
      if (nF !== undefined) { setFunding(nF); localStorage.setItem(E.K.f, JSON.stringify(nF)); }
      localStorage.setItem(E.K.ok, '1');
    }, []);
    function saveMock(nT) { setMockTrades(nT); localStorage.setItem(E.K.mock, JSON.stringify(nT)); }

    var port = useMemo(function () { return E.runPortfolio ? E.runPortfolio(trades, funding, psiFee, fxRate) : { cashPHP: 0, cashUSD: 0, active: [], closed: [], wins: [], totalDep: 0, totalWdw: 0, realPnLPHP: 0, winRate: 0 }; }, [trades, funding, psiFee, fxRate]);
    var mockPort = useMemo(function () { return E.runMockPortfolio ? E.runMockPortfolio(mockTrades, [], psiFee, fxRate) : { cashPHP: 0, cashUSD: 0, active: [], closed: [], wins: [], totalDep: 0, totalWdw: 0, realPnLPHP: 0, winRate: 0 }; }, [mockTrades, psiFee, fxRate]);

    function enrich(active) {
      return (active || []).map(function (p) {
        var mp = parseFloat(mktPx[p.ticker]) || p.avgNative;
        var mvPHP = E.toPHP ? E.toPHP(mp * p.qty, p.exchange, fxRate) : mp * p.qty;
        var uplPHP = p.avgNative > 0 ? (E.toPHP ? E.toPHP((mp - p.avgNative) * p.qty, p.exchange, fxRate) : (mp - p.avgNative) * p.qty) : mvPHP;
        var uplP = p.avgNative > 0 ? ((mp - p.avgNative) / p.avgNative) * 100 : 100;
        var bev = E.breakEven ? E.breakEven(p.totalCostNative, p.qty, p.exchange, psiFee) : p.avgNative;
        return Object.assign({}, p, { mp: mp, mvPHP: mvPHP, uplPHP: uplPHP, uplP: uplP, beven: bev, bev: bev });
      });
    }
    var enriched = useMemo(function () { return enrich(port.active); }, [port.active, mktPx, fxRate, psiFee]);
    var mockEnriched = useMemo(function () { return enrich(mockPort.active); }, [mockPort.active, mktPx, fxRate, psiFee]);

    var totalMVPHP = useMemo(function () { return (enriched || []).reduce(function (s, p) { return s + (p.mvPHP || 0); }, 0); }, [enriched]);
    var totalEqPHP = (port.cashPHP || 0) + totalMVPHP;
    var realPnLPHP = port.realPnLPHP || 0;
    var winRate = port.winRate || 0;
    var roiPct = port.totalDep > 0 ? (realPnLPHP / port.totalDep) * 100 : 0;
    var exposure = totalEqPHP > 0 ? (totalMVPHP / totalEqPHP) * 100 : 0;

    function displayVal(phpAmt) { return usdView ? ('$' + f2(phpAmt / (fxRate || 60))) : ('₱' + f2(phpAmt)); }

    function execLiveTrade(t, side) {
      if (!(tickerLists[t.exchange] && tickerLists[t.exchange].includes(t.ticker))) addTicker(t.exchange, t.ticker);
      save(trades.concat([t]));
      addToast(side + ' ' + f0(t.qty) + ' ' + t.ticker + ' @ ' + S(t.exchange) + f2(t.price), side === 'BUY' ? 'ok' : 'info');
    }

    var _wt = useState('DEPOSIT'); var wType = _wt[0]; var setWType = _wt[1];
    var _wa = useState(''); var wAmt = _wa[0]; var setWAmt = _wa[1];
    var _ws = useState('BPI'); var wSrc = _ws[0]; var setWSrc = _ws[1];
    var _wd = useState(function () { return new Date().toISOString().slice(0, 10); }); var wDate = _wd[0]; var setWDate = _wd[1];
    var _wn = useState(''); var wNote = _wn[0]; var setWNote = _wn[1];
    var _wc = useState('₱'); var wCurrency = _wc[0]; var setWCurrency = _wc[1];
    function execWallet() {
      var amt = parseFloat(wAmt) || 0; if (!amt) { addToast('Enter valid amount', 'err'); return; }
      if (wType === 'WITHDRAW') {
        var snap = E.runPortfolio(trades, funding, psiFee, fxRate);
        var avail = wCurrency === 'USD' ? (snap.cashUSD || 0) : (snap.cashPHP || 0);
        if (amt > avail) { addToast('Insufficient Cash. Liquidation required.', 'err'); return; }
      }
      var ff = { id: 'f' + Date.now(), type: wType, amount: amt, source: wSrc, date: wDate, note: wNote, currency: wCurrency };
      save(undefined, funding.concat([ff]));
      addToast(wType + ': ' + (wCurrency === 'USD' ? '$' : '₱') + f2(amt) + ' via ' + wSrc, 'ok');
      setWAmt(''); setWNote('');
    }

    function execMockTrade(t, side) {
      if (!(tickerLists[t.exchange] && tickerLists[t.exchange].includes(t.ticker))) addTicker(t.exchange, t.ticker);
      saveMock(mockTrades.concat([t]));
      addToast('[MOCK] ' + side + ' ' + f0(t.qty) + ' ' + t.ticker, 'info');
    }

    function doRefresh(dateStr) {
      var all = enriched.concat(mockEnriched);
      if (!all.length && !dateStr) { addToast('No positions to refresh', 'warn'); return; }
      setRefreshing(true);
      if(E.fetchPrices) {
          E.fetchPrices(all, dateStr).then(function (res) {
            setRefreshing(false);
            if (!res) { addToast('Price fetch failed — Manual Mode', 'err'); return; }
            setMktPx(function (prev) { return Object.assign({}, prev, res.updated); });
            if (res.updated['USDPHP']) setFxRate(res.updated['USDPHP']);
            var n = Object.keys(res.updated).length;
            if (!res.pseFailed && !res.globalFailed) addToast('✓ ' + n + ' Prices updated via Yahoo', 'ok');
            else addToast('Sync issues detected', 'warn');
          }).catch(function (err) { setRefreshing(false); addToast('Price fetch failed', 'err'); });
      } else {
          setRefreshing(false);
      }
    }

    function resetAll() { if (!window.confirm('Delete ALL live data?')) return;[E.K.t, E.K.f, E.K.ok].forEach(function (k) { localStorage.removeItem(k); }); setTrades([]); setFunding([]); addToast('Terminal reset', 'info'); }
    function resetMock() { if (!window.confirm('Delete all Study Lab data?')) return; localStorage.removeItem(E.K.mock); setMockTrades([]); addToast('Study Lab cleared', 'info'); }
    function cloneToLab() {
      if (!window.confirm('Clone all live trades to Study Lab?')) return;
      saveMock(JSON.parse(JSON.stringify(trades)));
      addToast('Multiverse Synced', 'ok');
    }

    function onImportJSON() {
      var input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.onchange = function (e) {
        var file = e.target.files[0];
        if (!file) return;
        var reader = new FileReader();
        reader.onload = function (ev) {
          try {
            var data = JSON.parse(ev.target.result);
            if (window.confirm('Overwrite ALL current data with this backup?')) {
              if (data.trades) { setTrades(data.trades); localStorage.setItem(E.K.t, JSON.stringify(data.trades)); }
              if (data.funding) { setFunding(data.funding); localStorage.setItem(E.K.f, JSON.stringify(data.funding)); }
              if (data.tickerLists) { setTickerLists(data.tickerLists); localStorage.setItem(E.K.tk, JSON.stringify(data.tickerLists)); }
              if (data.scenarios) { setSavedScenarios(data.scenarios); localStorage.setItem(E.K.ss, JSON.stringify(data.scenarios)); }
              if (data.trade_meta && typeof data.trade_meta === 'object') { localStorage.setItem('bj_trade_meta', JSON.stringify(data.trade_meta)); }
              localStorage.setItem(E.K.ok, '1');
              addToast('Data Imported Successfully', 'ok');
            }
          } catch (err) {
            addToast('Import Failed: Invalid JSON', 'err');
          }
        };
        reader.readAsText(file);
      };
      input.click();
    }

    var today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    var sortedTrades = useMemo(function () { return trades.filter(function (t) { return t && typeof t === 'object'; }).slice().sort(function (a, b) { return +(new Date((b.date || '') + 'T' + (b.time || '00:00'))) - (+(new Date((a.date || '') + 'T' + (a.time || '00:00')))); }); }, [trades]);
    var sortedFunding = useMemo(function () { return funding.slice().sort(function (a, b) { return +(new Date(b.date || '')) - (+(new Date(a.date || ''))); }); }, [funding]);

    var cashRatio = (port.cashPHP || 0) / Math.max(totalEqPHP, 1);
    var cashHudCls = cashRatio > .15 ? 'hud-emerald' : cashRatio < .05 ? 'hud-rose' : 'hud-amber';

    return h('div', { style: { height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative', zIndex: 1 } },
      h(C.Toasts, { list: toasts }),
      showFx && h('div', { style: { position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,.72)', backdropFilter: 'blur(10px)' } },
        h('div', { className: "glass", style: { width: 300, padding: 'var(--pad)', display: 'flex', flexDirection: 'column', gap: 'var(--gap)' } },
          h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' } },
            h('span', { style: { fontSize: 12.5, fontWeight: 700 }, className: "tp" }, "FX Rate Settings"),
            h('button', { className: "ic", onClick: function () { setShowFx(false); } }, h(C.IcX))
          ),
          h('div', { className: "divl", style: { height: 1 } }),
          h(C.F, { label: "USD / ₱ Rate (₱ per $1)" },
            h('input', { type: "number", step: "0.5", min: "1", className: "inp", value: fxRate, onChange: function (e) { setFxRate(Math.max(1, parseFloat(e.target.value) || 60)); } })),
          h('button', { className: "btn btn-blue", onClick: function () { setShowFx(false); }, style: { width: '100%' } }, "Done")
        )
      ),
      showSettings && h('div', { style: { position: 'fixed', inset: 0, zIndex: 205, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,.72)', backdropFilter: 'blur(10px)' } },
        h('div', { className: "glass", style: { width: 320, padding: 'var(--pad)', display: 'flex', flexDirection: 'column', gap: 'var(--gap)' } },
          h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' } },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 6 } }, h(C.IcSettings), h('span', { style: { fontSize: 13, fontWeight: 700 }, className: "tp" }, "System Settings")),
            h('button', { className: "ic", onClick: function () { setShowSettings(false); } }, h(C.IcX))
          ),
          h(C.F, { label: "Font Size Scaling" },
            h('div', { className: "seg-w", style: { gridTemplateColumns: '1fr 1fr 1fr' } },
              [{ v: 'small', l: 'Small' }, { v: 'medium', l: 'Medium' }, { v: 'large', l: 'Large' }].map(function (s) {
                return h('button', { key: s.v, onClick: function () { setFontSize(s.v); }, className: 'seg-b' + (fontSize === s.v ? ' on' : ''), style: { fontSize: 9 } }, s.l);
              }))),
          h('button', { className: "btn btn-blue", onClick: function () { setShowSettings(false); }, style: { width: '100%' } }, "Done")
        )
      ),
      /* NAVBAR */
      h('nav', { className: "nav-bar", style: { height: 'var(--nav-h)', flexShrink: 0, position: 'relative', zIndex: 50, display: 'flex', alignItems: 'center', padding: '0 var(--pad)', gap: 4 } },
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginRight: 6 } },
          h('svg', { width: "20", height: "20", viewBox: "0 0 24 24", fill: "none" },
            h('defs', null, h('linearGradient', { id: "bjLogoGrad", x1: "0", y1: "0", x2: "24", y2: "24" }, h('stop', { stopColor: "#c7e2f7" }), h('stop', { offset: "1", stopColor: "#3b82f6" }))),
            h('path', { d: "M12 2L2 7L2 17L12 22L22 17L22 7L12 2Z", stroke: "url(#bjLogoGrad)", strokeWidth: "2", strokeLinejoin: "round", fill: "rgba(59,130,246,0.1)" }),
            h('path', { d: "M12 22V12M12 12L22 7M12 12L2 7", stroke: "url(#bjLogoGrad)", strokeWidth: "1.5", strokeLinejoin: "round" })
          ),
          h('div', null, h('div', { className: "tp", style: { fontSize: 10.5, fontWeight: 900, letterSpacing: '.14em', lineHeight: 1, textShadow: isDark ? '0 0 12px rgba(59,130,246,0.3)' : 'none' } }, "BASIC JOURNAL"), h('div', { className: "mono tf", style: { fontSize: 6.5, letterSpacing: '.1em', marginTop: 1, opacity: 0.8 } }, "V1.5.1-MASSIVE"))
        ),
        [{ v: 'dashboard', l: 'Dashboard' }, { v: 'ledger', l: 'Ledger' }, { v: 'wallet', l: 'Wallet' }, { v: 'studylab', l: '📐 Study Lab' }, { v: 'sandbox', l: 'Predictor' }].map(function (item) {
          return h('button', { key: item.v, id: 'nav-' + item.v, onClick: function () { setView(item.v); }, className: 'nl' + (view === item.v ? ' on' : ''), style: item.v === 'studylab' ? { color: view === 'studylab' ? '#a78bfa' : undefined } : undefined }, item.l);
        }),
        h('div', { style: { marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5 } },
          h('div', { className: "blink", style: { width: 5, height: 5, borderRadius: '50%', background: '#c7e2f7', boxShadow: '0 0 5px #c7e2f7' } }),
          h('span', { className: "mono tf", style: { fontSize: 7.5, letterSpacing: '.05em' } }, today),
          h('button', { id: "export-btn", onClick: function () { var tradeMeta = {}; try { tradeMeta = JSON.parse(localStorage.getItem('bj_trade_meta') || '{}'); } catch(e) {} var d = { trades: trades, funding: funding, scenarios: savedScenarios, tickerLists: tickerLists, trade_meta: tradeMeta }; var blob = new Blob([JSON.stringify(d, null, 2)], { type: 'application/json' }); var url = URL.createObjectURL(blob); var a = document.createElement('a'); a.href = url; a.download = 'BasicJournal_Backup_' + new Date().toISOString().slice(0, 10) + '.json'; a.click(); addToast('Portfolio Exported', 'ok'); }, className: "ghost tm", style: { padding: '2px 8px', borderRadius: '.4rem', cursor: 'pointer', fontFamily: 'Inter,sans-serif', fontSize: 9, fontWeight: 500, transition: 'all .15s', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)' } }, "💾 Export JSON"),
          h('button', { id: "import-btn", onClick: onImportJSON, className: "ghost tm", style: { padding: '2px 8px', borderRadius: '.4rem', cursor: 'pointer', fontFamily: 'Inter,sans-serif', fontSize: 9, fontWeight: 500, transition: 'all .15s', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)' } }, "📂 Import JSON"),
          h('button', { id: "fx-btn", onClick: function () { setShowFx(true); }, style: { fontFamily: 'JetBrains Mono,monospace', fontSize: 8, padding: '2px 7px', borderRadius: '.4rem', cursor: 'pointer', transition: 'all .18s', background: isDark ? 'rgba(16,185,129,.09)' : 'rgba(16,185,129,.07)', border: isDark ? '1px solid rgba(16,185,129,.22)' : '1px solid rgba(16,185,129,.18)', color: isDark ? '#6ee7b7' : '#065f46' } }, "$1=₱" + fxRate.toFixed(0)),
          h('div', { className: "sc-pill" }, [['compact', 'Cmpct'], ['default', 'Dflt'], ['wide', 'Wide']].map(function (s) { return h('button', { key: s[0], onClick: function () { setScale(s[0]); }, className: 'sc-opt' + (scale === s[0] ? ' on' : '') }, s[1]); })),
          h('button', { id: "pse-fee-btn", onClick: function () { setPsiFee(function (v) { return !v; }); }, className: psiFee ? 'fee-on' : 'fee-off', style: { padding: '2px 8px', borderRadius: '.4rem', cursor: 'pointer', fontFamily: 'Inter,sans-serif', fontSize: 8, fontWeight: 700, letterSpacing: '.05em', transition: 'all .18s' } }, psiFee ? 'PSE FEE' : '0 FEE'),
          h('button', { id: "theme-toggle", onClick: function () { setDark(function (d) { return !d; }); }, className: "ic" }, isDark ? h(C.IcSun) : h(C.IcMoon)),
          h('button', { id: "settings-toggle", onClick: function () { setShowSettings(true); }, className: "ic" }, h(C.IcSettings)),
          h('button', { id: "priv-toggle", onClick: function () { setPriv(function (p) { return !p; }); }, className: 'ic' + (priv ? ' on' : '') }, priv ? h(C.IcEyeOff) : h(C.IcEye)),
          h('button', { id: "refresh-btn", onClick: function(){ doRefresh(); }, className: 'refresh-btn' + (refreshing ? ' loading' : ''), style: { fontFamily: 'JetBrains Mono,monospace', fontSize: 8, padding: '2px 8px', borderRadius: '.4rem', cursor: 'pointer', transition: 'all .18s', background: isDark ? 'rgba(59,130,246,.09)' : 'rgba(59,130,246,.07)', border: isDark ? '1px solid rgba(59,130,246,.22)' : '1px solid rgba(59,130,246,.18)', color: isDark ? '#60a5fa' : '#1d4ed8', display: 'flex', alignItems: 'center', gap: 3 } }, h(C.IcRefresh), refreshing ? 'Syncing…' : 'Refresh'),
          h('button', { id: "usd-view-btn", onClick: function () { setUsdView(function (v) { return !v; }); }, className: 'usd-toggle' + (usdView ? ' on' : '') }, usdView ? '$ USD VIEW' : '₱ VIEW'),
          h('button', { id: "reset-btn", onClick: resetAll, className: "ghost tm", style: { padding: '2px 8px', borderRadius: '.4rem', cursor: 'pointer', fontFamily: 'Inter,sans-serif', fontSize: 9, fontWeight: 500, transition: 'all .15s' } }, "Reset")
        )
      ),
      /* HUD */
      h('div', { className: "hud-bar", id: "global-hud", style: { height: 'var(--hud-h)', flexShrink: 0, position: 'relative', zIndex: 40, display: 'flex', alignItems: 'stretch' } },
        [
          { id: 'hud-equity', l: 'Total Equity', v: displayVal(totalEqPHP), sub: pct(exposure) + ' in market', cls: 'hud-violet' },
          { id: 'hud-cash', l: 'Available Cash', v: usdView ? '$' + f2((port.cashUSD || 0) + ((port.cashPHP || 0) / fxRate)) : '₱' + f0((port.cashPHP || 0) + ((port.cashUSD || 0) * fxRate)), sub: 'NET LIQUIDITY', cls: cashHudCls },
          { id: 'hud-rpnl', l: 'Realized P&L', v: displayVal(realPnLPHP), sub: 'ROI ' + sgn(roiPct) + pct(roiPct), cls: realPnLPHP >= 0 ? 'hud-emerald' : 'hud-rose' },
          { id: 'hud-win', l: 'Win Rate', v: pct(winRate), sub: (port.wins ? port.wins.length : 0) + 'W / ' + ((port.closed ? port.closed.length : 0) - (port.wins ? port.wins.length : 0)) + 'L', cls: winRate >= 60 ? 'hud-emerald' : winRate >= 40 ? 'hud-amber' : 'hud-rose' },
          { id: 'hud-mv', l: 'Market Value', v: displayVal(totalMVPHP), sub: (enriched ? enriched.length : 0) + ' pos · FX ₱' + fxRate.toFixed(0) + '/$', cls: 'hud-blue' },
        ].map(function (c, i) {
          return h(R.Fragment, { key: i },
            i > 0 && h('div', { className: "divl" }),
            h('div', { id: c.id, style: { display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 var(--pad)', flex: 1, minWidth: 0 } },
              h('div', { className: "sec-hd tf", style: { marginBottom: 1 } }, c.l),
              h(C.N, { v: c.v, priv: priv, cls: c.cls, style: { fontSize: 'var(--fz-hud)', fontWeight: 700, lineHeight: 1.2 } }),
              h('div', { className: "mono tf", style: { fontSize: 7.5, marginTop: 1 } }, c.sub)
            )
          );
        })
      ),
      /* WORKSPACE */
      h('div', { style: { flex: 1, minHeight: 0, overflow: 'hidden', position: 'relative', zIndex: 1 } },
        view === 'dashboard' && h(DashboardBody, { enriched: enriched, port: port, trades: trades, funding: funding, tickerLists: tickerLists, mktPx: mktPx, setMktPx: setMktPx, psiFee: psiFee, fxRate: fxRate, isDark: isDark, priv: priv, scale: scale, addTicker: addTicker, deleteTicker: deleteTicker, onExecTrade: execLiveTrade, savedScenarios: savedScenarios, setSavedScenarios: setSavedScenarios, addToast: addToast, saveTrades: save }),
        view === 'ledger' && h('div', { style: { height: '100%', display: 'flex', flexDirection: 'column' } },
          h('div', { style: { flexShrink: 0, padding: '8px var(--pad)', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 12 } },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } }, h('span', { className: "sec-hd tm" }, "Trade Ledger"), h('span', { className: "mono tf", style: { fontSize: 8 } }, (trades ? trades.length : 0) + " records")),
            h('div', { style: { marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 } },
              h('button', { onClick: function () { setShowLedgerPerf(function (v) { return !v; }); }, className: "ghost tm", style: { padding: '3px 10px', borderRadius: '4px', fontSize: 9, fontWeight: 600, border: '1px solid rgba(255,255,255,0.1)', background: showLedgerPerf ? 'rgba(199,226,247,0.1)' : 'transparent', color: showLedgerPerf ? '#c7e2f7' : '#94a3b8' } }, showLedgerPerf ? '◑ Hide Analytics' : '◐ Show Analytics'))),
          h('div', { style: { flex: 1, minHeight: 0, display: 'flex' } },
            h('div', { style: { flex: 1, padding: 'var(--pad)', overflow: 'hidden', display: 'flex', flexDirection: 'column' } },
              sortedTrades.length === 0 ? h('div', { className: "glass", style: { flex: 1 } }, h(C.Empty, { msg: "No trades recorded", sub: "Execute an order on the Dashboard" })) :
                h('div', { className: "glass fu scroll", style: { flex: 1, overflow: 'auto', background: isDark ? 'rgba(0,0,0,0.2)' : '#fff' } },
                  h('table', { className: "tbl accounting-tbl", style: { width: '100%', borderCollapse: 'collapse' } },
                    h('thead', { style: { position: 'sticky', top: 0, zIndex: 10, background: isDark ? '#111' : '#f8fafc' } },
                      h('tr', null, ['DATE/TIME', 'TYPE', 'EXCH', 'TICKER', 'PRICE', 'QTY', 'GROSS', 'FEE', 'NET ₱', 'MEMO'].map(function (hText) { return h('th', { key: hText, className: "th mono", style: { fontSize: 8, textAlign: 'left', padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#64748b' } }, hText); }))),
                    h('tbody', null, sortedTrades.map(function (t, i) {
                      var isBuy = t.type === 'BUY';
                      var sm = S(t.exchange);
                      var gross = t.price * t.qty;
                      var fee = E.calcFee ? E.calcFee(t.type, t.price, t.qty, psiFee, t.exchange) : 0;
                      var net = isBuy ? -(gross + fee) : (gross - fee);
                      var netPHP = E.toPHP ? E.toPHP(net, t.exchange, fxRate) : net;
                      return h('tr', { key: t.id || i, className: "tr-h", style: { borderBottom: '1px solid rgba(255,255,255,0.03)' } },
                        h('td', { className: "td mono tm", style: { fontSize: 9, padding: '8px 12px' } }, t.date + " ", h('span', { style: { opacity: 0.4 } }, t.time)),
                        h('td', { className: "td" }, h('span', { className: 'tag tag-' + (isBuy ? 'buy' : 'sell'), style: { fontSize: 7.5, padding: '2px 6px' } }, t.type)),
                        h('td', { className: "td mono tf", style: { fontSize: 8.5 } }, t.exchange),
                        h('td', { className: "td mono tm", style: { fontSize: 10, fontWeight: 700, color: isBuy ? '#6ee7b7' : '#f43f5e' } }, t.ticker),
                        h('td', { className: "td mono tm", style: { fontSize: 9.5 } }, sm + (E.isForex(t.exchange) ? f5(t.price) : f2(t.price))),
                        h('td', { className: "td mono tm", style: { fontSize: 9.5 } }, f0(t.qty)),
                        h('td', { className: "td mono tf", style: { fontSize: 9 } }, sm + f2(gross)),
                        h('td', { className: "td mono", style: { fontSize: 8.5, color: '#f59e0b' } }, sm + f2(fee)),
                        h('td', { className: "td mono tm", style: { fontSize: 10, fontWeight: 700, color: G(netPHP) } }, "₱" + f2(Math.abs(netPHP))),
                        h('td', { className: "td tf", style: { fontSize: 8.5, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, t.notes || '—')
                      );
                    }))))),
            showLedgerPerf && h('div', { className: "ledger-sidebar scroll", style: { width: 320, flexShrink: 0, borderLeft: '1px solid rgba(255,255,255,0.06)', background: isDark ? 'rgba(0,0,0,0.15)' : '#f8fafc', padding: 'var(--pad)', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 } },
              h('div', { className: "glass", style: { padding: '14px', borderRadius: 12 } },
                h('div', { className: "tm", style: { fontSize: 8, letterSpacing: '.10em', textTransform: 'uppercase', marginBottom: 12, opacity: 0.6 } }, "Realized Analytics"),
                (function () {
                  var adv = E.getAdvancedMetrics ? E.getAdvancedMetrics(trades, funding, fxRate) : { profitFactor: 0, maxDrawdown: 0, grossProfit: 0, grossLoss: 0, totalRealized: 0, avgHoldWin: 0, avgHoldLoss: 0, equityPoints: [] };
                  var perf = E.getPerformanceStats ? E.getPerformanceStats(port.closed || []) : { winRate: 0, totalRealized: 0 };
                  var pieD = [{ label: 'Wins', v: (port.wins ? port.wins.length : 0), color: '#10b981' }, { label: 'Losses', v: (((port.closed ? port.closed.length : 0) - (port.wins ? port.wins.length : 0))), color: '#f43f5e' }];
                  return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 12 } },
                    h('div', { style: { height: 100, display: 'flex', justifyContent: 'center', marginBottom: 10 } }, h(CH.PieChart, { data: pieD, size: 100, isDark: isDark, title: "W/L" })),
                    [['Profit Factor', adv.profitFactor.toFixed(2), adv.profitFactor >= 1.5 ? '#10b981' : adv.profitFactor >= 1 ? '#f59e0b' : '#f43f5e'], ['Win Rate', pct(perf.winRate), perf.winRate >= 50 ? '#10b981' : '#f43f5e'], ['Max Drawdown', adv.maxDrawdown.toFixed(1) + '%', adv.maxDrawdown > 20 ? '#f43f5e' : '#94a3b8'], ['Gross Profit', '₱' + f2(adv.grossProfit), '#10b981'], ['Gross Loss', '₱' + f2(adv.grossLoss), '#f43f5e'], ['Net Realized', '₱' + f2(perf.totalRealized), G(perf.totalRealized)], ['Avg Hold (Win)', adv.avgHoldWin.toFixed(1) + 'd', '#10b981'], ['Avg Hold (Loss)', adv.avgHoldLoss.toFixed(1) + 'd', '#f43f5e']].map(function (r) {
                      return h('div', { key: r[0], style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' } }, h('span', { className: "tf", style: { fontSize: 8.5, opacity: 0.7 } }, r[0]), h('span', { className: "mono", style: { fontSize: 10.5, fontWeight: 700, color: r[2] } }, r[1]));
                    }));
                })()),
              h('div', { className: "glass", style: { padding: '14px', borderRadius: 12 } },
                h('div', { className: "tm", style: { fontSize: 8, letterSpacing: '.10em', textTransform: 'uppercase', marginBottom: 12, opacity: 0.6 } }, "Asset Exposure"),
                (function () {
                  var dist = (enriched || []).map(function (p) { return { label: p.ticker, v: p.mvPHP }; });
                  return h(CH.PieChart, { data: dist, size: 140, isDark: isDark, title: "Assets" });
                })())))),
        view === 'wallet' && h('div', { style: { padding: 'var(--pad)', height: '100%', overflow: 'hidden', display: 'grid', gridTemplateColumns: '280px 1fr 230px', gap: 'var(--gap)' } },
          h('div', { className: "glass scroll", style: { padding: 'var(--pad)', display: 'flex', flexDirection: 'column', gap: 'var(--gap)', overflow: 'auto' } },
            h('span', { className: "sec-hd tm" }, "Fund Account"),
            h('div', { className: "seg-w", style: { gridTemplateColumns: '1fr 1fr' } }, ['DEPOSIT', 'WITHDRAW'].map(function (v) { return h('button', { key: v, onClick: function () { setWType(v); }, className: 'seg-b ' + (v === 'DEPOSIT' ? 'dep' : 'wdw') + (wType === v ? ' on' : '') }, v === 'DEPOSIT' ? '+ Deposit' : '− Withdraw'); })),
            h(C.F, { label: "Currency" }, h('div', { className: "seg-w", style: { gridTemplateColumns: '1fr 1fr' } }, ['₱', 'USD'].map(function (c) { return h('button', { key: c, onClick: function () { setWCurrency(c); }, className: 'seg-b dep' + (wCurrency === c ? ' on' : ''), style: { fontSize: 9 } }, c); }))),
            h(C.F, { label: 'Amount (' + (wCurrency === 'USD' ? '$' : '₱') + ')' }, h('input', { id: "wallet-amount", type: "number", step: "1000", min: "0", className: "inp", placeholder: "0.00", value: wAmt, onChange: function (e) { setWAmt(e.target.value); } })),
            h(C.F, { label: "Source" }, h('select', { className: "inp", value: wSrc, onChange: function (e) { setWSrc(e.target.value); } }, (E.SOURCES || []).map(function (s) { return h('option', { key: s, value: s }, s); }))),
            h(C.F, { label: "Date" }, h('input', { type: "date", className: "inp", value: wDate, onChange: function (e) { setWDate(e.target.value); } })),
            h(C.F, { label: "Memo" }, h('input', { type: "text", className: "inp", placeholder: "Optional…", value: wNote, onChange: function (e) { setWNote(e.target.value); } })),
            h('button', { id: "wallet-submit", onClick: execWallet, disabled: !parseFloat(wAmt) || parseFloat(wAmt) <= 0, className: 'btn ' + (wType === 'DEPOSIT' ? 'btn-buy' : 'btn-sell'), style: { width: '100%' } }, wType === 'DEPOSIT' ? '↓  RECORD DEPOSIT' : '↑  RECORD WITHDRAWAL'),
            h('div', { className: "inset", style: { padding: '10px 11px' } }, [['Total Deposited', '#c7e2f7', '+₱' + f2(port.totalDep)], ['Total Withdrawn', '#5a6472', '-₱' + f2(port.totalWdw)], ['₱ Cash', '#3b82f6', '₱' + f2(port.cashPHP)], ['USD Cash', '#60a5fa', '$' + f2(port.cashUSD)]].map(function (item, idx) {
              return h('div', { key: item[0], style: { display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderTop: idx > 0 ? '1px solid rgba(128,128,128,.09)' : 'none' } }, h('span', { className: "tm", style: { fontSize: 9.5 } }, item[0]), h(C.N, { v: item[2], priv: priv, style: { fontSize: 12.5, fontWeight: 700, color: item[1], textShadow: isDark ? '0 0 7px ' + item[1] + '55' : 'none' } }));
            }))),
          h('div', { className: "glass", style: { overflow: 'hidden', display: 'flex', flexDirection: 'column' } },
            h('div', { style: { padding: 'var(--pad)', paddingBottom: 5, flexShrink: 0 } }, h('span', { className: "sec-hd tm" }, "Funding History ", h('span', { className: "tf", style: { marginLeft: 3, fontWeight: 400 } }, (funding ? funding.length : 0)))),
            h('div', { className: "scroll", style: { flex: 1, overflow: 'auto' } }, h('table', { className: "tbl" }, h('thead', null, h('tr', null, h('th', { className: "th" }, "Date"), h('th', { className: "th" }, "Type"), h('th', { className: "th" }, "Cur."), h('th', { className: "th" }, "Source"), h('th', { className: "th" }, "Amount"), h('th', { className: "th" }, "Memo"))), h('tbody', null, sortedFunding.length === 0 ? h('tr', { className: "tdb" }, h('td', { colSpan: 6, className: "td tf", style: { textAlign: 'center', padding: '36px', fontFamily: 'Inter,sans-serif' } }, "No records yet")) : sortedFunding.map(function (ff, i) {
              var isU = ff && (ff.currency || 'PHP').toUpperCase() === 'USD';
              var sm = isU ? '$' : '₱';
              return h('tr', { key: (ff && ff.id) || i, className: "tr-h tdb" }, h('td', { className: "td mono tm", style: { fontSize: 10 } }, (ff && ff.date) || ''), h('td', { className: "td" }, h('span', { className: 'tag tag-' + ((ff && ff.type) === 'DEPOSIT' ? 'dep' : 'wdw') }, (ff && ff.type) || '')), h('td', { className: "td" }, h('span', { className: isU ? 'hud-badge hud-usd-badge' : 'hud-badge hud-php-badge', style: { fontSize: 7 } }, isU ? 'USD' : '₱')), h('td', { className: "td ts", style: { fontFamily: 'Inter,sans-serif', fontWeight: 500 } }, (ff && ff.source) || ''), h('td', { className: "td" }, h(C.N, { v: (ff && ff.type) === 'DEPOSIT' ? ('+' + sm + f2(ff && ff.amount)) : ('−' + sm + f2(ff && ff.amount)), priv: priv, style: { color: (ff && ff.type) === 'DEPOSIT' ? '#c7e2f7' : '#5a6472', fontWeight: 700 } })), h('td', { className: "td tf", style: { fontSize: 9, fontFamily: 'Inter,sans-serif' } }, (ff && ff.note) || '—'));
            })))))),
          view === 'studylab' && h(SL.StudyLabUI, { liveTrades: trades, liveFunding: funding, tickerLists: tickerLists, mktPx: mktPx, setMktPx: setMktPx, psiFee: psiFee, fxRate: fxRate, isDark: isDark, priv: priv, scale: scale, addTicker: addTicker, deleteTicker: deleteTicker, addToast: addToast, doRefresh: doRefresh }),
        view === 'sandbox' && h(SL.PredictorV42, { enriched: enriched, trades: trades, usePse: psiFee, fxRate: fxRate, save: save, savedScenarios: savedScenarios, setSavedScenarios: setSavedScenarios, addToast: addToast, isDark: isDark, priv: priv, tickerLists: tickerLists })
      )
    );
  }

  /* ── EXPOSE ── */
  window.DashboardBody = DashboardBody;

  /* ── Mount ── */
  console.log('Attempting to mount...');
  var rootEl = document.getElementById('root');
  if (rootEl) {
    console.log('Root element found, rendering...');
    var root = window.ReactDOM.createRoot(rootEl);
    root.render(h(App));
  } else {
    console.error('Root element not found!');
  }

})(window);
