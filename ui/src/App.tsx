import React from 'react'
import SaleTicket from './components/SaleTicket'
import StockView from './components/StockView'
import PaymentsHistory from './components/PaymentsHistory'
import ExpensesView from './components/ExpensesView'
import PurchaseOCRUpload from './components/PurchaseOCRUpload'
import Cashbox from './components/Cashbox'
import CobrosView from './components/CobrosView'
import CashIncome from './components/CashIncome'
import AdjustmentsView from './components/AdjustmentsView'
import { OverlayProvider, GlobalOverlay } from './overlay/OverlayContext';
import PagosView from './components/PagosView'

type TabKey = '#caja'|'#importarpdf'|'#venta'|'#stock'|'#cobros'|'#pagos'|'#gastos'|'#ingreso'|'#ajustes'
const TABS: { key:TabKey; label:string }[] = [
  { key:'#caja',        label:'Caja' },
  { key:'#importarpdf', label:'Compras' },
  { key:'#venta',       label:'Ventas' },
  { key:'#stock',       label:'Stock' },
  { key:'#cobros',      label:'Cobros' },
  { key:'#pagos',       label:'Pagos'  },
  { key:'#gastos',      label:'Gastos' },
  { key:'#ingreso',     label:'Ingresos/Prestamo' },
  { key:'#ajustes',     label:'Ajustes' },
]

export default function App(){
  const [route, setRoute] = React.useState<TabKey>((window.location.hash as TabKey) || '#importarpdf')
  React.useEffect(()=>{
    const onHash = ()=> setRoute((window.location.hash as TabKey) || '#importarpdf')
    window.addEventListener('hashchange', onHash)
    return ()=> window.removeEventListener('hashchange', onHash)
  },[])

  // Estilos mínimos, mobile-friendly (sticky y scroll horizontal si desborda)
  const tabbarStyle: React.CSSProperties = {
    position:'sticky', top:0, zIndex:10, background:'#fff',
    padding:'8px 0', marginBottom:12, borderBottom:'1px solid #e5e5e5',
    display:'flex', gap:8, overflowX:'auto', WebkitOverflowScrolling:'touch'
  }
  const tabStyle = (active:boolean): React.CSSProperties => ({
    flex:'0 0 auto',
    padding:'8px 12px',
    borderRadius:999,
    border:'1px solid ' + (active? '#6366F1' : '#ddd'),
    background: active? '#EEF2FF' : '#fff',
    color: active? '#3730A3' : '#111',
    fontWeight: active? 700 : 500,
    outline:'none'
  })

  return (
    <OverlayProvider>
      {/* tu layout / rutas / tabs */}
      <main style={{maxWidth:1000, margin:'0 auto', padding:16}}>
        <h1 style={{marginBottom:8}}>Sistema de Ventas Simple</h1>

        {/* Tabs accesibles */}
        <div role="tablist" aria-label="Secciones" style={tabbarStyle}>
          {TABS.map(t=>{
            const active = route===t.key
            return (
              <a
                key={t.key}
                href={t.key}
                role="tab"
                aria-selected={active}
                tabIndex={active? 0 : -1}
                style={tabStyle(active)}
                onKeyDown={e=>{
                  // Navegación con flechas en desktop
                  if(e.key==='ArrowRight' || e.key==='ArrowLeft'){
                    e.preventDefault()
                    const idx = TABS.findIndex(x=>x.key===route)
                    const next = e.key==='ArrowRight'
                      ? TABS[(idx+1)%TABS.length]
                      : TABS[(idx-1+TABS.length)%TABS.length]
                    window.location.hash = next.key
                  }
                }}
              >
                {t.label}
              </a>
            )
          })}
        </div>

        {/* Panels */}
        {route==='#caja'        && <Cashbox />}
        {route==='#venta'       && <SaleTicket />}
        {route==='#stock'       && <StockView />}
        {route==='#cobros'      && <CobrosView />}
        {route==='#pagos'      && <PagosView />}
        {route==='#gastos'      && <ExpensesView />}
        {route==='#importarpdf' && <PurchaseOCRUpload />}
        {route==='#ingreso'     && <CashIncome />}
        {route==='#ajustes'     && <AdjustmentsView />}
      </main>
      {/* Overlay global renderizado UNA sola vez aquí */}
      <GlobalOverlay />
    </OverlayProvider>
  )
}
