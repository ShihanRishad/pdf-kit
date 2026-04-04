import { EditorEvents, EditorState, getSourceItemsByKind, removeFile, removeSourceItem, reorderSourceItems, clearSourceItems, setActiveTool } from './EditorState.js';
import { DEFAULT_TOOL, TOOL_ORDER, getToolDefinition } from './ToolRegistry.js';
import { downloadBlob, formatSize } from './Utils.js';

function getSidebarItems() {
  if (EditorState.activeTool === 'merge') return getSourceItemsByKind('pdf');
  if (EditorState.activeTool === 'img2pdf') return getSourceItemsByKind('image');
  if (EditorState.activeTool === 'html2pdf') return getSourceItemsByKind('html');
  return [];
}

function renderToolNav() {
  return TOOL_ORDER.map((toolId) => {
    const tool = getToolDefinition(toolId);
    return `<button class="tool-nav-btn" data-tool="${tool.id}" title="${tool.title}">${tool.label}</button>`;
  }).join('');
}

function renderToolCards() {
  return TOOL_ORDER.map((toolId) => {
    const tool = getToolDefinition(toolId);
    return `
      <button class="tool-card" data-tool="${tool.id}">
        <span class="tool-card-label">${tool.label}</span>
        <strong>${tool.title}</strong>
        <p>${tool.view === 'composer' ? 'Compose, convert, and continue editing in the same workspace.' : 'Open inside the unified workspace and keep your output chained.'}</p>
      </button>
    `;
  }).join('');
}

