/* ═══════════════════════════════════════════════════════════
   BASIC JOURNAL V1.6 — REUSABLE COMPONENTS (components.js)
   window.BJComponents
   ─────────────────────────────────────────────────────────
   Requires: React 18 (window.React), engine.js (window.BasicEngine)
   Pure ES5 createElement — no JSX.
   Components:
     Toast           — Notification bar (success/error/info)
     HUDBar          — Top metrics strip
     PositionsTable  — Holdings with TP alert + concentration warning
     TradeForm       — Floating Buy/Sell execution panel
     FundingForm     — Deposit/Withdrawal with hard validation
     Empty           — Empty state placeholder
═══════════════════════════════════════════════════════════ */
(function (window) {
  'use strict';
  var R   = window.React;
  var E   = window.BasicEngine || {};
  var f2  = E.f2  || function(v){ return (parseFloat(v)||0).toFixed(2); };
  var f0  = E.f0  || function(v){ return Math.round(parseFloat(v)||0).toString(); };
  var f4  = E.f4  || function(v){ return (parseFloat(v)||0).toFixed(4); };
  var f5  = E.f5  || function(v){ return (parseFloat(v)||0).toFixed(5); };
  var pct = E.pct || function(v){ return ((parseFloat(v)||0).toFixed(2))+'%'; };
  var sgn = E.sgn || function(v){ return v>=0?'+':''; };

  if (!R) { console.error('components.js: React not found'); return; }
  var createElement = R.createElement;
  var useState  = R.useState;
  var useEffect = R.useEffect;
  var useRef    = R.useRef;
  function h(type, props) {
    var args = [type, props];
    for (var i=2;i<arguments.length;i++) args.push(arguments[i]);
    return createElement.apply(null,args);
  }

  /* ══════════════════════════════════════════════════════
     TOAST NOTIFICATION
  ══════════════════════════════════════════════════════ */
  function Toast(props) {
    var toasts = props.toasts || [];
    if (!toasts.length) return null;
    var colMap = { success:'#c7e2f7', error:'#f43f5e', info:'#94a3b8', warning:'#f59e0b' };
    return h('div',{style:{position:'fixed',bottom:24,right:24,zIndex:9999,display:'flex',flexDirection:'column',gap:8}},
      toasts.map(function(t){
        var col = colMap[t.type] || '#94a3b8';
        return h('div',{key:t.id,style:{background:'#111827',border:'1px solid '+col+'44',borderLeft:'3px solid '+col,borderRadius:8,padding:'10px 16px',color:col,fontSize:11,fontFamily:'JetBrains Mono,monospace',maxWidth:320,boxShadow:'0 8px 32px rgba(0,0,0,0.5)',animation:'fadeSlideIn 0.25s ease'}},t.message);
      })
    );
  }

  /* ══════════════════════════════════════════════════════
     EMPTY STATE
  ══════════════════════════════════════════════════════ */
  function Empty(props) {
    return h('div',{style:{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:8,flex:1,opacity:.35,padding:40}},
      h('div',{style:{fontSize:32}},'⬡'),
      props.msg && h('span',{style:{fontSize:11,fontFamily:'JetBrains Mono,monospace',letterSpacing:'.1em'}},props.msg),
      props.sub && h('span',{style:{fontSize:9,opacity:.7}},props.sub)
    );
  }

  /* ══════════════════════════════════════════════════════
     HUD BAR — compact top metrics strip
  ══════════════════════════════════════════════════════ */
  function HUDBar(props) {
    var port = props.port || {}, enriched = props.enriched || [];
    var fxRate = props.fxRate || 60, priv = props.priv;
    var totalMV = enriched.reduce(function(s,p){return s+p.mvPHP;},0);
    var totalEq = (port.cashPHP||0) + totalMV;
    var upPnL   = enriched.reduce(function(s,p){return s+(p.uplPHP||0);},0);
    var totalDep= (port.totalDep||0);
    var realPnL = port.realPnLPHP||0;
    var winRate = port.winRate||0;
    var risk = E.getRiskMetrics ? E.getRiskMetrics(enriched, totalMV) : { overConcentrated: [] };
    var items = [
      { id:'hud-eq',   l:'Total Equity',    v:'₱'+f2(totalEq),            color:'#c7e2f7' },
      { id:'hud-mv',   l:'Market Value',    v:'₱'+f2(totalMV),            color:'#94a3b8' },
      { id:'hud-cash', l:'Available Cash',  v:'₱'+f2(port.cashPHP||0),    color:'#64748b' },
      { id:'hud-upl',  l:'Unrealized P&L',  v:(upPnL>=0?'+':'')+'₱'+f2(upPnL),  color:upPnL>=0?'#c7e2f7':'#f43f5e' },
      { id:'hud-real', l:'Realized P&L',    v:(realPnL>=0?'+':'')+'₱'+f2(realPnL), color:realPnL>=0?'#c7e2f7':'#f43f5e' },
      { id:'hud-wr',   l:'Win Rate',        v:winRate>0?winRate.toFixed(1)+'%':'—', color:'#64748b' },
    ];
    return h('div',{className:'hud-bar'},
      items.map(function(item){
        return h('div',{key:item.id,id:item.id,className:'hud-cell'},
          h('span',{className:'hud-label'},item.l),
          h('span',{className:'hud-value',style:{color:item.color}}, priv?'••••':item.v)
        );
      }),
      risk.overConcentrated && risk.overConcentrated.length > 0 &&
        h('div',{className:'hud-cell',title:'Concentration Risk: '+risk.overConcentrated.map(function(c){return c.ticker+' '+c.share.toFixed(1)+'%';}).join(', ')},
          h('span',{className:'hud-label'},'Risk Alert'),
          h('span',{className:'concentration-warn'},'⚠ '+risk.overConcentrated[0].ticker+' '+risk.overConcentrated[0].share.toFixed(0)+'%')
        )
    );
  }

  /* ══════════════════════════════════════════════════════
     POSITIONS TABLE
     Features: TP Alert glow, concentration >30% warning
  ══════════════════════════════════════════════════════ */
  function PositionsTable(props) {
    var enriched  = props.enriched  || [];
    var mktPx     = props.mktPx    || {};
    var fxRate    = props.fxRate   || 60;
    var priv      = props.priv;
    var onQuickSell = props.onQuickSell;
    var totalMV   = enriched.reduce(function(s,p){return s+(p.mvPHP||0);},0);
    if (!enriched.length) return h(Empty,{msg:'No open positions',sub:'Execute a BUY to get started'});
    var THstyle   = {padding:'6px 10px',fontSize:8,color:'#475569',fontFamily:'JetBrains Mono,monospace',borderBottom:'1px solid rgba(255,255,255,0.05)',textAlign:'left',userSelect:'none',letterSpacing:'.06em'};
    var TDstyle   = {padding:'8px 10px',fontSize:10,fontFamily:'JetBrains Mono,monospace',borderBottom:'1px solid rgba(255,255,255,0.03)',verticalAlign:'middle'};
    return h('div',{style:{overflowX:'auto'}},
      h('table',{style:{width:'100%',borderCollapse:'collapse',tableLayout:'fixed'}},
        h('thead',null,h('tr',null,
          ['Ticker','Exchange','Qty','Avg Entry','Market Px','Mkt Value','Unr. P&L','Gain%','Alloc%','Action'].map(function(hdr,i){
            return h('th',{key:i,style:THstyle},hdr);
          })
        )),
        h('tbody',null,
          enriched.map(function(p){
            var px   = mktPx[p.ticker] || p.avgNative;
            var isForexPos = E.isForex && E.isForex(p.exchange);
            var sym  = isForexPos ? '$' : (E.isUSD&&E.isUSD(p.exchange)?'$':'₱');
            var disp = isForexPos ? f5 : f4;
            var mvPHP = p.mvPHP || 0;
            var uplPHP = p.uplPHP || 0;
            var gainPct = p.gainPct || 0;
            var allocPct = totalMV > 0 ? (mvPHP/totalMV*100) : 0;
            var isConcentrated = allocPct > 30;
            /* TP Alert — gold pulse if at or above TP */
            var tp = parseFloat(p.takeProfit) || 0;
            var atTP = tp > 0 && px >= tp;
            var rowCls = atTP ? 'tp-alert-row' : '';
            return h('tr',{key:p.ticker,className:rowCls,style:{transition:'background 0.3s'}},
              h('td',{style:Object.assign({},TDstyle,{fontWeight:700,color:'#c7e2f7'})},
                atTP && h('span',{className:'tp-glow',title:'Take Profit Hit!'},'★ '),
                p.ticker
              ),
              h('td',{style:Object.assign({},TDstyle,{color:'#475569'})},p.exchange),
              h('td',{style:TDstyle},priv?'••':f0(p.qty)),
              h('td',{style:TDstyle},sym+disp(p.avgNative)),
              h('td',{style:Object.assign({},TDstyle,{color:px>=p.avgNative?'#c7e2f7':'#f43f5e'})},sym+disp(px)),
              h('td',{style:TDstyle},priv?'••':'₱'+f2(mvPHP)),
              h('td',{style:Object.assign({},TDstyle,{color:uplPHP>=0?'#c7e2f7':'#f43f5e'})},priv?'••':(uplPHP>=0?'+':'')+'₱'+f2(uplPHP)),
              h('td',{style:Object.assign({},TDstyle,{color:gainPct>=0?'#c7e2f7':'#f43f5e'})},(gainPct>=0?'+':'')+gainPct.toFixed(2)+'%'),
              h('td',{style:TDstyle},
                isConcentrated
                  ? h('span',{className:'concentration-warn',title:'Concentration >30%! Reduce position.'},'⚠ '+allocPct.toFixed(1)+'%')
                  : h('span',{style:{color:'#64748b'}},allocPct.toFixed(1)+'%')
              ),
              h('td',{style:TDstyle},
                onQuickSell && h('button',{
                  onClick:function(){ onQuickSell(p); },
                  style:{background:'rgba(244,63,94,0.12)',border:'1px solid rgba(244,63,94,0.3)',borderRadius:4,color:'#f43f5e',fontSize:8,padding:'3px 8px',cursor:'pointer',fontFamily:'JetBrains Mono,monospace'}
                },'SELL')
              )
            );
          })
        )
      )
    );
  }

  /* ══════════════════════════════════════════════════════
     TRADE FORM — Floating execution panel
  ══════════════════════════════════════════════════════ */
  function TradeForm(props) {
    var onSubmit   = props.onSubmit;
    var prefill    = props.prefill || {};
    var tickerLists= props.tickerLists || {};
    var psiFee     = props.psiFee;
    var fxRate     = props.fxRate || 60;
    var isMock     = props.isMock;
    var _st = useState(prefill.type || 'BUY'); var tradeType = _st[0]; var setType = _st[1];
    var _se = useState(prefill.exchange||'PSE'); var exchange = _se[0]; var setExchange = _se[1];
    var _sk = useState(prefill.ticker||''); var ticker = _sk[0]; var setTicker = _sk[1];
    var _sp = useState(prefill.price||''); var price = _sp[0]; var setPrice = _sp[1];
    var _sq = useState(prefill.qty||''); var qty = _sq[0]; var setQty = _sq[1];
    var _sd = useState(prefill.date||new Date().toISOString().slice(0,10)); var date = _sd[0]; var setDate = _sd[1];
    var _sn = useState(prefill.notes||''); var notes = _sn[0]; var setNotes = _sn[1];
    var _stp = useState(prefill.takeProfit||''); var takeProfit = _stp[0]; var setTP = _stp[1];
    var EXCHANGES = ['PSE','NASDAQ','NYSE','CRYPTO','FOREX'];
    var isForexEx = E.isForex && E.isForex(exchange);
    var priceFmt  = isForexEx ? f5 : f4;
    var sym       = (E.isUSD&&E.isUSD(exchange))||isForexEx?'$':'₱';
    var p = parseFloat(price)||0, q = parseFloat(qty)||0;
    var fee   = (p&&q&&E.calcFee) ? E.calcFee(tradeType,p,q,psiFee,exchange) : 0;
    var gross = p*q;
    var net   = tradeType==='BUY' ? gross+fee : gross-fee;
    var netPHP= (E.toPHP&&p&&q) ? E.toPHP(net,exchange,fxRate) : net;
    function submit(e) {
      e.preventDefault();
      if (!ticker||!price||!qty) return;
      onSubmit && onSubmit({ type:tradeType, exchange:exchange, ticker:ticker.toUpperCase(), price:parseFloat(price), qty:parseFloat(qty), date:date, notes:notes, takeProfit:parseFloat(takeProfit)||0 });
    }
    var isBuy = tradeType === 'BUY';
    var accentColor = isBuy ? '#c7e2f7' : '#f43f5e';
    var labelStyle = { fontSize:9, color:'#64748b', marginBottom:3, display:'block', fontFamily:'JetBrains Mono,monospace' };
    var inputStyle = { width:'100%', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:6, padding:'7px 10px', color:'#e2e8f0', fontSize:11, fontFamily:'JetBrains Mono,monospace', outline:'none', boxSizing:'border-box' };
    return h('form',{onSubmit:submit,style:{display:'flex',flexDirection:'column',gap:10}},
      /* Type toggle */
      h('div',{style:{display:'flex',gap:4,marginBottom:4}},
        ['BUY','SELL'].map(function(t){
          var active = tradeType===t;
          var tc = t==='BUY'?'#c7e2f7':'#f43f5e';
          return h('button',{key:t,type:'button',onClick:function(){setType(t);},style:{flex:1,padding:'8px 0',background:active?tc+'18':'transparent',border:'1px solid '+(active?tc+'55':'rgba(255,255,255,0.08)'),borderRadius:6,color:active?tc:'#475569',fontSize:10,fontWeight:active?700:400,fontFamily:'JetBrains Mono,monospace',cursor:'pointer',transition:'all .15s'}},t);
        })
      ),
      /* Exchange */
      h('div',null,
        h('label',{style:labelStyle},'EXCHANGE'),
        h('select',{value:exchange,onChange:function(e){setExchange(e.target.value);setTicker('');},style:inputStyle},
          EXCHANGES.map(function(ex){return h('option',{key:ex,value:ex},ex);})
        )
      ),
      /* Ticker */
      h('div',null,
        h('label',{style:labelStyle},'TICKER'),
        h('input',{list:'tf-tickers',value:ticker,onChange:function(e){setTicker(e.target.value.toUpperCase());},placeholder:'e.g. AAPL',style:inputStyle}),
        h('datalist',{id:'tf-tickers'},
          ((tickerLists[exchange]||[]).concat(E.SEED_TICKERS&&E.SEED_TICKERS[exchange]?E.SEED_TICKERS[exchange]:[])).map(function(tk){return h('option',{key:tk,value:tk});})
        )
      ),
      /* Price */
      h('div',null,
        h('label',{style:labelStyle},'PRICE ('+sym+')'),
        h('input',{type:'number',step:isForexEx?'0.00001':'0.01',value:price,onChange:function(e){setPrice(e.target.value);},placeholder:'0.00',style:inputStyle})
      ),
      /* Qty */
      h('div',null,
        h('label',{style:labelStyle},isForexEx?'UNITS':'SHARES / LOTS'),
        h('input',{type:'number',step:'1',value:qty,onChange:function(e){setQty(e.target.value);},placeholder:'0',style:inputStyle})
      ),
      /* Take Profit */
      h('div',null,
        h('label',{style:labelStyle},'TAKE PROFIT ('+sym+') — optional'),
        h('input',{type:'number',step:'0.0001',value:takeProfit,onChange:function(e){setTP(e.target.value);},placeholder:'0.00',style:inputStyle})
      ),
      /* Date */
      h('div',null,
        h('label',{style:labelStyle},'DATE'),
        h('input',{type:'date',value:date,onChange:function(e){setDate(e.target.value);},style:inputStyle})
      ),
      /* Notes */
      h('div',null,
        h('label',{style:labelStyle},'NOTES (optional)'),
        h('input',{value:notes,onChange:function(e){setNotes(e.target.value);},placeholder:'Reason / thesis…',style:inputStyle})
      ),
      /* Summary */
      (p&&q) && h('div',{style:{background:'rgba(255,255,255,0.03)',borderRadius:6,padding:'8px 12px',fontSize:9,fontFamily:'JetBrains Mono,monospace',display:'flex',flexDirection:'column',gap:4}},
        h('div',{style:{display:'flex',justifyContent:'space-between'}},h('span',{style:{color:'#475569'}},'Gross'),h('span',null,sym+f2(gross))),
        h('div',{style:{display:'flex',justifyContent:'space-between'}},h('span',{style:{color:'#475569'}},'Fee'),h('span',null,sym+f2(fee))),
        h('div',{style:{display:'flex',justifyContent:'space-between',fontWeight:700,color:accentColor}},h('span',null,'PHP Net'),h('span',null,'₱'+f2(netPHP)))
      ),
      /* Submit */
      h('button',{type:'submit',style:{background:accentColor+'18',border:'1px solid '+accentColor+'44',borderRadius:8,padding:'10px 0',color:accentColor,fontSize:11,fontWeight:700,fontFamily:'JetBrains Mono,monospace',cursor:'pointer',letterSpacing:'.05em',transition:'all .2s'}},
        (isMock?'SIM ':'EXEC ')+tradeType
      )
    );
  }

  /* ══════════════════════════════════════════════════════
     FUNDING FORM — Deposit / Withdrawal with hard-validation
  ══════════════════════════════════════════════════════ */
  function FundingForm(props) {
    var onSubmit  = props.onSubmit;
    var cashState = props.cashState || { php:0, usd:0 };
    var addToast  = props.addToast;
    var SOURCES   = E.SOURCES || ['BPI','BDO','Wise','GCash','Maya','Cash'];
    var _st = useState('DEPOSIT'); var fType = _st[0]; var setFType = _st[1];
    var _sa = useState(''); var amount = _sa[0]; var setAmount = _sa[1];
    var _ss = useState(SOURCES[0]); var source = _ss[0]; var setSource = _ss[1];
    var _sd = useState(new Date().toISOString().slice(0,10)); var date = _sd[0]; var setDate = _sd[1];
    var _sc = useState('PHP'); var currency = _sc[0]; var setCurrency = _sc[1];
    var _sn = useState(''); var notes = _sn[0]; var setNotes = _sn[1];
    var labelStyle = { fontSize:9, color:'#64748b', marginBottom:3, display:'block', fontFamily:'JetBrains Mono,monospace' };
    var inputStyle = { width:'100%', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:6, padding:'7px 10px', color:'#e2e8f0', fontSize:11, fontFamily:'JetBrains Mono,monospace', outline:'none', boxSizing:'border-box' };
    function submit(e) {
      e.preventDefault();
      var amt = parseFloat(amount);
      if (!amt || amt <= 0) { addToast && addToast('Enter a valid amount.','error'); return; }
      /* WITHDRAWAL LAW */
      if (fType === 'WITHDRAWAL' && E.validateWithdrawal) {
        var check = E.validateWithdrawal(amt, currency, cashState);
        if (!check.ok) { addToast && addToast(check.message,'error'); return; }
      }
      onSubmit && onSubmit({ type: fType, amount: amt, source: source, date: date, currency: currency, notes: notes });
      setAmount(''); setNotes('');
    }
    var isWdw = fType === 'WITHDRAWAL';
    return h('form',{onSubmit:submit,style:{display:'flex',flexDirection:'column',gap:10}},
      h('div',{style:{display:'flex',gap:4}},
        ['DEPOSIT','WITHDRAWAL'].map(function(t){
          var active=fType===t, col=t==='DEPOSIT'?'#c7e2f7':'#f43f5e';
          return h('button',{key:t,type:'button',onClick:function(){setFType(t);},style:{flex:1,padding:'7px 0',background:active?col+'18':'transparent',border:'1px solid '+(active?col+'55':'rgba(255,255,255,0.08)'),borderRadius:6,color:active?col:'#475569',fontSize:9,fontWeight:active?700:400,fontFamily:'JetBrains Mono,monospace',cursor:'pointer'}},t);
        })
      ),
      h('div',null,h('label',{style:labelStyle},'CURRENCY'),
        h('select',{value:currency,onChange:function(e){setCurrency(e.target.value);},style:inputStyle},
          h('option',{value:'PHP'},'PHP (₱)'), h('option',{value:'USD'},'USD ($)')
        )
      ),
      h('div',null,h('label',{style:labelStyle},'AMOUNT'),
        h('input',{type:'number',step:'0.01',value:amount,onChange:function(e){setAmount(e.target.value);},placeholder:'0.00',style:inputStyle})
      ),
      isWdw && h('div',{style:{fontSize:8.5,color:'#f59e0b',padding:'4px 8px',background:'rgba(245,158,11,0.08)',borderRadius:4,fontFamily:'JetBrains Mono,monospace'}},
        'Available: '+(currency==='PHP'?'₱':'$')+f2(currency==='PHP'?cashState.php:cashState.usd)
      ),
      h('div',null,h('label',{style:labelStyle},isWdw?'DESTINATION':'SOURCE'),
        h('select',{value:source,onChange:function(e){setSource(e.target.value);},style:inputStyle},
          SOURCES.map(function(s){return h('option',{key:s,value:s},s);})
        )
      ),
      h('div',null,h('label',{style:labelStyle},'DATE'),
        h('input',{type:'date',value:date,onChange:function(e){setDate(e.target.value);},style:inputStyle})
      ),
      h('div',null,h('label',{style:labelStyle},'NOTES'),
        h('input',{value:notes,onChange:function(e){setNotes(e.target.value);},placeholder:'Optional memo…',style:inputStyle})
      ),
      h('button',{type:'submit',style:{background:isWdw?'rgba(244,63,94,0.12)':'rgba(199,226,247,0.10)',border:'1px solid '+(isWdw?'rgba(244,63,94,0.3)':'rgba(199,226,247,0.3)'),borderRadius:8,padding:'10px 0',color:isWdw?'#f43f5e':'#c7e2f7',fontSize:11,fontWeight:700,fontFamily:'JetBrains Mono,monospace',cursor:'pointer'}},
        isWdw ? 'CONFIRM WITHDRAWAL' : 'RECORD DEPOSIT'
      )
    );
  }

  /* ══ EXPOSE ══════════════════════════════════════════ */
  window.BJComponents = {
    Toast:          Toast,
    Empty:          Empty,
    HUDBar:         HUDBar,
    PositionsTable: PositionsTable,
    TradeForm:      TradeForm,
    FundingForm:    FundingForm,
  };

})(window);
