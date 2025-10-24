import React from 'react'
import { GoogleSheetsRepo } from '../storage/GoogleSheetsRepo'
import { useOverlay } from '../overlay/OverlayContext';

const repo = new GoogleSheetsRepo()
export default function DashboardView(){
  const { withOverlay } = useOverlay();
  const [data,setData]=React.useState<any>(null)
  React.useEffect(()=>{ repo.getDashboard().then(setData).catch(()=>setData({ ok:false })) },[])
  if(!data) return <div>Cargando...</div>
  const v=(x:number)=> new Intl.NumberFormat('es-PY',{style:'currency',currency:'PYG',maximumFractionDigits:0}).format(x||0)
  return (<section><h2>Dashboard</h2>
    {'ok'in data && data.ok ? (
      <ul><li>Total cobrado: <b>{v(data.totalPaid)}</b></li>
      <li>Gasto total: <b>{v(data.totalExpenses)}</b></li>
      <li>Caja: <b>{v(data.cashOnHand)}</b></li>
      <li>Gasto del mes: <b>{v(data.expensesMonth)}</b></li></ul>
    ) : <pre>{JSON.stringify(data,null,2)}</pre>}
  </section>)
}
