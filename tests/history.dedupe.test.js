// Dedupe by fileId||factura (newest first), limit N
function dedupe(rows, cursor=0, limit=5){
  rows = rows.slice().reverse(); // like Code.gs
  const seen={}, out=[];
  for (let i=cursor; i<rows.length && out.length<limit; i++){
    const factura = String(rows[i][6]||'');
    const fileId  = String(rows[i][15]||'');
    const key = fileId || factura;
    if (seen[key]) continue;
    seen[key]=1;
    out.push([ factura, fileId ]);
  }
  return out;
}
const rows = [
  [,,,'',100,100,'F-001','', '30262','','','', 10,10,1340,'FILE-1'],
  [,,,'',100,100,'F-001','', '30262','','','', 10,10,1340,'FILE-1'],
  [,,,'',100,100,'F-002','', '30264','','','', 12,24,1340,'FILE-2'],
];
const out = dedupe(rows, 0, 5);
if (out.length!==2) throw new Error('expected two unique headers');
console.log('OK history dedupe');
