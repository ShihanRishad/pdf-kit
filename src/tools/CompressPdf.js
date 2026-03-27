import { PDFDocument } from 'pdf-lib';
import { formatSize, downloadBlob, setProgress, hideProgress, showError } from '../core/Utils.js';
import { EditorState, EditorEvents } from '../core/EditorState.js';

async function doCompress() {
  if (EditorState.activeTool !== 'compress' || EditorState.files.length === 0) return;
  const compressFile = EditorState.files[0];
  
  setProgress('globalProgress', 20);
  document.getElementById('compressBtn').textContent = 'Compressing...';
  
  try {
    const bytes = await compressFile.arrayBuffer();
    const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
    setProgress('globalProgress', 60);
    const compressedBytes = await pdfDoc.save({ useObjectStreams: true, addDefaultPage: false });
    setProgress('globalProgress', 100);
    setTimeout(() => hideProgress('globalProgress'), 500);

    const blob = new Blob([compressedBytes], { type: 'application/pdf' });
    const pctSaved = Math.max(0, ((1 - compressedBytes.length / compressFile.size) * 100)).toFixed(1);
    
    document.getElementById('compressBtn').textContent = 'Compress PDF';
    document.getElementById('compressDownload').style.display = 'block';
    document.getElementById('compressDownload').onclick = () => downloadBlob(blob, 'compressed_' + compressFile.name);
    
    const res = document.getElementById('globalResultInfo');
    res.textContent = `${formatSize(compressFile.size)} → ${formatSize(compressedBytes.length)} (${pctSaved}% reduced)`;
    res.style.display = 'block';
  } catch (err) {
    showError('Error compressing: ' + err.message);
    hideProgress('globalProgress');
    document.getElementById('compressBtn').textContent = 'Compress PDF';
  }
}

function updateUI() {
  const btn = document.getElementById('compressBtn');
  if (btn) btn.disabled = EditorState.files.length === 0;
  
  // Display a prompt in the canvas center if active
  if (EditorState.activeTool === 'compress' && EditorState.files.length > 0) {
      document.getElementById('editorCenterCanvas').innerHTML = `
        <div style="display:flex; height:100%; align-items:center; justify-content:center; flex-direction:column; color:var(--text-muted);">
           <div style="font-size:48px; margin-bottom:16px;">📦</div>
           <h3>Ready to Compress</h3>
           <p>${EditorState.files[0].name} (${formatSize(EditorState.files[0].size)})</p>
        </div>
      `;
  }
}

export function init() {
  document.getElementById('compressBtn').addEventListener('click', doCompress);
  
  EditorEvents.on('filesChanged', () => {
    if (EditorState.activeTool === 'compress') updateUI();
  });
  
  EditorEvents.on('toolChanged', (tool) => {
    if (tool === 'compress') updateUI();
  });
}
