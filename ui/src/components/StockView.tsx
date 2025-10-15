import React from 'react'
import { GoogleSheetsRepo } from '../storage/GoogleSheetsRepo'
const repo = new GoogleSheetsRepo()
export default function StockView(){
  const [items, setItems] = React.useState<any[]>([])
  React.useEffect(()=>{ 
    // repo.getInventory().then(r=> setItems(r.items||[])) 
    repo.listStockFast().then(r=> setItems(r.items||[]))
  },[])
  return (<section><h2>Stock</h2>
    <table>
  <thead>
    <tr><th>Código</th><th>Producto</th><th>Precio (Gs)</th><th>Stock</th></tr>
  </thead>
  <tbody>
    {items.map((r:any,i:number)=>(
      <tr key={i}>
        <td>{r.code}</td>
        <td>{r.name||''}</td>
        <td>{Math.round(r.defaultPrice||0)}</td>
        <td>{r.stock||0}</td>
      </tr>
    ))}
  </tbody>
</table>
  </section>)
}
