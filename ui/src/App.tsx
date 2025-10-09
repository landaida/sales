import React from 'react'
import { GoogleSheetsRepo } from './storage/GoogleSheetsRepo'
import SaleTicket from './components/SaleTicket'
import StockView from './components/StockView'
import PaymentsHistory from './components/PaymentsHistory'
import ExpensesView from './components/ExpensesView'
import PurchaseOCRUpload from './components/PurchaseOCRUpload'
import DashboardView from './components/DashboardView'

export default function App(){
  const [route, setRoute] = React.useState<string>(window.location.hash || '#importarpdf')
  React.useEffect(()=>{
    const f=()=> setRoute(window.location.hash || '#importarpdf')
    window.addEventListener('hashchange', f); return ()=> window.removeEventListener('hashchange', f)
  },[])
  const link = (hash:string, label:string)=>(<a href={hash} style={{marginRight:12}}>{label}</a>)
  return (
    <main style={{maxWidth:1000, margin:'0 auto', padding:16}}>
      <h1>Sistema de Ventas Simple</h1>
      <nav style={{marginBottom:12}}>
        {link('#venta','Venta')}{link('#stock','Stock')}{link('#cobros','Cobros')}
        {link('#gastos','Gastos')}{link('#importarpdf','Importar PDF')}{link('#historial','Historial')}{link('#dashboard','Dashboard')}
      </nav>
      {route==='#venta' && <SaleTicket />}
      {route==='#stock' && <StockView />}
      {route==='#cobros' && <PaymentsHistory scope="due" />}
      {route==='#gastos' && <ExpensesView />}
      {route==='#importarpdf' && <PurchaseOCRUpload />}
      {route==='#historial' && <PaymentsHistory />}
      {route==='#dashboard' && <DashboardView />}
    </main>
  )
}
