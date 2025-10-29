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
function parseOXYRIO_old(raw, preferPrice){
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

function parseOXYRIO_(raw, preferPrice){
  // Normalización igual que la tuya
  var t = String(raw)
    .replace(/[ \t]+/g,' ')
    .replace(/\r/g,'\n')
    .replace(/\n+/g,'\n')
    .toUpperCase()

  var preferAV = String(preferPrice||'AV').toUpperCase().indexOf('PZ')===-1

  // ⬇️ FIX #1: cortar filas virtualmente: <NCM8> <siguiente código 5d> → salto de línea
  t = t.replace(/(\d{8})\s+(?=\d{5}\s)/g, '$1\n')

  // ⬇️ FIX #2: mismo regex que el tuyo pero permitiendo acentos en name/color
  // Grupos: code, name, qty '1.000', val AV, val PZ, (4 números), barcode, color, size, NCM
  var rx = /(\d{5})\s+([A-Z0-9ÁÉÍÓÚÂÊÔÃÕÇÜÑ\/\-\.\&\s]+?)\s+(\d{1,3}(?:\.\d{3})?)\s+(\d+,\d{2})\s+(\d+,\d{2})(?:\s+\d+,\d{2}){4}\s+(\d{12,14})\s+([A-Z0-9ÁÉÍÓÚÂÊÔÃÕÇÜÑ\/\-\.\&\s]+?)\s+([A-Z]{1,3})\s+(\d{8})/g

  var m, out = []
  while ((m = rx.exec(t)) !== null){
    var code = m[1].trim()
    var name = m[2].replace(/\s{2,}/g,' ').trim()

    var qtyTxt = m[3], qty = 0
    if (qtyTxt.indexOf('.') >= 0 && qtyTxt.indexOf(',') === -1){
      qty = parseInt(qtyTxt.replace(/\./g,''),10) / 1000 // '1.000' => 1
    } else {
      qty = Math.round(toNumBR__(qtyTxt)) // '1,00' => 1
    }

    var av = toNumBR__(m[4]), pz = toNumBR__(m[5])
    var barcode = m[6].trim(), color = m[7].replace(/\s{2,}/g,' ').trim()
    var size = m[8].trim(), ncm = m[9].trim()
    var costUnit = preferAV ? av : pz

    out.push({ code, name, qty, costUnit, barcode, color, size, ncm })
    // (tu write-back a Productos queda igual si lo volvés a activar)
  }
  return out
}

function toNumBR__(s){ if (s===null||s===undefined) return 0; return Number(String(s).replace(/\./g,'').replace(',', '.')) || 0 }


// VITALLY — "Pedido do Catálogo"
function parseVITALLY_(raw){
  // Normalize but keep case; regex is case-insensitive
  var t = String(raw)
    .replace(/[ \t]+/g,' ')
    .replace(/\r/g,'\n')
    .replace(/\n{2,}/g,'\n');

  var out = [];

  // Layout robust:
  //  QTD  R$ <price1>  <CODE> - <NAME>  Cor: ... - Tam: ... - Cód. Barras: <BARCODE>  [<price2> 0,00 0,00 0,00]
  // price2 (if present) es el unitario correcto cuando QTD>1
  var rx = /(?:^|\n)\s*([0-9]{1,3})\s*R\$\s*([0-9\.,]+)\s+([0-9]{3,})\s*[-–]\s*([^\n]*?)\s+Cor\s*:\s*(.+?)\s*[-–]\s*Tam\s*:\s*(.+?)\s*[-–]\s*[^:]*Barras\s*:\s*([0-9]{8,14})(?:\s+([0-9]{1,3},[0-9]{2})(?=\s+(?:\d{1,3},\d{2}\s*){0,3}(?:\n|$)))?/gi;

  var m;
  while ((m = rx.exec(t)) !== null){
    var qty      = Number(m[1]||1);
    var price1Br = String(m[2]||'0');
    var code     = String(m[3]).trim();
    var name     = String(m[4]).replace(/\s{2,}/g,' ').trim();
    var color    = String(m[5]).replace(/\s{2,}/g,' ').trim();
    var size     = String(m[6]).trim();
    var barcode  = String(m[7]).trim();
    var price2Br = m[8] ? String(m[8]) : null;

    // If price2 exists, that's the unit price; otherwise fallback to price1
    var unit = toNumBR__(price2Br || price1Br);

    out.push({ code, name, color, size, qty, costUnit: unit, barcode });
  }
  return out;
}



// GABY MODAS (unificado: con/sin ATACADO, sin duplicar)
function parseGABYMODAS_(raw){
  var T = String(raw)
    .replace(/[ \t]+/g,' ')
    .replace(/\r/g,'\n')
    .replace(/\n+/g,'\n')
    .toUpperCase();

  var out = [];
  var seen = Object.create(null); // dedupe defensivo

  // Un solo regex:            code      -     base           tail(color+estilo)     (ATACADO opc)     talla          qty     precio
  // var rx = /(\d{1,5}|[A-Z0-9\-]{2,})\s*[-–]\s*([A-Z0-9\/\-\.\s]+?)\s+([A-ZÇÃÕÉÍÓÚÜ \-\/]+?)\s+(?:ATACADO\s+)?(PP|P|M|G|GG|XG|EG|EXG|XGG|U|UNICO|ÚNICO|TU|[A-Z0-9]{1,4})\s+(\d{1,3})\s+R\$\s*(\d+,\d{2})/g;
  var rx = /(\d{1,5}|[A-Z0-9\-]{2,})\s*[-–]\s*([A-Z0-9\/\-\.\+\s]+?)\s+([A-ZÇÃÕÉÍÓÚÜ \-\/\+\s]+?)\s+(?:ATACADO\s+)?(PP|P|M|G|GG|XG|EG|EXG|XGG|U|UNICO|ÚNICO|TU|[A-Z0-9]{1,4})\s+(\d{1,3})\s+R\$\s*(\d+,\d{2})/g;
  var m;
  while ((m = rx.exec(T)) !== null){
    var code = (m[1]||'').trim();
    var base = (m[2]||'').replace(/\s{2,}/g,' ').trim();   // p.ej. "BIQUINI"
    var tail = (m[3]||'').replace(/\s{2,}/g,' ').trim();   // p.ej. "LUDY AZUL BB"
    var size = (m[4]||'').trim();
    var qty  = Number(m[5]||0);
    var unit = toNumBR__(m[6]);

    // Conserva tu lógica de nombre/color (si existe splitNameColor_)
    var name, color;
    if (typeof splitNameColor_ === 'function'){
      var sp = splitNameColor_(base, tail);   // esperado => name:"BIQUINI LUDY", color:"AZUL BB"
      name  = (sp && sp.name)  ? sp.name  : (base + ' ' + tail).trim();
      color = (sp && sp.color) ? sp.color : '';
    } else {
      // Fallback simple: mueve primera palabra del tail a name y el resto queda como color
      var parts = tail.split(/\s+/);
      name  = (base + ' ' + (parts[0]||'')).trim();
      color = parts.slice(1).join(' ').trim();
    }

    var item = { code, name, color, size, qty, costUnit:unit, barcode:'' };
    item.cor = item.color; // alias para tu test actual

    var key = code + '|' + name + '|' + color + '|' + size + '|' + qty + '|' + unit.toFixed(2);
    if (!seen[key]) { out.push(item); seen[key] = 1; }
  }

  return out;
}


// Helper: split a "name tail" into {name,color} using a small color lexicon tail-first.
function splitNameColor_(base, tail){
  base = String(base||'').replace(/\s{2,}/g,' ').trim();
  tail = String(tail||'').replace(/\s{2,}/g,' ').trim();
  if (!tail) return { name:base, color:'' };
  var COLORS = [
    'AZUL BB','AZUL BIC','AZUL JADE','AZUL','MARROM','PRETO','AMARELO NEON','FÚCSIA','FUSCIA','ROSA NEON',
    'TERRA COTA','VERDE MILITAR','VERDE MENTA','VERMELHO','NUDE','ROSA PINK','BEGE','OFF','OFF WHITE',
    'ESTAMPADO','PISTACHE','CINZA','BRANCO','PINK','LARANJA','JADE','BIC','VERDE MUSGO','VRDE MUSGO'
  ];
  var tokens = tail.split(/\s+/);
  var maxN = Math.min(3, tokens.length);
  for (var n=maxN; n>=1; n--){
    var cand = tokens.slice(tokens.length-n).join(' ');
    if (COLORS.indexOf(cand) >= 0){
      var left = tokens.slice(0, tokens.length-n).join(' ');
      return { name: (base + ' ' + left).trim(), color: cand };
    }
  }
  // fallback: cortar últimos 2 tokens como color
  if (tokens.length>=2){
    var c2 = tokens.slice(-2).join(' ');
    var l2 = tokens.slice(0,-2).join(' ');
    return { name:(base + ' ' + l2).trim(), color:c2 };
  }
  return { name:(base + ' ' + tail).trim(), color:'' };
}


// Al final de Code.gs:
(function(root){
  var exportsObj = { parseGABYMODAS_, parseVITALLY_, parseOXYRIO_ };
  if (typeof module !== 'undefined' && module.exports){
    module.exports = exportsObj;       // Node.js (tests)
  } else {
    // Opcional: exponer para depurar en GAS si quieres
    root.__codeExports__ = exportsObj; // no interfiere con nada
  }
})(this);