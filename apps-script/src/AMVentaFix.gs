// Replacement for _amVenta_ without negative rows in ACobrar

function _sumPendingForTicket_(ticket){
  var sum=0, rows=[];
  var ac = SpreadsheetApp.getActive().getSheetByName('ACobrar');
  if (ac && ac.getLastRow()>1){
    var vals = ac.getRange(2,1,ac.getLastRow()-1,7).getValues(); // [TicketId, Cliente, CuotaN, FechaCuota, MontoCuota, Estado, Nota]
    for (var i=0;i<vals.length;i++){
      var t = String(vals[i][0]||'');
      if (t !== String(ticket)) continue;
      var estado = String(vals[i][5]||'pendiente').toLowerCase();
      if (estado!=='pagado' && estado!=='ajustado' && estado!=='anulado'){
        sum += Number(vals[i][4]||0);
        rows.push(i+2); // real row index
      }
    }
  }
  return { sum: sum, rows: rows };
}

function _amVenta_(r){
  var id=_amId_('AM-Venta');

  // 1) Caja (egreso si hubo entrega/contado)
  var cashOut = Math.max(r.entrega||0,0);
  if (cashOut>0){
    // addCajaMov_('AM-Venta', id, 'Ajuste venta '+r.ref+' (entrega)', r.cliente, '', 0, cashOut, {
    //   subtotal:r.subtotal, descuento:r.descuento, entrega:cashOut, aplazo:r.aplazo
    // });
    addCajaMov_('AM-Venta', id, 'Ajuste venta '+r.ref+' (entrega)', r.cliente, '', 0, cashOut, { subtotal:r.subtotal, descuento:r.descuento, entrega:cashOut, aplazo:r.aplazo, arDelta: delta });
  } else {
    // addCajaMov_('AM-Venta', id, 'Ajuste venta '+r.ref, r.cliente, '', 0, 0, {
    //   subtotal:r.subtotal, descuento:r.descuento, entrega:0, aplazo:r.aplazo
    // });
    addCajaMov_('AM-Venta', id, 'Ajuste venta '+r.ref, r.cliente, '', 0, 0, { subtotal:r.subtotal, descuento:r.descuento, entrega:0, aplazo:r.aplazo, arDelta: delta });
  }

  // 2) ACobrar: anular cuotas pendientes del ticket (sin montar negativos)
  var pending = _sumPendingForTicket_(r.ref);
  var ac = SpreadsheetApp.getActive().getSheetByName('ACobrar');
  if (ac && pending.rows.length>0){
    ac.getRange(pending.rows[0],5,pending.rows.length,1).setValues(Array(pending.rows.length).fill([0]));            // MontoCuota=0
    ac.getRange(pending.rows[0],6,pending.rows.length,1).setValues(Array(pending.rows.length).fill(['ajustado']));   // Estado
    ac.getRange(pending.rows[0],7,pending.rows.length,1).setValues(Array(pending.rows.length).fill(['AM-Venta '+id])); // Nota
  }

  // 3) Receivables: restar el pendiente real (fallback a r.aplazo si no hay filas por algún motivo)
  var delta = (pending.sum>0 ? -pending.sum : -(Math.max(r.aplazo||0,0)));
  try{ upsertReceivable_(r.cliente, r.cliente, delta); }catch(e){}

  // Dentro de _amVenta_(r) al final, después de caja/ACobrar/Receivables:
  try{
    var vsh = SpreadsheetApp.getActive().getSheetByName('Ventas');
    if (vsh && vsh.getLastRow()>1){
      var ix = ticketIndexGet_(r.ref);
      if (ix){
        var block = vsh.getRange(ix.start, 1, ix.count, 22).getValues();
        // recorre SOLO 'block' para reponer stock
        // var vals = vsh.getRange(2,1,vsh.getLastRow()-1,22).getValues();
        for (var i=0;i<block.length;i++){
          if (String(block[i][12]||'')!==String(r.ref)) continue; // col 13 = TicketId
          var code = String(block[i][18]||''); // col 19 = Codigo
          var qty  = Number(block[i][3]||0);   // col 4  = Cantidad
          if (code && qty>0){
            if (typeof increaseStockOnly_==='function'){ increaseStockOnly_(code, qty); }
            else if (typeof applyPurchaseToStock_==='function'){ applyPurchaseToStock_(code, code, qty, block[i][9]||block[i][14]||0); } // fallback
          }
        }
      } else {
        // fallback opcional: buscar en el "tail" (ej: últimas 5000 filas)
         // fallback acotado: tail de 5000
          var last = vsh.getLastRow(), start = Math.max(2, last-4999);
          var block = vsh.getRange(start,1,last-start+1,22).getValues();
          for (var i=0;i<block.length;i++){
            if (String(block[i][12]||'')!==String(r.ref)) continue; // col 13 = TicketId
            var code = String(block[i][18]||''); // col 19 = Codigo
            var qty  = Number(block[i][3]||0);   // col 4  = Cantidad
            if (code && qty>0){
              if (typeof increaseStockOnly_==='function'){ increaseStockOnly_(code, qty); }
              else if (typeof applyPurchaseToStock_==='function'){ applyPurchaseToStock_(code, code, qty, block[i][9]||block[i][14]||0); } // fallback
            }
          }
      }
    }
  }catch(e){}


  return { amId:id, adjustedRows: pending.rows.length, adjustedAmount: (pending.sum||0) };
}
