// === Code.gs ===
// Small JSON helpers
function ok_(obj){ return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON) }
function bad_(msg){ return ok_({ ok:false, error: String(msg) }) }

// Spreadsheet helpers
function ss_(){ return SpreadsheetApp.getActive() }
function sheetByName_(name){ return ss_().getSheetByName(name) }

// Parse "Config" sheet to key/value object
function cfg_(){
  try{
    const s = sheetByName_('Config'); const v = s.getDataRange().getValues()
    const out = {}
    for (let i=0;i<v.length;i++){ const k=String(v[i][0]||'').trim(); const val=v[i][1]; if (k) out[k]=val }
    return out
  }catch(e){ return {} }
}

// Simple dashboard numbers
function _getDashboard(){
  const s = sheetByName_('Gastos')
  let totalExpenses = 0
  if (s){
    const rows = s.getRange(2,1,Math.max(0,s.getLastRow()-1),4).getValues()
    for (let r of rows){ totalExpenses += Number(r[1]||0) }
  }
  return { ok:true, totalPaid:0, totalExpenses, cashOnHand: -totalExpenses, expensesMonth: totalExpenses }
}

// === Helpers for numbers & sheets (local, safe) ===
function toNum_(v){
  if (v===null || v===undefined || v==='') return 0;
  if (typeof v === 'number') return v;
  var s = String(v).replace(/\./g,'').replace(',','.');
  var n = Number(s);
  return isNaN(n) ? 0 : n;
}
function ensureSheet_(name, headers){
  var s = sheetByName_(name) || ss_().insertSheet(name);
  if (s.getLastRow() === 0 && headers && headers.length){
    s.appendRow(headers);
  }
  return s;
}

// === Products & inventory (kept for compatibility) ===
function _listProducts(){
  const s = sheetByName_('Productos')
  const out = []
  if (s){
    const rows = s.getRange(2,1,Math.max(0,s.getLastRow()-1),10).getValues() // A..J
    for (let r of rows){
      const code = r[0], name = r[1], price = toNum_(r[2]||r[9]), stock = Number(r[4]||0);
      if (code) out.push({ code, name, price, stock })
    }
  }
  return { ok:true, items: out }
}
function _getInventory(){
  const s = sheetByName_('Productos'); const out=[]
  if (s){
    const rows = s.getRange(2,1,Math.max(0,s.getLastRow()-1),10).getValues()
    for (let r of rows){ const code=r[0], name=r[1]; if (code) out.push({ code, name, stock: Number(r[4]||0) }) }
  }
  return { ok:true, items: out }
}

// Payments (empty list placeholder)
function _listPayments(scope){
  return { ok:true, items: [] }
}

// Expenses types from "Gastos" historical descriptions
function _listExpenseTypes(){
  const s = sheetByName_('Gastos'); const set={}
  if (s){
    const rows = s.getRange(2,1,Math.max(0,s.getLastRow()-1),4).getValues()
    for (let r of rows){ const t=String(r[2]||'').trim(); if (t) set[t]=1 }
  }
  return { ok:true, items: Object.keys(set) }
}

// Add expense row
function _addExpense(data){
  const s = sheetByName_('Gastos') || ss_().insertSheet('Gastos')
  const now = new Date()
  s.getRange(s.getLastRow()+1,1,1,4).setValues([[now, Number(data.amount||0), String(data.descr||''), String(data.note||'')]])
  return { ok:true }
}

// ===================== NEW: Variants, search & sale ticket ======================
// Build a map from "Productos" with default sale price
function productMap_(){
  const s = sheetByName_('Productos'); const map={}
  if (!s) return map
  const rows = s.getRange(2,1,Math.max(0,s.getLastRow()-1),10).getValues()
  for (var i=0;i<rows.length;i++){
    var r=rows[i]; var code=r[0]; if (!code) continue
    map[String(code)] = { code: r[0], name: r[1]||String(code), price: toNum_(r[2]||r[9]), stock: toNum_(r[4]||0) }
  }
  return map
}

// Compute variant stock: purchases minus sales, grouped by code+color+size
function variantStockMap_(){
  var out = {}; // key = code|color|size
  var compras = sheetByName_('Compras')
  if (compras){
    var rows = compras.getRange(2,1,Math.max(0,compras.getLastRow()-1),12).getValues()
    for (var i=0;i<rows.length;i++){
      var r = rows[i]
      var code = String(r[8]||'').trim(); if (!code) continue
      var color = String(r[9]||'').trim(); var size = String(r[10]||'').trim()
      var qty = toNum_(r[3]||0)
      var k = code+'|'+color+'|'+size
      out[k] = (out[k]||0) + qty
    }
  }
  var ventas = sheetByName_('Ventas')
  if (ventas){
    var vrows = ventas.getRange(2,1,Math.max(0,ventas.getLastRow()-1),15).getValues()
    for (var j=0;j<vrows.length;j++){
      var v = vrows[j]
      var vcode = String(v[4]||'').trim(); if (!vcode) continue
      var vcolor = String(v[6]||'').trim(); var vsize = String(v[7]||'').trim()
      var vqty = toNum_(v[8]||0)
      var vk = vcode+'|'+vcolor+'|'+vsize
      out[vk] = (out[vk]||0) - vqty
    }
  }
  return out
}

