import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import { setProgress, hideProgress, hexToRgb, showError } from '../core/Utils.js';
import { EditorEvents, EditorState, commitPdfResult } from '../core/EditorState.js';

let addtextPdfBytes = null;
let addtextPdfDoc = null;
let addtextAnnotations = {};
let addtextMode = 'text';
let addtextCurrentPage = 0;
let isDrawing = false;
let currentDrawPoints = [];
let currentDocId = null;
let renderToken = 0;

function drawAnnotation(ctx, ann, scale) {
  if (ann.type === 'text') {
    ctx.font = `${ann.size * scale}px sans-serif`;
    ctx.fillStyle = ann.color;
    ctx.fillText(ann.text, ann.x * scale, ann.y * scale);
    return;
  }

  if (ann.type === 'draw' && ann.points.length > 1) {
    ctx.strokeStyle = ann.color;
    ctx.lineWidth = ann.size * scale * 0.1;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(ann.points[0].x * scale, ann.points[0].y * scale);
    ann.points.forEach((point) => ctx.lineTo(point.x * scale, point.y * scale));
    ctx.stroke();
  }
}

function clampPageIndex(pageIndex) {
  const total = addtextPdfDoc?.numPages || 0;
  if (!total) return 0;
  if (Number.isNaN(pageIndex)) return 0;
  return Math.max(0, Math.min(pageIndex, total - 1));
}

async function renderPage(pageIndex = addtextCurrentPage) {
  if (!addtextPdfDoc) return;
  addtextCurrentPage = clampPageIndex(pageIndex);
  const localToken = ++renderToken;
  const page = await addtextPdfDoc.getPage(addtextCurrentPage + 1);
  const scale = 1.5;
  const viewport = page.getViewport({ scale });

  let canvas = document.getElementById('addtextCanvas');
  if (!canvas) {
    const container = document.getElementById('editorCenterCanvas');
    container.innerHTML = '<div class="canvas-scroll canvas-center"><canvas id="addtextCanvas" class="annotate-canvas"></canvas></div>';
    canvas = document.getElementById('addtextCanvas');
  }

  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext('2d');
  document.getElementById('addtextPage').value = String(addtextCurrentPage);

  await page.render({ canvasContext: ctx, viewport }).promise;
  if (localToken !== renderToken) return;

  const anns = addtextAnnotations[addtextCurrentPage] || [];
  anns.forEach((annotation) => drawAnnotation(ctx, annotation, scale));

  canvas.onmousedown = (event) => onMouseDown(event, canvas, scale);
  canvas.onmousemove = (event) => onMouseMove(event, canvas, scale);
  canvas.onmouseup = () => onMouseUp();
}

function onMouseDown(event, canvas, scale) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const x = ((event.clientX - rect.left) * scaleX) / scale;
  const y = ((event.clientY - rect.top) * scaleY) / scale;

  if (addtextMode === 'text') {
    const text = prompt('Enter text:');
    if (!text) return;
    if (!addtextAnnotations[addtextCurrentPage]) addtextAnnotations[addtextCurrentPage] = [];
    addtextAnnotations[addtextCurrentPage].push({
      type: 'text',
      x,
      y,
      text,
      color: document.getElementById('addtextColor').value,
      size: parseInt(document.getElementById('addtextSize').value, 10),
    });
    renderPage();
    return;
  }

  isDrawing = true;
  currentDrawPoints = [{ x, y }];
}

function onMouseMove(event, canvas, scale) {
  if (!isDrawing) return;
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const x = ((event.clientX - rect.left) * scaleX) / scale;
  const y = ((event.clientY - rect.top) * scaleY) / scale;
  currentDrawPoints.push({ x, y });

  const ctx = canvas.getContext('2d');
  const prev = currentDrawPoints[currentDrawPoints.length - 2];
  ctx.strokeStyle = document.getElementById('addtextColor').value;
  ctx.lineWidth = parseInt(document.getElementById('addtextSize').value, 10) * scale * 0.1;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(prev.x * scale, prev.y * scale);
  ctx.lineTo(x * scale, y * scale);
  ctx.stroke();
}

function onMouseUp() {
  if (!isDrawing) return;
  isDrawing = false;
  if (currentDrawPoints.length > 1) {
    if (!addtextAnnotations[addtextCurrentPage]) addtextAnnotations[addtextCurrentPage] = [];
    addtextAnnotations[addtextCurrentPage].push({
      type: 'draw',
      points: [...currentDrawPoints],
      color: document.getElementById('addtextColor').value,
      size: parseInt(document.getElementById('addtextSize').value, 10),
    });
  }
  currentDrawPoints = [];
}

