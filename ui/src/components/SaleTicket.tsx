// src/components/SaleTicket.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { GoogleSheetsRepo } from '../storage/GoogleSheetsRepo';
import type { VariantItem, SaleItem } from '../storage/IRepository';
import { fmtGs, parseLocaleNumber } from '../utils/money';

const repo = new GoogleSheetsRepo();
const keyOf = (v:{code:string;color:string;size:string}) => `${v.code}|${v.color}|${v.size}`;

type Item={code:string;name:string;qty:number;price:number}
type Sch={n:number; date:string; amount:number; manual?:boolean}

function MoneyInputGs({
  value, onChange, style,
}: { value:number; onChange:(n:number)=>void; style?:React.CSSProperties }) {
  const [editing,setEditing]=useState(false);
  const [text,setText]=useState('');
  useEffect(()=>{ if(!editing) setText(fmtGs.format(Number(value||0))) },[value,editing]);

  return (
    <input
      type="text" inputMode="numeric" value={text}
      onFocus={()=>{ setEditing(true); setText(String(Number(value||0))) }}
      onChange={e=>{                       // <<--- recalcula en cada tecla
        setText(e.target.value);
        onChange(parseLocaleNumber(e.target.value,false));
      }}
      onBlur={()=> setEditing(false)}
      style={style}
    />
  );
}



