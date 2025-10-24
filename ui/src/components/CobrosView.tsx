import React from 'react'
import { GoogleSheetsRepo } from '../storage/GoogleSheetsRepo'
import { fmtGs, parseLocaleNumber } from '../utils/money'
import { useOverlay } from '../overlay/OverlayContext';

const repo=new GoogleSheetsRepo()

export default function CobrosView(){
  const { withOverlay } = useOverlay();
  const [pend,setPend]=React.useState<any[]>([]); const [pc,setPc]=React.useState<number|null>(0); const [pb,setPb]=React.useState(false)
  const [hist,setHist]=React.useState<any[]>([]); const [hc,setHc]=React.useState<number|null>(0); const [hb,setHb]=React.useState(false)
  React.useEffect(()=>{ loadP(); loadH(); },[])
  async function loadP(){ if(pb||pc===null) return; setPb(true); const r=await repo.receivablesPending(pc,5); setPend(p=>[...p,...(r.items||[])]); setPc(r.next); setPb(false) }
  async function loadH(){ if(hb||hc===null) return; setHb(true); const r=await repo.receiptsHistory(hc,5); setHist(p=>[...p,...(r.items||[])]); setHc(r.next); setHb(false) }
  async function pay(tid:string, n:number, monto:number, raw:string){ 
    const a=parseLocaleNumber(raw,false);
    // debugger
    // if(a<=0) return; 
    const r=await repo.receivablePay(tid,n,a||monto); 
    
    alert(r.ok?'Cobro OK':'Error'); 

  }
  return (<section>
    <h2>Cobros</h2>
    <h3>Pendientes</h3>
    <table style={{width:'100%'}}><thead><tr><th>Vence</th><th>Ticket</th><th>Cliente</th><th>#</th><th style={{textAlign:'right'}}>Monto</th><th style={{textAlign:'right'}}>Entrega parcial</th></tr></thead>
      <tbody>{
        pend.map((r,i)=>(<tr key={i}>
          <td>{new Date(r.fecha).toLocaleDateString()}</td>
          <td><a href={`#SalesHistory?ticket=${encodeURIComponent(r.ticketId)}`}>{r.ticketId}</a></td>
          <td>{r.cliente}</td>
          <td>{r.cuota}</td>
          <td style={{textAlign:'right'}}>{fmtGs.format(r.monto||0)}</td>
          <td style={{textAlign:'right'}}>
            <input
              id={`p${i}`} type="text" inputMode="numeric" placeholder="0" style={{width:120}}
              // onKeyDown={e=>{
              //   if(e.key==='Enter'){
              //     const v=(e.target as HTMLInputElement).value;
              //     pay(r.ticketId, r.cuota, v);
              //     (e.target as HTMLInputElement).value='';
              //   }
              // }}
            />
          </td>
          <td>
            <button onClick={()=>{
              const v=(document.getElementById('p'+i) as HTMLInputElement).value;
              pay(r.ticketId, r.cuota, r.monto, v);
            }}>Pagar</button>
          </td>
        </tr>))}
      </tbody>
    </table>
    {pc!==null && <button onClick={loadP} disabled={pb} style={{marginTop:8}}>{pb?'Cargando...':'Cargar más'}</button>}

    <h3 style={{marginTop:20}}>Últimos cobros</h3>
    <table style={{width:'100%'}}><thead><tr><th>Fecha</th><th>Ticket</th><th>Cliente</th><th style={{textAlign:'right'}}>Monto</th></tr></thead>
      <tbody>{hist.map((r,i)=>(<tr key={i}><td>{new Date(r.date).toLocaleString()}</td><td>{r.ticketId}</td><td>{r.cliente}</td><td style={{textAlign:'right'}}>{fmtGs.format(r.monto||0)}</td></tr>))}</tbody>
    </table>
    {hc!==null && <button onClick={loadH} disabled={hb} style={{marginTop:8}}>{hb?'Cargando...':'Cargar más'}</button>}
  </section>)
}
