// === CajaAdjustmentsFull.gs ===
function _ss_(){ return SpreadsheetApp.getActive(); }
function _sh_(n){ return _ss_().getSheetByName(n); }
function _nz(n){ return Number(n||0); }
function _s(v){ return v==null?'':String(v); }

function adjustList_(cursor, limit){
  cursor=_nz(cursor); limit=Math.max(1,_nz(limit)||10);
  var sh=_sh_('Caja'); if(!sh||sh.getLastRow()<=1) return ok_({ok:true,items:[],next:null});
  var got=_scanFromBottom_({
    sh: sh, lastCol: 16, cursor: cursor, limit: limit, pageSize: 200,
    rowHandler: function(r, items){
      var status = String(r[14]||'').trim() || 'activo';
      if (status.toLowerCase()!=='activo') return;
      var tipo=_s(r[1]||''); if (tipo.indexOf('AM-')===0 || tipo==='ajuste') return;
      items.push({ date:r[0], tipo:tipo, ref:_s(r[2]||''), descr:_s(r[3]||''), cliente:_s(r[4]||''), proveedor:_s(r[5]||''),
        ingreso:_nz(r[6]), egreso:_nz(r[7]), subtotal:_nz(r[8]), descuento:_nz(r[9]), entrega:_nz(r[10]), aplazo:_nz(r[11]),
        balance:_nz(r[12]), moveId:_s(r[13]||''), status: status});
    }
  });
  return ok_({ok:true,items:got.items,next:got.next});
}

function adjustApply_(moveId){
  var sh=_sh_('Caja'); if(!moveId||!sh||sh.getLastRow()<=1) return {ok:false,error:'invalid'};
  var vals=sh.getRange(2,1,sh.getLastRow()-1,14).getValues();
  for (var i=0;i<vals.length;i++){
    var r=vals[i];
    if (_s(r[13])===_s(moveId)){
      var row={ date:r[0], tipo:_s(r[1]||''), ref:_s(r[2]||''), descr:_s(r[3]||''), cliente:_s(r[4]||''), proveedor:_s(r[5]||''),
        ingreso:_nz(r[6]), egreso:_nz(r[7]), subtotal:_nz(r[8]), descuento:_nz(r[9]), entrega:_nz(r[10]), aplazo:_nz(r[11]),
        balance:_nz(r[12]), moveId:_s(r[13]||'') };

      // return {ok:true, result:_applyAM_(row)};
      var out = _applyAM_(row);
      try {
        cajaEnsureStatus_();
        cajaSetStatusEverywhere_(String(moveId), 'ajustado');              // origen
        if (out && out.amId) cajaSetStatusEverywhere_(String(out.amId), 'ajuste'); // AM
      } catch(e){}
      return ok_({ ok:true, result: out });
    }
  }
  return {ok:false,error:'moveId not found'};
}

function _amId_(p){ return p+'-'+Utilities.formatDate(new Date(), Session.getScriptTimeZone(),'yyyyMMddHHmmss')+'-'+(Math.random()*1e6|0); }
function _applyAM_(row){
  if (row.tipo==='ajuste' || row.tipo.indexOf('AM-')===0) throw new Error('Cannot adjust an adjustment');
  if (row.tipo==='ingreso')  return _amIngreso_(row);
  if (row.tipo==='gasto')    return _amGasto_(row);
  if (row.tipo==='cobro')    return _amCobro_(row);
  if (row.tipo==='compra')   return _amCompra_(row);
  if (row.tipo==='venta')    return _amVenta_(row);
  if (row.tipo==='pago')     return _amPago_(row);
  if (row.tipo==='acobrar') return _amACobrar_(row);
  return _amGeneric_(row);
}
// function _amIngreso_(r){
//   var id=_amId_('AM-Ingreso');
//   addCajaMov_('AM-Ingreso', id, 'Ajuste ingreso '+r.ref, r.cliente, r.proveedor, 0, Math.max(r.ingreso,0),
//     { subtotal:r.subtotal, descuento:r.descuento, entrega:0, aplazo:0 });
//   return { amId:id };
// }
function _sumPendingPayablesForRef_(refId){
  var sh=SpreadsheetApp.getActive().getSheetByName('APagar'); if(!sh||sh.getLastRow()<=1) return {sum:0, rows:[]};
  var vals=sh.getRange(2,1,sh.getLastRow()-1,7).getValues(); var sum=0, rows=[];
  for (var i=0;i<vals.length;i++){
    if (String(vals[i][0]||'')!==String(refId)) continue;
    var estado=String(vals[i][5]||'pendiente').toLowerCase();
    if (estado!=='pagado' && estado!=='ajustado' && estado!=='anulado'){ sum+=Number(vals[i][4]||0); rows.push(i+2); }
  }
  return {sum:sum, rows:rows};
}
function _amIngreso_(r){
  var id=_amId_('AM-Ingreso');
  // addCajaMov_('AM-Ingreso', id, 'Ajuste ingreso '+r.ref, r.cliente, r.proveedor, 0, Math.max(r.ingreso,0),
  //   { subtotal:r.subtotal, descuento:r.descuento, entrega:0, aplazo:0 });
  addCajaMov_('AM-Ingreso', id, 'Ajuste ingreso '+r.ref, r.cliente, r.proveedor, 0, Math.max(r.ingreso,0), { subtotal:r.subtotal, descuento:r.descuento, entrega:0, aplazo:0, apDelta: -pending.sum });
  try{
    var pending=_sumPendingPayablesForRef_(r.ref);
    if (pending.rows.length){
      var sh=SpreadsheetApp.getActive().getSheetByName('APagar');
      sh.getRange(pending.rows[0],5,pending.rows.length,1).setValues(Array(pending.rows.length).fill([0]));
      sh.getRange(pending.rows[0],6,pending.rows.length,1).setValues(Array(pending.rows.length).fill(['ajustado']));
      sh.getRange(pending.rows[0],7,pending.rows.length,1).setValues(Array(pending.rows.length).fill(['AM-Ingreso '+id]));
      upsertPayable_(r.cliente||r.proveedor||'', r.cliente||r.proveedor||'', -pending.sum);
    }
  }catch(e){}
  return { amId:id };
}

