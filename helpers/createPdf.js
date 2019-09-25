const PDFDocument = require('pdfkit');
const fs = require('fs');

const createPdf = params => new Promise((resolve) => {
    const requestParams = {
        placeholder: {},
        text: 'Faturamento Digital',
        addSignaturePlaceholder: true,
        ...params,
    };
  
    const pdf = new PDFDocument({
        autoFirstPage: true,
        size: 'A4',
        layout: 'portrait',
        bufferPages: true,
    });

    pdf.info.CreationDate = '';
  
    // Adiciona conteudo à pagina
    pdf
        .fillColor('#333')
        .fontSize(25)
        .moveDown()
        .text(requestParams.text);
  
    // TODO Identificar o que é feito nesses blocos de código.
    const pdfChunks = [];
    pdf.on('data', (data) => {
         pdfChunks.push(data);
     });
     pdf.on('end', () => {
         resolve(Buffer.concat(pdfChunks));
     });
  
     //verifica se foi solicitado que fosse criado um placeholder
    if (requestParams.addSignaturePlaceholder) {
        // Externamente (para o PDFKit) adiciona o espaço para assinatura.
        const refs = pdfkitAddPlaceholder({
            pdf,
            reason: 'Adicionar placeholder',
            ...requestParams.placeholder,
        });

        // Externamente ao PDF Kit, finaliza (.end() ) o fluxo destes objetos criados.
        Object.keys(refs).forEach(key => refs[key].end());
    }
  
    //Indica onde ficara o output pdf (.save())
    pdf.pipe((fs.createWriteStream(`${__dirname}\\resources\\pdfCreated.pdf`)))
    
    // Finaliza o PDFBuffer ( pdf). Além disso o end() trata de converter tudo em Buffer.
    //Verificar pdf.on('end'... ) na documentação.
    pdf.end();
    pdf.save();
  });

  module.exports = createPdf;