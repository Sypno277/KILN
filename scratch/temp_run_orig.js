
    const fs = require('fs');
    const path = require('path');
    const { pathToFileURL } = require('url');

    async function run() {
      const JSZip = require(path.resolve('public/assets/libs/jszip.min.js'));
      const pdfLib = require(path.resolve('public/assets/libs/pdf-lib.min.js'));
      const pdfjs = require('pdfjs-dist/legacy/build/pdf.js');
      pdfjs.GlobalWorkerOptions.workerSrc = path.resolve('public/assets/libs/pdf.worker.min.js');

      const enginePath = path.resolve('public/assets/converter-engine.js');
      const mod = await import(pathToFileURL(enginePath).href);
      const engine = new mod.ConverterEngine();
      engine.getPdfJs = () => pdfjs;
      engine.getJSZip = () => JSZip;
      engine.getPdfLib = () => pdfLib;

      const pdfBytes = fs.readFileSync('D:/My Projects/Filee/scratch/original_letter_portrait.pdf');
      const fileObj = {
        name: 'original_letter_portrait.pdf',
        size: pdfBytes.length,
        arrayBuffer: async () => pdfBytes.buffer.slice(pdfBytes.byteOffset, pdfBytes.byteOffset + pdfBytes.byteLength)
      };

      const docxRes = await engine.pdfToWord(fileObj, { mode: 'fidelity', styleReport: true });
      fs.writeFileSync('D:/My Projects/Filee/scratch/original_example_output.docx', Buffer.from(await docxRes.blob.arrayBuffer()));

      const pptxRes = await engine.pdfToPpt(fileObj, { mode: 'fidelity', styleReport: true });
      fs.writeFileSync('D:/My Projects/Filee/scratch/original_example_output.pptx', Buffer.from(await pptxRes.blob.arrayBuffer()));
      console.log('Conversion completed.');
    }
    run();
    