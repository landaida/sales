import React from 'react'
import { GoogleSheetsRepo } from '../storage/GoogleSheetsRepo'
const repo = new GoogleSheetsRepo()
export default function StockView(){
  const [items,setItems]=React.useState<any[]>([]);
  const [showWithoutStock,setShowWithoutStock]=React.useState(false);
  const [cursor,setCursor]=React.useState<number|null>(0); 
  const [busy,setBusy]=React.useState(false);
  const [filterText, setFilterText] = React.useState('');
  React.useEffect(()=>{ 
    // repo.getInventory().then(r=> setItems(r.items||[])) 
    loadStock(true)
  },[])
  async function loadStock(reset=false) {
    // if(busy||cursor===null) return; 
    if(busy) return; 
    setBusy(true);
    const cur = reset ? 0 : (cursor||0);
    const r = await repo.listStockFast(cur, 10, showWithoutStock, filterText);
    if (reset) setItems(r.items||[]);
    else       setItems(prev=>[...prev, ...(r.items||[])]);
    setCursor(r.next);
    setBusy(false);
  }
  // Cuando cambie el filtro o el flag, reiniciar y cargar desde 0
  // React.useEffect(()=>{ loadStock(true); }, [filterText, showWithoutStock]);

    // Debounce del filtro/flag (200ms) -> siempre usa el valor NUEVO
  React.useEffect(()=>{
    const t = setTimeout(()=> loadStock(true), 300)
    return ()=> clearTimeout(t)
  }, [filterText, showWithoutStock])

  return (
  <section>
    <h2>Stock</h2>
    <div style={{display:'flex', gap:8, marginBottom:8}}>
      <input
        placeholder="Filtrar por desc. o código (palabras = AND)"
        value={filterText}
        onChange={e=> setFilterText(e.target.value)}
        style={{flex:1}}
      />
      <label style={{display:'flex', alignItems:'center', gap:6}}>
        <input type="checkbox"
                checked={showWithoutStock}
                onChange={e=> setShowWithoutStock(e.target.checked)}/>
        Mostrar stock 0
      </label>
    </div>
    <table>
      <thead>
        <tr><th>Código</th><th>Tamaño</th><th>Color</th><th style={{textAlign: 'left' }}>Producto</th><th>Precio (Gs)</th><th>Stock</th></tr>
      </thead>
      <tbody>
        {items.map((r:any,i:number)=>(
          <tr key={i}>
            <td>{r.code}</td>
            <td>{r.size}</td>
            <td>{r.color}</td>
            <td style={{ width:'30ch' }}>{r.name||''}</td>
            <td>{Math.round(r.defaultPrice||0)}</td>
            <td>{r.stock||0}</td>
          </tr>
        ))}
      </tbody>
    </table>
    {cursor!==null && <button onClick={()=>loadStock(false)} disabled={busy} style={{marginTop:8}}>{busy?'Cargando...':'Cargar más'}</button>}
  </section>)
}
