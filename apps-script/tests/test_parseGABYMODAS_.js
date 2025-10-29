const UploadOCR = require('../src/UploadOCR.gs')
const data = `1/2 \nGABY MODAS - LOJA 44 Pag.: \n Rua José Sinimbu Filho, Bairro:Setor Norte Ferroviário, Cidade:GOIANIA, Uf:GO, nº:233 cep.: 74.063-330, Fone:(62) 8209-2769 \nData: 25/09/2025 \nESPELHO DA VENDA \nVenda Nº 6308 \nData de Emissão: 19/08/2025 14:56:12 Operação Fat.: VENDA \nCliente: \nDIANA IBARRA \nFantasia: \nCNPJ/CPF: Endereço: \nINSC.ESTADUAL: \nNº.: \nTelefone: \nVendedor: Assessor: \nHELENA \nObservações: \nCond.Venc.: Forma Pgto.: \nPRODUTO COR TAB. PREC TAM QTD VLR. UN TOT.DESC V.LIQ.UNIT VLR. TOTAL 13 - BIQUINI LUDY AZUL BB ATACADO G 1 R$ 22,50 R$ 0,00 R$ 22,50 R$ 22,50 13 - BIQUINI LUDY MARROM ATACADO G 1 R$ 22,50 R$ 0,00 R$ 22,50 R$ 22,50 13 - BIQUINI LUDY PRETO ATACADO M 1 R$ 22,50 R$ 0,00 R$ 22,50 R$ 22,50 165 - YASMIN + PAREO QUADRADA ESTAMPADO ATACADO M 6 R$ 58,50 R$ 0,00 R$ 58,50 R$ 351,00 165 - YASMIN + PAREO QUADRADA ESTAMPADO ATACADO G 4 R$ 58,50 R$ 0,00 R$ 58,50 R$ 234,00 17 - BIQUINI FITA AMARELO NEON ATACADO G 1 R$ 15,30 R$ 0,00 R$ 15,30 R$ 15,30 17 - BIQUINI FITA FÚCSIA ATACADO M 3 R$ 15,30 R$ 0,00 R$ 15,30 R$ 45,90 17 - BIQUINI FITA PRETO ATACADO G 3 R$ 15,30 R$ 0,00 R$ 15,30 R$ 45,90 17 - BIQUINI FITA ROSA NEON ATACADO G 4 R$ 15,30 R$ 0,00 R$ 15,30 R$ 61,20 17 - BIQUINI FITA TERRA COTA ATACADO M 3 R$ 15,30 R$ 0,00 R$ 15,30 R$ 45,90 17 - BIQUINI FITA VERDE MILITAR ATACADO M 3 R$ 15,30 R$ 0,00 R$ 15,30 R$ 45,90 18 - BIQUINI FITA REGULADOR AZUL BB ATACADO M 3 R$ 15,30 R$ 0,00 R$ 15,30 R$ 45,90 18 - BIQUINI FITA REGULADOR FÚCSIA ATACADO G 1 R$ 15,30 R$ 0,00 R$ 15,30 R$ 15,30 18 - BIQUINI FITA REGULADOR MARROM ATACADO M 3 R$ 15,30 R$ 0,00 R$ 15,30 R$ 45,90 18 - BIQUINI FITA REGULADOR MARROM ATACADO G 1 R$ 15,30 R$ 0,00 R$ 15,30 R$ 15,30 18 - BIQUINI FITA REGULADOR NUDE ATACADO M 3 R$ 15,30 R$ 0,00 R$ 15,30 R$ 45,90 18 - BIQUINI FITA REGULADOR NUDE ATACADO G 1 R$ 15,30 R$ 0,00 R$ 15,30 R$ 15,30 18 - BIQUINI FITA REGULADOR PRETO ATACADO M 1 R$ 15,30 R$ 0,00 R$ 15,30 R$ 15,30 18 - BIQUINI FITA REGULADOR ROSA PINK ATACADO M 3 R$ 15,30 R$ 0,00 R$ 15,30 R$ 45,90 18 - BIQUINI FITA REGULADOR ROSA PINK ATACADO G 1 R$ 15,30 R$ 0,00 R$ 15,30 R$ 15,30 18 - BIQUINI FITA REGULADOR VERDE MILITAR ATACADO G 1 R$ 15,30 R$ 0,00 R$ 15,30 R$ 15,30 180 - KIT SONIA AZUL BIC ATACADO M 1 R$ 63,00 R$ 0,00 R$ 63,00 R$ 63,00 180 - KIT SONIA AZUL BIC ATACADO G 1 R$ 63,00 R$ 0,00 R$ 63,00 R$ 63,00 180 - KIT SONIA AZUL JADE ATACADO G 1 R$ 63,00 R$ 0,00 R$ 63,00 R$ 63,00 180 - KIT SONIA FÚCSIA ATACADO M 1 R$ 63,00 R$ 0,00 R$ 63,00 R$ 63,00 180 - KIT SONIA FÚCSIA ATACADO G 1 R$ 63,00 R$ 0,00 R$ 63,00 R$ 63,00 180 - KIT SONIA LARANJA ATACADO M 1 R$ 63,00 R$ 0,00 R$ 63,00 R$ 63,00 180 - KIT SONIA LARANJA ATACADO G 2 R$ 63,00 R$ 0,00 R$ 63,00 R$ 126,00 180 - KIT SONIA NUDE ATACADO M 3 R$ 63,00 R$ 0,00 R$ 63,00 R$ 189,00 180 - KIT SONIA NUDE ATACADO G 2 R$ 63,00 R$ 0,00 R$ 63,00 R$ 126,00 180 - KIT SONIA PRETO ATACADO M 3 R$ 63,00 R$ 0,00 R$ 63,00 R$ 189,00 180 - KIT SONIA PRETO ATACADO G 3 R$ 63,00 R$ 0,00 R$ 63,00 R$ 189,00 180 - KIT SONIA ROSA PINK ATACADO M 1 R$ 63,00 R$ 0,00 R$ 63,00 R$ 63,00 180 - KIT SONIA VERDE MILITAR ATACADO M 1 R$ 63,00 R$ 0,00 R$ 63,00 R$ 63,00 180 - KIT SONIA VERDE MILITAR ATACADO G 1 R$ 63,00 R$ 0,00 R$ 63,00 R$ 63,00 180 - KIT SONIA VERMELHO ATACADO M 1 R$ 63,00 R$ 0,00 R$ 63,00 R$ 63,00 180 - KIT SONIA VERMELHO ATACADO G 1 R$ 63,00 R$ 0,00 R$ 63,00 R$ 63,00 180 - KIT SONIA VRDE MUSGO ATACADO M 1 R$ 63,00 R$ 0,00 R$ 63,00 R$ 63,00 180 - KIT SONIA VRDE MUSGO ATACADO G 2 R$ 63,00 R$ 0,00 R$ 63,00 R$ 126,00 251 - SAIDA COPACABANA BEGE ATACADO M 3 R$ 45,00 R$ 0,00 R$ 45,00 R$ 135,00 251 - SAIDA COPACABANA BEGE ATACADO G 3 R$ 45,00 R$ 0,00 R$ 45,00 R$ 135,00 251 - SAIDA COPACABANA OFF ATACADO M 3 R$ 45,00 R$ 0,00 R$ 45,00 R$ 135,00 251 - SAIDA COPACABANA OFF ATACADO G 3 R$ 45,00 R$ 0,00 R$ 45,00 R$ 135,00 251 - SAIDA COPACABANA PRETO ATACADO M 3 R$ 45,00 R$ 0,00 R$ 45,00 R$ 135,00 251 - SAIDA COPACABANA PRETO ATACADO G 3 R$ 45,00 R$ 0,00 R$ 45,00 R$ 135,00 30 - BIQUINI GABY FÚCSIA ATACADO M 3 R$ 22,50 R$ 0,00 R$ 22,50 R$ 67,50 30 - BIQUINI GABY MARROM ATACADO M 2 R$ 22,50 R$ 0,00 R$ 22,50 R$ 45,00 30 - BIQUINI GABY PRETO ATACADO M 2 R$ 22,50 R$ 0,00 R$ 22,50 R$ 45,00 37 - BODY CAMILE AZUL BIC ATACADO G 1 R$ 28,00 R$ 0,00 R$ 28,00 R$ 28,00 37 - BODY CAMILE PISTACHE ATACADO M 1 R$ 28,00 R$ 0,00 R$ 28,00 R$ 28,00 37 - BODY CAMILE PISTACHE ATACADO G 1 R$ 28,00 R$ 0,00 R$ 28,00 R$ 28,00 37 - BODY CAMILE PRETO ATACADO G 2 R$ 28,00 R$ 0,00 R$ 28,00 R$ 56,00 37 - BODY CAMILE ROSA PINK ATACADO G 1 R$ 28,00 R$ 0,00 R$ 28,00 R$ 28,00 37 - BODY CAMILE VERDE MENTA ATACADO M 1 R$ 28,00 R$ 0,00 R$ 28,00 R$ 28,00 37 - BODY CAMILE VERDE MENTA ATACADO G 2 R$ 28,00 R$ 0,00 R$ 28,00 R$ 56,00 37 - BODY CAMILE VERMELHO ATACADO M 1 R$ 28,00 R$ 0,00 R$ 28,00 R$ 28,00\n\n2/2 \nGABY MODAS - LOJA 44 Pag.: \n Rua José Sinimbu Filho, Bairro:Setor Norte Ferroviário, Cidade:GOIANIA, Uf:GO, nº:233 cep.: 74.063-330, Fone:(62) 8209-2769 \nData: 25/09/2025 \nESPELHO DA VENDA \nVenda Nº 6308 \n37 - BODY CAMILE VERMELHO ATACADO G 1 R$ 28,00 R$ 0,00 R$ 28,00 R$ 28,00 60 - CLAUDINHA PAREO QUADRADA ESTAMPADO ATACADO M 4 R$ 58,50 R$ 0,00 R$ 58,50 R$ 234,00 60 - CLAUDINHA PAREO QUADRADA ESTAMPADO ATACADO G 2 R$ 58,50 R$ 0,00 R$ 58,50 R$ 117,00 62 - ARGOLA PAREO QUADRADA ESTAMPADO ATACADO M 5 R$ 58,50 R$ 0,00 R$ 58,50 R$ 292,50 62 - ARGOLA PAREO QUADRADA ESTAMPADO ATACADO G 3 R$ 58,50 R$ 0,00 R$ 58,50 R$ 175,50 64 - GABY PAREO QUADRADA ESTAMPADO ATACADO M 6 R$ 58,50 R$ 0,00 R$ 58,50 R$ 351,00 64 - GABY PAREO QUADRADA ESTAMPADO ATACADO G 3 R$ 58,50 R$ 0,00 R$ 58,50 R$ 175,50 80 - CLAUDINHA KIMONO ESTAMPADO ATACADO M 3 R$ 58,50 R$ 0,00 R$ 58,50 R$ 175,50 81 - ARGOLA KIMONO ESTAMPADO ATACADO M 2 R$ 58,50 R$ 0,00 R$ 58,50 R$ 117,00 81 - ARGOLA KIMONO ESTAMPADO ATACADO G 2 R$ 58,50 R$ 0,00 R$ 58,50 R$ 117,00 \nTOTALIZADOR \nTotal de Peças: 141 \nPeso Bruto: 22,20 \nPeso Líquido: 446,10 \nValor Bruto do Pedido: R$ 5.919,50 \nTotal de Descontos: R$ 19,50 \nPercentual Desconto: 0,33 % \nTotal de Acréscimos: R$ 0,00 \nTotal FRETE: 0,00 \nValor Total do Pedido: R$ 5.900,00 \nConcluído \nAcerto nº: 5897 Data de Emissão: 19/08/2025 Vlr.Bruto: R$ 5.900,00 V.Acresc.: R$ 0,00V.Desct.: R$ 0,00 Crédito Abatido: R$ 0,00 VALOR LÍQUIDO: R$ 5.900,00 \n\n\nPIX P6308/1 R$ 5.900,00 19/08/2025\nTOTAL: R$ 5.900,00 \nOBSERVAÇÕES:\n`
;(()=>{
    let items = UploadOCR.parseGABYMODAS_(data)
    // console.log(JSON.stringify(items.at(0)));
    // console.log(items.length);
    // return
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
        ['==', 'count', count, 66],
        ['==', 'qtySum', qtySum, 141],
        ['==', 'totalCents', totalCents, 591950], // 5.919,50 BRL
        ['==', 'byCode.17', byCode['17']||0, 6],
        ['==', 'byCode.13', byCode['13']||0, 3],
        ['==', 'byCode.18', byCode['18']||0, 10],
        ['==', 'byCode.81', byCode['81']||0, 2],
        ['==', 'no.00078', items.some(it => it.code === '00078') ? 1 : 0, 0],
        ['==', 'no.00016', items.some(it => it.code === '00016') ? 1 : 0, 0],
        ['==', 'no.00035', items.some(it => it.code === '00035') ? 1 : 0, 0],
        ['==', 'no.color.VRDE', items.some(it => it.color.includes('VRDE')) ? 1 : 0, 0],
        ['==', 'has.251.ean', items.some(it => it.code === '251' && it.color === 'OFF' && it.size === 'G' && it.qty === 3) ? 1 : 0, 1],
        ['==', 'has.13.ean', items.some(it => it.code === '13' && it.color === 'AZUL BB' && it.size === 'G' && it.qty === 1) ? 1 : 0, 1],
        ['==', 'has.13.ean', items.some(it => it.code === '13' && it.color === 'PRETO' && it.size === 'M' && it.qty === 1) ? 1 : 0, 1],
        ['==', 'has.165.ean', items.some(it => it.code === '165' && it.name.includes('+ PAREO') && it.color === 'ESTAMPADO' && it.size === 'M' && it.qty === 6 && it.costUnit === 58.5) ? 1 : 0, 1],
    ];

    // {"code":"165","name":"YASMIN + PAREO QUADRADA","color":"ESTAMPADO","size":"M","qty":6,"costUnit":58.5}
    // {"code":"165","name":"YASMIN + PAREO QUADRADA","color":"ESTAMPADO","size":"G","qty":4,"costUnit":58.5}


    let ok = true;
    for (const [op, label, got, want] of must) {
        if (op === '==') {
        if (got !== want) {
            ok = false;
            console.error(`FAIL ${label}: got ${got} expected ${want}`);
        }
        }
    }

    // console.log('All items:', JSON.stringify(items));
    if (!ok) {
        // console.log('First 5 items:', items.slice(0,5));
        // console.log('All items:', JSON.stringify(items));
        process.exit(2);
    }
    console.log('OK - parseOxyrioPriceQuote_ passed basic checks.');
})()