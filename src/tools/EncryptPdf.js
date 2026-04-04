import { PDFDocument } from 'pdf-lib';
import { formatSize, setProgress, hideProgress, showError } from '../core/Utils.js';
import { EditorEvents, EditorState, commitPdfResult } from '../core/EditorState.js';

function updateUI() {
  if (EditorState.activeTool !== 'encrypt') return;
  const button = document.getElementById('encryptBtn');
  const canvas = document.getElementById('editorCenterCanvas');
  const doc = EditorState.workingDocument;
  button.disabled = !doc;
  canvas.innerHTML = `
    <div class="workspace-placeholder">
      <div class="workspace-placeholder-kicker">Encryption</div>
      <h3>${doc ? 'Protect the current working PDF' : 'Import a PDF to encrypt it'}</h3>
      <p>${doc ? `${doc.name} - ${formatSize(doc.size)}` : 'Password-protected output becomes the new working document and can be downloaded from the shared action area.'}</p>
    </div>
  `;
  canvas.style.display = 'block';
}

async function doEncrypt() {
  const doc = EditorState.workingDocument;
  if (EditorState.activeTool !== 'encrypt' || !doc) return;

  const password = document.getElementById('encryptPassword').value;
  const confirm = document.getElementById('encryptPasswordConfirm').value;
  if (!password) {
    showError('Enter a password.');
    return;
  }
  if (password !== confirm) {
    showError('Passwords do not match.');
    return;
  }

  const button = document.getElementById('encryptBtn');
  button.textContent = 'Encrypting...';
  setProgress('globalProgress', 20);

  try {
    const pdfDoc = await PDFDocument.load(doc.bytes, { ignoreEncryption: true });
    const ownerPassword = `${password}_owner_${Date.now()}`;
    const bytes = await pdfDoc.save({ userPassword: password, ownerPassword });
    await commitPdfResult(bytes, {
      filename: `encrypted_${doc.name}`,
      label: 'PDF encrypted and ready to download',
      pageCount: doc.pageCount,
      source: 'encrypt',
    });
  } catch (error) {
    showError(`Error encrypting: ${error.message}`);
  } finally {
    hideProgress('globalProgress');
    button.textContent = 'Encrypt PDF';
    document.getElementById('encryptPassword').value = '';
    document.getElementById('encryptPasswordConfirm').value = '';
  }
}

export function init() {
  document.getElementById('encryptBtn').addEventListener('click', doEncrypt);
  EditorEvents.on('toolChanged', (tool) => {
    if (tool === 'encrypt') updateUI();
  });
  EditorEvents.on('workingDocumentChanged', updateUI);
}
