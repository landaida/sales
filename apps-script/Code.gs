// === Code.gs ===
// Small JSON helpers
function ok_(obj){ return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON) }
function bad_(msg){ return ok_({ ok:false, error: String(msg) }) }

// Spreadsheet helpers
function ss_(){ return SpreadsheetApp.getActive() }
function sheetByName_(name){ return ss_().getSheetByName(name) }

/** @deprecated Use sheetByName_(name). Kept for backward-compat only. */
function sh_(name){ return sheetByName_(name); }


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
  if (a==='clients')  return ok_(searchClients_(String(e.parameter.q||'')));
  // if (a==='stockfast') return ok_(listStockFromProductos_());
  if (a==='stockfast')        return ok_(listStockFromProductos_());
  if (a==='purchase_history') return listPurchaseHistory_(e.parameter.cursor||0, e.parameter.limit||5);
  if (a==='purchase_details') return purchaseDetails_(String(e.parameter.factura||''));
  if (a==='cashbox')       return cashboxSummary_();
  if (a==='cashbox_moves') return cashboxMoves_(e.parameter.cursor||0, e.parameter.limit||10);
  if (a==='ar_by_client')  return arByClient_();
  if (a==='ar_details')    return arDetails_(String(e.parameter.client||'')); 
  if (a==='expenses_list') return expensesList_(e.parameter.cursor||0, e.parameter.limit||10);
  if (a==='receivables_pending') return receivablesPending_(e.parameter.cursor||0, e.parameter.limit||5);
  if (a==='receipts_history')  return receiptsHistory_(e.parameter.cursor||0, e.parameter.limit||5);
  return bad_('unknown action')
}

