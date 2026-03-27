// Styles
import './styles/base.css';
import './styles/layout.css';
import './styles/components.css';
import './styles/tools.css';

// Core
import { EditorState, EditorEvents, addFiles } from './core/EditorState.js';
import { renderApp, initNav } from './core/App.js';
import { initDropZones } from './core/DropZone.js';

const toolLoaders = {
  merge: () => import('./tools/MergePdf.js'),
  split: () => import('./tools/SplitPdf.js'),
  compress: () => import('./tools/CompressPdf.js'),
  pdf2jpg: () => import('./tools/PdfToJpg.js'),
  img2pdf: () => import('./tools/ImagesToPdf.js'),
  html2pdf: () => import('./tools/HtmlToPdf.js'),
  organize: () => import('./tools/OrganizePages.js'),
  addtext: () => import('./tools/AddTextSign.js'),
  pagenums: () => import('./tools/PageNumbers.js'),
  watermark: () => import('./tools/AddWatermark.js'),
  encrypt: () => import('./tools/EncryptPdf.js'),
  extract: () => import('./tools/ExtractText.js'),
};

const initializedTools = new Set();
const loadingTools = new Map();

async function ensureToolLoaded(tool) {
  if (initializedTools.has(tool)) return;

  if (loadingTools.has(tool)) {
    await loadingTools.get(tool);
    return;
  }

  const loader = toolLoaders[tool];
  if (!loader) return;

  const pending = loader()
    .then((mod) => {
      if (typeof mod.init === 'function') {
        mod.init();
      }
      initializedTools.add(tool);
    })
    .finally(() => {
      loadingTools.delete(tool);
    });

  loadingTools.set(tool, pending);
  await pending;
}

// Boot
document.addEventListener('DOMContentLoaded', () => {
  window.__ensureToolLoaded = ensureToolLoaded;

  renderApp();
  initNav();
  initDropZones();

  // Wire up Global File Input to EditorState
  const globalInput = document.getElementById('globalFileInput');
  if (globalInput) {
    globalInput.addEventListener('change', (e) => {
      addFiles(e.target.files);
      // Reset input so re-uploading same file works
      e.target.value = '';
    });
  }
  
  // When files are added, hide the central dropzone if we have files
  EditorEvents.on('filesChanged', (files) => {
     const dropZone = document.getElementById('globalDropZone');
     const canvasArea = document.getElementById('editorCenterCanvas');
     if (files.length > 0) {
        dropZone.style.display = 'none';
        canvasArea.style.display = 'block';
     } else {
        dropZone.style.display = 'flex';
        canvasArea.style.display = 'none';
     }
  });

  // Preload the default tool after first paint to keep startup fast.
  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(() => ensureToolLoaded('merge'));
  } else {
    setTimeout(() => ensureToolLoaded('merge'), 250);
  }
});
