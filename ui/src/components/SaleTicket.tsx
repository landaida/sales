import React from 'react'
import { GoogleSheetsRepo } from '../storage/GoogleSheetsRepo'
const repo = new GoogleSheetsRepo()
export default function SaleTicket(){
  const [list, setList] = React.useState<any[]>([])
  React.useEffect(()=>{ repo.listProducts().then(r=> setList(r.items||[])) },[])
  return (<section><h2>Registrar venta (ticket)</h2>
    <table><thead><tr><th>Código</th><th>Nombre</th></tr></thead>
      <tbody>{list.map((p:any)=>(<tr key={p.code}><td>{p.code}</td><td>{p.name}</td></tr>))}</tbody>
    </table>
  </section>)
}
