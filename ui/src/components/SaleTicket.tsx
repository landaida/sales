import React from 'react'
import { GoogleSheetsRepo } from '../storage/GoogleSheetsRepo'

const repo = new GoogleSheetsRepo()

type Variant = { code:string; name:string; color:string; size:string; stock:number; unitPrice:number }
type CartItem = {
  key:string
  code:string
  name:string
  color:string
  size:string
  qty:number
  unitPrice:string
  priceOverride:string
}

const variantKey = (v:{code:string; color:string; size:string})=>`${v.code}|${v.color}|${v.size}`

function parseNumber(value:string|number){
  if (typeof value === 'number') return isNaN(value) ? 0 : value
  const normalized = value.replace(/,/g,'.').replace(/[^0-9.-]/g,'')
  const n = Number(normalized)
  return isNaN(n) ? 0 : n
}

function isAlphaNumeric(text:string){
  if (!text) return true
  return /^[\p{L}\p{N}\s_.-]+$/u.test(text)
}

export default function SaleTicket(){
  const [catalog,setCatalog] = React.useState<Variant[]>([])
  const [filter,setFilter] = React.useState('')
  const [cart,setCart] = React.useState<CartItem[]>([])
  const [customerName,setCustomerName] = React.useState('')
  const [customerId,setCustomerId] = React.useState('')
  const [discountMode,setDiscountMode] = React.useState<'percent'|'value'>('percent')
  const [discountValue,setDiscountValue] = React.useState('0')
  const [credit,setCredit] = React.useState(false)
  const [dueDate,setDueDate] = React.useState('')
  const [loading,setLoading] = React.useState(false)
  const [error,setError] = React.useState('')

  React.useEffect(()=>{ loadCatalog() },[])

  async function loadCatalog(){
    setLoading(true)
    setError('')
    try {
      const res = await repo.searchProducts('')
      if (res?.ok){
        const list:Variant[] = []
        (res.items||[]).forEach((item:any)=>{
          const unit = parseNumber(item.price||0)
          (item.variants||[]).forEach((v:any)=>{
            const stock = Number(v.stock||0)
            if (stock>0){
              list.push({
                code: item.code,
                name: item.name || String(item.code),
                color: v.color || '',
                size: v.size || '',
                stock,
                unitPrice: unit
              })
            }
          })
        })
        list.sort((a,b)=>{
          if (b.stock!==a.stock) return b.stock-a.stock
          return String(a.name).localeCompare(String(b.name))
        })
        setCatalog(list)
      } else {
        setCatalog([])
        setError(res?.error || 'No se pudieron cargar los productos con stock')
      }
    } catch (err){
      setCatalog([])
      setError('No se pudieron cargar los productos con stock')
    } finally {
      setLoading(false)
    }
  }

  function addVariant(v:Variant){
    if ((v.stock||0) <= 0) return
    const key = variantKey(v)
    setCatalog(prev=> prev.map(it=> variantKey(it)===key ? { ...it, stock: Math.max(0, (it.stock||0)-1) } : it))
    setCart(prev=>{
      const idx = prev.findIndex(it=> it.key===key)
      if (idx>=0){
        const clone = [...prev]
        clone[idx] = { ...clone[idx], qty: clone[idx].qty + 1 }
        return clone
      }
      return [...prev, {
        key,
        code: v.code,
        name: v.name,
        color: v.color,
        size: v.size,
        qty: 1,
        unitPrice: String(v.unitPrice ?? ''),
        priceOverride: ''
      }]
    })
  }

  function decrementCart(item:CartItem){
    const key = item.key
    let updated = false
    setCart(prev=>{
      const idx = prev.findIndex(it=> it.key===key)
      if (idx===-1) return prev
      updated = true
      const clone = [...prev]
      const target = clone[idx]
      const nextQty = target.qty - 1
      if (nextQty<=0){
        clone.splice(idx,1)
      } else {
        clone[idx] = { ...target, qty: nextQty }
      }
      return clone
    })
    if (updated){
      setCatalog(prev=> prev.map(it=> variantKey(it)===key ? { ...it, stock: (it.stock||0)+1 } : it))
    }
  }

  function updateCartField(key:string, field:keyof Pick<CartItem,'unitPrice'|'priceOverride'>, value:string){
    setCart(prev=> prev.map(item=> item.key===key ? { ...item, [field]: value } : item))
  }

  const filteredCatalog = React.useMemo(()=>{
    const term = filter.trim().toUpperCase()
    if (!term) return catalog
    return catalog.filter(v=>{
      const haystack = `${v.code} ${v.name} ${v.color} ${v.size}`.toUpperCase()
      return haystack.indexOf(term)>=0
    })
  },[catalog, filter])

  const subtotal = cart.reduce((acc,row)=>{
    const qty = Number(row.qty||0)
    const override = row.priceOverride!=='' ? parseNumber(row.priceOverride) : null
    const unit = override!==null ? override : parseNumber(row.unitPrice)
    return acc + unit * qty
  }, 0)

  const rawDiscount = Math.max(0, parseNumber(discountValue))
  const discountAsValue = discountMode==='value' ? Math.min(subtotal, rawDiscount) : subtotal * (Math.max(0, rawDiscount)/100)
  const discountAsPercent = subtotal ? (discountAsValue / subtotal) * 100 : 0
  const total = Math.max(0, subtotal - discountAsValue)

  async function submit(){
    if (!cart.length) return alert('Agregue productos a la factura')
    const name = customerName.trim()
    const identifier = customerId.trim()
    if (!isAlphaNumeric(name)) return alert('El nombre del cliente debe ser alfanumérico')
    if (!isAlphaNumeric(identifier)) return alert('El identificador del cliente debe ser alfanumérico')
    if (credit){
      if (!name || !identifier) return alert('Para ventas a crédito se requieren nombre e identificador del cliente')
      if (!dueDate) return alert('Seleccione la fecha de vencimiento del crédito')
    }
    const normalizedDiscountValue = discountMode==='value' ? Math.min(subtotal, rawDiscount) : Math.max(0, rawDiscount)
    const payload = {
      customerName: name,
      customerId: identifier,
      discountMode,
      discountValue: normalizedDiscountValue,
      credit,
      dueDate: credit ? dueDate : '',
      items: cart.map(row=>({
        code: row.code,
        name: row.name,
        qty: Number(row.qty||0),
        unitPrice: parseNumber(row.unitPrice),
        discountPct: 0,
        priceOverride: row.priceOverride!=='' ? parseNumber(row.priceOverride) : '',
        color: row.color,
        size: row.size
      }))
    }
    const res = await repo.saleTicket(payload)
    if (res?.ok){
      alert(`Venta registrada. Ticket ${res.ticket}. Total: ${Math.round(res.total)}`)
      setCart([])
      setCustomerName('')
      setCustomerId('')
      setDiscountValue('0')
      setDiscountMode('percent')
      setCredit(false)
      setDueDate('')
      loadCatalog()
    } else {
      alert('Error: '+(res?.error||'unknown'))
    }
  }

  return (
    <section>
      <h2>Registrar venta (ticket)</h2>
      <div style={{display:'flex', gap:12, alignItems:'center', marginBottom:12}}>
        <input value={filter} onChange={e=>setFilter(e.target.value)} placeholder="Buscar por código, nombre, color o talla" />
        <button onClick={loadCatalog} disabled={loading}>{loading?'Actualizando...':'Actualizar stock'}</button>
      </div>
      {error && <div style={{color:'red', marginBottom:8}}>{error}</div>}
      <div style={{display:'flex', gap:24, alignItems:'flex-start'}}>
        <div style={{flex:1}}>
          <h3>Factura</h3>
          {cart.length===0 && <div style={{marginBottom:12}}>Seleccione productos para agregarlos a la factura.</div>}
          <div style={{display:'flex', flexDirection:'column', gap:12}}>
            {cart.map(item=>{
              const override = item.priceOverride!=='' ? parseNumber(item.priceOverride) : null
              const unit = override!==null ? override : parseNumber(item.unitPrice)
              const lineTotal = unit * item.qty
              return (
                <div key={item.key} style={{border:'1px solid #ccc', borderRadius:8, padding:8, background:'#f7f7f7'}}>
                  <button onClick={()=>decrementCart(item)} style={{width:'100%', textAlign:'left', border:'none', background:'transparent', cursor:'pointer'}}>
                    <div style={{fontWeight:'bold'}}>{item.code}</div>
                    <div>{item.name}</div>
                    <div style={{fontSize:12, opacity:0.8}}>Color: {item.color || 'N/A'} · Talla: {item.size || 'N/A'}</div>
                    <div style={{marginTop:4, display:'flex', justifyContent:'space-between'}}>
                      <span>Cantidad: {item.qty}</span>
                      <span>Total línea: {Math.round(lineTotal)}</span>
                    </div>
                    <div style={{fontSize:12, opacity:0.7}}>Click para quitar una unidad</div>
                  </button>
                  <div style={{marginTop:6, display:'flex', gap:8, flexWrap:'wrap'}}>
                    <label style={{display:'flex', flexDirection:'column', fontSize:12}}>
                      Precio unitario
                      <input value={item.unitPrice} onChange={e=>updateCartField(item.key,'unitPrice',e.target.value)} style={{width:110}} />
                    </label>
                    <label style={{display:'flex', flexDirection:'column', fontSize:12}}>
                      Precio override
                      <input value={item.priceOverride} onChange={e=>updateCartField(item.key,'priceOverride',e.target.value)} style={{width:110}} placeholder="Opcional" />
                    </label>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
        <div style={{flex:1}}>
          <h3>Stock disponible</h3>
          <div style={{display:'grid', gap:12, gridTemplateColumns:'repeat(auto-fill, minmax(180px, 1fr))'}}>
            {filteredCatalog.map((variant)=>{
              const key = variantKey(variant)
              const disabled = variant.stock<=0
              return (
                <button key={key} onClick={()=>addVariant(variant)} disabled={disabled} style={{
                  display:'flex', flexDirection:'column', gap:4, padding:12,
                  borderRadius:8, border:'1px solid '+(disabled?'#ddd':'#1976d2'),
                  background: disabled?'#f0f0f0':'#e3f2fd', color:'#111', cursor: disabled?'not-allowed':'pointer'
                }}>
                  <span style={{fontWeight:600}}>{variant.code}</span>
                  <span>{variant.name}</span>
                  <span style={{fontSize:12}}>Color: {variant.color || 'N/A'}</span>
                  <span style={{fontSize:12}}>Talla: {variant.size || 'N/A'}</span>
                  <span style={{fontSize:12, fontWeight:600}}>Stock: {variant.stock}</span>
                </button>
              )
            })}
          </div>
          {!loading && !filteredCatalog.length && <div style={{marginTop:12}}>No hay productos con stock que coincidan con la búsqueda.</div>}
        </div>
      </div>

      <div style={{display:'grid', gap:8, maxWidth:520, marginTop:16}}>
        <label>Nombre del cliente
          <input value={customerName} onChange={e=>setCustomerName(e.target.value)} placeholder="Alfanumérico" />
        </label>
        <label>Identificador del cliente
          <input value={customerId} onChange={e=>setCustomerId(e.target.value)} placeholder="Alfanumérico" />
        </label>
        <div style={{display:'flex', gap:12, alignItems:'center'}}>
          <label><input type="radio" checked={discountMode==='percent'} onChange={()=>setDiscountMode('percent')} /> %</label>
          <label><input type="radio" checked={discountMode==='value'} onChange={()=>setDiscountMode('value')} /> Valor</label>
          <input value={discountValue} onChange={e=>setDiscountValue(e.target.value)} style={{width:120}} />
        </div>
        <label><input type="checkbox" checked={credit} onChange={e=>setCredit(e.target.checked)} /> Venta a crédito</label>
        {credit && <label>Vencimiento <input type="date" value={dueDate} onChange={e=>setDueDate(e.target.value)} /></label>}
        <div>Subtotal: <b>{Math.round(subtotal)}</b></div>
        <div>Descuento aplicado: <b>{Math.round(discountAsValue)} ({discountAsPercent.toFixed(2)}%)</b></div>
        <div>Total: <b>{Math.round(total)}</b></div>
        <div><button onClick={submit} disabled={loading || !cart.length}>Confirmar venta</button></div>
      </div>
    </section>
  )
}
