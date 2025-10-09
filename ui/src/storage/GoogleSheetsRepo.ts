import { IRepository, jget, jpost } from './IRepository'
export class GoogleSheetsRepo implements IRepository {
  async listProducts(){ return jget('action=products') }
  async getInventory(){ return jget('action=inventory') }
  async getDashboard(){ return jget('action=dashboard') }
  async listPayments(scope?:string){ return jget('action=payments' + (scope?`&scope=${encodeURIComponent(scope)}`:'')) }
  async listExpenseTypes(){ return jget('action=expensetypes') }
  async addExpense(amount:number, descr:string, note:string){ return jpost({ action:'expense', amount, descr, note }) }
  async uploadPurchasePDF(payload:any){ return jpost({ action:'uploadpdf', ...payload }) }
}
