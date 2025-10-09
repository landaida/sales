// === UploadOCR.gs ===
// Requires: Advanced Google Services > Drive API v2 (enable in Apps Script Editor)
// Saves the PDF temporarily in Drive, converts to Google Doc to extract OCR text,
// detects supplier, parses items and writes into "Compras" sheet.

function uploadPurchasePDF(payload){
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
    if (!supplier){
      if (text.includes('OXYRIO CONFECÇOES') || text.includes('OXYRIO CONFECCOES')) supplier = 'OXYRIO CONFECCOES LTDA'
      else if (text.includes('GABY MODAS')) supplier = 'GABY MODAS'
      else supplier = 'VITALLY'
    }

    // Parse OXYRIO format lines: code name qty priceAv pricePz ... barcode color size ...
    const prefer = (payload.preferPrice||'AV').toUpperCase() // AV o PZ
    const items = []
    const rx = /(\d{5})\s+([A-Z0-9/ .-]+?)\s+(\d+[.,]\d{3}|\d+\.\d{3}|\d+)\s+(\d+,\d{2})\s+(\d+,\d{2})\s+\d+,\d{2}\s+\d+,\d{2}\s+(\d{7,13})\s+([A-ZÇÃÉ0-9/-]+)\s+([PMGXL]{1,2})/g
    let m
    while ((m = rx.exec(text))){
      const code = m[1]; const name = m[2].trim()
      const qty = Number(String(m[3]).replace('.', '').replace(',','.'))
      const priceAv = parseFloat(String(m[4]).replace('.','').replace(',','.'))
      const pricePz = parseFloat(String(m[5]).replace('.','').replace(',','.'))
      const unit = prefer==='PZ' ? pricePz : priceAv
      const barcode = m[6]; const color = m[7]; const size = m[8]
      items.push({ code, name, qty, unit, total: unit*qty, supplier, barcode, color, size, factura: payload.filename||'' })
    }

    // Write to "Compras" sheet
    const s = sheetByName_('Compras') || ss_().insertSheet('Compras')
    if (s.getLastRow()===0) s.appendRow(['Fecha','Proveedor','Producto','Cantidad','CostoUnitario','Total','Factura','Nota','Codigo','Color','Talla','CodigosBarras'])
    const now = new Date()
    const rows = items.map(it=> [now, it.supplier, it.name, it.qty, it.unit, it.total, it.factura, '', it.code, it.color, it.size, it.barcode])
    if (rows.length) s.getRange(s.getLastRow()+1,1,rows.length,rows[0].length).setValues(rows)

    // Cleanup temp files
    try{ DriveApp.getFileById(pdfId).setTrashed(true) }catch(e){}
    try{ DriveApp.getFileById(docId).setTrashed(true) }catch(e){}

    return { ok:true, supplier, imported: items.length, sample: payload.debug ? text : '' }
  }catch(e){
    try{ DriveApp.getFileById(pdfId).setTrashed(true) }catch(_){}
    return { ok:false, error: String(e) }
  }
}
