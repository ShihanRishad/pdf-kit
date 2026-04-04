import { PDFDocument } from 'pdf-lib';
import { formatSize, setProgress, hideProgress, showError } from '../core/Utils.js';
import { EditorEvents, commitPdfResult, EditorState, getSourceItemsByKind } from '../core/EditorState.js';

function renderComposer() {
  if (EditorState.activeTool !== 'img2pdf') return;
  const images = getSourceItemsByKind('image');
  const canvas = document.getElementById('editorCenterCanvas');
  document.getElementById('img2pdfBtn').disabled = images.length === 0;
  canvas.innerHTML = `
    <div class="composer-surface">
      <div class="composer-header">
        <div class="workspace-placeholder-kicker">Images to PDF</div>
        <h3>${images.length ? `${images.length} image${images.length === 1 ? '' : 's'} in this workspace` : 'Import JPG, PNG, or WebP files'}</h3>
        <p>${images.length ? 'Use the shared import button or drop zone to add more images. Drag items in the left rail to reorder pages.' : 'The created PDF becomes the active working document so you can continue with organize, watermark, numbering, and more.'}</p>
      </div>
      <div class="image-gallery">
        ${images.map((item) => `<div class="image-chip">${item.name}<span>${formatSize(item.size)}</span></div>`).join('')}
      </div>
    </div>
  `;
  canvas.style.display = 'block';
}

async function doConvert() {
  const images = getSourceItemsByKind('image');
  if (images.length === 0) return;
  setProgress('globalProgress', 5);

  try {
    const pdfDoc = await PDFDocument.create();

    for (let index = 0; index < images.length; index += 1) {
      const file = images[index].file;
      const bytes = await file.arrayBuffer();
      const image = file.type === 'image/png'
        ? await pdfDoc.embedPng(bytes)
        : await pdfDoc.embedJpg(bytes);
      const page = pdfDoc.addPage([image.width, image.height]);
      page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
      setProgress('globalProgress', 10 + (80 * (index + 1) / images.length));
    }

    const pdfBytes = await pdfDoc.save();
    await commitPdfResult(pdfBytes, {
      filename: 'images.pdf',
      label: `${images.length} image${images.length === 1 ? '' : 's'} converted into a PDF`,
      pageCount: pdfDoc.getPageCount(),
      source: 'img2pdf',
    });
  } catch (error) {
    showError(`Error creating PDF: ${error.message}`);
  } finally {
    hideProgress('globalProgress');
  }
}

export function init() {
  document.getElementById('img2pdfBtn').addEventListener('click', doConvert);
  EditorEvents.on('toolChanged', (tool) => {
    if (tool === 'img2pdf') renderComposer();
  });
  EditorEvents.on('sourceItemsChanged', renderComposer);
}
