export const EditorState = {
  files: [],       // Array of uploaded File objects (PDFs)
  pdfDocs: [],     // Array of loaded pdf-lib PDFDocument instances
  activeTool: null, // e.g., 'merge', 'split'
  globalPdfBytes: null, // Optional cache of bytes if merged/manipulated globally
  fileByteCache: new WeakMap(), // File -> Promise<ArrayBuffer>
};

export const EditorEvents = {
  listeners: {},
  on(event, callback) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);
  },
  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(cb => cb(data));
    }
  }
};

export async function addFiles(newFiles) {
  const pdfFiles = Array.from(newFiles).filter(f => f.type === 'application/pdf');
  if (!pdfFiles.length) return;
  EditorState.files.push(...pdfFiles);
  EditorEvents.emit('filesChanged', EditorState.files);
}

export function removeFile(index) {
  EditorState.files.splice(index, 1);
  EditorEvents.emit('filesChanged', EditorState.files);
}

export function clearFiles() {
  EditorState.files = [];
  EditorEvents.emit('filesChanged', EditorState.files);
}

export function getFileBytes(file) {
  if (!file) return Promise.resolve(null);

  let pending = EditorState.fileByteCache.get(file);
  if (!pending) {
    pending = file.arrayBuffer();
    EditorState.fileByteCache.set(file, pending);
  }

  return pending;
}

export function setActiveTool(tool) {
  if (EditorState.activeTool === tool) return;
  EditorState.activeTool = tool;
  EditorEvents.emit('toolChanged', tool);
}
