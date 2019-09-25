/**
 * @param {Object} info As extracted from readRef()
 */
module.exports = function getPagesDictionaryRef(info) {
    const pagesRefRegex = new RegExp('\\/Type\\s*\\/Catalog\\s*\\/Pages\\s+(\\d+\\s\\d+\\sR)', 'g');
    const match = pagesRefRegex.exec(info.root);
    if (match === null) {
        console.log('getPagesDictionaryRef.js:8 = > Falha ao encontrar o descritor de páginas. Provavelmente, este é um problema no node-signpdf.');
        //throw new SignPdfError( 'Failed to find the pages descriptor. This is probably a problem in node-signpdf.', SignPdfError.TYPE_PARSE );
    }

    return match[1];
}