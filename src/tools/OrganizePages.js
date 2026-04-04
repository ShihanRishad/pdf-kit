import { PDFDocument, degrees } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import { formatSize, setProgress, hideProgress, showError } from '../core/Utils.js';
import { EditorEvents, EditorState, commitPdfResult } from '../core/EditorState.js';

let organizePdfBytes = null;
let organizePages = [];
let organizeSelected = new Set();
let currentDocId = null;

async function renderThumbnails() {
  if (EditorState.activeTool !== 'organize' || !EditorState.workingDocument) return;
  const doc = EditorState.workingDocument;
  if (currentDocId === doc.id && document.getElementById('organizePreviews')) return;
  currentDocId = doc.id;
  organizePdfBytes = doc.bytes.slice(0);
  organizePages = [];
  organizeSelected.clear();

  const container = document.getElementById('editorCenterCanvas');
  container.innerHTML = '<div class="canvas-scroll"><div id="organizePreviews" class="page-previews"></div></div>';
  container.style.display = 'block';
  const previews = document.getElementById('organizePreviews');
  const pdfDoc = await pdfjsLib.getDocument({ data: organizePdfBytes.slice(0) }).promise;

  for (let index = 0; index < pdfDoc.numPages; index += 1) {
    organizePages.push({ index, rotation: 0 });
    const page = await pdfDoc.getPage(index + 1);
    const viewport = page.getViewport({ scale: 0.35 });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;

    const preview = document.createElement('div');
    preview.className = 'page-preview';
    preview.dataset.idx = String(index);
    preview.draggable = true;
    preview.innerHTML = `<div class="page-check">OK</div><span class="page-num">${index + 1}</span>`;
    preview.insertBefore(canvas, preview.firstChild);
    preview.addEventListener('click', () => {
      if (organizeSelected.has(index)) {
        organizeSelected.delete(index);
        preview.classList.remove('selected');
      } else {
        organizeSelected.add(index);
        preview.classList.add('selected');
      }
    });
    preview.addEventListener('dragstart', (event) => {
      event.dataTransfer.setData('text/plain', preview.dataset.idx);
      preview.classList.add('dragging');
    });
    preview.addEventListener('dragend', () => preview.classList.remove('dragging'));
    preview.addEventListener('dragover', (event) => {
      event.preventDefault();
      preview.classList.add('drag-over');
    });
    preview.addEventListener('dragleave', () => preview.classList.remove('drag-over'));
    preview.addEventListener('drop', (event) => {
      event.preventDefault();
      preview.classList.remove('drag-over');
      const fromIdx = parseInt(event.dataTransfer.getData('text/plain'), 10);
      const toIdx = parseInt(preview.dataset.idx, 10);
      const fromPos = organizePages.findIndex((pageInfo) => pageInfo.index === fromIdx);
      const toPos = organizePages.findIndex((pageInfo) => pageInfo.index === toIdx);
      if (fromPos < 0 || toPos < 0) return;
      const [moved] = organizePages.splice(fromPos, 1);
      organizePages.splice(toPos, 0, moved);
      reRenderPreviews();
    });
    previews.appendChild(preview);
  }

  document.getElementById('organizeBtn').disabled = false;
}

function reRenderPreviews() {
  const container = document.getElementById('organizePreviews');
  if (!container) return;
  const nodes = {};
  container.querySelectorAll('.page-preview').forEach((preview) => {
    nodes[preview.dataset.idx] = preview;
  });

  organizePages.forEach((pageInfo, position) => {
    const preview = nodes[pageInfo.index];
    if (!preview) return;
    preview.querySelector('.page-num').textContent = position + 1;
    preview.classList.toggle('selected', organizeSelected.has(pageInfo.index));
    preview.querySelector('canvas').style.transform = `rotate(${pageInfo.rotation}deg)`;
    container.appendChild(preview);
  });
}

function rotateSelected(degreesDelta) {
  organizeSelected.forEach((index) => {
    const page = organizePages.find((pageInfo) => pageInfo.index === index);
    if (page) page.rotation = (page.rotation + degreesDelta) % 360;
  });
  reRenderPreviews();
}

function deleteSelected() {
  if (organizeSelected.size === organizePages.length) {
    showError("Can't delete all pages.");
    return;
  }
  organizePages = organizePages.filter((pageInfo) => !organizeSelected.has(pageInfo.index));
  organizeSelected.clear();
  document.querySelectorAll('#organizePreviews .page-preview').forEach((preview) => {
    const pageIndex = parseInt(preview.dataset.idx, 10);
    if (!organizePages.find((pageInfo) => pageInfo.index === pageIndex)) preview.remove();
  });
  reRenderPreviews();
}

async function doOrganize() {
  if (EditorState.activeTool !== 'organize' || !organizePdfBytes) return;
  const button = document.getElementById('organizeBtn');
  button.textContent = 'Applying...';
  setProgress('globalProgress', 10);

  try {
    const srcDoc = await PDFDocument.load(organizePdfBytes, { ignoreEncryption: true });
    const nextDoc = await PDFDocument.create();
    for (let index = 0; index < organizePages.length; index += 1) {
      const { index: pageIndex, rotation } = organizePages[index];
      const [page] = await nextDoc.copyPages(srcDoc, [pageIndex]);
      if (rotation) page.setRotation(degrees(rotation));
      nextDoc.addPage(page);
      setProgress('globalProgress', 10 + (80 * (index + 1) / organizePages.length));
    }

    const bytes = await nextDoc.save();
    await commitPdfResult(bytes, {
      filename: `organized_${EditorState.workingDocument.name}`,
      label: `${organizePages.length} pages reorganized`,
      pageCount: organizePages.length,
      source: 'organize',
    });
  } catch (error) {
    showError(`Error organizing pages: ${error.message}`);
  } finally {
    hideProgress('globalProgress');
    button.textContent = 'Apply Changes';
  }
}

export function init() {
  document.getElementById('organizeRotateCW').addEventListener('click', () => rotateSelected(90));
  document.getElementById('organizeRotateCCW').addEventListener('click', () => rotateSelected(-90));
  document.getElementById('organizeDelete').addEventListener('click', deleteSelected);
  document.getElementById('organizeBtn').addEventListener('click', doOrganize);

  EditorEvents.on('toolChanged', (tool) => {
    if (tool === 'organize') renderThumbnails();
  });
  EditorEvents.on('workingDocumentChanged', () => {
    if (EditorState.activeTool === 'organize') {
      document.getElementById('organizeBtn').disabled = !EditorState.workingDocument;
      currentDocId = null;
      renderThumbnails();
    }
  });
}
