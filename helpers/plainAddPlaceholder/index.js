const  PDFObject  = require('../pdfkit/pdfobject');
const removeTrailingNewLine = require('../removeTrailingNewLine');
const readPdf = require('./readPdf');
const getPageRef = require('./getPageRef');
const getIndexFromRef = require('./getIndexFromRef');
const PDFKitReferenceMock = require('../pdfkitReferenceMock');
const pdfkitAddPlaceholder = require('../pdfkitAddPlaceholder');

const createBufferRootWithAcroform = require('./createBufferRootWithAcroform');
const createBufferPageWithAnnotation = require('./createBufferPageWithAnnotation');
const createBufferTrailer = require('./createBufferTrailer');

const DEFAULT_SIGNATURE_LENGTH = 8192;

/**
 * Aiciona Placeholder em um documento PDF
 *
 * This contrasts with the default pdfkit-based implementation.
 * Parsing is done using simple string operations.
 * Adding is done with `Buffer.concat`.
 * This allows node-signpdf to be used on any PDF and
 * not only on a freshly created through PDFKit one.
 */
const plainAddPlaceholder = ({
        pdfBuffer,
        reason,
        signatureLength = DEFAULT_SIGNATURE_LENGTH
    }) => {
        let pdf = removeTrailingNewLine(pdfBuffer);
        const info = readPdf(pdf);
        const pageRef = getPageRef(pdf, info);
        const pageIndex = getIndexFromRef(info.xref, pageRef);
        const addedReferences = new Map();


        const pdfKitMock = {
            ref: (input) => {
                info.xref.maxIndex += 1;

                addedReferences.set(info.xref.maxIndex, pdf.length + 1); // Adiciona uma linha.

                pdf = Buffer.concat([
                    pdf,
                    Buffer.from('\n'),
                    Buffer.from(`${info.xref.maxIndex} 0 obj\n`),
                    Buffer.from(PDFObject.convert(input)),
                    Buffer.from('\nendobj\n'),
                ]);
                return new PDFKitReferenceMock(info.xref.maxIndex);
            },
            page: {
                dictionary: new PDFKitReferenceMock(
                    pageIndex,
                    {
                        data: {
                            Annots: [],
                        },
                    },
                ),
            },
            _root: {
                data: {},
            },
        };

        const { form, widget } = pdfkitAddPlaceholder({
            pdf: pdfKitMock,
            reason,
            signatureLength,
        });

        const rootIndex = getIndexFromRef(info.xref, info.rootRef);
        addedReferences.set(rootIndex, pdf.length + 1);
        pdf = Buffer.concat([
            pdf,
            Buffer.from('\n'),
            createBufferRootWithAcroform(pdf, info, form),
        ]);

        addedReferences.set(pageIndex, pdf.length + 1);
        pdf = Buffer.concat([
            pdf,
            Buffer.from('\n'),
            createBufferPageWithAnnotation(pdf, info, pageRef, widget),
        ]);

        pdf = Buffer.concat([
            pdf,
            Buffer.from('\n'),
            createBufferTrailer(pdf, info, addedReferences),
        ]);

        return pdf;
};

module.exports = plainAddPlaceholder;
