// === UploadOCR.gs ===
// Requires: Advanced Google Services > Drive API v2 (enable in Apps Script Editor)
// Saves the PDF temporarily in Drive, converts to Google Doc to extract OCR text,
// detects supplier, parses items and writes into "Compras" sheet.

// Do NOT write to sheets during parsing. Only return items + file ids/urls.
function uploadPurchasePDF(payload){
  if (!payload || !payload.b64) throw 'Falta archivo b64';
  const byte = Utilities.base64Decode(payload.b64);
  const blob = Utilities.newBlob(byte, 'application/pdf', payload.filename || 'compra.pdf');
  const pdfId = DriveApp.createFile(blob).getId();
  try{
    const meta = { title: (payload.filename||'compra')+' (OCR)', mimeType:'application/vnd.google-apps.document' };
    if (!Drive || !Drive.Files) throw 'Activa Drive API (servicio avanzado)';
    const doc = Drive.Files.copy(meta, pdfId, { ocr:true, ocrLanguage:'pt' });
    const text = DocumentApp.openById(doc.id).getBody().getText();
    try{ DriveApp.getFileById(doc.id).setTrashed(true) }catch(e){}

    // Detect supplier
    var supplier = (payload.supplier||'').toUpperCase();
    if (!supplier){
      if (text.indexOf('OXYRIO CONFECCOES')>=0 || text.indexOf('OXYRIO CONFECÇOES')>=0) supplier='OXYRIO CONFECCOES LTDA';
      else if (text.indexOf('GABY MODAS')>=0) supplier='GABY MODAS';
      else supplier='VITALLY';
    }

    var items = [];
    if (supplier==='OXYRIO CONFECCOES LTDA') items = parseOXYRIO_(text, (payload.preferPrice||'AV'));

    return { ok:true, supplier, fileId: pdfId, fileUrl: 'https://drive.google.com/file/d/'+pdfId+'/view', items };
  }catch(e){
    try{ DriveApp.getFileById(pdfId).setTrashed(true) }catch(_){}
    return { ok:false, error:String(e) };
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
    // try{ applyPurchaseToStock_(code, name, qty, costUnit) }catch(e){}
  }
  return out
}
function toNumBR__(s){ if (s===null||s===undefined) return 0; return Number(String(s).replace(/\./g,'').replace(',', '.')) || 0 }
