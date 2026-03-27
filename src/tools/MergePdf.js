import { PDFDocument } from 'pdf-lib';
import { formatSize, downloadBlob, setProgress, hideProgress, showError } from '../core/Utils.js';
import { EditorState, EditorEvents, clearFiles, getFileBytes } from '../core/EditorState.js';

function renderList() {
  if (EditorState.activeTool !== 'merge') return;
  const list = document.getElementById('globalFileList');
  list.innerHTML = '';
  
  if (EditorState.files.length === 0) {
     list.innerHTML = '<p style="color:var(--text-muted); font-size:13px;">No files added yet.</p>';
  }

  EditorState.files.forEach((f, i) => {
    const item = document.createElement('div');
    item.className = 'file-item';
    item.draggable = true;
    item.dataset.index = i;
    item.style.marginBottom = '8px';
    item.style.background = 'var(--bg-card)';
    item.style.padding = '12px';
    item.style.borderRadius = 'var(--radius-sm)';
    item.style.border = '1px solid var(--border)';
    item.style.display = 'flex';
    item.style.alignItems = 'center';
    item.style.gap = '8px';

    const icon = document.createElement('span');
    icon.className = 'file-icon';
    icon.textContent = '📄';
    const name = document.createElement('span');
    name.className = 'file-name';
    name.textContent = f.name;
    name.style.flex = '1';
    name.style.overflow = 'hidden';
    name.style.textOverflow = 'ellipsis';
    name.style.whiteSpace = 'nowrap';
    name.style.fontSize = '13px';
    
    const size = document.createElement('span');
    size.className = 'file-size';
    size.textContent = formatSize(f.size);
    size.style.fontSize = '11px';
    size.style.color = 'var(--text-dim)';
    
    const removeBtn = document.createElement('button');
    removeBtn.className = 'file-remove';
    removeBtn.dataset.remove = i;
    removeBtn.textContent = '×';
    removeBtn.style.background = 'none';
    removeBtn.style.border = 'none';
    removeBtn.style.color = 'var(--text-muted)';
    removeBtn.style.cursor = 'pointer';

    item.append(icon, name, size, removeBtn);
    item.addEventListener('dragstart', e => { e.dataTransfer.setData('text/plain', i); item.style.opacity = '0.5'; });
    item.addEventListener('dragend', () => item.style.opacity = '1');
    item.addEventListener('dragover', e => e.preventDefault());
    item.addEventListener('drop', e => {
      e.preventDefault(); e.stopPropagation();
      const from = parseInt(e.dataTransfer.getData('text/plain'));
      const [moved] = EditorState.files.splice(from, 1);
      EditorState.files.splice(i, 0, moved);
      renderList();
    });
    list.appendChild(item);
  });

  // Remove buttons
  list.querySelectorAll('[data-remove]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      EditorState.files.splice(parseInt(btn.dataset.remove), 1);
      EditorEvents.emit('filesChanged', EditorState.files); // trigger global update
    });
  });

  const mergeBtn = document.getElementById('mergeBtn');
  if (mergeBtn) {
    mergeBtn.disabled = EditorState.files.length < 2;
  }
}

async function doMerge() {
  if (EditorState.activeTool !== 'merge' || EditorState.files.length < 2) return;
  setProgress('globalProgress', 10);
  document.getElementById('mergeBtn').textContent = 'Merging...';
  
  try {
    const merged = await PDFDocument.create();
    for (let i = 0; i < EditorState.files.length; i++) {
      const bytes = await getFileBytes(EditorState.files[i]);
      const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
      const pages = await merged.copyPages(doc, doc.getPageIndices());
      pages.forEach(p => merged.addPage(p));
      setProgress('globalProgress', 10 + (80 * (i + 1) / EditorState.files.length));
    }
    const pdfBytes = await merged.save();
    setProgress('globalProgress', 100);
    setTimeout(() => hideProgress('globalProgress'), 500);

    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const res = document.getElementById('globalResultInfo');
    res.textContent = `${EditorState.files.length} files merged — ${formatSize(pdfBytes.length)}`;
    res.style.display = 'block';

    const downloadBtn = document.getElementById('mergeDownload');
    downloadBtn.style.display = 'block';
    downloadBtn.onclick = () => downloadBlob(blob, 'merged.pdf');
    document.getElementById('mergeBtn').textContent = 'Merge PDFs';
  } catch (err) {
    showError('Error merging: ' + err.message);
    hideProgress('globalProgress');
    document.getElementById('mergeBtn').textContent = 'Merge PDFs';
  }
}

export function init() {
  document.getElementById('mergeBtn').addEventListener('click', doMerge);
  document.getElementById('mergeClearBtn').addEventListener('click', () => {
    clearFiles();
    document.getElementById('mergeDownload').style.display = 'none';
    document.getElementById('globalResultInfo').style.display = 'none';
  });

  EditorEvents.on('filesChanged', () => {
    if (EditorState.activeTool === 'merge') renderList();
  });

  EditorEvents.on('toolChanged', (tool) => {
    if (tool === 'merge') renderList();
  });
}
