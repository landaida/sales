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
// function _addExpense(data){
//   const s = sheetByName_('Gastos') || ss_().insertSheet('Gastos')
//   const now = new Date()
//   s.getRange(s.getLastRow()+1,1,1,4).setValues([[now, Number(data.amount||0), String(data.descr||''), String(data.note||'')]])
//   return { ok:true }
// }

function _addExpense(data){
  const s = sheetByName_('Gastos') || ss_().insertSheet('Gastos');
  const now = new Date();
  const amount = Number(data.amount||0);
  const descr  = String(data.descr||'');
  const note   = String(data.note||'');
  s.getRange(s.getLastRow()+1,1,1,4).setValues([[now, amount, descr, note]]);
  if (amount>0){
    // Registrar movimiento en Caja (espeja también a Caja-YYYY-MM y calcula saldo)
    addCajaMov_(
      'gasto',
      'GX-'+Utilities.formatDate(now, Session.getScriptTimeZone(),'yyyyMMddHHmmss'),
      descr,
      '', '', 
      0, amount,
      { subtotal:0, descuento:0, entrega:0, aplazo:0 }
    );
  }
  return { ok:true };
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
  // if (a==='stockfast') return ok_(listStockFastFromProductos_());
  if (a==='stockfast')        return listStockFastFromProductos_(e.parameter.cursor||0, e.parameter.limit||5, e.parameter.showWithoutStock, e.parameter.filterText);
  if (a==='purchase_history') return listPurchaseHistory_(e.parameter.cursor||0, e.parameter.limit||5);
  if (a==='purchase_details') return purchaseDetails_(String(e.parameter.factura||''));
  if (a==='cashbox')       return cashboxSummary_();
  if (a==='cashbox_moves') return cashboxMoves_(e.parameter.cursor||0, e.parameter.limit||10);
  if (a==='ar_by_client')  return arByClient_(e.parameter.cursor||0, e.parameter.limit||5);
  if (a==='ar_details')    return arDetails_(String(e.parameter.client||'')); 
  if (a==='expenses_list') return expensesList_(e.parameter.cursor||0, e.parameter.limit||10);
  if (a==='receivables_pending') return receivablesPending_(e.parameter.cursor||0, e.parameter.limit||5);
  if (a==='receipts_history')  return receiptsHistory_(e.parameter.cursor||0, e.parameter.limit||5);
  if (a==='sales_history')    return listSalesHistory_(e.parameter.cursor||0, e.parameter.limit||5);
  if (a==='sale_details')     return saleDetails_(String(e.parameter.ticket||''));
  if (a==='cash_income_history') return cashIncomeHistory_(e.parameter.cursor||0, e.parameter.limit||5);
  if (a==='adjust_list')  return adjustList_(e.parameter.cursor||0, e.parameter.limit||10);
  if (a==='payables_pending') return payablesPending_(e.parameter.cursor||0, e.parameter.limit||5);
  if (a==='payments_history') return paymentsHistory_(e.parameter.cursor||0, e.parameter.limit||5);
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
  if (a==='receivable_pay')return receivablePay_(data.ticketId, data.cuotaN, data.amount, data.note);
  if (a==='cash_income')  return cashIncome_(data);
  if (a==='adjust_apply') return adjustApply_(String(data.moveId||''));
  if (a==='payable_pay') return ok_(payablePay_(data.refId, data.cuotaN, data.amount, data.note));
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
  var now=new Date(), cust=data.customer||{};
  var cname=String(cust.name||'').trim(), cid=String(cust.id||'').trim();
  if(!cname||!cid) return { ok:false, error:'customer required' };

  upsertClient_(cname, cid)
  var items=data.items||[]; if(!items.length) return { ok:false, error:'empty items' };
  var discountTotal=Number(data.discountTotal||0);

  var sh = ensureSheet_('Ventas',[
    'Fecha','Cliente','Producto','Cantidad','PrecioUnitario','Total','ImportePagado','Saldo','Estado',
    'CostoUnitario','CostoTotal','Utilidad','FacturaID','PrecioBase','PrecioOverride','DescLinea%','DescLinea$',
    'Rol','Codigo','Color','Talla','Vencimiento'
  ]);
  var ticketId='T-'+Utilities.formatDate(now,Session.getScriptTimeZone(),'yyyyMMddHHmmss-')+Math.floor(Math.random()*1000);

  var subtotal=0; items.forEach(it=> subtotal += Number(it.price||0)*Number(it.qty||0));
  var total=Math.max(0, subtotal - discountTotal);
  if(total<=0) return {ok:false,error:'total<=0'};

  var filas=[];
  items.forEach(function(it){
    var code=String(it.code||''); if(!code) return;
    var name=String(it.name||code);
    var qty=Number(it.qty||0), pu=Number(it.price||0), line=pu*qty;
    var share=subtotal>0?(line/subtotal):0, discShare=Math.round(discountTotal*share);
    filas.push([ now,cname,name,qty,pu,line,'','', 'contado','', '', '', ticketId, pu,'','',discShare,'venta',code,String(it.color||''),String(it.size||''),'' ]);
    try{ applySaleToStock_(code, qty) }catch(_){}
  });
  sh.getRange(sh.getLastRow()+1,1,filas.length,filas[0].length).setValues(filas);
  var start = sh.getLastRow() - filas.length + 1;
  ticketIndexPut_(ticketId, start, filas.length);

  var mode=String(data.paymentMode||'contado').toLowerCase();
  var n=Math.max(0, Number(data.numCuotas||0));
  var kind=String(data.creditKind||'mensual').toLowerCase();
  var down=Math.max(0, Number(data.downPayment||0));
  var aplazo=Math.max(0, total - down);

  if (mode==='contado' || n===0){
    addCajaMov_('venta', ticketId, 'Venta contado', cname, '', total, 0, {subtotal:subtotal, descuento:discountTotal, entrega:total, aplazo:0});
  } else {
    if (down>0) addCajaMov_('venta', ticketId, 'Entrega inicial', cname, '', down, 0, {subtotal:subtotal, descuento:discountTotal, entrega:down, aplazo:aplazo});
    if (Array.isArray(data.installments) && data.installments.length>0){
      data.installments.forEach(function(x,i){ addInstallment_(ticketId,cname,Number(x.n||i+1),x.date||now,Number(x.amount||0)); });
    } else if (aplazo>0 && n>0){
      var per=Math.floor(aplazo/n), resto=aplazo-per*n, base=new Date(now);
      for (var i=1;i<=n;i++){ var d=new Date(base); if(kind==='semanal') d.setDate(d.getDate()+i*7); else d.setMonth(d.getMonth()+i);
        addInstallment_(ticketId,cname,i,d, per + (i<=resto?1:0)); }
    }
    // Materialize AR at client level (increment outstanding)
    try{ upsertReceivable_(cid, cname, Math.max(0, total - (down||0))); }catch(e){}
  }
  return { ok:true, ticketId, subtotal, discountTotal, total, down, aplazo };
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



/** Ensure 'ACobrar' sheet with this header. */
function ensureACobrar_(){ 
  return ensureSheet_('ACobrar',['TicketId','Cliente','CuotaN','FechaCuota','MontoCuota','Estado','Nota']); 
}

/** Generate installment plan rows (not paid yet).
 *  kind: 'mensual'|'semanal'; n: number of installments; startDate: new Date(); total: number */
/** Add a single installment row into ACobrar. */
function addInstallment_(ticketId, cliente, n, fecha, monto){
  ensureACobrar_().appendRow([
    String(ticketId||''), String(cliente||''), Number(n||0),
    (fecha instanceof Date)?fecha:new Date(fecha), Number(monto||0), 'pendiente', ''
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
  raw = normalizePurchaseOCRText_(raw);
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
  if (supplier==='OXYRIO CONFECCOES LTDA')  items = parseOXYRIO_(raw, 'PZ');
  else if (supplier==='GABY MODAS')        items = parseGABYMODAS_(raw);
  else if (supplier==='VITALLY')           items = parseVITALLY_(raw);

  if (!items || !items.length)
    return { ok:false, error:'Layout no reconocido o sin ítems.', ocrSample:raw}; // evita el popup genérico

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
function listStockFastFromProductos_(cursor, limit, showWithoutStock, filterText){
  var showZeros = (String(showWithoutStock).toLowerCase() === 'true' || showWithoutStock === true || String(showWithoutStock) === '1');
  const terms = filterText.trim().toUpperCase().split(/\s+/).filter(Boolean);

  cursor=Math.max(0,Number(cursor||0)); limit=Math.max(1,Number(limit||5));
  var sh=ensureSheet_('Productos',[]); 
  if(sh.getLastRow()<=1) 
    return ok_({ok:true,items:[],next:null});

  var {items, next} = _scanFromBottom_({sh, lastCol:12, cursor, limit, pageSize:100, rowHandler:(r, items)=>{
    var stock=Number(r[4]||0), code = String(r[0]||'').trim();
    if(!code || (!showZeros && stock === 0)) return; 
    
    var name=String(r[1]||code), defaultPrice=Number(r[2]||r[9]||0), color=String(r[10]), size=String(r[11]);    
    const codeUpper = code.toUpperCase(), nameUpper = name.toUpperCase(), sizeUpper = size.toUpperCase(), colorUpper = color.toUpperCase();

    const filtered = !terms || terms.length === 0 || (terms && terms.length > 0 && terms.every(t => codeUpper.includes(t) || nameUpper.includes(t) || sizeUpper.includes(t) || colorUpper.includes(t)))
    if(!filtered) return;
    items.push({ code, name, stock, defaultPrice, color, size});    
  }});
  // var next=(scan<rows.length)? scan : null;         // <<-- puntero scan
  return ok_({ ok:true, items, next });
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

function ensureCaja_(){
  var sh = ensureSheet_('Caja', ['Fecha','Tipo','Ref','Descripcion','Cliente','Proveedor','IngresoGs','EgresoGs']);
  // Extiende encabezado si faltan I..L
  if (sh.getLastRow()===1 && sh.getLastColumn()<12){
    sh.getRange(1,9,1,4).setValues([['SubtotalGs','DescuentoGs','EntregaGs','APlazoGs']]);
  } else if (sh.getRange(1,9).getValue()===''){
    sh.getRange(1,9,1,4).setValues([['SubtotalGs','DescuentoGs','EntregaGs','APlazoGs']]);
  }
  return sh;
}

function addCajaMov_(tipo, ref, descr, cliente, proveedor, ingreso, egreso, meta){
  // Keep original behavior + running balance + monthly mirror
  cajaEnsureExtended_();
  return cajaAppendWithBalance_(tipo, ref, descr, cliente, proveedor, ingreso, egreso, meta);
}

function cashboxSummary_(){
  cajaEnsureExtended_();
  var sh = SpreadsheetApp.getActive().getSheetByName('Caja');
  if(!sh||sh.getLastRow()<=1) return ok_({ ok:true, cashOnHand: 0, receivablesTotal:0, payablesTotal:0 });

  var cashOnHand = Number(sh.getRange(sh.getLastRow(), 13).getValue()||0); // BalanceAfterGs
  var ar = Number(sh.getRange(sh.getLastRow(), 16).getValue()||0); //ReceivablesAfterGs
  var payablesTotal = Number(sh.getRange(sh.getLastRow(), 17).getValue()||0); //PayablesAfterGs

  return ok_({ ok:true, cashOnHand: cashOnHand, receivablesTotal: ar, payablesTotal });
}

function cashboxMoves_(cursor, limit){
  cursor=Math.max(0,Number(cursor||0)); limit=Math.max(1,Number(limit||10));
  var sh=sheetByName_('Caja'); 
  if(!sh||sh.getLastRow()<=1) return ok_({ ok:true, items:[], next:null });
  // var rows=sh.getRange(2,1,sh.getLastRow()-1,12).getValues(); rows.reverse();
  // var out=[], n=0; 

  var {items, next} = _scanFromBottom_({sh, lastCol:16, cursor, limit, pageSize:100, rowHandler:(r, items)=>{
  // for (var i=cursor;i<rows.length && out.length<limit;i++){
    // var r=rows[i]; 
    items.push({ date:r[0], tipo:r[1], ref:r[2], descr:r[3],
      cliente:r[4], proveedor:r[5], ingreso:Number(r[6]||0), egreso:Number(r[7]||0), subtotal:Number(r[8]||0), descuento:Number(r[9]||0), entrega:Number(r[10]||0), aplazo:Number(r[11]||0), status: String(r[14]||'').trim() || 'activo' }); 
      // n++; 
  // }
  }});
  return ok_({ ok:true, items, next });
}
function arByClient_(cursor, limit){

  cursor=Math.max(0,Number(cursor||0)); limit=Math.max(1,Number(limit||5));
  var sh=ensureSheet_('ACobrar',[]), map={}; 
  if(sh.getLastRow()<=1) 
    return ok_({ok:true,items:[],next:null});

  var rows=sh.getRange(2,1,sh.getLastRow()-1,7).getValues();
  var bf = rows?.length
  rows = rows.filter(r=> String(r[5]||'pendiente').toLowerCase()!=='pagado')
  var af = rows?.length
  rows.reverse();
  //group ACobrar by customer
  rows.forEach(r=> map[r[1]]=(map[r[1]]||0)+Number(r[4]||0))

  // object to array
  rows=Object.keys(map)
  .map(k=>({cliente:k,total:map[k]}))
  .sort((a,b)=>b.total-a.total);

  var am=rows.length

  var seen={}, out=[], scan=cursor;
  for(; scan<rows.length && out.length<limit; scan++){
    var r=rows[scan]
    out.push(r);
  }
  var next=(scan<rows.length)? scan : null;         // <<-- puntero scan
  return ok_({ ok:true, items: out, next, bf, af, am /* , mapObj:JSON.stringify(map) */ });

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
  // var rows=sh.getRange(2,1,sh.getLastRow()-1,4).getValues(); rows.reverse();
  // var out=[], c=0; 
  // for(var i=cursor;i<rows.length&&out.length<limit;i++){ var r=rows[i];
  let {items, next} = _scanFromBottom_({sh, lastCol:4, cursor, limit, pageSize:100, rowHandler:(r, items)=>{
    items.push({date:r[0], amount:Number(r[1]||0), descr:String(r[2]||''), note:String(r[3]||'')});
    // c++; 
  // }
  }});
  // return ok_({ok:true,items:out,next:(cursor+c<rows.length)?cursor+c:null});
  return ok_({ok:true,items, next});
}

// ---------- Receivables (pending, partial pay, history) ----------
function receivablesPending_(cursor, limit){
  var sh=ensureACobrar_(); if(sh.getLastRow()<=1) return ok_({ok:true,items:[],next:null});
  cursor=Math.max(0,Number(cursor||0)); limit=Math.max(1,Number(limit||5));

  // var rows=sh.getRange(2,1,sh.getLastRow()-1,7).getValues()
  // rows = rows
  // .filter(function(r){ return String(r[5]||'pendiente').toLowerCase()!=='pagado'; })
  // .sort(function(a,b){ return new Date(a[3]) - new Date(b[3]); }) // asc by due
  // .reverse(); // newest first for paging

  // var out=[], c=0; 
  let {items, next} = _scanFromBottom_({sh, lastCol:7, cursor, limit, pageSize:100, rowHandler:(r, items)=>{
    if(String(r[5]||'pendiente').toLowerCase()!=='pendiente') return;
  // for(var i=cursor;i<rows.length && out.length<limit;i++){ 
    // var r=rows[i];
    items.push({ ticketId:r[0], cliente:r[1], cuota:r[2], fecha:r[3], monto:Number(r[4]||0), estado:r[5], fechaCuota:r[3] }); 
    // c++; 
  // }
    }});
    // return ok_({ok:true,items:out,next:(cursor+c<rows.length)?cursor+c:null});
  items = items.sort(function(a,b){ return new Date(a.fechaCuota) - new Date(b.fechaCuota); })
  return ok_({ok:true, items, next });
}
function ensureCobros_(){ return ensureSheet_('Cobros',['Fecha','TicketId','Cliente','Monto','Nota']); }
function receivablePay_(ticketId, cuotaN, amount, note){
  var sh=ensureACobrar_(), rows=sh.getRange(2,1,sh.getLastRow()-1,7).getValues(), idx=-1;
  for(var i=0;i<rows.length;i++){
    if(String(rows[i][0])===String(ticketId) && Number(rows[i][2]||0)===Number(cuotaN)){ idx=i+2; break; }
  }
  if(idx<0) return ok_({ ok:false, error:'cuota not found' });

  var monto=Number(sh.getRange(idx,5).getValue()||0);
  var pago = Number(amount||0);
  if (pago<=0) pago = monto;   // <<--- pagar total si input vacío o 0

  var cliente=String(sh.getRange(idx,2).getValue()||'');
  if (pago >= monto){ sh.getRange(idx,5,1,2).setValues([[0,'pagado']]); }
  else { sh.getRange(idx,5).setValue(monto - pago); }

  ensureCobros_().appendRow([ new Date(), ticketId, cliente, pago, String(note||'parcial') ]);
  // addCajaMov_('cobro', ticketId, 'Cobro cuota '+cuotaN, cliente, '', pago, 0);
  addCajaMov_('cobro', ticketId, 'Cobro cuota '+cuotaN, cliente, '', pago, 0, { arDelta: -pago });

  // Resolve clientId from Clientes
  var cliId=''; try{
    var cs=SpreadsheetApp.getActive().getSheetByName('Clientes');
    if (cs && cs.getLastRow()>1){
      var rr=cs.getRange(2,1,cs.getLastRow()-1,2).getValues();
      for (var j=0;j<rr.length;j++){ if (String(rr[j][0]||'')===cliente){ cliId=String(rr[j][1]||''); break; } }
    }
  }catch(e){}
  // Materialize AR decrement
  try{ upsertReceivable_(cliId||cliente, cliente, -pago); }catch(e){}
  return ok_({ ok:true });
}

function receiptsHistory_(cursor, limit){
  var sh=ensureCobros_(); if(sh.getLastRow()<=1) return ok_({ok:true,items:[],next:null});
  cursor=Math.max(0,Number(cursor||0)); limit=Math.max(1,Number(limit||5));
  // var rows=sh.getRange(2,1,sh.getLastRow()-1,5).getValues(); rows.reverse();
  // var out=[], c=0; 
  let {items, next} = _scanFromBottom_({sh, lastCol:5, cursor, limit, pageSize:100, rowHandler:(r, items)=>{
  // for(var i=cursor;i<rows.length && out.length<limit;i++){ 
    // var r=rows[i];
    items.push({date:r[0], ticketId:r[1], cliente:r[2], monto:Number(r[3]||0), nota:r[4]});
    // c++; 
  // }
  }});
  // return ok_({ok:true,items:out,next:(cursor+c<rows.length)?cursor+c:null});
  return ok_({ok:true,items, next });
}

function saleDetails_(ticket){
  var sh=ss_().getSheetByName('Ventas'); if(!sh||sh.getLastRow()<=1) return ok_({ok:true,items:[]});

  let {items, next} = _scanFromBottom_({sh, lastCol:22, cursor:0, limit:100, pageSize:100, rowHandler:(r, items)=>{
    if(String(r[12]||'')!==String(ticket)) return;
    items.push({ producto:r[2], qty:r[3], unit:r[4], total:r[5], desc:r[16], code:r[18], color:r[19], size:r[20] })
  }});
  return ok_({ok:true,items, next });


  // var sh=sheetByName_('Caja'); 
  // if(!sh||sh.getLastRow()<=1) return ok_({ ok:true, items:[], next:null });
  // // var rows=sh.getRange(2,1,sh.getLastRow()-1,12).getValues(); rows.reverse();
  // // var out=[], n=0; 

  // var {items, next} = _scanFromBottom_({sh, lastCol:16, cursor:0, limit:100, pageSize:100, rowHandler:(r, items)=>{
  // // for (var i=cursor;i<rows.length && out.length<limit;i++){
  //   // var r=rows[i]; 
  //   if(String(r[2]||'')!==String(ticket)) return;
  //   items.push({ date:r[0], tipo:r[1], ref:r[2], descr:r[3],
  //     cliente:r[4], proveedor:r[5], ingreso:Number(r[6]||0), egreso:Number(r[7]||0), subtotal:Number(r[8]||0), descuento:Number(r[9]||0), entrega:Number(r[10]||0), aplazo:Number(r[11]||0), status: String(r[14]||'').trim() || 'activo' }); 
  //     // n++; 
  // // }
  // }});
  // return ok_({ ok:true, items, next });

}

function cashIncome_(data){
  var now=new Date();
  var persona=String(data.person||'').trim(); if(!persona) return ok_({ok:false,error:'person required'});
  var clientId=String(data.personId||'').trim(); // NEW: opcional
  if (clientId || persona){ try{ upsertClient_(persona, clientId||persona); }catch(e){} }
  var amount=Math.max(0, Number(data.amount||0)); if(amount<=0) return ok_({ok:false,error:'amount<=0'});
  var descr=String(data.descr||'Ingreso');
  var n=Math.max(0, Number(data.numCuotas||0));
  var kind=String(data.kind||'mensual').toLowerCase();
  var refId='IN-'+Utilities.formatDate(now,Session.getScriptTimeZone(),'yyyyMMddHHmmss');

  // addCajaMov_('ingreso', refId, descr, persona, '', amount, 0, {subtotal:amount, descuento:0, entrega:amount, aplazo:0});
  if (n>0){
    var per=Math.floor(amount/n), resto=amount-per*n, base=new Date(now);
    var total=0;
    for (var i=1;i<=n;i++){ var d=new Date(base); if(kind==='semanal') d.setDate(d.getDate()+i*7); else d.setMonth(d.getMonth()+i);
      var m=per+(i<=resto?1:0); total+=m; addPayable_(refId, persona, i, d, m); }
    try{ upsertPayable_(clientId||persona, persona, total); }catch(e){}
  }
  addCajaMov_('ingreso', refId, descr, persona, '', amount, 0, { subtotal:amount, descuento:0, entrega:amount, aplazo:0, apDelta: total });
  return ok_({ ok:true, refId, amount, n });
}


function ensureAPagar_(){ 
  return ensureSheet_('APagar',['RefId','Persona','CuotaN','FechaCuota','MontoCuota','Estado','Nota']); 
}
function addPayable_(refId, persona, n, fecha, monto){
  ensureAPagar_().appendRow([
    String(refId||''), String(persona||''), Number(n||0),
    (fecha instanceof Date)?fecha:new Date(fecha), Number(monto||0), 'pendiente', ''
  ]);
}


function cashIncomeHistory_(cursor, limit){
  cursor=Math.max(0,Number(cursor||0)); limit=Math.max(1,Number(limit||5));
  var sh=ensureCaja_(); if(sh.getLastRow()<=1) return ok_({ok:true,items:[],next:null});
  // var rows=sh.getRange(2,1,sh.getLastRow()-1,12).getValues().filter(r=> String(r[1])==='ingreso');
  // rows.reverse(); // desc
  // var out=[], c=0;
  // for(var i=cursor;i<rows.length && out.length<limit;i++){
  let {items, next} = _scanFromBottom_({sh, lastCol:16, cursor, limit, pageSize:100, rowHandler:(r, items)=>{
    // var r=rows[i];
    if(String(r[1])!=='ingreso' || String(r[14])==='ajustado') return;
    items.push({ date:r[0], ref:r[2], descr:r[3], person:r[4], amount:Number(r[6]||0) });
    // c++;
  // }
  }});
  // return ok_({ ok:true, items: out, next:(cursor+c<rows.length)?cursor+c:null });
  return ok_({ ok:true, items, next });
}

function listPurchaseHistory_(cursor, limit){
  cursor = Math.max(0, Number(cursor||0));
  limit  = Math.max(1, Number(limit||5));
  var sh = ss_().getSheetByName('Compras'); 
  if(!sh||sh.getLastRow()<=1) return ok_({ok:true,items:[],next:null});
  // var rows = sh.getRange(2,1,sh.getLastRow()-1,16).getValues(); rows.reverse();

  // Totales desde Caja (compra)
  var caja=ensureCaja_();
  const mapCaja={};
  if(caja.getLastRow()>1){
    var c=caja.getRange(2,1,caja.getLastRow()-1,12).getValues();
    c.forEach(function(r){
      if(String(r[1])==='compra'){ mapCaja[String(r[2]||'')] = Number(r[8]||r[7]||0); }
    });
  }

  var out=[], scan=cursor;
  const seen={}
  var {items, next} = _scanFromBottom_({sh, lastCol:16, cursor, limit, pageSize:100, rowHandler:(r, items)=>{
  // for(; scan<rows.length && out.length<limit; scan++){
    // var r=rows[scan], fac=String(r[6]||''), fid=String(r[15]||''), key=fid||fac;
    var fac=String(r[6]||''), fid=String(r[15]||''), key=fid||fac;
    if(seen[key]) return; 
    seen[key]=1;

    var total = mapCaja[fac] || mapCaja[fid] || 0;
    if (!total){ // fallback: suma por factura
      for (var j=0;j<items.length;j++){ var rr=items[j]; if (String(rr[6]||'')===fac) total += Number(rr[5]||0); }
    }
    items.push({ date:r[0], supplier:r[1], factura:fac, fileId:fid,
               fileUrl: fid?('https://drive.google.com/file/d/'+fid+'/view'):'', totalGs: total });
  // }
  }});
  // var next = (scan<rows.length) ? scan : null;      // <<-- puntero scan
  return ok_({ ok:true, items, next });
}

function listSalesHistory_(cursor, limit){
  cursor=Math.max(0,Number(cursor||0)); limit=Math.max(1,Number(limit||5));
  var sh=ensureSheet_('Ventas',[]); if(sh.getLastRow()<=1) return ok_({ok:true,items:[],next:null});
  // var rows=sh.getRange(2,1,sh.getLastRow()-1,22).getValues(); rows.reverse();

  let downByTicket=[], statusByTicket={};
  var caja=ensureCaja_();
  if(caja.getLastRow()>1){
    // var c=caja.getRange(2,1,caja.getLastRow()-1,12).getValues();
    // c.forEach(function(r){ if(String(r[1])==='venta'){ 
    //   var ref=String(r[2]||''); 
    //   var ent=Number(r[10]||r[6]||0); 
    //   downByTicket[ref]=(downByTicket[ref]||0)+ent;
    //   statusByTicket[ref]=r[15]
    // } });

    var {items, next} = _scanFromBottom_({sh:caja, lastCol:16, cursor:0, limit:100, pageSize:100, rowHandler:(r, items)=>{
      if(String(r[1])!=='venta') return;
      items.push({ ref:r[2], ingreso:Number(r[6]||0), egreso:Number(r[7]||0), subtotal:Number(r[8]||0), descuento:Number(r[9]||0), entrega:Number(r[10]||0), aplazo:Number(r[11]||0) }); 
    }});
    downByTicket = items
  }

  var out=[], scan=cursor;
  const seen={};
  var {items, next} = _scanFromBottom_({sh, lastCol:22, cursor, limit, pageSize:100, rowHandler:(r, items)=>{
  // for(; scan<rows.length && out.length<limit; scan++){
    var ticket=String(r[12]||''); if(!ticket||seen[ticket]) return; seen[ticket]=1;
    // var subset=items.filter(rr=> String(rr[12]||'')===ticket);
    var summary = downByTicket.find(it=> it.ref === ticket) || { entrega:0, aplazo:0, descuento:0 }
    var subtotal=Number(summary.subtotal||0), desc=Number(summary.descuento||0), fecha=r[0], cliente=r[1];
    // subset.forEach(rr=>{ subtotal+=Number(rr[5]||0); desc += Number(rr[16]||0); });
    var total=Math.max(0, subtotal - desc);
    var entrega=Number(summary.entrega||0);
    var aplazo=Number(summary.aplazo||0);
    items.push({ date:fecha, ticket, cliente, subtotal:Number(summary.subtotal||0), descuento:Number(summary.descuento||0), entrega, aplazo, total, status: statusByTicket[ticket] || 'activo' });
  // }
  }});
  // var next=(scan<rows.length)? scan : null;         // <<-- puntero scan
  return ok_({ ok:true, items, next });
}

/**
 * Scan desde el FINAL (desc) en ventanas para no cargar toda la hoja.
 * - cursor: offset ya consumido DESDE EL FINAL (0-based).
 * - limit : cuantos items devolver en esta llamada (encabezados ya filtrados).
 * - pageSize: tamaño del bloque que se lee de Sheets en cada iteración.
 * - lastCol: # de columnas a leer (performance).
 * - rowHandler(row, items): empuja en items cuando corresponda. Debe retornar void.
 * Devuelve {items, next}. next = nuevo offset desde el final o null si terminó.
 */
function _scanFromBottom_({sh, lastCol, cursor, limit, pageSize, rowHandler}){
  var lastRow = sh.getLastRow();
  if (lastRow <= 1) return { items:[], next:null };

  var want = Math.max(1, Number(limit||5));
  var chunk = Math.max(50, Math.min(Number(pageSize||500), 2000));
  var items = [];

  // posición de escaneo (incluida) contando desde el final
  var scan = lastRow - Math.max(0, Number(cursor||0));  // fila 1-based

  while (scan >= 2 && items.length < want){
    var start = Math.max(2, scan - chunk + 1);
    var count = scan - start + 1;
    var values = sh.getRange(start, 1, count, lastCol).getValues();

    var stoppedEarly = false;
    // iteramos de abajo hacia arriba para mantener DESC sin reverse global
    for (var i = values.length-1; i>=0 && items.length<want; i--){
      rowHandler(values[i], items);
      if (items.length >= want){
        // siguiente fila pendiente es justo encima de la última procesada
        scan = start + i - 1; // (1-based)
        stoppedEarly = true;
        break;
      }
    }
    // avanzamos el puntero de escaneo hacia arriba
    if (!stoppedEarly){
      // Consumimos todo el chunk; seguimos arriba del bloque leído
      scan = start - 1;
    }
  }
  // Offset 0-based desde el final si aún quedan filas por leer
  var next = (scan >= 2) ? (lastRow - scan) : null;
  return { items: items, next: next };
}

// increaseStockOnly_: suma en Productos!E sin alterar promedios
function increaseStockOnly_(code, qty){
  var s = sh_ && sh_('Productos') || SpreadsheetApp.getActive().getSheetByName('Productos');
  if (!s) throw 'Productos sheet not found';
  var row = (typeof ensureProductRow_==='function') ? ensureProductRow_(code, String(code)) : (function(){
    var last = s.getLastRow();
    if (last<=1){ s.appendRow(['Codigo','Nombre','PrecioVenta','','Stock','CostoPromedio','Activo','UltimoCosto','Markup%','PrecioSugerido']); last = 2; }
    var rng = s.getRange(2,1,Math.max(0,s.getLastRow()-1),1).getValues();
    for (var i=0;i<rng.length;i++){ if (String(rng[i][0]||'')===String(code)) return i+2; }
    s.appendRow([String(code), String(code), 0, '', 0, 0, 1, 0, 0, 0]); return s.getLastRow();
  })();
  var cell = s.getRange(row, 5); // E: Stock
  var v = cell.getValue(); var prev = (typeof toNumBR_==='function') ? toNumBR_(v) : Number(v||0);
  cell.setValue(prev + Number(qty||0));
}


// ====== NEW: Payables (APagar) endpoints ======

// Ensure payments history sheet
function ensurePagos_(){ return ensureSheet_('Pagos',['Fecha','RefId','Persona', 'CuotaN','Monto','Nota','Status']); }


// List pending APagar using scan-from-bottom
function payablesPending_(cursor, limit){
  var sh=ensureAPagar_(); if(sh.getLastRow()<=1) return ok_({ok:true,items:[],next:null});
  cursor=Math.max(0,Number(cursor||0)); limit=Math.max(1,Number(limit||5));
  var got = _scanFromBottom_({
    sh: sh, lastCol: 7, cursor: cursor, limit: limit, pageSize: 100,
    rowHandler: function(r, items){
      if(String(r[5]||'pendiente').toLowerCase()!=='pendiente') return;
      items.push({ refId:r[0], persona:r[1], cuota:r[2], fecha:r[3], monto:Number(r[4]||0), estado:r[5], nota:r[6] }); 
    }
  });
  // orden por fecha asc (igual que Cobros)
  got.items = got.items.sort(function(a,b){ return new Date(a.fecha) - new Date(b.fecha); });
  return ok_({ ok:true, items: got.items, next: got.next });
}

// Register a payment against APagar (partial or total)
function payablePay_(refId, cuotaN, amount, note){
  var sh=ensureAPagar_(), last=sh.getLastRow(); if(last<=1) return ok_({ok:false,error:'APagar empty'});
  var vals=sh.getRange(2,1,last-1,7).getValues(); var idx=-1;
  for(var i=0;i<vals.length;i++){
    if(String(vals[i][0]||'')===String(refId) && Number(vals[i][2]||0)===Number(cuotaN)){ idx=i+2; break; }
  }
  if(idx<0) return ok_({ ok:false, error:'cuota not found' });
  var monto=Number(sh.getRange(idx,5).getValue()||0);
  var pago = Number(amount||0); if (pago<=0) pago = monto;
  var persona=String(sh.getRange(idx,2).getValue()||'');

  if (pago >= monto){ sh.getRange(idx,5,1,2).setValues([[0,'pagado']]); }
  else { sh.getRange(idx,5).setValue(monto - pago); }

  // Historial de pagos (egreso de caja)
  ensurePagos_().appendRow([ new Date(), refId, persona, Number(cuotaN||0), pago, String(note||'parcial'), 'activo' ]);
  // addCajaMov_('pago', refId, 'Pago cuota '+cuotaN, persona, '', 0, pago);
  addCajaMov_('pago', refId, 'Pago cuota '+cuotaN, persona, '', 0, pago, { apDelta: -pago });

  // Materialize Payables decrement (usa Clientes para resolver ID si existe)
  var cliId=''; try{
    var cs=sheetByName_('Clientes');
    if (cs && cs.getLastRow()>1){
      var rr=cs.getRange(2,1,cs.getLastRow()-1,2).getValues();
      for (var j=0;j<rr.length;j++){ if (String(rr[j][0]||'')===persona){ cliId=String(rr[j][1]||''); break; } }
    }
  }catch(e){}
  try{ upsertPayable_(cliId||persona, persona, -pago); }catch(e){}

  return { ok:true };
}

// Payments history (APagar) with scan-from-bottom
function paymentsHistory_(cursor, limit){
  var sh=ensurePagos_(); if(sh.getLastRow()<=1) return ok_({ok:true,items:[],next:null});
  cursor=Math.max(0,Number(cursor||0)); limit=Math.max(1,Number(limit||5));
  var got = _scanFromBottom_({
    sh: sh, lastCol: 8, cursor: cursor, limit: limit, pageSize: 100,
    rowHandler: function(r, items){
      items.push({ date:r[0], refId:r[1], persona:r[2], cuotaN: r[3], monto:Number(r[4]||0), nota:r[5], status:(String(r[6]||'').trim()||'activo') });
    }
  });
  return ok_({ ok:true, items: got.items, next: got.next });
}

function pagosMarkStatus_(refId, persona, cuotaN, status){
  var sh = ensurePagos_();
  if (sh.getLastRow()<=1) return false;
  var lastCol = Math.max(7, sh.getLastColumn());
  var vals = sh.getRange(2,1,sh.getLastRow()-1,lastCol).getValues();
  for (var i=vals.length-1;i>=0;i--){
    var r = vals[i];
    if (String(r[1]||'')===String(refId) && String(r[2]||'')===String(persona)){
      // si hay CuotaN, lo matcheamos; si no, marcamos el match más reciente
      if (lastCol>=7){
        if (String(r[3]||'')==String(cuotaN||r[3])){
          SpreadsheetApp.getActive().getSheetByName('Pagos').getRange(i+2,7).setValue(String(status||'ajustado'));
          return true;
        }
      } else {
        ensurePagos_();
        SpreadsheetApp.getActive().getSheetByName('Pagos').getRange(i+2,7).setValue(String(status||'ajustado'));
        return true;
      }
    }
  }
  return false;
}


// Al final de Code.gs:
(function(root){
  var exportsObj = { _scanFromBottom_: _scanFromBottom_, listSalesHistory_, ensureSheet_ };
  if (typeof module !== 'undefined' && module.exports){
    module.exports = exportsObj;       // Node.js (tests)
  } else {
    // Opcional: exponer para depurar en GAS si quieres
    root.__codeExports__ = exportsObj; // no interfiere con nada
  }
})(this);