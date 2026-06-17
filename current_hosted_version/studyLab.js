(function (window) {
  'use strict';
  var R = window.React;
  var E = window.BasicEngine || {};
  var C = window.BJComponents || {};

  console.log('studyLab.js initializing Study Lab V2...');

  if (!R) { console.error('studyLab.js: React not found'); return; }

  var h = R.createElement;
  var useState = R.useState;
  var useEffect = R.useEffect;
  var useMemo = R.useMemo;

  var f0 = E.f0; var f2 = E.f2; var f4 = E.f4; var f5 = E.f5;
  var pct = E.pct; var sgn = E.sgn; var G = E.G; var S = E.S;

  function getMockTradesWithPnL(trades, psiFee, fxRate) {
    var rate = parseFloat(fxRate) || 60;
    var pos = {};
    var sorted = trades.filter(function(t) { return t && t.ticker && t.price && t.qty; })
      .slice().sort(function(a, b) {
        return ((a.date || '') + 'T' + (a.time || '00:00')).localeCompare((b.date || '') + 'T' + (b.time || '00:00'));
      });
    return sorted.map(function(t) {
      var type = (t.type || '').toUpperCase();
      var ex = t.exchange || 'PSE';
      var p = parseFloat(t.price) || 0;
      var q = parseFloat(t.qty) || 0;
      var fee = E.calcFee ? E.calcFee(type, p, q, psiFee, ex) : 0;
      var pnl = 0;
      
      if (type === 'BUY') {
        var nativeCost = E.isForex(ex) ? p * q : p * q + fee;
        var phpCost = E.toPHP ? E.toPHP(nativeCost, ex, rate) : nativeCost;
        if (!pos[t.ticker]) pos[t.ticker] = { qty: 0, totalCostPHP: 0 };
        pos[t.ticker].qty += q;
        pos[t.ticker].totalCostPHP += phpCost;
      } else if (type === 'SELL') {
        var nativeProceeds, phpProceeds;
        if (E.isForex(ex)) {
          var entryAvg = pos[t.ticker] ? pos[t.ticker].totalCostPHP / pos[t.ticker].qty : p;
          var pipPnL = (p - entryAvg) * q;
          pnl = pipPnL * rate;
          if (pos[t.ticker]) {
            pos[t.ticker].totalCostPHP -= entryAvg * q;
          }
        } else {
          nativeProceeds = p * q - fee;
          phpProceeds = E.toPHP ? E.toPHP(nativeProceeds, ex, rate) : nativeProceeds;
          var pInfo = pos[t.ticker];
          var avg = pInfo && pInfo.qty > 0 ? pInfo.totalCostPHP / pInfo.qty : 0;
          var basis = avg * q;
          pnl = phpProceeds - basis;
          if (pInfo) {
            pInfo.qty -= q;
            pInfo.totalCostPHP -= basis;
          }
        }
      }
      return Object.assign({}, t, { pnl: pnl });
    });
  }

  function StudyLabUI(props) {
    var tickerLists = props.tickerLists, mktPx = props.mktPx, setMktPx = props.setMktPx;
    var psiFee = props.psiFee, fxRate = props.fxRate, isDark = props.isDark, priv = props.priv;
    var addToast = props.addToast, doRefresh = props.doRefresh;

    var _mt = useState(function() {
      try { return JSON.parse(localStorage.getItem(E.K.mock)) || []; } catch(e){ return []; }
    }); var mockTrades = _mt[0]; var setMockTrades = _mt[1];

    var _sd = useState(new Date().toISOString().slice(0, 10)); var simDate = _sd[0]; var setSimDate = _sd[1];
    var _tab = useState('timemachine'); var activeTab = _tab[0]; var setActiveTab = _tab[1];

    var _fid = useState(function() {
      return localStorage.getItem('bj_active_forensics_id') || '';
    }); var activeForensicsId = _fid[0]; var setActiveForensicsId = _fid[1];

    var _meta = useState(function() {
      try { return JSON.parse(localStorage.getItem('bj_trade_meta')) || {}; } catch(e) { return {}; }
    }); var tradeMeta = _meta[0]; var setTradeMeta = _meta[1];

    var _ak = useState(function() {
      return localStorage.getItem('bj_anthropic_key') || '';
    }); var apiKey = _ak[0]; var setApiKey = _ak[1];

    var _out = useState(''); var aiOutput = _out[0]; var setAiOutput = _out[1];
    var _ld = useState(false); var aiLoading = _ld[0]; var setAiLoading = _ld[1];

    var saveMock = function(nT) {
      setMockTrades(nT);
      localStorage.setItem(E.K.mock, JSON.stringify(nT));
    };

    var filteredTrades = useMemo(function() {
      return mockTrades.filter(function(t) { return t.date <= simDate; });
    }, [mockTrades, simDate]);

    var tradesExecutedToday = useMemo(function() {
      return mockTrades.filter(function(t) { return t.date === simDate; });
    }, [mockTrades, simDate]);

    var mockPort = useMemo(function () {
      return E.runMockPortfolio ? E.runMockPortfolio(filteredTrades, [], psiFee, fxRate) : { active: [], cashPHP: 0, cashUSD: 0, realPnLPHP: 0 };
    }, [filteredTrades, psiFee, fxRate]);

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

    // Process trades and join with metadata
    var enrichedMockTrades = useMemo(function() {
      return getMockTradesWithPnL(mockTrades, psiFee, fxRate);
    }, [mockTrades, psiFee, fxRate]);

    var statsData = useMemo(function() {
      return enrichedMockTrades.map(function(t) {
        var id = t.ticker + '-' + t.date + '-' + t.type + '-' + t.price;
        var meta = tradeMeta[id] || {};
        
        if (t.type === 'SELL') {
          if (!meta.setup_type || !meta.emotional_state) {
            var buyTrades = enrichedMockTrades.filter(function(bt) {
              return bt.ticker === t.ticker && bt.type === 'BUY' && bt.date <= t.date;
            });
            for (var i = buyTrades.length - 1; i >= 0; i--) {
              var bid = buyTrades[i].ticker + '-' + buyTrades[i].date + '-' + buyTrades[i].type + '-' + buyTrades[i].price;
              var bmeta = tradeMeta[bid];
              if (bmeta && (bmeta.setup_type || bmeta.emotional_state)) {
                meta = Object.assign({}, bmeta, meta);
                break;
              }
            }
          }
        }
        return { trade: t, meta: meta };
      });
    }, [enrichedMockTrades, tradeMeta]);

    function handleSelectForensics(t) {
      var id = t.ticker + '-' + t.date + '-' + t.type + '-' + t.price;
      localStorage.setItem('bj_active_forensics_id', id);
      setActiveForensicsId(id);
      setActiveTab('forensics');
    }

    // Forensics fields states
    var activeTrade = useMemo(function() {
      return mockTrades.find(function(t) {
        return (t.ticker + '-' + t.date + '-' + t.type + '-' + t.price) === activeForensicsId;
      });
    }, [mockTrades, activeForensicsId]);

    var activeMeta = useMemo(function() {
      return tradeMeta[activeForensicsId] || {
        entry_reason: '',
        setup_type: 'trend_follow',
        emotional_state: 'calm',
        followed_plan: 'yes',
        what_went_right: '',
        what_went_wrong: '',
        verdict: 'MIXED',
        lesson_tags: [],
        rating: 3
      };
    }, [tradeMeta, activeForensicsId]);

    function saveMeta(data) {
      var updated = Object.assign({}, tradeMeta);
      updated[activeForensicsId] = data;
      setTradeMeta(updated);
      localStorage.setItem('bj_trade_meta', JSON.stringify(updated));
      addToast('Forensics Saved', 'ok');
    }

    // Patterns calculations
    var taggedCount = useMemo(function() {
      return Object.keys(tradeMeta).filter(function(id) {
        var m = tradeMeta[id];
        return m && m.entry_reason && m.what_went_wrong;
      }).length;
    }, [tradeMeta]);

    var patternsMetrics = useMemo(function() {
      if (taggedCount < 5) return null;

      var setups = { trend_follow: { w: 0, t: 0 }, reversal: { w: 0, t: 0 }, breakout: { w: 0, t: 0 }, scalp: { w: 0, t: 0 }, news: { w: 0, t: 0 } };
      var emotions = { calm: { w: 0, t: 0 }, rushed: { w: 0, t: 0 }, fomo: { w: 0, t: 0 }, revenge: { w: 0, t: 0 }, confident: { w: 0, t: 0 } };
      var times = { morning: { w: 0, t: 0 }, afternoon: { w: 0, t: 0 }, night: { w: 0, t: 0 } };
      var markets = { PSE: { w: 0, t: 0 }, NASDAQ: { w: 0, t: 0 }, FOREX: { w: 0, t: 0 }, CRYPTO: { w: 0, t: 0 } };
      
      var plannedRRs = [];
      var actualRRs = [];
      var losingTags = {};

      statsData.forEach(function(sd) {
        var t = sd.trade;
        var m = sd.meta;
        var win = t.pnl > 0;

        if (t.type === 'SELL') {
          // Setup
          if (m.setup_type && setups[m.setup_type]) {
            setups[m.setup_type].t++;
            if (win) setups[m.setup_type].w++;
          }
          // Emotion
          if (m.emotional_state && emotions[m.emotional_state]) {
            emotions[m.emotional_state].t++;
            if (win) emotions[m.emotional_state].w++;
          }
          // Session / Time of day
          if (t.time) {
            var hour = parseInt(t.time.split(':')[0]) || 0;
            var session = 'night';
            if (hour >= 9 && hour < 12) session = 'morning';
            else if (hour >= 12 && hour < 16) session = 'afternoon';
            times[session].t++;
            if (win) times[session].w++;
          }
          // Market
          var mkt = t.exchange === 'NYSE' ? 'NASDAQ' : (t.exchange || 'PSE');
          if (markets[mkt]) {
            markets[mkt].t++;
            if (win) markets[mkt].w++;
          }
          // Tags on losses
          if (!win && m.lesson_tags) {
            m.lesson_tags.forEach(function(tag) {
              losingTags[tag] = (losingTags[tag] || 0) + 1;
            });
          }

          // planned vs actual R:R
          var buyT = enrichedMockTrades.find(function(bt) {
            return bt.ticker === t.ticker && bt.type === 'BUY' && bt.date <= t.date;
          });
          if (buyT && buyT.stopLoss > 0 && buyT.takeProfit > 0) {
            var plannedRisk = Math.abs(buyT.price - buyT.stopLoss);
            var plannedReward = Math.abs(buyT.takeProfit - buyT.price);
            if (plannedRisk > 0) {
              plannedRRs.push(plannedReward / plannedRisk);
              actualRRs.push((t.price - buyT.price) / plannedRisk);
            }
          }
        }
      });

      function avg(arr) { return arr.length ? arr.reduce(function(s, v){ return s+v; }, 0) / arr.length : 0; }

      return {
        setups: setups,
        emotions: emotions,
        times: times,
        markets: markets,
        avgPlannedRR: avg(plannedRRs),
        avgActualRR: avg(actualRRs),
        losingTags: Object.keys(losingTags).map(function(k) { return { tag: k, count: losingTags[k] }; }).sort(function(a,b){ return b.count - a.count; })
      };
    }, [statsData, taggedCount, enrichedMockTrades]);

    // AI Review action
    function triggerAiReview(scope) {
      if (!apiKey) {
        addToast('Anthropic API Key is required.', 'err');
        return;
      }
      setAiLoading(true);
      setAiOutput('Initializing coach critique...');
      
      var targetData = [];
      if (scope === '7days') {
        var d = new Date(simDate);
        var cutoff = new Date(d.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
        targetData = statsData.filter(function(sd) { return sd.trade.date >= cutoff && sd.trade.date <= simDate; });
      } else if (scope === 'all') {
        targetData = statsData;
      } else if (scope === 'positions') {
        targetData = mockEnriched;
      }

      var sysPrompt = "You are a ruthless but constructive trading coach. Analyze this trader's data and identify: (1) top 3 recurring mistakes with specific evidence, (2) which setups are actually profitable vs which they should stop doing, (3) one specific rule they must add to their system immediately. Be direct. No fluff. Use bullet points. Reference specific trades.";

      fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerously-allow-browser": "true"
        },
        body: JSON.stringify({
          model: "claude-3-5-sonnet-20241022",
          max_tokens: 1000,
          stream: true,
          system: sysPrompt,
          messages: [
            { role: "user", content: "Review this trading session data:\n" + JSON.stringify(targetData, null, 2) }
          ]
        })
      }).then(async function(response) {
        if (!response.ok) {
          var err = await response.json().catch(function() { return {}; });
          throw new Error(err.error?.message || "HTTP Error " + response.status);
        }
        setAiOutput('');
        setAiLoading(false);
        var reader = response.body.getReader();
        var decoder = new TextDecoder("utf-8");
        var buffer = "";

        function read() {
          return reader.read().then(function(chunk) {
            if (chunk.done) return;
            buffer += decoder.decode(chunk.value, { stream: true });
            var lines = buffer.split("\n");
            buffer = lines.pop();
            lines.forEach(function(line) {
              var tr = line.trim();
              if (tr.indexOf("data:") === 0) {
                var jsonStr = tr.slice(5).trim();
                if (jsonStr) {
                  try {
                    var d = JSON.parse(jsonStr);
                    if (d.type === "content_block_delta" && d.delta && d.delta.text) {
                      setAiOutput(function(prev) { return prev + d.delta.text; });
                    }
                  } catch(e){}
                }
              }
            });
            return read();
          });
        }
        return read();
      }).catch(function(err) {
        setAiLoading(false);
        addToast("Coach Review Failed: " + err.message, "err");
      });
    }

    return h('div', { style: { height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' } },
      /* Toolbar */
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
      /* Sub-tabs Navigation */
      h('div', { style: { display: 'flex', gap: 10, padding: '8px var(--pad)', borderBottom: '1px solid rgba(139,92,246,.12)', background: 'rgba(139,92,246,.02)' } },
        [
          { id: 'timemachine', label: '🕰 Time Machine' },
          { id: 'forensics', label: '🔍 Trade Forensics' },
          { id: 'patterns', label: '📊 Pattern Intelligence' },
          { id: 'ai', label: '🤖 AI Review' }
        ].map(function(t) {
          var active = activeTab === t.id;
          return h('button', {
            key: t.id,
            onClick: function() { setActiveTab(t.id); },
            style: {
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
              border: '1px solid ' + (active ? 'rgba(167,139,250,0.35)' : 'transparent'),
              background: active ? 'rgba(167,139,250,0.12)' : 'transparent',
              color: active ? '#a78bfa' : '#8e9aa8'
            }
          }, t.label);
        })
      ),
      /* Main Content Switcher */
      h('div', { style: { flex: 1, minHeight: 0, overflow: 'hidden', position: 'relative' } },
        activeTab === 'timemachine' && h('div', { style: { height: '100%', display: 'flex' } },
          h('div', { style: { flex: 1, height: '100%', overflow: 'hidden' } },
            h(window.DashboardBody, {
              enriched: mockEnriched, port: mockPort, trades: filteredTrades, funding: [],
              tickerLists: tickerLists, mktPx: mktPx, setMktPx: setMktPx,
              psiFee: psiFee, fxRate: fxRate, isDark: isDark, priv: priv,
              scale: props.scale, addTicker: props.addTicker, deleteTicker: props.deleteTicker,
              onExecTrade: function(t, side){ saveMock(mockTrades.concat([t])); addToast('[MOCK] ' + side + ' ' + t.ticker, 'info'); },
              isMock: true, addToast: addToast, saveTrades: saveMock
            })
          ),
          h('div', { style: { width: 300, borderLeft: '1px solid rgba(139,92,246,0.18)', background: 'rgba(0,0,0,0.15)', padding: 16, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 } },
            h('span', { className: 'sec-hd tm', style: { fontSize: 11, color: '#a78bfa' } }, 'Trades Executed Today'),
            tradesExecutedToday.length === 0 ? h('span', { className: 'tf', style: { fontSize: 9.5, color: '#5a6472' } }, 'No mock trades executed today.') :
            tradesExecutedToday.map(function(t, idx) {
              var tid = t.ticker + '-' + t.date + '-' + t.type + '-' + t.price;
              return h('div', {
                key: idx,
                onClick: function() { handleSelectForensics(t); },
                style: {
                  padding: 10,
                  borderRadius: 8,
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(139,92,246,0.2)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  hover: { background: 'rgba(139,92,246,0.08)' }
                }
              },
                h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
                  h('span', { className: 'mono', style: { fontSize: 11, fontWeight: 'bold', color: t.type === 'BUY' ? '#6ee7b7' : '#f43f5e' } }, t.type + ' ' + t.ticker),
                  h('span', { style: { fontSize: 8, color: '#5a6472' } }, t.time)
                ),
                h('div', { style: { fontSize: 9.5, color: '#c7e2f7', marginTop: 4, fontFamily: 'JetBrains Mono' } }, f0(t.qty) + ' shares @ ' + S(t.exchange) + f2(t.price)),
                h('div', { style: { fontSize: 8, color: '#8e9aa8', marginTop: 6, fontStyle: 'italic' } }, 'Click to open Forensics')
              );
            })
          )
        ),

        activeTab === 'forensics' && h('div', { style: { height: '100%', display: 'flex' } },
          /* Left Sidebar list of all mock trades */
          h('div', { style: { width: 250, borderRight: '1px solid rgba(139,92,246,0.18)', background: 'rgba(0,0,0,0.15)', padding: 12, overflowY: 'auto' } },
            h('span', { className: 'sec-hd tm', style: { fontSize: 10.5, display: 'block', marginBottom: 12, color: '#a78bfa' } }, 'All Mock Trades'),
            mockTrades.length === 0 ? h('span', { className: 'tf', style: { fontSize: 9.5, color: '#5a6472' } }, 'No mock trades available.') :
            mockTrades.map(function(t) {
              var tid = t.ticker + '-' + t.date + '-' + t.type + '-' + t.price;
              var isCurrent = activeForensicsId === tid;
              var isSaved = !!(tradeMeta[tid] && tradeMeta[tid].entry_reason);
              return h('div', {
                key: tid,
                onClick: function() {
                  localStorage.setItem('bj_active_forensics_id', tid);
                  setActiveForensicsId(tid);
                },
                style: {
                  padding: 8,
                  borderRadius: 6,
                  cursor: 'pointer',
                  background: isCurrent ? 'rgba(139,92,246,0.15)' : 'transparent',
                  border: '1px solid ' + (isCurrent ? 'rgba(139,92,246,0.3)' : 'rgba(255,255,255,0.03)'),
                  marginBottom: 6,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }
              },
                h('div', null,
                  h('span', { className: 'mono', style: { fontWeight: 'bold', fontSize: 10, color: t.type === 'BUY' ? '#6ee7b7' : '#f43f5e', marginRight: 6 } }, t.type),
                  h('span', { className: 'mono', style: { fontWeight: 'bold', fontSize: 10, color: '#c7e2f7' } }, t.ticker),
                  h('div', { style: { fontSize: 8, color: '#5a6472', marginTop: 2 } }, t.date + ' ' + t.time)
                ),
                isSaved && h('span', { style: { color: '#10b981', fontSize: 10 } }, '✓')
              );
            })
          ),
          /* Right Editor Panel */
          h('div', { style: { flex: 1, padding: 20, overflowY: 'auto', background: 'rgba(0,0,0,0.05)' } },
            !activeTrade ? h('div', { style: { height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#5a6472', fontSize: 11 } }, 'Select a trade from the left panel to begin forensics analysis.') :
            h('div', { style: { maxWidth: 650, display: 'flex', flexDirection: 'column', gap: 16 } },
              h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: 10 } },
                h('div', null,
                  h('h3', { style: { margin: 0, fontSize: 14, color: activeTrade.type === 'BUY' ? '#6ee7b7' : '#f43f5e' } }, activeTrade.type + ' ' + activeTrade.ticker),
                  h('span', { style: { fontSize: 9.5, color: '#8e9aa8' } }, activeTrade.date + ' ' + activeTrade.time + ' · ' + f0(activeTrade.qty) + ' shares @ ' + S(activeTrade.exchange) + f2(activeTrade.price))
                ),
                h('div', null,
                  h('span', { style: { fontSize: 8, color: '#5a6472', marginRight: 6 } }, 'PROCESS RATING:'),
                  [1, 2, 3, 4, 5].map(function(star) {
                    return h('span', {
                      key: star,
                      onClick: function() { saveMeta(Object.assign({}, activeMeta, { rating: star })); },
                      style: { cursor: 'pointer', fontSize: 14, color: star <= activeMeta.rating ? '#f59e0b' : '#334155', marginRight: 2 }
                    }, '★');
                  })
                )
              ),

              h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 } },
                h(C.F, { label: 'Setup Type' },
                  h('select', { className: 'inp', value: activeMeta.setup_type, onChange: function(e){ saveMeta(Object.assign({}, activeMeta, { setup_type: e.target.value })); } },
                    h('option', { value: 'trend_follow' }, 'Trend Follow'),
                    h('option', { value: 'reversal' }, 'Reversal'),
                    h('option', { value: 'breakout' }, 'Breakout'),
                    h('option', { value: 'scalp' }, 'Scalp'),
                    h('option', { value: 'news' }, 'News')
                  )
                ),
                h(C.F, { label: 'Emotional State' },
                  h('select', { className: 'inp', value: activeMeta.emotional_state, onChange: function(e){ saveMeta(Object.assign({}, activeMeta, { emotional_state: e.target.value })); } },
                    h('option', { value: 'calm' }, 'Calm'),
                    h('option', { value: 'rushed' }, 'Rushed'),
                    h('option', { value: 'fomo' }, 'FOMO'),
                    h('option', { value: 'revenge' }, 'Revenge'),
                    h('option', { value: 'confident' }, 'Confident')
                  )
                ),
                h(C.F, { label: 'Followed Plan?' },
                  h('select', { className: 'inp', value: activeMeta.followed_plan, onChange: function(e){ saveMeta(Object.assign({}, activeMeta, { followed_plan: e.target.value })); } },
                    h('option', { value: 'yes' }, 'Yes'),
                    h('option', { value: 'partial' }, 'Partial'),
                    h('option', { value: 'no' }, 'No')
                  )
                )
              ),

              h(C.F, { label: 'Entry Reason (Required)' },
                h('textarea', {
                  className: 'inp',
                  rows: 3,
                  value: activeMeta.entry_reason || '',
                  placeholder: 'Describe why you took this trade...',
                  onChange: function(e) { saveMeta(Object.assign({}, activeMeta, { entry_reason: e.target.value })); }
                })
              ),

              h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 } },
                h(C.F, { label: 'What Went Right' },
                  h('textarea', {
                    className: 'inp',
                    rows: 3,
                    value: activeMeta.what_went_right || '',
                    placeholder: 'E.g., executed cleanly, good patient entry...',
                    onChange: function(e) { saveMeta(Object.assign({}, activeMeta, { what_went_right: e.target.value })); }
                  })
                ),
                h(C.F, { label: 'What Went Wrong (Required)' },
                  h('textarea', {
                    className: 'inp',
                    rows: 3,
                    value: activeMeta.what_went_wrong || '',
                    placeholder: 'E.g., moved stop loss, entered too early...',
                    onChange: function(e) { saveMeta(Object.assign({}, activeMeta, { what_went_wrong: e.target.value })); }
                  })
                )
              ),

              h('div', null,
                h('span', { className: 'lbl tm', style: { display: 'block', marginBottom: 6 } }, 'Verdict'),
                h('div', { style: { display: 'flex', gap: 10 } },
                  [
                    { id: 'RIGHT', label: 'RIGHT ✓', color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
                    { id: 'MIXED', label: 'MIXED ~', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
                    { id: 'WRONG', label: 'WRONG ✗', color: '#f43f5e', bg: 'rgba(244,63,94,0.1)' }
                  ].map(function(v) {
                    var isSel = activeMeta.verdict === v.id;
                    return h('button', {
                      key: v.id,
                      onClick: function() { saveMeta(Object.assign({}, activeMeta, { verdict: v.id })); },
                      style: {
                        flex: 1,
                        padding: '8px 0',
                        fontSize: 10,
                        fontWeight: 'bold',
                        borderRadius: 6,
                        cursor: 'pointer',
                        border: '1px solid ' + (isSel ? v.color : 'rgba(255,255,255,0.06)'),
                        background: isSel ? v.bg : 'transparent',
                        color: isSel ? v.color : '#8e9aa8',
                        transition: 'all 0.2s'
                      }
                    }, v.label);
                  })
                )
              ),

              h('div', null,
                h('span', { className: 'lbl tm', style: { display: 'block', marginBottom: 6 } }, 'Lesson Tags'),
                h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6 } },
                  [
                    '#no_sl', '#moved_sl', '#fomo_entry', '#cut_early', '#revenge', '#counter_trend', '#oversized'
                  ].map(function(tag) {
                    var isSelected = activeMeta.lesson_tags && activeMeta.lesson_tags.indexOf(tag) !== -1;
                    return h('button', {
                      key: tag,
                      onClick: function() {
                        var current = activeMeta.lesson_tags ? [].concat(activeMeta.lesson_tags) : [];
                        var idx = current.indexOf(tag);
                        if (idx === -1) current.push(tag);
                        else current.splice(idx, 1);
                        saveMeta(Object.assign({}, activeMeta, { lesson_tags: current }));
                      },
                      style: {
                        padding: '4px 8px',
                        fontSize: 9.5,
                        borderRadius: 99,
                        cursor: 'pointer',
                        border: '1px solid ' + (isSelected ? '#a78bfa' : 'rgba(255,255,255,0.06)'),
                        background: isSelected ? 'rgba(167,139,250,0.15)' : 'transparent',
                        color: isSelected ? '#a78bfa' : '#8e9aa8',
                        transition: 'all 0.1s'
                      }
                    }, tag);
                  })
                )
              )
            )
          )
        ),

        activeTab === 'patterns' && h('div', { style: { height: '100%', overflowY: 'auto', padding: 20 } },
          taggedCount < 5 ? h('div', { style: { height: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 } },
            h('span', { style: { fontSize: 24 } }, '📊'),
            h('span', { className: 'tm', style: { fontSize: 12, fontWeight: 500, color: '#f59e0b' } }, 'Requires minimum 5 tagged trades to generate Pattern Intelligence.'),
            h('span', { className: 'tf', style: { fontSize: 10, color: '#5a6472' } }, 'Current tagged count: ' + taggedCount + ' / 5')
          ) :
          h('div', { style: { maxWidth: 800, display: 'flex', flexDirection: 'column', gap: 24 } },
            h('h3', { style: { margin: 0, fontSize: 13, color: '#a78bfa', letterSpacing: '.05em' } }, 'PATTERN INTELLIGENCE REPORT'),
            
            h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 } },
              /* Setup Win Rates */
              h('div', { style: { background: 'rgba(255,255,255,0.02)', padding: 16, borderRadius: 10, border: '1px solid rgba(255,255,255,0.05)' } },
                h('div', { className: 'tm', style: { fontSize: 9.5, color: '#a78bfa', marginBottom: 12, fontWeight: 700 } }, 'WIN RATE BY SETUP TYPE'),
                Object.keys(patternsMetrics.setups).map(function(k) {
                  var s = patternsMetrics.setups[k];
                  var rate = s.t > 0 ? (s.w / s.t) * 100 : 0;
                  return h('div', { key: k, style: { display: 'grid', gridTemplateColumns: '110px 1fr 80px', alignItems: 'center', gap: 10, marginBottom: 8, fontSize: 10 } },
                    h('span', { style: { color: '#8e9aa8' } }, k.replace('_', ' ').toUpperCase()),
                    h('div', { style: { height: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 4, overflow: 'hidden' } },
                      h('div', { style: { height: '100%', width: rate + '%', background: 'linear-gradient(90deg, #3b82f6, #a78bfa)', borderRadius: 4 } })
                    ),
                    h('span', { className: 'mono', style: { color: '#c7e2f7', fontWeight: 'bold' } }, rate.toFixed(0) + '% (' + s.w + '/' + s.t + ')')
                  );
                })
              ),
              /* Emotional State Win Rates */
              h('div', { style: { background: 'rgba(255,255,255,0.02)', padding: 16, borderRadius: 10, border: '1px solid rgba(255,255,255,0.05)' } },
                h('div', { className: 'tm', style: { fontSize: 9.5, color: '#a78bfa', marginBottom: 12, fontWeight: 700 } }, 'WIN RATE BY EMOTIONAL STATE'),
                Object.keys(patternsMetrics.emotions).map(function(k) {
                  var e = patternsMetrics.emotions[k];
                  var rate = e.t > 0 ? (e.w / e.t) * 100 : 0;
                  return h('div', { key: k, style: { display: 'grid', gridTemplateColumns: '110px 1fr 80px', alignItems: 'center', gap: 10, marginBottom: 8, fontSize: 10 } },
                    h('span', { style: { color: '#8e9aa8' } }, k.toUpperCase()),
                    h('div', { style: { height: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 4, overflow: 'hidden' } },
                      h('div', { style: { height: '100%', width: rate + '%', background: 'linear-gradient(90deg, #10b981, #6ee7b7)', borderRadius: 4 } })
                    ),
                    h('span', { className: 'mono', style: { color: '#c7e2f7', fontWeight: 'bold' } }, rate.toFixed(0) + '% (' + e.w + '/' + e.t + ')')
                  );
                })
              )
            ),

            h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 } },
              /* Time of Day */
              h('div', { style: { background: 'rgba(255,255,255,0.02)', padding: 16, borderRadius: 10, border: '1px solid rgba(255,255,255,0.05)' } },
                h('div', { className: 'tm', style: { fontSize: 9.5, color: '#a78bfa', marginBottom: 12, fontWeight: 700 } }, 'WIN RATE BY TIME OF DAY'),
                Object.keys(patternsMetrics.times).map(function(k) {
                  var s = patternsMetrics.times[k];
                  var rate = s.t > 0 ? (s.w / s.t) * 100 : 0;
                  var lbl = k === 'morning' ? 'Morning (9am-12pm)' : k === 'afternoon' ? 'Afternoon (12pm-4pm)' : 'Night/Other (4pm+)';
                  return h('div', { key: k, style: { display: 'grid', gridTemplateColumns: '120px 1fr 80px', alignItems: 'center', gap: 10, marginBottom: 8, fontSize: 10 } },
                    h('span', { style: { color: '#8e9aa8' } }, lbl),
                    h('div', { style: { height: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 4, overflow: 'hidden' } },
                      h('div', { style: { height: '100%', width: rate + '%', background: 'linear-gradient(90deg, #f59e0b, #fbbf24)', borderRadius: 4 } })
                    ),
                    h('span', { className: 'mono', style: { color: '#c7e2f7', fontWeight: 'bold' } }, rate.toFixed(0) + '% (' + s.w + '/' + s.t + ')')
                  );
                })
              ),
              /* Markets */
              h('div', { style: { background: 'rgba(255,255,255,0.02)', padding: 16, borderRadius: 10, border: '1px solid rgba(255,255,255,0.05)' } },
                h('div', { className: 'tm', style: { fontSize: 9.5, color: '#a78bfa', marginBottom: 12, fontWeight: 700 } }, 'WIN RATE BY MARKET'),
                Object.keys(patternsMetrics.markets).map(function(k) {
                  var m = patternsMetrics.markets[k];
                  var rate = m.t > 0 ? (m.w / m.t) * 100 : 0;
                  return h('div', { key: k, style: { display: 'grid', gridTemplateColumns: '110px 1fr 80px', alignItems: 'center', gap: 10, marginBottom: 8, fontSize: 10 } },
                    h('span', { style: { color: '#8e9aa8' } }, k),
                    h('div', { style: { height: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 4, overflow: 'hidden' } },
                      h('div', { style: { height: '100%', width: rate + '%', background: 'linear-gradient(90deg, #ec4899, #f472b6)', borderRadius: 4 } })
                    ),
                    h('span', { className: 'mono', style: { color: '#c7e2f7', fontWeight: 'bold' } }, rate.toFixed(0) + '% (' + m.w + '/' + m.t + ')')
                  );
                })
              )
            ),

            h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 } },
              /* Avg R:R planned vs actual */
              h('div', { style: { background: 'rgba(255,255,255,0.02)', padding: 16, borderRadius: 10, border: '1px solid rgba(255,255,255,0.05)' } },
                h('div', { className: 'tm', style: { fontSize: 9.5, color: '#a78bfa', marginBottom: 12, fontWeight: 700 } }, 'AVG RISK/REWARD RATIO'),
                h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 } },
                  h('div', null,
                    h('div', { style: { fontSize: 8, color: '#8e9aa8', textTransform: 'uppercase' } }, 'Planned R:R'),
                    h('div', { className: 'mono', style: { fontSize: 16, fontWeight: 'bold', color: '#c7e2f7', marginTop: 4 } }, patternsMetrics.avgPlannedRR > 0 ? patternsMetrics.avgPlannedRR.toFixed(2) : '—')
                  ),
                  h('div', null,
                    h('div', { style: { fontSize: 8, color: '#8e9aa8', textTransform: 'uppercase' } }, 'Actual R:R Realized'),
                    h('div', { className: 'mono', style: { fontSize: 16, fontWeight: 'bold', color: patternsMetrics.avgActualRR >= patternsMetrics.avgPlannedRR ? '#10b981' : '#f43f5e', marginTop: 4 } }, patternsMetrics.avgActualRR !== 0 ? patternsMetrics.avgActualRR.toFixed(2) : '—')
                  )
                )
              ),
              /* Most common tags on losing trades */
              h('div', { style: { background: 'rgba(255,255,255,0.02)', padding: 16, borderRadius: 10, border: '1px solid rgba(255,255,255,0.05)' } },
                h('div', { className: 'tm', style: { fontSize: 9.5, color: '#a78bfa', marginBottom: 12, fontWeight: 700 } }, 'TOP CAUSES OF LOSSES (LESSON TAGS)'),
                patternsMetrics.losingTags.length === 0 ? h('span', { style: { fontSize: 9.5, color: '#5a6472' } }, 'No loss metrics tags logged yet.') :
                h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 8 } },
                  patternsMetrics.losingTags.map(function(item) {
                    return h('div', { key: item.tag, style: { padding: '4px 10px', borderRadius: 99, background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.2)', color: '#f43f5e', fontSize: 9.5, display: 'flex', gap: 6 } },
                      h('span', null, item.tag),
                      h('span', { style: { fontWeight: 'bold' } }, item.count)
                    );
                  })
                )
              )
            )
          )
        ),

        activeTab === 'ai' && h('div', { style: { height: '100%', display: 'flex', flexDirection: 'column', padding: 20, gap: 16 } },
          /* Anthropic API Key input */
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 12, padding: 12, background: 'rgba(255,255,255,0.02)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 } },
            h('span', { className: 'tm', style: { fontSize: 10, color: '#8e9aa8' } }, 'Anthropic API Key:'),
            h('input', {
              type: 'password',
              className: 'inp',
              style: { width: 260, height: 26, fontSize: 10 },
              value: apiKey,
              onChange: function(e) { setApiKey(e.target.value); localStorage.setItem('bj_anthropic_key', e.target.value); },
              placeholder: 'sk-ant-...'
            }),
            h('span', { style: { fontSize: 8.5, color: '#5a6472' } }, 'Stored locally in browser.')
          ),
          /* Actions row */
          h('div', { style: { display: 'flex', gap: 10, flexShrink: 0 } },
            [
              { id: '7days', label: 'Review Last 7 Days' },
              { id: 'all', label: 'Review All Trades' },
              { id: 'positions', label: 'Review Current Positions' }
            ].map(function(btn) {
              return h('button', {
                key: btn.id,
                onClick: function() { triggerAiReview(btn.id); },
                disabled: aiLoading,
                className: 'btn',
                style: {
                  flex: 1,
                  padding: '8px 0',
                  fontSize: 10.5,
                  fontWeight: 600,
                  background: 'rgba(139,92,246,0.1)',
                  border: '1px solid rgba(139,92,246,0.3)',
                  color: '#a78bfa',
                  cursor: 'pointer',
                  opacity: aiLoading ? 0.5 : 1
                }
              }, btn.label);
            })
          ),
          /* Output Box */
          h('div', { style: { flex: 1, minHeight: 0, background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 10, padding: 16, overflowY: 'auto' } },
            aiLoading ? h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, color: '#a78bfa', fontSize: 11 } },
              h('span', { className: 'blink' }, '●'),
              h('span', null, 'Coach Claude is analyzing your performance...')
            ) :
            !aiOutput ? h('div', { style: { height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#5a6472', fontSize: 11 } }, 'Click one of the review options above to receive trading coach feedback.') :
            h('div', { style: { whiteSpace: 'pre-line', fontSize: 11, color: '#c7e2f7', lineHeight: 1.5, fontFamily: 'monospace' } }, aiOutput)
          )
        )
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
          h(C.IcTrend), h('span', { className: "sec-hd tm", style: { fontSize: 11 } }, "STRATEGY QUEUE / AUDIT LOG")
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
