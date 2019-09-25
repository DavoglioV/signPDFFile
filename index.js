const plainAddPlaceholder = require('./helpers/plainAddPlaceholder'); // adicionar placeholder no pdf
const SignPdf = require('./helpers/signpdf'); //assinatura de pdf
const fs = require('fs'); //manupulação de arquivo.
let readline = require('readline');

var rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});
let password;

//rl.question('Informe a senha do certificado. \n', (answer) => {
//  password = answer;
  f1('');
//rl.close();
//});

async function f1(password){
  fs.readdir(`${__dirname}\\certificate`, (err, paths) => {
    var pathCert = `${__dirname}\\certificate\\`.concat(paths[0].toString());
    let p12Buffer = fs.readFileSync(pathCert);
    fs.readdir(`${__dirname}\\pdf_input`, (err, paths) => {
      //identificao nome do primeiro arquivo que encontrar na pasta pdf_entrada,
      //Só pode ter um arquivo na pasta
      for (i=0;i<paths.length;i++){

        var fileName = paths[i].toString();
        //Gera o endereço do arquivo a ser assinado.
        _pathFile = `${__dirname}\\pdf_input\\`.concat(fileName);
      
        let pdfBuffer = fs.readFileSync(_pathFile);

        pdfBuffer = plainAddPlaceholder({
          pdfBuffer,
          reason: 'Criacao de placeholder',
          signatureLength: 1612,
        });

        var signer = new SignPdf();
        pdfBuffer = signer.sign(pdfBuffer, p12Buffer, {passphrase: password});

        fs.writeFileSync(`${__dirname}\\pdf_output\\`+fileName, pdfBuffer)
        //const {signature, signedData} = extractSignature(pdfBuffer);
        console.log("PDF assinado com sucesso! Diretorio: ./pdf_output");
      }
    });
  });
}