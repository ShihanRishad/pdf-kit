import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib';
import { formatSize, downloadBlob, setProgress, hideProgress, showError } from '../core/Utils.js';
import { EditorState, EditorEvents } from '../core/EditorState.js';

async function doWatermark() {
  if (EditorState.activeTool !== 'watermark' || EditorState.files.length === 0) return;
  const watermarkFile = EditorState.files[0];
  
  setProgress('globalProgress', 20);
  document.getElementById('watermarkBtn').textContent = 'Processing...';

  try {
    const bytes = await watermarkFile.arrayBuffer();
    const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const pages = pdfDoc.getPages();
    const text = document.getElementById('watermarkText').value || 'WATERMARK';
    const opacity = parseFloat(document.getElementById('watermarkOpacity').value);

    pages.forEach(page => {
      const { width, height } = page.getSize();
      const fontSize = Math.min(width, height) * 0.12;
      const textWidth = font.widthOfTextAtSize(text, fontSize);
      page.drawText(text, {
        x: (width - textWidth * 0.7) / 2,
        y: height / 2 - fontSize / 2,
        size: fontSize, font,
        color: rgb(0.5, 0.5, 0.5),
        opacity,
        rotate: degrees(45),
      });
    });

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    setProgress('globalProgress', 100);
    setTimeout(() => hideProgress('globalProgress'), 500);
    
    const res = document.getElementById('globalResultInfo');
    res.textContent = `"${text}" added to ${pages.length} pages — ${formatSize(pdfBytes.length)}`;
    res.style.display = 'block';

    const downloadBtn = document.getElementById('watermarkDownload');
    downloadBtn.style.display = 'block';
    downloadBtn.onclick = () => downloadBlob(blob, 'watermarked_' + watermarkFile.name);
    
    document.getElementById('watermarkBtn').textContent = 'Apply Watermark';
  } catch (err) {
    showError('Error: ' + err.message);
    hideProgress('globalProgress');
    document.getElementById('watermarkBtn').textContent = 'Apply Watermark';
  }
}

function updateUI() {
  const btn = document.getElementById('watermarkBtn');
  if (btn) btn.disabled = EditorState.files.length === 0;
  
  if (EditorState.activeTool === 'watermark' && EditorState.files.length > 0) {
      document.getElementById('editorCenterCanvas').innerHTML = `
        <div style="display:flex; height:100%; align-items:center; justify-content:center; flex-direction:column; color:var(--text-muted);">
           <div style="font-size:48px; margin-bottom:16px;">💧</div>
           <h3>Ready to Add Watermark</h3>
           <p>${EditorState.files[0].name} (${formatSize(EditorState.files[0].size)})</p>
        </div>
      `;
  }
}

export function init() {
  document.getElementById('watermarkBtn').addEventListener('click', doWatermark);
  
  EditorEvents.on('filesChanged', () => {
    if (EditorState.activeTool === 'watermark') updateUI();
  });
  
  EditorEvents.on('toolChanged', (tool) => {
    if (tool === 'watermark') updateUI();
  });
}
