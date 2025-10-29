const UploadOCR = require('../src/UploadOCR.gs')
const data = "VITALLY \nEndereço: RUA ENGENHEIRO JOAQUIM CARDOSO, 294, PITIMBU, 59069010, NATAL, RN Fone: (84) 2030-5251 \nPedido do Catálogo \nDados do Cliente: Nº 18206 \nEmissão: 18/09/2025 09:43:27 \nNome: Elizabete Rodrigues \nEmail: Deyssi.ibarra@outlook.com Fone: (59) 5973-8532 \nEndereço: RUA NATAL, CASA , VILA C, 85870230, FOZ DO IGUAÇU, PR Dados Gerais: \nVendedor: USUÁRIO DEFAULT Observação: \nCaixa: Tabela de Preço: ATACADO \nProduto Qtd. Vl. Unit. Acr. Desc. Prom. Valor \n1 R$ 76,00 505899 - BERM. BOSTON S. SPORT - AT091 Cor: CACAU - Tam: M - Cód. Barras: 8991234017433 76,00 0,00 0,00 0,00 \n1 R$ 76,00 505899 - BERM. BOSTON S. SPORT - AT091 Cor: Cinza 1 - Tam: P - Cód. Barras: 7890000251570 76,00 0,00 0,00 0,00 \n1 R$ 76,00 505899 - BERM. BOSTON S. SPORT - AT091 Cor: Cinza 1 - Tam: M - Cód. Barras: 7890000251587 76,00 0,00 0,00 0,00 \n1 R$ 76,00 505899 - BERM. BOSTON S. SPORT - AT091 Cor: MARINHO - Tam: P - Cód. Barras: 7890000251129 76,00 0,00 0,00 0,00 \n1 R$ 76,00 505899 - BERM. BOSTON S. SPORT - AT091 Cor: MARROM - Tam: P - Cód. Barras: 8991234017518 76,00 0,00 0,00 0,00 \n1 R$ 76,00 505899 - BERM. BOSTON S. SPORT - AT091 Cor: MARROM - Tam: M - Cód. Barras: 8991234017525 76,00 0,00 0,00 0,00 \n1 R$ 76,00 505899 - BERM. BOSTON S. SPORT - AT091 Cor: MARROM - Tam: G - Cód. Barras: 8991234017532 76,00 0,00 0,00 0,00 \n1 R$ 76,00 505899 - BERM. BOSTON S. SPORT - AT091 Cor: PRETO - Tam: G - Cód. Barras: 7890000234535 76,00 0,00 0,00 0,00 \n1 R$ 76,00 505899 - BERM. BOSTON S. SPORT - AT091 Cor: SALMAO - Tam: P - Cód. Barras: 7890000257312 76,00 0,00 0,00 0,00 \n1 R$ 76,00 505899 - BERM. BOSTON S. SPORT - AT091 Cor: SALMAO - Tam: M - Cód. Barras: 7890000257329 76,00 0,00 0,00 0,00 \n1 R$ 76,00 505899 - BERM. BOSTON S. SPORT - AT091 Cor: VINHO - Tam: P - Cód. Barras: 7890000257350 76,00 0,00 0,00 0,00 \n1 R$ 76,00 505899 - BERM. BOSTON S. SPORT - AT091 Cor: VINHO - Tam: M - Cód. Barras: 7890000257367 76,00 0,00 0,00 0,00 \n1 R$ 74,00 506602 - SHORT RACE- AT119 Cor: BEGE - Tam: M - Cód. Barras: 8990000049548 74,00 0,00 0,00 0,00 \n1 R$ 74,00 506602 - SHORT RACE- AT119 Cor: MARINHO - Tam: G - Cód. Barras: 1005066021050 74,00 0,00 0,00 0,00\nProduto Qtd. Vl. Unit. Acr. Desc. Prom. Valor \n1 R$ 74,00 506602 - SHORT RACE- AT119 Cor: VINHO - Tam: G - Cód. Barras: 8990000016434 74,00 0,00 0,00 0,00 \n10 R$ 190,00 507267 - PORTA NUMERO Cor: DIVERSAS - Tam: UNICO - Cód. Barras: 7890000281133 19,00 0,00 0,00 0,00 \n2 R$ 164,00 507314 - BERM. MASC. C/B SR- AT253 Cor: PRETO - Tam: P - Cód. Barras: 7890000287500 82,00 0,00 0,00 0,00 \n1 R$ 82,00 507314 - BERM. MASC. C/B SR- AT253 Cor: PRETO - Tam: M - Cód. Barras: 7890000287517 82,00 0,00 0,00 0,00 \n1 R$ 82,00 507314 - BERM. MASC. C/B SR- AT253 Cor: PRETO - Tam: G - Cód. Barras: 7890000287524 82,00 0,00 0,00 0,00 \n1 R$ 82,00 507314 - BERM. MASC. C/B SR- AT253 Cor: PRETO - Tam: GG - Cód. Barras: 7890000287531 82,00 0,00 0,00 0,00 \n2 R$ 158,00 507316 - BERM. STREET RACE C/B AT-192 Cor: BRANCO - Tam: P - Cód. Barras: 8990000032878 79,00 0,00 0,00 0,00 \n2 R$ 158,00 507316 - BERM. STREET RACE C/B AT-192 Cor: BRANCO - Tam: M - Cód. Barras: 8990000032885 79,00 0,00 0,00 0,00 \n2 R$ 158,00 507316 - BERM. STREET RACE C/B AT-192 Cor: BRANCO - Tam: G - Cód. Barras: 8990000032892 79,00 0,00 0,00 0,00 \n1 R$ 54,00 508967 - TOP DALLAS C/B Cor: CACAU - Tam: M - Cód. Barras: 8990000096115 54,00 0,00 0,00 0,00 \n1 R$ 54,00 508967 - TOP DALLAS C/B Cor: SALMAO - Tam: P - Cód. Barras: 8991234028286 54,00 0,00 0,00 0,00 \n1 R$ 54,00 508967 - TOP DALLAS C/B Cor: SALMAO - Tam: M - Cód. Barras: 8991234028293 54,00 0,00 0,00 0,00 \n1 R$ 76,00 508968 - BERMUDA DALLAS C/B Cor: Azul - Tam: M - Cód. Barras: 8991234028903 76,00 0,00 0,00 0,00 \n1 R$ 76,00 508968 - BERMUDA DALLAS C/B Cor: Azul - Tam: G - Cód. Barras: 8991234028910 76,00 0,00 0,00 0,00 \n1 R$ 76,00 508968 - BERMUDA DALLAS C/B Cor: PRETO - Tam: M - Cód. Barras: 7890000302050 76,00 0,00 0,00 0,00 \n1 R$ 59,00 509025 - TOP TOQUIO C/B - AT196 Cor: BRANCO - Tam: M - Cód. Barras: 8991234030180 59,00 0,00 0,00 0,00 \n3 R$ 117,00 509050 - VISEIRA ATHLETIC REGULÁVEL Cor: BRANCO - Tam: UNICO - Cód. Barras: 8990000036548 39,00 0,00 0,00 0,00 \n3 R$ 117,00 509050 - VISEIRA ATHLETIC REGULÁVEL Cor: MARINHO - Tam: UNICO - Cód. Barras: 8991234030326 39,00 0,00 0,00 0,00 \n1 R$ 82,00 509097 - BERM. BOSTON PERFORMANCE C/B- AT091 Cor: Cinza 1 - Tam: G - Cód. Barras: 8990000038528 82,00 0,00 0,00 0,00 \n2 R$ 98,00 509112 - REGATA MOVE RM Cor: VERDE PISTACHE - Tam: P - Cód. Barras: 8991234015378 49,00 0,00 0,00 0,00\nProduto Qtd. Vl. Unit. Acr. Desc. Prom. Valor \n2 R$ 98,00 509112 - REGATA MOVE RM Cor: VERDE PISTACHE - Tam: M - Cód. Barras: 8991234015385 49,00 0,00 0,00 0,00 \n2 R$ 98,00 509112 - REGATA MOVE RM Cor: Vermelho - Tam: P - Cód. Barras: 8991234015422 49,00 0,00 0,00 0,00 \n2 R$ 98,00 509112 - REGATA MOVE RM Cor: Vermelho - Tam: M - Cód. Barras: 8991234015439 49,00 0,00 0,00 0,00 \n1 R$ 59,00 509193 - TOP DALLAS C/2 B AT-241 Cor: PRETO - Tam: M - Cód. Barras: 8991234010366 59,00 0,00 0,00 0,00 \nPAGAMENTOS \nValor: R$ 3.424,00 Desconto R$ 0,00 \nDesconto: Acréscimo: \nR$ 0,00 R$ 0,00 \nFrete: R$ 0,00 \nQuantidade de 59 \nTotal: R$ 3.424,00 \nTroco: R$ 0,00 \nGeracloud (Gera3 Sistemas)\nhttp://www.geracloud.com.br/ "
;(()=>{
    let items = UploadOCR.parseVITALLY_(data)
    // console.log(JSON.stringify(items.at(0)));
    // console.log(items.length);

    if (!items || !items.length) {
        console.error('Parser returned empty result');
        process.exit(1);
    }

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
        ['==', 'count', count, 38],
        ['==', 'qtySum', qtySum, 59],
        ['==', 'totalCents', totalCents, 342400], // 3.424,00 BRL
        ['==', 'byCode.505899', byCode['505899']||0, 12],
        // ['==', 'byCode.13', byCode['13']||0, 3],
        // ['==', 'byCode.18', byCode['18']||0, 10],
        // ['==', 'byCode.81', byCode['81']||0, 2],
        // ['==', 'no.00078', items.some(it => it.code === '00078') ? 1 : 0, 0],
        // ['==', 'no.00016', items.some(it => it.code === '00016') ? 1 : 0, 0],
        // ['==', 'no.00035', items.some(it => it.code === '00035') ? 1 : 0, 0],
        // ['==', 'has.251.ean', items.some(it => it.code === '251' && it.color === 'OFF' && it.size === 'G' && it.qty === 3) ? 1 : 0, 1],
        // ['==', 'has.13.ean', items.some(it => it.code === '13' && it.color === 'AZUL BB' && it.size === 'G' && it.qty === 1) ? 1 : 0, 1],
        // ['==', 'has.13.ean', items.some(it => it.code === '13' && it.color === 'PRETO' && it.size === 'M' && it.qty === 1) ? 1 : 0, 1],
        ['==', 'has.507267.ean', items.some(it => it.code === '507267' && it.name.includes('PORTA NUMERO') && it.color === 'DIVERSAS' && it.size === 'UNICO' && it.qty === 10 && it.costUnit === 19) ? 1 : 0, 1],
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
    // console.log('First 5 items:', items);
    if (!ok) {
        // console.log('First 5 items:', items.slice(0,5));
        console.log('All items:', JSON.stringify(items));
        process.exit(2);
    }
    console.log('OK - parseOxyrioPriceQuote_ passed basic checks.');    
})()