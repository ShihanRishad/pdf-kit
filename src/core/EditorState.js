import { getToolDefinition, DEFAULT_TOOL } from './ToolRegistry.js';

function normalizeBytes(bytes) {
  if (!bytes) return null;
  if (bytes instanceof Uint8Array) return bytes;
  if (bytes instanceof ArrayBuffer) return new Uint8Array(bytes);
  if (ArrayBuffer.isView(bytes)) return new Uint8Array(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
  throw new Error('Unsupported byte source.');
}

function makeId(prefix = 'item') {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export const EditorState = {
  activeTool: DEFAULT_TOOL,
  workspaceView: getToolDefinition(DEFAULT_TOOL).view,
  sourceItems: [],
  files: [],
  workingDocument: null,
  result: null,
};

export const EditorEvents = {
  listeners: {},
  on(event, callback) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);
  },
  emit(event, data) {
    if (!this.listeners[event]) return;
    this.listeners[event].forEach((callback) => callback(data));
  },
};

export function getSourceItemsByKind(kind) {
  return EditorState.sourceItems.filter((item) => item.kind === kind);
}

export function getWorkingDocument() {
  return EditorState.workingDocument;
}

export async function setWorkingDocument(bytes, options = {}) {
  const normalized = normalizeBytes(bytes);
  const pageCount = options.pageCount ?? EditorState.workingDocument?.pageCount ?? null;
  EditorState.workingDocument = {
    id: makeId('doc'),
    kind: 'pdf',
    name: options.name || 'document.pdf',
    bytes: normalized,
    size: options.size ?? normalized.byteLength,
    pageCount,
    source: options.source || 'workspace',
    updatedAt: Date.now(),
  };
  EditorEvents.emit('workingDocumentChanged', EditorState.workingDocument);
  return EditorState.workingDocument;
}

export async function setWorkingDocumentFromFile(file, options = {}) {
  const bytes = await file.arrayBuffer();
  return setWorkingDocument(bytes, {
    name: options.name || file.name,
    size: options.size ?? file.size,
    source: options.source || 'import',
    pageCount: options.pageCount,
  });
}

export function clearWorkingDocument() {
  EditorState.workingDocument = null;
  EditorEvents.emit('workingDocumentChanged', null);
}

export function setWorkspaceView(view) {
  if (EditorState.workspaceView === view) return;
  EditorState.workspaceView = view;
  EditorEvents.emit('workspaceViewChanged', view);
}

export function setActiveTool(tool) {
  if (!getToolDefinition(tool)) return;
  if (EditorState.activeTool === tool) return;
  EditorState.activeTool = tool;
  setWorkspaceView(getToolDefinition(tool).view);
  EditorEvents.emit('toolChanged', tool);
}

export function setResult(result) {
  EditorState.result = result;
  EditorEvents.emit('resultChanged', result);
}

export function clearResult() {
  setResult(null);
}

export async function commitPdfResult(bytes, options = {}) {
  const normalized = normalizeBytes(bytes);
  const filename = options.filename || 'document.pdf';
  const blob = new Blob([normalized], { type: 'application/pdf' });

  if (options.replaceWorkingDocument !== false) {
    await setWorkingDocument(normalized, {
      name: filename,
      size: normalized.byteLength,
      pageCount: options.pageCount,
      source: options.source || EditorState.activeTool,
    });
  }

  setResult({
    kind: 'single',
    fileType: 'pdf',
    label: options.label || `${filename} ready`,
    filename,
    size: normalized.byteLength,
    blob,
  });
}

export function setMultiResult(result) {
  setResult({
    kind: 'multiple',
    fileType: result.fileType || 'binary',
    label: result.label,
    primaryLabel: result.primaryLabel || 'Download All',
    downloads: result.downloads || [],
  });
}

export function clearSourceItems(kind = null) {
  if (kind) {
    EditorState.sourceItems = EditorState.sourceItems.filter((item) => item.kind !== kind);
    if (kind === 'pdf') EditorState.files = [];
  } else {
    EditorState.sourceItems = [];
    EditorState.files = [];
  }
  EditorEvents.emit('sourceItemsChanged', EditorState.sourceItems);
  EditorEvents.emit('filesChanged', EditorState.files);

  if (!kind || kind === 'pdf') {
    if (EditorState.files.length === 0) {
      clearWorkingDocument();
      clearResult();
    }
  }
}

