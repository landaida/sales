import { VariantItem, SaleItem } from './IRepository';
export interface IRepository {
  listProducts(): Promise<{ ok: true; items: any[] }>
  getInventory(): Promise<{ ok: true; items: any[] }>
  getDashboard(): Promise<any>
  listPayments(scope?:string): Promise<{ ok:true; items:any[] }>
  listExpenseTypes(): Promise<{ ok:true; items:string[] }>
  addExpense(amount:number, descr:string, note:string): Promise<{ ok:boolean }>
  uploadPurchasePDF(payload:any): Promise<any>

  // NEW:
  searchProducts(q:string): Promise<{ ok:true; items:any[] }>
  // listVariants(code:string): Promise<{ ok:true; code:string; name:string; price:number; variants:any[] }>
  saleTicket(payload:any): Promise<any>
}

// const base = import.meta.env.VITE_API_BASE || ''
const base = (import.meta as any).env.VITE_API_BASE || '/gsapi';
const API = (path:string)=> {
  // allow full URL or relative path
  const q = path.startsWith('http') ? path : (base + (base.includes('?') ? '&' : (base.endsWith('/exec')?'?':'/exec?')) + path)
  return q
}

export async function jget(qs:string){
  const url = API(qs + (qs.includes('?')?'':'') + `&key=${encodeURIComponent(import.meta.env.VITE_API_KEY||'dev-key')}`)
  const r = await fetch(url); return r.json()
}
export async function jpost(body:any){
  const url = API('')
  const r = await fetch(url,{ method:'POST', body: JSON.stringify({ ...body, key:(import.meta.env.VITE_API_KEY||'dev-key') }) })
  return r.json()
}

export class GoogleSheetsRepo implements IRepository {
  async listProducts(){ return jget('action=products') }
  async getInventory(){ return jget('action=inventory') }
  async getDashboard(){ return jget('action=dashboard') }
  async listPayments(scope?:string){ return jget('action=payments' + (scope?`&scope=${encodeURIComponent(scope)}`:'')) }
  async listExpenseTypes(){ return jget('action=expensetypes') }
  async addExpense(amount:number, descr:string, note:string){ return jpost({ action:'expense', amount, descr, note }) }
  async uploadPurchasePDF(payload:any){ return jpost({ action:'uploadpdf', ...payload }) }

  // NEW
  async searchProducts(q:string){ return jget('action=search&q='+encodeURIComponent(q)) }
  // async listVariants(code:string){ return jget('action=variants&code='+encodeURIComponent(code)) }
  async saleTicket(payload:any){ return jpost({ action:'sale', ...payload }) }

  async listVariants(): Promise<{ ok: boolean; items: VariantItem[] }> {
    return jget(`action=variants`);
  }
  async searchClients(q:string): Promise<{ ok:boolean; items:{name:string;id:string}[] }>{ return jget('action=clients&q='+encodeURIComponent(q)); }
  // async submitSale(payload: {
  //   customer: { name: string; id: string };
  //   discountTotal?: number;
  //   dueDate?: string;
  //   items: SaleItem[];
  // }): Promise<{ ok: boolean; ticketId: string; total: number }> {
  //   return jpost({ action:'sale', ...payload });
  // }
  async listStockFast(): Promise<{ ok:boolean; items: any[] }>{
    return jget('action=stockfast');
  }
  // Purchase review
  async purchaseParse(payload:{ filename:string; b64:string; supplier?:string }){
    return jpost({ action:'purchase_parse', ...payload });
  }
  // async purchaseSave(payload:any){
  //   return jpost({ action:'purchase_save', ...payload });
  // }
  async purchaseHistory(cursor=0, limit=5){
    return jget(`action=purchase_history&cursor=${cursor}&limit=${limit}`);
  }
  async purchaseDetails(factura:string){
    return jget(`action=purchase_details&factura=${encodeURIComponent(factura)}`);
  }

  base = (import.meta as any).env.VITE_API_BASE || '/gsapi';
  API = (p:string)=> p.startsWith('http') ? p : (this.base+(this.base.endsWith('/exec')?'?':'/exec?')+p);
  jget = async (q:string)=> (await fetch(this.API(q))).json();
  jpost= async (b:any)=> (await fetch(this.API(''),{method:'POST',body:JSON.stringify(b)})).json();

  cashbox(){ return this.jget('action=cashbox'); }
  cashboxMoves(cursor=0,limit=10){ return this.jget(`action=cashbox_moves&cursor=${cursor}&limit=${limit}`); }
  arByClient(){ return this.jget('action=ar_by_client'); }
  arDetails(client:string){ return this.jget(`action=ar_details&client=${encodeURIComponent(client)}`); }

  submitSale(payload:any){ return this.jpost({ action:'sale', ...payload }); }
  purchaseSave(payload:any){ return this.jpost({ action:'purchase_save', ...payload }); }

  listExpenses(cursor=0, limit=5){ return this.jget(`action=expenses_list&cursor=${cursor}&limit=${limit}`); }
  receivablesPending(cursor=0, limit=5){ return this.jget(`action=receivables_pending&cursor=${cursor}&limit=${limit}`); }
  receivablePay(ticketId:string, cuotaN:number, amount:number, note?:string){ return this.jpost({ action:'receivable_pay', ticketId, cuotaN, amount, note }); }
  receiptsHistory(cursor=0, limit=5){ return this.jget(`action=receipts_history&cursor=${cursor}&limit=${limit}`); }
}
