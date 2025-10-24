import React from 'react'
import { GoogleSheetsRepo } from '../storage/GoogleSheetsRepo'
import { fmtGs } from '../utils/money'
import { useOverlay } from '../overlay/OverlayContext';

const repo = new GoogleSheetsRepo()
const BLOCK_ON_APPLY = true; // ← poné true si querés overlay bloqueante
export default function AdjustmentsView(){
  const { withOverlay } = useOverlay();
  const [items,setItems]=React.useState<any[]>([])
  const [cursor,setCursor]=React.useState<number|null>(0)
  const [busy,setBusy]=React.useState(false)
  const [sel,setSel]=React.useState<string>('')
  const [msg,setMsg]=React.useState<string>('')

  async function load(reset:boolean=false){ if(!reset && (busy||cursor===null)) return; setBusy(true);
    try{ 
      // const r=await repo.adjustList(cursor,10); 
      const r = await withOverlay(repo.adjustList(cursor,10),'Cargando...')
      setItems(p=> reset ? (r.items||[]) : [...p,...(r.items||[])]); setCursor(r.next) 
    } finally{ setBusy(false) } }
  React.useEffect(()=>{ load(true) },[])

  async function apply(){
    if(!sel) return alert('Selecciona un movimiento');
    setBusy(true); setMsg('');
    try{
      // const r = await repo.adjustApply(sel);
      // withOverlay() (más concisa)
      const r = await withOverlay(repo.adjustApply(sel), 'Aplicando ajuste…');
      setMsg(r?.ok ? `Ajuste aplicado: ${r.result?.amId||'OK'}` : (r?.error||'Error'));
      load(true)
    } finally { 
      setBusy(false) 
    }
  }

  return (
   <section style={{position:'relative'}}>
    <h2>Ajuste de Movimientos</h2>
    {/* <p>Selecciona exactamente <b>uno</b>. Los AM no aparecen en esta lista.</p> */}
    <table style={{width:'100%'}}><thead><tr>
      <th></th><th>Fecha</th><th>Tipo</th><th>Ref</th><th>Cliente</th><th>Proveedor</th>
      <th style={{textAlign:'right'}}>Ingreso</th><th style={{textAlign:'right'}}>Egreso</th>
      <th style={{textAlign:'right'}}>Entrega</th><th style={{textAlign:'right'}}>A plazo</th></tr></thead>
      <tbody>{items.map((r:any)=>(
        <tr key={r.moveId}>
          <td><input type="radio" name="sel" checked={sel===r.moveId} onChange={()=>setSel(r.moveId)} /></td>
          <td>{new Date(r.date).toLocaleString()}</td>
          <td>{r.tipo}</td><td>{r.ref}</td><td>{r.cliente}</td><td>{r.proveedor}</td>
          <td style={{textAlign:'right'}}>{fmtGs.format(r.ingreso||0)}</td>
          <td style={{textAlign:'right'}}>{fmtGs.format(r.egreso||0)}</td>
          <td style={{textAlign:'right'}}>{fmtGs.format(r.entrega||0)}</td>
          <td style={{textAlign:'right'}}>{fmtGs.format(r.aplazo||0)}</td>
        </tr>
      ))}</tbody>
    </table>
    {cursor!==null && <button onClick={()=>load(false)} disabled={busy} style={{marginTop:8}}>{busy?'Cargando...':'Cargar más'}</button>}
    <div style={{marginTop:12}}>
      <button onClick={apply} disabled={busy || !sel}>{'Aplicar ajuste'}</button>
      {!!msg && <span style={{marginLeft:12}}>{msg}</span>}
    </div>
  </section>)
}
