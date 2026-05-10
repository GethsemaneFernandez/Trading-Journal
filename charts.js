(function (window) {
  'use strict';
  var R = window.React;
  var E = window.BasicEngine || {};
  var C = window.BJComponents || {};

  console.log('charts.js initializing...');

  if (!R) { console.error('charts.js: React not found'); return; }

  var h = R.createElement;
  var useState = R.useState;
  var useMemo = R.useMemo;

  var f0 = E.f0; var f2 = E.f2; var f4 = E.f4; var f5 = E.f5;
  var pct = E.pct; var sgn = E.sgn; var G = E.G; var S = E.S;
  var isForex = E.isForex;
  var isCrypto = E.isCrypto;

  /* ── PIE CHART ── */
  function PieChart(props) {
    var data = props.data || [], size = props.size || 180, isDark = props.isDark, title = props.title || '';
    var colorFn = props.colorFn;
    var _h = useState(null); var hov = _h[0]; var setHov = _h[1];
    var total = data.reduce(function (s, d) { return s + Math.abs(d.v); }, 0);

    if (!total) return h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: size, opacity: .3 } },
      h('span', { className: "tm", style: { fontSize: 10 } }, "No data")
    );

    var r = size / 2 - 10, cx = size / 2, cy = size / 2;
    function xy(a, rad) { var rr = a * Math.PI / 180; return [cx + rad * Math.cos(rr), cy + rad * Math.sin(rr)]; }
    var cum = -90;
    var slices = data.map(function (d, i) {
      var color = colorFn ? colorFn(d) : E.PIE_COLORS[i % E.PIE_COLORS.length];
      var angle = (Math.abs(d.v) / total) * 360;
      var sa = cum; cum += angle; var ea = cum - .3;
      var lg = angle > 180 ? 1 : 0;
      var s1 = xy(sa, r); var e1 = xy(ea, r);
      var path = angle >= 359.9
        ? ('M' + cx + ' ' + (cy - r) + ' A' + r + ' ' + r + ' 0 1 1 ' + (cx - .001) + ' ' + (cy - r) + 'Z')
        : ('M' + cx + ' ' + cy + ' L' + s1[0] + ' ' + s1[1] + ' A' + r + ' ' + r + ' 0 ' + lg + ' 1 ' + e1[0] + ' ' + e1[1] + 'Z');
      return { label: d.label, v: d.v, path: path, color: color, pctVal: ((Math.abs(d.v) / total) * 100).toFixed(1) };
    });

    var gradIdBase = 'bj151pie_' + title.replace(/\W/g, '_');

    return h('div', { style: { display: 'flex', gap: 10, alignItems: 'flex-start', width: '100%' } },
      h('div', { style: { flexShrink: 0 } },
        h('svg', { width: size, height: size, viewBox: '0 0 ' + size + ' ' + size, style: { filter: 'drop-shadow(0 4px 14px rgba(0,0,0,.30))' } },
          h('defs', null, slices.map(function (s, i) {
            return h('radialGradient', { key: i, id: gradIdBase + '_' + i, cx: "38%", cy: "28%", r: "72%" },
              h('stop', { offset: "0%", stopColor: s.color, stopOpacity: "1" }),
              h('stop', { offset: "100%", stopColor: s.color, stopOpacity: ".55" })
            );
          })),
          slices.map(function (s, i) {
            var isH = hov === s.label;
            return h('path', { key: i, d: s.path,
              fill: 'url(#' + gradIdBase + '_' + i + ')',
              stroke: isDark ? 'rgba(5,5,5,.6)' : 'rgba(255,255,255,.5)', strokeWidth: "1.5",
              opacity: hov === null || isH ? 1 : .45,
              style: { filter: isH ? 'brightness(1.22) drop-shadow(0 0 8px ' + s.color + ')' : 'none', cursor: 'pointer', transition: 'all .2s' },
              onMouseEnter: function () { setHov(s.label); },
              onMouseLeave: function () { setHov(null); }
            }, h('title', null, s.label + ': ' + s.pctVal + '%'));
          }),
          h('circle', { cx: cx, cy: cy, r: r * .40, fill: "var(--pie-hole)" }),
          h('text', { x: cx, y: cy - 4, textAnchor: "middle", style: { fontSize: 11, fontWeight: 700, fontFamily: 'JetBrains Mono,monospace' }, fill: "var(--pie-txt)" }, data.length),
          h('text', { x: cx, y: cy + 8, textAnchor: "middle", style: { fontSize: 7, fontFamily: 'Inter,sans-serif' }, fill: "var(--pie-txt-sub)" }, title)
        )
      ),
      h('div', { className: "pie-legend scroll", style: { flex: 1, padding: '4px 2px', maxHeight: size, overflow: 'auto' } },
        slices.map(function (s, i) {
          var isH = hov === s.label;
          return h('div', { key: i, className: "pie-legend-row",
            style: { opacity: hov === null || isH ? 1 : .45, transition: 'opacity .15s' },
            onMouseEnter: function () { setHov(s.label); },
            onMouseLeave: function () { setHov(null); }
          },
            h('div', { style: { width: 7, height: 7, borderRadius: 2, background: s.color, flexShrink: 0, boxShadow: '0 0 5px ' + s.color + '66' } }),
            h('span', { className: "mono ts", style: { fontSize: 9.5, fontWeight: 600, flex: 1 } }, s.label),
            h('span', { className: "mono", style: { fontSize: 8.5, color: s.color, fontWeight: 700 } }, s.pctVal + '%')
          );
        })
      )
    );
  }

  /* ── TREND CHART ── */
  function TrendChart(props) {
    var data = props.data || [];
    if (!data.length) return h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: 72, opacity: .28 } },
      h('span', { className: "tm", style: { fontSize: 9 } }, "No trend data yet")
    );
    var vals = data.map(function (d) { return d.value; });
    var maxV = Math.max.apply(null, vals), minV = Math.min.apply(null, vals), range = maxV - minV || 1;
    return h('div', null,
      h('div', { className: "bar-chart-wrap" },
        data.map(function (d, i) {
          var hVal = Math.max(4, ((d.value - minV) / range) * 100);
          var up = i === 0 || d.value >= data[i - 1].value;
          var color = up ? '#94a3b8' : '#475569';
          return h('div', { key: i, className: "bar-chart-bar chart-rise",
            style: { height: hVal + '%', background: 'linear-gradient(0deg,' + color + 'bb,' + color + ')', opacity: 0.8 },
            title: d.label + ': ' + f2(d.value) });
        })
      ),
      h('div', { className: "bar-chart-axis" }),
      h('div', { style: { display: 'flex', justifyContent: 'space-between', marginTop: 3 } },
        h('span', { className: "mono tf", style: { fontSize: 7 } }, data[0] && data[0].label),
        h('span', { className: "mono tf", style: { fontSize: 7 } }, data[data.length - 1] && data[data.length - 1].label)
      )
    );
  }

  /* ── EQUITY CURVE ── */
  function EquityCurve(props) {
    var points = props.points || [], height = props.height || 72, width = props.width || 300;
    if (points.length < 2) return h(C.Empty, { msg: "Not enough data" });
    var mn = Math.min.apply(null, points), mx = Math.max.apply(null, points), rng = mx - mn || 1;
    var pts = points.map(function (v, i) {
      var x = i / (points.length - 1) * width;
      var y = height - ((v - mn) / rng) * (height - 12) - 2;
      return x.toFixed(1) + ',' + y.toFixed(1);
    });
    var polyline = pts.join(' ');
    var fill = pts.join(' ') + ' ' + width + ',' + (height) + ' 0,' + (height);
    var lastVal = points[points.length - 1];
    var color = lastVal >= points[0] ? '#c7e2f7' : '#f43f5e';
    return h('div', { style: { position: 'relative' } },
      h('svg', { width: "100%", height: height, viewBox: '0 0 ' + width + ' ' + height, preserveAspectRatio: "none" },
        h('defs', null,
          h('linearGradient', { id: "eqgrad", x1: "0", y1: "0", x2: "0", y2: "1" },
            h('stop', { offset: "0%", stopColor: color, stopOpacity: "0.3" }),
            h('stop', { offset: "100%", stopColor: color, stopOpacity: "0.02" })
          )
        ),
        h('polygon', { points: fill, fill: "url(#eqgrad)" }),
        h('polyline', { points: polyline, fill: "none", stroke: color, strokeWidth: "1.5", strokeLinejoin: "round" })
      )
    );
  }

  /* ── P&L HEATMAP ── */
  function PnLHeatmap(props) {
    var cashTrailData = props.cashTrailData || [];
    var dayMap = {};
    cashTrailData.forEach(function (d) {
      if (d.kind === 'profit' || d.kind === 'loss') {
        dayMap[d.date] = (dayMap[d.date] || 0) + d.pnl;
      }
    });
    var today = new Date();
    var months = [];
    for (var mi = 11; mi >= 0; mi--) {
      var d = new Date(today.getFullYear(), today.getMonth() - mi, 1);
      months.push({ year: d.getFullYear(), month: d.getMonth() });
    }
    var MONTHS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
    return h('div', { style: { overflowX: 'auto', paddingBottom: 4 } },
      h('div', { style: { display: 'flex', gap: 4, alignItems: 'flex-start' } },
        months.map(function (m, mi) {
          var days = new Date(m.year, m.month + 1, 0).getDate();
          var cells = [];
          for (var di = 1; di <= days; di++) {
            var ds = m.year + '-' + ('0' + (m.month + 1)).slice(-2) + '-' + ('0' + di).slice(-2);
            var pnl = dayMap[ds];
            var col = pnl === undefined ? 'rgba(255,255,255,0.04)' : pnl > 0 ? '#c7e2f7' : pnl < 0 ? '#f43f5e' : '#334155';
            var op = pnl !== undefined ? Math.min(1, Math.abs(pnl) / 5000 * 0.8 + 0.3) : 1;
            cells.push(h('div', { key: di, title: ds + (pnl !== undefined ? ' ₱' + f2(pnl) : ''),
              style: { width: 6, height: 6, borderRadius: 1, background: col, opacity: pnl !== undefined ? op : 1, margin: '0.5px' } }));
          }
          return h('div', { key: mi, style: { display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'center' } },
            h('div', { style: { display: 'flex', flexDirection: 'column', flexWrap: 'wrap', height: 48, gap: '0.5px' } }, cells),
            h('span', { style: { fontSize: 6, color: '#475569', marginTop: 2 } }, MONTHS[m.month])
          );
        })
      )
    );
  }

  /* ── ASSET WEIGHT BAR ── */
  function AssetWeightBar(props) {
    var enriched = props.enriched || [], totalMV = props.totalMV || 0;
    if (!enriched.length || !totalMV) return h('div', { style: { height: 10, background: 'rgba(255,255,255,0.05)', borderRadius: 4 } });
    var groups = { Stocks: 0, Forex: 0, Crypto: 0 };
    enriched.forEach(function (p) {
      if (isForex(p.exchange)) groups.Forex += p.mvPHP || 0;
      else if (isCrypto(p.exchange)) groups.Crypto += p.mvPHP || 0;
      else groups.Stocks += p.mvPHP || 0;
    });
    var items = [
      { label: 'Stocks', val: groups.Stocks, color: '#94a3b8' },
      { label: 'Forex', val: groups.Forex, color: '#64748b' },
      { label: 'Crypto', val: groups.Crypto, color: '#475569' },
    ].filter(function (x) { return x.val > 0; });
    return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
      h('div', { style: { display: 'flex', borderRadius: 4, overflow: 'hidden', height: 10 } },
        items.map(function (x, i) {
          var pctV = x.val / totalMV * 100;
          return h('div', { key: i, title: x.label + ': ' + pctV.toFixed(1) + '%', style: { width: pctV + '%', background: x.color, opacity: 0.85, transition: 'width 0.3s' } });
        })
      ),
      h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
        items.map(function (x, i) {
          var pctV = x.val / totalMV * 100;
          return h('div', { key: i, style: { display: 'flex', alignItems: 'center', gap: 4 } },
            h('div', { style: { width: 6, height: 6, borderRadius: 1, background: x.color } }),
            h('span', { className: "mono", style: { fontSize: 7.5, color: '#64748b' } }, x.label + ' ' + pctV.toFixed(1) + '%')
          );
        })
      )
    );
  }

  /* ── CASH TRAIL CHART ── */
  function CashTrailChart(props) {
    var data = props.data || [], full = props.full;
    if (!data.length) return h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: 90, opacity: .28 } },
      h('span', { className: "tm", style: { fontSize: 9 } }, "No cash events yet — add a deposit or trade")
    );
    var kindMeta = {
      deposit: { icon: '↑', color: '#c7e2f7', label: 'CASH IN', bg: 'rgba(199,226,247,0.08)' },
      withdraw: { icon: '↓', color: '#5a6472', label: 'WITHDRAW', bg: 'rgba(90,100,114,0.08)' },
      buy: { icon: '●', color: '#64748b', label: 'BUY', bg: 'rgba(100,116,139,0.06)' },
      profit: { icon: '▲', color: '#c7e2f7', label: 'SELL WIN', bg: 'rgba(199,226,247,0.07)' },
      loss: { icon: '▼', color: '#f43f5e', label: 'SELL LOSS', bg: 'rgba(244,63,94,0.07)' },
    };
    var lastCash = data.length ? data[data.length - 1].cashAfter : 0;
    var totalDep = data.filter(function (d) { return d.kind === 'deposit'; }).reduce(function (s, d) { return s + d.amount; }, 0);
    var totalPnL = data.filter(function (d) { return d.kind === 'profit' || d.kind === 'loss'; }).reduce(function (s, d) { return s + (d.pnl || 0); }, 0);
    var display = full ? data : data.slice(-4);
    return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
      !full && h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 2 } },
        h('div', { style: { display: 'flex', flexDirection: 'column', gap: 1 } },
          h('span', { className: "tf", style: { fontSize: 6, letterSpacing: '.07em', opacity: 0.5 } }, "DEPOSITED"),
          h('span', { className: "mono", style: { fontSize: 9.5, fontWeight: 700, color: '#c7e2f7' } }, "₱" + f2(totalDep))),
        h('div', { style: { display: 'flex', flexDirection: 'column', gap: 1 } },
          h('span', { className: "tf", style: { fontSize: 6, letterSpacing: '.07em', opacity: 0.5 } }, "REALIZED P&L"),
          h('span', { className: "mono", style: { fontSize: 9.5, fontWeight: 700, color: totalPnL >= 0 ? '#c7e2f7' : '#f43f5e' } }, (totalPnL >= 0 ? '+' : '') + "₱" + f2(totalPnL))),
        h('div', { style: { marginLeft: 'auto', display: 'flex', flexDirection: 'column', gap: 1, textAlign: 'right' } },
          h('span', { className: "tf", style: { fontSize: 6, letterSpacing: '.07em', opacity: 0.5 } }, "AVAIL CASH"),
          h('span', { className: "mono", style: { fontSize: 9.5, fontWeight: 800, color: lastCash >= 0 ? '#c7e2f7' : '#f43f5e' } }, "₱" + f2(lastCash)))
      ),
      h('div', { style: { display: 'flex', flexDirection: 'column', gap: full ? 8 : 5, overflowY: full ? 'auto' : 'visible', maxHeight: full ? 'none' : undefined } },
        display.map(function (ev, i) {
          var m = kindMeta[ev.kind] || kindMeta.deposit;
          return h('div', { key: i, style: { display: 'flex', gap: full ? 10 : 6, alignItems: 'flex-start', background: m.bg, borderRadius: 6, padding: full ? '10px 12px' : '5px 8px', border: '1px solid rgba(255,255,255,0.04)' } },
            h('div', { style: { flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, minWidth: full ? 44 : 30 } },
              h('div', { style: { width: full ? 22 : 16, height: full ? 22 : 16, borderRadius: '50%', background: m.color + '22', border: '1px solid ' + m.color + '44', display: 'flex', alignItems: 'center', justifyContent: 'center', color: m.color, fontSize: full ? 10 : 8, fontWeight: 800 } }, m.icon),
              h('span', { style: { fontSize: full ? 7 : 6, color: m.color, fontWeight: 700, letterSpacing: '.05em' } }, m.label)
            ),
            h('div', { style: { flex: 1, minWidth: 0 } },
              h('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: full ? 4 : 1, gap: 6 } },
                h('span', { className: "mono tf", style: { fontSize: full ? 8.5 : 7, opacity: 0.55 } }, ev.date + (ev.time ? ' · ' + ev.time : '')),
                ev.ticker && h('span', { className: "mono", style: { fontSize: full ? 9 : 7.5, fontWeight: 800, color: '#c7e2f7' } }, ev.ticker)
              ),
              h('div', { className: "tf", style: { fontSize: full ? 10 : 8.5, lineHeight: 1.45, color: 'rgba(255,255,255,0.72)' } }, ev.story),
              full && ev.notes && h('div', { style: { marginTop: 4, fontSize: 8.5, color: 'rgba(255,255,255,0.35)', fontStyle: 'italic' } }, ev.notes)
            ),
            ev.cashAfter !== undefined && h('div', { style: { flexShrink: 0, textAlign: 'right' } },
              h('div', { style: { fontSize: full ? 7 : 6, opacity: 0.45, marginBottom: 2 } }, "CASH"),
              h('div', { className: "mono", style: { fontSize: full ? 10 : 8, fontWeight: 800, color: ev.cashAfter >= 0 ? '#64748b' : '#f43f5e' } }, "₱" + f2(ev.cashAfter))
            )
          );
        }),
        !full && data.length > 4 && h('div', { style: { textAlign: 'center', fontSize: 7.5, opacity: 0.4, paddingTop: 2 } }, "+" + (data.length - 4) + " more events — open fullscreen for complete ledger")
      )
    );
  }

  /* ── ANALYTICS ROW ── */
  function AnalyticsRow(props) {
    var pieData = props.pieData || [], pnlData = props.pnlData || [], trendData = props.trendData || [];
    var cashTrailData = props.cashTrailData || [], enriched = props.enriched || [], advMetrics = props.advMetrics;
    var isDark = props.isDark, compact = props.compact;
    var sz = compact ? 110 : 155;
    var totalMV = enriched.reduce(function (s, p) { return s + (p.mvPHP || 0); }, 0);

    return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 16 } },
      h('div', { className: "analytics-row", style: { gap: compact ? 8 : 16, gridTemplateColumns: 'repeat(4, 1fr)' } },
        h('div', { className: "chart-cell" },
          h('div', { className: "sec-hd tm", style: { marginBottom: 7, display: 'flex', alignItems: 'center', gap: 4 } }, h('span', { style: { color: '#94a3b8' } }, "◆"), " Allocation"),
          h(PieChart, { data: pieData, size: sz, isDark: isDark, title: "Cost" })
        ),
        h('div', { className: "chart-cell" },
          h('div', { className: "sec-hd tm", style: { marginBottom: 7, display: 'flex', alignItems: 'center', gap: 4 } }, h('span', { style: { color: '#64748b' } }, "◆"), " P&L Dist"),
          h(PieChart, { data: pnlData, size: sz, isDark: isDark, title: "P&L", colorFn: function (d) { return d.color || '#475569'; } })
        ),
        h('div', { className: "chart-cell" },
          h('div', { className: "sec-hd tm", style: { marginBottom: 7, display: 'flex', alignItems: 'center', gap: 4 } }, h(C.IcTrend), " Equity Curve"),
          h(EquityCurve, { points: advMetrics ? advMetrics.equityPoints : [], height: sz * 0.5, width: sz * 1.5 }),
          h('div', { style: { marginTop: 8 } }, h(TrendChart, { data: trendData, isDark: isDark }))
        ),
        h('div', { className: "chart-cell" },
          h('div', { className: "sec-hd tm", style: { marginBottom: 7, display: 'flex', alignItems: 'center', gap: 4 } }, h('span', { style: { color: '#94a3b8' } }, "⬡"), " P&L Heatmap"),
          h(PnLHeatmap, { cashTrailData: cashTrailData }),
          h('div', { style: { marginTop: 8 } }, h(AssetWeightBar, { enriched: enriched, totalMV: totalMV }))
        )
      )
    );
  }

  /* ── EXPOSE ── */
  window.BJCharts = {
    PieChart: PieChart,
    TrendChart: TrendChart,
    EquityCurve: EquityCurve,
    PnLHeatmap: PnLHeatmap,
    AssetWeightBar: AssetWeightBar,
    CashTrailChart: CashTrailChart,
    AnalyticsRow: AnalyticsRow
  };
})(window);
