import React, { useEffect, useMemo, useState } from 'react';
import { GoogleSheetsRepo } from '../storage/GoogleSheetsRepo'
import { fmtGs } from '../utils/money'
import { useOverlay } from '../overlay/OverlayContext';

const repo = new GoogleSheetsRepo()
export default function ExpensesView(){
  const { withOverlay } = useOverlay();
  const [items,setItems]=useState<any[]>([]);
  const [cursor,setCursor]=useState<number|null>(0);
  const [busy,setBusy]=useState(false);
  const [amount,setAmount]=React.useState('0');
  const [types,setTypes]=React.useState<string[]>([])
  const [descr,setDescr]=React.useState('');
  const [note,setNote]=React.useState('')

  React.useEffect(()=>{ 
    repo.listExpenseTypes().then(r=> setTypes(r.items||[])) 
    load(); 
  },[])
  async function submit(){ const ok = await repo.addExpense(Number(amount||0), descr, note); alert(ok?.ok?'Gasto registrado':'Error') }
  
  // useEffect(()=>{
  //    load(); 
  // },[]);

  async function load(){ if(busy||cursor===null) return;
    
    if(busy||cursor===null) return; 

    setBusy(true);
    const r = await repo.listExpenses(cursor,5);
    setItems(p=>[...p,...(r.items||[])]); 
    setCursor(r.next); 
    setBusy(false);
    
  }
  return (<section><h2>Gastos</h2>
    <div style={{display:'flex', gap:8}}>
      <input value={amount} onChange={e=>setAmount(e.target.value)} placeholder="Monto" />
      <input list="types" value={descr} onChange={e=>setDescr(e.target.value)} placeholder="Descripción" />
      <datalist id="types">{types.map(t=><option key={t} value={t}/>)}</datalist>
      <input value={note} onChange={e=>setNote(e.target.value)} placeholder="Nota" />
      <button onClick={submit}>Registrar gasto</button>
    </div>
    <h3>Últimos</h3>
    <table style={{width:'100%'}}><thead><tr><th>Fecha</th><th>Descripción</th><th>Nota</th><th style={{textAlign:'right'}}>Monto</th></tr></thead>
      <tbody>{items.map((r,i)=>(<tr key={i}><td>{new Date(r.date).toLocaleString()}</td><td>{r.descr}</td><td>{r.note}</td><td style={{textAlign:'right'}}>{fmtGs.format(r.amount||0)}</td></tr>))}</tbody>
    </table>
    {cursor!==null && <button onClick={load} disabled={busy} style={{marginTop:8}}>{busy?'Cargando...':'Cargar más'}</button>}
  </section>)
}