function _amGasto_(r){
  var id=_amId_('AM-Gasto');
  addCajaMov_('AM-Gasto', id, 'Ajuste gasto '+r.ref, r.cliente, r.proveedor, 0, Math.max(r.egreso||r.subtotal,0),
    { subtotal:r.subtotal, descuento:r.descuento, entrega:0, aplazo:0 });
  return { amId:id };
}
function _amCobro_(r){
  var id=_amId_('AM-Cobro');
  var amount = Math.max(r.ingreso,0);
  addCajaMov_('AM-Cobro', id, 'Ajuste cobro '+r.ref, r.cliente, '', 0, amount, { subtotal:0, descuento:0, entrega:0, aplazo:amount });
  try{
    var ac = SpreadsheetApp.getActive().getSheetByName('ACobrar');
    if (ac){ ac.appendRow([ r.ref||('T-'+id), r.cliente, -1, new Date(), amount, 'pendiente', 'AM-Cobro' ]); }
    upsertReceivable_(r.cliente, r.cliente, +amount);
  }catch(e){}
  return { amId:id };
}
function _amCompra_(r){
  var id=_amId_('AM-Compra');
  var cashIn = Math.max(r.egreso||r.subtotal,0);
  addCajaMov_('AM-Compra', id, 'Ajuste compra '+r.ref, '', r.proveedor, cashIn, 0, { subtotal:r.subtotal, descuento:r.descuento, entrega:0, aplazo:0 });
  try{
    var shC=_sh_('Compras');
    if (shC && shC.getLastRow()>1){
      var rows=shC.getRange(2,1,shC.getLastRow()-1,12).getValues();
      for (var i=0;i<rows.length;i++){
        var fac=_s(rows[i][6]||'');
        if (fac===r.ref){
          var code=_s(rows[i][8]||''), qty=_nz(rows[i][3]||0);
          if (code && qty>0 && typeof applySaleToStock_==='function'){ applySaleToStock_(code, qty); }
        }
      }
    }
  }catch(e){}
  return { amId:id };
}
function _amGeneric_(r){
  var id=_amId_('AM-Gen');
  var net = Math.max(r.ingreso,0) - Math.max(r.egreso,0);
  if (net>0){
    addCajaMov_('AM-Gen', id, 'Ajuste '+r.ref, r.cliente, r.proveedor, 0, net, { subtotal:r.subtotal, descuento:r.descuento, entrega:0, aplazo:0 });
  } else if (net<0){
    addCajaMov_('AM-Gen', id, 'Ajuste '+r.ref, r.cliente, r.proveedor, -net, 0, { subtotal:r.subtotal, descuento:r.descuento, entrega:0, aplazo:0 });
  } else {
    addCajaMov_('AM-Gen', id, 'Ajuste '+r.ref, r.cliente, r.proveedor, 0, 0, { subtotal:r.subtotal, descuento:r.descuento, entrega:0, aplazo:0 });
  }
  return { amId:id };
}

