import { PDFDocument, degrees } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import { formatSize, downloadBlob, setProgress, hideProgress, showError } from '../core/Utils.js';
import { EditorState, EditorEvents } from '../core/EditorState.js';
import { getPdfBytes, getPdfJsDocument } from '../core/PdfCache.js';

let organizePdfBytes = null;
let organizePages = [];
let organizeSelected = new Set();
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

function toggleSelectedPage(div, pageIndex) {
  if (organizeSelected.has(pageIndex)) {
    organizeSelected.delete(pageIndex);
    div.classList.remove('selected');
  } else {
    organizeSelected.add(pageIndex);
    div.classList.add('selected');
  }
}

function reorderPages(fromIdx, toIdx) {
  if (fromIdx === toIdx) return;

  const fromPos = organizePages.findIndex(p => p.index === fromIdx);
  const toPos = organizePages.findIndex(p => p.index === toIdx);
  if (fromPos < 0 || toPos < 0) return;

  const [moved] = organizePages.splice(fromPos, 1);
  organizePages.splice(toPos, 0, moved);
  reRenderPreviews();
}

function bindPreviewInteractions(div, pageIndex) {
  div.addEventListener('click', () => toggleSelectedPage(div, pageIndex));
  div.addEventListener('dragstart', e => {
    e.dataTransfer.setData('text/plain', div.dataset.idx);
    div.classList.add('dragging');
  });
  div.addEventListener('dragend', () => div.classList.remove('dragging'));
  div.addEventListener('dragover', e => {
    e.preventDefault();
    div.classList.add('drag-over');
  });
  div.addEventListener('dragleave', () => div.classList.remove('drag-over'));
  div.addEventListener('drop', e => {
    e.preventDefault();
    div.classList.remove('drag-over');
    reorderPages(parseInt(e.dataTransfer.getData('text/plain'), 10), parseInt(div.dataset.idx, 10));
  });
}

async function renderPreviewCanvas(previewEl, pageIndex, localRunId) {
  try {
    const pdfDoc = await getPdfJsDocument(currentFile, pdfjsLib);
    if (!pdfDoc || localRunId !== renderRunId || !previewEl.isConnected) return;

    const page = await pdfDoc.getPage(pageIndex + 1);
    if (localRunId !== renderRunId || !previewEl.isConnected) return;

    const viewport = page.getViewport({ scale: THUMBNAIL_SCALE });
    const canvas = previewEl.querySelector('canvas');
    const context = canvas.getContext('2d', { alpha: false });

    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    await page.render({ canvasContext: context, viewport }).promise;

    if (localRunId !== renderRunId || !previewEl.isConnected) return;
    previewEl.classList.remove('loading');
    renderedPages.add(pageIndex);
    if (previewObserver) previewObserver.unobserve(previewEl);
  } finally {
    queuedPages.delete(pageIndex);
    activeRenders = Math.max(0, activeRenders - 1);
    await yieldToBrowser();
    drainPreviewQueue(localRunId);
  }
}

function drainPreviewQueue(localRunId) {
  while (activeRenders < MAX_CONCURRENT_RENDERS && pendingPreviewQueue.length > 0) {
    const nextItem = pendingPreviewQueue.shift();
    if (!nextItem) return;
    if (!nextItem.previewEl.isConnected || renderedPages.has(nextItem.pageIndex)) {
      queuedPages.delete(nextItem.pageIndex);
      continue;
    }

    activeRenders += 1;
    renderPreviewCanvas(nextItem.previewEl, nextItem.pageIndex, localRunId);
  }
}

function queuePreviewRender(previewEl, pageIndex, localRunId) {
  if (renderedPages.has(pageIndex) || queuedPages.has(pageIndex)) {
    return;
  }

  queuedPages.add(pageIndex);
  pendingPreviewQueue.push({ previewEl, pageIndex });
  drainPreviewQueue(localRunId);
}

function createPreviewElement(pageIndex) {
  const div = document.createElement('div');
  div.className = 'page-preview loading';
  div.dataset.idx = pageIndex;
  div.draggable = true;
  div.innerHTML = `<canvas></canvas><div class="page-check">✓</div><span class="page-num">${pageIndex + 1}</span>`;
  bindPreviewInteractions(div, pageIndex);
  return div;
}

