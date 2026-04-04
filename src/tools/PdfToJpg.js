import * as pdfjsLib from 'pdfjs-dist';
import { setProgress, hideProgress, showError, formatSize } from '../core/Utils.js';
import { EditorEvents, EditorState, setMultiResult } from '../core/EditorState.js';

function updateUI() {
  if (EditorState.activeTool !== 'pdf2jpg') return;
  const button = document.getElementById('pdf2jpgBtn');
  const canvas = document.getElementById('editorCenterCanvas');
  const doc = EditorState.workingDocument;
  button.disabled = !doc;
  canvas.innerHTML = `
    <div class="workspace-placeholder">
      <div class="workspace-placeholder-kicker">Export images</div>
      <h3>${doc ? 'Convert the active PDF into JPG pages' : 'Import a PDF to export JPG pages'}</h3>
      <p>${doc ? `${doc.name} - ${formatSize(doc.size)}` : 'The shared export area will list every generated JPG plus a Download All action.'}</p>
    </div>
  `;
  canvas.style.display = 'block';
}

async function doConvert() {
  const doc = EditorState.workingDocument;
  if (EditorState.activeTool !== 'pdf2jpg' || !doc) return;

  const button = document.getElementById('pdf2jpgBtn');
  button.textContent = 'Converting...';
  setProgress('globalProgress', 5);

  try {
    const pdfDoc = await pdfjsLib.getDocument({ data: doc.bytes.slice(0) }).promise;
    const scale = parseFloat(document.getElementById('pdf2jpgQuality').value);
    const downloads = [];

    for (let pageNumber = 1; pageNumber <= pdfDoc.numPages; pageNumber += 1) {
      const page = await pdfDoc.getPage(pageNumber);
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;

      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      const blob = await (await fetch(dataUrl)).blob();
      downloads.push({
        label: `Download Page ${pageNumber}`,
        filename: `page_${pageNumber}.jpg`,
        blob,
      });
      setProgress('globalProgress', 10 + (80 * pageNumber / pdfDoc.numPages));
    }

    setMultiResult({
      fileType: 'image',
      label: `${pdfDoc.numPages} page${pdfDoc.numPages === 1 ? '' : 's'} converted to JPG`,
      primaryLabel: 'Download All JPGs',
      downloads,
    });
  } catch (error) {
    showError(`Error converting PDF to JPG: ${error.message}`);
  } finally {
    hideProgress('globalProgress');
    button.textContent = 'Convert to JPG';
  }
}

export function init() {
  document.getElementById('pdf2jpgBtn').addEventListener('click', doConvert);
  EditorEvents.on('toolChanged', (tool) => {
    if (tool === 'pdf2jpg') updateUI();
  });
  EditorEvents.on('workingDocumentChanged', updateUI);
}
