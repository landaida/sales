function ensurePayables_(){ 
  var s = sheetByName_('Payables'); 
  if (!s){ s = ss_().insertSheet('Payables'); s.appendRow(['ClientId','Name','OutstandingGs','UpdatedAt']); }
  return s;
}
function _loadApIndex_(){ try{ var s=PropertiesService.getScriptProperties().getProperty('IDX_AP'); return s?JSON.parse(s):{} }catch(e){ return {} } }
function _saveApIndex_(m){ PropertiesService.getScriptProperties().setProperty('IDX_AP', JSON.stringify(m||{})); }
function _findOrCreatePayableRow_(clientId, name){
  var idx=_loadApIndex_(), row = idx[clientId] || idx[name];
  var sh=ensurePayables_();
  if (!row){
    row = sh.getLastRow()+1;
    sh.getRange(row,1,1,4).setValues([[String(clientId||name||''), String(name||clientId||''), 0, new Date()]]);
    if (clientId) idx[clientId]=row;
    if (name)     idx[name]=row;
    _saveApIndex_(idx);
  } else {
    var cur = String(sh.getRange(row,2).getValue()||'');
    if (name && cur!==name) sh.getRange(row,2).setValue(name);
  }
  return row;
}
function upsertPayable_(clientId, name, deltaGs){
  var sh=ensurePayables_();
  var row=_findOrCreatePayableRow_(String(clientId||''), String(name||''));
  var cell=sh.getRange(row,3); var prev=Number(cell.getValue()||0);
  cell.setValue(prev + Number(deltaGs||0));
  sh.getRange(row,4).setValue(new Date());
  return true;
}
