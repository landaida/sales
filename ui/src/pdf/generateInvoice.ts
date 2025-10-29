/* ui/src/pdf/generateInvoice.ts
 * Generates a printable PDF invoice using jsPDF.
 * Comments in English, as requested.
 */
import { jsPDF } from 'jspdf'

type Line = { code:string; name:string; color?:string; size?:string; qty:number; unitGs:number }
type Invoice = {
  ticketId: string
  date: Date | string
  clientName: string
  clientId?: string
  subtotalGs?: number
  descuentoGs?: number
  entregaGs?: number
  aplazoGs?: number
  totalGs: number
  items: Line[]
}

function fmtGs(n:number){ return new Intl.NumberFormat('es-PY').format(Math.round(n||0)) }
function safe(s:any){ return (s??'')+'' }

export async function generateInvoicePdf(inv: Invoice){
  const doc = new jsPDF({ unit:'pt', format:'a4' })
  const margin = 48
  let y = margin

  const lineH = 18
  const pageW = doc.internal.pageSize.getWidth()
  const usableW = pageW - margin*2

  // Header
  doc.setFont('helvetica','bold'); doc.setFontSize(14)
  doc.text('FACTURA', margin, y); y += lineH
  doc.setFont('helvetica','normal'); doc.setFontSize(10)
  doc.text(`N°: ${safe(inv.ticketId)}`, margin, y)
  doc.text(`Fecha: ${new Date(inv.date).toLocaleString()}`, margin+200, y); y += lineH
  doc.text(`Cliente: ${safe(inv.clientName)}`, margin, y); y += lineH
  if(inv.clientId) { doc.text(`Identificador: ${safe(inv.clientId)}`, margin, y); y += lineH }

  y += 6
  // Table header
  doc.setFont('helvetica','bold')
  const headers = ['Código','Producto','Color','Talla','Cant.','Unit (Gs)','Total (Gs)']
  const colW = [70, usableW-70-70-55-55-90-100, 70, 55, 55, 90, 100]
  let x = margin
  headers.forEach((h,i)=>{ doc.text(h, x, y); x += colW[i] })
  y += 8
  doc.setLineWidth(0.5); doc.line(margin, y, pageW-margin, y); y += 12

  doc.setFont('helvetica','normal')
  // Rows
  inv.items.forEach((it)=>{
    const row = [
      safe(it.code),
      safe(it.name),
      safe(it.color||''),
      safe(it.size||''),
      String(it.qty||0),
      fmtGs(it.unitGs||0),
      fmtGs((it.qty||0)*(it.unitGs||0))
    ]
    x = margin
    for(let i=0;i<row.length;i++){
      const cell = row[i]
      const maxWidth = colW[i]-4
      // Simple wrap for the name column
      if(i===1){
        const split = doc.splitTextToSize(cell, maxWidth)
        split.forEach((line,idx)=>{
          doc.text(line, x, y + idx*lineH*0.85)
        })
        // advance y to the last printed line
        const extra = (split.length-1)*lineH*0.85
        // Draw other cells at baseline
        let x2 = margin + colW[0]
        ;[2,3,4,5,6].forEach((j,idx)=>{
          const txt = row[j]
          doc.text(txt, x2, y)
          x2 += colW[j]
        })
        y += Math.max(lineH, extra + lineH)
      }else if(i!==1){
        doc.text(cell, x, y)
      }
      x += colW[i]
    }
    // Page break
    if (y > doc.internal.pageSize.getHeight() - 180){
      doc.addPage(); y = margin
    }
  })

  y += 6; doc.line(margin, y, pageW-margin, y); y += 18

  // Totals
  const rightColX = pageW - margin - 220
  const put = (label:string, value:string | number)=>{
    doc.text(label, rightColX, y)
    doc.text(typeof value==='number'? fmtGs(value): String(value), rightColX+140, y, { align:'right' })
    y += lineH
  }

  put('Subtotal (Gs)', inv.subtotalGs||inv.items.reduce((s,it)=> s+(it.qty||0)*(it.unitGs||0),0))
  put('Descuento (Gs)', inv.descuentoGs||0)
  put('Entrega (Gs)', inv.entregaGs||0)
  put('A plazo (Gs)', inv.aplazoGs||0)
  doc.setFont('helvetica','bold')
  put('TOTAL (Gs)', inv.totalGs||inv.items.reduce((s,it)=> s+(it.qty||0)*(it.unitGs||0),0) - (inv.descuentoGs||0))

  doc.save(`Factura-${inv.ticketId}.pdf`)
}
