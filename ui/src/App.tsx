import React from 'react'
import SaleTicket from './components/SaleTicket'
import StockView from './components/StockView'
import PaymentsHistory from './components/PaymentsHistory'
import ExpensesView from './components/ExpensesView'
import PurchaseOCRUpload from './components/PurchaseOCRUpload'
// import PurchaseHistory from './components/PurchaseHistory'
// import DashboardView from './components/DashboardView'
import Cashbox from './components/Cashbox'
import CobrosView from './components/CobrosView'
// import SalesHistory from './components/SalesHistory'
import CashIncome from './components/CashIncome'

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
        {link('#caja','Caja')}{link('#importarpdf','Compras')}{link('#venta','Ventas')}{link('#stock','Stock')}{link('#cobros','Cobros')}
        {link('#gastos','Gastos')}{/* {link('#PurchaseHistory','Historial de Compras')} */}{/* {link('#SalesHistory','Historial de Ventas')} */}{/* {link('#dashboard','Dashboard')} */}{link('#ingreso','Ingresos')}
      </nav>
      {route==='#caja' && <Cashbox />}
      {route==='#venta' && <SaleTicket />}
      {route==='#stock' && <StockView />}
      {route==='#cobros' && <CobrosView />}
      {route==='#gastos' && <ExpensesView />}
      {route==='#importarpdf' && <PurchaseOCRUpload />}
      {/* {route==='#PurchaseHistory' && <PurchaseHistory />} */}
      {route==='#PaymentsHistory' && <PaymentsHistory />}
      {/* {route==='#SalesHistory' && <SalesHistory />} */}
      {/* {route==='#dashboard' && <DashboardView />} */}
      {route==='#ingreso' && <CashIncome />}
    </main>
  )
}
