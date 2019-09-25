const readRefTable = require('./readRefTable');
const findObject = require('./findObject');

/**
 * Analise simplificada de um PDF Buffer
 * Extrai tabela de referencia, informações raiz e inicio de trilha.
 *
 * See section 7.5.5 (File Trailer) of the PDF specs.
 *
 * @param {Buffer} pdfBuffer
 */
const readPdf = (pdfBuffer) => {

    //retorna o indice da ultima ocorrencia da string parametro.
    const trailerStart = pdfBuffer.lastIndexOf('trailer'); 
    
    // Identifica o trailer:
    //O trailer é seguido por refex. Então um EOF. O comprimento do EOF é de 6 caracteres.
    const trailer = pdfBuffer.slice(trailerStart, pdfBuffer.length - 6);

    if (trailer.lastIndexOf('/Prev') !== -1) {
        console.log(' readPDF.js:20 => PDFs atualizados de forma incremental ainda não são suportados.');
    }

    let rootSlice = trailer.slice(trailer.indexOf('/Root'));
    rootSlice = rootSlice.slice(0, rootSlice.indexOf('/', 1));
    const rootRef = rootSlice.slice(6).toString().trim(); // /Root + at least one space

    // We've invcluded startxref in the trailer extracted above.
    // They are two separate things but as per 7.5.5 they are always one after the other.
    let xRefPosition = trailer.slice(trailer.lastIndexOf('startxref') + 10).toString();
    xRefPosition = parseInt(xRefPosition);
    const refTable = readRefTable(pdfBuffer, xRefPosition);

    // Now find the actual root.
    const root = findObject(pdfBuffer, refTable, rootRef).toString();
    if (root.indexOf('AcroForm') !== -1) {
        console.log('readPDF.js:38 =- > O documento já contem um form.')
        //throw new SignPdfError( 'The document already contains a form. This is not yet supported.', SignPdfError.TYPE_PARSE );
    }

    return {
        xref: refTable,
        rootRef,
        root,
        trailerStart,
    };
};

module.exports = readPdf;
