(function (window) {
  'use strict';
  var R = window.React;
  var E = window.BasicEngine || {};
  var C = window.BJComponents || {};

  console.log('studyLab.js initializing...');

  if (!R) { console.error('studyLab.js: React not found'); return; }

  var h = R.createElement;
  var useState = R.useState;
  var useEffect = R.useEffect;
  var useMemo = R.useMemo;

  var f0 = E.f0; var f2 = E.f2; var f4 = E.f4; var f5 = E.f5;
  var pct = E.pct; var sgn = E.sgn; var G = E.G; var S = E.S;

  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

  function StudyLabUI(props) {
    var tickerLists = props.tickerLists, mktPx = props.mktPx, setMktPx = props.setMktPx;
    var psiFee = props.psiFee, fxRate = props.fxRate, isDark = props.isDark, priv = props.priv;
    var addToast = props.addToast, doRefresh = props.doRefresh;

    var _mt = useState(function() {
        try { return JSON.parse(localStorage.getItem(E.K.mock)) || []; } catch(e){ return []; }
    }); var mockTrades = _mt[0]; var setMockTrades = _mt[1];

    var _sd = useState(new Date().toISOString().slice(0, 10)); var simDate = _sd[0]; var setSimDate = _sd[1];

    var saveMock = function(nT) {
        setMockTrades(nT);
        localStorage.setItem(E.K.mock, JSON.stringify(nT));
    };

    var mockPort = useMemo(function () {
        return E.runMockPortfolio ? E.runMockPortfolio(mockTrades, [], psiFee, fxRate) : { active: [] };
    }, [mockTrades, psiFee, fxRate]);

    var enrich = function(active) {
        return (active || []).map(function (p) {
          var mp = parseFloat(mktPx[p.ticker]) || p.avgNative;
          var mvPHP = E.toPHP ? E.toPHP(mp * p.qty, p.exchange, fxRate) : mp * p.qty;
          var uplPHP = p.avgNative > 0 ? (E.toPHP ? E.toPHP((mp - p.avgNative) * p.qty, p.exchange, fxRate) : (mp - p.avgNative) * p.qty) : mvPHP;
          var uplP = p.avgNative > 0 ? ((mp - p.avgNative) / p.avgNative) * 100 : 100;
          var bev = E.breakEven ? E.breakEven(p.totalCostNative, p.qty, p.exchange, psiFee) : p.avgNative;
          return Object.assign({}, p, { mp: mp, mvPHP: mvPHP, uplPHP: uplPHP, uplP: uplP, beven: bev, bev: bev });
        });
    };
    var mockEnriched = useMemo(function () { return enrich(mockPort.active); }, [mockPort.active, mktPx, fxRate, psiFee]);

    function handleTimeTravel() {
        if (!simDate) return;
        addToast('Traveling to ' + simDate + '...', 'info');
        doRefresh(simDate);
    }

    function cloneLive() {
        if (!window.confirm('Clone all live trades to Study Lab?')) return;
        saveMock(JSON.parse(JSON.stringify(props.liveTrades)));
        addToast('Live Ledger Cloned to Lab', 'ok');
    }

    return h('div', { style: { height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' } },
        h('div', { style: { flexShrink: 0, padding: '8px var(--pad)', background: isDark ? 'rgba(139,92,246,.07)' : 'rgba(139,92,246,.05)', borderBottom: '1px solid rgba(139,92,246,.18)', display: 'flex', alignItems: 'center', gap: 12 } },
          h(C.IcFlask), h('span', { style: { fontSize: 10.5, fontWeight: 700, color: '#a78bfa', letterSpacing: '.06em' } }, "STUDY LAB — TIME MACHINE"),
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 6, marginLeft: 20 } },
            h('span', { className: "tf", style: { fontSize: 9 } }, "SIM DATE:"),
            h('input', { type: "date", className: "inp", style: { width: 130, height: 24, fontSize: 10 }, value: simDate, onChange: function(e){ setSimDate(e.target.value); } }),
            h('button', { onClick: handleTimeTravel, className: "btn btn-blue", style: { padding: '2px 10px', fontSize: 9 } }, "GO BACK IN TIME")
          ),
          h('div', { style: { marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 } },
            h('button', { onClick: cloneLive, className: "ghost", style: { padding: '2px 8px', borderRadius: '.4rem', fontSize: 9, cursor: 'pointer', color: '#a78bfa', border: '1px solid rgba(167,139,250,.25)', background: 'rgba(167,139,250,.08)' } }, "Clone Live to Lab"),
            h('button', { onClick: function(){ if(confirm('Clear lab?')) saveMock([]); }, className: "ghost", style: { padding: '2px 8px', borderRadius: '.4rem', fontSize: 9, cursor: 'pointer', color: '#5a6472', border: '1px solid rgba(244,63,94,.20)', background: 'rgba(244,63,94,.06)' } }, "Clear Lab")
          )
        ),
        h('div', { style: { flex: 1, minHeight: 0, overflow: 'hidden', position: 'relative' } },
            h(window.DashboardBody, {
                enriched: mockEnriched, port: mockPort, trades: mockTrades, funding: [],
                tickerLists: tickerLists, mktPx: mktPx, setMktPx: setMktPx,
                psiFee: psiFee, fxRate: fxRate, isDark: isDark, priv: priv,
                scale: props.scale, addTicker: props.addTicker, deleteTicker: props.deleteTicker,
                onExecTrade: function(t, side){ saveMock(mockTrades.concat([t])); addToast('[MOCK] ' + side + ' ' + t.ticker, 'info'); },
                isMock: true, addToast: addToast, saveTrades: saveMock
            })
        )
    );
  }

  function PredictorV42(props) {
    var enriched = props.enriched || [], trades = props.trades || [], usePse = props.usePse, fxRate = props.fxRate;
    var save = props.save, savedScenarios = props.savedScenarios || [], setSavedScenarios = props.setSavedScenarios;
    var addToast = props.addToast, isDark = props.isDark, priv = props.priv;

    var _md = useState('SELL'); var sbMd = _md[0]; var setSbMd = _md[1];
    var _tk = useState(''); var sbTk = _tk[0]; var setSbTk = _tk[1];
    var _px = useState(''); var sbPx = _px[0]; var setSbPx = _px[1];
    var _q = useState(''); var sbQty = _q[0]; var setSbQty = _q[1];
    var _st = useState([]); var sbStack = _st[0]; var setSbStack = _st[1];
    var _sr = useState(null); var simResult = _sr[0]; var setSimResult = _sr[1];
    var _al = useState([]); var auditLog = _al[0]; var setAuditLog = _al[1];

    var base = null;
    for (var i = 0; i < enriched.length; i++) { if (enriched[i].ticker === sbTk) { base = enriched[i]; break; } }
    var ex = base ? base.exchange : 'PSE'; var sym = S(ex);

    function computeSim(stack, pending) {
      var steps = pending ? stack.concat([pending]) : stack.slice();
      if (!steps.length) return null;
      return E.runSimulation(sbTk, enriched, steps, usePse, fxRate, function (m) { addToast(m, 'err'); });
    }
    function handleSim() {
      if (!sbTk) { addToast('Select a position', 'err'); return; }
      if (!sbPx || !sbQty) { addToast('Enter price and qty', 'err'); return; }
      var step = { side: sbMd, price: parseFloat(sbPx), qty: parseFloat(sbQty), label: 'Step ' + (sbStack.length + 1) };
      var res = computeSim(sbStack, step);
      if (!res) return;
      setSimResult(Object.assign({}, res, { pendingStep: step }));
      setAuditLog(res.log);
    }
    function handleQueue() {
      if (!sbTk || !sbPx || !sbQty) { addToast('Fill price and qty first', 'err'); return; }
      var step = { side: sbMd, price: parseFloat(sbPx), qty: parseFloat(sbQty), label: 'Step ' + (sbStack.length + 1) };
      var test = computeSim(sbStack.concat([step]), null);
      if (!test) return;
      setSbStack(function (s) { return s.concat([step]); }); setSbPx(''); setSbQty(''); setSimResult(null); setAuditLog([]);
      addToast('Step ' + (sbStack.length + 1) + ' queued', 'info');
    }
    function handleClear() { setSbStack([]); setSimResult(null); setAuditLog([]); setSbPx(''); setSbQty(''); }

    return h('div', { style: { padding: 'var(--pad)', height: '100%', overflow: 'hidden', display: 'grid', gridTemplateColumns: '320px 1fr', gap: 'var(--gap)' } },
      /* Left: Control Panel */
      h('div', { className: "panel scroll", style: { padding: 16, display: 'flex', flexDirection: 'column', gap: 14 } },
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 } },
          h(C.IcTrend), h('span', { className: "sec-hd tm", style: { fontSize: 11 } }, "EXIT STRATEGY PREDICTOR")
        ),
        h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: 10 } },
          h('div', null,
            h('div', { className: "tf", style: { fontSize: 7.5, textTransform: 'uppercase', marginBottom: 2 } }, "Proj. Net Gain"),
            h('div', { className: "mono", style: { fontSize: 13, fontWeight: 700, color: '#c7e2f7' } },
              "₱" + f2(simResult ? simResult.totalRealGLPHP : 0))
          ),
          h('div', null,
            h('div', { className: "tf", style: { fontSize: 7.5, textTransform: 'uppercase', marginBottom: 2 } }, "New Avg"),
            h('div', { className: "mono", style: { fontSize: 13, fontWeight: 700, color: '#f59e0b' } },
              simResult && simResult.qty > 0 ? sym + (E.isForex(ex)?f5(simResult.newAvgNative):f4(simResult.newAvgNative)) : '—')
          )
        ),
        h('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
          h(C.F, { label: "Subject Ticker" }, h(C.TickerDropdown, { exchange: ex, value: sbTk, onChange: setSbTk, tickers: enriched.map(function(p){return p.ticker;}), forceList: true })),
          h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 } },
            h(C.F, { label: "Action" }, h('select', { className: "inp", value: sbMd, onChange: function (e) { setSbMd(e.target.value); } }, h('option', { value: "BUY" }, "BUY (Averaging)"), h('option', { value: "SELL" }, "SELL (Exit)"))),
            h(C.F, { label: "Sim Price" }, h('input', { type: "number", step: "0.00001", className: "inp", value: sbPx, onChange: function (e) { setSbPx(e.target.value); setSimResult(null); }, placeholder: "0.00" }))
          ),
          h(C.F, { label: "Sim Qty" }, h('div', { style: { display: 'flex', flexDirection: 'column', gap: 4 } },
            h('div', { style: { display: 'flex', gap: 5 } },
              h('input', { type: "number", className: "inp", value: sbQty, onChange: function (e) { setSbQty(e.target.value); setSimResult(null); }, placeholder: "0" }),
              sbMd === 'SELL' && base && h('button', { className: "btn btn-blue", style: { fontSize: 8, padding: '0 8px' }, onClick: function(){ setSbQty(String(base.qty)); } }, "MAX")
            ),
            sbMd === 'SELL' && base && h('div', { style: { display: 'flex', gap: 4 } },
              [0.25, 0.5, 0.75].map(function(p){
                return h('button', { key: p, className: "ghost", style: { flex: 1, fontSize: 8, padding: '2px 0' }, onClick: function(){ setSbQty(String(Math.floor(base.qty * p))); } }, (p*100) + '%');
              })
            )
          )),
          h('div', { style: { display: 'flex', gap: 8, marginTop: 4 } },
            h('button', { onClick: handleSim, className: "btn", style: { flex: 1, padding: '8px 0', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', color: '#3b82f6' } }, "PREVIEW"),
            h('button', { onClick: handleQueue, className: "btn", style: { flex: 1, padding: '8px 0', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', color: '#10b981' } }, "QUEUE")
          ),
          h('button', { onClick: handleClear, className: "ghost", style: { fontSize: 9, alignSelf: 'center', opacity: 0.5 } }, "Reset Predictor")
        ),
        simResult && h('div', { className: "lot-in", style: { padding: 12, background: 'rgba(255,255,255,0.03)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)' } },
          h('div', { style: { fontSize: 9, fontWeight: 700, marginBottom: 8, color: '#f59e0b' } }, "PROJECTED STATE:"),
          h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 } },
            h('div', null, h('span', { className: "tf", style: { fontSize: 7.5 } }, "New Qty"), h('div', { className: "mono", style: { fontSize: 10, fontWeight: 700 } }, f0(simResult.qty))),
            h('div', null, h('span', { className: "tf", style: { fontSize: 7.5 } }, "New BEV"), h('div', { className: "mono", style: { fontSize: 10, fontWeight: 700, color: '#f59e0b' } }, sym + (E.isForex(ex) ? f5(simResult.bev) : f4(simResult.bev)))),
            h('div', null, h('span', { className: "tf", style: { fontSize: 7.5 } }, "Realized P&L"), h('div', { className: "mono", style: { fontSize: 10, fontWeight: 700, color: G(simResult.totalRealGLPHP) } }, "₱" + f2(simResult.totalRealGLPHP)))
          )
        )
      ),
      /* Right: Audit Log of Predictor */
      h('div', { className: "panel scroll", style: { padding: 16 } },
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 } },
          h(C.IcFlask), h('span', { className: "sec-hd tm", style: { fontSize: 11 } }, "STRATEGY QUEUE / AUDIT LOG")
        ),
        auditLog.length === 0 ? h('div', { style: { height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }, className: "tf" }, "Queue steps to see impact.") :
          h('table', { className: "tbl" },
            h('thead', null, h('tr', null, h('th', { className: "th" }, "Step"), h('th', { className: "th" }, "Side"), h('th', { className: "th" }, "Price"), h('th', { className: "th" }, "Qty"), h('th', { className: "th" }, "Result Qty"), h('th', { className: "th" }, "Result Avg"))),
            h('tbody', null, auditLog.map(function(l, idx){
                return h('tr', { key: idx, className: "tr-h tdb" },
                    h('td', { className: "td ts" }, l.step),
                    h('td', { className: "td" }, h('span', { className: 'tag tag-' + l.side.toLowerCase() }, l.side)),
                    h('td', { className: "td mono tm" }, sym + (E.isForex(l.ex)?f5(l.price):f4(l.price))),
                    h('td', { className: "td mono tm" }, f0(l.qty)),
                    h('td', { className: "td mono ts" }, f0(l.newQty)),
                    h('td', { className: "td mono tm" }, sym + (E.isForex(l.ex)?f5(l.newAvg):f4(l.newAvg)))
                );
            }))
          )
      )
    );
  }

  /* ── EXPOSE ── */
  window.StudyLabEngine = {
    StudyLabUI: StudyLabUI,
    PredictorV42: PredictorV42
  };
})(window);
