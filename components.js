(function (window) {
  'use strict';
  var R = window.React;
  var E = window.BasicEngine || {};

  console.log('components.js initializing...');

  if (!R) { console.error('components.js: React not found'); return; }

  var h = R.createElement;
  var useState = R.useState;
  var useEffect = R.useEffect;
  var useCallback = R.useCallback;
  var useMemo = R.useMemo;
  var useRef = R.useRef;

  var f0 = E.f0; var f2 = E.f2; var f4 = E.f4; var f5 = E.f5;
  var pct = E.pct; var sgn = E.sgn; var G = E.G; var S = E.S;

  /* ── ICONS ── */
  var IcSun = function () { return h('svg', { width: "13", height: "13", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2" }, h('circle', { cx: "12", cy: "12", r: "5" }), h('line', { x1: "12", y1: "1", x2: "12", y2: "3" }), h('line', { x1: "12", y1: "21", x2: "12", y2: "23" }), h('line', { x1: "4.22", y1: "4.22", x2: "5.64", y2: "5.64" }), h('line', { x1: "18.36", y1: "18.36", x2: "19.78", y2: "19.78" }), h('line', { x1: "1", y1: "12", x2: "3", y2: "12" }), h('line', { x1: "21", y1: "12", x2: "23", y2: "12" }), h('line', { x1: "4.22", y1: "19.78", x2: "5.64", y2: "18.36" }), h('line', { x1: "18.36", y1: "5.64", x2: "19.78", y2: "4.22" })); };
  var IcMoon = function () { return h('svg', { width: "13", height: "13", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2" }, h('path', { d: "M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" })); };
  var IcEye = function () { return h('svg', { width: "13", height: "13", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2" }, h('path', { d: "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" }), h('circle', { cx: "12", cy: "12", r: "3" })); };
  var IcEyeOff = function () { return h('svg', { width: "13", height: "13", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2" }, h('path', { d: "M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" }), h('line', { x1: "1", y1: "1", x2: "23", y2: "23" })); };
  var IcAlert = function () { return h('svg', { width: "12", height: "12", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2.5", style: { color: 'var(--rose)' } }, h('circle', { cx: "12", cy: "12", r: "10" }), h('line', { x1: "12", y1: "8", x2: "12", y2: "12" }), h('line', { x1: "12", y1: "16", x2: "12.01", y2: "16" })); };
  var IcChevD = function () { return h('svg', { width: "9", height: "9", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2.5" }, h('polyline', { points: "6 9 12 15 18 9" })); };
  var IcChevU = function () { return h('svg', { width: "9", height: "9", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2.5" }, h('polyline', { points: "18 15 12 9 6 15" })); };
  var IcX = function () { return h('svg', { width: "9", height: "9", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "3" }, h('line', { x1: "18", y1: "6", x2: "6", y2: "18" }), h('line', { x1: "6", y1: "6", x2: "18", y2: "18" })); };
  var IcPlus = function () { return h('svg', { width: "10", height: "10", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2.5" }, h('line', { x1: "12", y1: "5", x2: "12", y2: "19" }), h('line', { x1: "5", y1: "12", x2: "19", y2: "12" })); };
  var IcTrash = function () { return h('svg', { width: "10", height: "10", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2" }, h('polyline', { points: "3 6 5 6 21 6" }), h('path', { d: "M19 6l-1 14H6L5 6" }), h('path', { d: "M10 11v6M14 11v6" }), h('path', { d: "M9 6V4h6v2" })); };
  var IcShield = function () { return h('svg', { width: "11", height: "11", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2" }, h('path', { d: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" })); };
  var IcTrend = function () { return h('svg', { width: "11", height: "11", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2" }, h('polyline', { points: "22 7 13.5 15.5 8.5 10.5 2 17" }), h('polyline', { points: "16 7 22 7 22 13" })); };
  var IcRefresh = function () { return h('svg', { width: "11", height: "11", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2" }, h('polyline', { points: "23 4 23 10 17 10" }), h('path', { d: "M20.49 15a9 9 0 1 1-2.12-9.36L23 10" })); };
  var IcFlask = function () { return h('svg', { width: "11", height: "11", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2" }, h('path', { d: "M9 3h6M9 3v8L4 20h16l-5-9V3M9 3H7M15 3h2" })); };
  var IcLock = function () { return h('svg', { width: "10", height: "10", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2" }, h('rect', { x: "3", y: "11", width: "18", height: "11", rx: "2", ry: "2" }), h('path', { d: "M7 11V7a5 5 0 0110 0v4" })); };
  var IcSettings = function () { return h('svg', { width: "13", height: "13", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", style: { pointerEvents: 'none' } }, h('circle', { cx: "12", cy: "12", r: "3" }), h('path', { d: "M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1-1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" })); };
  var IcMin = function () { return h('svg', { width: "11", height: "11", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", style: { pointerEvents: 'none' } }, h('line', { x1: "5", y1: "12", x2: "19", y2: "12" })); };
  var IcMax = function () { return h('svg', { width: "10", height: "10", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", style: { pointerEvents: 'none' } }, h('rect', { x: "3", y: "3", width: "18", height: "18", rx: "2", ry: "2" })); };

  /* ── MICRO HELPERS ── */
  function N(props) {
    var v = props.v, priv = props.priv, style = props.style, cls = props.cls;
    return h('span', { className: 'mono' + (priv ? ' priv' : '') + ' ' + (cls || ''), style: style }, v);
  }
  function F(props) {
    var label = props.label, children = props.children, lStyle = props.lStyle;
    return h('div', null, h('label', { className: "lbl tm", style: lStyle }, label), children);
  }
  function Empty(props) {
    return h('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '30px 0', gap: 8 } },
      h('div', { className: "tf", style: { fontSize: 22 } }, "◎"),
      h('div', { className: "tm", style: { fontSize: 12, fontWeight: 500 } }, props.msg),
      props.sub && h('div', { className: "tf", style: { fontSize: 11 } }, props.sub)
    );
  }

  /* ── TOASTS ── */
  function useToasts() {
    var _s = useState([]); var list = _s[0]; var setList = _s[1];
    var add = useCallback(function (msg, type) {
      type = type || 'ok';
      var id = Date.now() + Math.random();
      setList(function (p) { return p.concat([{ id: id, msg: msg, type: type, out: false }]); });
      setTimeout(function () { setList(function (p) { return p.map(function (t) { return t.id === id ? Object.assign({}, t, { out: true }) : t; }); }); }, 3200);
      setTimeout(function () { setList(function (p) { return p.filter(function (t) { return t.id !== id; }); }); }, 3500);
    }, []);
    return [list, add];
  }
  function Toasts(props) {
    var bg = {
      ok: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
      err: 'linear-gradient(135deg, #be123c 0%, #f43f5e 100%)',
      info: 'linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%)',
      warn: 'linear-gradient(135deg, #b45309 0%, #f59e0b 100%)'
    };
    return h('div', { style: { position: 'fixed', top: 62, right: 14, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 10, pointerEvents: 'none' } },
      props.list.map(function (t) {
        return h('div', { key: t.id, className: t.out ? 'tOut' : 'tIn',
          style: {
            background: bg[t.type] || bg.info,
            borderRadius: '1rem',
            padding: '12px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            minWidth: 240,
            maxWidth: 400,
            boxShadow: '0 20px 50px rgba(0,0,0,0.6), inset 0 1px 1px rgba(255,255,255,0.3)',
            border: '1px solid rgba(255,255,255,0.2)',
            backdropFilter: 'blur(10px)',
            transform: 'translateZ(0)'
          }
        },
          h('div', { style: { width: 8, height: 8, borderRadius: '50%', background: '#fff', flexShrink: 0, boxShadow: '0 0 15px #fff' } }),
          h('div', { style: { display: 'flex', flexDirection: 'column', gap: 1 } },
            h('div', { style: { fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.7)' } }, t.type),
            h('div', { style: { fontSize: 13, fontWeight: 700, color: '#fff', lineHeight: 1.2, letterSpacing: '-0.01em' } }, t.msg)
          )
        );
      })
    );
  }

  /* ── SPLIT PANES ── */
  function SplitPane(props) {
    var left = props.left, right = props.right;
    var min = props.minLeft || 22, max = props.maxLeft || 72, def = props.defaultSplit || 38;
    var sk = props.storageKey || '__bj151sp';
    var _s = useState(function () { var v = parseFloat(localStorage.getItem(sk)); return (v >= min && v <= max) ? v : def; });
    var split = _s[0]; var setSplit = _s[1];
    var dragging = useRef(false); var cRef = useRef(null);
    var _d = useState(false); var isDrg = _d[0]; var setIsDrg = _d[1];
    useEffect(function () {
      function mv(e) {
        if (!dragging.current || !cRef.current) return;
        var rect = cRef.current.getBoundingClientRect();
        var ns = Math.min(max, Math.max(min, ((e.clientX - rect.left) / rect.width) * 100));
        setSplit(ns); localStorage.setItem(sk, ns);
      }
      function up() { dragging.current = false; setIsDrg(false); document.body.style.cursor = ''; document.body.style.userSelect = ''; }
      document.addEventListener('mousemove', mv);
      document.addEventListener('mouseup', up);
      return function () { document.removeEventListener('mousemove', mv); document.removeEventListener('mouseup', up); };
    }, [min, max, sk]);
    function down(e) { dragging.current = true; setIsDrg(true); document.body.style.cursor = 'col-resize'; document.body.style.userSelect = 'none'; e.preventDefault(); }
    return h('div', { ref: cRef, style: { display: 'flex', height: '100%', width: '100%', overflow: 'hidden' } },
      h('div', { style: { width: split + '%', overflow: 'hidden', display: 'flex', flexDirection: 'column', flexShrink: 0 } }, left),
      h('div', { className: 'drag-h' + (isDrg ? ' dragging' : ''), onMouseDown: down }),
      h('div', { style: { flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' } }, right)
    );
  }
  function VSplitPane(props) {
    var top = props.top, bottom = props.bottom;
    var min = props.minTop || 10, max = props.maxTop || 90, def = props.defaultSplit || 40;
    var sk = props.storageKey || '__bj151vsp';
    var _s = useState(function () { var v = parseFloat(localStorage.getItem(sk)); return (v >= min && v <= max) ? v : def; });
    var split = _s[0]; var setSplit = _s[1];
    var dragging = useRef(false); var cRef = useRef(null);
    var _d = useState(false); var isDrg = _d[0]; var setIsDrg = _d[1];
    useEffect(function () {
      function mv(e) {
        if (!dragging.current || !cRef.current) return;
        var rect = cRef.current.getBoundingClientRect();
        var ns = Math.min(max, Math.max(min, ((e.clientY - rect.top) / rect.height) * 100));
        setSplit(ns); localStorage.setItem(sk, ns);
      }
      function up() { dragging.current = false; setIsDrg(false); document.body.style.cursor = ''; document.body.style.userSelect = ''; }
      document.addEventListener('mousemove', mv);
      document.addEventListener('mouseup', up);
      return function () { document.removeEventListener('mousemove', mv); document.removeEventListener('mouseup', up); };
    }, [min, max, sk]);
    function down(e) { dragging.current = true; setIsDrg(true); document.body.style.cursor = 'row-resize'; document.body.style.userSelect = 'none'; e.preventDefault(); }
    return h('div', { ref: cRef, style: { display: 'flex', flexDirection: 'column', height: '100%', width: '100%', overflow: 'hidden' } },
      h('div', { style: { height: split + '%', overflow: 'hidden', display: 'flex', flexDirection: 'column', flexShrink: 0 } }, top),
      h('div', { className: 'drag-v' + (isDrg ? ' dragging' : ''), onMouseDown: down }),
      h('div', { style: { flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' } }, bottom)
    );
  }

  /* ── RECOVERY BAR ── */
  function RecoveryBar(props) {
    var rcvPct = props.rcvPct || 0, isDark = props.isDark;
    var c = Math.min(rcvPct, 100); var isSov = rcvPct >= 100;
    var barColor = isSov ? '#fbbf24' : rcvPct >= 60 ? '#c7e2f7' : rcvPct >= 30 ? '#3b82f6' : '#8b5cf6';
    return h('div', { style: { minWidth: 58 } },
      h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 } },
        h('span', { className: isSov ? 'mono sov-ticker gold-glow' : 'mono ts',
          style: { fontSize: 8, fontWeight: 700, color: isSov ? '#fbbf24' : barColor, textShadow: isDark && !isSov ? '0 0 5px ' + barColor + '88' : 'none' } },
          rcvPct.toFixed(0) + '%'
        ),
        isSov && h('span', { style: { fontSize: 9, lineHeight: 1 }, title: "Sovereign" }, "👑")
      ),
      h('div', { className: "rcv-track", style: { height: 3 } },
        h('div', { className: "rcv-bar", style: { width: c + '%', background: barColor, boxShadow: isDark ? '0 0 4px ' + barColor + '77' : 'none' } })
      )
    );
  }

  /* ── TICKER DROPDOWN ── */
  function TickerDropdown(props) {
    var exchange = props.exchange, tickers = props.tickers, value = props.value;
    var onChange = props.onChange, onDelete = props.onDelete, onAdd = props.onAdd;
    var forceList = props.forceList;
    var _o = useState(false); var open = _o[0]; var setOpen = _o[1];
    var _q = useState(''); var query = _q[0]; var setQuery = _q[1];
    var wRef = useRef(null); var sRef = useRef(null);
    useEffect(function () {
      function hEv(e) { if (wRef.current && !wRef.current.contains(e.target)) setOpen(false); }
      document.addEventListener('mousedown', hEv);
      return function () { document.removeEventListener('mousedown', hEv); };
    }, []);
    useEffect(function () { if (open && sRef.current) sRef.current.focus(); }, [open]);

    var baseList = forceList || tickers || [];
    var qUp = query.toUpperCase().trim();
    var filtered = useMemo(function () {
      return qUp ? baseList.filter(function (t) { return t.toUpperCase().includes(qUp); }) : baseList;
    }, [baseList, qUp]);
    var isNew = !forceList && qUp && !baseList.map(function (t) { return t.toUpperCase(); }).includes(qUp);

    function pick(tk) { onChange(tk); setOpen(false); setQuery(''); }
    function handleAdd() { var tk = qUp; if (!tk) return; onAdd(exchange, tk); pick(tk); }

    return h('div', { className: "dk-wrap", ref: wRef },
      h('button', { className: "inp dk-trigger", type: "button", onClick: function () { setOpen(function (o) { return !o; }); },
        style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 } },
        h('span', { className: value ? 'tp' : 'tm', style: { fontFamily: 'JetBrains Mono,monospace', fontSize: 'var(--fz-sm)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' } },
          value || 'Search or type new…'
        ),
        h('span', { className: "tf", style: { flexShrink: 0 } }, open ? h(IcChevU) : h(IcChevD))
      ),
      open && h('div', { className: "dropdown-list fu" },
        h('input', { ref: sRef, className: "dk-search", type: "text",
          placeholder: forceList ? 'Filter positions…' : 'Search or type new ticker…',
          value: query, onChange: function (e) { setQuery(e.target.value); },
          onKeyDown: function (e) { if (e.key === 'Enter' && isNew) handleAdd(); if (e.key === 'Escape') setOpen(false); } }),
        h('div', { className: "dk-items" },
          isNew && h('div', { className: "dk-item", onClick: handleAdd, style: { color: '#f59e0b', fontStyle: 'italic' } }, h('span', null, '＋ Add "' + qUp + '"')),
          filtered.length === 0 && !isNew && h('div', { className: "dk-hd", style: { padding: '10px 10px' } }, "No matches"),
          filtered.map(function (tk) {
            return h('div', { key: tk, className: "dk-item" },
              h('span', { style: { flex: 1 }, onClick: function () { pick(tk); } }, tk),
              !forceList && h('button', { className: "dk-del", onClick: function (e) { e.stopPropagation(); onDelete(exchange, tk); if (value === tk) onChange(''); } }, h(IcX))
            );
          })
        )
      )
    );
  }

  /* ── RISK CARD ── */
  function RiskCard(props) {
    var enriched = props.enriched || [], totalMVPHP = props.totalMVPHP, totalEqPHP = props.totalEqPHP, cashPHP = props.cashPHP, isDark = props.isDark;
    var risk = E.getRiskMetrics ? E.getRiskMetrics(enriched, totalMVPHP) : { topConc: { ticker: '—', share: 0 } };
    var top = risk.topConc;
    var mktExp = totalEqPHP > 0 ? (totalMVPHP / totalEqPHP) * 100 : 0;
    var cashPct = totalEqPHP > 0 ? (cashPHP / totalEqPHP) * 100 : 0;
    var concLevel = top.share > 50 ? 'CRITICAL' : top.share > 30 ? 'HIGH' : top.share > 20 ? 'MODERATE' : 'LOW';
    var concCls = top.share > 30 ? 'risk-warn' : top.share > 20 ? 'risk-amber' : 'risk-ok';
    var concColor = top.share > 50 ? '#5a6472' : top.share > 30 ? '#5a6472' : top.share > 20 ? '#f59e0b' : '#c7e2f7';
    var n = enriched.length;
    var volS = n === 0 ? 'NO DATA' : n <= 2 ? 'LOW' : n <= 5 ? 'MODERATE' : 'DIVERSIFIED';
    var volCls = n <= 2 ? 'risk-amber' : 'risk-ok';
    var volColor = n <= 2 ? '#f59e0b' : '#c7e2f7';
    return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
      h('div', { className: "tm", style: { fontSize: 7.5, letterSpacing: '.10em', textTransform: 'uppercase', marginBottom: 2, display: 'flex', alignItems: 'center', gap: 4 } },
        h(IcShield), " Risk Summary"
      ),
      h('div', { className: concCls, style: { padding: '7px 10px' } },
        h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 } },
          h('span', { className: "tf", style: { fontSize: 7.5, letterSpacing: '.07em', textTransform: 'uppercase' } }, "Concentration"),
          h('span', { style: { fontSize: 8.5, fontWeight: 700, color: concColor, fontFamily: 'JetBrains Mono,monospace', letterSpacing: '.06em' } }, concLevel)
        ),
        top.ticker !== '—' && h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
          h('span', { className: "mono ts", style: { fontSize: 10.5, fontWeight: 600 } }, top.ticker),
          h(N, { v: pct(top.share), style: { fontSize: 12, fontWeight: 700, color: concColor, textShadow: isDark ? '0 0 8px ' + concColor + '55' : 'none' } })
        ),
        top.share > 30 && h('div', { className: "blink-red", style: { fontSize: 9.5, color: '#f43f5e', marginTop: 3, display: 'flex', alignItems: 'center', gap: 4, fontWeight: 700 } }, h(IcAlert), " CONCENTRATION RISK: " + top.ticker + " exceeds 30% threshold")
      ),
      h('div', { className: "inset", style: { padding: '7px 10px' } },
        h('div', { className: "tf", style: { fontSize: 7.5, letterSpacing: '.07em', textTransform: 'uppercase', marginBottom: 5 } }, "Market Exposure"),
        h('div', { style: { display: 'flex', gap: 8, marginBottom: 5 } },
          h('div', { style: { flex: 1 } }, h('div', { className: "tf", style: { fontSize: 7, marginBottom: 1 } }, "Invested"), h(N, { v: pct(mktExp), style: { fontSize: 13, fontWeight: 700, color: '#3b82f6', fontFamily: 'JetBrains Mono,monospace', textShadow: isDark ? '0 0 10px rgba(59,130,246,.4)' : 'none' } })),
          h('div', { style: { flex: 1 } }, h('div', { className: "tf", style: { fontSize: 7, marginBottom: 1 } }, "Cash"), h(N, { v: pct(cashPct), style: { fontSize: 13, fontWeight: 700, color: '#c7e2f7', fontFamily: 'JetBrains Mono,monospace', textShadow: isDark ? '0 0 10px rgba(16,185,129,.4)' : 'none' } }))
        ),
        h('div', { className: "abar", style: { height: 5 } }, h('div', { className: "abar-f", style: { width: pct(Math.min(mktExp, 100)), background: 'linear-gradient(90deg,#3b82f6,#8b5cf6)', height: '100%', borderRadius: 99 } }))
      ),
      h('div', { className: volCls, style: { padding: '7px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
        h('div', null,
          h('div', { className: "tf", style: { fontSize: 7.5, letterSpacing: '.07em', textTransform: 'uppercase', marginBottom: 2 } }, "Volatility"),
          h('span', { style: { fontSize: 11, fontWeight: 700, color: volColor, fontFamily: 'JetBrains Mono,monospace', letterSpacing: '.06em' } }, volS)
        ),
        h('div', { style: { textAlign: 'right' } },
          h('div', { className: "tf", style: { fontSize: 7.5, letterSpacing: '.07em', textTransform: 'uppercase', marginBottom: 2 } }, "Positions"),
          h(N, { v: String(n), style: { fontSize: 17, fontWeight: 700, color: 'rgba(255,255,255,.7)', fontFamily: 'JetBrains Mono,monospace' } })
        )
      )
    );
  }

  /* ── POSITIONS TABLE ── */
  function PositionsTable(props) {
    var enriched = props.enriched || [], totalMVPHP = props.totalMVPHP || 0;
    var mktPx = props.mktPx || {}, setMktPx = props.setMktPx;
    var quickSell = props.quickSell, priv = props.priv, isDark = props.isDark;
    var _exp = useState({}); var exp = _exp[0]; var setExp = _exp[1];
    function toggle(tk) { setExp(function (p) { var n = Object.assign({}, p); n[tk] = !n[tk]; return n; }); }

    if (!enriched.length) return h('div', { className: "glass", style: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' } },
      h(Empty, { msg: "No active positions", sub: "Execute a BUY order to begin" })
    );

    return h('div', { className: "glass fu scroll", style: { flex: 1, overflow: 'auto' } },
      h('table', { className: "tbl" },
        h('thead', null, h('tr', null,
          h('th', { className: "th" }), h('th', { className: "th" }, "Ticker"), h('th', { className: "th" }, "Qty"),
          h('th', { className: "th" }, "Avg Entry"), h('th', { className: "th" }, "Market Px"),
          h('th', { className: "th" }, "Mkt Value"), h('th', { className: "th" }, "Unreal. P&L"),
          h('th', { className: "th" }, "Alloc"), h('th', { className: "th" }, "Recovery"),
          h('th', { className: "th" }, "Breakeven"), h('th', { className: "th" }, "⚡")
        )),
        h('tbody', null,
          enriched.map(function (p) {
            var isSov = p.totalCostNative <= 0;
            var sym = S(p.exchange);
            var allocPct = totalMVPHP > 0 ? (p.mvPHP / totalMVPHP) * 100 : 0;
            var rcvPct = p.initialCostPHP > 0 ? ((p.initialCostPHP - p.totalCostPHP) / p.initialCostPHP) * 100 : 0;
            var isF = E.isForex(p.exchange);
            var isTP = p.takeProfit > 0 && p.mp >= p.takeProfit;
            var rowCls = 'tr-h tdb' + (isTP ? ' gold-pulse' : '');
            return h(R.Fragment, { key: p.ticker },
              h('tr', { className: rowCls, style: { cursor: 'pointer' }, onClick: function () { toggle(p.ticker); } },
                h('td', { className: "td", style: { width: 18 } }, h('span', { className: "tf", style: { fontSize: 8.5 } }, exp[p.ticker] ? '▾' : '▸')),
                h('td', { className: "td" },
                  h('div', { style: { display: 'flex', alignItems: 'center', gap: 5 } },
                    h('span', { className: isSov ? 'mono sov-ticker gold-glow' : 'mono tp', style: { fontSize: 12, fontWeight: 700 } }, p.ticker),
                    h('span', { className: "mono tf", style: { fontSize: 7.5 } }, p.exchange),
                    isF && h('span', { className: "tag tag-sim", style: { fontSize: 7 } }, "FX")
                  )
                ),
                h('td', { className: "td" }, h(N, { v: f0(p.qty), priv: priv, cls: "ts", style: { fontSize: 10.5 } })),
                h('td', { className: "td" }, h(N, { v: sym + (isF ? f5(p.avgNative) : f4(p.avgNative)), priv: priv, cls: "tm", style: { fontSize: 10 } })),
                h('td', { className: "td", onClick: function (e) { e.stopPropagation(); }, style: { position: 'relative' } },
                  h('div', { style: { display: 'flex', alignItems: 'center', gap: 6 } },
                    h('div', { style: { position: 'relative' } },
                      h('input', { className: "mp-inp", type: "number", step: "0.00001", value: mktPx[p.ticker] || '',
                        placeholder: isF ? f5(p.avgNative) : f4(p.avgNative),
                        onChange: function (e) { var v = e.target.value; setMktPx(function (prev) { var n = Object.assign({}, prev); n[p.ticker] = v; return n; }); },
                        style: mktPx[p.ticker] ? { borderColor: '#f59e0b', color: '#fbbf24' } : {}
                      }),
                      !mktPx[p.ticker] && h('div', { className: "blink", style: { position: 'absolute', top: -2, right: -2, width: 6, height: 6, borderRadius: '50%', background: '#c7e2f7', boxShadow: '0 0 8px #c7e2f7' }, title: "Live Market Feed" })
                    ),
                    !mktPx[p.ticker] && h('span', { className: "mono", style: { fontSize: 7, color: '#c7e2f7', fontWeight: 800, letterSpacing: '.05em' } }, "LIVE"),
                    mktPx[p.ticker] && h('span', { className: "mono", style: { fontSize: 7, color: '#f59e0b', fontWeight: 800 } }, "LOCK")
                  )
                ),
                h('td', { className: "td" }, h(N, { v: '₱' + f2(p.mvPHP), priv: priv, cls: "ts", style: { fontSize: 10 } })),
                h('td', { className: "td" },
                  h('div', null,
                    h(N, { v: sgn(p.uplPHP) + '₱' + f2(Math.abs(p.uplPHP)), priv: priv,
                      style: { fontSize: 10.5, fontWeight: 700, color: G(p.uplPHP), textShadow: isDark ? '0 0 7px ' + G(p.uplPHP) + '44' : 'none' } }),
                    h('div', { className: "mono tf", style: { fontSize: 7.5, marginTop: 1 } }, sgn(p.uplP) + pct(p.uplP))
                  )
                ),
                h('td', { className: "td" },
                  h('div', { style: { minWidth: 52 } },
                    h('div', { className: "mono ts", style: { fontSize: 10, fontWeight: 600 } }, pct(allocPct)),
                    h('div', { className: "abar", style: { marginTop: 3, height: 3 } },
                      h('div', { className: "abar-f", style: { width: pct(Math.min(allocPct, 100)), background: E.PIE_COLORS[enriched.indexOf(p) % E.PIE_COLORS.length], height: '100%', borderRadius: 99 } })
                    )
                  )
                ),
                h('td', { className: "td" }, isF ? h('span', { className: "tf", style: { fontSize: 8.5 } }, "N/A") : h(RecoveryBar, { rcvPct: rcvPct, isDark: isDark })),
                h('td', { className: "td" }, h(N, { v: sym + (isF ? f5(p.beven) : f4(p.beven)), priv: priv, style: { color: '#f59e0b', fontSize: 10 } })),
                h('td', { className: "td", onClick: function (e) { e.stopPropagation(); } },
                  h('button', { onClick: function () { quickSell(p); }, className: "btn btn-sell", style: { padding: '2px 8px', fontSize: 8.5 } }, "Sell")
                )
              ),
              exp[p.ticker] && p.lots && p.lots.map(function (lot, li) {
                return h('tr', { key: li, className: "lot-row lot-in" },
                  h('td', { className: "td", colSpan: 2, style: { paddingLeft: 26 } },
                    h('span', { className: 'tag tag-' + lot.type.toLowerCase(), style: { fontSize: 7 } }, lot.type),
                    h('span', { className: "mono tf", style: { fontSize: 8.5, marginLeft: 5 } }, lot.date || '')
                  ),
                  h('td', { className: "td" }, h(N, { v: f0(lot.qty), priv: priv, cls: "tf", style: { fontSize: 9 } })),
                  h('td', { className: "td" }, h(N, { v: sym + (isF ? f5(lot.price) : f4(lot.price)), priv: priv, cls: "tf", style: { fontSize: 9 } })),
                  h('td', { className: "td", colSpan: 2 }, h(N, { v: sym + f4(lot.fee || 0), priv: priv, style: { color: '#f59e0b', fontSize: 9 } })),
                  h('td', { className: "td", colSpan: 2 },
                    lot.type === 'SELL' && lot.realizedPnLPHP != null &&
                      h(N, { v: sgn(lot.realizedPnLPHP) + '₱' + f2(Math.abs(lot.realizedPnLPHP)), priv: priv,
                        style: { color: G(lot.realizedPnLPHP), fontSize: 9, fontWeight: 700 } })
                  ),
                  h('td', { className: "td", colSpan: 3 })
                );
              })
            );
          })
        )
      )
    );
  }

  /* ── TRADE FORM ── */
  function TradeForm(props) {
    var enriched = props.enriched || [], psiFee = props.psiFee, fxRate = props.fxRate;
    var tickerLists = props.tickerLists || {}, mktPx = props.mktPx || {};
    var onExec = props.onExec, addTicker = props.addTicker, deleteTicker = props.deleteTicker;
    var isDark = props.isDark, priv = props.priv, isMock = props.isMock;

    var _side = useState('BUY'); var side = _side[0]; var setSide = _side[1];
    var _ex = useState('PSE'); var ex = _ex[0]; var setEx = _ex[1];
    var _tk = useState(''); var tk = _tk[0]; var setTk = _tk[1];
    var _px = useState(''); var px = _px[0]; var setPx = _px[1];
    var _qty = useState(''); var qty = _qty[0]; var setQty = _qty[1];
    var _date = useState(function () { return new Date().toISOString().slice(0, 10); }); var date = _date[0]; var setDate = _date[1];
    var _time = useState(function () { return new Date().toTimeString().slice(0, 5); }); var time = _time[0]; var setTime = _time[1];
    var _note = useState(''); var note = _note[0]; var setNote = _note[1];
    var _sl = useState(''); var sl = _sl[0]; var setSl = _sl[1];
    var _tp = useState(''); var tp = _tp[0]; var setTp = _tp[1];
    var _strat = useState(false); var strat = _strat[0]; var setStrat = _strat[1];
    var _mpLock = useState(false); var manualPxLock = _mpLock[0]; var setManualPxLock = _mpLock[1];
    var _mf = useState(''); var manualFee = _mf[0]; var setManualFee = _mf[1];
    var _mcp = useState(''); var manualCostValue = _mcp[0]; var setManualCostValue = _mcp[1];
    var _mcc = useState('PHP'); var manualCostCurr = _mcc[0]; var setManualCostCurr = _mcc[1];

    useEffect(function () {
      if (!props.prefill) return;
      var p = props.prefill;
      setSide('SELL');
      setEx(p.exchange);
      setTk(p.ticker);
      setQty(String(p.qty));
      setPx(String(p.mp));
      setManualPxLock(true);
      setManualCostValue('');
    }, [props.prefill]);

    useEffect(function () {
      if (manualPxLock) return;
      if (tk && mktPx[tk]) setPx(String(mktPx[tk]));
    }, [tk, mktPx, manualPxLock]);

    function handlePriceChange(e) {
      setPx(e.target.value);
      setManualPxLock(true);
    }
    function unlockPrice() { setManualPxLock(false); if (tk && mktPx[tk]) setPx(String(mktPx[tk])); }

    var isF = E.isForex(ex);
    var autoFee = E.calcFee ? E.calcFee(side, px, qty, psiFee, ex) : 0;
    var fee = manualFee === '' ? autoFee : (parseFloat(manualFee) || 0);
    var gross = (parseFloat(px) || 0) * (parseFloat(qty) || 0);
    var netNative = side === 'BUY' ? gross + fee : gross - fee;
    var autoCostPHP = E.toPHP ? E.toPHP(netNative, ex, fxRate) : netNative;

    var finalCostPHP = manualCostValue === '' ? autoCostPHP : (manualCostCurr === 'PHP' ? (parseFloat(manualCostValue) || 0) : ((parseFloat(manualCostValue) || 0) * fxRate));
    var finalCostNative = manualCostValue === '' ? netNative : (manualCostCurr === 'NATIVE' ? (parseFloat(manualCostValue) || 0) : ((parseFloat(manualCostValue) || 0) / fxRate));

    var sym = S(ex);

    var sellActiveTickers = enriched
      .filter(function (p) { return p.exchange === ex && p.qty > 0 && !E.isForex(p.exchange); })
      .map(function (p) { return p.ticker; });
    var sellForexTickers = enriched
      .filter(function (p) { return p.exchange === ex && p.qty > 0 && E.isForex(p.exchange); })
      .map(function (p) { return p.ticker; });
    var sellList = isF ? sellForexTickers : sellActiveTickers;

    var sellPos = null;
    for (var si = 0; si < enriched.length; si++) { if (enriched[si].ticker === tk) { sellPos = enriched[si]; break; } }

    var overSell = side === 'SELL' && !!tk && (parseFloat(qty) || 0) > (sellPos ? sellPos.qty : 0);

    function reset() { setTk(''); setPx(''); setQty(''); setManualFee(''); setManualCostValue(''); setSl(''); setTp(''); setNote(''); setStrat(false); setManualPxLock(false); }
    function handleExec() {
      var finalPx = +px;
      var finalQty = +qty;
      if (manualCostValue !== '') {
        var targetNative = finalCostNative;
        finalPx = (side === 'BUY' ? (targetNative - fee) : (targetNative + fee)) / (finalQty || 1);
      }
      var t = {
        id: (isMock ? 'm' : 't') + Date.now(),
        type: side, exchange: ex, ticker: tk,
        price: finalPx, qty: finalQty, fee: fee, date: date, time: time,
        notes: note, stopLoss: sl, takeProfit: tp,
        manualNetPHP: finalCostPHP
      };
      onExec(t, side);
      reset();
    }

    var port = props.port || { cashPHP: 0, cashUSD: 0 };
    var available = E.isUSD(ex) || E.isForex(ex) || E.isCrypto(ex) ? port.cashUSD : port.cashPHP;
    var isInsufficient = side === 'BUY' && !isMock && finalCostNative > available;
    var canExec = !!tk && parseFloat(px) > 0 && parseFloat(qty) > 0 && !overSell && !isInsufficient;

    return h('div', { className: "panel", style: { padding: 'var(--pad)', display: 'flex', flexDirection: 'column', gap: 'var(--gap)', flexShrink: 0 } },
      isMock && h('div', { style: { background: 'rgba(139,92,246,.10)', border: '1px solid rgba(139,92,246,.25)', borderRadius: 'var(--r-inp)', padding: '5px 10px', display: 'flex', alignItems: 'center', gap: 6 } },
        h(IcFlask), h('span', { style: { fontSize: 9.5, color: '#a78bfa', fontWeight: 600 } }, "Study Lab — Mock trades only · No real cash")
      ),
      h('div', { className: "seg-w", style: { gridTemplateColumns: '1fr 1fr' } },
        ['BUY', 'SELL'].map(function (s) {
          return h('button', { key: s, id: (isMock ? 'mock-' : '') + 'side-' + s.toLowerCase(), onClick: function () { setSide(s); setTk(''); },
            className: 'seg-b ' + (s === 'BUY' ? 'buy' : 'sell') + (side === s ? ' on' : '') }, s === 'BUY' ? '▲ Buy' : '▼ Sell');
        })
      ),
      h(F, { label: "Exchange" },
        h('select', { id: (isMock ? 'mock-' : '') + 'trade-exchange', className: "inp", value: ex, onChange: function (e) { setEx(e.target.value); setTk(''); setPx(''); setManualPxLock(false); } },
          h('option', { value: "PSE" }, "PSE (₱)"),
          h('option', { value: "NASDAQ" }, "NASDAQ ($)"),
          h('option', { value: "NYSE" }, "NYSE ($)"),
          h('option', { value: "CRYPTO" }, "CRYPTO ($)"),
          h('option', { value: "FOREX" }, "FOREX ($)")
        )
      ),
      h(F, { label: isF ? 'Pair  · e.g. EURUSD' : 'Ticker' + (E.isUSD(ex) || E.isCrypto(ex) ? ' · USD→PHP' : '') },
        h(TickerDropdown, {
          exchange: ex, tickers: tickerLists[ex] || [], value: tk,
          onChange: function (v) { setTk(v.toUpperCase().trim()); setManualPxLock(false); },
          onDelete: deleteTicker, onAdd: addTicker,
          forceList: side === 'SELL' && sellList.length > 0 ? sellList : null
        })
      ),
      side === 'SELL' && sellPos && h('div', { className: "inset", style: { padding: '6px 9px', display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' } },
        h('div', null, h('div', { className: "tf", style: { fontSize: 7, letterSpacing: '.07em', textTransform: 'uppercase', marginBottom: 1 } }, "Owned"),
          h(N, { v: f0(sellPos.qty) + (isF ? ' units' : ' shares'), priv: props.priv, cls: "ts", style: { fontSize: 'var(--fz-sm)', fontWeight: 700, color: '#c7e2f7' } })),
        h('div', null, h('div', { className: "tf", style: { fontSize: 7, letterSpacing: '.07em', textTransform: 'uppercase', marginBottom: 1 } }, "Avg"),
          h(N, { v: sym + (isF ? f5(sellPos.avgNative) : f4(sellPos.avgNative)), priv: props.priv, cls: "ts", style: { fontSize: 'var(--fz-sm)', fontWeight: 600 } }))
      ),
      h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 } },
        h(F, { label: 'Price (' + sym + ')' },
          h('div', { style: { position: 'relative' } },
            h('input', { id: (isMock ? 'mock-' : '') + 'trade-price', type: "number", step: isF ? '0.00001' : '0.0001', min: "0",
              className: "inp", placeholder: isF ? '1.08000' : '0.00', value: px, onChange: handlePriceChange,
              style: { paddingRight: manualPxLock ? 28 : undefined } }),
            manualPxLock && h('button', { onClick: unlockPrice, title: "Unlock — restore auto-price",
              style: { position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', cursor: 'pointer', color: '#f59e0b', display: 'flex', alignItems: 'center', padding: 0 } },
              h(IcLock)
            )
          )
        ),
        h(F, { label: "Qty / Units" },
          h('div', { style: { display: 'flex', gap: 5 } },
            h('input', { id: (isMock ? 'mock-' : '') + 'trade-qty', type: "number", step: "1", min: "1",
              className: "inp", placeholder: "0", value: qty, onChange: function (e) { setQty(e.target.value); }, style: { flex: 1 } }),
            side === 'SELL' && sellPos && h('button', { id: (isMock ? 'mock-' : '') + 'sell-max', onClick: function () { setQty(String(sellPos.qty)); },
              className: "btn btn-emerald", style: { padding: '2px 8px', fontSize: 9, flexShrink: 0 } }, "[MAX]")
          )
        ),
        h(F, { label: "Date" }, h('input', { type: "date", className: "inp", value: date, onChange: function (e) { setDate(e.target.value); } }))
      ),
      gross > 0 && h('div', { className: "inset fee-pill", style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
        h('span', { className: "tm", style: { fontSize: 'var(--fz-xs)', display: 'flex', alignItems: 'center', gap: 5 } },
          isF ? 'Pip P&L preview:' : 'Fee (' + sym + '): ',
          isF
            ? h(N, { v: sgn(gross) + '₱' + f2(gross * fxRate), priv: props.priv, style: { color: G(gross), fontSize: 'var(--fz-xs)' } })
            : h('input', { type: "number", step: "0.01", min: "0", className: "inp", placeholder: f2(autoFee), value: manualFee, onChange: function (e) { setManualFee(e.target.value); }, style: { width: 65, height: 22, fontSize: 10, padding: '2px 5px', borderColor: manualFee !== '' ? '#f59e0b' : undefined, color: manualFee !== '' ? '#fbbf24' : undefined } })
        ),
        !isF && h('span', { className: "tm", style: { fontSize: 'var(--fz-xs)', display: 'flex', alignItems: 'center', gap: 5 } },
          side === 'BUY' ? 'Final Cost:' : 'Net Proceeds:',
          h('div', { style: { position: 'relative', display: 'flex', alignItems: 'center' } },
            h('button', { onClick: function () { setManualCostCurr(manualCostCurr === 'PHP' ? 'NATIVE' : 'PHP'); },
              style: { background: 'rgba(128,128,128,.15)', border: 'none', borderRadius: '4px 0 0 4px', color: '#c7e2f7', fontSize: 9, padding: '4px 6px', cursor: 'pointer', fontWeight: 700 } },
              manualCostCurr === 'PHP' ? '₱' : sym
            ),
            h('input', { type: "number", step: "0.01", className: "inp", placeholder: f2(manualCostCurr === 'PHP' ? autoCostPHP : netNative), value: manualCostValue,
              onChange: function (e) { setManualCostValue(e.target.value); },
              style: { width: 95, height: 22, fontSize: 10, fontWeight: 700, padding: '2px 5px', color: '#c7e2f7', borderColor: manualCostValue !== '' ? '#f59e0b' : undefined, borderRadius: '0 4px 4px 0' } })
          )
        )
      ),
      overSell && h('div', { className: "warn-b" }, h(IcAlert), h('span', { style: { fontSize: 'var(--fz-xs)', color: '#5a6472', fontWeight: 700 } }, "INSUFFICIENT INVENTORY")),
      h('button', { className: 'strat-btn' + (strat ? ' on' : ''), onClick: function () { setStrat(function (v) { return !v; }); } },
        h('span', { style: { fontSize: 12, lineHeight: 1, fontWeight: 200 } }, strat ? '−' : '+'), " STRATEGY NOTES"
      ),
      strat && h('div', { className: "ex", style: { display: 'flex', flexDirection: 'column', gap: 'var(--gap)' } },
        h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 } },
          h(F, { label: "Stop Loss", lStyle: { color: 'rgba(244,63,94,.7)' } }, h('input', { type: "number", step: "0.01", className: "inp", placeholder: "0.00", value: sl, onChange: function (e) { setSl(e.target.value); }, style: { borderColor: 'rgba(244,63,94,.22)' } })),
          h(F, { label: "Take Profit", lStyle: { color: 'rgba(16,185,129,.7)' } }, h('input', { type: "number", step: "0.01", className: "inp", placeholder: "0.00", value: tp, onChange: function (e) { setTp(e.target.value); }, style: { borderColor: 'rgba(16,185,129,.22)' } }))
        ),
        h(F, { label: "Notes" }, h('textarea', { className: "inp", rows: 2, placeholder: "Trade thesis…", value: note, onChange: function (e) { setNote(e.target.value); } }))
      ),
      h('button', { id: (isMock ? 'mock-' : '') + 'execute-btn', onClick: handleExec, disabled: !canExec,
        className: 'btn ' + (side === 'BUY' ? 'btn-buy' : 'btn-sell'),
        style: { width: '100%', letterSpacing: '.06em', opacity: isInsufficient ? 0.5 : 1, cursor: isInsufficient ? 'not-allowed' : 'pointer' } },
        side === 'BUY' ? '▲  EXECUTE BUY' : '▼  EXECUTE SELL'
      ),
      isInsufficient && h('div', { className: "warn-b", style: { marginTop: 8 } },
        h(IcAlert),
        h('span', { style: { fontSize: 9.5, color: '#5a6472', fontWeight: 700 } }, "INSUFFICIENT FUNDS: Need " + sym + f2(finalCostNative - available) + " more")
      ),
      manualPxLock && h('div', { style: { display: 'flex', alignItems: 'center', gap: 5, fontSize: 8.5, color: '#f59e0b' } },
        h(IcLock), " Manual price — auto-fetch paused.",
        h('button', { onClick: unlockPrice, style: { background: 'transparent', border: 'none', color: '#f59e0b', cursor: 'pointer', fontSize: 8.5, textDecoration: 'underline', padding: 0 } }, "Unlock")
      )
    );
  }

  /* ── EXPOSE ── */
  window.BJComponents = {
    N: N, F: F, Empty: Empty, Toasts: Toasts, useToasts: useToasts,
    RecoveryBar: RecoveryBar, TickerDropdown: TickerDropdown,
    RiskCard: RiskCard, PositionsTable: PositionsTable, TradeForm: TradeForm,
    SplitPane: SplitPane, VSplitPane: VSplitPane,
    IcSun: IcSun, IcMoon: IcMoon, IcEye: IcEye, IcEyeOff: IcEyeOff, IcAlert: IcAlert,
    IcChevD: IcChevD, IcChevU: IcChevU, IcX: IcX, IcPlus: IcPlus, IcTrash: IcTrash,
    IcShield: IcShield, IcTrend: IcTrend, IcRefresh: IcRefresh, IcFlask: IcFlask,
    IcLock: IcLock, IcSettings: IcSettings, IcMin: IcMin, IcMax: IcMax
  };
})(window);
