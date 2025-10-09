export interface IRepository {
  listProducts(): Promise<{ ok:true; items:any[] }>
  getInventory(): Promise<{ ok:true; items:any[] }>
  getDashboard(): Promise<any>
  listPayments(scope?:string): Promise<{ ok:true; items:any[] }>
  listExpenseTypes(): Promise<{ ok:true; items:string[] }>
  addExpense(amount:number, descr:string, note:string): Promise<{ ok:true }>
  uploadPurchasePDF(payload: { b64:string; filename?:string; supplier?:string; preferPrice?: 'AV'|'PZ'; debug?: boolean }): Promise<any>
}
export function baseUrl(){ return String((import.meta as any).env.VITE_API_BASE || '') }
export async function jget(q:string){
  const base = baseUrl(), sep = base.includes('?') ? '&' : '?'
  const key = (import.meta as any).env.VITE_API_KEY || ''
  const url = base + sep + q + (key ? `&key=${encodeURIComponent(key)}` : '')
  const r = await fetch(url); return r.json()
}
export async function jpost(obj:any){
  const url = baseUrl(); const key=(import.meta as any).env.VITE_API_KEY||''
  const body = JSON.stringify({ ...obj, key })
  const r = await fetch(url, { method:'POST', body })
  return r.json()
}
