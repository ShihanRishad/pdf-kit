import * as pdfjsLib from 'pdfjs-dist';
import { setProgress, hideProgress, showError, formatSize } from '../core/Utils.js';
import { EditorState, EditorEvents } from '../core/EditorState.js';
import { getPdfJsDocument } from '../core/PdfCache.js';

async function doConvert() {
  if (EditorState.activeTool !== 'pdf2jpg' || EditorState.files.length === 0) return;
  const pdf2jpgFile = EditorState.files[0];
  
  setProgress('globalProgress', 5);
  document.getElementById('pdf2jpgBtn').textContent = 'Converting...';

  try {
    const pdfDoc = await getPdfJsDocument(pdf2jpgFile, pdfjsLib);
    const scale = parseFloat(document.getElementById('pdf2jpgQuality').value);
    const downloads = document.getElementById('pdf2jpgDownloads');
    downloads.innerHTML = '';

    for (let i = 1; i <= pdfDoc.numPages; i++) {
      const page = await pdfDoc.getPage(i);
      const vp = page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      canvas.width = vp.width;
      canvas.height = vp.height;
      await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;

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
      setProgress('globalProgress', 5 + (90 * i / pdfDoc.numPages));
    }

    const res = document.getElementById('globalResultInfo');
    res.textContent = `${pdfDoc.numPages} page(s) converted to JPG`;
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
