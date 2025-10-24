// AMStatusPatch.gs
function cajaEnsureStatus_(){
  var sh = SpreadsheetApp.getActive().getSheetByName('Caja');
  if (!sh) return;
  var need = ['Fecha','Tipo','Ref','Descripcion','Cliente','Proveedor','IngresoGs','EgresoGs','SubtotalGs','DescuentoGs','EntregaGs','APlazoGs','BalanceAfterGs','MoveId','Status'];
  var cols = sh.getLastColumn();
  if (cols < need.length){ sh.insertColumnsAfter(cols, need.length - cols); }
  var H = sh.getRange(1,1,1,need.length).getValues()[0], changed=false;
  for (var i=0;i<need.length;i++){ if (String(H[i]||'') !== need[i]){ H[i]=need[i]; changed=true; } }
  if (changed) sh.getRange(1,1,1,need.length).setValues([H]);
}
function cajaFindRowByMoveId_(moveId){
  if (!moveId) return 0;
  var sh = SpreadsheetApp.getActive().getSheetByName('Caja');
  if (!sh || sh.getLastRow()<=1) return 0;
  var vals = sh.getRange(2,14,sh.getLastRow()-1,1).getValues();
  for (var i=0;i<vals.length;i++){ if (String(vals[i][0]||'')===String(moveId)) return i+2; }
  return 0;
}
function cajaSetStatusByMoveId_(moveId, status){
  cajaEnsureStatus_();
  var row = cajaFindRowByMoveId_(moveId);
  if (row>0){ SpreadsheetApp.getActive().getSheetByName('Caja').getRange(row, 15).setValue(String(status||'activo')); return true; }
  return false;
}
function cajaMarkNewMoveStatus_(moveId, status){ return cajaSetStatusByMoveId_(moveId, status||'ajuste'); }
