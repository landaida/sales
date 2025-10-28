const Code = require('../src/Code.gs')
const data = [["30262","TOP LUNGE","370000","","4","184920","1","184920","100.0865239","370000","MENTA/BRANCO","P"],["30264","SHORTS LUNGE","450000","","4","227800","1","227800","97.54170325","450000","MENTA/BRANCO","P"],["30219","SHORTS BOWLER","430000","","3","211720","1","211720","103.0984319","430000","MARROM","M"],["30220","TOP BOWLER","370000","","2","184920","1","184920","100.0865239","370000","PINK","M"],["30114","MACAQUINHO PEAK","750000","","2","375200","1","375200","99.89339019","750000","ROSA BEBE","M"],["78","AZUL BEBE M 62121000 30309 JAQUETA YACHTING","920000","","0","455600","1","455600","101.9315189","920000","AZUL BEBE","M"],["30223","FLARE YACHTING","920000","","1","455600","1","455600","101.9315189","920000","AZUL BEBE","M"],["30173","MACACAO ASCEND","920000","","1","455600","1","455600","101.9315189","920000","OFF-WHITE","M"],["30231","CROPPED RIPOSTE","480000","","3","238520","1","238520","101.2409861","480000","AZUL BEBE","M"],["30310","CONJUNTO BOULDERING","1180000","","0","589600","1","589600","100.1356852","1180000","MARROM","M"],["16","OFF-WHITE P 62121000 30220 TOP BOWLER","370000","","1","184920","1","184920","100.0865239","370000","LOLLIPOP","M"],["30172","SHORTS PEAK","500000","","2","246560","1","246560","102.7903958","500000","AZUL ROYAL","M"],["27020","TOP CLOSED REF 27051","370000","","1","184920","1","184920","100.0865239","370000","AZUL ROYAL","M"],["30263","LEGGING LUNGE","600000","","2","294800","1","294800","103.5278155","600000","MENTA/BRANCO","P"],["30232","FLARE RIPOSTE","920000","","2","455600","1","455600","101.9315189","920000","VINHO","M"],["30230","CASACO RIPOSTE","800000","","2","402000","1","402000","99.00497512","800000","VINHO","M"],["30296","SHORTS RIPOSTE","430000","","1","211720","1","211720","103.0984319","430000","AZUL BEBE","M"],["35","10-PRETO M 62046300 29929 MACAQUINHO TRUST","650000","","0","321600","1","321600","102.1144279","650000","NUDE/BRANCO","G"],["29929","MACAQUINHO TRUST","650000","","1","321600","1","321600","102.1144279","650000","BLUE SKY/BRANCO","M"],["30222","TOP YACHTING","450000","","1","227800","1","227800","97.54170325","450000","PRETO/BRANCO","M"],["27805","TOP CHALLENGE REF 27292","400000","","1","201000","1","201000","99.00497512","400000","MARROM","M"]]
;(()=>{
    const showWithoutStock = true
    const filterText = 'branco'
    var showZeros = (String(showWithoutStock).toLowerCase() === 'true' || showWithoutStock === true || String(showWithoutStock) === '1');
    const terms = filterText.trim().toUpperCase().split(/\s+/).filter(Boolean);

    // console.log(Code)
    let sh = {
        getLastRow: () => 22,
        getRange: (start, _col, count, _lastCol) => ({
            getValues: () => {
            // start=2 debe mapear a index 0 del arreglo
            const idx = Math.max(0, start - 2);
            return data.slice(idx, idx + count);
            }
        })
    };
    let {items, next} = Code._scanFromBottom_({sh, lastCol:12, cursor:0, limit:5, pageSize:100, rowHandler:(r, items)=>{
        var stock=Number(r[4]||0), code = String(r[0]||'').trim();
        if(!code || (!showZeros && stock === 0)) return; 
        
        var name=String(r[1]||code), defaultPrice=Number(r[2]||r[9]||0), color=String(r[10]), size=String(r[11]);    
        const codeUpper = code.toUpperCase(), nameUpper = name.toUpperCase(), sizeUpper = size.toUpperCase(), colorUpper = color.toUpperCase();

        const filtered = !terms || terms.length === 0 || (terms && terms.length > 0 && terms.every(t => codeUpper.includes(t) || nameUpper.includes(t) || sizeUpper.includes(t) || colorUpper.includes(t)))
        if(!filtered) return;
        items.push({ code, name, stock, defaultPrice, color, size}); 
    }})

    console.log(JSON.stringify(items)); // esperado: 5
    console.log(items.length); // esperado: 5
    console.log(next);         // esperado: 5
    // if (items.length !== 5 || next !== 6) {
    // throw new Error(`Unexpected {len:${items.length}, next:${next}}`);
    // }
})()