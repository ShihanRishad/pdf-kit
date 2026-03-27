import { PDFDocument } from 'pdf-lib';
import { downloadBlob, showError, setProgress, hideProgress, formatSize } from '../core/Utils.js';
import { EditorState, EditorEvents } from '../core/EditorState.js';

async function doEncrypt() {
  if (EditorState.activeTool !== 'encrypt' || EditorState.files.length === 0) return;
  const encryptFile = EditorState.files[0];
  
  const password = document.getElementById('encryptPassword').value;
  const confirm = document.getElementById('encryptPasswordConfirm').value;
  if (!password) { showError('Enter a password.'); return; }
  if (password !== confirm) { showError('Passwords do not match.'); return; }
  
  setProgress('globalProgress', 20);
  document.getElementById('encryptBtn').textContent = 'Encrypting...';

  try {
    const bytes = await encryptFile.arrayBuffer();
    const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
    setProgress('globalProgress', 60);

    const ownerPassword = password + '_owner_' + Date.now();
    const pdfBytes = await pdfDoc.save({ userPassword: password, ownerPassword });
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    
    setProgress('globalProgress', 100);
    setTimeout(() => hideProgress('globalProgress'), 500);

    const res = document.getElementById('globalResultInfo');
    res.textContent = `File securely encrypted — ${formatSize(pdfBytes.length)}`;
    res.style.display = 'block';

    const downloadBtn = document.getElementById('encryptDownload');
    downloadBtn.style.display = 'block';
    downloadBtn.onclick = () => downloadBlob(blob, 'encrypted_' + encryptFile.name);
    
    document.getElementById('encryptBtn').textContent = 'Encrypt PDF';
  } catch (err) {
    showError('Error encrypting: ' + err.message);
    hideProgress('globalProgress');
    document.getElementById('encryptBtn').textContent = 'Encrypt PDF';
  } finally {
    document.getElementById('encryptPassword').value = '';
    document.getElementById('encryptPasswordConfirm').value = '';
  }
}

function updateUI() {
  const btn = document.getElementById('encryptBtn');
  if (btn) btn.disabled = EditorState.files.length === 0;
  
  if (EditorState.activeTool === 'encrypt' && EditorState.files.length > 0) {
      document.getElementById('editorCenterCanvas').innerHTML = `
        <div style="display:flex; height:100%; align-items:center; justify-content:center; flex-direction:column; color:var(--text-muted);">
           <div style="font-size:48px; margin-bottom:16px;">🔒</div>
           <h3>Ready to Encrypt</h3>
           <p>${EditorState.files[0].name} (${formatSize(EditorState.files[0].size)})</p>
        </div>
      `;
  }
}

export function init() {
  document.getElementById('encryptBtn').addEventListener('click', doEncrypt);
  
  EditorEvents.on('filesChanged', () => {
    if (EditorState.activeTool === 'encrypt') updateUI();
  });
  
  EditorEvents.on('toolChanged', (tool) => {
    if (tool === 'encrypt') updateUI();
  });
}
