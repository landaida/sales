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
    var vrows = ventas.getRange(2,1,Math.max(0,ventas.getLastRow()-1),14).getValues()
    for (var j=0;j<vrows.length;j++){
      var v = vrows[j]
      var vcode = String(v[3]||'').trim(); if (!vcode) continue
      var vcolor = String(v[5]||'').trim(); var vsize = String(v[6]||'').trim()
      var vqty = toNum_(v[7]||0)
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
// function saleTicket_(data){
//   var s = ensureSheet_('Ventas', ['Fecha','Ticket','Cliente','Codigo','Producto','Color','Talla','Cantidad','PrecioUnitario','Desc%','PrecioOverride','TotalLinea','Credito','Vencimiento'])
//   var now = new Date()
//   var ticket = 'T'+now.getFullYear()+('0'+(now.getMonth()+1)).slice(-2)+('0'+now.getDate()).slice(-2)+'-'+now.getTime()
//   var customer = String(data.customer||'')
//   var items = data.items||[]
//   var credit = !!data.credit
//   var dueDate = data.dueDate ? new Date(data.dueDate) : ''
//   var rows = []
//   var subtotal = 0
//   for (var i=0;i<items.length;i++){
//     var it = items[i]||{}
//     var code = String(it.code||''); if (!code) continue
//     var name = String(it.name||code)
//     var qty = toNum_(it.qty||1)
//     var unit = toNum_(it.unitPrice||0)
//     var discountPct = toNum_(it.discountPct||0)
//     var priceOverride = (it.priceOverride!==undefined && it.priceOverride!=='') ? toNum_(it.priceOverride) : null
//     var finalUnit = priceOverride!=null ? priceOverride : (unit * (1 - discountPct/100))
//     var lineTotal = finalUnit * qty
//     subtotal += lineTotal
//     rows.push([ now, ticket, customer, code, name, String(it.color||''), String(it.size||''), qty, unit, discountPct, priceOverride, lineTotal, credit?1:0, dueDate ])
//     try{ applySaleToStock_(code, qty) }catch(e){ /* stock write-back best effort */ }
//   }
//   if (rows.length) s.getRange(s.getLastRow()+1,1,rows.length,rows[0].length).setValues(rows)
//   var discountTotalPct = toNum_(data.discountTotalPct||0)
//   var total = subtotal * (1 - discountTotalPct/100)
//   return { ok:true, ticket, subtotal, discountTotalPct, total }
// }

// === Web App ===
function doGet(e){
  const a = String(e.parameter.action||'').toLowerCase()
  if (a==='products') return ok_(_listProducts())
  if (a==='inventory') return ok_(_getInventory())
  if (a==='dashboard') return ok_(_getDashboard())
  if (a==='payments') return ok_(_listPayments(e.parameter.scope))
  if (a==='expensetypes') return ok_(_listExpenseTypes())
  if (a==='variants') return ok_(listVariantsAvailable_(e.parameter.code))
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


// Build variant-level availability from Compras - Ventas.
// Sheets layout assumed:
// Compras: ... [ D=Qty, I=Codigo, J=Color, K=Talla ]
// Ventas:  ... [ E=Codigo, G=Color, H=Talla, I=Qty ]
function listVariantsAvailable_(){
  const cSh = SpreadsheetApp.getActive().getSheetByName('Compras');
  const vSh = SpreadsheetApp.getActive().getSheetByName('Ventas');
  const pSh = SpreadsheetApp.getActive().getSheetByName('Productos');
  const map = {}; // key 'code|color|size' -> { code, name, color, size, purchased, sold }

  if (cSh && cSh.getLastRow()>1){
    const rows = cSh.getRange(2,1,cSh.getLastRow()-1,12).getValues();
    rows.forEach(r=>{
      const code = String(r[8]||'').trim(); if(!code) return;
      const name = String(r[2]||'').trim();
      const color = String(r[9]||'').trim();
      const size  = String(r[10]||'').trim();
      const qty   = Number(r[3]||0);
      const k = [code,color,size].join('|');
      const v = map[k] || { code, name, color, size, purchased:0, sold:0 };
      v.purchased += qty;
      map[k]=v;
    });
  }

  if (vSh && vSh.getLastRow()>1){
    // Ventas header esperada: [Fecha,Ticket,ClienteNombre,ClienteId,Codigo,Producto,Color,Talla,Cantidad,...]
    const rows = vSh.getRange(2,1,vSh.getLastRow()-1,12).getValues();
    rows.forEach(r=>{
      const code = String(r[4]||'').trim(); if(!code) return;
      const name = String(r[5]||'').trim();
      const color= String(r[6]||'').trim();
      const size = String(r[7]||'').trim();
      const qty  = Number(r[8]||0);
      const k = [code,color,size].join('|');
      const v = map[k] || { code, name, color, size, purchased:0, sold:0 };
      v.sold += qty;
      map[k]=v;
    });
  }

  // precios base desde Productos (C=PrecioVenta, F=CostoPromedio, I=Markup%, J=PrecioSugerido)
  const priceByCode = {};
  if (pSh && pSh.getLastRow()>1){
    const rows = pSh.getRange(2,1,pSh.getLastRow()-1,10).getValues();
    rows.forEach(r=>{
      const code = String(r[0]||'').trim();
      priceByCode[code] = Number(r[2]||r[9]||0);
    });
  }

  const out = [];
  Object.keys(map).forEach(k=>{
    const v = map[k];
    const stock = (v.purchased||0) - (v.sold||0);
    if (stock<=0) return; // mostrar sólo variantes con stock positivo
    out.push({
      code: v.code,
      name: v.name || v.code,
      color: v.color,
      size:  v.size,
      stock: stock,
      defaultPrice: priceByCode[v.code]||0
    });
  });

  // orden: por código, luego talla, luego color
  out.sort((a,b)=> (a.code===b.code)
    ? (String(a.size).localeCompare(String(b.size)) || String(a.color).localeCompare(String(b.color)))
    : String(a.code).localeCompare(String(b.code)));

  return { ok:true, items: out };
}


// Register sale ticket and reduce product-level stock (Productos!E).
// Expected payload:
// { action:'sale', customer:{ name, id }, discountTotal?:number, dueDate?:'YYYY-MM-DD',
//   items:[ { code, name, color, size, qty, price } ] }
function saleTicket_(data){
  const cust = data.customer||{};
  const cname = String(cust.name||'').trim();
  const cid   = String(cust.id||'').trim();
  if (!cname || !cid) return { ok:false, error:'customer name and id required' };

  const items = data.items||[];
  if (!items.length) return { ok:false, error:'empty items' };

  const sh = ensureSheet_('Ventas',
    ['Fecha','TicketId','ClienteNombre','ClienteId','ProductoCodigo','Producto','Color','Talla','Cantidad','PrecioUnit','Subtotal','DescuentoTotal','Total','PagoTipo','Vencimiento']);
  const now = new Date();
  const ticketId = 'T-' + Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyyMMddHHmmss-') + Math.floor(Math.random()*1000);

  const discount = Number(data.discountTotal||0);
  const dueDate  = String(data.dueDate||'').trim(); // vacío = contado
  const payType  = dueDate ? 'credito' : 'contado';

  let subtotal = 0;
  const rows = [];
  items.forEach(it=>{
    const code = String(it.code||'').trim(); if (!code) return;
    const name = String(it.name||code);
    const color= String(it.color||'');
    const size = String(it.size||'');
    const qty  = Number(it.qty||0);
    const pu   = Number(it.price||0);
    const sub  = pu * qty;
    subtotal += sub;
    rows.push([now, ticketId, cname, cid, code, name, color, size, qty, pu, sub, discount, '', payType, dueDate]);
  });

  const total = subtotal - discount;
  // completar columna "Total" por visibilidad
  rows.forEach(r=> r[12]= total);

  if (rows.length) sh.getRange(sh.getLastRow()+1,1,rows.length,rows[0].length).setValues(rows);

  // reduce stock por producto (agregado)
  try{ items.forEach(it=> applySaleToStock_(String(it.code), Number(it.qty||0))); }catch(e){}

  // si es contado, registrar cobro
  if (!dueDate){
    const cob = ensureSheet_('Cobros', ['Fecha','TicketId','Cliente','Monto','Nota']);
    cob.appendRow([ now, ticketId, cname, total, 'auto' ]);
  }

  return { ok:true, ticketId, total, lines: items.length };
}
