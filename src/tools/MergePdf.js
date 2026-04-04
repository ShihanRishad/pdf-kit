import { PDFDocument } from 'pdf-lib';
import { formatSize, setProgress, hideProgress, showError } from '../core/Utils.js';
import { EditorEvents, EditorState, commitPdfResult } from '../core/EditorState.js';
import { getPdfBytes } from '../core/PdfCache.js';

function renderSummary() {
  if (EditorState.activeTool !== 'merge') return;
  const canvas = document.getElementById('editorCenterCanvas');
  const count = EditorState.files.length;
  canvas.innerHTML = `
    <div class="workspace-placeholder">
      <div class="workspace-placeholder-kicker">Unified editing</div>
      <h3>${count ? `${count} PDFs ready to merge` : 'Import PDFs to build a merged working document'}</h3>
      <p>${count ? `Drag files in the left rail to reorder them, then merge into one shared document.` : 'Every successful merge becomes the active document for the rest of the workspace tools.'}</p>
      ${count ? `<div class="workspace-meta-row">${EditorState.files.map((file) => `${file.name} - ${formatSize(file.size)}`).join('<br>')}</div>` : ''}
    </div>
  `;
  canvas.style.display = 'block';
  document.getElementById('mergeBtn').disabled = count < 2;
}

async function doMerge() {
  if (EditorState.activeTool !== 'merge' || EditorState.files.length < 2) return;
  const button = document.getElementById('mergeBtn');
  button.textContent = 'Merging...';
  setProgress('globalProgress', 10);

  try {
    const mergedDoc = await PDFDocument.create();

    for (let index = 0; index < EditorState.files.length; index += 1) {
      const sourceFile = EditorState.files[index];
      const sourceBytes = await getPdfBytes(sourceFile);
      const pdfDoc = await PDFDocument.load(sourceBytes, { ignoreEncryption: true });
      const pages = await mergedDoc.copyPages(pdfDoc, pdfDoc.getPageIndices());
      pages.forEach((page) => mergedDoc.addPage(page));
      setProgress('globalProgress', 10 + (80 * (index + 1) / EditorState.files.length));
    }

    const bytes = await mergedDoc.save();
    await commitPdfResult(bytes, {
      filename: 'merged.pdf',
      label: `${EditorState.files.length} PDFs merged into one working document`,
      pageCount: mergedDoc.getPageCount(),
      source: 'merge',
    });
  } catch (error) {
    showError(`Error merging PDFs: ${error.message}`);
  } finally {
    hideProgress('globalProgress');
    button.textContent = 'Merge PDFs';
  }
}

export function init() {
  document.getElementById('mergeBtn').addEventListener('click', doMerge);

  EditorEvents.on('toolChanged', (tool) => {
    if (tool === 'merge') renderSummary();
  });
  EditorEvents.on('filesChanged', renderSummary);
}
