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

export class GoogleSheetsRepo implements IRepository {
  

  base = (import.meta as any).env.VITE_API_BASE || '/gsapi';
  API = (p:string)=> p.startsWith('http') ? p : (this.base+(this.base.endsWith('/exec')?'?':'/exec?')+p);
  jget = async (q:string)=> {
    const data = await fetch(this.API(q))
    return data.json()
  };
  jpost= async (b:any)=> {
    const data = await fetch(this.API(''),{method:'POST',body:JSON.stringify(b)})
    return data.json()
  };

  async listProducts(){ return this.jget('action=products') }
  async getInventory(){ return this.jget('action=inventory') }
  async getDashboard(){ return this.jget('action=dashboard') }
  async listPayments(scope?:string){ return this.jget('action=payments' + (scope?`&scope=${encodeURIComponent(scope)}`:'')) }
  async listExpenseTypes(){ return this.jget('action=expensetypes') }
  async addExpense(amount:number, descr:string, note:string){ return this.jpost({ action:'expense', amount, descr, note }) }
  async uploadPurchasePDF(payload:any){ return this.jpost({ action:'uploadpdf', ...payload }) }

  // NEW
  async searchProducts(q:string){ return this.jget('action=search&q='+encodeURIComponent(q)) }
  // async listVariants(code:string){ return this.jget('action=variants&code='+encodeURIComponent(code)) }
  async saleTicket(payload:any){ return this.jpost({ action:'sale', ...payload }) }

  async listVariants(): Promise<{ ok: boolean; items: VariantItem[] }> {
    return this.jget(`action=variants`);
  }
  async searchClients(q:string): Promise<{ ok:boolean; items:{name:string;id:string}[] }>{ return this.jget('action=clients&q='+encodeURIComponent(q)); }
  // async submitSale(payload: {
  //   customer: { name: string; id: string };
  //   discountTotal?: number;
  //   dueDate?: string;
  //   items: SaleItem[];
  // }): Promise<{ ok: boolean; ticketId: string; total: number }> {
  //   return this.jpost({ action:'sale', ...payload });
  // }
  async listStockFast(cursor=0, limit=5, showWithoutStock=false, filterText='') {
    return this.jget(`action=stockfast&cursor=${cursor}&limit=${limit}&showWithoutStock=${showWithoutStock}&filterText=${filterText}`);
  }
  // Purchase review
  async purchaseParse(payload:{ filename:string; b64:string; supplier?:string }){
    return this.jpost({ action:'purchase_parse', ...payload });
  }
  // async purchaseSave(payload:any){
  //   return this.jpost({ action:'purchase_save', ...payload });
  // }
  async purchaseHistory(cursor=0, limit=5){
    return this.jget(`action=purchase_history&cursor=${cursor}&limit=${limit}`);
  }
  async purchaseDetails(factura:string){
    return this.jget(`action=purchase_details&factura=${encodeURIComponent(factura)}`);
  }


  cashbox(){ return this.jget('action=cashbox'); }
  cashboxMoves(cursor=0,limit=10){ return this.jget(`action=cashbox_moves&cursor=${cursor}&limit=${limit}`); }
  arByClient(cursor=0, limit=5){ return this.jget(`action=ar_by_client&cursor=${cursor}&limit=${limit}`); }
  arDetails(client:string){ return this.jget(`action=ar_details&client=${encodeURIComponent(client)}`); }

  submitSale(payload:any){ return this.jpost({ action:'sale', ...payload }); }
  purchaseSave(payload:any){ return this.jpost({ action:'purchase_save', ...payload }); }

  listExpenses(cursor=0, limit=5){ return this.jget(`action=expenses_list&cursor=${cursor}&limit=${limit}`); }
  receivablesPending(cursor=0, limit=5){ return this.jget(`action=receivables_pending&cursor=${cursor}&limit=${limit}`); }
  receivablePay(ticketId:string, cuotaN:number, amount:number, note?:string){ return this.jpost({ action:'receivable_pay', ticketId, cuotaN, amount, note }); }
  receiptsHistory(cursor=0, limit=5){ return this.jget(`action=receipts_history&cursor=${cursor}&limit=${limit}`); }
  
  adjustList(cursor=0, limit=10){ return this.jget(`action=adjust_list&cursor=${cursor}&limit=${limit}`); }
  adjustApply(moveId=0){ return this.jpost({ action:'adjust_apply', moveId }); }

  // NEW — Payables (APagar)
  payablesPending(cursor=0, limit=5){ return this.jget(`action=payables_pending&cursor=${cursor}&limit=${limit}`); }
  paymentsHistory(cursor=0, limit=5){ return this.jget(`action=payments_history&cursor=${cursor}&limit=${limit}`); }
  payablePay(refId:string, cuotaN:number, amount:number, note?:string){ return this.jpost({ action:'payable_pay', refId, cuotaN, amount, note }); }
  
  cashIncomeHistory(cursor=0, limit=5){ return this.jget(`action=cash_income_history&cursor=${cursor}&limit=${limit}`); }
  
  cashIncomeSubmit(person:string, personId:string, descr:string, amount:number, numCuotas:number, kind:string){ return this.jpost({ action:'cash_income', person, personId, descr, amount, numCuotas, kind }); }

  salesHistory(cursor=0, limit=5){ return this.jget(`action=sales_history&cursor=${cursor}&limit=${limit}`); }
  salesHistoryDetails(ticket=''){ return this.jget(`action=sale_details&ticket=${encodeURIComponent(ticket)}`); }
}
