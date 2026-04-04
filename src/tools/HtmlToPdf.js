import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { formatSize, setProgress, hideProgress, showError } from '../core/Utils.js';
import { EditorEvents, commitPdfResult, EditorState, getSourceItemsByKind } from '../core/EditorState.js';

function parseHtmlToBlocks(html) {
  const div = document.createElement('div');
  div.innerHTML = html;
  const blocks = [];

  function walk(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent.replace(/\s+/g, ' ').trim();
      if (text) blocks.push({ type: 'text', text, fontSize: 11, bold: false });
      return;
    }
    const tag = node.tagName ? node.tagName.toLowerCase() : '';
    if (tag === 'h1') { blocks.push({ type: 'text', text: node.textContent.trim(), fontSize: 22, bold: true, spaceBefore: 12 }); return; }
    if (tag === 'h2') { blocks.push({ type: 'text', text: node.textContent.trim(), fontSize: 18, bold: true, spaceBefore: 10 }); return; }
    if (tag === 'h3') { blocks.push({ type: 'text', text: node.textContent.trim(), fontSize: 14, bold: true, spaceBefore: 8 }); return; }
    if (tag === 'p') { blocks.push({ type: 'text', text: node.textContent.trim(), fontSize: 11, bold: false, spaceBefore: 6 }); return; }
    if (tag === 'br') { blocks.push({ type: 'br' }); return; }
    if (tag === 'hr') { blocks.push({ type: 'hr' }); return; }
    if (tag === 'ul' || tag === 'ol') {
      Array.from(node.children).forEach((li, index) => {
        const bullet = tag === 'ol' ? `${index + 1}.` : '*';
        blocks.push({ type: 'text', text: `  ${bullet}  ${li.textContent.trim()}`, fontSize: 11, bold: false, spaceBefore: 3 });
      });
      return;
    }
    node.childNodes.forEach(walk);
  }

  div.childNodes.forEach(walk);
  return blocks;
}

function renderComposer() {
  if (EditorState.activeTool !== 'html2pdf') return;
  const htmlImports = getSourceItemsByKind('html');
  const latestImport = htmlImports.at(-1);
  const canvas = document.getElementById('editorCenterCanvas');
  canvas.innerHTML = `
    <div class="composer-surface">
      <div class="composer-header">
        <div class="workspace-placeholder-kicker">HTML composer</div>
        <h3>Write or import HTML, then keep editing the resulting PDF</h3>
        <p>${latestImport ? `Latest import: ${latestImport.name} - ${formatSize(latestImport.size)}` : 'Paste HTML below or use the shared import button to pull in an .html file.'}</p>
      </div>
      <textarea id="htmlInput" class="composer-textarea" placeholder="Paste HTML here...">${latestImport?.text || document.getElementById('htmlInput')?.value || ''}</textarea>
    </div>
  `;
  canvas.style.display = 'block';
}

async function doConvert() {
  const input = document.getElementById('htmlInput');
  const html = input?.value.trim() || '';
  if (!html) {
    showError('Paste some HTML first.');
    return;
  }

  setProgress('globalProgress', 10);
  try {
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const pageWidth = 612;
    const pageHeight = 792;
    const marginX = 46;
    const marginRight = pageWidth - 46;
    const maxWidth = marginRight - marginX;
    let page = pdfDoc.addPage([pageWidth, pageHeight]);
    let y = 740;

    function newPageIfNeeded(needed) {
      if (y - needed < 50) {
        page = pdfDoc.addPage([pageWidth, pageHeight]);
        y = 740;
      }
    }

    function drawWrappedText(text, fontSize, bold, spaceBefore = 0) {
      if (!text) return;
      const activeFont = bold ? fontBold : font;
      const words = text.split(' ');
      let line = '';
      const lineHeight = fontSize * 1.5;
      y -= spaceBefore;

      for (const word of words) {
        const test = line ? `${line} ${word}` : word;
        if (activeFont.widthOfTextAtSize(test, fontSize) > maxWidth && line) {
          newPageIfNeeded(lineHeight);
          page.drawText(line, { x: marginX, y, size: fontSize, font: activeFont, color: rgb(0, 0, 0) });
          y -= lineHeight;
          line = word;
        } else {
          line = test;
        }
      }

      if (line) {
        newPageIfNeeded(lineHeight);
        page.drawText(line, { x: marginX, y, size: fontSize, font: activeFont, color: rgb(0, 0, 0) });
        y -= lineHeight;
      }
    }

    const blocks = parseHtmlToBlocks(html);
    setProgress('globalProgress', 40);

    blocks.forEach((block) => {
      if (block.type === 'br') {
        y -= 8;
        return;
      }
      if (block.type === 'hr') {
        newPageIfNeeded(16);
        page.drawLine({ start: { x: marginX, y }, end: { x: marginRight, y }, thickness: 0.5, color: rgb(0.7, 0.7, 0.7) });
        y -= 16;
        return;
      }
      drawWrappedText(block.text, block.fontSize, block.bold, block.spaceBefore || 0);
    });

    const pdfBytes = await pdfDoc.save();
    await commitPdfResult(pdfBytes, {
      filename: 'document.pdf',
      label: `${pdfDoc.getPageCount()} page PDF created from HTML`,
      pageCount: pdfDoc.getPageCount(),
      source: 'html2pdf',
    });
  } catch (error) {
    showError(`Error creating PDF: ${error.message}`);
  } finally {
    hideProgress('globalProgress');
  }
}

export function init() {
  document.getElementById('html2pdfBtn').addEventListener('click', doConvert);
  EditorEvents.on('toolChanged', (tool) => {
    if (tool === 'html2pdf') renderComposer();
  });
  EditorEvents.on('sourceItemsChanged', renderComposer);
}