function doPost(e){
  const data = JSON.parse(e.postData.contents||'{}')
  const a = String((data.action||'')).toLowerCase()
  if (a==='expense') return ok_(_addExpense(data))
  if (a==='uploadpdf') return ok_(uploadPurchasePDF(data))
  if (a==='sale') return ok_(saleTicket_(data))
  if (a==='purchase_parse') return ok_(purchaseParse_(data));
  if (a==='purchase_save')  return ok_(purchaseSave_(data));
  if (a==='receivable_pay')return receivablePay_(d.ticketId, d.cuotaN, d.amount, d.note);
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

function s_(v){ return v==null?'':String(v) }

// Register sale ticket and reduce product-level stock (Productos!E).
// Expected payload:
// { action:'sale', customer:{ name, id }, discountTotal?:number, dueDate?:'YYYY-MM-DD',
//   items:[ { code, name, color, size, qty, price } ] }
function saleTicket_(data){
  var dueDate = s_(data.dueDate||''); 
  var payType = data?.down > 0  ? 'credito' : 'contado';
  const now = new Date();
  var ticketId = 'T-' + Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyyMMddHHmmss-') + Math.floor(Math.random()*1000);
  const cust = data.customer||{};
  const cname = String(cust.name||'').trim();
  const cid   = String(cust.id||'').trim();
  if (!cname || !cid) return { ok:false, error:'customer name and id required' };
  upsertClient_(cname, cid);   // <-- agrega/actualiza en hoja Clientes
  const items = data.items||[];
  if (!items.length) return { ok:false, error:'empty items' };

  const sh = ensureSheet_('Ventas', [
  'Fecha','Cliente','Producto','Cantidad','PrecioUnitario','Total','ImportePagado','Saldo','Estado',
  'CostoUnitario','CostoTotal','Utilidad','FacturaID','PrecioBase','PrecioOverride','DescLinea%','DescLinea$',
  'Rol','Codigo','Color','Talla','Vencimiento'
]);
const filas = []; let subtotal = 0;
items.forEach(it=>{
  const code = String(it.code||'').trim(); if(!code) return;
  const name = String(it.name||code);
  const color= String(it.color||'');
  const size = String(it.size||'');
  const qty  = Number(it.qty||0);
  const pu   = Number(it.price||0);
  const line = pu * qty; subtotal += line;
  // por cada línea
  var share = subtotal>0 ? (line/subtotal) : 0;
  var discShare = Math.round(Number(data.discountTotal||0) * share);
  // r[16] = discShare;   // DescLinea$ en tu layout
  filas.push([
    now,                       // Fecha
    cname,                     // Cliente (Nombre)
    name,                      // Producto
    qty, pu, line,             // Cantidad, PrecioUnitario, Total
    '', '', payType,         // ImportePagado, Saldo, Estado (ajustable)
    '', '', '',                // CostoUnitario, CostoTotal, Utilidad
    ticketId,                  // FacturaID (usamos ticket)
    pu, '', '', discShare,            // PrecioBase, PrecioOverride, DescLinea%, DescLinea$
    'venta',                   // Rol
    code, color, size,         // Codigo, Color, Talla
    dueDate                    // Vencimiento ('' si contado)
  ]);
});

  const total = subtotal - Number(data.discountTotal||0);
  // si es contado, registrar cobro por 'total'
  

  if (total <= 0) return { ok:false, error:'total must be > 0' };

  // completar columna "Total" por visibilidad
  filas.forEach(r=> r[12]= total);






  if (filas.length) sh.getRange(sh.getLastRow()+1,1,filas.length,filas[0].length).setValues(filas);

  // reduce stock por producto (agregado)
  try{ items.forEach(it=> applySaleToStock_(String(it.code), Number(it.qty||0))); }catch(e){}


  var mode=String(data.paymentMode||'contado').toLowerCase();
  var kind=String(data.creditKind||'mensual').toLowerCase();
  var n=Math.max(0, Number(data.numCuotas||0));
  var down=Number(data.downPayment||0);

  if (mode==='contado' || n===0){
    addCajaMov_('venta', ticketId, 'Venta contado', cname, '', total, 0);
  } else {
    if (down>0) addCajaMov_('venta', ticketId, 'Entrega inicial', cname, '', down, 0);
    var restante = Math.max(0, total-down);
    if (Array.isArray(data.installments) && data.installments.length > 0){
      data.installments.forEach(function(x,i){
        addInstallment_(ticketId, cname, Number(x.n||i+1), x.date||now, Number(x.amount||0));
      });
    } else if (restante>0 && n>0){
      var per = Math.floor(restante/n), resto = restante - per*n, base = new Date();
      for (var i=1;i<=n;i++){
        var d = new Date(base);
        if (kind==='semanal') d.setDate(d.getDate()+i*7); else d.setMonth(d.getMonth()+i);
        var monto = per + (i<=resto?1:0);
        addInstallment_(ticketId, cname, i, d, monto);
      }
    }
  }

  return { ok:true, ticketId, total, lines: items.length };
}


/** Clients sheet helper (keeps only name + id for now). */
function ensureClients_(){ return ensureSheet_('Clientes',['Nombre','Id','Telefono','Direccion','Nota']); }

/** Search clients by name or id (contains; supports AND by spaces). */
function searchClients_(q){
  q = String(q||'').trim().toUpperCase();
  var sh = ensureClients_(), out=[];
  if (sh.getLastRow()>1){
    var rows = sh.getRange(2,1,sh.getLastRow()-1,2).getValues();
    var terms = q ? q.split(/\s+/).filter(Boolean) : [];
    rows.forEach(function(r){
      var name = String(r[0]||''), id = String(r[1]||'');
      var H = (name+' '+id).toUpperCase();
      var ok = !terms.length || terms.every(t=> H.indexOf(t)>=0);
      if (ok) out.push({ name, id });
    });
  }
  return { ok:true, items: out };
}

/** Upsert client by name/id (update if same id or same name exists). */
function upsertClient_(name,id){
  var sh = ensureClients_();
  var nameU = String(name||'').trim().toUpperCase();
  var idU   = String(id||'').trim().toUpperCase();
  if (sh.getLastRow()>1){
    var rows = sh.getRange(2,1,sh.getLastRow()-1,2).getValues();
    for (var i=0;i<rows.length;i++){
      var r = rows[i], n=String(r[0]||'').toUpperCase(), d=String(r[1]||'').toUpperCase();
      if (d===idU || n===nameU){
        sh.getRange(i+2,1,1,2).setValues([[name,id]]);
        return i+2;
      }
    }
  }
  sh.appendRow([name,id,'','','']);
  return sh.getLastRow();
}

/** List variants using product-level stock only (Productos!E).
 *  This returns one row per code (no color/size granularity) and is meant for performance in the button grid. */
// function listStockFromProductos_(){
//   var sh = sheetByName_('Productos');
//   var out=[];
//   if (sh && sh.getLastRow()>1){
//     var rows = sh.getRange(2,1,Math.max(0,sh.getLastRow()-1),10).getValues(); // A..J
//     rows.forEach(function(r){
//       var code = String(r[0]||'').trim();
//       if (!code) return;
//       out.push({
//         code: code,
//         name: String(r[1]||code),
//         stock: Number(r[4]||0),
//         defaultPrice: Number(r[2]||r[9]||0) // C=PrecioVenta, J=PrecioSugerido
//       });
//     });
//   }
//   return { ok:true, items: out };
// }


/** Ensure 'ACobrar' sheet with this header. */
function ensureACobrar_(){
  return ensureSheet_('ACobrar', [
    'TicketId','Cliente','CuotaN','FechaCuota','MontoCuota','Estado','Nota'
  ]);
}

/** Generate installment plan rows (not paid yet).
 *  kind: 'mensual'|'semanal'; n: number of installments; startDate: new Date(); total: number */
/** Add a single installment row into ACobrar. */
function addInstallment_(ticketId, cliente, n, fecha, monto){
  var sh = ensureACobrar_();
  var f  = (fecha instanceof Date) ? fecha : new Date(fecha);
  sh.appendRow([
    String(ticketId||''), String(cliente||''), Number(n||0),
    f, Number(monto||0), 'pendiente', ''
  ]);
}



/** Save base64 PDF to Drive and return { fileId, url } */
function savePdfToDrive_(b64, filename){
  var blob = Utilities.newBlob(Utilities.base64Decode(b64), 'application/pdf', filename||'compra.pdf');
  var file = DriveApp.createFile(blob);
  return { fileId: file.getId(), url: 'https://drive.google.com/file/d/'+file.getId()+'/view' };
}

/** OCR to plain text using Advanced Drive Service (enable Drive API advanced). */
function ocrTextFromPdfFile_(fileId){
  if (!Drive || !Drive.Files) throw new Error('Enable Advanced Drive API (Services > Drive API)');
  var meta = { title: 'ocr-'+fileId, mimeType:'application/vnd.google-apps.document' };
  var gdoc = Drive.Files.copy(meta, fileId, { ocr:true, ocrLanguage:'pt' });
  var text = DocumentApp.openById(gdoc.id).getBody().getText();
  try{ DriveApp.getFileById(gdoc.id).setTrashed(true); }catch(_){}
  return text || '';
}

/** Parse purchase without saving: returns editable draft lines. */
function purchaseParse_(data){
  var saved = savePdfToDrive_(data.b64, data.filename||'compra.pdf');
  var raw   = ocrTextFromPdfFile_(saved.fileId);
  var H     = raw.toUpperCase();

  // detect supplier only if not provided
  var supplier = String(data.supplier||'').toUpperCase();
  if (!supplier){
    if (H.indexOf('OXYRIO CONFECCOES')>=0) supplier='OXYRIO CONFECCOES LTDA';
    else if (H.indexOf('VITALLY')>=0)      supplier='VITALLY';
    else if (H.indexOf('GABY MODAS')>=0)   supplier='GABY MODAS';
    else supplier='UNKNOWN';
  }

  // call your proven vendor parser (e.g., parseOXYRIO_)
  var items = [];
  if (supplier==='OXYRIO CONFECCOES LTDA' && typeof parseOXYRIO_==='function') items = parseOXYRIO_(raw);

  // normalize (unitCostRS=vendor currency, BRL)
  items = (items||[]).map(function(it){
    return {
      code:String(it.code||''), name:String(it.name||''),
      color:String(it.color||''), size:String(it.size||''),
      barcode:String(it.barcode||''), qty:Number(it.qty||1),
      // unitCostRS:Number(it.unitCost||0)
      unitCostRS: Number(it.unitCost != null ? it.unitCost : (it.costUnit != null ? it.costUnit : 0))

    };
  });

  return { ok:true, supplier:supplier, fileId:saved.fileId, fileUrl:saved.url, items:items, ocrSample:raw };
}


function purchaseSave_(data){
  var sh = ensureSheet_('Compras', [
    'Fecha','Proveedor','Producto','Cantidad','CostoUnitario','Total','Factura','Nota',
    'Codigo','Color','Talla','CodigosBarras',
    'CostoUnitarioRS','TotalRS','TCambio','PdfFileId'
  ]);
  var now   = new Date();
  var rate  = Number(data.exchangeRate||1340);             // BRL → Gs
  var fact  = String(data.invoice||data.filename||'');
  var supp  = String(data.supplier||'');
  var fileId= String(data.fileId||'');
  var items = data.items||[];
  var purchaseTotal = 0;

  var rows=[];
  (items||[]).forEach(function(it){
    var unitGs = Number(it.unitCostRS||0) * rate;
    var totalGs= unitGs * Number(it.qty||0);
    // acumula total de la factura en Gs
    purchaseTotal += totalGs;
    // var salePrice = Number(it.salePriceGs||0) > 0 ? Number(it.salePriceGs) : (2 * unitGs);
    var salePrice = Number(it.salePriceGs||0) > 0 
      ? Number(it.salePriceGs) 
      : suggestPriceFromUnitRS_(it.unitCostRS, rate);
    rows.push([
      now, supp, String(it.name||''), Number(it.qty||0), unitGs, totalGs, fact, '',
      String(it.code||''), String(it.color||''), String(it.size||''), String(it.barcode||''),
      Number(it.unitCostRS||0), Number(it.unitCostRS||0)*Number(it.qty||0), rate, fileId
    ]);
    updateProductOnPurchase_(String(it.code||''), String(it.name||''), Number(it.qty||0), unitGs, String(it.color||''), String(it.size||''), salePrice);
  });

  if (rows.length) sh.getRange(sh.getLastRow()+1,1,rows.length,rows[0].length).setValues(rows);
  // NUEVO: egreso por compra
  if (purchaseTotal>0) addCajaMov_('compra', fact||fileId, 'Compra '+(fact||''), '', supp, 0, purchaseTotal);
  return { ok:true, saved: rows.length };
}

/** Update product: stock += qty, avg cost, last cost, sale price (avg with prev). Also keep last color/size if columns exist. */
// Add param salePriceGs
function updateProductOnPurchase_(code, name, qty, unitCostGs, color, size, salePriceGs){
  var s = sheetByName_('Productos'); if (!s) throw new Error('Productos missing');
  var last = s.getLastRow(), row = -1;

  if (last>1){
    var idx = s.getRange(2,1,last-1,1).getValues();
    for (var i=0;i<idx.length;i++){ if (String(idx[i][0])===String(code)){ row=i+2; break; } }
  }
  if (row<0){
    row = s.getLastRow()+1;
    // [A]Codigo,[B]Nombre,[C]PrecioVenta,[D]Unidad,[E]Stock,[F]CostoProm,[G]Activo,[H]UltimoCosto,[I]Markup%,[J]PrecioSugerido
    s.getRange(row,1,1,10).setValues([[ String(code), name||code, 0, '', 0, 0, 1, unitCostGs, 0, 0 ]]);
  }

  var stock   = Number(s.getRange(row,5).getValue()||0);
  var prevPV  = Number(s.getRange(row,3).getValue()||0);
  var prevAvg = Number(s.getRange(row,6).getValue()||0);

  // Weighted avg
  var newAvg = (stock>0) ? ((prevAvg*stock + unitCostGs*qty)/(stock+qty)) : unitCostGs;
  s.getRange(row,6).setValue(newAvg);        // F: CostoPromedio
  s.getRange(row,8).setValue(unitCostGs);    // H: UltimoCosto
  s.getRange(row,5).setValue(stock + qty);   // E: Stock

  // Sale price: prefer provided salePrice, else avg with cost, but we already pass 2x by default
  var newPV = (Number(salePriceGs||0) > 0) ? Number(salePriceGs)
             : ((stock>0 && prevPV>0) ? ((prevPV + unitCostGs)/2) : unitCostGs);

  s.getRange(row,3).setValue(newPV);         // C: PrecioVenta
  try { s.getRange(row,10).setValue(newPV); }catch(e){}     // J: PrecioSugerido
  try { var markup = (newPV>0 && newAvg>0) ? ((newPV - newAvg)/newAvg*100) : 0;
        s.getRange(row,9).setValue(markup); } catch(e){}    // I: Markup%

  // Optional: keep last Color/Talla in K/L if exist
  var totalCols = s.getMaxColumns();
  if (totalCols>=12){
    s.getRange(row,11).setValue(String(color||'')); // K Color
    s.getRange(row,12).setValue(String(size||''));  // L Talla
  }
}



/** Last headers by factura/pdf, newest first. */
function listPurchaseHistory_(cursor, limit){
  cursor = Math.max(0, Number(cursor||0));
  limit  = Math.max(1, Number(limit||5));
  var sh = sheetByName_('Compras'); if (!sh || sh.getLastRow()<=1) return ok_({ ok:true, items:[], next:null });
  var rows = sh.getRange(2,1,sh.getLastRow()-1,16).getValues(); rows.reverse();
  var seen={}, out=[], count=0;
  for (var i=cursor; i<rows.length && out.length<limit; i++){
    var r=rows[i], factura=String(r[6]||''), fileId=String(r[15]||'');
    var key=fileId||factura; if (seen[key]) continue; seen[key]=1;
    out.push({ date:r[0], supplier:r[1], factura:factura, fileId:fileId,
               fileUrl: fileId?('https://drive.google.com/file/d/'+fileId+'/view'):'', totalGs:Number(r[5]||0) });
    count++;
  }
  var next = (cursor+count < rows.length) ? (cursor+count) : null;
  return ok_({ ok:true, items: out, next: next });
}

function purchaseDetails_(factura){
  var sh = sheetByName_('Compras'); if (!sh || sh.getLastRow()<=1) return ok_({ ok:true, items:[] });
  var rows = sh.getRange(2,1,sh.getLastRow()-1,16).getValues(), out=[];
  rows.forEach(function(r){
    if (String(r[6]||'')===String(factura)){
      out.push({ code:r[8], product:r[2], color:r[9], size:r[10], qty:r[3],
                 unitGs:r[4], totalGs:r[5], unitRS:r[12], totalRS:r[13], rate:r[14] });
    }
  });
  return ok_({ ok:true, items: out });
}

/** One item per product code from Productos!E (fast) */
function listStockFromProductos_(){
  var sh = sheetByName_('Productos'), out=[];
  if (sh && sh.getLastRow()>1){
    var rows = sh.getRange(2,1,sh.getLastRow()-1,12).getValues();
    rows.forEach(function(r){
      var code = String(r[0]||'').trim(); if (!code) return;
      out.push({ code:code, name:String(r[1]||code), stock:Number(r[4]||0), defaultPrice:Number(r[2]||r[9]||0), color:String(r[10]), size:String(r[11]) });
    });
  }
  return { ok:true, items: out };
}

// Pretty-pricing for Guaraníes with slight upward bias near 20k/80k.
function prettyPriceGs_(x){
  x = Math.max(0, Number(x||0));
  var base = Math.floor(x/100000)*100000;    // chunk de 100k
  var r = x - base;                           // resto dentro del chunk

  // Breakpoints (en Gs) entre endings preferidos del chunk:
  var B0_20   = 10000;  // 0 <-> 20k   (mitad en 10k)
  var B20_30  = 23000;  // 20 <-> 30k  (sesgo a 30k)
  var B30_50  = 40000;  // 30 <-> 50k
  var B50_70  = 60000;  // 50 <-> 70k
  var B70_80  = 75000;  // 70 <-> 80k
  var B80_100 = 88000;  // 80 <-> 100k (sesgo a 100k)

  var off;
  if (r < B0_20)        off = 0;
  else if (r < B20_30)  off = 20000;
  else if (r < B30_50)  off = 30000;
  else if (r < B50_70)  off = 50000;
  else if (r < B70_80)  off = 70000;
  else if (r < B80_100) off = 80000;
  else                  off = 100000;

  return off===100000 ? base + 100000 : base + off;
}

// Wrapper: 2 × (Unit R$ × Tasa) y luego pretty-round.
function suggestPriceFromUnitRS_(unitCostRS, rate){
  var unitGs = Number(unitCostRS||0) * Number(rate||0);
  return prettyPriceGs_(2 * unitGs);
}

function ensureCaja_(){ return ensureSheet_('Caja',
  ['Fecha','Tipo','Ref','Descripcion','Cliente','Proveedor','IngresoGs','EgresoGs']); }
function addCajaMov_(tipo, ref, descr, cliente, proveedor, ingreso, egreso){
  ensureCaja_().appendRow([new Date(), String(tipo||''), String(ref||''), String(descr||''),
    String(cliente||''), String(proveedor||''), Number(ingreso||0), Number(egreso||0)]);
}

function cashboxSummary_(){
  var caja = sheetByName_('Caja'), ac = sheetByName_('ACobrar');
  var in_ = 0, out_ = 0, porCobrar = 0;
  if (caja && caja.getLastRow()>1){
    caja.getRange(2,1,caja.getLastRow()-1,8).getValues()
      .forEach(r=>{ in_+=Number(r[6]||0); out_+=Number(r[7]||0); });
  }
  if (ac && ac.getLastRow()>1){
    ac.getRange(2,1,ac.getLastRow()-1,7).getValues()
      .forEach(r=>{ if(String(r[5]||'pendiente').toLowerCase()!=='pagado') porCobrar+=Number(r[4]||0); });
  }
  return ok_({ ok:true, cashOnHand: in_-out_, receivablesTotal: porCobrar });
}
function cashboxMoves_(cursor, limit){
  cursor=Math.max(0,Number(cursor||0)); limit=Math.max(1,Number(limit||10));
  var sh=sheetByName_('Caja'); if(!sh||sh.getLastRow()<=1) return ok_({ ok:true, items:[], next:null });
  var rows=sh.getRange(2,1,sh.getLastRow()-1,8).getValues(); rows.reverse();
  var out=[], n=0; for (var i=cursor;i<rows.length && out.length<limit;i++){
    var r=rows[i]; out.push({ date:r[0], tipo:r[1], ref:r[2], descr:r[3],
      cliente:r[4], proveedor:r[5], ingreso:Number(r[6]||0), egreso:Number(r[7]||0) }); n++; }
  return ok_({ ok:true, items:out, next:(cursor+n<rows.length)?cursor+n:null });
}
function arByClient_(){
  var sh=sheetByName_('ACobrar'), map={}; if (sh&&sh.getLastRow()>1){
    sh.getRange(2,1,sh.getLastRow()-1,7).getValues().forEach(r=>{
      if (String(r[5]||'pendiente').toLowerCase()!=='pagado') map[r[1]]=(map[r[1]]||0)+Number(r[4]||0);
    });
  }
  var out=Object.keys(map).map(k=>({cliente:k,total:map[k]})).sort((a,b)=>b.total-a.total);
  return ok_({ ok:true, items: out });
}
function arDetails_(client){
  var sh=sheetByName_('ACobrar'), out=[]; if (sh&&sh.getLastRow()>1){
    sh.getRange(2,1,sh.getLastRow()-1,7).getValues()
      .forEach(r=>{ if(String(r[1]||'')===String(client)) out.push(
        { ticketId:r[0], cuota:r[2], fecha:r[3], monto:r[4], estado:r[5], nota:r[6] }); });
  }
  return ok_({ ok:true, items: out });
}

function expensesList_(cursor, limit){
  var sh=sheetByName_('Gastos'); if(!sh||sh.getLastRow()<=1) return ok_({ok:true,items:[],next:null});
  cursor=Math.max(0,Number(cursor||0)); limit=Math.max(1,Number(limit||5));
  var rows=sh.getRange(2,1,sh.getLastRow()-1,4).getValues(); rows.reverse();
  var out=[], c=0; for(var i=cursor;i<rows.length&&out.length<limit;i++){ var r=rows[i];
    out.push({date:r[0], amount:Number(r[1]||0), descr:String(r[2]||''), note:String(r[3]||'')}); c++; }
  return ok_({ok:true,items:out,next:(cursor+c<rows.length)?cursor+c:null});
}

// ---------- Receivables (pending, partial pay, history) ----------
function receivablesPending_(cursor, limit){
  var sh=ensureACobrar_(); if(sh.getLastRow()<=1) return ok_({ok:true,items:[],next:null});
  cursor=Math.max(0,Number(cursor||0)); limit=Math.max(1,Number(limit||5));
  var rows=sh.getRange(2,1,sh.getLastRow()-1,7).getValues()
    .filter(function(r){ return String(r[5]||'pendiente').toLowerCase()!=='pagado'; })
    .sort(function(a,b){ return new Date(a[3]) - new Date(b[3]); }) // asc by due
    .reverse(); // newest first for paging
  var out=[], c=0; for(var i=cursor;i<rows.length && out.length<limit;i++){ var r=rows[i];
    out.push({ ticketId:r[0], cliente:r[1], cuota:r[2], fecha:r[3], monto:Number(r[4]||0), estado:r[5] }); c++; }
  return ok_({ok:true,items:out,next:(cursor+c<rows.length)?cursor+c:null});
}
function ensureCobros_(){ return ensureSheet_('Cobros',['Fecha','TicketId','Cliente','Monto','Nota']); }
function receivablePay_(ticketId, cuotaN, amount, note){
  var sh=ensureACobrar_(), rows=sh.getRange(2,1,sh.getLastRow()-1,7).getValues(), idx=-1;
  for(var i=0;i<rows.length;i++){ if(String(rows[i][0])===String(ticketId) && Number(rows[i][2]||0)===Number(cuotaN)){ idx=i+2; break; } }
  if(idx<0) return ok_({ ok:false, error:'cuota not found' });
  var monto=Number(sh.getRange(idx,5).getValue()||0), pago=Math.max(0, Number(amount||0));
  var cliente=String(sh.getRange(idx,2).getValue()||'');
  if (pago<=0) return ok_({ ok:false, error:'amount<=0' });
  if (pago >= monto){ sh.getRange(idx,5,1,2).setValues([[0,'pagado']]); }
  else { sh.getRange(idx,5).setValue(monto - pago); }
  ensureCobros_().appendRow([ new Date(), ticketId, cliente, pago, String(note||'parcial') ]);
  addCajaMov_('cobro', ticketId, 'Cobro cuota '+cuotaN, cliente, '', pago, 0);
  return ok_({ ok:true });
}
function receiptsHistory_(cursor, limit){
  var sh=ensureCobros_(); if(sh.getLastRow()<=1) return ok_({ok:true,items:[],next:null});
  cursor=Math.max(0,Number(cursor||0)); limit=Math.max(1,Number(limit||5));
  var rows=sh.getRange(2,1,sh.getLastRow()-1,5).getValues(); rows.reverse();
  var out=[], c=0; for(var i=cursor;i<rows.length && out.length<limit;i++){ var r=rows[i];
    out.push({date:r[0], ticketId:r[1], cliente:r[2], monto:Number(r[3]||0), nota:r[4]}); c++; }
  return ok_({ok:true,items:out,next:(cursor+c<rows.length)?cursor+c:null});
}