import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import { downloadBlob, setProgress, hideProgress, hexToRgb, showError, formatSize } from '../core/Utils.js';
import { EditorState, EditorEvents } from '../core/EditorState.js';
import { getPdfBytes, getPdfJsDocument } from '../core/PdfCache.js';

let addtextPdfBytes = null;
let addtextPdfDoc = null;
let addtextAnnotations = {};
let addtextMode = 'text';
let addtextCurrentPage = 0;
let isDrawing = false;
let currentDrawPoints = [];
let currentFile = null;
let renderToken = 0;

function drawAnnotation(ctx, ann, scale) {
  if (ann.type === 'text') {
    ctx.font = `${ann.size * scale}px sans-serif`;
    ctx.fillStyle = ann.color;
    ctx.fillText(ann.text, ann.x * scale, ann.y * scale);
  } else if (ann.type === 'draw' && ann.points.length > 1) {
    ctx.strokeStyle = ann.color;
    ctx.lineWidth = ann.size * scale * 0.1;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(ann.points[0].x * scale, ann.points[0].y * scale);
    ann.points.forEach(p => ctx.lineTo(p.x * scale, p.y * scale));
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
  const vp = page.getViewport({ scale });
  
  let canvas = document.getElementById('addtextCanvas');
  if (!canvas) {
    const container = document.getElementById('editorCenterCanvas');
    container.innerHTML = '<div style="padding: 20px; text-align: center; height: 100%; overflow: auto;"><canvas id="addtextCanvas" style="box-shadow: 0 4px 12px rgba(0,0,0,0.1); border-radius: var(--radius-sm); border: 1px solid var(--border); max-width: 100%; cursor: crosshair;"></canvas></div>';
    canvas = document.getElementById('addtextCanvas');
  }

  canvas.width = vp.width;
  canvas.height = vp.height;
  const ctx = canvas.getContext('2d');

  const pageSelect = document.getElementById('addtextPage');
  if (pageSelect) pageSelect.value = String(addtextCurrentPage);

  await page.render({ canvasContext: ctx, viewport: vp }).promise;
  if (localToken !== renderToken) return;

  const anns = addtextAnnotations[addtextCurrentPage] || [];
  anns.forEach(a => drawAnnotation(ctx, a, scale));

  canvas.onmousedown = e => onMouseDown(e, canvas, scale);
  canvas.onmousemove = e => onMouseMove(e, canvas, scale);
  canvas.onmouseup = () => onMouseUp();
}

function onMouseDown(e, canvas, scale) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  
  const x = ((e.clientX - rect.left) * scaleX) / scale;
  const y = ((e.clientY - rect.top) * scaleY) / scale;

  if (addtextMode === 'text') {
    const text = prompt('Enter text:');
    if (!text) return;
    if (!addtextAnnotations[addtextCurrentPage]) addtextAnnotations[addtextCurrentPage] = [];
    addtextAnnotations[addtextCurrentPage].push({
      type: 'text', x, y, text,
      color: document.getElementById('addtextColor').value,
      size: parseInt(document.getElementById('addtextSize').value)
    });
    renderPage();
  } else if (addtextMode === 'draw') {
    isDrawing = true;
    currentDrawPoints = [{ x, y }];
  }
}

function onMouseMove(e, canvas, scale) {
  if (!isDrawing) return;
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const x = ((e.clientX - rect.left) * scaleX) / scale;
  const y = ((e.clientY - rect.top) * scaleY) / scale;
  
  currentDrawPoints.push({ x, y });

  const ctx = canvas.getContext('2d');
  if (currentDrawPoints.length > 1) {
    const prev = currentDrawPoints[currentDrawPoints.length - 2];
    ctx.strokeStyle = document.getElementById('addtextColor').value;
    ctx.lineWidth = parseInt(document.getElementById('addtextSize').value) * scale * 0.1;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(prev.x * scale, prev.y * scale);
    ctx.lineTo(x * scale, y * scale);
    ctx.stroke();
  }
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
      size: parseInt(document.getElementById('addtextSize').value)
    });
  }
  currentDrawPoints = [];
}