export default function SaleTicket(){
  const [variants, setVariants] = useState<VariantItem[]>([]);
  const [stock, setStock] = useState<Record<string, number>>({});
  const [cart, setCart] = useState<Record<string, SaleItem>>({});
  const [custName, setCustName] = useState('');
  const [custId,   setCustId]   = useState('');
  
  const [discount, setDiscount] = useState<number>(0);
  // const [down,setDown]=useState(0)
  const [down, setDown] = useState<number>(0);

  const [items,setItems]=useState<Item[]>([{code:'30262',name:'TOP',qty:1,price:190000}])
  const [mode,setMode]=useState<'contado'|'plazo'>('contado')
  const [n,setN]=useState(0)
  const [kind,setKind]=useState<'mensual'|'semanal'>('mensual')
  const [sch,setSch]=useState<Sch[]>([])
  const [touch,setTouch]=useState(0)               // invalidador de recálculo

  // Load variants with stock
  useEffect(()=>{
    // repo.listVariants().then(r=>{
    //   if (!r.ok) return;
    //   setVariants(r.items);
    //   const m: Record<string, number> = {};
    //   r.items.forEach(v=> m[keyOf(v)] = v.stock);
    //   setStock(m);
    // });
    repo.listStockFast().then(r=>{
      if (!r.ok) return;
      // Adapt the shape to button grid (no color/size granularity).
      // We'll display one button per code with its stock and price.
      const items = r.items.map((it:any)=>({
        code: it.code, name: it.name, color: it.color, size: it.size, stock: it.stock, defaultPrice: it.defaultPrice
      }));
      setVariants(items);
      const m:Record<string,number> = {};
      items.forEach(v=> m[`${v.code}|${v.color}|${v.size}`] = v.stock);
      setStock(m);
    });
  },[]);

  // Client filter & suggestions
  const [clientFilter, setClientFilter] = useState('');
  const [clientMatches, setClientMatches] = useState<{name:string;id:string}[]>([]);

  // credit controls
  const [paymentMode, setPaymentMode] = useState<'contado'|'plazo'>('contado');
  const [creditKind, setCreditKind]   = useState<'mensual'|'semanal'>('mensual');
  const [numCuotas, setNumCuotas]     = useState<string>('0');

  // nuevos estados
  const [downPayment,setDownPayment]=useState<number>(0);
  type Cuota = { n:number; fecha:string; monto:number };
  const [installments, setInstallments] = useState<Cuota[]>([]);



  
  function regenPlan(total:number, down:number, kind:'mensual'|'semanal', n:number){
    const resto = Math.max(0, total - (down||0));
    const per   = n>0 ? Math.round(resto / n) : 0;
    const base  = new Date();
    const next:Cuota[] = [];
    for(let i=1;i<=n;i++){
      const d = new Date(base);
      if(kind==='semanal') d.setDate(d.getDate()+i*7); else d.setMonth(d.getMonth()+i);
      next.push({ n:i, fecha: d.toISOString().slice(0,10), monto: per });
    }
    setInstallments(next);
  }


  // Left click => move 1 unit to ticket
  function add(v: VariantItem){
    const k = keyOf(v);
    setStock(prev=>{
      const cur = prev[k] ?? v.stock;
      if (cur<=0) return prev;
      return { ...prev, [k]: cur-1 };
    });
    setCart(prev=>{
      const item = prev[k];
      if (!item) return { ...prev, [k]: { code:v.code, name:v.name, color:v.color, size:v.size, qty:1, price: v.defaultPrice||0 } };
      return { ...prev, [k]: { ...item, qty:item.qty+1 } };
    });
  }

  // Right panel click => return 1 unit to stock
  function remove(k:string){
    setCart(prev=>{
      const item = prev[k]; if (!item) return prev;
      const next = { ...prev };
      if (item.qty<=1) delete next[k];
      else next[k] = { ...item, qty:item.qty-1 };
      return next;
    });
    setStock(prev=> ({ ...prev, [k]: (prev[k]??0)+1 }));
  }

  // const subtotal = useMemo(()=> Object.values(cart)
  //   .reduce((acc,it)=> acc + it.qty*it.price, 0), [cart]);
  // const total = Math.max(0, subtotal - (discount||0));

  const subtotal = useMemo(()=> {
    return Object.values(cart).reduce((sum,it)=> sum + (Number(it.qty||0) * Number(it.price||0)), 0);
  }, [cart]);
  const total = Math.max(0, Number(subtotal) - Number(discount||0));
  
    // Recalcular plan respetando cuotas manuales
  // function recalcPlan(respectManual:boolean){
  //   if (mode!=='plazo'){ setSch([]); return; }
  //   const base = new Date();
  //   // slots base con fechas
  //   let next:Sch[] = Array.from({length: Math.max(0,n)}, (_,i)=>{
  //     const d = new Date(base);
  //     if(kind==='semanal') d.setDate(d.getDate()+(i+1)*7); else d.setMonth(d.getMonth()+(i+1));
  //     const exist = sch[i];
  //     return { n:i+1, date: exist?.date || d.toISOString().slice(0,10), amount: 0, manual: respectManual ? exist?.manual : false };
  //   });
  //   // reset manual si no respetamos
  //   if (!respectManual) next = next.map(s=> ({...s, manual:false}));

  //   // suma manual
  //   const manualSum = next.reduce((acc,slot,i)=> acc + (slot.manual ? (sch[i]?.amount||0) : 0), 0);
  //   // repartir resto entre no-manuales
  //   const restante = Math.max(0, total - (down||0) - manualSum);
  //   const libresIdx = next.map((s,i)=> s.manual? -1 : i).filter(i=> i>=0);
  //   const m = libresIdx.length;
  //   if (m>0){
  //     const baseVal = Math.floor(restante / m);
  //     let resto = restante - baseVal*m;
  //     libresIdx.forEach((i,idx)=>{ next[i].amount = baseVal + (idx < resto ? 1 : 0); });
  //   }
  //   // reinyectar manuales
  //   next = next.map((s,i)=> s.manual ? ({...s, amount: sch[i]?.amount||0}) : s);
  //   setSch(next);
  // }

  function recalcPlan(respectManual: boolean){
  if (mode !== 'plazo'){ setSch([]); return; }

  const base = new Date();
  let next: Sch[] = Array.from({ length: Math.max(0, n) }, (_, i) => {
    const d = new Date(base);
    if (kind === 'semanal') d.setDate(d.getDate() + (i + 1) * 7); else d.setMonth(d.getMonth() + (i + 1));
    const exist = sch[i];
    return { n: i + 1, date: exist?.date || d.toISOString().slice(0, 10), amount: 0, manual: respectManual ? exist?.manual : false };
  });

  if (!respectManual) next = next.map(s => ({ ...s, manual: false }));

  const manualSum = next.reduce((acc, slot, i) => acc + (slot.manual ? (sch[i]?.amount || 0) : 0), 0);
  const restante = Math.max(0, total - (down || 0) - manualSum);
  const libres = next.map((s, i) => (s.manual ? -1 : i)).filter(i => i >= 0);

  if (libres.length > 0){
    const baseVal = Math.floor(restante / libres.length);
    let resto = restante - baseVal * libres.length;
    libres.forEach((i, idx) => { next[i].amount = baseVal + (idx < resto ? 1 : 0); });
  }

  next = next.map((s, i) => (s.manual ? { ...s, amount: sch[i]?.amount || 0 } : s));
  setSch(next);
}


  // recalcular plan cuando cambian entradas
  // useEffect(()=>{
  //   if (mode!=='plazo'){ setSch([]); return; }
  //   const rest = Math.max(0, total - (down||0));
  //   const per  = n>0 ? rest/n : 0;
  //   const t = new Date(), arr:Sch[]=[];
  //   for(let i=1;i<=n;i++){
  //     const d = new Date(t);
  //     if(kind==='semanal') d.setDate(d.getDate()+i*7); else d.setMonth(d.getMonth()+i);
  //     arr.push({ n:i, date:d.toISOString().slice(0,10), amount:per });
  //   }
  //   setSch(arr);
  // }, [mode, down, n, kind, total]);

    // triggers de recálculo
  useEffect(()=>{ recalcPlan(true) }, [mode, down, n, kind, total, touch])

    // Editar cuota: bloquea esa cuota y redistribuye el resto
  // function editCuota(i:number, field:'date'|'amount', raw:string){
  //   setSch(prev=>{
  //     const copy = prev.map((x)=> ({...x}));
  //     if (field==='date'){ copy[i].date = raw; return copy; }
  //     const val = parseLocaleNumber(raw,false);
  //     copy[i].amount = val;
  //     copy[i].manual = true;
  //     // redistribuir no-manuales
  //     const manualSum = copy.reduce((acc,x)=> acc + (x.manual? x.amount:0), 0);
  //     const restante = Math.max(0, total - (down||0) - manualSum);
  //     const libresIdx = copy.map((s,ix)=> s.manual? -1 : ix).filter(ix=> ix>=0);
  //     const m = libresIdx.length;
  //     if (m>0){
  //       const baseVal = Math.floor(restante / m);
  //       let resto = restante - baseVal*m;
  //       libresIdx.forEach((ix,idx)=>{ copy[ix].amount = baseVal + (idx < resto ? 1 : 0); });
  //     }
  //     return copy;
  //   });
  // }

//   function editCuota(i:number, field:'date'|'amount', raw:string){
//   setSch(prev => {
//     const copy = prev.map(x => ({ ...x }));
//     if (field === 'date'){ copy[i].date = raw; return copy; }

//     // amount:
//     const val = parseLocaleNumber(raw, false);
//     copy[i].amount = val;
//     copy[i].manual = true;

//     // Repartir restante entre no-manuales
//     const manualSum = copy.reduce((acc, x) => acc + (x.manual ? x.amount : 0), 0);
//     const restante = Math.max(0, total - (down || 0) - manualSum);
//     const libres = copy.map((s, ix) => (s.manual ? -1 : ix)).filter(ix => ix >= 0);
//     if (libres.length > 0){
//       const baseVal = Math.floor(restante / libres.length);
//       let resto = restante - baseVal * libres.length;
//       libres.forEach((ix, idx) => { copy[ix].amount = baseVal + (idx < resto ? 1 : 0); });
//     }
//     return copy;
//   });
// }

function editCuota(i:number, raw:string){
  setSch(prev=>{
    const copy = prev.map(x=> ({...x}));
    const val  = parseLocaleNumber(raw,false);
    if (!copy[i]) copy[i] = { n:i+1, date:new Date().toISOString().slice(0,10), amount:0 };
    copy[i].amount = val;
    copy[i].manual = true;

    const manualSum = copy.reduce((a,x)=> a + (x.manual ? x.amount : 0), 0);
    const restante  = Math.max(0, total - (down||0) - manualSum);
    const libres    = copy.map((s,ix)=> s.manual? -1 : ix).filter(ix=> ix>=0);

    if (libres.length>0){
      const baseVal = Math.floor(restante/libres.length);
      let resto = restante - baseVal*libres.length;
      libres.forEach((ix,idx)=>{ copy[ix].amount = baseVal + (idx<resto ? 1 : 0); });
    }
    return copy;
  });
}


  // Reset manual & recalcular todo
  function resetPlan(){ 
    setSch(prev=> prev.map(s=> ({...s, manual:false}))); 
    recalcPlan(false);
    // setTouch(t=>t+1); 
  }

  // editar c/ fila
  function changeSch(i:number, field:'date'|'amount', v:string){
    setSch(prev => prev.map((s,ix)=> ix===i ? {...s, [field]: field==='amount' ? parseLocaleNumber(v,false) : v } : s));
  }

  // useEffect(()=>{
  //    if(paymentMode==='plazo' && Number(numCuotas ?? "")>0) regenPlan(total, downPayment, creditKind, Number(numCuotas)); 
  // },[paymentMode, creditKind, numCuotas, total, downPayment]);

  async function submit(){
    if (!custName.trim() || !custId.trim()){
      alert('Cliente: nombre e identificador requeridos'); return;
    }
    if (total <= 0){
      alert('El total debe ser mayor a 0');
      return;
    }
    const items = Object.values(cart);
    if (!items.length){ alert('No hay ítems en el ticket'); return; }
    const payload:any = {
      customer: { name: custName.trim(), id: custId.trim() },
      discountTotal: discount||0,
      paymentMode:mode,
      creditKind:kind,
      numCuotas:n,
      downPayment:down,
      items
    }
    if (sch.length>0) payload.installments = sch;
    const res = await repo.submitSale(payload);

    if (res.ok){
      alert(`Venta OK. Ticket ${res.ticketId}. Total ${res.total}`);
      // Reset ticket y refrescar stock desde el backend
      setCart({});
      const r = await repo.listVariants();
      if (r.ok){
        setVariants(r.items);
        const m:Record<string,number> = {};
        r.items.forEach(v=> m[keyOf(v)] = v.stock);
        setStock(m);
      }
    } else {
      alert('Error al registrar la venta');
    }
  }

  // NEW: filter + sort state
const [filterText, setFilterText] = useState('');
const [sortKey, setSortKey] = useState<'code_asc'|'code_desc'|'desc_asc'|'desc_desc'|'stock_asc'|'stock_desc'>('desc_asc');

// Utility: split by spaces and check AND contains over code/name
function matchVariant(v: VariantItem, terms: string[]): boolean {
  const code = (v.code || '').toUpperCase();
  const name = (v.name || '').toUpperCase();
  const size = (v.size || '').toUpperCase();
  const color = (v.color || '').toUpperCase();
  return terms.every(t => code.includes(t) || name.includes(t) || size.includes(t) || color.includes(t));
}

// NEW: build visible list based on filter + sort
const visible = useMemo(()=>{
  const terms = filterText.trim().toUpperCase().split(/\s+/).filter(Boolean);
  let arr = variants.filter(v => {
    if ((stock[keyOf(v)] ?? v.stock) < 0) return false;  // safeguard
    if (!terms.length) return true;
    return matchVariant(v, terms);
  });

  switch (sortKey) {
    case 'code_asc':   arr.sort((a,b)=> String(a.code).localeCompare(String(b.code))); break;
    case 'code_desc':  arr.sort((a,b)=> String(b.code).localeCompare(String(a.code))); break;
    case 'desc_asc':   arr.sort((a,b)=> String(a.name).localeCompare(String(b.name))); break;
    case 'desc_desc':  arr.sort((a,b)=> String(b.name).localeCompare(String(a.name))); break;
    case 'stock_asc':  arr.sort((a,b)=> (stock[keyOf(a)] ?? a.stock) - (stock[keyOf(b)] ?? b.stock)); break;
    case 'stock_desc': arr.sort((a,b)=> (stock[keyOf(b)] ?? b.stock) - (stock[keyOf(a)] ?? a.stock)); break;
  }
  return arr;
}, [variants, stock, filterText, sortKey]);




// Debounced search to backend (?action=clients&q=)
useEffect(()=>{
  const t = setTimeout(async ()=>{
    const q = clientFilter.trim();
    if (!q){ setClientMatches([]); return; }
    try{
      const res = await repo.searchClients(q);
      setClientMatches(res?.items || []);
      // If only one match, auto-fill but keep suggestions visible until user confirms
      if (res?.items?.length === 1){
        setCustName(res.items[0].name);
        setCustId(res.items[0].id);
      }
    }catch(_){ setClientMatches([]); }
  }, 250);
  return ()=> clearTimeout(t);
}, [clientFilter]);


  return (
    
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
      {/* STOCK (izquierda) */}
      <div>
      <h3>Stock</h3>
      <div style={{display:'flex', gap:8, marginBottom:8, alignItems:'center'}}>
        <input
          placeholder="Filtrar por desc. o código (palabras = AND)"
          value={filterText}
          onChange={e=>setFilterText(e.target.value)}
          style={{flex:1}}
        />
        {/* simple select as sort icon substitute */}
        <select value={sortKey} onChange={e=>setSortKey(e.target.value as any)} title="Ordenar">
          <option value="desc_asc">desc. asc</option>
          <option value="desc_desc">desc. desc</option>
          <option value="code_asc">cód. asc</option>
          <option value="code_desc">cód. desc</option>
          <option value="stock_asc">stock asc</option>
          <option value="stock_desc">stock desc</option>
        </select>
      </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(180px,1fr))', gap:8 }}>
          {visible.map(v=>{
            const k = keyOf(v);
            const s = stock[k] ?? v.stock;
            const disabled = s<=0;
            return (
              <button key={k} onClick={()=>!disabled && add(v)}
                style={{ padding:10, border:'1px solid #ccc', borderRadius:8, textAlign:'left',
                         cursor: disabled?'not-allowed':'pointer', opacity: disabled?0.5:1 }}>
                <div style={{ fontWeight:700 }}>{v.code}</div>
                <div style={{ fontSize:12 }}>{v.name}</div>
                <div style={{ fontSize:12 }}>{v.size} - {s} - {v.color}</div>
                <div style={{ fontSize:12, fontWeight:600 }}>Gs {(v.defaultPrice||0).toFixed(0)}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* TICKET (derecha) */}
      <div>
        <h3>Venta</h3>
        {/* Client filter input + suggestions */}
        <div style={{display:'grid', gap:6, marginBottom:6}}>
          <input
            placeholder="Buscar cliente (nombre o ID)"
            value={clientFilter}
            onChange={e=> setClientFilter(e.target.value)}
          />
          {!!clientFilter.trim() && !!clientMatches.length && (
            <div style={{border:'1px solid #ddd', borderRadius:6, padding:6, maxHeight:140, overflow:'auto'}}>
              {clientMatches.map((c,i)=>(
                <div key={i} style={{padding:'4px 6px', cursor:'pointer'}}
                    onClick={()=>{ setCustName(c.name); setCustId(c.id); setClientFilter(''); setClientMatches([]); }}>
                  <b>{c.name}</b> — <span style={{opacity:0.8}}>{c.id}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display:'flex', gap:8, marginBottom:8 }}>
          <input placeholder="Cliente (Nombre)*" value={custName} onChange={e=>setCustName(e.target.value)} />
          <input placeholder="Doc Cliente (ID)*" value={custId} onChange={e=>setCustId(e.target.value)} />
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(180px,1fr))', gap:8, minHeight:120, border:'1px dashed #aaa', borderRadius:8, padding:8 }}>
          {Object.entries(cart).map(([k,it])=>{
            return (
              <button key={k} onClick={()=>remove(k)} style={{ padding:10, border:'1px solid #888', borderRadius:8, textAlign:'left', background:'#fafafa' }}>
                <div style={{ fontWeight:700 }}>{it.code}</div>
                <div style={{ fontSize:12 }}>{it.name}</div>
                <div style={{ fontSize:12 }}>{it.size} - {it.qty} - {it.color}</div>
                <div style={{ fontSize:12, fontWeight:600 }}>Gs {(it.price).toFixed(0)}</div>
              </button>
            );
          })}
        </div>

        <div style={{ marginTop:12, display:'grid', gap:6, maxWidth:360 }}>
          <div>Subtotal: {fmtGs.format(subtotal)} — Total: {fmtGs.format(total)}</div>
          {/* <div>Subtotal: <b>{subtotal.toFixed(0)} Gs</b></div> */}
          <div>Descuento total (valor): <input type="number" value={discount} onChange={e=>setDiscount(Number(e.target.value)||0)} style={{ width:120 }} /></div>
          <div>A pagar: <b>{total.toFixed(0)} Gs</b></div>
          <div style={{display:'flex',gap:8,margin:'8px 0'}}>
            <select value={mode} onChange={e=>setMode(e.target.value as any)}>
              <option value="contado">Contado</option><option value="plazo">A plazo</option>
            </select>
            <button onClick={resetPlan} style={{marginLeft:8}}>Reestablecer</button>
            {mode==='plazo' && (<>
              <span>Entrega (Gs):</span>
              {/* <input 
                type="number"
                type="text" inputMode="numeric"
                value={fmtGs.format(down)} 
                value={down} 
                onFocus={e=> e.currentTarget.value=String(down)}
                onBlur={e=> setDown(parseLocaleNumber(e.currentTarget.value,false))} style={{width:120}}/> */}
                <MoneyInputGs value={down} onChange={setDown} style={{ width: 120 }} />
              <span>Cuotas:</span><input type="number" value={n} onChange={e=>setN(Number(e.target.value)||0)} style={{width:70}}/>
              <select value={kind} onChange={e=>setKind(e.target.value as any)}>
                <option value="mensual">Mensual</option><option value="semanal">Semanal</option>
              </select>
            </>)}
          </div>
          {mode==='plazo' && sch.length>0 && (<div style={{marginTop:8}}>
            <h4>Plan de pagos (editable)</h4>
            <table><thead><tr><th>#</th><th>Fecha</th><th>Monto</th></tr></thead>
              <tbody>{sch.map((s,i)=>(<tr key={i}>
                <td>{s.n}</td>
                <td><input type="date" value={s.date} onChange={e=>changeSch(i,'date',e.target.value)}/></td>
                <td>
                  {/* <input 
                      type="number"
                      type="text" inputMode="numeric" 
                      value={fmtGs.format(s.amount)}
                      value={s.amount}
                      onFocus={e=> e.currentTarget.value=String(s.amount)}
                      onBlur={e=>editCuota(i,'amount', e.currentTarget.value)} style={{width:130}}/> */}
                    {/* <input
                      type="text"
                      inputMode="numeric"
                      value={fmtGs.format(s.amount)}
                      onFocus={(e)=> (e.currentTarget.value = String(s.amount))}
                      onBlur={(e)=> editCuota(i,'amount', e.currentTarget.value)}
                      style={{ width: 130 }}
                    /> */}

                    <MoneyInputGs
                      value={s.amount}
                      onChange={(n)=> editCuota(i, String(n))}
                      style={{width:130}}
                    />
                </td>
                <td style={{textAlign:'center'}}>{s.manual?'✔':''}</td>      
              </tr>))}</tbody>
            </table>
          </div>)}
          <div><button onClick={submit} style={{ padding:'8px 16px', fontWeight:700, borderRadius:8 }}>Registrar venta</button></div>
        </div>
      </div>
    </div>
  );
}
