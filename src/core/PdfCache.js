const pdfBytesCache = new WeakMap();
const pdfJsDocCache = new WeakMap();

function clonePdfBytes(bytes) {
  return bytes.slice(0);
}

export function getPdfBytes(file) {
  if (!file) return Promise.resolve(null);

  let bytesPromise = pdfBytesCache.get(file);
  if (!bytesPromise) {
    bytesPromise = file.arrayBuffer();
    pdfBytesCache.set(file, bytesPromise);
  }

  return bytesPromise;
}

export async function getPdfJsDocument(file, pdfjsLib) {
  if (!file) return null;

  let docPromise = pdfJsDocCache.get(file);
  if (!docPromise) {
    docPromise = getPdfBytes(file).then(async (bytes) => {
      const loadingTask = pdfjsLib.getDocument({ data: clonePdfBytes(bytes) });
      return loadingTask.promise;
    });
    pdfJsDocCache.set(file, docPromise);
  }

  return docPromise;
}