function startPreviewObserver(previewsContainer) {
  const localRunId = renderRunId;

  previewObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const previewEl = entry.target;
      const pageIndex = parseInt(previewEl.dataset.idx, 10);
      queuePreviewRender(previewEl, pageIndex, localRunId);
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
  if (EditorState.activeTool !== 'organize' || EditorState.files.length === 0) return;
  const file = EditorState.files[0];
  const hasOrganizePreviews = Boolean(document.getElementById('organizePreviews'));
  if (currentFile === file && hasOrganizePreviews) return;
  currentFile = file;
  resetPreviewRenderer();

  const container = document.getElementById('editorCenterCanvas');
  container.innerHTML = '<div style="padding: 20px;"><div id="organizePreviews" class="page-previews"></div></div>';
  const previewsContainer = document.getElementById('organizePreviews');

  organizePdfBytes = await getPdfBytes(file);
  const pdfDoc = await getPdfJsDocument(file, pdfjsLib);
  organizePages = [];
  organizeSelected.clear();

  const fragment = document.createDocumentFragment();
  for (let i = 0; i < pdfDoc.numPages; i++) {
    organizePages.push({ index: i, rotation: 0 });
    fragment.appendChild(createPreviewElement(i));
  }
  previewsContainer.appendChild(fragment);

  startPreviewObserver(previewsContainer);
  document.getElementById('organizeBtn').disabled = false;
}

function reRenderPreviews() {
  const container = document.getElementById('organizePreviews');
  if (!container) return;

  const divs = Array.from(container.querySelectorAll('.page-preview'));
  const divMap = {};
  divs.forEach(d => {
    divMap[d.dataset.idx] = d;
  });

  organizePages.forEach((pageInfo, position) => {
    const previewEl = divMap[pageInfo.index];
    if (!previewEl) return;

    previewEl.querySelector('.page-num').textContent = position + 1;
    previewEl.classList.toggle('selected', organizeSelected.has(pageInfo.index));
    container.appendChild(previewEl);
  });
}

function rotateSelected(deg) {
  organizeSelected.forEach(idx => {
    const page = organizePages.find(p => p.index === idx);
    if (page) page.rotation = (page.rotation + deg) % 360;
  });

  document.querySelectorAll('#organizePreviews .page-preview').forEach(div => {
    const idx = parseInt(div.dataset.idx, 10);
    const page = organizePages.find(p => p.index === idx);
    const canvas = div.querySelector('canvas');
    if (page && canvas) canvas.style.transform = `rotate(${page.rotation}deg)`;
  });
}

function deleteSelected() {
  if (organizeSelected.size === organizePages.length) {
    showError("Can't delete all pages.");
    return;
  }

  organizePages = organizePages.filter(p => !organizeSelected.has(p.index));
  organizeSelected.clear();
  document.querySelectorAll('#organizePreviews .page-preview').forEach(div => {
    const idx = parseInt(div.dataset.idx, 10);
    if (!organizePages.find(p => p.index === idx)) div.remove();
  });
  reRenderPreviews();
}

async function doOrganize() {
  if (EditorState.activeTool !== 'organize' || !organizePdfBytes) return;
  setProgress('globalProgress', 10);
  document.getElementById('organizeBtn').textContent = 'Processing...';

  try {
    const srcDoc = await PDFDocument.load(organizePdfBytes, { ignoreEncryption: true });
    const newDoc = await PDFDocument.create();

    for (let i = 0; i < organizePages.length; i++) {
      const { index, rotation } = organizePages[i];
      const [page] = await newDoc.copyPages(srcDoc, [index]);
      if (rotation) page.setRotation(degrees(rotation));
      newDoc.addPage(page);
      setProgress('globalProgress', 10 + (80 * (i + 1) / organizePages.length));
    }

    const pdfBytes = await newDoc.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    setProgress('globalProgress', 100);
    setTimeout(() => hideProgress('globalProgress'), 500);

    const res = document.getElementById('globalResultInfo');
    res.textContent = `${organizePages.length} pages - ${formatSize(pdfBytes.length)}`;
    res.style.display = 'block';

    const downloadBtn = document.getElementById('organizeDownload');
    downloadBtn.style.display = 'block';
    downloadBtn.onclick = () => downloadBlob(blob, 'organized.pdf');

    document.getElementById('organizeBtn').textContent = 'Save Changes';
  } catch (err) {
    showError('Error: ' + err.message);
    hideProgress('globalProgress');
    document.getElementById('organizeBtn').textContent = 'Save Changes';
  }
}

export function init() {
  document.getElementById('organizeRotateCW').addEventListener('click', () => rotateSelected(90));
  document.getElementById('organizeRotateCCW').addEventListener('click', () => rotateSelected(-90));
  document.getElementById('organizeDelete').addEventListener('click', deleteSelected);
  document.getElementById('organizeBtn').addEventListener('click', doOrganize);

  EditorEvents.on('filesChanged', () => {
    if (EditorState.activeTool === 'organize') {
      if (EditorState.files.length === 0) {
        document.getElementById('organizeBtn').disabled = true;
        document.getElementById('editorCenterCanvas').innerHTML = '';
        resetPreviewRenderer();
        currentFile = null;
        organizePdfBytes = null;
      } else {
        renderThumbnails();
      }
    }
  });

  EditorEvents.on('toolChanged', (tool) => {
    if (tool === 'organize') renderThumbnails();
  });
}