function listVariantsForCode_(code){
  code = String(code)
  var map = productMap_()
  var p = map[code] || { code, name:String(code), price:0, stock:0 }
  var vmap = variantStockMap_()
  var out = []
  for (var k in vmap){
    if (k.indexOf(code+'|')===0){
      var parts = k.split('|'), color = parts[1]||'', size = parts[2]||''
      var stock = vmap[k]||0
      out.push({ code, name:p.name, color, size, stock, unitPrice: p.price })
    }
  }
  // Only keep positive stock variants, sort by stock desc
  out = out.filter(it=> (it.stock||0)>0).sort(function(a,b){ return (b.stock||0)-(a.stock||0) })
  return { ok:true, code, name:p.name, price:p.price, variants: out }
}

// Text search over "Productos" name/code and attach available variants
function searchProducts_(q){
  q = String(q||'').trim().toUpperCase()
  var map = productMap_(), vmap = variantStockMap_()
  var items = []
  for (var code in map){
    var p = map[code]; var hay = String(p.code).toUpperCase().indexOf(q)>=0 || String(p.name).toUpperCase().indexOf(q)>=0
    if (!q || hay){
      // Gather variants with stock > 0
      var vs=[]; for (var k in vmap){ if (k.indexOf(code+'|')===0){ var parts=k.split('|'); var st=vmap[k]||0; if (st>0) vs.push({ color:parts[1]||'', size:parts[2]||'', stock:st }) } }
      items.push({ code, name:p.name, price:p.price, stock:p.stock, variants:vs })
    }
  }
  // Order by total stock desc
  items.sort(function(a,b){ return (b.stock||0)-(a.stock||0) })
  return { ok:true, items: items }
}

// Register a sale ticket, update Productos stock and append lines to "Ventas"
function saleTicket_(data){
  var s = ensureSheet_('Ventas', ['Fecha','Ticket','ClienteNombre','ClienteID','Codigo','Producto','Color','Talla','Cantidad','PrecioUnitario','Desc%','PrecioOverride','TotalLinea','Credito','Vencimiento'])
  var now = new Date()
  var ticket = 'T'+now.getFullYear()+('0'+(now.getMonth()+1)).slice(-2)+('0'+now.getDate()).slice(-2)+'-'+now.getTime()
  var customerName = String(data.customerName||'')
  var customerId = String(data.customerId||'')
  var items = data.items||[]
  var credit = !!data.credit
  var dueDate = data.dueDate ? new Date(data.dueDate) : ''
  var rows = []
  var subtotal = 0
  for (var i=0;i<items.length;i++){
    var it = items[i]||{}
    var code = String(it.code||''); if (!code) continue
    var name = String(it.name||code)
    var qty = toNum_(it.qty||1)
    var unit = toNum_(it.unitPrice||0)
    var discountPct = toNum_(it.discountPct||0)
    var priceOverride = (it.priceOverride!==undefined && it.priceOverride!=='') ? toNum_(it.priceOverride) : null
    var finalUnit = priceOverride!=null ? priceOverride : (unit * (1 - discountPct/100))
    var lineTotal = finalUnit * qty
    subtotal += lineTotal
    rows.push([ now, ticket, customerName, customerId, code, name, String(it.color||''), String(it.size||''), qty, unit, discountPct, priceOverride, lineTotal, credit?1:0, dueDate ])
    try{ applySaleToStock_(code, qty) }catch(e){ /* stock write-back best effort */ }
  }
  if (rows.length) s.getRange(s.getLastRow()+1,1,rows.length,rows[0].length).setValues(rows)
  var discountMode = String(data.discountMode||'percent')
  var discountValue = toNum_(data.discountValue||0)
  var discountTotalValue = 0
  var discountTotalPct = 0
  if (discountMode === 'value'){
    discountTotalValue = Math.min(subtotal, Math.max(0, discountValue))
    discountTotalPct = subtotal ? (discountTotalValue / subtotal) * 100 : 0
  } else {
    discountTotalPct = Math.max(0, discountValue)
    discountTotalValue = subtotal * (discountTotalPct/100)
  }
  var total = Math.max(0, subtotal - discountTotalValue)
  return { ok:true, ticket, subtotal, discountTotalPct, discountTotalValue, total }
}

// === Web App ===
function doGet(e){
  const a = String(e.parameter.action||'').toLowerCase()
  if (a==='products') return ok_(_listProducts())
  if (a==='inventory') return ok_(_getInventory())
  if (a==='dashboard') return ok_(_getDashboard())
  if (a==='payments') return ok_(_listPayments(e.parameter.scope))
  if (a==='expensetypes') return ok_(_listExpenseTypes())
  if (a==='variants') return ok_(listVariantsForCode_(e.parameter.code))
  if (a==='search') return ok_(searchProducts_(e.parameter.q||''))
  return bad_('unknown action')
}

function doPost(e){
  const data = JSON.parse(e.postData.contents||'{}')
  const a = String((data.action||'')).toLowerCase()
  if (a==='expense') return ok_(_addExpense(data))
  if (a==='uploadpdf') return ok_(uploadPurchasePDF(data))
  if (a==='sale') return ok_(saleTicket_(data))
  return bad_('unknown action')
}
