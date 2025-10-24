// AMStatusMonthlyPatch.gs
function cajaEnsureStatusMonth_(date){
  var name = 'Caja-' + Utilities.formatDate(date||new Date(), Session.getScriptTimeZone(), 'yyyy-MM');
  var sh = SpreadsheetApp.getActive().getSheetByName(name);
  if (!sh) return;
  var need = ['Fecha','Tipo','Ref','Descripcion','Cliente','Proveedor','IngresoGs','EgresoGs','SubtotalGs','DescuentoGs','EntregaGs','APlazoGs','BalanceAfterGs','MoveId','Status'];
  var cols = sh.getLastColumn();
  if (cols < need.length){ sh.insertColumnsAfter(cols, need.length - cols); }
  var H = sh.getRange(1,1,1,need.length).getValues()[0], changed=false;
  for (var i=0;i<need.length;i++){ if (String(H[i]||'') !== need[i]){ H[i]=need[i]; changed=true; } }
  if (changed) sh.getRange(1,1,1,need.length).setValues([H]);
}

function cajaFindRowByMoveIdInSheet_(sheetName, moveId){
  var sh = SpreadsheetApp.getActive().getSheetByName(sheetName);
  if (!sh || sh.getLastRow()<=1) return 0;
  // MoveId en col 14 (N)
  var vals = sh.getRange(2,14,sh.getLastRow()-1,1).getValues();
  for (var i=0;i<vals.length;i++){ if (String(vals[i][0]||'')===String(moveId)) return i+2; }
  return 0;
}

// Setea el status en 'Caja' y en el sheet mensual correspondiente (si existe).
function cajaSetStatusEverywhere_(moveId, status){
  var st = String(status||'activo');

  // Hoja principal: Caja
  try{
    cajaEnsureStatus_();
    var r = cajaFindRowByMoveId_(moveId);
    if (r>0) SpreadsheetApp.getActive().getSheetByName('Caja').getRange(r,15).setValue(st);
  }catch(e){}

  // Hoja mensual: intentar en el mes actual y algunos meses atrás
  var tz = Session.getScriptTimeZone();
  var now = new Date();
  for (var k=0;k<3;k++){ // ventana simple de 3 meses (ajústalo si querés)
    var d = new Date(now); d.setMonth(now.getMonth()-k);
    var name = 'Caja-' + Utilities.formatDate(d, tz, 'yyyy-MM');
    var sh = SpreadsheetApp.getActive().getSheetByName(name);
    if (!sh) continue;
    try{
      cajaEnsureStatusMonth_(d);
      var row = cajaFindRowByMoveIdInSheet_(name, moveId);
      if (row>0){ sh.getRange(row,15).setValue(st); return true; }
    }catch(e){}
  }
  return false;
}
