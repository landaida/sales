// === TicketIndex.gs ===
function ensureVentasIdx_(){
  var sh = SpreadsheetApp.getActive().getSheetByName('VentasIdx');
  if (!sh){
    sh = SpreadsheetApp.getActive().insertSheet('VentasIdx');
    sh.appendRow(['TicketId','StartRow','Count','CreatedAt']);
  }
  return sh;
}
function _props_(){ return PropertiesService.getScriptProperties(); }
function _loadJSON_(k){ try{ var s=_props_().getProperty(k); return s?JSON.parse(s):{} }catch(e){ return {} } }
function _saveJSON_(k,o){ _props_().setProperty(k, JSON.stringify(o||{})); }
function ticketIndexPut_(ticketId, startRow, count){
  ticketId = String(ticketId||''); if (!ticketId) return false;
  startRow = Number(startRow||0); count = Number(count||0);
  if (startRow<=1 || count<=0) return false;
  var map = _loadJSON_('IDX_TICKET_SPANS'); map[ticketId] = { start: startRow, count: count };
  _saveJSON_('IDX_TICKET_SPANS', map);
  var idxSh = ensureVentasIdx_(); idxSh.appendRow([ ticketId, startRow, count, new Date() ]);
  return true;
}
function ticketIndexGet_(ticketId){
  ticketId = String(ticketId||''); if (!ticketId) return null;
  var map = _loadJSON_('IDX_TICKET_SPANS') || {}; if (map[ticketId]) return map[ticketId];
  var sh = SpreadsheetApp.getActive().getSheetByName('VentasIdx');
  if (sh && sh.getLastRow()>1){
    var vals = sh.getRange(2,1,sh.getLastRow()-1,3).getValues();
    for (var i=0;i<vals.length;i++){
      if (String(vals[i][0]||'')===ticketId){
        var obj = { start: Number(vals[i][1]||0), count: Number(vals[i][2]||0) };
        var map2 = _loadJSON_('IDX_TICKET_SPANS') || {}; map2[ticketId] = obj; _saveJSON_('IDX_TICKET_SPANS', map2);
        return obj;
      }
    }
  }
  return null;
}
// Opcional: reconstruir índices recientes
function rebuildTicketIndex_(maxRowsBack){
  maxRowsBack = Math.max(100, Number(maxRowsBack||5000));
  var sh = SpreadsheetApp.getActive().getSheetByName('Ventas');
  if (!sh || sh.getLastRow()<=1) return { ok:true, rebuilt:0 };
  var lastRow = sh.getLastRow(); var start = Math.max(2, lastRow - maxRowsBack + 1);
  var rows = sh.getRange(start,1,lastRow-start+1,22).getValues();
  var blocks = {}, run=null, runTicket='';
  for (var i=0;i<rows.length;i++){
    var ticket = String(rows[i][12]||''); // col 13
    if (!run){ run = { start: start+i, count: 1 }; runTicket = ticket; }
    else {
      if (ticket===runTicket){ run.count++; }
      else { if (runTicket) blocks[runTicket] = run; run = { start: start+i, count: 1 }; runTicket = ticket; }
    }
  }
  if (run && runTicket) blocks[runTicket] = run;
  var n=0; for (var t in blocks){ if (!ticketIndexGet_(t)){ ticketIndexPut_(t, blocks[t].start, blocks[t].count); n++; } }
  return { ok:true, rebuilt:n };
}
