// export interface IRepository {
//   listProducts(): Promise<{ ok: true; items: any[] }>
//   getInventory(): Promise<{ ok: true; items: any[] }>
//   getDashboard(): Promise<any>
//   listPayments(scope?:string): Promise<{ ok:true; items:any[] }>
//   listExpenseTypes(): Promise<{ ok:true; items:string[] }>
//   addExpense(amount:number, descr:string, note:string): Promise<{ ok:boolean }>
//   uploadPurchasePDF(payload:any): Promise<any>

//   // NEW:
//   searchProducts(q:string): Promise<{ ok:true; items:any[] }>
//   listVariants(code:string): Promise<{ ok:true; code:string; name:string; price:number; variants:any[] }>
//   saleTicket(payload:any): Promise<any>
// }

// const base = import.meta.env.VITE_API_BASE || ''
// const API = (path:string)=> {
//   // allow full URL or relative path
//   const q = path.startsWith('http') ? path : (base + (base.includes('?') ? '&' : (base.endsWith('/exec')?'?':'/exec?')) + path)
//   return q
// }
// export async function jget(qs:string){
//   const url = API(qs + (qs.includes('?')?'':'') + `&key=${encodeURIComponent(import.meta.env.VITE_API_KEY||'dev-key')}`)
//   const r = await fetch(url); return r.json()
// }
// export async function jpost(body:any){
//   const url = API('')
//   const r = await fetch(url,{ method:'POST', body: JSON.stringify({ ...body, key:(import.meta.env.VITE_API_KEY||'dev-key') }) })
//   return r.json()
// }

// export class GoogleSheetsRepo implements IRepository {
//   async listProducts(){ return jget('action=products') }
//   async getInventory(){ return jget('action=inventory') }
//   async getDashboard(){ return jget('action=dashboard') }
//   async listPayments(scope?:string){ return jget('action=payments' + (scope?`&scope=${encodeURIComponent(scope)}`:'')) }
//   async listExpenseTypes(){ return jget('action=expensetypes') }
//   async addExpense(amount:number, descr:string, note:string){ return jpost({ action:'expense', amount, descr, note }) }
//   async uploadPurchasePDF(payload:any){ return jpost({ action:'uploadpdf', ...payload }) }

//   // NEW
//   async searchProducts(q:string){ return jget('action=search&q='+encodeURIComponent(q)) }
//   async listVariants(code:string){ return jget('action=variants&code='+encodeURIComponent(code)) }
//   async saleTicket(payload:any){ return jpost({ action:'sale', ...payload }) }
// }











// src/storage/IRepository.ts
export type VariantItem = {
  code: string; name: string; color: string; size: string;
  stock: number; defaultPrice?: number;
};

export type SaleItem = {
  code: string; name: string; color: string; size: string;
  qty: number; price: number;
};

// export async function jget<T=any>(qs: string): Promise<T> {
//   const base = import.meta.env.VITE_API_BASE || '/gsapi';
//   const key  = import.meta.env.VITE_API_KEY  || '';
//   const sep  = qs.includes('?') ? '&' : '?';
//   const url  = `${base}${qs}${key?`${sep}key=${encodeURIComponent(key)}`:''}`;
//   const res  = await fetch(url);
//   if(!res.ok) throw new Error(`GET ${url} -> ${res.status}`);
//   return res.json();
// }

// export async function jpost<T=any>(body: any): Promise<T> {
//   const base = import.meta.env.VITE_API_BASE || '/gsapi';
//   const key  = import.meta.env.VITE_API_KEY  || '';
//   const res  = await fetch(base, {
//     method:'POST',
//     headers:{ 'Content-Type':'application/json' },
//     body: JSON.stringify({ ...body, key })
//   });
//   if(!res.ok) throw new Error(`POST ${base} -> ${res.status}`);
//   return res.json();
// }
