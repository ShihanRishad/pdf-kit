import { PDFDocument } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import { formatSize, downloadBlob, setProgress, hideProgress, showError } from '../core/Utils.js';
import { EditorState, EditorEvents } from '../core/EditorState.js';
import { getPdfBytes, getPdfJsDocument } from '../core/PdfCache.js';

let splitPdfBytes = null;
let selectedPages = new Set();
let currentFile = null;
let previewObserver = null;
let renderRunId = 0;
let queuedPages = new Set();
let renderedPages = new Set();
let activeRenders = 0;
let pendingPreviewQueue = [];

const THUMBNAIL_SCALE = 0.35;
const MAX_CONCURRENT_RENDERS = 2;

function disconnectPreviewObserver() {
  if (previewObserver) {
    previewObserver.disconnect();
    previewObserver = null;
  }
}

function resetPreviewRenderer() {
  renderRunId += 1;
  queuedPages.clear();
  renderedPages.clear();
  activeRenders = 0;
  pendingPreviewQueue = [];
  disconnectPreviewObserver();
}

function yieldToBrowser() {
  return new Promise(resolve => requestAnimationFrame(() => resolve()));
}

function togglePage(div, pageNum) {
  if (selectedPages.has(pageNum)) {
    selectedPages.delete(pageNum);
    div.classList.remove('selected');
  } else {
    selectedPages.add(pageNum);
    div.classList.add('selected');
  }
}

async function renderPreviewCanvas(previewEl, pageNum, localRunId) {
  try {
    const pdfDoc = await getPdfJsDocument(currentFile, pdfjsLib);
    if (!pdfDoc || localRunId !== renderRunId || !previewEl.isConnected) return;

    const page = await pdfDoc.getPage(pageNum);
    if (localRunId !== renderRunId || !previewEl.isConnected) return;

    const viewport = page.getViewport({ scale: THUMBNAIL_SCALE });
    const canvas = previewEl.querySelector('canvas');
    const context = canvas.getContext('2d', { alpha: false });

    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    await page.render({ canvasContext: context, viewport }).promise;

    if (localRunId !== renderRunId || !previewEl.isConnected) return;
    previewEl.classList.remove('loading');
    renderedPages.add(pageNum);
    if (previewObserver) previewObserver.unobserve(previewEl);
  } finally {
    queuedPages.delete(pageNum);
    activeRenders = Math.max(0, activeRenders - 1);
    await yieldToBrowser();
    drainPreviewQueue(localRunId);
  }
}

function drainPreviewQueue(localRunId) {
  while (activeRenders < MAX_CONCURRENT_RENDERS && pendingPreviewQueue.length > 0) {
    const nextItem = pendingPreviewQueue.shift();
    if (!nextItem) return;
    if (!nextItem.previewEl.isConnected || renderedPages.has(nextItem.pageNum)) {
      queuedPages.delete(nextItem.pageNum);
      continue;
    }

    activeRenders += 1;
    renderPreviewCanvas(nextItem.previewEl, nextItem.pageNum, localRunId);
  }
}

function queuePreviewRender(previewEl, pageNum, localRunId) {
  if (renderedPages.has(pageNum) || queuedPages.has(pageNum)) {
    return;
  }

  queuedPages.add(pageNum);
  pendingPreviewQueue.push({ previewEl, pageNum });
  drainPreviewQueue(localRunId);
}

function createPreviewElement(pageNum) {
  const div = document.createElement('div');
  div.className = 'page-preview loading';
  div.dataset.page = pageNum;
  div.innerHTML = `<canvas></canvas><div class="page-check">✓</div><span class="page-num">${pageNum}</span>`;
  div.addEventListener('click', () => togglePage(div, pageNum));
  return div;
}

function startPreviewObserver(previewsContainer) {
  const localRunId = renderRunId;

  previewObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const previewEl = entry.target;
      const pageNum = parseInt(previewEl.dataset.page, 10);
      queuePreviewRender(previewEl, pageNum, localRunId);
    });
  }, {
    root: document.getElementById('editorCenterCanvas'),
    rootMargin: '300px 0px',
  });

  previewsContainer.querySelectorAll('.page-preview').forEach((previewEl) => {
    previewObserver.observe(previewEl);
  });
}

async function renderThumbnails() {
  if (EditorState.activeTool !== 'split' || EditorState.files.length === 0) return;
  const file = EditorState.files[0];
  const hasSplitPreviews = Boolean(document.getElementById('splitPreviews'));
  if (currentFile === file && hasSplitPreviews) return;
  currentFile = file;
  resetPreviewRenderer();

  const container = document.getElementById('editorCenterCanvas');
  container.innerHTML = '<div style="padding: 20px;"><div id="splitPreviews" class="page-previews"></div></div>';
  const previewsContainer = document.getElementById('splitPreviews');

  splitPdfBytes = await getPdfBytes(file);
  const pdfDoc = await getPdfJsDocument(file, pdfjsLib);
  selectedPages.clear();

  const fragment = document.createDocumentFragment();
  for (let i = 1; i <= pdfDoc.numPages; i++) {
    fragment.appendChild(createPreviewElement(i));
  }
  previewsContainer.appendChild(fragment);

  startPreviewObserver(previewsContainer);
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

      res.textContent = `Extracted ${sorted.length} page(s) - ${formatSize(bytes.length)}`;
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
      selectedPages.add(parseInt(d.dataset.page, 10));
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
        resetPreviewRenderer();
        currentFile = null;
        splitPdfBytes = null;
      } else {
        renderThumbnails();
      }
    }
  });

  EditorEvents.on('toolChanged', (tool) => {
    if (tool === 'split') renderThumbnails();
  });
}