function _amPago_(r){
  var id=_amId_('AM-Pago');
  var amount = Math.max(r.egreso||0, 0); // pago original fue egreso
  // 1) Caja: ingreso que revierte el pago
  // addCajaMov_('AM-Pago', id, 'Ajuste pago '+r.ref, r.cliente, '', amount, 0, { subtotal:0, descuento:0, entrega:0, aplazo:0 });
  addCajaMov_('AM-Pago', id, 'Ajuste pago '+r.ref, r.cliente, '', amount, 0, { subtotal:0, descuento:0, entrega:0, aplazo:0, apDelta: +amount });
  // 2) APagar: restaurar cuota exacta (RefId=r.ref, CuotaN parseado o leído del historial 'Pagos')
  var m = String(r.descr||'').match(/Pago\s+cuota\s+(\d+)/i);
  var cuotaN = m ? Number(m[1]) : null;

  if (!cuotaN){
    try{
      var psh = SpreadsheetApp.getActive().getSheetByName('Pagos');
      if (psh && psh.getLastRow()>1){
        var pvals = psh.getRange(2,1,psh.getLastRow()-1,6).getValues(); // Fecha,RefId,Persona,CuotaN,Monto,Nota
        for (var i=pvals.length-1;i>=0;i--){
          if (String(pvals[i][1]||'')===String(r.ref) && String(pvals[i][2]||'')===String(r.cliente)){
            cuotaN = Number(pvals[i][3]||0) || null; break;
          }
        }
      }
    }catch(e){}
  }

  try{
    var ash = SpreadsheetApp.getActive().getSheetByName('APagar'); 
    if (ash && ash.getLastRow()>1){
      var a = ash.getRange(2,1,ash.getLastRow()-1,7).getValues();
      for (var i=0;i<a.length;i++){
        var refOk = String(a[i][0]||'')===String(r.ref);
        var cuotaOk = cuotaN ? (Number(a[i][2]||0)===Number(cuotaN)) : true;
        var estado = String(a[i][5]||'pendiente').toLowerCase();
        if (refOk && cuotaOk && (estado==='pagado' || estado==='ajustado' || estado==='pendiente')){
          var row = i+2;
          var prev = Number(ash.getRange(row,5).getValue()||0);
          var nuevo = (prev || 0) + amount; // si estaba pagado, prev será 0
          ash.getRange(row,5,1,3).setValues([[nuevo, 'pendiente', 'AM-Pago '+id]]);
          break;
        }
      }
    }
  }catch(e){}

  // 3) Payables materializado: +amount
  try{
    var cliId='';
    var cs=SpreadsheetApp.getActive().getSheetByName('Clientes');
    if (cs && cs.getLastRow()>1){
      var rr=cs.getRange(2,1,cs.getLastRow()-1,2).getValues();
      for (var j=0;j<rr.length;j++){ if (String(rr[j][0]||'')===r.cliente){ cliId=String(rr[j][1]||''); break; } }
    }
    upsertPayable_(cliId||r.cliente, r.cliente, +amount);
  }catch(e){}

  try{ pagosMarkStatus_(r.ref, r.cliente, cuotaN, 'ajustado'); }catch(e){}

  return { amId:id, restored: amount, cuotaN: cuotaN };
}

function _amACobrar_(r){
  var id=_amId_('AM-ACobrar');
  var pending = _sumPendingForTicket_ ? _sumPendingForTicket_(r.ref) : { sum: Math.max(r.aplazo||0,0), rows: [] };
  var ingreso = Math.max(r.egreso||0,0); // revierte caja si hubo egreso
  addCajaMov_('AM-ACobrar', id, 'Ajuste crear A Cobrar '+r.ref, r.cliente, '', ingreso, 0,
    { subtotal:0, descuento:0, entrega:0, aplazo:0, arDelta: -(pending.sum||0) });

  try{
    var ac=SpreadsheetApp.getActive().getSheetByName('ACobrar');
    if(ac && pending.rows.length){
      ac.getRange(pending.rows[0],5,pending.rows.length,1).setValues(Array(pending.rows.length).fill([0]));
      ac.getRange(pending.rows[0],6,pending.rows.length,1).setValues(Array(pending.rows.length).fill(['ajustado']));
      ac.getRange(pending.rows[0],7,pending.rows.length,1).setValues(Array(pending.rows.length).fill(['AM-ACobrar '+id]));
    }
  }catch(e){}
  try{ upsertReceivable_(r.cliente, r.cliente, -(pending.sum||0)); }catch(e){}
  return { amId:id, adjustedAmount:(pending.sum||0), rows:(pending.rows||[]).length };
}