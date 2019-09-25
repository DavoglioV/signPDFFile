const forge = require('node-forge');
const removeTrailingNewLine = require('./removeTrailingNewLine');
const plainAddPlaceholder = require('./plainAddPlaceholder'); // adicionar placeholder no pdf

const DEFAULT_BYTE_RANGE_PLACEHOLDER = '**********';
let algorithm = '';

class SignPdf {
    constructor() {
        this.byteRangePlaceholder = DEFAULT_BYTE_RANGE_PLACEHOLDER;
        this.lastSignature = null;
    }

    sign( pdfBuffer, p12Buffer, additionalOptions = {}) {
        const options = {
            asn1StrictParsing: false,
            passphrase: '',
            alg: 'sha256',
            ...additionalOptions,
        };

        algorithm = setAlgorithm(options.alg);

        if (!(pdfBuffer instanceof Buffer)) {
            throw new Error('PDF experado como Buffer.');
        }
        if (!(p12Buffer instanceof Buffer)) {
            throw new Error('Certificado experado como Buffer.');
        }

        let pdf = removeTrailingNewLine(pdfBuffer);

        // Busca o ByteRange referente ao placeholder.
        const byteRangePlaceholder = [
            0,
            `/${this.byteRangePlaceholder}`,
            `/${this.byteRangePlaceholder}`,
            `/${this.byteRangePlaceholder}`,
        ];
        const byteRangeString = `/ByteRange [${byteRangePlaceholder.join(' ')}]`;
        let byteRangePos = pdf.indexOf(byteRangeString);



        // Calcula o intervalo de bytes real que precisa substituir placeholder.
        const byteRangeEnd = byteRangePos + byteRangeString.length;
        const contentsTagPos = pdf.indexOf('/Contents ', byteRangeEnd);
        const placeholderPos = pdf.indexOf('<', contentsTagPos);
        const placeholderEnd = pdf.indexOf('>', placeholderPos);
        const placeholderLengthWithBrackets = (placeholderEnd + 1) - placeholderPos;
        const placeholderLength = placeholderLengthWithBrackets - 2;
        const byteRange = [0, 0, 0, 0];
        byteRange[1] = placeholderPos;
        byteRange[2] = byteRange[1] + placeholderLengthWithBrackets;
        byteRange[3] = pdf.length - byteRange[2];
        let actualByteRange = `/ByteRange [${byteRange.join(' ')}]`;
        actualByteRange += ' '.repeat(byteRangeString.length - actualByteRange.length);

        // Substitui o placeholder pelo intervalo de bytes atual.
        pdf = Buffer.concat([
            pdf.slice(0, byteRangePos),
            Buffer.from(actualByteRange),
            pdf.slice(byteRangeEnd),
        ]);

        // Remove a assinatura do placeholder
        pdf = Buffer.concat([
            pdf.slice(0, byteRange[1]),
            pdf.slice(byteRange[2], byteRange[2] + byteRange[3]),
        ]);

        // Converte Buffer p12 em uma implementação forge.
        let p12 = bufferDerToP12(p12Buffer, options); //caso retorne falso, o certificado está codificado em base64 e não em DER
        if (!p12){ 
            p12 = buffer64ToP12(p12Buffer, options);
        }

        // Extrai os bags por tipo.
        const certBags = p12.getBags({
            bagType: forge.pki.oids.certBag,
        })[forge.pki.oids.certBag];
        const keyBags = p12.getBags({
            bagType: forge.pki.oids.pkcs8ShroudedKeyBag,
        })[forge.pki.oids.pkcs8ShroudedKeyBag];

        const privateKey = keyBags[0].key;

        const p7 = forge.pkcs7.createSignedData();
        p7.content = forge.util.createBuffer(pdf.toString('binary'));

        let certificate;
        Object.keys(certBags).forEach((i) => {
            const {publicKey} = certBags[i].cert;

            p7.addCertificate(certBags[i].cert);

            // Tenta localizar o certificado relativo à Chave privada.
            if (privateKey.n.compareTo(publicKey.n) === 0
                && privateKey.e.compareTo(publicKey.e) === 0
            ) {
                certificate = certBags[i].cert;
            }
        });

        if (typeof certificate === 'undefined') {
            throw new Error(  'Failed to find a certificate that matches the private key.');
        }

        // Add a sha256 signer. That's what Adobe.PPKLite adbe.pkcs7.detached expects.
        p7.addSigner({
            key: privateKey,
            certificate,
            digestAlgorithm: algorithm,
            authenticatedAttributes: [
                {
                    type: forge.pki.oids.contentType,
                    value: forge.pki.oids.data,
                }, {
                    type: forge.pki.oids.messageDigest,
                }, {
                    type: forge.pki.oids.signingTime,
                    value: new Date('09/18/2019'),
                },
            ],
        });

        p7.sign({detached: true});

        // Checa se o PDF tem espaco de placeholder suficiente para assinatura.
        const raw = forge.asn1.toDer(p7.toAsn1()).getBytes();
        if ((raw.length * 2) > placeholderLength) {
            throw new Error(`Signature exceeds placeholder length: ${raw.length * 2} > ${placeholderLength}`);
        }

        let signature = Buffer.from(raw, 'binary').toString('hex');
        this.lastSignature = signature;

        // Preenche a assinatura com zeros para que ela tenha o mesmo comprimento que o espaço reservado
        signature += Buffer
            .from(String.fromCharCode(0).repeat((placeholderLength / 2) - raw.length))
            .toString('hex');


        pdf = Buffer.concat([
            pdf.slice(0, byteRange[1]),
            Buffer.from(`<${signature}>`),
            pdf.slice(byteRange[1]),
        ]);

        return pdf;
    }
}

function setAlgorithm(alg){
    switch(alg.toLowerCase()){
        case('md5'):
            return forge.pki.oids.md5;
        case('sha1'):
            return forge.pki.oids.sha1;
        case('sha224'):
            return forge.pki.oids.sha224;
        case('sha256'):
            return forge.pki.oids.sha256;
        case('sha512'):
            return forge.pki.oids.sha512;
    }
}

function bufferDerToP12(p12Buffer, options){
    try{
        var forgeCert = forge.util.createBuffer(p12Buffer.toString('base64'));
        var p12Der = forge.util.decode64(forgeCert.getBytes());
        var p12Asn1 = forge.asn1.fromDer(forge.util.decode64(p12Der));
        var p12 = forge.pkcs12.pkcs12FromAsn1(
            p12Asn1,
            options.asn1StrictParsing,
            options.passphrase,
        );
        return p12;
    }catch(e){
        return false;
    }
}

function buffer64ToP12(p12Buffer, options){
    try{
    const forgeCert = forge.util.createBuffer(p12Buffer.toString('binary')); 
        const p12Asn1 = forge.asn1.fromDer(forgeCert);
        const p12 = forge.pkcs12.pkcs12FromAsn1(
            p12Asn1,
            options.asn1StrictParsing,
            options.passphrase,
        );
        return p12;
    }catch(e){
        throw new Error('Erro ao decodificar certificado. Favor verificar. (Codificações reconhecidas: Base64 e DER' + e);
    }
}


module.exports = DEFAULT_BYTE_RANGE_PLACEHOLDER;
module.exports = SignPdf;