export async function addFiles(newFiles, options = {}) {
  const kind = options.kind || 'pdf';
  const incoming = Array.from(newFiles || []);
  if (incoming.length === 0) return [];

  if (kind === 'pdf') {
    const pdfFiles = incoming.filter((file) => file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'));
    if (!pdfFiles.length) return [];

    const items = pdfFiles.map((file) => ({
      id: makeId('pdf'),
      kind: 'pdf',
      name: file.name,
      size: file.size,
      file,
    }));

    EditorState.sourceItems.push(...items);
    EditorState.files.push(...pdfFiles);
    EditorEvents.emit('sourceItemsChanged', EditorState.sourceItems);
    EditorEvents.emit('filesChanged', EditorState.files);

    if (!EditorState.workingDocument || EditorState.activeTool !== 'merge' || pdfFiles.length === 1) {
      await setWorkingDocumentFromFile(pdfFiles[pdfFiles.length - 1], { source: 'import' });
    }
    return items;
  }

  if (kind === 'image') {
    const imageFiles = incoming.filter((file) => file.type.startsWith('image/'));
    if (!imageFiles.length) return [];
    const items = imageFiles.map((file) => ({
      id: makeId('img'),
      kind: 'image',
      name: file.name,
      size: file.size,
      file,
    }));
    EditorState.sourceItems.push(...items);
    EditorEvents.emit('sourceItemsChanged', EditorState.sourceItems);
    return items;
  }

  if (kind === 'html') {
    const htmlFiles = incoming.filter((file) => file.name.toLowerCase().endsWith('.html') || file.name.toLowerCase().endsWith('.htm') || file.type === 'text/html');
    if (!htmlFiles.length) return [];
    const items = await Promise.all(htmlFiles.map(async (file) => ({
      id: makeId('html'),
      kind: 'html',
      name: file.name,
      size: file.size,
      text: await file.text(),
    })));
    EditorState.sourceItems.push(...items);
    EditorEvents.emit('sourceItemsChanged', EditorState.sourceItems);
    return items;
  }

  return [];
}

export function removeFile(index) {
  const file = EditorState.files[index];
  if (!file) return;
  EditorState.files.splice(index, 1);
  const sourceIndex = EditorState.sourceItems.findIndex((item) => item.kind === 'pdf' && item.file === file);
  if (sourceIndex >= 0) EditorState.sourceItems.splice(sourceIndex, 1);
  EditorEvents.emit('sourceItemsChanged', EditorState.sourceItems);
  EditorEvents.emit('filesChanged', EditorState.files);

  if (EditorState.files.length === 0) {
    clearWorkingDocument();
    clearResult();
  } else if (EditorState.activeTool === 'merge') {
    setWorkingDocumentFromFile(EditorState.files[0], { source: 'merge-source' });
  }
}

export function removeSourceItem(id) {
  const item = EditorState.sourceItems.find((entry) => entry.id === id);
  if (!item) return;

  EditorState.sourceItems = EditorState.sourceItems.filter((entry) => entry.id !== id);
  if (item.kind === 'pdf' && item.file) {
    const fileIndex = EditorState.files.findIndex((file) => file === item.file);
    if (fileIndex >= 0) EditorState.files.splice(fileIndex, 1);
    EditorEvents.emit('filesChanged', EditorState.files);
  }
  EditorEvents.emit('sourceItemsChanged', EditorState.sourceItems);
}

export function reorderSourceItems(fromIndex, toIndex, kind = null) {
  const items = kind ? getSourceItemsByKind(kind) : [...EditorState.sourceItems];
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= items.length || toIndex >= items.length) return;

  const targetIds = items.map((item) => item.id);
  const [movedId] = targetIds.splice(fromIndex, 1);
  targetIds.splice(toIndex, 0, movedId);

  const staticItems = kind ? EditorState.sourceItems.filter((item) => item.kind !== kind) : [];
  const reordered = targetIds.map((id) => items.find((item) => item.id === id));
  EditorState.sourceItems = kind ? [...staticItems, ...reordered] : reordered;

  if (kind === 'pdf') {
    EditorState.files = reordered.map((item) => item.file).filter(Boolean);
    EditorEvents.emit('filesChanged', EditorState.files);
  }

  EditorEvents.emit('sourceItemsChanged', EditorState.sourceItems);
}
