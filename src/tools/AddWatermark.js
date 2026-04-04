import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib';
import { formatSize, setProgress, hideProgress, showError } from '../core/Utils.js';
import { EditorEvents, EditorState, commitPdfResult } from '../core/EditorState.js';

function updateUI() {
  if (EditorState.activeTool !== 'watermark') return;
  const button = document.getElementById('watermarkBtn');
  const canvas = document.getElementById('editorCenterCanvas');
  const doc = EditorState.workingDocument;
  button.disabled = !doc;
  canvas.innerHTML = `
    <div class="workspace-placeholder">
      <div class="workspace-placeholder-kicker">Watermark</div>
      <h3>${doc ? 'Stamp the active PDF with a watermark' : 'Import a PDF to add a watermark'}</h3>
      <p>${doc ? `${doc.name} - ${formatSize(doc.size)}` : 'The output will replace the current working document and stay available in the shared export area.'}</p>
    </div>
  `;
  canvas.style.display = 'block';
}

async function doWatermark() {
  const doc = EditorState.workingDocument;
  if (EditorState.activeTool !== 'watermark' || !doc) return;

  const button = document.getElementById('watermarkBtn');
  button.textContent = 'Applying...';
  setProgress('globalProgress', 20);

  try {
    const pdfDoc = await PDFDocument.load(doc.bytes, { ignoreEncryption: true });
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const pages = pdfDoc.getPages();
    const text = document.getElementById('watermarkText').value || 'WATERMARK';
    const opacity = parseFloat(document.getElementById('watermarkOpacity').value);

    pages.forEach((page) => {
      const { width, height } = page.getSize();
      const fontSize = Math.min(width, height) * 0.12;
      const textWidth = font.widthOfTextAtSize(text, fontSize);
      page.drawText(text, {
        x: (width - textWidth * 0.7) / 2,
        y: height / 2 - fontSize / 2,
        size: fontSize,
        font,
        color: rgb(0.5, 0.5, 0.5),
        opacity,
        rotate: degrees(45),
      });
    });

    const bytes = await pdfDoc.save();
    await commitPdfResult(bytes, {
      filename: `watermarked_${doc.name}`,
      label: `"${text}" applied to ${pages.length} pages`,
      pageCount: pages.length,
      source: 'watermark',
    });
  } catch (error) {
    showError(`Error applying watermark: ${error.message}`);
  } finally {
    hideProgress('globalProgress');
    button.textContent = 'Apply Watermark';
  }
}

export function init() {
  document.getElementById('watermarkBtn').addEventListener('click', doWatermark);
  EditorEvents.on('toolChanged', (tool) => {
    if (tool === 'watermark') updateUI();
  });
  EditorEvents.on('workingDocumentChanged', updateUI);
}