async function renderCanvas() {
  if (EditorState.activeTool !== 'addtext' || EditorState.files.length === 0) return;
  const file = EditorState.files[0];
  if (currentFile === file && addtextPdfDoc && document.getElementById('addtextCanvas')) {
    renderPage(addtextCurrentPage);
    return;
  }
  currentFile = file;

  addtextPdfBytes = await getPdfBytes(file);
  addtextPdfDoc = await getPdfJsDocument(file, pdfjsLib);
  addtextAnnotations = {};
  addtextCurrentPage = 0;

  const select = document.getElementById('addtextPage');
  select.innerHTML = '';
  for (let i = 1; i <= addtextPdfDoc.numPages; i++) {
    const opt = document.createElement('option');
    opt.value = i - 1;
    opt.textContent = 'Page ' + i;
    select.appendChild(opt);
  }

  document.getElementById('addtextBtn').disabled = false;
  renderPage();
}

async function doSave() {
  if (EditorState.activeTool !== 'addtext' || !addtextPdfBytes) return;
  setProgress('globalProgress', 10);
  document.getElementById('addtextBtn').textContent = 'Processing...';

  try {
    const pdfDoc = await PDFDocument.load(addtextPdfBytes, { ignoreEncryption: true });
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const pages = pdfDoc.getPages();

    for (const [pageIdx, anns] of Object.entries(addtextAnnotations)) {
      const page = pages[parseInt(pageIdx)];
      if (!page) continue;
      const { height } = page.getSize();

      for (const ann of anns) {
        if (ann.type === 'text') {
          const c = hexToRgb(ann.color);
          page.drawText(ann.text, {
            x: ann.x, y: height - ann.y, size: ann.size, font,
            color: rgb(c.r / 255, c.g / 255, c.b / 255)
          });
        } else if (ann.type === 'draw' && ann.points.length > 1) {
          const c = hexToRgb(ann.color);
          for (let i = 1; i < ann.points.length; i++) {
            page.drawLine({
              start: { x: ann.points[i - 1].x, y: height - ann.points[i - 1].y },
              end: { x: ann.points[i].x, y: height - ann.points[i].y },
              thickness: ann.size * 0.1,
              color: rgb(c.r / 255, c.g / 255, c.b / 255)
            });
          }
        }
      }
      setProgress('globalProgress', 10 + (80 * (parseInt(pageIdx) + 1) / pages.length));
    }

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    setProgress('globalProgress', 100);
    setTimeout(() => hideProgress('globalProgress'), 500);
    
    const downloadBtn = document.getElementById('addtextDownload');
    downloadBtn.style.display = 'block';
    downloadBtn.onclick = () => downloadBlob(blob, 'annotated.pdf');
    
    const res = document.getElementById('globalResultInfo');
    res.textContent = `Annotations saved — ${formatSize(pdfBytes.length)}`;
    res.style.display = 'block';
    
    document.getElementById('addtextBtn').textContent = 'Save Annotations';
  } catch (err) {
    showError('Error saving: ' + err.message);
    hideProgress('globalProgress');
    document.getElementById('addtextBtn').textContent = 'Save Annotations';
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
    const anns = addtextAnnotations[addtextCurrentPage];
    if (anns && anns.length > 0) { anns.pop(); renderPage(); }
  });

  EditorEvents.on('filesChanged', () => {
    if (EditorState.activeTool === 'addtext') {
       if (EditorState.files.length === 0) {
          document.getElementById('addtextBtn').disabled = true;
          document.getElementById('editorCenterCanvas').innerHTML = '';
          currentFile = null;
          addtextPdfBytes = null;
          addtextPdfDoc = null;
       } else {
          renderCanvas();
       }
    }
  });

  EditorEvents.on('toolChanged', (tool) => {
    if (tool === 'addtext') renderCanvas();
  });
}
