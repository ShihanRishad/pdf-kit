import './styles/base.css';
import './styles/layout.css';
import './styles/components.css';
import './styles/tools.css';

import * as pdfjsLib from 'pdfjs-dist';
import { addFiles, EditorState } from './core/EditorState.js';
import { renderApp, initNav, initWorkspaceChrome } from './core/App.js';
import { initDropZones } from './core/DropZone.js';

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

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString();

async function importForActiveTool(fileList) {
  const tool = EditorState.activeTool;
  if (tool === 'img2pdf') {
    await addFiles(fileList, { kind: 'image' });
    return;
  }
  if (tool === 'html2pdf') {
    await addFiles(fileList, { kind: 'html' });
    return;
  }
  await addFiles(fileList, { kind: 'pdf' });
}

document.addEventListener('DOMContentLoaded', () => {
  renderApp();
  initNav();
  initWorkspaceChrome();
  initDropZones();

  const importInput = document.getElementById('workspaceImportInput');
  const globalInput = document.getElementById('globalFileInput');
  [importInput, globalInput].forEach((input) => {
    input.addEventListener('change', async (event) => {
      await importForActiveTool(event.target.files);
      event.target.value = '';
    });
  });

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