function toolOptionsHTML() {
  return `
    <section class="tool-options" id="options-merge">
      <p class="tool-desc">Build a merged document from the PDFs in the left rail.</p>
      <div class="action-bar flex-col">
        <button class="btn-primary w-full" id="mergeBtn" disabled>Merge PDFs</button>
        <button class="btn-secondary w-full" id="mergeClearBtn">Clear imported PDFs</button>
      </div>
    </section>

    <section class="tool-options" id="options-split">
      <p class="tool-desc">Select pages in the canvas, then extract them or split every page.</p>
      <div class="option-group">
        <label for="splitMode">Mode</label>
        <select id="splitMode" class="w-full">
          <option value="selected">Extract selected pages</option>
          <option value="all">Split all pages</option>
        </select>
      </div>
      <div class="action-bar flex-col">
        <button class="btn-primary w-full" id="splitBtn" disabled>Run Split</button>
        <button class="btn-secondary w-full" id="splitSelectAll">Select all</button>
        <button class="btn-secondary w-full" id="splitDeselectAll">Clear selection</button>
      </div>
    </section>

    <section class="tool-options" id="options-compress">
      <p class="tool-desc">Create a smaller version of the current working PDF.</p>
      <div class="action-bar flex-col">
        <button class="btn-primary w-full" id="compressBtn" disabled>Compress PDF</button>
      </div>
    </section>

    <section class="tool-options" id="options-organize">
      <p class="tool-desc">Reorder, rotate, and remove pages from the current document.</p>
      <div class="editor-toolbar flex-col">
        <button id="organizeRotateCW" class="w-full">Rotate 90</button>
        <button id="organizeRotateCCW" class="w-full">Rotate -90</button>
        <button id="organizeDelete" class="w-full">Delete selected</button>
      </div>
      <div class="action-bar flex-col">
        <button class="btn-primary w-full" id="organizeBtn" disabled>Apply Changes</button>
      </div>
    </section>

    <section class="tool-options" id="options-addtext">
      <p class="tool-desc">Annotate the current page with text or freehand strokes.</p>
      <div class="editor-toolbar flex-col">
        <button class="active w-full" id="addtextModeText">Text Mode</button>
        <button class="w-full" id="addtextModeDraw">Draw Mode</button>
      </div>
      <div class="option-group">
        <label for="addtextColor">Color</label>
        <input type="color" id="addtextColor" value="#111111" class="w-full">
      </div>
      <div class="option-group">
        <label for="addtextSize">Size / Thickness</label>
        <input type="range" id="addtextSize" min="8" max="48" value="16" class="w-full">
      </div>
      <div class="option-group">
        <label for="addtextPage">Page</label>
        <select id="addtextPage" class="w-full"></select>
      </div>
      <div class="action-bar flex-col">
        <button class="btn-primary w-full" id="addtextBtn" disabled>Save Annotations</button>
        <button class="btn-secondary w-full" id="addtextUndoBtn">Undo Last</button>
      </div>
    </section>

    <section class="tool-options" id="options-pagenums">
      <p class="tool-desc">Stamp page numbers onto the current working document.</p>
      <div class="option-group">
        <label for="pagenumsPosition">Position</label>
        <select id="pagenumsPosition" class="w-full">
          <option value="bottom-center">Bottom Center</option>
          <option value="bottom-right">Bottom Right</option>
          <option value="bottom-left">Bottom Left</option>
          <option value="top-center">Top Center</option>
          <option value="top-right">Top Right</option>
        </select>
      </div>
      <div class="option-group">
        <label for="pagenumsStart">Start From</label>
        <input type="number" id="pagenumsStart" value="1" min="1" class="w-full">
      </div>
      <div class="option-group">
        <label for="pagenumsFormat">Format</label>
        <select id="pagenumsFormat" class="w-full">
          <option value="plain">1, 2, 3</option>
          <option value="dash">- 1 -, - 2 -</option>
          <option value="page">Page 1, Page 2</option>
          <option value="of">1 of N, 2 of N</option>
        </select>
      </div>
      <div class="action-bar flex-col">
        <button class="btn-primary w-full" id="pagenumsBtn" disabled>Apply Numbers</button>
      </div>
    </section>

    <section class="tool-options" id="options-watermark">
      <p class="tool-desc">Apply a centered diagonal watermark to every page.</p>
      <div class="option-group">
        <label for="watermarkText">Watermark Text</label>
        <input type="text" id="watermarkText" value="CONFIDENTIAL" class="w-full">
      </div>
      <div class="option-group">
        <label for="watermarkOpacity">Opacity</label>
        <select id="watermarkOpacity" class="w-full">
          <option value="0.1">Light (10%)</option>
          <option value="0.2" selected>Medium (20%)</option>
          <option value="0.35">Heavy (35%)</option>
        </select>
      </div>
      <div class="action-bar flex-col">
        <button class="btn-primary w-full" id="watermarkBtn" disabled>Apply Watermark</button>
      </div>
    </section>

    <section class="tool-options" id="options-encrypt">
      <p class="tool-desc">Protect the working PDF with a password.</p>
      <div class="option-group">
        <label for="encryptPassword">Password</label>
        <input type="password" id="encryptPassword" placeholder="Enter password" class="w-full">
      </div>
      <div class="option-group">
        <label for="encryptPasswordConfirm">Confirm Password</label>
        <input type="password" id="encryptPasswordConfirm" placeholder="Confirm password" class="w-full">
      </div>
      <div class="action-bar flex-col">
        <button class="btn-primary w-full" id="encryptBtn" disabled>Encrypt PDF</button>
      </div>
    </section>

    <section class="tool-options" id="options-extract">
      <p class="tool-desc">Extract visible text into the composer view.</p>
      <div class="action-bar flex-col">
        <button class="btn-primary w-full" id="extractBtn" disabled>Extract Text</button>
        <button class="btn-secondary w-full" id="extractCopyBtn" disabled>Copy Text</button>
      </div>
    </section>

    <section class="tool-options" id="options-pdf2jpg">
      <p class="tool-desc">Export each page as a JPG file.</p>
      <div class="option-group">
        <label for="pdf2jpgQuality">Quality</label>
        <select id="pdf2jpgQuality" class="w-full">
          <option value="1">Standard (72 DPI)</option>
          <option value="2" selected>High (150 DPI)</option>
          <option value="3">Maximum (216 DPI)</option>
        </select>
      </div>
      <div class="action-bar flex-col">
        <button class="btn-primary w-full" id="pdf2jpgBtn" disabled>Convert to JPG</button>
      </div>
    </section>

    <section class="tool-options" id="options-img2pdf">
      <p class="tool-desc">Import images, arrange them in the left rail, and create a PDF.</p>
      <div class="action-bar flex-col">
        <button class="btn-primary w-full" id="img2pdfBtn" disabled>Create PDF</button>
        <button class="btn-secondary w-full" id="img2pdfClearBtn">Clear Images</button>
      </div>
    </section>

    <section class="tool-options" id="options-html2pdf">
      <p class="tool-desc">Compose or import HTML, then generate a PDF into the workspace.</p>
      <div class="action-bar flex-col">
        <button class="btn-primary w-full" id="html2pdfBtn">Convert to PDF</button>
      </div>
    </section>
  `;
}

