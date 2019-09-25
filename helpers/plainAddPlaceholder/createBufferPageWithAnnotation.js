const findObject = require('./findObject');
const getIndexFromRef = require('./getIndexFromRef');

const createBufferPageWithAnnotation = (pdf, info, pagesRef, widget) => {
    const pagesDictionary = findObject(pdf, info.xref, pagesRef).toString();
    if (pagesDictionary.indexOf('/Annots') !== -1) {
        console.log('Já existem /Anotações descritas.')
        //throw new SignPdfError(  'There already are /Annots described. This is not yet supported', SignPdfError.TYPE_PARSE );
    }

    const pagesDictionaryIndex = getIndexFromRef(info.xref, pagesRef);

    return Buffer.concat([
        Buffer.from(`${pagesDictionaryIndex} 0 obj\n`),
        Buffer.from('<<\n'),
        Buffer.from(`${pagesDictionary}\n`),
        Buffer.from(`/Annots [${widget}]`),
        Buffer.from('\n>>\nendobj\n'),
    ]);
};
module.exports = createBufferPageWithAnnotation;