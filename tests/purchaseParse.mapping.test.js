// Ensure we accept 'unitCost' OR legacy 'costUnit' => unitCostRS
function map(items){
  return (items||[]).map(it=> ({
    qty: Number(it.qty||1),
    unitCostRS: Number(it.unitCost!=null ? it.unitCost : (it.costUnit!=null ? it.costUnit : 0))
  }));
}
const sample = [
  { qty: 1, unitCost: 17.5 },
  { qty: 2, costUnit: 21.0 },
  { qty: 3 }
];
const out = map(sample);
if (out[0].unitCostRS !== 17.5) throw new Error('unitCost should be used when present');
if (out[1].unitCostRS !== 21.0) throw new Error('fallback to costUnit expected');
if (out[2].unitCostRS !== 0) throw new Error('missing should map to 0');
console.log('OK mapping');