export function renderApp() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <header class="site-header" id="siteHeader">
      <div class="logo" id="logoBtn">pdf<span>kit</span></div>
      <nav id="mainNav">
        <button class="active" data-section="workspace">Workspace</button>
        <button data-section="tools">Tools</button>
        <button data-section="privacy">Privacy</button>
      </nav>
    </header>

    <div id="homeView">
      <section class="hero" id="section-workspace">
        <h1>One workspace for every PDF edit.</h1>
        <p>Import once, switch tools instantly, and keep building on the same working document without bouncing between separate pages.</p>
        <div class="hero-actions">
          <button class="btn-primary hero-cta" id="launchWorkspaceBtn">Open Workspace</button>
        </div>
      </section>

      <section class="tools-showcase" id="section-tools">
        <div class="section-label">Workspace Tools</div>
        <div class="tool-grid">${renderToolCards()}</div>
      </section>

      <section class="info-card" id="section-privacy">
        <div class="section-label">Privacy</div>
        <p>Your files stay in the browser. Every import, conversion, and edit runs locally on your device, and nothing is uploaded to a server.</p>
      </section>
    </div>

    <div id="appView" style="display:none;">
      <header class="editor-header">
        <div class="editor-header-left">
          <button class="back-btn" id="editorBackBtn" data-back>Home</button>
          <div class="editor-tool-nav">${renderToolNav()}</div>
        </div>
        <div class="editor-header-right">
          <button class="btn-secondary" id="workspaceImportBtn">Import PDF</button>
          <input type="file" id="workspaceImportInput" hidden>
          <button class="btn-primary" id="workspaceDownloadBtn" disabled>Download</button>
        </div>
      </header>

      <div class="editor-layout">
        <aside class="editor-sidebar-left">
          <div class="sidebar-header" id="workspaceSidebarTitle">Sources</div>
          <div class="sidebar-content" id="workspaceSidebarList"></div>
        </aside>

        <main class="editor-main" id="editorMain">
          <div class="workspace-stage" data-view="empty">
            <div class="workspace-drop-wrap">
              <label class="drop-zone global-drop-zone" id="globalDropZone">
                <input type="file" id="globalFileInput" hidden>
                <div class="drop-zone-icon">PDF</div>
                <h3 id="workspaceDropTitle">Drop files here</h3>
                <p id="workspaceDropCopy">or click to browse</p>
              </label>
              <div class="workspace-intro" id="workspaceIntro">
                <div class="workspace-kicker">Unified workspace</div>
                <h2 id="workspaceHeadline">Import a document to start editing</h2>
                <p id="workspaceDescription">Tools share the same shell, the same working document, and the same export area.</p>
              </div>
            </div>
            <div id="editorCenterCanvas" style="display:none;"></div>
          </div>
        </main>

        <aside class="editor-sidebar-right">
          <div class="sidebar-header" id="toolOptionsTitle">Options</div>
          <div class="sidebar-content" id="toolOptionsContainer">${toolOptionsHTML()}</div>
          <div class="sidebar-footer" id="toolActionContainer">
            <div class="progress-bar global-progress" id="globalProgress"><div class="progress-bar-fill"></div></div>
            <div class="result-info" id="globalResultInfo"></div>
            <div class="workspace-export-list" id="workspaceDownloads"></div>
          </div>
        </aside>
      </div>
    </div>

    <footer id="homeFooter">
      <p>pdfkit runs locally in your browser. Import once, edit continuously, and download when you are ready.</p>
    </footer>
  `;
}

export function showHome() {
  window.location.hash = '';
  document.getElementById('homeView').style.display = 'block';
  document.getElementById('siteHeader').style.display = 'flex';
  document.getElementById('homeFooter').style.display = 'block';
  document.getElementById('appView').style.display = 'none';
}

export function openTool(tool = DEFAULT_TOOL) {
  const resolvedTool = getToolDefinition(tool) ? tool : DEFAULT_TOOL;
  document.getElementById('homeView').style.display = 'none';
  document.getElementById('siteHeader').style.display = 'none';
  document.getElementById('homeFooter').style.display = 'none';
  document.getElementById('appView').style.display = 'flex';

  document.querySelectorAll('.tool-options').forEach((panel) => {
    panel.style.display = 'none';
  });
  document.querySelectorAll('.tool-nav-btn').forEach((button) => {
    button.classList.toggle('active', button.dataset.tool === resolvedTool);
  });

  const activePanel = document.getElementById(`options-${resolvedTool}`);
  if (activePanel) activePanel.style.display = 'block';
  document.getElementById('toolOptionsTitle').textContent = getToolDefinition(resolvedTool).title;
  setActiveTool(resolvedTool);
}

function updateImportControl() {
  const tool = getToolDefinition(EditorState.activeTool) || getToolDefinition(DEFAULT_TOOL);
  const input = document.getElementById('workspaceImportInput');
  const globalInput = document.getElementById('globalFileInput');
  const button = document.getElementById('workspaceImportBtn');
  const dropTitle = document.getElementById('workspaceDropTitle');

  button.textContent = tool.importLabel;
  input.accept = tool.accept;
  input.multiple = tool.multiple;
  globalInput.accept = tool.accept;
  globalInput.multiple = tool.multiple;
  dropTitle.textContent = `Drop ${tool.label.toLowerCase()} input here`;
}

function renderSidebarList() {
  const title = document.getElementById('workspaceSidebarTitle');
  const list = document.getElementById('workspaceSidebarList');
  const items = getSidebarItems();

  if (EditorState.activeTool === 'merge') title.textContent = 'Imported PDFs';
  else if (EditorState.activeTool === 'img2pdf') title.textContent = 'Imported Images';
  else if (EditorState.activeTool === 'html2pdf') title.textContent = 'Imported HTML';
  else title.textContent = 'Working Document';

  if (!items.length) {
    if (EditorState.workingDocument) {
      const doc = EditorState.workingDocument;
      list.innerHTML = `
        <div class="workspace-card">
          <div class="workspace-card-title">${doc.name}</div>
          <div class="workspace-card-meta">${formatSize(doc.size)}${doc.pageCount ? ` - ${doc.pageCount} pages` : ''}</div>
        </div>
      `;
      return;
    }

    list.innerHTML = '<p class="sidebar-empty">No imported items yet.</p>';
    return;
  }

  list.innerHTML = items.map((item, index) => `
    <div class="file-item" draggable="${EditorState.activeTool === 'merge' || EditorState.activeTool === 'img2pdf'}" data-kind="${item.kind}" data-index="${index}" data-id="${item.id}">
      <span class="file-icon">${item.kind.toUpperCase()}</span>
      <div class="file-stack">
        <span class="file-name">${item.name}</span>
        <span class="file-size">${formatSize(item.size || 0)}</span>
      </div>
      <button class="file-remove" data-remove-id="${item.id}">x</button>
    </div>
  `).join('');

  list.querySelectorAll('[data-remove-id]').forEach((button) => {
    button.addEventListener('click', () => {
      if (EditorState.activeTool === 'merge') {
        const removeIndex = items.findIndex((entry) => entry.id === button.dataset.removeId);
        removeFile(removeIndex);
      } else {
        removeSourceItem(button.dataset.removeId);
      }
    });
  });

  list.querySelectorAll('.file-item[draggable="true"]').forEach((item) => {
    item.addEventListener('dragstart', (event) => {
      event.dataTransfer.setData('text/plain', item.dataset.index);
      item.classList.add('dragging');
    });
    item.addEventListener('dragend', () => item.classList.remove('dragging'));
    item.addEventListener('dragover', (event) => {
      event.preventDefault();
      item.classList.add('drag-over');
    });
    item.addEventListener('dragleave', () => item.classList.remove('drag-over'));
    item.addEventListener('drop', (event) => {
      event.preventDefault();
      item.classList.remove('drag-over');
      const fromIndex = parseInt(event.dataTransfer.getData('text/plain'), 10);
      const toIndex = parseInt(item.dataset.index, 10);
      reorderSourceItems(fromIndex, toIndex, item.dataset.kind);
    });
  });
}

function updateWorkspaceStage() {
  const stage = document.querySelector('.workspace-stage');
  const intro = document.getElementById('workspaceIntro');
  const drop = document.getElementById('globalDropZone');
  const canvas = document.getElementById('editorCenterCanvas');
  const tool = getToolDefinition(EditorState.activeTool);
  const hasCanvasContent = canvas.innerHTML.trim().length > 0;
  const hasPrimaryContent = Boolean(EditorState.workingDocument) || getSidebarItems().length > 0;

  stage.dataset.view = EditorState.workspaceView;
  document.getElementById('workspaceHeadline').textContent = EditorState.workingDocument
    ? `${tool.title} in a unified workspace`
    : `Import input for ${tool.title}`;

  if (!hasPrimaryContent && !hasCanvasContent) {
    intro.style.display = 'block';
    drop.style.display = 'flex';
    canvas.style.display = 'none';
    return;
  }

  intro.style.display = 'none';
  drop.style.display = tool.id === 'merge' || tool.id === 'img2pdf' || tool.id === 'html2pdf' ? 'flex' : 'none';
  canvas.style.display = 'block';
}

function updateExportArea() {
  const button = document.getElementById('workspaceDownloadBtn');
  const info = document.getElementById('globalResultInfo');
  const downloads = document.getElementById('workspaceDownloads');
  const result = EditorState.result;

  downloads.innerHTML = '';
  info.textContent = '';

  if (!result) {
    button.disabled = true;
    button.onclick = null;
    return;
  }

  info.textContent = result.label || '';

  if (result.kind === 'single' && result.blob) {
    button.disabled = false;
    button.textContent = 'Download';
    button.onclick = () => downloadBlob(result.blob, result.filename || 'download');
    return;
  }

  if (result.kind === 'multiple') {
    button.disabled = result.downloads.length === 0;
    button.textContent = result.primaryLabel || 'Download All';
    button.onclick = () => {
      result.downloads.forEach((entry, index) => {
        setTimeout(() => downloadBlob(entry.blob, entry.filename), index * 120);
      });
    };
    downloads.innerHTML = result.downloads.map((entry) => `
      <button class="btn-secondary w-full workspace-download-item" data-download="${entry.filename}">
        ${entry.label}
      </button>
    `).join('');
    downloads.querySelectorAll('[data-download]').forEach((downloadButton, index) => {
      downloadButton.addEventListener('click', () => {
        const entry = result.downloads[index];
        downloadBlob(entry.blob, entry.filename);
      });
    });
    return;
  }

  button.disabled = true;
  button.onclick = null;
}

export function initWorkspaceChrome() {
  document.getElementById('workspaceImportBtn').addEventListener('click', () => {
    document.getElementById('workspaceImportInput').click();
  });

  document.getElementById('globalDropZone').addEventListener('click', () => {
    document.getElementById('globalFileInput').click();
  });

  document.getElementById('mergeClearBtn').addEventListener('click', () => clearSourceItems('pdf'));
  document.getElementById('img2pdfClearBtn').addEventListener('click', () => clearSourceItems('image'));

  const refresh = () => {
    updateImportControl();
    renderSidebarList();
    updateWorkspaceStage();
    updateExportArea();
  };

  EditorEvents.on('toolChanged', refresh);
  EditorEvents.on('filesChanged', refresh);
  EditorEvents.on('sourceItemsChanged', refresh);
  EditorEvents.on('workingDocumentChanged', refresh);
  EditorEvents.on('resultChanged', refresh);
  EditorEvents.on('workspaceViewChanged', refresh);

  refresh();
}

export function initNav() {
  document.getElementById('logoBtn').addEventListener('click', showHome);
  document.getElementById('launchWorkspaceBtn').addEventListener('click', () => {
    window.location.hash = `#app/${DEFAULT_TOOL}`;
  });

  document.querySelectorAll('#mainNav button').forEach((button) => {
    button.addEventListener('click', () => {
      document.querySelectorAll('#mainNav button').forEach((entry) => entry.classList.remove('active'));
      button.classList.add('active');
      const target = document.getElementById(`section-${button.dataset.section}`);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  document.querySelectorAll('[data-tool]').forEach((trigger) => {
    trigger.addEventListener('click', () => {
      window.location.hash = `#app/${trigger.dataset.tool}`;
    });
  });

  document.querySelectorAll('[data-back]').forEach((button) => button.addEventListener('click', showHome));

  function handleHashChange() {
    if (window.location.hash.startsWith('#app/')) {
      openTool(window.location.hash.replace('#app/', ''));
    } else {
      showHome();
    }
  }

  window.addEventListener('hashchange', handleHashChange);
  handleHashChange();
}
