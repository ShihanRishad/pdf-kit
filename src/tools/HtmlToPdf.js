import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { formatSize, downloadBlob } from '../core/Utils.js';

async function doConvert() {
  const html = document.getElementById('htmlInput').value.trim();
  if (!html) { alert('Paste some HTML first.'); return; }

  try {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([612, 792]);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    const textContent = tempDiv.textContent || tempDiv.innerText || '';

    const lines = [];
    const words = textContent.split(/\s+/);
    let currentLine = '';
    const maxWidth = 520;
    const fontSize = 11;

    for (const word of words) {
      const testLine = currentLine ? currentLine + ' ' + word : word;
      const width = font.widthOfTextAtSize(testLine, fontSize);
      if (width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);

    let y = 740;
    let pageRef = page;
    for (const line of lines) {
      if (y < 50) {
        pageRef = pdfDoc.addPage([612, 792]);
        y = 740;
      }
      pageRef.drawText(line, { x: 46, y, size: fontSize, font, color: rgb(0, 0, 0) });
      y -= fontSize * 1.5;
    }

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    document.getElementById('html2pdfResultInfo').textContent = `PDF created — ${formatSize(pdfBytes.length)}`;
    document.getElementById('html2pdfDownload').onclick = () => downloadBlob(blob, 'document.pdf');
    document.getElementById('html2pdfResult').classList.add('active');
  } catch (err) {
    alert('Error: ' + err.message);
  }
}

export function init() {
  document.getElementById('html2pdfBtn').addEventListener('click', doConvert);
}
