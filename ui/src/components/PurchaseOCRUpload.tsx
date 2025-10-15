import React, { useMemo, useState } from 'react'
import { GoogleSheetsRepo } from '../storage/GoogleSheetsRepo'
const repo = new GoogleSheetsRepo()

// Formatters
const fmtGs  = new Intl.NumberFormat('es-PY', { maximumFractionDigits: 0 });
const fmtBRL = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Parser que acepta "1.180.000", "138,50", "138.75"
function parseLocaleNumber(raw: string, allowDecimals: boolean): number {
  if (raw == null) return 0;
  let s = String(raw).trim();
  if (!s) return 0;
  s = s.replace(/[^0-9.,]/g, '');
  const lastDot = s.lastIndexOf('.');
  const lastComma = s.lastIndexOf(',');
  let decimalPos = Math.max(lastDot, lastComma);
  let integer = s, decimal = '';
  if (decimalPos >= 0 && allowDecimals){
    integer = s.slice(0, decimalPos);
    decimal = s.slice(decimalPos + 1);
  }
  integer = integer.replace(/[.,]/g, '');
  let out = integer;
  if (allowDecimals && decimal){
    decimal = decimal.replace(/[^0-9]/g, '').slice(0, 6);
    out = integer + '.' + decimal;
  }
  const n = Number(out);
  return allowDecimals ? n : Math.round(n);
}

// Pretty price (Gs) — misma lógica del backend
// Pretty-pricing in the UI (same thresholds as backend)
function prettyPriceGs(x:number): number{
  x = Math.max(0, Number(x||0));
  const base = Math.floor(x/100000)*100000;
  const r = x - base;
  const B0_20=10000, B20_30=23000, B30_50=40000, B50_70=60000, B70_80=75000, B80_100=88000;
  let off:number;
  if (r < B0_20) off = 0;
  else if (r < B20_30) off = 20000;
  else if (r < B30_50) off = 30000;
  else if (r < B50_70) off = 50000;
  else if (r < B70_80) off = 70000;
  else if (r < B80_100) off = 80000;
  else off = 100000;
  return off===100000 ? base+100000 : base+off;
}

// MoneyInput: fuera de foco -> string formateado; en foco -> número crudo; onBlur -> parsea y dispara onChange
type MoneyInputProps = { value:number; currency:'PYG'|'BRL'; style?:React.CSSProperties; onChange:(n:number)=>void };
function MoneyInput({ value, currency, style, onChange }: MoneyInputProps){
  const allowDecimals = currency === 'BRL';
  const [editing, setEditing] = React.useState(false);
  const [text, setText] = React.useState('');
  React.useEffect(()=>{
    if (!editing){
      setText(currency==='PYG' ? fmtGs.format(Number(value||0)) : fmtBRL.format(Number(value||0)));
    }
  }, [value, currency, editing]);

  return (
    <input
      type="text"
      inputMode="decimal"
      value={text}
      onFocus={()=>{
        setEditing(true);
        setText(allowDecimals ? String(Number(value||0)).replace(/\\.00$/,'') : String(Math.round(Number(value||0))));
      }}
      onChange={e=> setText(e.target.value)}
      onBlur={()=>{
        const n = parseLocaleNumber(text, allowDecimals);
        onChange(n);
        setEditing(false);
      }}
      style={style}
    />
  );
}


type DraftLine = { code:string; name:string; color:string; size:string; barcode:string; qty:number; unitCostRS:number; salePriceGs?:number }

