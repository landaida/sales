import React from 'react'
import { GoogleSheetsRepo } from '../storage/GoogleSheetsRepo'
import { fmtGs } from '../utils/money'
const repo = new GoogleSheetsRepo()

export default function Cashbox(){
  const [sum,setSum]=React.useState<any>(); const [items,setItems]=React.useState<any[]>([]);
  const [cursor,setCursor]=React.useState<number|null>(0); const [busy,setBusy]=React.useState(false);
  const [ar,setAr]=React.useState<any[]>([]); const [who,setWho]=React.useState<string>(''); const [rows,setRows]=React.useState<any[]>([]);
  React.useEffect(()=>{ (async()=>{ setSum(await repo.cashbox()); const m=await repo.cashboxMoves(0,10); setItems(m.items||[]); setCursor(m.next); const a=await repo.arByClient(); setAr(a.items||[]); })() },[]);
  async function more(){ if(busy||cursor===null) return; setBusy(true); const r=await repo.cashboxMoves(cursor,10); setItems(p=>[...p,...(r.items||[])]); setCursor(r.next); setBusy(false) }
  async function open(c:string){ setWho(c); const r=await repo.arDetails(c); setRows(r.items||[]) }

  return (<section>
    <h2>Caja</h2>
    <div style={{display:'flex',gap:24,marginBottom:12}}>
      <div><b>Efectivo:</b> {fmtGs.format(sum?.cashOnHand||0)}</div>
      <div><b>Por cobrar:</b> {fmtGs.format(sum?.receivablesTotal||0)}</div>
    </div>

    <h3>Movimientos</h3>
    <table style={{width:'100%'}}><thead><tr><th>Fecha</th><th>Tipo</th><th>Ref</th><th>Desc</th><th>Cliente</th><th>Proveedor</th><th style={{textAlign:'right'}}>Ing</th><th style={{textAlign:'right'}}>Egr</th></tr></thead>
    <tbody>{items.map((r,i)=>(<tr key={i}><td>{new Date(r.date).toLocaleString()}</td><td>{r.tipo}</td><td>{r.ref}</td><td>{r.descr}</td><td>{r.cliente}</td><td>{r.proveedor}</td><td style={{textAlign:'right'}}>{fmtGs.format(r.ingreso||0)}</td><td style={{textAlign:'right'}}>{fmtGs.format(r.egreso||0)}</td></tr>))}</tbody></table>
    {cursor!==null && <button onClick={more} disabled={busy} style={{marginTop:8}}>{busy?'Cargando...':'Cargar más'}</button>}

    <h3 style={{marginTop:20}}>Cuentas por cobrar (por cliente)</h3>
    <ul>{ar.map((a:any,i:number)=>(<li key={i}><a href="#" onClick={e=>{e.preventDefault();open(a.cliente)}}>{a.cliente}</a>: <b>{fmtGs.format(a.total)}</b></li>))}</ul>

    {!!who && <div style={{border:'1px solid #ddd',borderRadius:6,padding:8,marginTop:8}}>
      <b>Detalle de {who}</b>
      <table style={{width:'100%',marginTop:6}}><thead><tr><th>Ticket</th><th>Cuota</th><th>Fecha</th><th style={{textAlign:'right'}}>Monto</th><th>Estado</th></tr></thead>
      <tbody>{rows.map((d:any,i:number)=>(<tr key={i}><td>{d.ticketId}</td><td>{d.cuota}</td><td>{new Date(d.fecha).toLocaleDateString()}</td><td style={{textAlign:'right'}}>{fmtGs.format(d.monto||0)}</td><td>{d.estado}</td></tr>))}</tbody></table>
    </div>}
  </section>);
}
