import React from 'react'
import { GoogleSheetsRepo } from '../storage/GoogleSheetsRepo'
import { fmtGs, parseLocaleNumber } from '../utils/money'
import { useOverlay } from '../overlay/OverlayContext';

const repo = new GoogleSheetsRepo()

export default function PagosView(){
  const { withOverlay } = useOverlay();
  const [pend,setPend]=React.useState<any[]>([]); const [pc,setPc]=React.useState<number|null>(0); const [pb,setPb]=React.useState(false)
  const [hist,setHist]=React.useState<any[]>([]); const [hc,setHc]=React.useState<number|null>(0); const [hb,setHb]=React.useState(false)

  React.useEffect(()=>{ loadP(); loadH(); },[])

  async function loadP(reset:boolean=false){ if(!reset && (pb||pc===null)) return; setPb(true);
    const r = await withOverlay(repo.payablesPending(pc,5),'Cargando...')
    reset ? setPend((r.items||[])) : setPend(p=>[...p,...(r.items||[])]); 
    setPc(r.next); 
    setPb(false)
  }
  async function loadH(reset:boolean=false){ if(!reset && (hb||hc===null)) return; setHb(true);
    const r = await withOverlay(repo.paymentsHistory(hc,5),'Cargando...')
    reset ? setHist((r.items||[])) : setHist(p=>[...p,...(r.items||[])]);
    setHc(r.next);
    setHb(false)
  }

  async function pay(refId:string, n:number, monto:number, raw:string){
    // debugger
    const a=parseLocaleNumber(raw,false);
    const r = await withOverlay(repo.payablePay(refId,n,a||monto),'Procesando...')
    if(r.ok) {
        loadP(true);
        loadH(true);
    }
    alert(r.ok?'Pago OK':'Error');
  }

  return (<section>
    <h2>Pagos</h2>
    <h3>Pendientes</h3>
    <table style={{width:'100%'}}><thead><tr>
      <th>Vence</th><th>Ref</th><th>Persona</th><th>#</th>
      <th style={{textAlign:'right'}}>Monto</th>
      <th style={{textAlign:'right'}}>Pago parcial</th></tr></thead>
      <tbody>{pend.map((r:any,i:number)=>(
        <tr key={i}>
          <td>{new Date(r.fecha).toLocaleDateString()}</td>
          <td>{r.refId}</td>
          <td>{r.persona}</td>
          <td>{r.cuota}</td>
          <td style={{textAlign:'right'}}>{fmtGs.format(r.monto||0)}</td>
          <td style={{textAlign:'right'}}>
            <input id={`pp${i}`} type="text" inputMode="numeric" placeholder="0" style={{width:120}} />
          </td>
          <td>
            <button onClick={()=>{
              const v=(document.getElementById('pp'+i) as HTMLInputElement).value;
              pay(r.refId, r.cuota, r.monto, v);
            }}>Pagar</button>
          </td>
        </tr>
      ))}</tbody>
    </table>
    {pc!==null && <button onClick={loadP} disabled={pb} style={{marginTop:8}}>{pb?'Cargando...':'Cargar más'}</button>}

    <h3 style={{marginTop:20}}>Últimos pagos</h3>
    <table style={{width:'100%'}}><thead><tr><th>Fecha</th><th>Ref</th><th>Persona</th><th style={{textAlign:'right'}}>Monto</th></tr></thead>
      <tbody>{hist.map((r:any,i:number)=>(
        <tr key={i}>
          <td>{new Date(r.date).toLocaleString()}</td>
          <td>{r.refId}</td>
          <td>{r.persona}</td>
          <td style={{textAlign:'right'}}>{fmtGs.format(r.monto||0)}</td>
        </tr>
      ))}</tbody>
    </table>
    {hc!==null && <button onClick={loadH} disabled={hb} style={{marginTop:8}}>{hb?'Cargando...':'Cargar más'}</button>}
  </section>)
}