export default function PurchaseOCRUpload(){
  const [file, setFile] = useState<File|null>(null)
  const [exchangeRate, setExchangeRate] = useState<number>(1340)
  const [lines, setLines] = useState<DraftLine[]>([])
  const [supplier, setSupplier] = useState<string>('')
  const [invoice, setInvoice] = useState<string>('')
  const [fileId, setFileId] = useState<string>(''); const [fileUrl, setFileUrl] = useState<string>('')
  const [busy, setBusy] = useState(false)

  const totalRS = useMemo(()=> lines.reduce((s,l)=> s + (l.unitCostRS*l.qty), 0), [lines])
  const totalGs = useMemo(()=> totalRS * (exchangeRate||0), [totalRS,exchangeRate])

  async function parsePdf(){
    if(!file) return alert('Seleccione PDF')
    setBusy(true)
    try{
      // debugger
      const b64 = await file.arrayBuffer().then(b=> btoa(String.fromCharCode(...new Uint8Array(b))))
      const res = await repo.purchaseParse({ filename:file.name, b64 })
      if(!res?.ok) throw new Error(res?.error||'parse failed')
      // const ln = (res.items||[]).map((it:any)=> ({...it, salePriceGs: Number((it.unitCostRS||0) * (exchangeRate||0)) }));
      // const ln = (res.items||[]).map((it:any)=> ({
      //   ...it,
      //   salePriceGs: Number(2 * (it.unitCostRS||0) * (exchangeRate||0))
      // }));
      const ln = (res.items||[]).map((it:any)=> ({
        ...it,
        salePriceGs: prettyPriceGs( 2*(it.unitCostRS||0)*(exchangeRate||0) )
      }));
      setLines(ln); setSupplier(res.supplier||''); setInvoice(file.name||'')
      setFileId(res.fileId||''); setFileUrl(res.fileUrl||'')
    }catch(e:any){ alert(String(e?.message||e)) } finally{ setBusy(false) }
  }

  function edit(i:number, field:keyof DraftLine, val:any){
    setLines(prev=> prev.map((l,ix)=> ix===i? { ...l, [field]: (field==='qty'||field==='unitCostRS'||field==='salePriceGs')? Number(val||0): val } : l ))
  }
  function remove(i:number){ setLines(prev=> prev.filter((_,ix)=> ix!==i)) }

  async function save(){
    if(!lines.length) return alert('Nada para guardar')
    setBusy(true)
    try{
      const res = await repo.purchaseSave({
        supplier, invoice, fileId, exchangeRate,
        items: lines.map(l=> ({...l, salePriceGs: Number(l.salePriceGs||0) }))
      })
      if(!res?.ok) throw new Error(res?.error||'save failed')
      alert(`Compra guardada (${res.saved} ítems). PDF: ${fileUrl||''}`)
      setLines([]); setFile(null)
    }catch(e:any){ alert(String(e?.message||e)) } finally{ setBusy(false) }
  }

  return (
    <>
      <style>
        {`
          .t { table-layout: fixed; width: 100%; border-collapse: collapse; }
          .num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
        `}
      </style>
        
      <section>
        <h2>Importar Compras (PDF con OCR)</h2>

        <div style={{display:'flex', gap:8, alignItems:'center', marginBottom:8}}>
          <label>PDF <input type="file" accept="application/pdf" onChange={e=> setFile(e.target.files?.[0]||null)} /></label>
          <label>Tasa cambio (BRL→Gs)
            <input type="number" value={exchangeRate} onChange={e=> setExchangeRate(Number(e.target.value||0))} style={{width:110, marginLeft:6}}/>
          </label>
          <button disabled={!file || busy} onClick={parsePdf}>{busy?'Procesando...':'Leer PDF'}</button>
          {fileUrl && <a href={fileUrl} target="_blank" rel="noreferrer">Ver PDF</a>}
        </div>

        {!!lines.length && (
          <div>
            <div style={{display:'flex', gap:8, margin:'8px 0'}}>
              <label>Proveedor <input value={supplier} onChange={e=>setSupplier(e.target.value)} /></label>
              <label>Factura <input value={invoice} onChange={e=>setInvoice(e.target.value)} /></label>
            </div>

            <table style={{width:'100%', borderCollapse:'collapse'}} className="t">
              <colgroup>
                <col />
                <col /* style={{ width: '30ch' }} *//>
                <col /* style={{ width: '10ch' }} *//>
                <col />
                <col />
                <col /* style={{ width: '15ch' }} */ /> {/* Unit (R$) */}
                <col /* style={{ width: '15ch' }} */ /> {/* Precio Venta (Gs) */}
                <col /* style={{ width: '15ch' }} */ /> {/* Unit (Gs) */}
                <col /* style={{ width: '15ch' }} */ /> {/* Total (Gs) */}
                <col /* style={{ width: '6ch' }} *//>
              </colgroup>
              <thead><tr>
                <th>Cod</th>
                <th>Producto</th>
                <th>Color</th>
                <th>Talla</th>
                <th>Qty</th>
                <th className="num">Unit (R$)</th>
                <th className="num">Precio Venta (Gs)</th>
                <th className="num">Unit (Gs)</th>
                <th className="num">Total (Gs)</th>
                <th></th>
              </tr></thead>
              <tbody>
                {lines.map((l,i)=>{
                  const unitGs = l.unitCostRS * (exchangeRate||0)
                  const lineGs = unitGs * l.qty
                  return (
                    <tr key={i}>
                      <td><input value={l.code} onChange={e=>edit(i,'code', e.target.value)} style={{width:90}}/></td>
                      <td><input value={l.name} onChange={e=>edit(i,'name', e.target.value)} style={{width:240}}/></td>
                      <td><input value={l.color} onChange={e=>edit(i,'color', e.target.value)} style={{width:120}}/></td>
                      <td><input value={l.size}  onChange={e=>edit(i,'size',  e.target.value)} style={{width:80}}/></td>
                      <td><input type="number" value={l.qty} onChange={e=>edit(i,'qty', e.target.value)} style={{width:80}}/></td>
                      <td className="num">
                        {/* <input type="number" value={fmtBRL.format(l.unitCostRS)} onChange={e=>edit(i,'unitCostRS', e.target.value)} style={{width:110}}/> */}
                        <MoneyInput value={Number(l.unitCostRS||0)} currency="BRL" onChange={(n)=>{ edit(i,'unitCostRS', n); /* si querés: recalc pretty sugerido */ }}
                          style={{width:120}}/>
                        </td>
                      <td className="num">
                        {/* <input type="number" value={fmtGs.format(l.salePriceGs||0)} onChange={e=>edit(i,'salePriceGs', e.target.value)} style={{width:110}}/> */}
                        <MoneyInput value={Number(l.salePriceGs||0)} currency="PYG" onChange={(n)=>edit(i,'salePriceGs', n)} style={{width:130}}/>
                        </td>
                      <td style={{textAlign:'right'}} className="num">{fmtGs.format(unitGs)}</td>
                      <td style={{textAlign:'right'}} className="num">{fmtGs.format(lineGs)}</td>
                      <td><button onClick={()=>remove(i)}>Quitar</button></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            <div style={{display:'flex', gap:16, marginTop:10}}>
              {/* <div><b>Total R$:</b> {totalRS.toFixed(2)}</div>
              <div><b>Total Gs:</b> {Math.round(totalGs)}</div> */}
              <div><b>Total R$:</b> {fmtBRL.format(totalRS)}</div>
              <div><b>Total Gs:</b> {fmtGs.format(totalGs)}</div>
            </div>

            <div style={{marginTop:10}}>
              <button onClick={save} disabled={busy}>Guardar compra</button>
            </div>
          </div>
        )}
      </section>
    </>
  )
}
