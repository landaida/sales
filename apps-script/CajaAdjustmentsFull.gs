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
  addCajaMov_('AM-Ingreso', id, 'Ajuste ingreso '+r.ref, r.cliente, r.proveedor, 0, Math.max(r.ingreso,0),
    { subtotal:r.subtotal, descuento:r.descuento, entrega:0, aplazo:0 });
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
// function _amVenta_(r){
//   var id=_amId_('AM-Venta');
//   var cashOut = Math.max(r.entrega||0,0);
//   if (cashOut>0){
//     addCajaMov_('AM-Venta', id, 'Ajuste venta '+r.ref+' (entrega)', r.cliente, '', 0, cashOut, { subtotal:r.subtotal, descuento:r.descuento, entrega:cashOut, aplazo:r.aplazo });
//   } else {
//     addCajaMov_('AM-Venta', id, 'Ajuste venta '+r.ref, r.cliente, '', 0, 0, { subtotal:r.subtotal, descuento:r.descuento, entrega:0, aplazo:r.aplazo });
//   }
//   var aplazo = Math.max(r.aplazo||0,0);
//   if (aplazo>0){
//     try{
//       var ac=_sh_('ACobrar');
//       if (ac){ ac.appendRow([ r.ref||('T-'+id), r.cliente, -1, new Date(), -aplazo, 'ajuste', 'AM-Venta' ]); }
//       upsertReceivable_(r.cliente, r.cliente, -aplazo);
//     }catch(e){}
//   }
//   return { amId:id };
// }
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

// Wiring (añadir en tu webapp):
// doGet:  if (a==='adjust_list')  return adjustList_(e.parameter.cursor||0, e.parameter.limit||10);
// doPost: if (a==='adjust_apply') return ok_(adjustApply_(String(data.moveId||'')));
