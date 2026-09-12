import type jsPDF from "jspdf";
import dejavuSansUrl from "dejavu-fonts-ttf/ttf/DejaVuSans.ttf?url";
import dejavuSansBoldUrl from "dejavu-fonts-ttf/ttf/DejaVuSans-Bold.ttf?url";

const PDF_FONT = "DejaVuSans";

let normalBase64: string | null = null;
let boldBase64: string | null = null;
let loadPromise: Promise<void> | null = null;

function arrayBufferToBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function loadFontFiles() {
  if (normalBase64 && boldBase64) return;
  const [normalBuf, boldBuf] = await Promise.all([
    fetch(dejavuSansUrl).then((r) => r.arrayBuffer()),
    fetch(dejavuSansBoldUrl).then((r) => r.arrayBuffer()),
  ]);
  normalBase64 = arrayBufferToBase64(normalBuf);
  boldBase64 = arrayBufferToBase64(boldBuf);
}

export function preloadPdfFonts() {
  if (!loadPromise) loadPromise = loadFontFiles();
  return loadPromise;
}

export async function registerPdfFonts(doc: jsPDF) {
  await preloadPdfFonts();
  doc.addFileToVFS("DejaVuSans.ttf", normalBase64!);
  doc.addFont("DejaVuSans.ttf", PDF_FONT, "normal");
  doc.addFileToVFS("DejaVuSans-Bold.ttf", boldBase64!);
  doc.addFont("DejaVuSans-Bold.ttf", PDF_FONT, "bold");
}

export { PDF_FONT };
