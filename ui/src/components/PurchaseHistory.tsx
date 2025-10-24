import React, { useEffect, useState } from 'react'
import { GoogleSheetsRepo } from '../storage/GoogleSheetsRepo'
import { fmtGs } from '../utils/money'
import { useOverlay } from '../overlay/OverlayContext';


const repo = new GoogleSheetsRepo()

export default function PurchaseHistory(){
  const { withOverlay } = useOverlay();
  const [items,setItems] = useState<any[]>([])
  const [cursor,setCursor] = useState<number|null>(0)
  const [busy,setBusy] = useState(false)
  const [expanded,setExpanded] = useState<Record<string, any[]>>({})

  async function load(){
    if (busy || cursor===null) return
    setBusy(true)
    try{
      const r = await repo.purchaseHistory(cursor, 5)
      if (r?.ok){ setItems(prev=> [...prev, ...r.items]); setCursor(r.next) }
    } finally { setBusy(false) }
  }
  useEffect(()=>{ load() },[])

  async function toggle(factura:string){
    if (expanded[factura]){ const cp={...expanded}; delete cp[factura]; setExpanded(cp); return }
    const r = await repo.purchaseDetails(factura)
    setExpanded(prev=> ({...prev, [factura]: r?.items||[] }))
  }

  return (
    <section>
      <h2>Historial de compras (últimas 5)</h2>
      <ul style={{listStyle:'none', padding:0}}>
        {items.map((h,i)=>(
          <li key={i} style={{border:'1px solid #ddd', borderRadius:6, padding:8, marginBottom:8}}>
            <div style={{display:'flex', gap:12, alignItems:'center', justifyContent:'space-between'}}>
              <div><b>{new Date(h.date).toLocaleString()}</b> — {h.supplier} — {h.factura} &nbsp;
                <span style={{opacity:0.7}}>Total: {fmtGs.format(h.totalGs||0)} Gs</span>
              </div>
              <div>
                {h.fileUrl && <a href={h.fileUrl} target="_blank" rel="noreferrer" style={{marginRight:12}}>PDF</a>}
                <button onClick={()=>toggle(h.factura)}>{expanded[h.factura]?'Ocultar':'Ver detalles'}</button>
              </div>
            </div>
            {expanded[h.factura] && (
              <table style={{marginTop:8, width:'100%', borderCollapse:'collapse'}}>
                <thead><tr><th>Cod</th><th>Producto</th><th>Color</th><th>Talla</th><th>Qty</th><th>Unit Gs</th><th>Total Gs</th></tr></thead>
                <tbody>{expanded[h.factura].map((l:any,ix:number)=>(
                  <tr key={ix}>
                    <td>{l.code}</td><td>{l.product}</td><td>{l.color}</td><td>{l.size}</td>
                    <td>{l.qty}</td><td style={{textAlign:'right'}}>{Math.round(l.unitGs)}</td><td style={{textAlign:'right'}}>{Math.round(l.totalGs)}</td>
                  </tr>
                ))}</tbody>
              </table>
            )}
          </li>
        ))}
      </ul>
      {cursor!==null && <button disabled={busy} onClick={load}>{busy?'Cargando...':'Cargar más'}</button>}
    </section>
  )
}
