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

  var K_SCENARIOS = 'bj16_scenarios';
  var K_ACTIVE = 'bj16_active_scn';

  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function deepClone(obj) { return JSON.parse(JSON.stringify(obj)); }

  function loadScenarios() {
    try {
      var raw = localStorage.getItem(K_SCENARIOS);
      var arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (e) { return []; }
  }
  function saveScenarios(scenarios) { localStorage.setItem(K_SCENARIOS, JSON.stringify(scenarios)); }
  function getActiveId() { return localStorage.getItem(K_ACTIVE) || null; }
  function setActiveId(id) { localStorage.setItem(K_ACTIVE, id); }

  function cloneCurrentUniverse(liveTrades, liveFunding, label, fxRate) {
    var scenarios = loadScenarios();
    var id = uid();
    var name = label || ('Clone ' + new Date().toLocaleDateString('en-PH'));
    var newScenario = {
      id: id, name: name, createdAt: new Date().toISOString(),
      trades: deepClone(liveTrades || []), funding: deepClone(liveFunding || []),
      notes: '', tags: [], fxRate: parseFloat(fxRate) || 60, isClone: true, clonedAt: new Date().toISOString()
    };
    scenarios.push(newScenario);
    saveScenarios(scenarios);
    setActiveId(id);
    return newScenario;
  }

  function PredictorV42(props) {
    var enriched = props.enriched || [], trades = props.trades || [], usePse = props.usePse, fxRate = props.fxRate;
    var save = props.save, savedScenarios = props.savedScenarios || [], setSavedScenarios = props.setSavedScenarios;
    var addToast = props.addToast, isDark = props.isDark, priv = props.priv;

    var _md = useState('BUY'); var sbMd = _md[0]; var setSbMd = _md[1];
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
    function handleCommit() {
      if (!simResult || !sbTk) return;
      var allSteps = simResult.pendingStep ? sbStack.concat([simResult.pendingStep]) : sbStack.slice();
      var newT = allSteps.map(function (s, idx) {
        return { id: 't' + Date.now() + idx, type: s.side, exchange: ex, ticker: sbTk, price: s.price, qty: s.qty, date: new Date().toISOString().slice(0, 10), time: new Date().toTimeString().slice(0, 5), notes: '[Predictor]', stopLoss: '', takeProfit: '' };
      });
      save(trades.concat(newT));
      addToast('Committed ' + newT.length + ' trade(s): ' + sbTk, 'ok');
      handleClear();
    }
    function handleSave() {
      if (!simResult || !sbTk) return;
      var sc = {
        id: 'sc' + Date.now(),
        name: window.prompt('Enter scenario name:', 'Scenario ' + (savedScenarios.length + 1)) || ('Scenario ' + (savedScenarios.length + 1)),
        ticker: sbTk, date: new Date().toISOString().slice(0, 10), exchange: ex, notes: '',
        stack: simResult.pendingStep ? sbStack.concat([simResult.pendingStep]) : sbStack.slice(),
        result: Object.assign({}, simResult, { log: auditLog }),
        baseSnapshot: { qty: base ? base.qty : 0, totalCostNative: base ? base.totalCostNative : 0, avgNative: base ? base.avgNative : 0, exchange: ex }
      };
      var updated = [sc].concat(savedScenarios);
      setSavedScenarios(updated); localStorage.setItem(E.K.ss, JSON.stringify(updated));
      addToast('Scenario saved to Multiverse', 'ok');
    }

    return h('div', { style: { padding: 'var(--pad)', height: '100%', overflow: 'hidden', display: 'grid', gridTemplateColumns: '320px 1fr', gap: 'var(--gap)' } },
      /* Left: Control Panel */
      h('div', { className: "panel scroll", style: { padding: 16, display: 'flex', flexDirection: 'column', gap: 14 } },
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 } },
          h(C.IcTrend), h('span', { className: "sec-hd tm", style: { fontSize: 11 } }, "QUANTUM SIMULATOR")
        ),
        h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: 10 } },
          h('div', null,
            h('div', { className: "tf", style: { fontSize: 7.5, textTransform: 'uppercase', marginBottom: 2 } }, "Sim Net Worth"),
            h('div', { className: "mono", style: { fontSize: 13, fontWeight: 700, color: '#c7e2f7' } },
              "₱" + f2(simResult ? simResult.costPHP + (simResult.totalRealGLPHP || 0) : enriched.reduce(function(s,p){return s+p.mvPHP;},0)))
          ),
          h('div', null,
            h('div', { className: "tf", style: { fontSize: 7.5, textTransform: 'uppercase', marginBottom: 2 } }, "Survival Dist."),
            h('div', { className: "mono", style: { fontSize: 13, fontWeight: 700, color: '#f59e0b' } },
              simResult && simResult.qty > 0 ? pct((Math.abs(simResult.bev - (parseFloat(sbPx)||0)) / (parseFloat(sbPx)||1)) * 100) : '—')
          )
        ),
        h('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
          h(C.F, { label: "Subject Ticker" }, h(C.TickerDropdown, { exchange: ex, value: sbTk, onChange: setSbTk, tickers: props.tickerLists ? props.tickerLists[ex] || [] : [], forceList: true })),
          h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 } },
            h(C.F, { label: "Action" }, h('select', { className: "inp", value: sbMd, onChange: function (e) { setSbMd(e.target.value); } }, h('option', { value: "BUY" }, "BUY / LONG"), h('option', { value: "SELL" }, "SELL / CLOSE"))),
            h(C.F, { label: "Sim Price" }, h('input', { type: "number", step: "0.00001", className: "inp", value: sbPx, onChange: function (e) { setSbPx(e.target.value); setSimResult(null); }, placeholder: "0.00" }))
          ),
          h(C.F, { label: "Sim Qty" }, h('input', { type: "number", className: "inp", value: sbQty, onChange: function (e) { setSbQty(e.target.value); setSimResult(null); }, placeholder: "0" })),
          h('div', { style: { display: 'flex', gap: 8, marginTop: 4 } },
            h('button', { onClick: handleSim, className: "btn", style: { flex: 1, padding: '8px 0', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', color: '#3b82f6' } }, "PREVIEW"),
            h('button', { onClick: handleQueue, className: "btn", style: { flex: 1, padding: '8px 0', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', color: '#10b981' } }, "QUEUE")
          ),
          h('button', { onClick: handleClear, className: "ghost", style: { fontSize: 9, alignSelf: 'center', opacity: 0.5 } }, "Reset Sim")
        ),
        simResult && h('div', { className: "lot-in", style: { padding: 12, background: 'rgba(255,255,255,0.03)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)' } },
          h('div', { style: { fontSize: 9, fontWeight: 700, marginBottom: 8, color: '#f59e0b' } }, "SIMULATION RESULT:"),
          h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 } },
            h('div', null, h('span', { className: "tf", style: { fontSize: 7.5 } }, "New Qty"), h('div', { className: "mono", style: { fontSize: 10, fontWeight: 700 } }, f0(simResult.qty))),
            h('div', null, h('span', { className: "tf", style: { fontSize: 7.5 } }, "New Avg"), h('div', { className: "mono", style: { fontSize: 10, fontWeight: 700 } }, sym + (E.isForex(ex) ? f5(simResult.newAvgNative) : f4(simResult.newAvgNative)))),
            h('div', null, h('span', { className: "tf", style: { fontSize: 7.5 } }, "BEV"), h('div', { className: "mono", style: { fontSize: 10, fontWeight: 700, color: '#f59e0b' } }, sym + (E.isForex(ex) ? f5(simResult.bev) : f4(simResult.bev)))),
            h('div', null, h('span', { className: "tf", style: { fontSize: 7.5 } }, "Sim P&L"), h('div', { className: "mono", style: { fontSize: 10, fontWeight: 700, color: G(simResult.totalRealGLPHP) } }, "₱" + f2(simResult.totalRealGLPHP)))
          ),
          h('div', { style: { marginTop: 12, display: 'flex', gap: 8 } },
            h('button', { onClick: handleCommit, className: "btn btn-buy", style: { flex: 1, padding: '6px 0', fontSize: 9 } }, "COMMIT LIVE"),
            h('button', { onClick: handleSave, className: "btn", style: { flex: 1, padding: '6px 0', fontSize: 9, background: '#8b5cf6', borderColor: '#8b5cf6' } }, "SAVE SCENARIO")
          )
        )
      ),
      /* Right: Scenarios */
      h('div', { className: "panel scroll", style: { padding: 16 } },
        h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 } },
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
            h(C.IcFlask), h('span', { className: "sec-hd tm", style: { fontSize: 11 } }, "SCENARIO MULTIVERSE")
          )
        ),
        savedScenarios.length === 0 ? h('div', { style: { height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }, className: "tf" }, "No saved scenarios.") :
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 } },
            savedScenarios.map(function (sc) {
              var r = sc.result, ex2 = sc.exchange || 'PSE';
              return h('div', { key: sc.id, className: "inset", style: { padding: 12, background: 'rgba(255,255,255,0.02)', position: 'relative' } },
                h('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 8 } },
                  h('div', null, h('div', { className: "tm", style: { fontSize: 10.5, fontWeight: 700, color: '#c7e2f7' } }, sc.name), h('div', { className: "tf mono", style: { fontSize: 8, opacity: 0.5 } }, sc.ticker + " · " + sc.date)),
                  h('button', { onClick: function () { var updated = savedScenarios.filter(function (s) { return s.id !== sc.id; }); setSavedScenarios(updated); localStorage.setItem(E.K.ss, JSON.stringify(updated)); }, style: { background: 'transparent', border: 'none', color: '#5a6472', cursor: 'pointer' } }, h(C.IcTrash))
                ),
                h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 10 } },
                  h('div', { className: "mono", style: { fontSize: 9 } }, "Qty: " + f0(r.qty)),
                  h('div', { className: "mono", style: { fontSize: 9 } }, "Avg: " + S(ex2) + (E.isForex(ex2) ? f5(r.newAvgNative) : f4(r.newAvgNative))),
                  h('div', { className: "mono", style: { fontSize: 9, color: '#f59e0b' } }, "BEV: " + S(ex2) + (E.isForex(ex2) ? f5(r.bev) : f4(r.bev))),
                  h('div', { className: "mono", style: { fontSize: 9, color: G(r.totalRealGLPHP) } }, "P&L: ₱" + f2(r.totalRealGLPHP))
                ),
                h('textarea', { className: "inp", rows: 2, style: { fontSize: 9, background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)' },
                  placeholder: "Study notes / thesis...", value: sc.notes || '',
                  onChange: function (e) {
                    var updated = savedScenarios.map(function (s) { if (s.id === sc.id) { var n = Object.assign({}, s); n.notes = e.target.value; return n; } return s; });
                    setSavedScenarios(updated); localStorage.setItem(E.K.ss, JSON.stringify(updated));
                  } })
              );
            })
          )
      )
    );
  }

  /* ── EXPOSE ── */
  window.StudyLabEngine = {
    loadScenarios: loadScenarios, saveScenarios: saveScenarios, getActiveId: getActiveId, setActiveId: setActiveId,
    cloneCurrentUniverse: cloneCurrentUniverse, PredictorV42: PredictorV42
  };
})(window);
