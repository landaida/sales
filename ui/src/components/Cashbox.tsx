import React from 'react'
import { GoogleSheetsRepo } from '../storage/GoogleSheetsRepo'
import { fmtGs } from '../utils/money'
const repo = new GoogleSheetsRepo()
import { useOverlay } from '../overlay/OverlayContext';

export default function Cashbox(){
  const { withOverlay } = useOverlay();
  const [sum,setSum]=React.useState<any>(); const [items,setItems]=React.useState<any[]>([]);
  const [cursor,setCursor]=React.useState<number|null>(0); 
  const [busy,setBusy]=React.useState(false);
  const [cursorAr,setCursorAr]=React.useState<number|null>(0); 
  const [busyAr,setBusyAr]=React.useState(false);
  const [ar,setAr]=React.useState<any[]>([]); const [who,setWho]=React.useState<string>(''); const [rows,setRows]=React.useState<any[]>([]);
  React.useEffect(()=>{ (async()=>{
    moreMoves()
    moreACobrarByClient()
    setSum(await repo.cashbox());
  })() },[]);
  async function moreMoves(){ if(busy||cursor===null) return; setBusy(true); 
    const r = await withOverlay(repo.cashboxMoves(cursor,5),'Cargando...')

    setItems(p=>[...p,...(r.items||[])]); setCursor(r.next); setBusy(false) }
  async function moreACobrarByClient(){ if(busyAr||cursorAr===null) return; setBusyAr(true); 
    const r = await withOverlay(repo.arByClient(cursorAr,5),'Cargando...')
    setAr(r.items||[]); setCursorAr(r.next); setBusyAr(false) }

  async function open(c:string){ setWho(c); const r=await repo.arDetails(c); setRows(r.items||[]) }

  return (<section>
    <h2>Caja</h2>
    <div style={{display:'flex',gap:24,marginBottom:12}}>
      <div><b>Efectivo:</b> {fmtGs.format(sum?.cashOnHand||0)}</div>
      <div><b>Por cobrar:</b> {fmtGs.format(sum?.receivablesTotal||0)}</div>
    </div>

    <h3>Movimientos</h3>
    <table style={{width:'100%'}}><thead>
  <tr>
    <th>Fecha</th><th>Tipo</th><th>Ref</th><th>Desc</th><th>Cliente</th><th>Proveedor</th>
    <th style={{textAlign:'right'}}>Subtotal</th>
    <th style={{textAlign:'right'}}>Desc</th>
    <th style={{textAlign:'right'}}>Entrega</th>
    <th style={{textAlign:'right', paddingRight:'4.0rem'}}>A plazo</th>
    <th style={{textAlign:'right', paddingRight:'2.5rem'}}>Entrada G$</th>
    <th style={{textAlign:'right'}}>Salida G$</th>
    <th style={{textAlign:'center'}}>Status</th>
  </tr>
</thead>
<tbody>
{items.map((r,i)=>(
  <tr key={i}>
    <td>{new Date(r.date).toLocaleString()}</td>
    <td>{r.tipo}</td>
    <td>
      {r.tipo==='venta'
        ? <a href={`#SalesHistory?ticket=${encodeURIComponent(r.ref)}`}>{r.ref}</a>
        : r.tipo==='compra'
        ? <a href={`#PurchaseHistory?factura=${encodeURIComponent(r.ref)}`}>{r.ref}</a>
        : r.ref}
    </td>
    <td>{r.descr}</td>
    <td>{r.cliente}</td>
    <td>{r.proveedor}</td>
    <td style={{textAlign:'right'}}>{fmtGs.format(r.subtotal||0)}</td>
    <td style={{textAlign:'right'}}>{fmtGs.format(r.descuento||0)}</td>
    <td style={{textAlign:'right'}}>{fmtGs.format(r.entrega||0)}</td>
    <td style={{textAlign:'right', paddingRight:'4.0rem'}}>{fmtGs.format(r.aplazo||0)}</td>
    <td style={{textAlign:'right', paddingRight:'2.5rem'}}>{fmtGs.format(r.ingreso||0)}</td>
    <td style={{textAlign:'right'}}>{fmtGs.format(r.egreso||0)}</td>
    <td style={{textAlign:'right'}}>{r.status || 'activo'}</td>
  </tr>
))}
</tbody></table>
    {cursor!==null && <button onClick={moreMoves} disabled={busy} style={{marginTop:8}}>{busy?'Cargando...':'Cargar más'}</button>}

    <h3 style={{marginTop:20}}>Cuentas por cobrar (por cliente)</h3>
    <ul>{ar.map((a:any,i:number)=>(<li key={i}><a href="#" onClick={e=>{e.preventDefault();open(a.cliente)}}>{a.cliente}</a>: <b>{fmtGs.format(a.total)}</b></li>))}</ul>
    
    {cursorAr!==null && <button onClick={moreACobrarByClient} disabled={busyAr} style={{marginTop:8}}>{busyAr?'Cargando...':'Cargar más'}</button>}

    {!!who && <div style={{border:'1px solid #ddd',borderRadius:6,padding:8,marginTop:8}}>
      <b>Detalle de {who}</b>
      <table style={{width:'100%',marginTop:6}}><thead><tr><th>Ticket</th><th>Cuota</th><th>Fecha</th><th style={{textAlign:'right'}}>Monto</th><th>Estado</th></tr></thead>
      <tbody>{rows.map((d:any,i:number)=>(<tr key={i}><td>{d.ticketId}</td><td>{d.cuota}</td><td>{new Date(d.fecha).toLocaleDateString()}</td><td style={{textAlign:'right'}}>{fmtGs.format(d.monto||0)}</td><td>{d.estado}</td></tr>))}</tbody></table>
    </div>}
  </section>);
}
