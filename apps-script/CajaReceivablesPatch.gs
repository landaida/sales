// === CajaReceivablesPatch.gs ===
function _sp_(){ return SpreadsheetApp.getActive(); }
function _sheet_(name){ return _sp_().getSheetByName(name); }
function cajaEnsureExtended_(){
  var sh = _sheet_('Caja'); if (!sh) {
    sh = _sp_().insertSheet('Caja');
    sh.appendRow(['Fecha','Tipo','Ref','Descripcion','Cliente','Proveedor','IngresoGs','EgresoGs','SubtotalGs','DescuentoGs','EntregaGs','APlazoGs','BalanceAfterGs','MoveId']);
    return sh;
  }
  var need = ['Fecha','Tipo','Ref','Descripcion','Cliente','Proveedor','IngresoGs','EgresoGs','SubtotalGs','DescuentoGs','EntregaGs','APlazoGs','BalanceAfterGs','MoveId'];
  var cols = sh.getLastColumn();
  if (cols < need.length){ sh.insertColumnsAfter(cols, need.length - cols); }
  var H = sh.getRange(1,1,1,need.length).getValues()[0];
  var changed=false;
  for (var i=0;i<need.length;i++){ if (String(H[i]||'') !== need[i]){ H[i]=need[i]; changed=true; } }
  if (changed) sh.getRange(1,1,1,need.length).setValues([H]);
  return sh;
}
function cajaGetLastBalance_(){
  var sh = cajaEnsureExtended_();
  if (sh.getLastRow()<=1) return 0;
  return Number(sh.getRange(sh.getLastRow(), 13).getValue()||0);
}
function ensureCajaMonth_(date){
  var name = 'Caja-' + Utilities.formatDate(date||new Date(), Session.getScriptTimeZone(), 'yyyy-MM');
  var s = _sheet_(name);
  if (!s){
    s = _sp_().insertSheet(name);
    s.appendRow(['Fecha','Tipo','Ref','Descripcion','Cliente','Proveedor','IngresoGs','EgresoGs','SubtotalGs','DescuentoGs','EntregaGs','APlazoGs','BalanceAfterGs','MoveId']);
  }
  return s;
}
function cajaAppendWithBalance_(tipo, ref, descr, cliente, proveedor, ingreso, egreso, meta){
  var sh = cajaEnsureExtended_();
  var prev = cajaGetLastBalance_();
  var inN = Number(ingreso||0), outN = Number(egreso||0);
  var newBal = prev + inN - outN;
  var moveId = 'M-'+Utilities.formatDate(new Date(), Session.getScriptTimeZone(),'yyyyMMddHHmmss')+'-'+(Math.random()*1e6|0);
  var row = [ new Date(), String(tipo||''), String(ref||''), String(descr||''),
    String(cliente||''), String(proveedor||''), inN, outN, 0,0,0,0, newBal, moveId ];
  if (meta){
    row[8]  = Number(meta.subtotal||0);
    row[9]  = Number(meta.descuento||0);
    row[10] = Number(meta.entrega||0);
    row[11] = Number(meta.aplazo||0);
  }
  sh.appendRow(row);
  var m = ensureCajaMonth_(row[0]); m.appendRow(row);
  return moveId;
}
// Receivables
function ensureReceivables_(){
  var s = _sheet_('Receivables'); if (!s){
    s = _sp_().insertSheet('Receivables');
    s.appendRow(['ClientId','Name','OutstandingGs','UpdatedAt']);
  }
  return s;
}
function _props_(){ return PropertiesService.getScriptProperties(); }
function _loadJSON_(k){ try{ var s=_props_().getProperty(k); return s?JSON.parse(s):{} }catch(e){ return {} } }
function _saveJSON_(k,o){ _props_().setProperty(k, JSON.stringify(o||{})); }
function _loadArIndex_(){ return _loadJSON_('IDX_AR') || {}; }
function _saveArIndex_(m){ _saveJSON_('IDX_AR', m||{}); }
// function _findOrCreateReceivableRow_(clientId, name){
//   var idx = _loadArIndex_();
//   var row = idx[clientId];
//   !row ? row = idx[name] : null;
//   var sh = ensureReceivables_();
//   if (!row && clientId){
//     row = sh.getLastRow()+1;
//     sh.getRange(row,1,1,4).setValues([[String(clientId||''), String(name||''), 0, new Date()]]);
//     idx[clientId] = row;
//     idx[name] = row;
//     _saveArIndex_(idx);
//   } else if(row) {
//     var curName = String(sh.getRange(row,2).getValue()||'');
//     if (String(name||'') && curName !== String(name||'')){ sh.getRange(row,2).setValue(String(name||'')); }
//   }
//   return row;
// }

function _findOrCreateReceivableRow_(clientId, name){
  var idx = _loadArIndex_();
  var row = idx[clientId] || idx[name];
  var sh = ensureReceivables_();
  if (!row){
    row = sh.getLastRow()+1;
    var idCell = String(clientId||name||'');
    sh.getRange(row,1,1,4).setValues([[ idCell, String(name||clientId||''), 0, new Date() ]]);
    if (clientId) idx[clientId]=row;
    if (name)     idx[name]=row;
    _saveArIndex_(idx);
  } else {
    var curName = String(sh.getRange(row,2).getValue()||'');
    if (String(name||'') && curName !== String(name||'')){ sh.getRange(row,2).setValue(String(name||'')); }
    if (clientId){
      sh.getRange(row,1).setValue(String(clientId));
      idx[clientId]=row; _saveArIndex_(idx);
    }
  }
  return row;
}


function upsertReceivable_(clientId, name, deltaGs){
  var sh = ensureReceivables_();
  var row = _findOrCreateReceivableRow_(String(clientId||''), String(name||''));
  var cell = sh.getRange(row,3);
  var prev = Number(cell.getValue()||0);
  cell.setValue(prev + Number(deltaGs||0));
  sh.getRange(row,4).setValue(new Date());
  return true;
}
