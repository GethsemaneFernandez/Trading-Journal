/* ═══════════════════════════════════════════════════════════
   BASIC JOURNAL V1.6 — STUDY LAB MULTIVERSE ENGINE
   window.StudyLabEngine
   ─────────────────────────────────────────────────────────
   Features:
   1. SNAPSHOT ENGINE  : cloneCurrentUniverse() deep-copies live
      positions + cash into a new named scenario.
   2. SCENARIO STACKING: multi-scenario state with unique IDs.
   3. THESIS BOX       : persistent notes (Virtual Journal) per
      scenario for backtesting documentation.
   4. SIM HUD          : getSimStats() → Net Worth + Survival Distance.
   No import/export — pure ES5 IIFE attached to window.
═══════════════════════════════════════════════════════════ */
(function (window) {
  'use strict';

  var E = window.BasicEngine || {};
  var K_SCENARIOS = 'bj16_scenarios';  /* localStorage key */
  var K_ACTIVE    = 'bj16_active_scn'; /* active scenario id */

  /* ── ID generator ────────────────────────────────────── */
  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  /* ── Deep clone helper ────────────────────────────────── */
  function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  /* ══════════════════════════════════════════════════════
     SCENARIO PERSISTENCE
  ══════════════════════════════════════════════════════ */
  function loadScenarios() {
    try {
      var raw = localStorage.getItem(K_SCENARIOS);
      var arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (e) { return []; }
  }

  function saveScenarios(scenarios) {
    localStorage.setItem(K_SCENARIOS, JSON.stringify(scenarios));
  }

  function getActiveId() {
    return localStorage.getItem(K_ACTIVE) || null;
  }

  function setActiveId(id) {
    localStorage.setItem(K_ACTIVE, id);
  }

  /* ══════════════════════════════════════════════════════
     SNAPSHOT ENGINE
     cloneCurrentUniverse(liveTrades, liveFunding, label, fxRate)
     → Creates a new scenario whose trades/funding mirror the
       current live portfolio state.
     → The clone is isolated: future live changes don't affect it.
  ══════════════════════════════════════════════════════ */
  function cloneCurrentUniverse(liveTrades, liveFunding, label, fxRate) {
    var scenarios = loadScenarios();
    var id = uid();
    var name = label || ('Clone ' + new Date().toLocaleDateString('en-PH'));
    var newScenario = {
      id:        id,
      name:      name,
      createdAt: new Date().toISOString(),
      trades:    deepClone(liveTrades  || []),
      funding:   deepClone(liveFunding || []),
      notes:     '',          /* Thesis Box */
      tags:      [],
      fxRate:    parseFloat(fxRate) || 60,
      isClone:   true,
      clonedAt:  new Date().toISOString(),
    };
    scenarios.push(newScenario);
    saveScenarios(scenarios);
    setActiveId(id);
    return newScenario;
  }

  /* ══════════════════════════════════════════════════════
     CREATE BLANK SCENARIO
  ══════════════════════════════════════════════════════ */
  function createScenario(name, fxRate) {
    var scenarios = loadScenarios();
    var id = uid();
    var newScenario = {
      id:        id,
      name:      name || ('Scenario ' + (scenarios.length + 1)),
      createdAt: new Date().toISOString(),
      trades:    [],
      funding:   [],
      notes:     '',
      tags:      [],
      fxRate:    parseFloat(fxRate) || 60,
      isClone:   false,
    };
    scenarios.push(newScenario);
    saveScenarios(scenarios);
    setActiveId(id);
    return newScenario;
  }

  /* ══════════════════════════════════════════════════════
     DELETE SCENARIO
  ══════════════════════════════════════════════════════ */
  function deleteScenario(id) {
    var scenarios = loadScenarios().filter(function(s) { return s.id !== id; });
    saveScenarios(scenarios);
    if (getActiveId() === id) {
      setActiveId(scenarios.length ? scenarios[scenarios.length - 1].id : null);
    }
    return scenarios;
  }

  /* ══════════════════════════════════════════════════════
     UPDATE SCENARIO (name, notes, tags, fxRate, trades, funding)
  ══════════════════════════════════════════════════════ */
  function updateScenario(id, patch) {
    var scenarios = loadScenarios().map(function(s) {
      if (s.id !== id) return s;
      return Object.assign({}, s, patch, { updatedAt: new Date().toISOString() });
    });
    saveScenarios(scenarios);
    return scenarios;
  }

  /* ══════════════════════════════════════════════════════
     GET SCENARIO BY ID
  ══════════════════════════════════════════════════════ */
  function getScenario(id) {
    return loadScenarios().find(function(s) { return s.id === id; }) || null;
  }

  function getActiveScenario() {
    var id = getActiveId();
    return id ? getScenario(id) : null;
  }

  /* ══════════════════════════════════════════════════════
     ADD TRADE TO SCENARIO (simulation step)
  ══════════════════════════════════════════════════════ */
  function addSimTrade(scenarioId, trade) {
    var scn = getScenario(scenarioId);
    if (!scn) return null;
    var newTrade = Object.assign({ id: uid(), date: new Date().toISOString().slice(0,10), time: new Date().toTimeString().slice(0,5) }, trade);
    var updated = scn.trades.concat([newTrade]);
    updateScenario(scenarioId, { trades: updated });
    return newTrade;
  }

  /* ══════════════════════════════════════════════════════
     SIM HUD
     getSimStats(scenario, mktPx) → metrics for the active sim
     Returns:
       netWorth        : PHP value of cash + open positions
       totalDeposited  : sum of funding deposits
       realizedPnL     : from closed cycles
       unrealizedPnL   : from open positions (needs mktPx)
       survivalDistance: netWorth / totalDeposited * 100 (%)
         Tells you "how much of your capital base do you still have"
       winRate, closedCount
  ══════════════════════════════════════════════════════ */
  function getSimStats(scenario, mktPx) {
    if (!scenario) return null;
    var fxRate = scenario.fxRate || 60;
    var psiFee = false; /* Sim Lab uses no PSE fees by default */
    var port = E.runMockPortfolio
      ? E.runMockPortfolio(scenario.trades, scenario.funding, psiFee, fxRate)
      : { cashPHP: 0, cashUSD: 0, active: [], realPnLPHP: 0, winRate: 0, closed: [] };

    var prices = mktPx || {};
    var upPnL = 0;
    var mvTotal = 0;
    port.active.forEach(function(p) {
      var px = prices[p.ticker] || p.avgNative;
      var mv, upl;
      if (E.isForex && E.isForex(p.exchange)) {
        upl = (px - p.avgNative) * p.qty;
        mv  = upl;
      } else {
        mv  = E.toPHP ? E.toPHP(px * p.qty, p.exchange, fxRate) : px * p.qty;
        upl = mv - (E.toPHP ? E.toPHP(p.totalCostNative, p.exchange, fxRate) : p.totalCostNative);
      }
      upPnL   += upl;
      mvTotal += mv;
    });

    var netWorth = port.cashPHP + port.cashUSD * fxRate + mvTotal;
    var totalDep = (scenario.funding || [])
      .filter(function(f) { return f && f.type === 'DEPOSIT'; })
      .reduce(function(s, f) { return s + (parseFloat(f.amount) || 0); }, 0);

    return {
      netWorth:         netWorth,
      cashPHP:          port.cashPHP,
      totalDeposited:   totalDep,
      realizedPnL:      port.realPnLPHP,
      unrealizedPnL:    upPnL,
      marketValue:      mvTotal,
      survivalDistance: totalDep > 0 ? (netWorth / totalDep) * 100 : 100,
      winRate:          port.winRate,
      closedCount:      (port.closed || []).length,
      openCount:        port.active.length,
    };
  }

  /* ══════════════════════════════════════════════════════
     EXPORT SCENARIO AS JSON
  ══════════════════════════════════════════════════════ */
  function exportScenario(id) {
    var scn = getScenario(id);
    if (!scn) return;
    var blob = new Blob([JSON.stringify(scn, null, 2)], { type: 'application/json' });
    var url  = URL.createObjectURL(blob);
    var a    = document.createElement('a');
    a.href = url;
    a.download = 'scenario_' + scn.name.replace(/\s+/g,'_') + '.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  /* ══════════════════════════════════════════════════════
     EXPOSE ON WINDOW
  ══════════════════════════════════════════════════════ */
  window.StudyLabEngine = {
    loadScenarios:        loadScenarios,
    saveScenarios:        saveScenarios,
    getActiveId:          getActiveId,
    setActiveId:          setActiveId,
    getActiveScenario:    getActiveScenario,
    getScenario:          getScenario,
    createScenario:       createScenario,
    cloneCurrentUniverse: cloneCurrentUniverse,
    deleteScenario:       deleteScenario,
    updateScenario:       updateScenario,
    addSimTrade:          addSimTrade,
    getSimStats:          getSimStats,
    exportScenario:       exportScenario,
  };

})(window);
