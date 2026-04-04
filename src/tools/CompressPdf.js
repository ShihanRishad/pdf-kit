import { PDFDocument } from 'pdf-lib';
import { formatSize, setProgress, hideProgress, showError } from '../core/Utils.js';
import { EditorEvents, EditorState, commitPdfResult } from '../core/EditorState.js';

function updateUI() {
  if (EditorState.activeTool !== 'compress') return;
  const button = document.getElementById('compressBtn');
  const canvas = document.getElementById('editorCenterCanvas');
  const doc = EditorState.workingDocument;
  button.disabled = !doc;
  canvas.innerHTML = `
    <div class="workspace-placeholder">
      <div class="workspace-placeholder-kicker">Working document</div>
      <h3>${doc ? 'Ready to compress the active PDF' : 'Import a PDF to compress it'}</h3>
      <p>${doc ? `${doc.name} - ${formatSize(doc.size)}` : 'Compression writes a smaller PDF back into the workspace and enables the shared download action.'}</p>
    </div>
  `;
  canvas.style.display = 'block';
}

async function doCompress() {
  const doc = EditorState.workingDocument;
  if (EditorState.activeTool !== 'compress' || !doc) return;

  const button = document.getElementById('compressBtn');
  button.textContent = 'Compressing...';
  setProgress('globalProgress', 20);

  try {
    const pdfDoc = await PDFDocument.load(doc.bytes, { ignoreEncryption: true });
    const compressedBytes = await pdfDoc.save({ useObjectStreams: true, addDefaultPage: false });
    const pctSaved = Math.max(0, ((1 - compressedBytes.length / doc.size) * 100)).toFixed(1);
    await commitPdfResult(compressedBytes, {
      filename: `compressed_${doc.name}`,
      label: `${formatSize(doc.size)} to ${formatSize(compressedBytes.length)} (${pctSaved}% smaller)`,
      pageCount: doc.pageCount,
      source: 'compress',
    });
  } catch (error) {
    showError(`Error compressing: ${error.message}`);
  } finally {
    hideProgress('globalProgress');
    button.textContent = 'Compress PDF';
  }
}

export function init() {
  document.getElementById('compressBtn').addEventListener('click', doCompress);
  EditorEvents.on('toolChanged', (tool) => {
    if (tool === 'compress') updateUI();
  });
  EditorEvents.on('workingDocumentChanged', updateUI);
}
