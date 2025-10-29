// usar https://tableconvert.com/excel-to-json
// 2d array - minify output

// --- Datos de prueba (ARRAYS de ARRAYS) ---
const ventasRows = [["27/10/2025","Ariel Landaida","10-PRETO M 62046300 29929 MACAQUINHO TRUST","1","650000","650000","","","contado","","","","T-20251027154605-153","650000","","","15000","venta","35","NUDE/BRANCO","G","","","","",""],["27/10/2025","Ariel Landaida","MACAQUINHO TRUST","1","650000","650000","","","contado","","","","T-20251027154605-153","650000","","","15000","venta","29929","BLUE SKY/BRANCO","M","","","","",""]]

const cajaRows = [["27/10/2025 3:31:43","ingreso","IN-20251027073141","Ingreso","Mariano Correa","","400000","0","400000","0","400000","0","400000","M-20251027073143-293867","","","","","","","","","","","","","","","","",""],["27/10/2025 11:44:28","compra","dey3.pdf","Compra dey3.pdf","","OXYRIO CONFECCOES LTDA","0","10529720","0","0","0","0","-10129720","M-20251027154427-545518","activo","0","0","","","","","","","","","","","","","",""],["27/10/2025 11:46:08","venta","T-20251027154605-153","Entrega inicial","Ariel Landaida","","70000","0","1300000","30000","70000","1200000","-10059720","M-20251027154608-979706","activo","1200000","0","","","","","","","","","","","","","",""],["27/10/2025 11:47:37","cobro","T-20251027154605-153","Cobro cuota 1","Ariel Landaida","","300000","0","0","0","0","0","-9759720","M-20251027154736-320878","activo","600000","0","","","","","","","","","","","","","",""],["27/10/2025 11:48:41","ingreso","IN-20251027154836","Ingreso","Nancy Lopez","","1000000","0","1000000","0","1000000","0","-8759720","M-20251027154841-108839","activo","600000","1000000","","","","","","","","","","","","","",""]]

function sheetWithData(rows){
  return {
    _rows: rows,
    getLastRow(){ return this._rows.length + 1; }, // +1 por header
    getLastColumn(){ return (this._rows[0]||[]).length; },
    getRange(startRow, _startCol, numRows, numCols){
      const idx = Math.max(0, startRow - 2); // fila 2 => índice 0
      const slice = this._rows.slice(idx, idx + numRows).map(r=>{
        const row = r.slice(0, numCols);
        while (row.length < numCols) row.push('');
        return row;
      });
      return {
        getValues(){ return slice; },
        setValues(){ /* no-op */ },
        getValue(){ return ''; },
      };
    },
    appendRow(){ /* no-op */ },
  };
}

// --- Helper: simular una hoja de cálculo básica ---
function sheetWithData(rows){
  return {
    _rows: rows,
    getLastRow(){ return this._rows.length + 1; }, // +1 por header
    getLastColumn(){ return (this._rows[0]||[]).length; },
    getRange(startRow, _startCol, numRows, numCols){
      const idx = Math.max(0, startRow - 2); // fila 2 => índice 0
      const slice = this._rows.slice(idx, idx + numRows).map(r=>{
        const row = r.slice(0, numCols);
        while (row.length < numCols) row.push('');
        return row;
      });
      return {
        getValues(){ return slice; },
        setValues(){ /* no-op */ },
        getValue(){ return ''; },
      };
    },
    appendRow(){ /* no-op */ },
  };
}

// --- Stubs de GAS (antes del require) ---
global.SpreadsheetApp = {
  getActive(){
    return {
      getSheetByName(name){
        if (name === 'Ventas') return sheetWithData(ventasRows);
        if (name === 'Caja')   return sheetWithData(cajaRows);
        // otras hojas vacías para que no fallen helpers
        return sheetWithData([]);
      },
      insertSheet(name){ return sheetWithData([]); },
    };
  },
};

// Solo si NO cambiás ok_ (ver parche abajo):
global.ContentService = {
  MimeType: { JSON: 'application/json' },
  createTextOutput(s){ return { setMimeType(){ return { getContent: ()=>s }; } }; },
};

const Code = require('../src/Code.gs');

// Soporta ambos: objeto plano o TextOutput
const toObj = (x) => (x && typeof x.getContent==='function') ? JSON.parse(x.getContent()) : x;

const resp = toObj(Code.listSalesHistory_(0, 100));
console.log(resp.items[0]);
console.log(resp.items.length);