import { PDFDocument } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import { formatSize, setProgress, hideProgress, showError } from '../core/Utils.js';
import { EditorEvents, EditorState, commitPdfResult, setMultiResult } from '../core/EditorState.js';

let splitPdfBytes = null;
let selectedPages = new Set();
let currentDocId = null;

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
  if (EditorState.activeTool !== 'split' || !EditorState.workingDocument) return;
  const doc = EditorState.workingDocument;
  if (currentDocId === doc.id && document.getElementById('splitPreviews')) return;
  currentDocId = doc.id;
  selectedPages.clear();
  splitPdfBytes = doc.bytes.slice(0);

  const container = document.getElementById('editorCenterCanvas');
  container.innerHTML = '<div class="canvas-scroll"><div id="splitPreviews" class="page-previews"></div></div>';
  container.style.display = 'block';
  const previews = document.getElementById('splitPreviews');

  const pdfDoc = await pdfjsLib.getDocument({ data: splitPdfBytes.slice(0) }).promise;
  for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum += 1) {
    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale: 0.35 });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;

    const preview = document.createElement('div');
    preview.className = 'page-preview';
    preview.dataset.page = String(pageNum);
    preview.innerHTML = `<div class="page-check">OK</div><span class="page-num">${pageNum}</span>`;
    preview.insertBefore(canvas, preview.firstChild);
    preview.addEventListener('click', () => togglePage(preview, pageNum));
    previews.appendChild(preview);
  }

  document.getElementById('splitBtn').disabled = false;
}

async function doSplit() {
  if (EditorState.activeTool !== 'split' || !splitPdfBytes) return;
  const mode = document.getElementById('splitMode').value;
  const button = document.getElementById('splitBtn');
  button.textContent = 'Processing...';
  setProgress('globalProgress', 10);

  try {
    const srcDoc = await PDFDocument.load(splitPdfBytes, { ignoreEncryption: true });

    if (mode === 'all') {
      const downloads = [];
      for (let index = 0; index < srcDoc.getPageCount(); index += 1) {
        const newDoc = await PDFDocument.create();
        const [page] = await newDoc.copyPages(srcDoc, [index]);
        newDoc.addPage(page);
        const bytes = await newDoc.save();
        downloads.push({
          label: `Download Page ${index + 1}`,
          filename: `page_${index + 1}.pdf`,
          blob: new Blob([bytes], { type: 'application/pdf' }),
        });
        setProgress('globalProgress', 10 + (80 * (index + 1) / srcDoc.getPageCount()));
      }

      setMultiResult({
        fileType: 'pdf',
        label: `Split into ${downloads.length} individual PDFs`,
        primaryLabel: 'Download All PDFs',
        downloads,
      });
      return;
    }

    if (selectedPages.size === 0) {
      showError('Select at least one page.');
      return;
    }

    const newDoc = await PDFDocument.create();
    const sorted = Array.from(selectedPages).sort((a, b) => a - b);
    const pages = await newDoc.copyPages(srcDoc, sorted.map((page) => page - 1));
    pages.forEach((page) => newDoc.addPage(page));
    const bytes = await newDoc.save();

    if (sorted.length === 1) {
      await commitPdfResult(bytes, {
        filename: `page_${sorted[0]}.pdf`,
        label: 'Single page extracted into the working document',
        pageCount: 1,
        source: 'split',
      });
      return;
    }

    setMultiResult({
      fileType: 'pdf',
      label: `Extracted ${sorted.length} selected pages`,
      primaryLabel: 'Download Extracted PDF',
      downloads: [{
        label: 'Download extracted pages',
        filename: 'extracted.pdf',
        blob: new Blob([bytes], { type: 'application/pdf' }),
      }],
    });
  } catch (error) {
    showError(`Error splitting PDF: ${error.message}`);
  } finally {
    hideProgress('globalProgress');
    button.textContent = 'Run Split';
  }
}

export function init() {
  document.getElementById('splitBtn').addEventListener('click', doSplit);
  document.getElementById('splitSelectAll').addEventListener('click', () => {
    document.querySelectorAll('#splitPreviews .page-preview').forEach((preview) => {
      selectedPages.add(parseInt(preview.dataset.page, 10));
      preview.classList.add('selected');
    });
  });
  document.getElementById('splitDeselectAll').addEventListener('click', () => {
    selectedPages.clear();
    document.querySelectorAll('#splitPreviews .page-preview').forEach((preview) => preview.classList.remove('selected'));
  });

  EditorEvents.on('toolChanged', (tool) => {
    if (tool === 'split') renderThumbnails();
  });
  EditorEvents.on('workingDocumentChanged', () => {
    if (EditorState.activeTool === 'split') {
      document.getElementById('splitBtn').disabled = !EditorState.workingDocument;
      currentDocId = null;
      renderThumbnails();
    }
  });
}
