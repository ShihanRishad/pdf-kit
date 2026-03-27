// Styles
import './styles/base.css';
import './styles/layout.css';
import './styles/components.css';
import './styles/tools.css';

// PDF.js worker setup
import * as pdfjsLib from 'pdfjs-dist';
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString();

// Core
import { EditorState, EditorEvents, addFiles } from './core/EditorState.js';
import { renderApp, initNav } from './core/App.js';
import { initDropZones } from './core/DropZone.js';

// Tools
import { init as initMerge } from './tools/MergePdf.js';
import { init as initSplit } from './tools/SplitPdf.js';
import { init as initCompress } from './tools/CompressPdf.js';
import { init as initPdf2Jpg } from './tools/PdfToJpg.js';
import { init as initImg2Pdf } from './tools/ImagesToPdf.js';
import { init as initHtml2Pdf } from './tools/HtmlToPdf.js';
import { init as initOrganize } from './tools/OrganizePages.js';
import { init as initAddText } from './tools/AddTextSign.js';
import { init as initPageNums } from './tools/PageNumbers.js';
import { init as initWatermark } from './tools/AddWatermark.js';
import { init as initEncrypt } from './tools/EncryptPdf.js';
import { init as initExtract } from './tools/ExtractText.js';

// Boot
document.addEventListener('DOMContentLoaded', () => {
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

  // Initialize all tools
  initMerge();
  initSplit();
  initCompress();
  initPdf2Jpg();
  initImg2Pdf();
  initHtml2Pdf();
  initOrganize();
  initAddText();
  initPageNums();
  initWatermark();
  initEncrypt();
  initExtract();
});
