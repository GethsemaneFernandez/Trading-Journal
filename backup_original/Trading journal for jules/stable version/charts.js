/* ═══════════════════════════════════════════════════════════
   BASIC JOURNAL V1.6 — CHART COMPONENTS (charts.js)
   window.BJCharts
   ─────────────────────────────────────────────────────────
   Requires: React 18 (window.React), engine.js (window.BasicEngine)
   Components:
     PieChart         — Allocation donut
     TrendChart       — Daily sparkline bars
     EquityCurve      — Line graph of net worth growth
     PnLHeatmap       — 12-month daily P&L dot grid
     AssetWeightBar   — Horizontal allocation (Stocks/Forex/Crypto)
     CashTrailChart   — Narrative cash flow timeline
═══════════════════════════════════════════════════════════ */
(function (window) {
  'use strict';
  var R  = window.React;
  var E  = window.BasicEngine || {};
  var f2 = E.f2 || function(v){ return (parseFloat(v)||0).toFixed(2); };
  var f0 = E.f0 || function(v){ return Math.round(parseFloat(v)||0).toString(); };
  var f4 = E.f4 || function(v){ return (parseFloat(v)||0).toFixed(4); };

  if (!R) { console.error('charts.js: React not found'); return; }
  var createElement = R.createElement;
  var useState = R.useState;
  var useMemo  = R.useMemo;

  /* ── h() helper: createElement shorthand ─────────────── */
  function h(type, props) {
    var args = [type, props];
    for (var i = 2; i < arguments.length; i++) args.push(arguments[i]);
    return createElement.apply(null, args);
  }

  /* ══════════════════════════════════════════════════════
     PIE CHART
  ══════════════════════════════════════════════════════ */
  function PieChart(props) {
    var data = props.data || [], size = props.size || 150, title = props.title || '';
    var colorFn = props.colorFn;
    var COLORS = (E.PIE_COLORS || ['#475569','#334155','#1e293b','#64748b','#94a3b8']);
    var total  = data.reduce(function(s,d){return s+(d.v||0);},0);
    if (!total || !data.length) return h('div',{style:{display:'flex',alignItems:'center',justifyContent:'center',height:size,opacity:.25}},
      h('span',{style:{fontSize:9}},'No data'));
    var cx = size/2, cy = size/2, r = size*0.38, hole = r*0.55;
    var slices = [], angle = -Math.PI/2;
    data.forEach(function(d,i){
      var pct = d.v / total;
      var end = angle + pct * 2 * Math.PI;
      var x1=cx+r*Math.cos(angle),y1=cy+r*Math.sin(angle);
      var x2=cx+r*Math.cos(end),  y2=cy+r*Math.sin(end);
      var hx1=cx+hole*Math.cos(angle),hy1=cy+hole*Math.sin(angle);
      var hx2=cx+hole*Math.cos(end),  hy2=cy+hole*Math.sin(end);
      var large = pct > 0.5 ? 1 : 0;
      var col = colorFn ? colorFn(d) : COLORS[i % COLORS.length];
      slices.push(h('path',{key:i,
        d:'M '+hx1+' '+hy1+' L '+x1+' '+y1+' A '+r+' '+r+' 0 '+large+' 1 '+x2+' '+y2+' L '+hx2+' '+hy2+' A '+hole+' '+hole+' 0 '+large+' 0 '+hx1+' '+hy1+' Z',
        fill:col, opacity:0.85,
        title:(d.label||'')+(total?' '+(pct*100).toFixed(1)+'%':'')
      }));
      angle = end;
    });
    return h('div',{style:{display:'flex',flexDirection:'column',alignItems:'center',gap:6}},
      h('svg',{width:size,height:size,viewBox:'0 0 '+size+' '+size},
        slices,
        h('text',{x:cx,y:cy-4,textAnchor:'middle',fill:'#94a3b8',fontSize:8,fontFamily:'JetBrains Mono,monospace'},title),
        h('text',{x:cx,y:cy+8,textAnchor:'middle',fill:'#c7e2f7',fontSize:7,fontFamily:'JetBrains Mono,monospace'},data.length+' pos')
      ),
      h('div',{style:{display:'flex',flexWrap:'wrap',gap:'3px 8px',justifyContent:'center',maxWidth:size}},
        data.slice(0,5).map(function(d,i){
          var col = colorFn ? colorFn(d) : COLORS[i%COLORS.length];
          return h('div',{key:i,style:{display:'flex',alignItems:'center',gap:3}},
            h('div',{style:{width:6,height:6,borderRadius:'50%',background:col,flexShrink:0}}),
            h('span',{style:{fontSize:6.5,color:'#64748b',fontFamily:'JetBrains Mono,monospace'}},d.label)
          );
        })
      )
    );
  }

  /* ══════════════════════════════════════════════════════
     TREND CHART (daily bar sparkline)
  ══════════════════════════════════════════════════════ */
  function TrendChart(props) {
    var data = props.data || [];
    if (!data.length) return h('div',{style:{display:'flex',alignItems:'center',justifyContent:'center',height:72,opacity:.28}},
      h('span',{style:{fontSize:9}},'No trend data yet'));
    var vals = data.map(function(d){return d.value;});
    var maxV = Math.max.apply(null,vals), minV = Math.min.apply(null,vals), range = maxV-minV||1;
    return h('div',null,
      h('div',{style:{display:'flex',alignItems:'flex-end',gap:3,height:64,padding:'0 2px'}},
        data.map(function(d,i){
          var ht = Math.max(4,((d.value-minV)/range)*100);
          var up = i===0||d.value>=data[i-1].value;
          var col = up?'#94a3b8':'#475569';
          return h('div',{key:i,title:d.label+': ₱'+f2(d.value),style:{flex:1,height:ht+'%',background:'linear-gradient(0deg,'+col+'bb,'+col+')',borderRadius:'2px 2px 0 0',opacity:0.8}});
        })
      ),
      h('div',{style:{height:1,background:'rgba(255,255,255,0.06)',margin:'2px 0'}}),
      h('div',{style:{display:'flex',justifyContent:'space-between',marginTop:2}},
        h('span',{style:{fontSize:7,color:'#475569',fontFamily:'JetBrains Mono,monospace'}},data[0]&&data[0].label),
        h('span',{style:{fontSize:7,color:'#475569',fontFamily:'JetBrains Mono,monospace'}},data[data.length-1]&&data[data.length-1].label)
      )
    );
  }

  /* ══════════════════════════════════════════════════════
     EQUITY CURVE (line graph — V1.6 NEW)
  ══════════════════════════════════════════════════════ */
  function EquityCurve(props) {
    var points = props.points || [], height = props.height || 80, width = props.width || 300;
    var label = props.label || 'Equity';
    if (points.length < 2) return h('div',{style:{display:'flex',alignItems:'center',justifyContent:'center',height:height,opacity:.25}},
      h('span',{style:{fontSize:9}},'Not enough data'));
    var mn = Math.min.apply(null,points), mx = Math.max.apply(null,points), rng = mx-mn||1;
    var w = width, h2 = height;
    var pts = points.map(function(v,i){
      var x = i/(points.length-1)*w;
      var y = h2 - ((v-mn)/rng)*(h2-12) - 2;
      return x.toFixed(1)+','+y.toFixed(1);
    });
    var polyline = pts.join(' ');
    var fill = pts.join(' ') + ' '+w+','+(h2)+' 0,'+(h2);
    var lastVal = points[points.length-1];
    var color = lastVal >= points[0] ? '#c7e2f7' : '#f43f5e';
    return h('div',{style:{position:'relative'}},
      h('svg',{width:'100%',height:h2,viewBox:'0 0 '+w+' '+h2,preserveAspectRatio:'none'},
        h('defs',null,
          h('linearGradient',{id:'eqgrad',x1:0,y1:0,x2:0,y2:1},
            h('stop',{offset:'0%',stopColor:color,stopOpacity:0.3}),
            h('stop',{offset:'100%',stopColor:color,stopOpacity:0.02})
          )
        ),
        h('polygon',{points:fill,fill:'url(#eqgrad)'}),
        h('polyline',{points:polyline,fill:'none',stroke:color,strokeWidth:1.5,strokeLinejoin:'round'})
      ),
      h('div',{style:{display:'flex',justifyContent:'space-between',marginTop:4}},
        h('span',{style:{fontSize:7,color:'#475569',fontFamily:'JetBrains Mono,monospace'}},label),
        h('span',{style:{fontSize:8,fontWeight:700,color:color,fontFamily:'JetBrains Mono,monospace'}},'₱'+f2(lastVal))
      )
    );
  }

  /* ══════════════════════════════════════════════════════
     P&L HEATMAP — 12-month daily dot grid (V1.6 NEW)
  ══════════════════════════════════════════════════════ */
  function PnLHeatmap(props) {
    var trades = props.trades || [];
    /* Build map: date → net realized P&L that day */
    var dayMap = {};
    var posMap2 = {};
    var sorted = trades.filter(function(t){return t&&t.ticker&&t.price&&t.qty&&t.date;})
      .slice().sort(function(a,b){return a.date.localeCompare(b.date);});
    sorted.forEach(function(t){
      var tk=t.ticker, ex=t.exchange||'PSE';
      var p=parseFloat(t.price)||0, q=parseFloat(t.qty)||0;
      if((t.type||'').toUpperCase()==='BUY'){
        if(!posMap2[tk])posMap2[tk]={qty:0,totalCostPHP:0};
        var fe=(E.calcFee?E.calcFee('BUY',p,q,false,ex):0);
        posMap2[tk].qty+=q; posMap2[tk].totalCostPHP+=(E.toPHP?E.toPHP(p*q+fe,ex,60):p*q+fe);
      } else if((t.type||'').toUpperCase()==='SELL'&&posMap2[tk]&&posMap2[tk].qty>0){
        var avg2=posMap2[tk].totalCostPHP/posMap2[tk].qty;
        var fe2=(E.calcFee?E.calcFee('SELL',p,q,false,ex):0);
        var proc=(E.toPHP?E.toPHP(p*q-fe2,ex,60):p*q-fe2);
        var pnl=proc-avg2*q;
        dayMap[t.date]=(dayMap[t.date]||0)+pnl;
        posMap2[tk].qty-=q; posMap2[tk].totalCostPHP-=avg2*q;
      }
    });
    /* Build 12-month grid */
    var today = new Date();
    var months = [];
    for(var mi=11;mi>=0;mi--){
      var d=new Date(today.getFullYear(),today.getMonth()-mi,1);
      months.push({year:d.getFullYear(),month:d.getMonth()});
    }
    var MONTHS=['J','F','M','A','M','J','J','A','S','O','N','D'];
    return h('div',{style:{overflowX:'auto'}},
      h('div',{style:{display:'flex',gap:4,alignItems:'flex-start'}},
        months.map(function(m,mi){
          var days=new Date(m.year,m.month+1,0).getDate();
          var cells=[];
          for(var di=1;di<=days;di++){
            var ds=m.year+'-'+('0'+(m.month+1)).slice(-2)+'-'+('0'+di).slice(-2);
            var pnl=dayMap[ds];
            var col=pnl===undefined?'rgba(255,255,255,0.04)':pnl>0?'#c7e2f7':pnl<0?'#f43f5e':'#334155';
            var op=pnl!==undefined?Math.min(1,Math.abs(pnl)/5000*0.8+0.3):1;
            cells.push(h('div',{key:di,title:ds+(pnl!==undefined?' ₱'+f2(pnl):''),
              style:{width:6,height:6,borderRadius:1,background:col,opacity:pnl!==undefined?op:1,margin:'0.5px'}}));
          }
          return h('div',{key:mi,style:{display:'flex',flexDirection:'column',gap:1,alignItems:'center'}},
            h('span',{style:{fontSize:6,color:'#475569',marginBottom:2}}),
            h('div',{style:{display:'flex',flexDirection:'column',flexWrap:'wrap',height:48,gap:'0.5px'}},cells),
            h('span',{style:{fontSize:6,color:'#475569',marginTop:2}},MONTHS[m.month])
          );
        })
      ),
      h('div',{style:{display:'flex',gap:12,marginTop:6,alignItems:'center'}},
        h('div',{style:{display:'flex',alignItems:'center',gap:4}},h('div',{style:{width:8,height:8,background:'#c7e2f7',borderRadius:1}}),h('span',{style:{fontSize:7,color:'#64748b'}},'Profit')),
        h('div',{style:{display:'flex',alignItems:'center',gap:4}},h('div',{style:{width:8,height:8,background:'#f43f5e',borderRadius:1}}),h('span',{style:{fontSize:7,color:'#64748b'}},'Loss')),
        h('div',{style:{display:'flex',alignItems:'center',gap:4}},h('div',{style:{width:8,height:8,background:'rgba(255,255,255,0.04)',borderRadius:1,border:'1px solid rgba(255,255,255,0.1)'}}),h('span',{style:{fontSize:7,color:'#64748b'}},'No Trade'))
      )
    );
  }

  /* ══════════════════════════════════════════════════════
     ASSET WEIGHT BAR — Stocks / Forex / Crypto (V1.6 NEW)
  ══════════════════════════════════════════════════════ */
  function AssetWeightBar(props) {
    var enriched = props.enriched || [], totalMV = props.totalMV || 0;
    if (!enriched.length || !totalMV) return h('div',{style:{opacity:.25,fontSize:9,padding:8}},'No positions');
    var groups = { Stocks:0, Forex:0, Crypto:0 };
    enriched.forEach(function(p){
      if(E.isForex&&E.isForex(p.exchange)) groups.Forex+=p.mvPHP||0;
      else if(E.isCrypto&&E.isCrypto(p.exchange)) groups.Crypto+=p.mvPHP||0;
      else groups.Stocks+=p.mvPHP||0;
    });
    var items=[
      {label:'Stocks', val:groups.Stocks, color:'#94a3b8'},
      {label:'Forex',  val:groups.Forex,  color:'#64748b'},
      {label:'Crypto', val:groups.Crypto, color:'#475569'},
    ].filter(function(x){return x.val>0;});
    return h('div',{style:{display:'flex',flexDirection:'column',gap:8}},
      h('div',{style:{display:'flex',borderRadius:4,overflow:'hidden',height:10}},
        items.map(function(x,i){
          var pct=x.val/totalMV*100;
          return h('div',{key:i,title:x.label+': '+pct.toFixed(1)+'%',style:{width:pct+'%',background:x.color,opacity:0.85,transition:'width 0.3s'}});
        })
      ),
      h('div',{style:{display:'flex',gap:12,flexWrap:'wrap'}},
        items.map(function(x,i){
          var pct=x.val/totalMV*100;
          return h('div',{key:i,style:{display:'flex',alignItems:'center',gap:4}},
            h('div',{style:{width:8,height:8,borderRadius:1,background:x.color}}),
            h('span',{style:{fontSize:8,color:'#64748b',fontFamily:'JetBrains Mono,monospace'}},x.label+' '+pct.toFixed(1)+'%')
          );
        })
      )
    );
  }

  /* ══════════════════════════════════════════════════════
     CASH TRAIL CHART (narrative timeline)
  ══════════════════════════════════════════════════════ */
  function CashTrailChart(props) {
    var data = props.data || [], full = props.full;
    if (!data.length) return h('div',{style:{display:'flex',alignItems:'center',justifyContent:'center',height:90,opacity:.28}},
      h('span',{style:{fontSize:9}},'No cash events yet — add a deposit or trade'));
    var kindMeta = {
      deposit: {icon:'↑',color:'#c7e2f7',label:'CASH IN',  bg:'rgba(199,226,247,0.08)'},
      withdraw:{icon:'↓',color:'#5a6472',label:'WITHDRAW', bg:'rgba(90,100,114,0.08)'},
      buy:     {icon:'●',color:'#64748b',label:'BUY',      bg:'rgba(100,116,139,0.06)'},
      profit:  {icon:'▲',color:'#c7e2f7',label:'SELL WIN', bg:'rgba(199,226,247,0.07)'},
      loss:    {icon:'▼',color:'#f43f5e',label:'SELL LOSS',bg:'rgba(244,63,94,0.07)'},
    };
    var lastCash = data[data.length-1] ? data[data.length-1].cashAfter : 0;
    var totalDep = data.filter(function(d){return d.kind==='deposit';}).reduce(function(s,d){return s+d.amount;},0);
    var totalPnL = data.filter(function(d){return d.kind==='profit'||d.kind==='loss';}).reduce(function(s,d){return s+(d.pnl||0);},0);
    var display  = full ? data : data.slice(-4);
    return h('div',{style:{display:'flex',flexDirection:'column',gap:6}},
      !full && h('div',{style:{display:'flex',gap:8,flexWrap:'wrap',marginBottom:2}},
        h('div',{style:{display:'flex',flexDirection:'column',gap:1}},h('span',{style:{fontSize:6,opacity:.5}},'DEPOSITED'),h('span',{style:{fontSize:9.5,fontWeight:700,color:'#c7e2f7',fontFamily:'JetBrains Mono,monospace'}},'₱'+f2(totalDep))),
        h('div',{style:{display:'flex',flexDirection:'column',gap:1}},h('span',{style:{fontSize:6,opacity:.5}},'REALIZED P&L'),h('span',{style:{fontSize:9.5,fontWeight:700,color:totalPnL>=0?'#c7e2f7':'#f43f5e',fontFamily:'JetBrains Mono,monospace'}},(totalPnL>=0?'+':'')+'₱'+f2(totalPnL))),
        h('div',{style:{marginLeft:'auto',display:'flex',flexDirection:'column',gap:1,textAlign:'right'}},h('span',{style:{fontSize:6,opacity:.5}},'AVAIL CASH'),h('span',{style:{fontSize:9.5,fontWeight:800,color:lastCash>=0?'#c7e2f7':'#f43f5e',fontFamily:'JetBrains Mono,monospace'}},'₱'+f2(lastCash)))
      ),
      h('div',{style:{display:'flex',flexDirection:'column',gap:full?8:5}},
        display.map(function(ev,i){
          var m=kindMeta[ev.kind]||kindMeta.deposit;
          return h('div',{key:i,style:{display:'flex',gap:full?10:6,alignItems:'flex-start',background:m.bg,borderRadius:6,padding:full?'10px 12px':'5px 8px',border:'1px solid rgba(255,255,255,0.04)'}},
            h('div',{style:{flexShrink:0,display:'flex',flexDirection:'column',alignItems:'center',gap:2,minWidth:full?44:30}},
              h('div',{style:{width:full?22:16,height:full?22:16,borderRadius:'50%',background:m.color+'22',border:'1px solid '+m.color+'44',display:'flex',alignItems:'center',justifyContent:'center',color:m.color,fontSize:full?10:8,fontWeight:800}},m.icon),
              h('span',{style:{fontSize:full?7:6,color:m.color,fontWeight:700}},m.label)
            ),
            h('div',{style:{flex:1,minWidth:0}},
              h('div',{style:{display:'flex',justifyContent:'space-between',marginBottom:full?4:1,gap:6}},
                h('span',{style:{fontSize:full?8.5:7,opacity:.55,fontFamily:'JetBrains Mono,monospace'}},ev.date+(ev.time?' · '+ev.time:'')),
                ev.ticker && h('span',{style:{fontSize:full?9:7.5,fontWeight:800,color:'#c7e2f7',fontFamily:'JetBrains Mono,monospace'}},ev.ticker)
              ),
              h('div',{style:{fontSize:full?10:8.5,lineHeight:1.45,color:'rgba(255,255,255,0.72)'}},ev.story)
            ),
            ev.cashAfter !== undefined && h('div',{style:{flexShrink:0,textAlign:'right'}},
              h('div',{style:{fontSize:full?7:6,opacity:.45,marginBottom:2}},'CASH'),
              h('div',{style:{fontSize:full?10:8,fontWeight:800,color:ev.cashAfter>=0?'#64748b':'#f43f5e',fontFamily:'JetBrains Mono,monospace'}},'₱'+f2(ev.cashAfter))
            )
          );
        }),
        !full && data.length > 4 && h('div',{style:{textAlign:'center',fontSize:7.5,opacity:.4,paddingTop:2}},'+'+( data.length-4)+' more — open fullscreen for complete ledger')
      )
    );
  }

  /* ══ EXPOSE ══════════════════════════════════════════ */
  window.BJCharts = {
    PieChart:       PieChart,
    TrendChart:     TrendChart,
    EquityCurve:    EquityCurve,
    PnLHeatmap:     PnLHeatmap,
    AssetWeightBar: AssetWeightBar,
    CashTrailChart: CashTrailChart,
  };

})(window);
