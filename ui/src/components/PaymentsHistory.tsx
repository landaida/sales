import React from 'react'
import { GoogleSheetsRepo } from '../storage/GoogleSheetsRepo'
import { useOverlay } from '../overlay/OverlayContext';

const repo = new GoogleSheetsRepo()
export default function PaymentsHistory({ scope }:{ scope?:string }){
  const { withOverlay } = useOverlay();
  const [rows, setRows] = React.useState<any[]>([])
  React.useEffect(()=>{ repo.listPayments(scope).then(r=> setRows(r.items||[])) },[scope])
  return (<section><h2>{scope==='due'?'Cobros (pendientes)':'Historial de cobros'}</h2>
    <table><thead><tr><th>Fecha</th><th>Factura</th><th>Cliente</th><th>Monto</th></tr></thead>
      <tbody>{rows.map((r:any,i:number)=>(<tr key={i}><td>{r.date||''}</td><td>{r.invoiceId||r.invoice||''}</td><td>{r.customer||''}</td><td>{r.amount||0}</td></tr>))}</tbody>
    </table>
  </section>)
}
