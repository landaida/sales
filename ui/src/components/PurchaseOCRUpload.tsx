import React from 'react'
import { GoogleSheetsRepo } from '../storage/GoogleSheetsRepo'
const repo = new GoogleSheetsRepo()
export default function PurchaseOCRUpload(){
  const [file,setFile]=React.useState<File|null>(null)
  const [supplier,setSupplier]=React.useState('')
  const [prefer,setPrefer]=React.useState<'AV'|'PZ'>('AV')
  const [debug,setDebug]=React.useState(true)
  const [busy,setBusy]=React.useState(false)
  async function importPdf(){
    if(!file) return alert('Seleccione un PDF')
    setBusy(true)
    try{
      const b64 = await file.arrayBuffer().then(b=> btoa(String.fromCharCode(...new Uint8Array(b))))
      const res = await repo.uploadPurchasePDF({ b64, filename:file.name, supplier: supplier||undefined, preferPrice:prefer, debug })
      if (debug && res?.sample) console.log('OCR sample:', res.sample)
      alert(res?.ok ? `Importados ${res.imported||0} ítems de ${res.supplier||''}` : `Error: ${res?.error||'unknown'}`)
    }catch(e:any){ alert('Error: '+(e?.message||e)) } finally { setBusy(false) }
  }
  return (<section><h2>Importar Compras (PDF con OCR)</h2>
    <div style={{display:'grid', gap:8}}>
      <div><strong>PDF</strong> <input type="file" accept="application/pdf" onChange={e=> setFile(e.target.files?.[0]||null)} /></div>
      <div style={{display:'flex', gap:8, alignItems:'center'}}>
        <label>Proveedor</label><input value={supplier} onChange={e=>setSupplier(e.target.value)} placeholder="OXYRIO / VITALLY / GABY" />
        <label>Precio</label><select value={prefer} onChange={e=>setPrefer(e.target.value as any)}><option value="AV">AV</option><option value="PZ">PZ</option></select>
        <label><input type="checkbox" checked={debug} onChange={e=>setDebug(e.target.checked)} /> Debug OCR</label>
        <button disabled={!file||busy} onClick={importPdf}>{busy?'Procesando...':'Importar compra'}</button>
      </div>
    </div>
  </section>)
}
