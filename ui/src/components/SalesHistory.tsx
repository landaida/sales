import React, { useEffect, useState } from 'react'
import { fmtGs } from '../utils/money'
import { useOverlay } from '../overlay/OverlayContext';
import { GoogleSheetsRepo } from '../storage/GoogleSheetsRepo'

const repo = new GoogleSheetsRepo()

export default function SalesHistory(){
  const { withOverlay } = useOverlay();
  const [items,setItems] = useState<any[]>([])
  const [cursor,setCursor] = useState<number|null>(0)
  const [busy,setBusy] = useState(false)
  const [details,setDetails] = useState<Record<string, any[]>>({})

  async function load(){
    if (busy || cursor===null) return
    setBusy(true)
    try{
      const r = await withOverlay(repo.salesHistory(cursor,5),'Cargando...')
      if (r?.ok){ setItems(p=>[...p,...r.items]); setCursor(r.next) }
    } finally { setBusy(false) }
  }
  useEffect(()=>{ load() },[])

  async function toggle(ticket:string){
    if (details[ticket]){ const cp={...details}; delete cp[ticket]; setDetails(cp); return }
    
    const r = await withOverlay(repo.salesHistoryDetails(ticket),'Cargando...')

    setDetails(p=> ({...p, [ticket]: r?.items||[] }))
  }

  return (
    <section>
      <h2>Historial de ventas (últimas 5)</h2>
      <ul style={{listStyle:'none', padding:0}}>
        {items.map((h,i)=>(
          <li key={i} style={{border:'1px solid #ddd', borderRadius:6, padding:8, marginBottom:8}}>
            <div style={{display:'flex', gap:12, alignItems:'center', justifyContent:'space-between'}}>
              <div><b>{new Date(h.date).toLocaleString()}</b> — {h.ticket} — {h.cliente} &nbsp;
                <span style={{opacity:0.8}}>
                  Total: {fmtGs.format(h.total||0)} | Desc: {fmtGs.format(h.descuento||0)} | Entrega: {fmtGs.format(h.entrega||0)} | A plazo: {fmtGs.format(h.aplazo||0)} | Status: {h.status}
                </span>
              </div>
              <button onClick={()=>toggle(h.ticket)}>{details[h.ticket]?'Ocultar':'Ver detalles'}</button>
            </div>
            {details[h.ticket] && (
              <table style={{marginTop:8, width:'100%', borderCollapse:'collapse'}}>
                <thead><tr><th>Producto</th><th>Cant</th><th style={{textAlign:'center'}}>Total</th><th style={{textAlign:'center'}}>Desc$</th></tr></thead>
                <tbody>{details[h.ticket].map((l:any,ix:number)=>(
                  <tr key={ix}><td>{l.producto}</td><td>{l.qty}</td><td style={{textAlign:'right'}}>{fmtGs.format(l.total||0)}</td><td style={{textAlign:'right'}}>{fmtGs.format(l.desc||0)}</td></tr>
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
