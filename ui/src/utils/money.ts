// ui/src/utils/money.ts
// Shared money helpers (single source of truth).
// Comments in English per project guidelines.

export const fmtGs  = new Intl.NumberFormat('es-PY', { maximumFractionDigits: 0 });
export const fmtBRL = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Parse locale-looking numeric strings to Number.
 *  - Accepts thousands with dot or comma.
 *  - Decimal separator = last of '.' or ',' when allowDecimals = true.
 *  - For PYG you typically want allowDecimals=false -> rounded integer.
 */
export function parseLocaleNumber(raw: string, allowDecimals: boolean): number {
  if (raw == null) return 0;
  let s = String(raw).trim();
  if (!s) return 0;
  s = s.replace(/[^0-9.,]/g, '');
  const lastDot = s.lastIndexOf('.');
  const lastComma = s.lastIndexOf(',');
  const decimalPos = Math.max(lastDot, lastComma);

  let integer = s, decimal = '';
  if (decimalPos >= 0 && allowDecimals){
    integer = s.slice(0, decimalPos);
    decimal = s.slice(decimalPos + 1);
  }
  // strip thousands
  integer = integer.replace(/[.,]/g, '');
  let out = integer;

  if (allowDecimals && decimal){
    // Keep up to 6 decimals safely, UI formateará a 2 para BRL
    decimal = decimal.replace(/[^0-9]/g, '').slice(0, 6);
    out = integer + '.' + decimal;
  }
  const n = Number(out);
  return allowDecimals ? n : Math.round(n);
}

/** Pretty price for Guaraníes with slight upward bias near 20k and 80k endings. */
export function prettyPriceGs(x: number): number {
  x = Math.max(0, Number(x||0));
  const base = Math.floor(x/100000)*100000;
  const r = x - base;
  const B0_20=10000, B20_30=23000, B30_50=40000, B50_70=60000, B70_80=75000, B80_100=88000;
  let off: number;
  if (r < B0_20) off = 0;
  else if (r < B20_30) off = 20000;
  else if (r < B30_50) off = 30000;
  else if (r < B50_70) off = 50000;
  else if (r < B70_80) off = 70000;
  else if (r < B80_100) off = 80000;
  else off = 100000;
  return off===100000 ? base+100000 : base+off;
}