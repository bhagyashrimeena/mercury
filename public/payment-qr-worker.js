/* QR images and decoded payloads stay in this worker/browser. No destination is fetched. */
/* global importScripts, jsQR */
importScripts('/vendor/jsQR.js');
self.onmessage = async event => {
  let bitmap;
  try {
    const file = event.data;
    if (!(file instanceof Blob) || file.size > 768000) throw Error('Image too large');
    bitmap = await createImageBitmap(file);
    if (bitmap.width * bitmap.height > 24000000) throw Error('Image dimensions too large');
    const scale = Math.min(1, 1400 / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = new OffscreenCanvas(width, height);
    const context = canvas.getContext('2d', { willReadFrequently: true });
    context.fillStyle = '#fff';
    context.fillRect(0, 0, width, height);
    context.drawImage(bitmap, 0, 0, width, height);
    const pixels = context.getImageData(0, 0, width, height);
    const result = jsQR(pixels.data, width, height, { inversionAttempts: 'attemptBoth' });
    self.postMessage({ payload: result?.data?.slice(0, 4097) || '' });
  } catch {
    self.postMessage({ payload: '' });
  } finally {
    bitmap?.close();
  }
};
