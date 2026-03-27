/**
 * App.js — Renders the full app HTML and handles navigation.
 */

/**
 * Render the entire app shell into #app.
 */
export function renderApp() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <!-- HEADER -->
    <header>
      <div class="logo" id="logoBtn">pdf<span>kit</span></div>
      <nav id="mainNav">
        <button class="active" data-section="essentials">Essentials</button>
        <button data-section="edit">Edit & Organize</button>
        <button data-section="convert">Convert</button>
        <button data-section="howitworks">How does it Work?</button>
        <button data-section="support">Sponsor</button>
      </nav>
    </header>

    <!-- HOME VIEW -->
    <div id="homeView">
      <section class="hero">
        <h1>Free PDF tools,<br><em>no nonsense</em></h1>
        <p>Merge, split, compress, convert, and edit PDFs right in your browser. No uploads to servers. No watermarks. No sign-up.</p>
        <div class="hero-badges">
          <span>No watermark</span>
          <span>Files stay on device</span>
          <span>Works offline</span>
          <span>100% free</span>
        </div>
      </section>

      <div class="tools-container">
        <!-- ESSENTIALS -->
        <div class="tool-section" id="section-essentials">
          <div class="section-label">Essentials</div>
          <div class="tool-grid">
            <div class="tool-card" data-tool="merge" style="--card-accent: var(--accent); --icon-bg: rgba(255,107,74,0.12)">
              <div class="tool-icon">📎</div>
              <h3>Merge PDFs</h3>
              <p>Combine multiple PDFs into one. Drag to reorder.</p>
            </div>
            <div class="tool-card" data-tool="split" style="--card-accent: var(--blue); --icon-bg: rgba(96,165,250,0.12)">
              <div class="tool-icon">✂️</div>
              <h3>Split PDF</h3>
              <p>Extract specific pages or split into individual pages.</p>
            </div>
            <div class="tool-card" data-tool="compress" style="--card-accent: var(--green); --icon-bg: rgba(74,222,128,0.12)">
              <div class="tool-icon">📦</div>
              <h3>Compress PDF</h3>
              <p>Reduce file size while keeping quality.</p>
            </div>
          </div>
        </div>

        <!-- CONVERT -->
        <div class="tool-section" id="section-convert">
          <div class="section-label">Convert</div>
          <div class="tool-grid">
            <div class="tool-card" data-tool="pdf2jpg" style="--card-accent: var(--yellow); --icon-bg: rgba(251,191,36,0.12)">
              <div class="tool-icon">🖼️</div>
              <h3>PDF to JPG</h3>
              <p>Convert PDF pages to high-quality images.</p>
            </div>
            <div class="tool-card" data-tool="img2pdf" style="--card-accent: var(--purple); --icon-bg: rgba(167,139,250,0.12)">
              <div class="tool-icon">📷</div>
              <h3>Images to PDF</h3>
              <p>Convert JPG, PNG images into a single PDF.</p>
            </div>
            <div class="tool-card" data-tool="html2pdf" style="--card-accent: var(--pink); --icon-bg: rgba(244,114,182,0.12)">
              <div class="tool-icon">🌐</div>
              <h3>HTML to PDF</h3>
              <p>Convert HTML code into a PDF document.</p>
            </div>
          </div>
        </div>

        <!-- EDIT & ORGANIZE -->
        <div class="tool-section" id="section-edit">
          <div class="section-label">Edit & Organize</div>
          <div class="tool-grid">
            <div class="tool-card" data-tool="organize" style="--card-accent: var(--blue); --icon-bg: rgba(96,165,250,0.12)">
              <div class="tool-icon">🔀</div>
              <h3>Organize Pages</h3>
              <p>Reorder, rotate, or delete pages visually.</p>
            </div>
            <div class="tool-card" data-tool="addtext" style="--card-accent: var(--accent); --icon-bg: rgba(255,107,74,0.12)">
              <div class="tool-icon">✏️</div>
              <h3>Add Text / Sign</h3>
              <p>Add text, annotations, or draw a signature on any PDF.</p>
            </div>
            <div class="tool-card" data-tool="pagenums" style="--card-accent: var(--purple); --icon-bg: rgba(167,139,250,0.12)">
              <div class="tool-icon">🔢</div>
              <h3>Page Numbers</h3>
              <p>Add page numbers with custom formatting.</p>
            </div>
            <div class="tool-card" data-tool="watermark" style="--card-accent: var(--green); --icon-bg: rgba(74,222,128,0.12)">
              <div class="tool-icon">💧</div>
              <h3>Add Watermark</h3>
              <p>Protect docs with text watermarks.</p>
            </div>
            <div class="tool-card" data-tool="encrypt" style="--card-accent: var(--yellow); --icon-bg: rgba(251,191,36,0.12)">
              <div class="tool-icon">🔒</div>
              <h3>Encrypt PDF</h3>
              <p>Password-protect your PDF files.</p>
            </div>
            <div class="tool-card" data-tool="extract" style="--card-accent: var(--pink); --icon-bg: rgba(244,114,182,0.12)">
              <div class="tool-icon">📝</div>
              <h3>Extract Text</h3>
              <p>Copy all text content from a PDF.</p>
            </div>
          </div>
        </div>
      


        <!-- HOW DOES IT WORK -->
        <div class="tool-section" id="section-howitworks">
          <div class="section-label">How does it Work?</div>
          <div class="info-card">
            <p style="font-size:15px;font-weight:600;color:var(--text);margin-bottom:14px">Your files never leave your device. Ever.</p>
            <p>Most online PDF tools work by sending your file to a server, processing it there, and sending it back. That means your documents pass through someone else's computer — which is a problem if they contain anything sensitive.</p>
            <p style="margin-top:12px">pdfkit works differently. When you drop a file in, your browser reads it directly into memory on your machine. All the processing happens right there in your browser tab. When it is done, your file is ready to download, and nothing was ever sent anywhere.</p>
            <p style="margin-top:12px">Close the tab and it is all gone. No copies stored. No servers involved. You can even go offline after the page loads and everything still works.</p>
            <p style="margin-top:16px;font-size:15px;font-weight:600;color:var(--text)">Your files are yours. We never see them.</p>
          </div>
        </div>

        <!-- SUPPORT -->
        <div class="tool-section" id="section-support">
          <div class="section-label">Sponsor</div>
          <div class="info-card">
            <p>pdfkit is free and open-source. If it has been useful to you, consider supporting its development via GitHub Sponsors.</p>
            <a href="https://github.com/sponsors/viveknaskar" target="_blank" rel="noopener" class="btn-sponsor">
              ❤️ Sponsor on GitHub
            </a>
          </div>
        </div>
      </div>
    </div>

    <!-- Editor (with a sidebar, primarily) -->
    <!-- EDITOR (Unified Workspace) -->
    <div id="appView" style="display: none;">
      
      <!-- EDITOR TOP HEADER -->
      <header class="editor-header">
        <div class="editor-header-left">
          <button class="back-btn" id="editorBackBtn" data-back title="Back to Home">← Home</button>
          <div class="editor-tool-nav">
             <button class="tool-nav-btn" data-tool="merge" title="Merge PDFs">📎 Merge</button>
             <button class="tool-nav-btn" data-tool="split" title="Split PDF">✂️ Split</button>
             <button class="tool-nav-btn" data-tool="compress" title="Compress PDF">📦 Compress</button>
             <button class="tool-nav-btn" data-tool="organize" title="Organize Pages">🔀 Organize</button>
             <button class="tool-nav-btn" data-tool="addtext" title="Add Text/Sign">✏️ Add Text</button>
             <button class="tool-nav-btn" data-tool="pagenums" title="Page Numbers">🔢 Page Nums</button>
             <button class="tool-nav-btn" data-tool="watermark" title="Watermark">💧 Watermark</button>
             <button class="tool-nav-btn" data-tool="encrypt" title="Encrypt PDF">🔒 Encrypt</button>
             <button class="tool-nav-btn" data-tool="extract" title="Extract Text">📝 Extract Text</button>
             <button class="tool-nav-btn" data-tool="pdf2jpg" title="PDF to JPG">🖼️ PDF to JPG</button>
          </div>
        </div>
        <div class="editor-header-right">
           <button class="convert-popup-btn" data-popup="img2pdf">📷 Images to PDF</button>
           <button class="convert-popup-btn" data-popup="html2pdf">🌐 HTML to PDF</button>
        </div>
      </header>
      
      <!-- EDITOR LAYOUT -->
      <div class="editor-layout">
        
        <!-- LEFT PANEL: Files / Pages -->
        <aside class="editor-sidebar-left">
           <div class="sidebar-header">Files / Pages</div>
           <div class="sidebar-content" id="globalFileList">
              <!-- Dynamically populated by EditorState/Tools -->
           </div>
        </aside>

        <!-- CENTER: Main Workspace -->
        <main class="editor-main" id="editorMain">
           <!-- Global Upload Zone -->
           <div class="drop-zone global-drop-zone active" id="globalDropZone">
             <input type="file" accept=".pdf" multiple id="globalFileInput">
             <div class="drop-zone-icon">📄</div>
             <h3>Drop PDF files here</h3>
             <p>or click to browse</p>
           </div>
           
           <!-- Center viewer/canvas (used by Add Text, Organize, etc) -->
           <div id="editorCenterCanvas" style="display: none;"></div>
        </main>

        <!-- RIGHT PANEL: Tool Options -->
        <aside class="editor-sidebar-right">
           <div class="sidebar-header" id="toolOptionsTitle">Options</div>
           <div class="sidebar-content" id="toolOptionsContainer">
              ${toolOptionsHTML()}
           </div>
           <div class="sidebar-footer" id="toolActionContainer">
              <!-- Shared progress and result info -->
              <div class="progress-bar global-progress" id="globalProgress" style="display:none;"><div class="progress-bar-fill"></div></div>
              <div class="result-info" id="globalResultInfo" style="margin-bottom:8px; display:none; font-size:13px; color:var(--green);"></div>
              
              <!-- Action buttons will be displayed here based on active tool -->
           </div>
        </aside>
      </div>

    </div>

    <!-- POPUP MODALS -->
    <div class="modal-overlay" id="convertModalOverlay" style="display:none;">
       <div class="modal-container">
          <button class="modal-close" id="convertModalClose">&times;</button>
          <div id="convertModalContent">
             ${popupConvertHTML()}
          </div>
       </div>
    </div>

    <footer id="homeFooter">
      <p>pdfkit — All processing happens in your browser. Your files never leave your device.</p>
    </footer>
  `;
}

/**
 * HTML for right panel tool options
 */
function toolOptionsHTML() {
  return `
    <!-- MERGE OPTIONS -->
    <div class="tool-options" id="options-merge">
      <p class="tool-desc">Combine multiple files. Drag pages/files in the left panel to reorder.</p>
      <div class="action-bar flex-col" style="margin-top:20px;">
        <button class="btn-primary w-full" id="mergeBtn" disabled>Merge PDFs</button>
        <button class="btn-secondary w-full" id="mergeClearBtn">Clear All</button>
        <button class="btn-primary w-full" id="mergeDownload" style="display:none;">Download Merged</button>
      </div>
    </div>

    <!-- SPLIT OPTIONS -->
    <div class="tool-options" id="options-split">
      <p class="tool-desc">Extract pages or split into individual files.</p>
      <div class="option-group">
        <label>Mode</label>
        <select id="splitMode" class="w-full">
          <option value="selected">Extract selected pages</option>
          <option value="all">Split all pages</option>
        </select>
      </div>
      <div class="action-bar flex-col" style="margin-top:20px;">
        <button class="btn-primary w-full" id="splitBtn" disabled>Split / Extract</button>
        <button class="btn-secondary w-full" id="splitSelectAll">Select all</button>
        <button class="btn-secondary w-full" id="splitDeselectAll">Deselect all</button>
        <div id="splitDownloads" style="width:100%; display:flex; flex-direction:column; gap:8px;"></div>
      </div>
    </div>

    <!-- COMPRESS OPTIONS -->
    <div class="tool-options" id="options-compress">
      <p class="tool-desc">Reduce PDF file size while keeping quality.</p>
      <div class="action-bar flex-col" style="margin-top:20px;">
        <button class="btn-primary w-full" id="compressBtn" disabled>Compress PDF</button>
        <button class="btn-primary w-full" id="compressDownload" style="display:none;">Download Compressed</button>
      </div>
    </div>

    <!-- ORGANIZE OPTIONS -->
    <div class="tool-options" id="options-organize">
      <p class="tool-desc">Select pages to rotate or delete.</p>
      <div class="editor-toolbar flex-col">
        <button id="organizeRotateCW" class="w-full">↻ Rotate 90°</button>
        <button id="organizeRotateCCW" class="w-full">↺ Rotate -90°</button>
        <button id="organizeDelete" class="w-full" style="color:var(--pink); border-color:rgba(244,114,182,0.3);">🗑 Delete selected</button>
      </div>
      <div class="action-bar flex-col" style="margin-top:20px;">
        <button class="btn-primary w-full" id="organizeBtn" disabled>Save Changes</button>
        <button class="btn-primary w-full" id="organizeDownload" style="display:none;">Download PDF</button>
      </div>
    </div>

    <!-- ADD TEXT OPTIONS -->
    <div class="tool-options" id="options-addtext">
      <p class="tool-desc">Add text and drawings.</p>
      <div class="editor-toolbar flex-col">
        <button class="active w-full" id="addtextModeText">✏️ Text Mode</button>
        <button class="w-full" id="addtextModeDraw">🖊 Draw Mode</button>
        
        <div class="option-group" style="margin-top:12px;">
          <label>Color</label>
          <input type="color" id="addtextColor" value="#000000" class="w-full h-8">
        </div>
        <div class="option-group">
          <label>Size / Thickness</label>
          <input type="range" id="addtextSize" min="8" max="48" value="16" class="w-full">
        </div>
        <div class="option-group">
          <label>Active Page</label>
          <select id="addtextPage" class="w-full"></select>
        </div>
      </div>
      <div class="action-bar flex-col" style="margin-top:20px;">
        <button class="btn-primary w-full" id="addtextBtn" disabled>Save Annotations</button>
        <button class="btn-secondary w-full" id="addtextUndoBtn">Undo Last</button>
        <button class="btn-primary w-full" id="addtextDownload" style="display:none;">Download PDF</button>
      </div>
    </div>

    <!-- PAGE NUMBERS OPTIONS -->
    <div class="tool-options" id="options-pagenums">
      <p class="tool-desc">Add page numbers to the document.</p>
      <div class="option-group">
        <label>Position</label>
        <select id="pagenumsPosition" class="w-full">
          <option value="bottom-center">Bottom Center</option>
          <option value="bottom-right">Bottom Right</option>
          <option value="bottom-left">Bottom Left</option>
          <option value="top-center">Top Center</option>
          <option value="top-right">Top Right</option>
        </select>
      </div>
      <div class="option-group">
        <label>Start from</label>
        <input type="number" id="pagenumsStart" value="1" min="1" class="w-full">
      </div>
      <div class="option-group">
        <label>Format</label>
        <select id="pagenumsFormat" class="w-full">
          <option value="plain">1, 2, 3</option>
          <option value="dash">- 1 -, - 2 -</option>
          <option value="page">Page 1, Page 2</option>
          <option value="of">1 of N, 2 of N</option>
        </select>
      </div>
      <div class="action-bar flex-col" style="margin-top:20px;">
        <button class="btn-primary w-full" id="pagenumsBtn" disabled>Apply Numbers</button>
        <button class="btn-primary w-full" id="pagenumsDownload" style="display:none;">Download PDF</button>
      </div>
    </div>

    <!-- WATERMARK OPTIONS -->
    <div class="tool-options" id="options-watermark">
      <p class="tool-desc">Stamp document with text.</p>
      <div class="option-group">
        <label>Watermark Text</label>
        <input type="text" id="watermarkText" value="CONFIDENTIAL" class="w-full">
      </div>
      <div class="option-group">
        <label>Opacity</label>
        <select id="watermarkOpacity" class="w-full">
          <option value="0.1">Light (10%)</option>
          <option value="0.2" selected>Medium (20%)</option>
          <option value="0.35">Heavy (35%)</option>
        </select>
      </div>
      <div class="action-bar flex-col" style="margin-top:20px;">
        <button class="btn-primary w-full" id="watermarkBtn" disabled>Apply Watermark</button>
        <button class="btn-primary w-full" id="watermarkDownload" style="display:none;">Download PDF</button>
      </div>
    </div>

    <!-- ENCRYPT OPTIONS -->
    <div class="tool-options" id="options-encrypt">
      <p class="tool-desc">Password protect PDF.</p>
      <div class="option-group">
        <label>Password</label>
        <input type="password" id="encryptPassword" placeholder="Enter password" class="w-full">
      </div>
      <div class="option-group">
        <label>Confirm Password</label>
        <input type="password" id="encryptPasswordConfirm" placeholder="Confirm password" class="w-full">
      </div>
      <div class="action-bar flex-col" style="margin-top:20px;">
        <button class="btn-primary w-full" id="encryptBtn" disabled>Encrypt PDF</button>
        <button class="btn-primary w-full" id="encryptDownload" style="display:none;">Download PDF</button>
      </div>
    </div>

    <!-- EXTRACT TEXT OPTIONS -->
    <div class="tool-options" id="options-extract">
      <p class="tool-desc">Copy document text.</p>
      <textarea id="extractedText" class="w-full" style="min-height:200px; background:var(--bg); border:1px solid var(--border); color:var(--text); font-family:var(--font-body); font-size:13px; padding:12px; border-radius:var(--radius-sm); resize:vertical; margin-top:12px;" readonly placeholder="Extracted text will appear here..."></textarea>
      <div class="action-bar flex-col" style="margin-top:20px;">
        <button class="btn-primary w-full" id="extractBtn" disabled>Extract Now</button>
        <button class="btn-secondary w-full" id="extractCopyBtn" disabled>Copy to Clipboard</button>
      </div>
    </div>

    <!-- PDF TO JPG OPTIONS -->
    <div class="tool-options" id="options-pdf2jpg">
      <p class="tool-desc">Convert PDF pages to JPGs.</p>
      <div class="option-group">
        <label>Quality</label>
        <select id="pdf2jpgQuality" class="w-full">
          <option value="1">Standard (72 DPI)</option>
          <option value="2" selected>High (150 DPI)</option>
          <option value="3">Maximum (216 DPI)</option>
        </select>
      </div>
      <div class="action-bar flex-col" style="margin-top:20px;">
        <button class="btn-primary w-full" id="pdf2jpgBtn" disabled>Convert to JPG</button>
        <div id="pdf2jpgDownloads" style="width:100%; display:flex; flex-direction:column; gap:8px;"></div>
      </div>
    </div>
  `;
}

/**
 * HTML for Popup modals (Images to PDF, HTML to PDF)
 */
function popupConvertHTML() {
  return `
    <div class="popup-view" id="popup-img2pdf" style="display:none;">
      <h2>Images to PDF</h2>
      <p class="mb-4 text-muted">Convert JPG or PNG images into a single PDF.</p>
      <div class="drop-zone" id="img2pdfDropZone">
        <input type="file" accept="image/jpeg,image/png,image/webp" multiple id="img2pdfFileInput">
        <div class="drop-zone-icon">📷</div>
        <h3>Drop images here</h3>
        <p>JPG, PNG — add multiple</p>
      </div>
      <div class="file-list" id="img2pdfFileList" style="margin-top:16px;"></div>
      <div class="action-bar" id="img2pdfActions" style="display:none; justify-content:flex-end; margin-top:16px;">
        <button class="btn-secondary" id="img2pdfClearBtn">Clear All</button>
        <button class="btn-primary" id="img2pdfBtn">Create PDF</button>
        <button class="btn-primary" id="img2pdfDownload" style="display:none;">Download PDF</button>
      </div>
      <div class="progress-bar mt-2" id="img2pdfProgress" style="display:none;"><div class="progress-bar-fill"></div></div>
      <div class="result-info mt-2 text-green" id="img2pdfResultInfo"></div>
    </div>

    <div class="popup-view" id="popup-html2pdf" style="display:none;">
      <h2>HTML to PDF</h2>
      <p class="mb-4 text-muted">Paste HTML code and convert it to a PDF.</p>
      <textarea id="htmlInput" style="width:100%;min-height:220px;background:var(--bg-card);border:1px solid var(--border);color:var(--text);font-family:'DM Mono',monospace;font-size:13px;padding:12px;border-radius:var(--radius);resize:vertical;outline:none;" placeholder="Paste HTML here..."></textarea>
      <div class="action-bar" style="justify-content:flex-end; margin-top:16px;">
        <button class="btn-primary" id="html2pdfBtn">Convert to PDF</button>
        <button class="btn-primary" id="html2pdfDownload" style="display:none;">Download PDF</button>
      </div>
      <div class="progress-bar mt-2" id="html2pdfProgress" style="display:none;"><div class="progress-bar-fill"></div></div>
      <div class="result-info mt-2 text-green" id="html2pdfResultInfo"></div>
    </div>
  `;
}

/**
 * Show the home view, hide app view.
 */
export function showHome() {
  window.location.hash = '';
  document.getElementById('homeView').style.display = 'block';
  document.querySelector('header').style.display = 'flex';
  document.getElementById('homeFooter').style.display = 'block';
  
  document.getElementById('appView').style.display = 'none';
  window.scrollTo(0, 0);
}

/**
 * Open a specific tool view in the unified editor.
 */
export function openTool(tool) {
  // Popups
  if (tool === 'img2pdf' || tool === 'html2pdf') {
    const ensureLoaded = window.__ensureToolLoaded;
    if (typeof ensureLoaded === 'function') {
      ensureLoaded(tool).catch((err) => {
        console.error(`Failed to load tool "${tool}"`, err);
      });
    }

    document.getElementById('convertModalOverlay').style.display = 'flex';
    document.querySelectorAll('.popup-view').forEach(v => v.style.display = 'none');
    const popup = document.getElementById('popup-' + tool);
    if (popup) popup.style.display = 'block';
    
    // Auto-return hash to previous state to not stay on popup hash
    if (window.location.hash.startsWith('#app/')) {
       // We only clear it if we were on home, otherwise stay in editor
       if (document.getElementById('homeView').style.display === 'block') {
         window.location.hash = '';
       }
    }
    return;
  }

  // Hide home elements
  document.getElementById('homeView').style.display = 'none';
  document.querySelector('header').style.display = 'none';
  document.getElementById('homeFooter').style.display = 'none';
  
  // Show app view (unified editor)
  const appView = document.getElementById('appView');
  appView.style.display = 'flex'; 
  
  // Hide all tool options panels and deactivate nav buttons
  document.querySelectorAll('.tool-options').forEach(v => v.style.display = 'none');
  document.querySelectorAll('.tool-nav-btn').forEach(btn => btn.classList.remove('active'));
  
  // Activate selected tool nav button
  const activeBtn = document.querySelector(`.tool-nav-btn[data-tool="${tool}"]`);
  if (activeBtn) activeBtn.classList.add('active');

  // Show selected tool's right panel
  const optionsPanel = document.getElementById('options-' + tool);
  if (optionsPanel) {
    optionsPanel.style.display = 'block';
    // Update title
    document.getElementById('toolOptionsTitle').textContent = activeBtn ? activeBtn.getAttribute('title') : 'Options';
  }
  
  // Ensure tool code is loaded before emitting tool change so first render is immediate.
  const ensureLoaded = window.__ensureToolLoaded;
  const ready = typeof ensureLoaded === 'function' ? ensureLoaded(tool) : Promise.resolve();

  ready
    .catch((err) => {
      // Keep UI navigable, but make failures visible for debugging.
      console.error(`Failed to load tool "${tool}"`, err);
      const res = document.getElementById('globalResultInfo');
      if (res) {
        res.textContent = `Failed to load ${tool}. Please refresh and try again.`;
        res.style.display = 'block';
      }
    })
    .finally(() => {
      import('./EditorState.js').then(module => {
         module.setActiveTool(tool);
      });
    });
}

/**
 * Bind navigation event listeners. Call after renderApp().
 */
export function initNav() {
  // Logo → home
  document.getElementById('logoBtn').addEventListener('click', showHome);

  // Nav buttons → scroll to sections
  document.querySelectorAll('header nav button').forEach(btn => {
    btn.addEventListener('click', function () {
      if (window.location.hash.startsWith('#app/')) {
        showHome();
      }
      const section = this.dataset.section;
      document.querySelectorAll('header nav button').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      const el = document.getElementById('section-' + section);
      if (el) {
        setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
      }
    });
  });

  // Tool cards → open tool via hash
  document.querySelectorAll('.tool-card[data-tool]').forEach(card => {
    card.addEventListener('click', () => {
      window.location.hash = '#app/' + card.dataset.tool;
    });
  });

  // Editor Nav buttons
  document.querySelectorAll('.tool-nav-btn[data-tool]').forEach(btn => {
    btn.addEventListener('click', () => {
      window.location.hash = '#app/' + btn.dataset.tool;
    });
  });

  // Convert popup buttons
  document.querySelectorAll('.convert-popup-btn[data-popup]').forEach(btn => {
    btn.addEventListener('click', () => {
      openTool(btn.dataset.popup);
    });
  });

  // Close popup modal
  const closeBtn = document.getElementById('convertModalClose');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      document.getElementById('convertModalOverlay').style.display = 'none';
      if (window.location.hash.startsWith('#app/img2pdf') || window.location.hash.startsWith('#app/html2pdf')) {
        window.history.back(); // Go back to avoid staying on popup hash when closed
      }
    });
  }

  // Back buttons
  document.querySelectorAll('[data-back]').forEach(btn => {
    btn.addEventListener('click', showHome);
  });

  // Hash Router
  function handleHashChange() {
    const hash = window.location.hash;
    if (hash.startsWith('#app/')) {
      const tool = hash.replace('#app/', '');
      openTool(tool);
    } else {
      showHome();
    }
  }

  window.addEventListener('hashchange', handleHashChange);
  // Initial check
  handleHashChange();
}
