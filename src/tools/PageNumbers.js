import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { formatSize, setProgress, hideProgress, showError } from '../core/Utils.js';
import { EditorEvents, EditorState, commitPdfResult } from '../core/EditorState.js';

function updateUI() {
  if (EditorState.activeTool !== 'pagenums') return;
  const button = document.getElementById('pagenumsBtn');
  const canvas = document.getElementById('editorCenterCanvas');
  const doc = EditorState.workingDocument;
  button.disabled = !doc;
  canvas.innerHTML = `
    <div class="workspace-placeholder">
      <div class="workspace-placeholder-kicker">Numbering</div>
      <h3>${doc ? 'Apply page numbers to the active PDF' : 'Import a PDF to start numbering pages'}</h3>
      <p>${doc ? `${doc.name} - ${formatSize(doc.size)}` : 'The numbered result stays in the workspace so you can continue editing without re-uploading.'}</p>
    </div>
  `;
  canvas.style.display = 'block';
}

async function doPageNums() {
  const doc = EditorState.workingDocument;
  if (EditorState.activeTool !== 'pagenums' || !doc) return;

  const button = document.getElementById('pagenumsBtn');
  button.textContent = 'Applying...';
  setProgress('globalProgress', 20);

  try {
    const pdfDoc = await PDFDocument.load(doc.bytes, { ignoreEncryption: true });
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const pages = pdfDoc.getPages();
    const position = document.getElementById('pagenumsPosition').value;
    const startNum = Math.max(1, Math.min(99999, parseInt(document.getElementById('pagenumsStart').value, 10) || 1));
    const format = document.getElementById('pagenumsFormat').value;

    pages.forEach((page, index) => {
      const { width, height } = page.getSize();
      const num = index + startNum;
      let text = String(num);
      if (format === 'dash') text = `- ${num} -`;
      if (format === 'page') text = `Page ${num}`;
      if (format === 'of') text = `${num} of ${pages.length}`;

      const textWidth = font.widthOfTextAtSize(text, 10);
      let x = 40;
      const y = position.startsWith('bottom') ? 30 : height - 30;
      if (position.endsWith('center')) x = (width - textWidth) / 2;
      else if (position.endsWith('right')) x = width - textWidth - 40;

      page.drawText(text, { x, y, size: 10, font, color: rgb(0.3, 0.3, 0.3) });
    });

    const bytes = await pdfDoc.save();
    await commitPdfResult(bytes, {
      filename: `numbered_${doc.name}`,
      label: `${pages.length} pages numbered`,
      pageCount: pages.length,
      source: 'pagenums',
    });
  } catch (error) {
    showError(`Error numbering pages: ${error.message}`);
  } finally {
    hideProgress('globalProgress');
    button.textContent = 'Apply Numbers';
  }
}

export function init() {
  document.getElementById('pagenumsBtn').addEventListener('click', doPageNums);
  EditorEvents.on('toolChanged', (tool) => {
    if (tool === 'pagenums') updateUI();
  });
  EditorEvents.on('workingDocumentChanged', updateUI);
}
