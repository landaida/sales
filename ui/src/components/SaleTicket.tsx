// src/components/SaleTicket.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { GoogleSheetsRepo } from '../storage/GoogleSheetsRepo';
import type { VariantItem, SaleItem } from '../storage/IRepository';

const repo = new GoogleSheetsRepo();
const keyOf = (v:{code:string;color:string;size:string}) => `${v.code}|${v.color}|${v.size}`;

export default function SaleTicket(){
  const [variants, setVariants] = useState<VariantItem[]>([]);
  const [stock, setStock] = useState<Record<string, number>>({});
  const [cart, setCart] = useState<Record<string, SaleItem>>({});
  const [custName, setCustName] = useState('');
  const [custId,   setCustId]   = useState('');
  const [discount, setDiscount] = useState<number>(0);

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
    const res = await repo.submitSale({
      customer: { name: custName.trim(), id: custId.trim() },
      discountTotal: discount||0,
      paymentMode,
      creditKind,
      numCuotas: paymentMode==='plazo' ? Number(numCuotas||0) : 0,
      items
    });
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


// Client filter & suggestions
const [clientFilter, setClientFilter] = useState('');
const [clientMatches, setClientMatches] = useState<{name:string;id:string}[]>([]);

// credit controls
const [paymentMode, setPaymentMode] = useState<'contado'|'plazo'>('contado');
const [creditKind, setCreditKind]   = useState<'mensual'|'semanal'>('mensual');
const [numCuotas, setNumCuotas]     = useState<string>('0');


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
          <div>Subtotal: <b>{subtotal.toFixed(0)} Gs</b></div>
          <div>Descuento total (valor): <input type="number" value={discount} onChange={e=>setDiscount(Number(e.target.value)||0)} style={{ width:120 }} /></div>
          <div>A pagar: <b>{total.toFixed(0)} Gs</b></div>
          <div style={{ display:'grid', gap:6, maxWidth:420, marginTop:8 }}>
            <label style={{display:'flex', gap:8, alignItems:'center'}}>
              <span>Pago:</span>
              <select value={paymentMode} onChange={e=>setPaymentMode(e.target.value as any)}>
                <option value="contado">Contado</option>
                <option value="plazo">A plazo</option>
              </select>
            </label>

            {paymentMode==='plazo' && (
              <>
                <label style={{display:'flex', gap:8, alignItems:'center'}}>
                  <span>Tipo crédito:</span>
                  <select value={creditKind} onChange={e=>setCreditKind(e.target.value as any)}>
                    <option value="mensual">Mensual</option>
                    <option value="semanal">Semanal</option>
                  </select>
                </label>
                <label>Cuotas:
                  <input type="number" min={1} value={numCuotas} onChange={e=>setNumCuotas(e.target.value)} style={{ width:100, marginLeft:8 }} />
                </label>

                {/* Preview simple: fechas generadas */}
                <div style={{border:'1px dashed #bbb', padding:8, borderRadius:6}}>
                  <b>Plan propuesto:</b>
                  <ul style={{marginTop:6}}>
                    {Array.from({length: Math.max(0, Number(numCuotas||0))}).map((_,i)=>{
                      const d = new Date();
                      if (creditKind==='semanal') d.setDate(d.getDate()+(i+1)*7);
                      else d.setMonth(d.getMonth()+(i+1));
                      return <li key={i}>Cuota {i+1}: {d.toLocaleDateString()}</li>
                    })}
                  </ul>
                  <small>(El usuario podrá editar estas fechas en la planilla ACobrar)</small>
                </div>
              </>
            )}
          </div>

          <div><button onClick={submit} style={{ padding:'8px 16px', fontWeight:700, borderRadius:8 }}>Registrar venta</button></div>
        </div>
      </div>
    </div>
  );
}
