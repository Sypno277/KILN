
    const fs = require('fs');
    const path = require('path');
    const { pathToFileURL } = require('url');
    const pdfjs = require('pdfjs-dist/legacy/build/pdf.js');
    pdfjs.GlobalWorkerOptions.workerSrc = path.resolve('public/assets/libs/pdf.worker.min.js');

    async function auditIR() {
      const mod = await import(pathToFileURL(path.resolve('public/assets/converter-engine.js')).href);
      const engine = new mod.ConverterEngine();
      engine.getPdfJs = () => pdfjs;

      const bytes = fs.readFileSync('scratch/week1_solutions.pdf');
      const file = {
        name: 'week1_solutions.pdf',
        size: bytes.length,
        slice: (s, e) => ({ arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset + s, bytes.byteOffset + e) }),
        arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
      };

      const pages = await engine.extractPdfPagesContent(file);
      const pageCounts = [];
      let totalRed = 0;
      let totalBlack = 0;

      pages.forEach((p, idx) => {
        let pRed = 0;
        let pBlack = 0;
        (p.lines || []).forEach(l => {
          (l.runs || []).forEach(r => {
            const c = (r.colorHex && r.colorHex.toUpperCase() !== 'UNSET') ? r.colorHex.toUpperCase().replace('#', '') : 'UNSET';
            const len = (r.text || '').length;
            if (c === 'FF0000') pRed += len;
            else if (c === '000000' || c === 'UNSET' || c === '1A1A1A') pBlack += len;
          });
        });
        pageCounts.push({ page: idx + 1, red: pRed, black: pBlack, total: pRed + pBlack });
        totalRed += pRed;
        totalBlack += pBlack;
      });

      fs.writeFileSync('scratch/batch6_ir_counts.json', JSON.stringify({ pageCounts, totalRed, totalBlack, total: totalRed + totalBlack }, null, 2));
    }
    auditIR().catch(err => { console.error(err); process.exit(1); });
    