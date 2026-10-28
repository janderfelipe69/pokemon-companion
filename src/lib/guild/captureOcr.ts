// Só roda no navegador. Lê o texto de um print da mensagem de captura (OCR).
// O pacote `tesseract.js` é carregado só quando alguém envia uma imagem, então não pesa no resto do site.

/** Aumenta e, se for tema escuro (Discord), inverte as cores: o OCR lê bem melhor texto escuro em fundo claro. */
async function prepare(file: Blob): Promise<HTMLCanvasElement> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.max(1, Math.min(3, 1400 / bitmap.width));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

  const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const px = image.data;
  let sum = 0;
  for (let i = 0; i < px.length; i += 4) sum += (px[i] + px[i + 1] + px[i + 2]) / 3;
  const dark = sum / (px.length / 4) < 128;
  for (let i = 0; i < px.length; i += 4) {
    const gray = (px[i] + px[i + 1] + px[i + 2]) / 3;
    const v = dark ? 255 - gray : gray;
    px[i] = px[i + 1] = px[i + 2] = v;
  }
  ctx.putImageData(image, 0, 0);
  return canvas;
}

export async function readImageText(file: Blob): Promise<string> {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("por");
  try {
    const { data } = await worker.recognize(await prepare(file));
    return String(data.text ?? "");
  } finally {
    await worker.terminate();
  }
}
