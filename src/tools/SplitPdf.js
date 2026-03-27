import { PDFDocument } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import { formatSize, downloadBlob, setProgress, hideProgress, showError } from '../core/Utils.js';
import { EditorState, EditorEvents } from '../core/EditorState.js';

let splitPdfBytes = null;
let selectedPages = new Set();
let currentFile = null;

function togglePage(div, pageNum) {
  if (selectedPages.has(pageNum)) {
    selectedPages.delete(pageNum);
    div.classList.remove('selected');
  } else {
    selectedPages.add(pageNum);
    div.classList.add('selected');
  }
}

async function renderThumbnails() {
  if (EditorState.activeTool !== 'split' || EditorState.files.length === 0) return;
  const file = EditorState.files[0];
  if (currentFile === file && document.getElementById('editorCenterCanvas').children.length > 0) return; // already rendered
  currentFile = file;

  const container = document.getElementById('editorCenterCanvas');
  container.innerHTML = '<div style="padding: 20px;"><div id="splitPreviews" class="page-previews"></div></div>';
  const previewsContainer = document.getElementById('splitPreviews');

  splitPdfBytes = await file.arrayBuffer();
  const pdfDoc = await pdfjsLib.getDocument({ data: splitPdfBytes.slice(0) }).promise;
  selectedPages.clear();

  for (let i = 1; i <= pdfDoc.numPages; i++) {
    const page = await pdfDoc.getPage(i);
    const vp = page.getViewport({ scale: 0.4 });
    const canvas = document.createElement('canvas');
    canvas.width = vp.width;
    canvas.height = vp.height;
    await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;

    const div = document.createElement('div');
    div.className = 'page-preview';
    div.dataset.page = i;
    div.innerHTML = `<div class="page-check">✓</div><span class="page-num">${i}</span>`;
    div.insertBefore(canvas, div.firstChild);
    div.addEventListener('click', () => togglePage(div, i));
    previewsContainer.appendChild(div);
  }

  document.getElementById('splitBtn').disabled = false;
}

async function doSplit() {
  if (EditorState.activeTool !== 'split' || !splitPdfBytes) return;
  const mode = document.getElementById('splitMode').value;
  setProgress('globalProgress', 10);
  document.getElementById('splitBtn').textContent = 'Processing...';

  try {
    const srcDoc = await PDFDocument.load(splitPdfBytes, { ignoreEncryption: true });
    const downloads = document.getElementById('splitDownloads');
    downloads.innerHTML = '';
    const res = document.getElementById('globalResultInfo');

    if (mode === 'all') {
      const total = srcDoc.getPageCount();
      for (let i = 0; i < total; i++) {
        const newDoc = await PDFDocument.create();
        const [page] = await newDoc.copyPages(srcDoc, [i]);
        newDoc.addPage(page);
        const bytes = await newDoc.save();
        const blob = new Blob([bytes], { type: 'application/pdf' });
        
        const btn = document.createElement('button');
        btn.className = 'btn-secondary w-full';
        btn.textContent = `Download Page ${i + 1}`;
        btn.onclick = () => downloadBlob(blob, `page_${i + 1}.pdf`);
        downloads.appendChild(btn);
        
        setProgress('globalProgress', 10 + (80 * (i + 1) / total));
      }
      res.textContent = `Split into ${total} individual pages`;
    } else {
      if (selectedPages.size === 0) { 
         showError('Select at least one page.'); 
         hideProgress('globalProgress'); 
         document.getElementById('splitBtn').textContent = 'Split / Extract';
         return; 
      }
      const newDoc = await PDFDocument.create();
      const sorted = Array.from(selectedPages).sort((a, b) => a - b);
      const pages = await newDoc.copyPages(srcDoc, sorted.map(p => p - 1));
      pages.forEach(p => newDoc.addPage(p));
      const bytes = await newDoc.save();
      const blob = new Blob([bytes], { type: 'application/pdf' });
      
      const btn = document.createElement('button');
      btn.className = 'btn-primary w-full';
      btn.textContent = 'Download extracted pages';
      btn.onclick = () => downloadBlob(blob, 'extracted.pdf');
      downloads.appendChild(btn);
      
      res.textContent = `Extracted ${sorted.length} page(s) — ${formatSize(bytes.length)}`;
    }

    res.style.display = 'block';
    setProgress('globalProgress', 100);
    setTimeout(() => hideProgress('globalProgress'), 500);
    document.getElementById('splitBtn').textContent = 'Split / Extract';
  } catch (err) {
    showError('Error splitting: ' + err.message);
    hideProgress('globalProgress');
    document.getElementById('splitBtn').textContent = 'Split / Extract';
  }
}

export function init() {
  document.getElementById('splitBtn').addEventListener('click', doSplit);
  document.getElementById('splitSelectAll').addEventListener('click', () => {
    document.querySelectorAll('#splitPreviews .page-preview').forEach(d => {
      selectedPages.add(parseInt(d.dataset.page));
      d.classList.add('selected');
    });
  });
  document.getElementById('splitDeselectAll').addEventListener('click', () => {
    selectedPages.clear();
    document.querySelectorAll('#splitPreviews .page-preview').forEach(d => d.classList.remove('selected'));
  });

  EditorEvents.on('filesChanged', () => {
    if (EditorState.activeTool === 'split') {
       if (EditorState.files.length === 0) {
          document.getElementById('splitBtn').disabled = true;
          document.getElementById('editorCenterCanvas').innerHTML = '';
          currentFile = null;
       } else {
          renderThumbnails();
       }
    }
  });

  EditorEvents.on('toolChanged', (tool) => {
    if (tool === 'split') renderThumbnails();
  });
}
