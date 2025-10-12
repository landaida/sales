// ---------- Stock write-back patch (Apps Script) ----------
// Paste these helpers in your Code.gs (English comments only).
// They are ADDITIVE: do not remove your existing endpoints.
// Goal: keep 'Productos'!E (Stock) updated on every purchase/sale so the UI can read it directly.

// Parse BR numbers like '1.000' or '170,00'
function toNumBR_(v){
  if (v===null || v===undefined || v==='') return 0;
  if (typeof v === 'number') return v;
  var s = String(v).replace(/\./g,'').replace(',','.');
  var n = Number(s);
  return isNaN(n) ? 0 : n;
}

// Get sheet safely
function sh_(name){ return SpreadsheetApp.getActive().getSheetByName(name); }

// Find product row by code; returns 0 if not found
function findProductRow_(code){
  var s = sh_('Productos'); if (!s) throw 'Productos sheet not found';
  var last = Math.max(2, s.getLastRow());
  var vals = s.getRange(1,1,last,2).getValues(); // A:Codigo, B:Nombre
  for (var i=2;i<=vals.length;i++){
    if (String(vals[i-1][0]||'').trim() === String(code)) return i;
  }
  return 0;
}

// Ensure product row exists; returns row index
function ensureProductRow_(code, name){
  var s = sh_('Productos'); if (!s) throw 'Productos sheet not found';
  var row = findProductRow_(code);
  if (row) return row;
  // Columns: A Codigo, B Nombre, C PrecioVenta, D Unidad, E Stock, F CostoPromedio, G Activo, H UltimoCosto, I Markup%, J PrecioSugerido
  s.appendRow([ String(code), name||String(code), 0, '', 0, 0, 1, 'CostoUnitario', 0, 0 ]);
  return s.getLastRow();
}

// Adjust stock and costs on purchase
function applyPurchaseToStock_(code, name, qty, unitCost){
  var s = sh_('Productos'); if (!s) throw 'Productos sheet not found';
  var row = ensureProductRow_(code, name);
  var stockCell = s.getRange(row, 5); // E: Stock
  var avgCell   = s.getRange(row, 6); // F: CostoPromedio
  var lastCell  = s.getRange(row, 8); // H: UltimoCosto

  var prevStock = toNumBR_(stockCell.getValue());
  var prevAvg   = toNumBR_(avgCell.getValue());
  var q         = Number(qty)||0;
  var cost      = toNumBR_(unitCost);

  // Weighted average cost using previous stock (ignore negatives)
  var baseQty = Math.max(0, prevStock);
  var newAvg = baseQty<=0 ? cost : ((prevAvg*baseQty) + (cost*q)) / (baseQty + q);
  var newStock = prevStock + q;

  stockCell.setValue(newStock);
  avgCell.setValue(newAvg);
  lastCell.setValue(cost);
}

// Adjust stock on sale (reduce)
function applySaleToStock_(code, qty){
  var s = sh_('Productos'); if (!s) throw 'Productos sheet not found';
  var row = ensureProductRow_(code, String(code));
  var stockCell = s.getRange(row, 5); // E: Stock
  var prev = toNumBR_(stockCell.getValue());
  var q = Number(qty)||0;
  stockCell.setValue(prev - q);
}

// ---------- Where to call it ----------
// 1) Inside your OCR import (after appending a row in 'Compras'), call:
//    applyPurchaseToStock_(it.code, it.product, it.qty, it.unitCost);
//
//    Example (pseudo):
//    items.forEach(function(it){
//      shCompras.appendRow([ when, supplier, it.product, it.qty, it.unitCost, it.qty*it.unitCost, filename, '', it.code, it.color, it.size, it.barcode ]);
//      applyPurchaseToStock_(it.code, it.product, it.qty, it.unitCost);
//    });
//
// 2) Inside your sale/ticket handler (when a sale is registered), for each item:
//    applySaleToStock_(item.code, item.qty);
//
//    Example (pseudo):
//    function saleTicket_(d){
//      var items = d.items||[];
//      // ... append ticket rows to 'Ventas' as you already do ...
//      for (var i=0;i<items.length;i++){ applySaleToStock_(items[i].code, items[i].qty); }
//      return { ok:true, ... };
//    }
