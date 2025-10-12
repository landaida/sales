// === UploadOCR.gs ===
// Requires: Advanced Google Services > Drive API v2 (enable in Apps Script Editor)
// Saves the PDF temporarily in Drive, converts to Google Doc to extract OCR text,
// detects supplier, parses items and writes into "Compras" sheet.

function uploadPurchasePDF(payload){
  let debug = [];
  //debug.push(`payload:${JSON.stringify(payload)}`)

  if (!payload || !payload.b64) throw 'Falta archivo b64'
  const cfg = cfg_() || {}
  const byte = Utilities.base64Decode(payload.b64)
  const blob = Utilities.newBlob(byte, 'application/pdf', payload.filename || 'compra.pdf')

  // Save PDF to Drive
  let pdfId = DriveApp.createFile(blob).getId()
  try{
    // Convert to Google Doc with OCR (Drive v2)
    const docMeta = { title: (payload.filename||'compra') + ' (OCR)', mimeType: 'application/vnd.google-apps.document' }
    if (typeof Drive === 'undefined' || !Drive.Files) throw 'Activa Drive API (servicio avanzado) en Apps Script'
    const doc = Drive.Files.copy(docMeta, pdfId, { ocr:true, ocrLanguage:'pt' })
    const docId = doc.id
    const text = DocumentApp.openById(docId).getBody().getText()

    // Detect supplier
    let supplier = (payload.supplier || '').toUpperCase()
    if (!payload.supplier){
      if (text.includes('OXYRIO CONFECÇOES') || text.includes('OXYRIO CONFECCOES')) supplier = 'OXYRIO CONFECCOES LTDA'
      else if (text.includes('GABY MODAS')) supplier = 'GABY MODAS'
      else supplier = 'VITALLY'
    }

    debug.push(`supplier:${supplier}`)

    // Parse OXYRIO format lines: code name qty priceAv pricePz ... barcode color size ...
    const prefer = (payload.preferPrice||'AV').toUpperCase() // AV o PZ
    let items = []

    if (supplier === 'OXYRIO CONFECCOES LTDA'){
      items = parseOXYRIO_(text, prefer)
    } else if (supplier === 'GABY MODAS'){
      items = [] // parser TBD
    } else if (supplier === 'VITALLY'){
      items = [] // parser TBD
    }

    // Write to "Compras" sheet
    const s = sheetByName_('Compras') || ss_().insertSheet('Compras')
    if (s.getLastRow()===0) s.appendRow(['Fecha','Proveedor','Producto','Cantidad','CostoUnitario','Total','Factura','Nota','Codigo','Color','Talla','CodigosBarras'])
    const now = new Date()
    debug.push(`length:${items.length}`)
    debug.push("before insert rows on Compras sheet")
    const rows = items.map(it=> [now, it.supplier, it.name, it.qty, it.costUnit, (it.qty*it.costUnit), it.factura||'', '', it.code, it.color, it.size, it.barcode])
    debug.push("after insert rows on Compras sheet")

    if (rows.length) s.getRange(s.getLastRow()+1,1,rows.length,rows[0].length).setValues(rows)

    // Cleanup temp files
    try{ DriveApp.getFileById(pdfId).setTrashed(true) }catch(e){}
    try{ DriveApp.getFileById(docId).setTrashed(true) }catch(e){}

    return { ok:true, supplier, imported: items.length, sample: payload.debug ? text : '', debug:debug.join('\n') }
  }catch(e){
    try{ DriveApp.getFileById(pdfId).setTrashed(true) }catch(_){}
    return { ok:false, error: String(e) }
  }
}

/** Robust parser for OXYRIO layout (Cotação de Preços). */
function parseOXYRIO_(raw, preferPrice){
  var t = String(raw).replace(/[ \t]+/g,' ').replace(/\r/g,'\n').replace(/\n+/g,'\n').toUpperCase()
  var preferAV = String(preferPrice||'AV').toUpperCase().indexOf('PZ')===-1

  // Groups: 5-digit code, name, qty '1.000', val AV, val PZ, skip 4 columns, barcode, color, size, NCM
  var rx = /(\d{5})\s+([A-Z0-9\/\-\s]+?)\s+(\d{1,3}(?:\.\d{3})?)\s+(\d+,\d{2})\s+(\d+,\d{2})(?:\s+\d+,\d{2}){4}\s+(\d{12,14})\s+([A-Z0-9\/\-\s]+?)\s+([A-Z]{1,3})\s+(\d{8})/g
  var m, out = []
  while ((m = rx.exec(t)) !== null){
    var code = m[1].trim()
    var name = m[2].replace(/\s{2,}/g,' ').trim()

    var qtyTxt = m[3]
    var qty = 0
    if (qtyTxt.indexOf('.') >= 0 && qtyTxt.indexOf(',') === -1){
      qty = parseInt(qtyTxt.replace(/\./g,''),10) / 1000 // '1.000' => 1
    } else {
      qty = Math.round(toNumBR__(qtyTxt)) // '1,00' => 1
    }

    var av = toNumBR__(m[4]), pz = toNumBR__(m[5])
    var barcode = m[6].trim(), color = m[7].trim(), size = m[8].trim(), ncm = m[9].trim()
    var costUnit = preferAV ? av : pz
    out.push({ code, name, qty, costUnit, barcode, color, size, ncm })
    // write-back to 'Productos'
    try{ applyPurchaseToStock_(code, name, qty, costUnit) }catch(e){}
  }
  return out
}
function toNumBR__(s){ if (s===null||s===undefined) return 0; return Number(String(s).replace(/\./g,'').replace(',', '.')) || 0 }
