
import React from 'react'
import { GoogleSheetsRepo } from '../storage/GoogleSheetsRepo'
import { fmtGs, parseLocaleNumber } from '../utils/money'
import { useOverlay } from '../overlay/OverlayContext'

const repo = new GoogleSheetsRepo()

function MoneyInputGs({ value, onChange, style }:{ value:number; onChange:(n:number)=>void; style?:React.CSSProperties }){
  const [editing,setEditing]=React.useState(false)
  const [text,setText]=React.useState('')
  React.useEffect(()=>{ if(!editing) setText(fmtGs.format(Number(value||0))) },[value,editing])
  return (
    <input type="text" inputMode="numeric" value={text}
      onFocus={()=>{ setEditing(true); setText(String(Number(value||0))) }}
      onChange={e=>{ setText(e.target.value); onChange(parseLocaleNumber(e.target.value,false)); }}
      onBlur={()=> setEditing(false)}
      style={style}
    />
  )
}

type Cuota = { n:number; date:string; amount:number; manual?:boolean }

export default function CreateARView(){
  const { withOverlay } = useOverlay()

  const [q,setQ] = React.useState(''); const [sugg,setSugg]=React.useState<{name:string;id:string}[]>([])
  React.useEffect(()=>{
    const t=setTimeout(async()=>{
      const s=q.trim(); if(!s){ setSugg([]); return; }
      try{ const r = await repo.searchClients(s); setSugg(r?.items||[]); }catch{ setSugg([]); }
    },250); return ()=>clearTimeout(t)
  },[q])
  const [name,setName]=React.useState('')
  const [doc,setDoc]  =React.useState('')

  const [amount,setAmount]=React.useState<number>(0)
  const [n,setN]=React.useState<number>(2)
  const [kind,setKind]=React.useState<'mensual'|'semanal'>('mensual')
  const [sch,setSch]=React.useState<Cuota[]>([])
  const [noCash,setNoCash]=React.useState(true)

  function recalcPlan(preserveManual:boolean){
    const base = new Date()
    let next = Array.from({length: Math.max(0,n)}, (_,i)=>{
      const d = new Date(base)
      if (kind==='semanal') d.setDate(d.getDate() + (i+1)*7); else d.setMonth(d.getMonth() + (i+1))
      const exist = sch[i]
      const date = preserveManual && exist?.manual ? (exist.date) : d.toISOString().slice(0,10)
      return { n:i+1, date, amount: 0, manual: preserveManual ? !!exist?.manual : false }
    })

    const manualSum = next.reduce((a,x,i)=> a + (x.manual ? (sch[i]?.amount||0) : 0), 0)
    const restante  = Math.max(0, amount - manualSum)
    const libres    = next.map((s,i)=> s.manual ? -1 : i).filter(i=>i>=0)
    if (libres.length>0){
      const baseVal = Math.floor(restante/libres.length)
      let resto = restante - baseVal*libres.length
      libres.forEach((ix,idx)=>{ next[ix].amount = baseVal + (idx<resto?1:0) })
    }
    next = next.map((s,i)=> s.manual ? { ...s, amount: sch[i]?.amount || 0 } : s)
    setSch(next)
  }

  const prevKindRef = React.useRef(kind)
  React.useEffect(()=>{
    const kindChanged = prevKindRef.current !== kind
    prevKindRef.current = kind
    recalcPlan(!kindChanged)
  }, [amount, n, kind])

  function changeSch(i:number, field:'date'|'amount', val:string){
    setSch(prev=>{
      const cp = prev.map(x=>({...x}))
      if (!cp[i]) cp[i] = { n:i+1, date:new Date().toISOString().slice(0,10), amount:0 }
      if (field==='date') { cp[i].date = val; cp[i].manual = true }
      else { cp[i].amount = parseLocaleNumber(val,false); cp[i].manual = true }
      const manualSum = cp.reduce((a,x)=> a + (x.manual? x.amount : 0), 0)
      const restante  = Math.max(0, amount - manualSum)
      const libres    = cp.map((s,ix)=> s.manual? -1 : ix).filter(ix=> ix>=0)
      if (libres.length>0){
        const baseVal = Math.floor(restante/libres.length)
        let resto = restante - baseVal*libres.length
        libres.forEach((ix,idx)=>{ cp[ix].amount = baseVal + (idx<resto ? 1 : 0) })
      }
      return cp
    })
  }

  function resetPlan(){ recalcPlan(false) }

  async function submit(){
    if (!name.trim() || !doc.trim()) return alert('Cliente: nombre e ID requerido')
    if (amount<=0) return alert('Monto debe ser > 0')
    if (n<=0)      return alert('Cuotas debe ser > 0')

    const payload:any = {
      customer: { name:name.trim(), id:doc.trim() },
      amount, numCuotas:n, kind,
      extractCash: !noCash,
      installments: sch.map(s=> ({ n:s.n, date:s.date, amount:s.amount }))
    }
    const r = await withOverlay(repo.acobrarCreate(payload), 'Creando A Cobrar…')
    if (r?.ok){
      alert(`Creado OK: ${r.refId}`)
      setQ(''); setSugg([]); setName(''); setDoc('')
      setAmount(0); setN(2); setKind('mensual'); setSch([]); setNoCash(true)
    }else{
      alert('Error al crear')
    }
  }

  return (
    <section>
      <h2>Crear A Cobrar</h2>

      <div style={{display:'grid', gap:6, marginBottom:6}}>
        <input placeholder="Buscar cliente (nombre o ID)" value={q} onChange={e=>setQ(e.target.value)} />
        {!!q.trim() && !!sugg.length && (
          <div style={{border:'1px solid #ddd', borderRadius:6, padding:6, maxHeight:140, overflow:'auto'}}>
            {sugg.map((c,i)=>(
              <div key={i} style={{padding:'4px 6px', cursor:'pointer'}}
                   onClick={()=>{ setName(c.name); setDoc(c.id); setQ(''); setSugg([]); }}>
                <b>{c.name}</b> — <span style={{opacity:0.8}}>{c.id}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ display:'flex', gap:8, marginBottom:8 }}>
        <input placeholder="Cliente (Nombre)*" value={name} onChange={e=>setName(e.target.value)} />
        <input placeholder="Doc Cliente (ID)*" value={doc} onChange={e=>setDoc(e.target.value)} />
      </div>

      <div style={{display:'flex', gap:8, alignItems:'center', margin:'12px 0'}}>
        <select value="aplazo" onChange={()=>{}} disabled style={{opacity:0.7}}>
          <option value="aplazo">A plazo</option>
        </select>
        <button onClick={resetPlan}>Reestablecer</button>

        <span style={{marginLeft:8}}>(Gs):</span>
        <span><MoneyInputGs value={amount} onChange={setAmount} style={{width:160}}/></span>
        <span>Cuotas:</span>
        <input type="number" value={n} onChange={e=>setN(Math.max(1, Number(e.target.value)||1))} style={{width:80}}/>
        <select value={kind} onChange={e=>setKind(e.target.value as any)}>
          <option value="mensual">Mensual</option>
          <option value="semanal">Semanal</option>
        </select>
        <label style={{display:'flex', alignItems:'center', gap:6, marginLeft:16}}>
          <input type="checkbox" checked={noCash} onChange={e=>setNoCash(e.target.checked)} />
          No extrae dinero de la caja
        </label>
      </div>

      {n>0 && (
        <div style={{marginTop:10}}>
          <h3>Plan de pagos (editable)</h3>
          <table><thead><tr><th>#</th><th>Fecha</th><th>Monto</th><th></th></tr></thead>
            <tbody>{sch.map((s,i)=>(
              <tr key={i}>
                <td>{s.n}</td>
                <td><input type="date" value={s.date} onChange={e=>changeSch(i,'date',e.target.value)} /></td>
                <td><MoneyInputGs value={s.amount} onChange={n=>changeSch(i,'amount',String(n))} style={{width:130}}/></td>
                <td style={{textAlign:'center'}}>{s.manual?'✔':''}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}

      <div style={{marginTop:12}}>
        <button onClick={submit} style={{padding:'8px 16px', fontWeight:700, borderRadius:8}}>Registrar</button>
      </div>
    </section>
  )
}
