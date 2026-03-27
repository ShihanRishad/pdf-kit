import { setProgress, hideProgress, showError, showSuccess, formatSize } from '../core/Utils.js';
import { EditorState, EditorEvents, getFileBytes } from '../core/EditorState.js';
import { getPdfJs } from '../core/PdfJs.js';

async function doExtract() {
  if (EditorState.activeTool !== 'extract' || EditorState.files.length === 0) return;
  const file = EditorState.files[0];

  setProgress('globalProgress', 10);
  document.getElementById('extractBtn').textContent = 'Extracting...';

  try {
    const bytes = await getFileBytes(file);
    const pdfjsLib = await getPdfJs();
    const loadingTask = pdfjsLib.getDocument({ data: bytes });
    const pdfDoc = await loadingTask.promise;
    const totalPages = pdfDoc.numPages;
    let allText = '';

    try {
      for (let i = 1; i <= totalPages; i++) {
        const page = await pdfDoc.getPage(i);
        const content = await page.getTextContent();
        const pageText = content.items.map(item => item.str).join(' ');
        allText += `--- Page ${i} ---\n${pageText}\n\n`;
        page.cleanup();
        setProgress('globalProgress', 10 + (80 * i / totalPages));
      }
    } finally {
      if (typeof loadingTask.destroy === 'function') {
        await loadingTask.destroy().catch(() => {});
      }
    }

    setProgress('globalProgress', 100);
    setTimeout(() => hideProgress('globalProgress'), 500);
    
    document.getElementById('extractedText').value = allText;
    document.getElementById('extractCopyBtn').disabled = false;
    
    const res = document.getElementById('globalResultInfo');
    res.textContent = `Extracted text from ${totalPages} pages`;
    res.style.display = 'block';

    document.getElementById('extractBtn').textContent = 'Extract Now';
  } catch (err) {
    showError('Error extracting: ' + err.message);
    hideProgress('globalProgress');
    document.getElementById('extractBtn').textContent = 'Extract Now';
  }
}

function updateUI() {
  const btn = document.getElementById('extractBtn');
  if (btn) btn.disabled = EditorState.files.length === 0;
  
  if (EditorState.activeTool === 'extract' && EditorState.files.length > 0) {
      document.getElementById('editorCenterCanvas').innerHTML = `
        <div style="display:flex; height:100%; align-items:center; justify-content:center; flex-direction:column; color:var(--text-muted);">
           <div style="font-size:48px; margin-bottom:16px;">📝</div>
           <h3>Ready to Extract Text</h3>
           <p>${EditorState.files[0].name} (${formatSize(EditorState.files[0].size)})</p>
        </div>
      `;
  }
}

export function init() {
  document.getElementById('extractBtn').addEventListener('click', doExtract);
  
  document.getElementById('extractCopyBtn').addEventListener('click', async () => {
    const textarea = document.getElementById('extractedText');
    try {
      await navigator.clipboard.writeText(textarea.value);
      showSuccess('Text copied to clipboard');
    } catch {
      textarea.select();
      document.execCommand('copy');
      showSuccess('Text copied to clipboard');
    }
  });

  EditorEvents.on('filesChanged', () => {
    if (EditorState.activeTool === 'extract') updateUI();
  });
  
  EditorEvents.on('toolChanged', (tool) => {
    if (tool === 'extract') {
       updateUI();
       document.getElementById('extractedText').value = '';
       document.getElementById('extractCopyBtn').disabled = true;
    }
  });
}
