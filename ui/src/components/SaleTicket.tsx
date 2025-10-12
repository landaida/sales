import React from 'react'
import { GoogleSheetsRepo } from '../storage/GoogleSheetsRepo'

const repo = new GoogleSheetsRepo()

type Variant = { code:string; name:string; color:string; size:string; stock:number; unitPrice:number }

export default function SaleTicket(){
  const [query,setQuery]=React.useState('')
  const [variants,setVariants]=React.useState<Variant[]>([])
  const [cart,setCart]=React.useState<any[]>([])
  const [customer,setCustomer]=React.useState('')
  const [discountTotalPct,setDiscountTotalPct]=React.useState('0')
  const [credit,setCredit]=React.useState(false)
  const [dueDate,setDueDate]=React.useState<string>('')

  async function fetchVariants(){
    if (!query.trim()) return
    // if a numeric code is provided, fetch variants directly
    const code = query.trim()
    const res = await repo.listVariants(code)
    if (res?.ok){
      setVariants(res.variants||[])
    } else {
      setVariants([])
    }
  }
  async function search(){
    const res = await repo.searchProducts(query)
    if (res?.ok && res.items?.length){
      // take first item and fetch its variants
      const code = res.items[0].code
      const vr = await repo.listVariants(code)
      setVariants(vr?.variants||[])
    } else {
      setVariants([])
    }
  }
  function addToCart(v:Variant){
    setCart(c=>[...c, { ...v, qty:1, discountPct:0, priceOverride:'' }])
  }
  function removeAt(i:number){ setCart(c=> c.filter((_,k)=>k!==i)) }
  function upd(i:number, field:string, val:any){
    setCart(c=> c.map((row,k)=> k===i? { ...row, [field]: val } : row ))
  }

  const subtotal = cart.reduce((acc,row)=>{
    const qty = Number(row.qty||0)
    const unit = Number(row.unitPrice||0)
    const disc = Number(row.discountPct||0)
    const override = row.priceOverride!=='' ? Number(row.priceOverride) : null
    const finalUnit = override!==null ? override : (unit * (1 - disc/100))
    return acc + finalUnit * qty
  }, 0)
  const total = subtotal * (1 - Number(discountTotalPct||0)/100)

  async function submit(){
    if (!cart.length) return alert('Agregue ítems al ticket')
    const payload = {
      customer, discountTotalPct: Number(discountTotalPct||0),
      credit, dueDate: dueDate||null,
      items: cart.map(r=>({
        code:r.code, name:r.name, qty:Number(r.qty||0),
        unitPrice:Number(r.unitPrice||0),
        discountPct:Number(r.discountPct||0),
        priceOverride: (r.priceOverride!==''? Number(r.priceOverride): ''),
        color:r.color, size:r.size
      }))
    }
    const res = await repo.saleTicket(payload)
    if (res?.ok){
      alert(`Venta registrada. Ticket ${res.ticket}. Total: ${Math.round(res.total)}`)
      setCart([]); setCustomer(''); setDiscountTotalPct('0'); setCredit(false); setDueDate('')
    } else {
      alert('Error: '+(res?.error||'unknown'))
    }
  }

  return (<section>
    <h2>Registrar venta (ticket)</h2>
    <div style={{display:'flex', gap:8, alignItems:'center', marginBottom:8}}>
      <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Código o buscar por texto" />
      <button onClick={fetchVariants}>Por código</button>
      <button onClick={search}>Buscar</button>
    </div>

    {!!variants.length && (<div>
      <h3>Variantes con stock</h3>
      <table><thead><tr><th>Cod</th><th>Producto</th><th>Color</th><th>Talla</th><th>Stock</th><th></th></tr></thead>
        <tbody>{variants.map((v,i)=>(<tr key={i}>
          <td>{v.code}</td><td>{v.name}</td><td>{v.color}</td><td>{v.size}</td><td>{v.stock}</td>
          <td><button onClick={()=>addToCart(v)}>Agregar</button></td>
        </tr>))}</tbody>
      </table>
    </div>)}

    <h3>Ticket</h3>
    <table><thead><tr>
      <th>Cod</th><th>Producto</th><th>Color</th><th>Talla</th>
      <th>Cant</th><th>Precio</th><th>Desc %</th><th>Override</th><th>Total línea</th><th></th>
    </tr></thead>
      <tbody>{cart.map((r,i)=>{
        const qty = Number(r.qty||0)
        const unit = Number(r.unitPrice||0)
        const disc = Number(r.discountPct||0)
        const override = r.priceOverride!=='' ? Number(r.priceOverride) : null
        const finalUnit = override!==null ? override : (unit * (1 - disc/100))
        const lineTotal = Math.round(finalUnit*qty)
        return (<tr key={i}>
          <td>{r.code}</td><td>{r.name}</td><td>{r.color}</td><td>{r.size}</td>
          <td><input style={{width:60}} value={r.qty} onChange={e=>upd(i,'qty',e.target.value)} /></td>
          <td><input style={{width:80}} value={r.unitPrice} onChange={e=>upd(i,'unitPrice',e.target.value)} /></td>
          <td><input style={{width:70}} value={r.discountPct} onChange={e=>upd(i,'discountPct',e.target.value)} /></td>
          <td><input style={{width:80}} value={r.priceOverride} onChange={e=>upd(i,'priceOverride',e.target.value)} /></td>
          <td style={{textAlign:'right'}}>{lineTotal}</td>
          <td><button onClick={()=>removeAt(i)}>Quitar</button></td>
        </tr>)
      })}</tbody>
    </table>

    <div style={{display:'grid', gap:6, maxWidth:520, marginTop:8}}>
      <label>Cliente <input value={customer} onChange={e=>setCustomer(e.target.value)} placeholder="Opcional" /></label>
      <label>Descuento total (%) <input value={discountTotalPct} onChange={e=>setDiscountTotalPct(e.target.value)} /></label>
      <label><input type="checkbox" checked={credit} onChange={e=>setCredit(e.target.checked)} /> Venta a crédito</label>
      {credit && <label>Vencimiento <input type="date" value={dueDate} onChange={e=>setDueDate(e.target.value)} /></label>}
      <div>Subtotal: <b>{Math.round(subtotal)}</b></div>
      <div>Total: <b>{Math.round(total)}</b></div>
      <div><button onClick={submit}>Confirmar venta</button></div>
    </div>
  </section>)
}
