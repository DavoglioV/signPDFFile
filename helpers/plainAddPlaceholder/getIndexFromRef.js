/**
 * @param {object} refTable
 * @param {string} ref
 * @returns {number}
 */
const getIndexFromRef = (refTable, ref) => {
    let [index] = ref.split(' ');
    index = parseInt(index);
    if (!refTable.offsets.has(index)) {
        console.log(`getIndexFromRef.js:10 => Falha ao localizar objeto ${ref}`)
        //throw new SignPdfError( `Failed to locate object "${ref}".`, SignPdfError.TYPE_PARSE);
    }
    return index;
};

module.exports = getIndexFromRef;