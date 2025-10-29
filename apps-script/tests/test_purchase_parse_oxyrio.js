// apps-script/tests/test_purchase_parse_oxyrio.js
// Run with: node apps-script/tests/test_purchase_parse_oxyrio.js
const fs = require('fs');
const vm = require('vm');
const path = require('path');

function loadGAS(file){
  const code = fs.readFileSync(file, 'utf8');
  const ctx = {};
  vm.createContext(ctx);
  vm.runInContext(code, ctx);
  return ctx;
}

(function main(){
  const ctx = loadGAS(path.join(__dirname, '..', 'src', 'UploadOCR.gs'));

  // Use the user's OCR sample (trimmed to essential bits for the test). You can replace this with the full text when running locally.
  const ocrText = fs.readFileSync(path.join(__dirname, 'fixtures', 'oxyrio_4119_ocr.txt'), 'utf8');

  const out = ctx.parseOXYRIO_(ocrText, 'PZ');
  // console.log(out)
  // console.log(out.length)
  if (!out || !out.length) {
    console.error('Parser returned empty result');
    process.exit(1);
  }
  const items = out;

  // Basic assertions
  const count = items.length;
  const qtySum = items.reduce((a, it) => a + (Number(it.qty)||0), 0);
  // Sum in cents to avoid floating-point rounding issues
  const totalCents = items.reduce(
    (a, it) => a + Math.round(Number(it.costUnit||0) * 100) * Number(it.qty||0),
    0
  );
  // Helper counters
  const byCode = items.reduce((acc, it) => {
    acc[it.code] = (acc[it.code]||0) + 1;
    return acc;
  }, {});

  // Expectations derived from the PDF:
  // - 44 line items (qty sum 45 because one 30303 has qty 2)
  // - Present codes: 30241 x3, 30306 x2, 30303 x2
  // - No bogus "00078", "00016", "00035" codes
  // - code 30309 present with barcode 9003030900068
  // - code 30114 present x2, byCode compara cuantas veces existe el mismo codigo en todas las lineas de productos extraidos del ocr
  const must = [
    ['==', 'count', count, 44],
    ['==', 'qtySum', qtySum, 45],
    ['==', 'totalCents', totalCents, 458700], // 4.587,00 BRL
    ['==', 'byCode.30241', byCode['30241']||0, 3],
    ['==', 'byCode.30306', byCode['30306']||0, 2],
    ['==', 'byCode.30303', byCode['30303']||0, 2],
    ['==', 'byCode.30114', byCode['30114']||0, 2],
    ['==', 'no.00078', items.some(it => it.code === '00078') ? 1 : 0, 0],
    ['==', 'no.00016', items.some(it => it.code === '00016') ? 1 : 0, 0],
    ['==', 'no.00035', items.some(it => it.code === '00035') ? 1 : 0, 0],
    ['==', 'has.30309.ean', items.some(it => it.code === '30309' && it.barcode === '9003030900068') ? 1 : 0, 1],
  ];

  let ok = true;
  for (const [op, label, got, want] of must) {
    if (op === '==') {
      if (got !== want) {
        ok = false;
        console.error(`FAIL ${label}: got ${got} expected ${want}`);
      }
    }
  }

  // console.log('First 5 items:', items.slice(0,5));
  if (!ok) {
    // console.log('First 5 items:', items.slice(0,5));
    console.log('All items:', JSON.stringify(items));
    process.exit(2);
  }
  console.log('OK - parseOxyrioPriceQuote_ passed basic checks.');
})();
