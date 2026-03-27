import { setProgress, hideProgress, showError, formatSize } from '../core/Utils.js';
import { EditorState, EditorEvents, getFileBytes } from '../core/EditorState.js';
import { getPdfJs } from '../core/PdfJs.js';

async function doConvert() {
  if (EditorState.activeTool !== 'pdf2jpg' || EditorState.files.length === 0) return;
  const pdf2jpgFile = EditorState.files[0];
  
  setProgress('globalProgress', 5);
  document.getElementById('pdf2jpgBtn').textContent = 'Converting...';

  try {
    const bytes = await getFileBytes(pdf2jpgFile);
    const pdfjsLib = await getPdfJs();
    const loadingTask = pdfjsLib.getDocument({ data: bytes });
    const pdfDoc = await loadingTask.promise;
    const totalPages = pdfDoc.numPages;
    const scale = parseFloat(document.getElementById('pdf2jpgQuality').value);
    const downloads = document.getElementById('pdf2jpgDownloads');
    downloads.innerHTML = '';

    try {
      for (let i = 1; i <= totalPages; i++) {
        const page = await pdfDoc.getPage(i);
        const vp = page.getViewport({ scale });
        const canvas = document.createElement('canvas');
        canvas.width = vp.width;
        canvas.height = vp.height;
        await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
        page.cleanup();

        const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
        const btn = document.createElement('button');
        btn.className = 'btn-secondary w-full';
        btn.textContent = `Download Page ${i}.jpg`;
        btn.onclick = () => {
          const a = document.createElement('a');
          a.href = dataUrl;
          a.download = `page_${i}.jpg`;
          a.click();
        };
        downloads.appendChild(btn);
        setProgress('globalProgress', 5 + (90 * i / totalPages));
      }
    } finally {
      if (typeof loadingTask.destroy === 'function') {
        await loadingTask.destroy().catch(() => {});
      }
    }

    const res = document.getElementById('globalResultInfo');
    res.textContent = `${totalPages} page(s) converted to JPG`;
    res.style.display = 'block';
    
    setProgress('globalProgress', 100);
    setTimeout(() => hideProgress('globalProgress'), 500);
    
    document.getElementById('pdf2jpgBtn').textContent = 'Convert to JPG';
  } catch (err) {
    showError('Error converting: ' + err.message);
    hideProgress('globalProgress');
    document.getElementById('pdf2jpgBtn').textContent = 'Convert to JPG';
  }
}

function updateUI() {
  const btn = document.getElementById('pdf2jpgBtn');
  if (btn) btn.disabled = EditorState.files.length === 0;
  
  if (EditorState.activeTool === 'pdf2jpg' && EditorState.files.length > 0) {
      document.getElementById('editorCenterCanvas').innerHTML = `
        <div style="display:flex; height:100%; align-items:center; justify-content:center; flex-direction:column; color:var(--text-muted);">
           <div style="font-size:48px; margin-bottom:16px;">🖼️</div>
           <h3>Ready to Convert</h3>
           <p>${EditorState.files[0].name} (${formatSize(EditorState.files[0].size)})</p>
        </div>
      `;
  }
}

export function init() {
  document.getElementById('pdf2jpgBtn').addEventListener('click', doConvert);

  EditorEvents.on('filesChanged', () => {
    if (EditorState.activeTool === 'pdf2jpg') updateUI();
  });
  
  EditorEvents.on('toolChanged', (tool) => {
    if (tool === 'pdf2jpg') {
       updateUI();
       document.getElementById('pdf2jpgDownloads').innerHTML = '';
    }
  });
}
