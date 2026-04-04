import * as pdfjsLib from 'pdfjs-dist';
import { setProgress, hideProgress, showError, showSuccess, formatSize } from '../core/Utils.js';
import { EditorEvents, EditorState, setResult } from '../core/EditorState.js';

function renderComposer(content = '') {
  if (EditorState.activeTool !== 'extract') return;
  const doc = EditorState.workingDocument;
  const canvas = document.getElementById('editorCenterCanvas');
  document.getElementById('extractBtn').disabled = !doc;
  canvas.innerHTML = `
    <div class="composer-surface">
      <div class="composer-header">
        <div class="workspace-placeholder-kicker">Extract text</div>
        <h3>${doc ? 'Read the active PDF and keep the text in the same workspace' : 'Import a PDF to extract its text'}</h3>
        <p>${doc ? `${doc.name} - ${formatSize(doc.size)}` : 'The composer view will fill with extracted text, and the copy action will stay in the right rail.'}</p>
      </div>
      <textarea id="extractedText" class="composer-textarea" readonly placeholder="Extracted text will appear here...">${content}</textarea>
    </div>
  `;
  canvas.style.display = 'block';
}

async function doExtract() {
  const doc = EditorState.workingDocument;
  if (EditorState.activeTool !== 'extract' || !doc) return;

  const button = document.getElementById('extractBtn');
  button.textContent = 'Extracting...';
  setProgress('globalProgress', 10);

  try {
    const pdfDoc = await pdfjsLib.getDocument({ data: doc.bytes.slice(0) }).promise;
    let allText = '';

    for (let index = 1; index <= pdfDoc.numPages; index += 1) {
      const page = await pdfDoc.getPage(index);
      const content = await page.getTextContent();
      const pageText = content.items.map((item) => item.str).join(' ');
      allText += `--- Page ${index} ---\n${pageText}\n\n`;
      setProgress('globalProgress', 10 + (80 * index / pdfDoc.numPages));
    }

    renderComposer(allText);
    document.getElementById('extractCopyBtn').disabled = false;
    setResult({
      kind: 'text',
      label: `Extracted text from ${pdfDoc.numPages} pages`,
      text: allText,
    });
  } catch (error) {
    showError(`Error extracting text: ${error.message}`);
  } finally {
    hideProgress('globalProgress');
    button.textContent = 'Extract Text';
  }
}

export function init() {
  document.getElementById('extractBtn').addEventListener('click', doExtract);
  document.getElementById('extractCopyBtn').addEventListener('click', async () => {
    const text = document.getElementById('extractedText')?.value || '';
    try {
      await navigator.clipboard.writeText(text);
      showSuccess('Text copied to clipboard');
    } catch {
      const textarea = document.getElementById('extractedText');
      textarea.select();
      document.execCommand('copy');
      showSuccess('Text copied to clipboard');
    }
  });

  EditorEvents.on('toolChanged', (tool) => {
    if (tool === 'extract') {
      document.getElementById('extractCopyBtn').disabled = true;
      renderComposer();
    }
  });
  EditorEvents.on('workingDocumentChanged', () => {
    if (EditorState.activeTool === 'extract') {
      document.getElementById('extractCopyBtn').disabled = true;
      renderComposer();
    }
  });
}
