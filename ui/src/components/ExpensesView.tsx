import React from 'react'
import { GoogleSheetsRepo } from '../storage/GoogleSheetsRepo'
const repo = new GoogleSheetsRepo()
export default function ExpensesView(){
  const [amount,setAmount]=React.useState('0'); const [descr,setDescr]=React.useState(''); const [note,setNote]=React.useState('')
  const [types,setTypes]=React.useState<string[]>([])
  React.useEffect(()=>{ repo.listExpenseTypes().then(r=> setTypes(r.items||[])) },[])
  async function submit(){ const ok = await repo.addExpense(Number(amount||0), descr, note); alert(ok?.ok?'Gasto registrado':'Error') }
  return (<section><h2>Gastos</h2>
    <div style={{display:'flex', gap:8}}>
      <input value={amount} onChange={e=>setAmount(e.target.value)} placeholder="Monto" />
      <input list="types" value={descr} onChange={e=>setDescr(e.target.value)} placeholder="Descripción" />
      <datalist id="types">{types.map(t=><option key={t} value={t}/>)}</datalist>
      <input value={note} onChange={e=>setNote(e.target.value)} placeholder="Nota" />
      <button onClick={submit}>Registrar gasto</button>
    </div>
  </section>)
}
