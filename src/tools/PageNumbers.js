import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { formatSize, downloadBlob, setProgress, hideProgress, showError } from '../core/Utils.js';
import { EditorState, EditorEvents } from '../core/EditorState.js';
import { getPdfBytes } from '../core/PdfCache.js';

async function doPageNums() {
  if (EditorState.activeTool !== 'pagenums' || EditorState.files.length === 0) return;
  const pagenumsFile = EditorState.files[0];
  
  setProgress('globalProgress', 20);
  document.getElementById('pagenumsBtn').textContent = 'Processing...';

  try {
    const bytes = await getPdfBytes(pagenumsFile);
    const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const pages = pdfDoc.getPages();
    const pos = document.getElementById('pagenumsPosition').value;
    const startNum = Math.max(1, Math.min(99999, parseInt(document.getElementById('pagenumsStart').value) || 1));
    const format = document.getElementById('pagenumsFormat').value;

    pages.forEach((page, i) => {
      const { width, height } = page.getSize();
      const num = i + startNum;
      let text = String(num);
      if (format === 'dash') text = `- ${num} -`;
      if (format === 'page') text = `Page ${num}`;
      if (format === 'of') text = `${num} of ${pages.length}`;

      const textWidth = font.widthOfTextAtSize(text, 10);
      let x, y;
      if (pos.startsWith('bottom')) y = 30; else y = height - 30;
      if (pos.endsWith('center')) x = (width - textWidth) / 2;
      else if (pos.endsWith('right')) x = width - textWidth - 40;
      else x = 40;

      page.drawText(text, { x, y, size: 10, font, color: rgb(0.3, 0.3, 0.3) });
    });

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    setProgress('globalProgress', 100);
    setTimeout(() => hideProgress('globalProgress'), 500);
    
    const res = document.getElementById('globalResultInfo');
    res.textContent = `${pages.length} pages numbered — ${formatSize(pdfBytes.length)}`;
    res.style.display = 'block';
    
    const downloadBtn = document.getElementById('pagenumsDownload');
    downloadBtn.style.display = 'block';
    downloadBtn.onclick = () => downloadBlob(blob, 'numbered_' + pagenumsFile.name);
    
    document.getElementById('pagenumsBtn').textContent = 'Apply Numbers';
  } catch (err) {
    showError('Error: ' + err.message);
    hideProgress('globalProgress');
    document.getElementById('pagenumsBtn').textContent = 'Apply Numbers';
  }
}

function updateUI() {
  const btn = document.getElementById('pagenumsBtn');
  if (btn) btn.disabled = EditorState.files.length === 0;
  
  // Display a prompt in the canvas center if active
  if (EditorState.activeTool === 'pagenums' && EditorState.files.length > 0) {
      document.getElementById('editorCenterCanvas').innerHTML = `
        <div style="display:flex; height:100%; align-items:center; justify-content:center; flex-direction:column; color:var(--text-muted);">
           <div style="font-size:48px; margin-bottom:16px;">🔢</div>
           <h3>Ready to Add Page Numbers</h3>
           <p>${EditorState.files[0].name} (${formatSize(EditorState.files[0].size)})</p>
        </div>
      `;
  }
}

export function init() {
  document.getElementById('pagenumsBtn').addEventListener('click', doPageNums);
  
  EditorEvents.on('filesChanged', () => {
    if (EditorState.activeTool === 'pagenums') updateUI();
  });
  
  EditorEvents.on('toolChanged', (tool) => {
    if (tool === 'pagenums') updateUI();
  });
}
