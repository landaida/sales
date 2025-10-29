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
  /*
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
    // for(let i=0;i<row.length;i++){
    //   const cell = row[i]
    //   const maxWidth = colW[i]-4
    //   // Simple wrap for the name column
    //   if(i===1){
    //     const split = doc.splitTextToSize(cell, maxWidth)
    //     split.forEach((line,idx)=>{
    //       doc.text(line, x, y + idx*lineH*0.85)
    //     })
    //     // advance y to the last printed line
    //     const extra = (split.length-1)*lineH*0.85
    //     // Draw other cells at baseline
    //     let x2 = margin + colW[0]
    //     ;[2,3,4,5,6].forEach((j,idx)=>{
    //       const txt = row[j]
    //       doc.text(txt, x2, y)
    //       x2 += colW[j]
    //     })
    //     y += Math.max(lineH, extra + lineH)
    //   }else if(i!==1){
    //     doc.text(cell, x, y)
    //   }
    //   x += colW[i]
    // }


    // code
    let xi = margin;
    doc.text(String(row[0] ?? ''), xi, y); xi += colW[0];

    // name con wrap
    const lines = doc.splitTextToSize(String(row[1] ?? ''), colW[1]-4);
    lines.forEach((ln, k)=> doc.text(String(ln||''), xi, y + k*lineH*0.85));
    const rowH = Math.max(lineH, lines.length*lineH*0.85);
    xi += colW[1];

    // demás columnas a la línea base
    let x2 = xi;
    [2,3,4,5,6].forEach(j => { doc.text(String(row[j] ?? ''), x2, y); x2 += colW[j]; });

    // avanza Y
    y += rowH;



    // Page break
    if (y > doc.internal.pageSize.getHeight() - 180){
      doc.addPage(); y = margin
    }
  })
  */
 // ---- Rows ----
inv.items.forEach((it)=>{
  const row = [
    safe(it.code),
    safe(it.name),
    safe(it.color||''),
    safe(it.size||''),
    String(it.qty||0),
    fmtGs(it.unitGs||0),
    fmtGs((it.qty||0)*(it.unitGs||0))
  ];

  // x de inicio de cada columna (acumulado)
  const colX = [margin];
  for (let i = 1; i < colW.length; i++) colX[i] = colX[i-1] + colW[i-1];

  // Wrap en columnas de texto largas
  const nameLines  = doc.splitTextToSize(String(row[1]||''), Math.max(10, colW[1]-4));
  const colorLines = doc.splitTextToSize(String(row[2]||''), Math.max(10, colW[2]-4));

  // Altura de la fila = max(líneas envueltas) con el mismo factor usado
  const linesCount = Math.max(nameLines.length, colorLines.length, 1);
  const rowH = Math.max(lineH, linesCount * lineH * 0.85);

  // Código (una línea)
  doc.text(String(row[0]||''), colX[0], y);

  // Producto (envuelto)
  nameLines.forEach((ln, k) => {
    doc.text(String(ln||''), colX[1], y + k*lineH*0.85);
  });

  // Color (envuelto)
  colorLines.forEach((ln, k) => {
    doc.text(String(ln||''), colX[2], y + k*lineH*0.85);
  });

  // Talla, Cant. (una línea, arriba)
  doc.text(String(row[3]||''), colX[3], y);
  doc.text(String(row[4]||''), colX[4], y);

  // Unit y Total alineados a la derecha dentro de su columna
  doc.text(String(row[5]||''), colX[5] + colW[5] - 4, y, { align: 'right' });
  doc.text(String(row[6]||''), colX[6] + colW[6] - 4, y, { align: 'right' });

  // avanzar y según la altura real de la fila
  y += rowH;

  // salto de página
  if (y > doc.internal.pageSize.getHeight() - 180){
    doc.addPage(); y = margin;
  }
});


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