async function renderCanvas() {
  if (EditorState.activeTool !== 'addtext' || !EditorState.workingDocument) return;
  const doc = EditorState.workingDocument;
  if (currentDocId === doc.id && addtextPdfDoc && document.getElementById('addtextCanvas')) {
    renderPage(addtextCurrentPage);
    return;
  }

  currentDocId = doc.id;
  addtextPdfBytes = doc.bytes.slice(0);
  addtextPdfDoc = await pdfjsLib.getDocument({ data: addtextPdfBytes.slice(0) }).promise;
  addtextAnnotations = {};
  addtextCurrentPage = 0;

  const select = document.getElementById('addtextPage');
  select.innerHTML = '';
  for (let index = 1; index <= addtextPdfDoc.numPages; index += 1) {
    const option = document.createElement('option');
    option.value = String(index - 1);
    option.textContent = `Page ${index}`;
    select.appendChild(option);
  }

  document.getElementById('addtextBtn').disabled = false;
  renderPage();
}

async function doSave() {
  if (EditorState.activeTool !== 'addtext' || !addtextPdfBytes) return;
  const button = document.getElementById('addtextBtn');
  button.textContent = 'Saving...';
  setProgress('globalProgress', 10);

  try {
    const pdfDoc = await PDFDocument.load(addtextPdfBytes, { ignoreEncryption: true });
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const pages = pdfDoc.getPages();

    for (const [pageIdx, anns] of Object.entries(addtextAnnotations)) {
      const page = pages[parseInt(pageIdx, 10)];
      if (!page) continue;
      const { height } = page.getSize();

      for (const ann of anns) {
        if (ann.type === 'text') {
          const color = hexToRgb(ann.color);
          page.drawText(ann.text, {
            x: ann.x,
            y: height - ann.y,
            size: ann.size,
            font,
            color: rgb(color.r / 255, color.g / 255, color.b / 255),
          });
          continue;
        }

        if (ann.type === 'draw' && ann.points.length > 1) {
          const color = hexToRgb(ann.color);
          for (let index = 1; index < ann.points.length; index += 1) {
            page.drawLine({
              start: { x: ann.points[index - 1].x, y: height - ann.points[index - 1].y },
              end: { x: ann.points[index].x, y: height - ann.points[index].y },
              thickness: ann.size * 0.1,
              color: rgb(color.r / 255, color.g / 255, color.b / 255),
            });
          }
        }
      }
      setProgress('globalProgress', 10 + (80 * (parseInt(pageIdx, 10) + 1) / pages.length));
    }

    const bytes = await pdfDoc.save();
    await commitPdfResult(bytes, {
      filename: `annotated_${EditorState.workingDocument.name}`,
      label: 'Annotations saved into the working document',
      pageCount: pages.length,
      source: 'addtext',
    });
  } catch (error) {
    showError(`Error saving annotations: ${error.message}`);
  } finally {
    hideProgress('globalProgress');
    button.textContent = 'Save Annotations';
  }
}

function setMode(mode) {
  addtextMode = mode;
  document.getElementById('addtextModeText').classList.toggle('active', mode === 'text');
  document.getElementById('addtextModeDraw').classList.toggle('active', mode === 'draw');
}

export function init() {
  document.getElementById('addtextModeText').addEventListener('click', () => setMode('text'));
  document.getElementById('addtextModeDraw').addEventListener('click', () => setMode('draw'));
  document.getElementById('addtextPage').addEventListener('change', () => {
    renderPage(parseInt(document.getElementById('addtextPage').value, 10));
  });
  document.getElementById('addtextBtn').addEventListener('click', doSave);
  document.getElementById('addtextUndoBtn').addEventListener('click', () => {
    const annotations = addtextAnnotations[addtextCurrentPage];
    if (annotations?.length) {
      annotations.pop();
      renderPage();
    }
  });

  EditorEvents.on('toolChanged', (tool) => {
    if (tool === 'addtext') renderCanvas();
  });
  EditorEvents.on('workingDocumentChanged', () => {
    if (EditorState.activeTool === 'addtext') {
      document.getElementById('addtextBtn').disabled = !EditorState.workingDocument;
      currentDocId = null;
      renderCanvas();
    }
  });
}
