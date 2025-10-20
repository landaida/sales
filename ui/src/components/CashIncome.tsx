import React from 'react'
import { fmtGs, parseLocaleNumber } from '../utils/money'



export default function CashIncome(){
    // búsqueda en Clientes
    const [q,setQ] = React.useState(''); const [sugg,setSugg] = React.useState<{name:string;id:string}[]>([]);
    React.useEffect(()=>{ const t=setTimeout(async()=>{ const qs=q.trim(); if(!qs){ setSugg([]); return; }
        const r=await fetch(`/gsapi/exec?action=clients&q=${encodeURIComponent(qs)}`).then(r=>r.json());
        setSugg(r?.items||[]); },250); return ()=>clearTimeout(t);
    },[q]);
  const [person,setPerson]=React.useState('')
  const [descr,setDescr]=React.useState('Ingreso')
  const [amountText,setAmountText]=React.useState('0')
  const [n,setN]=React.useState(0)
  const [kind,setKind]=React.useState<'mensual'|'semanal'>('mensual')

  async function submit(){
    const amount = parseLocaleNumber(amountText,false)
    if(!person.trim() || amount<=0) return alert('Persona y monto obligatorios')
    const r = await fetch('/gsapi/exec', {
      method:'POST',
      body: JSON.stringify({ action:'cash_income', person, descr, amount, numCuotas:n, kind })
    }).then(r=>r.json())
    alert(r.ok?'Ingreso registrado':'Error')
  }

  const [items,setItems]=React.useState<any[]>([]), [cursor,setCursor]=React.useState<number|null>(0), [busy,setBusy]=React.useState(false);
    async function load(){ if(busy||cursor===null) return; setBusy(true);
    const r = await fetch(`/gsapi/exec?action=cash_income_history&cursor=${cursor}&limit=5`).then(r=>r.json());
    if(r?.ok){ setItems(p=>[...p,...(r.items||[])]); setCursor(r.next); } setBusy(false);
    }
    React.useEffect(()=>{ load() },[]);

  return (<section>
    <h2>Ingreso de efectivo</h2>
    <div style={{display:'flex', gap:8, alignItems:'center'}}>
      <input placeholder="Cliente/Proveedor/Inversionista" value={person} onChange={e=>setPerson(e.target.value)} style={{width:320}}/>
      <input placeholder="Descripción" value={descr} onChange={e=>setDescr(e.target.value)} style={{width:220}}/>
      <input placeholder="Monto (Gs)" value={amountText} onChange={e=>setAmountText(e.target.value)} style={{width:160}}/>
      <label>Cuotas: <input type="number" value={n} onChange={e=>setN(Number(e.target.value)||0)} style={{width:80}}/></label>
      <select value={kind} onChange={e=>setKind(e.target.value as any)}><option value="mensual">Mensual</option><option value="semanal">Semanal</option></select>
      <button onClick={submit}>Agregar</button>
    </div>
      <input placeholder="Buscar persona (Clientes)" value={q} onChange={e=>setQ(e.target.value)} />

    {!!q.trim() && !!sugg.length && <div> {sugg.map(c=> <div onClick={()=>{setPerson(c.name); setQ(''); setSugg([]);}}>{c.name} — {c.id}</div>)} </div>}

    <h3>Últimos</h3>
    <table style={{width:'100%'}}><thead><tr><th>Fecha</th><th>Descripción</th><th>Nota</th><th style={{textAlign:'right'}}>Monto</th></tr></thead>
        <tbody>{items.map((r,i)=>(<tr key={i}><td>{new Date(r.date).toLocaleString()}</td><td>{r.descr}</td><td>{r.note}</td><td style={{textAlign:'right'}}>{fmtGs.format(r.amount||0)}</td></tr>))}</tbody>
    </table>
    {cursor!==null && <button onClick={load} disabled={busy} style={{marginTop:8}}>{busy?'Cargando...':'Cargar más'}</button>}
  </section>)
}
