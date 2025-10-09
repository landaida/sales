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

// Example products & inventory from "Productos" sheet
function _listProducts(){
  const s = sheetByName_('Productos')
  const out = []
  if (s){
    const rows = s.getRange(2,1,Math.max(0,s.getLastRow()-1),3).getValues()
    for (let r of rows){ const code=r[0], name=r[1]; if (code) out.push({ code, name, stock: 0 }) }
  }
  return { ok:true, items: out }
}
function _getInventory(){
  const s = sheetByName_('Productos'); const out=[]
  if (s){
    const rows = s.getRange(2,1,Math.max(0,s.getLastRow()-1),3).getValues()
    for (let r of rows){ const code=r[0], name=r[1]; if (code) out.push({ code, name, stock: Number(r[2]||0) }) }
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

// === Web App ===
function doGet(e){
  const a = String(e.parameter.action||'').toLowerCase()
  if (a==='products') return ok_(_listProducts())
  if (a==='inventory') return ok_(_getInventory())
  if (a==='dashboard') return ok_(_getDashboard())
  if (a==='payments') return ok_(_listPayments(e.parameter.scope))
  if (a==='expensetypes') return ok_(_listExpenseTypes())
  return bad_('unknown action')
}

function doPost(e){
  const data = JSON.parse(e.postData.contents||'{}')
  const a = String((data.action||'')).toLowerCase()
  if (a==='expense') return ok_(_addExpense(data))
  if (a==='uploadpdf') return ok_(uploadPurchasePDF(data))
  return bad_('unknown action')
}
