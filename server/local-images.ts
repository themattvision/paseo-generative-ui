import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { extname, join } from "node:path";

// IMMAGINI LOCALI (16 novembre 2026): il telefono non legge i file del Mac, quindi un Image("file:///...") o con
// percorso assoluto restava un segnaposto vuoto. Lo fa il BRIDGE (gira nel plugin sul Mac, dove il file esiste) e non
// il programma MCP di ogni chat: le chat già aperte hanno ancora il vecchio programma MCP (letto alla creazione) e
// così funzionano comunque (SINTOMO: nella chat «Porting Prince of Persia» le foto restavano vuote anche dopo la
// prima correzione, che stava solo nel programma MCP). Il file viene letto, rimpicciolito con /usr/bin/sips (solo
// macOS) e incorporato come data URI; il tetto complessivo sulle immagini lo applica index.server.ts.

export const maxImageBytes = 260 * 1024;
const mimeByExtension: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", gif: "image/gif", webp: "image/webp" };

export function loadLocalImage(rawPath: string): string {
  let file = rawPath.startsWith("file://") ? rawPath.slice("file://".length) : rawPath;
  if (!existsSync(file)) {
    try { file = decodeURIComponent(file); } catch { /* percorso non codificato */ }
  }
  if (!existsSync(file) || !statSync(file).isFile()) {
    throw new Error(`Image not found: ${file}. The phone cannot read the Mac: pass a file that exists on this computer.`);
  }
  const mime = mimeByExtension[extname(file).slice(1).toLowerCase()];
  const original = readFileSync(file);
  if (mime && original.length <= maxImageBytes) return `data:${mime};base64,${original.toString("base64")}`;
  const folder = mkdtempSync(join(tmpdir(), "genui-img-"));
  try {
    for (const [size, quality] of [[960, 70], [720, 60], [540, 50], [400, 45]]) {
      const target = join(folder, `out-${size}.jpg`);
      try {
        execFileSync("/usr/bin/sips", ["-s", "format", "jpeg", "-s", "formatOptions", String(quality), "-Z", String(size), file, "--out", target], { stdio: "ignore", timeout: 20_000 });
      } catch {
        continue;
      }
      const resized = readFileSync(target);
      if (resized.length <= maxImageBytes) return `data:image/jpeg;base64,${resized.toString("base64")}`;
    }
  } finally {
    rmSync(folder, { recursive: true, force: true });
  }
  throw new Error(`Cannot shrink the image ${file} below 260 KiB: use a smaller file.`);
}

/** Sostituisce ogni Image("/percorso") o Image("file://...") del testo OpenUI con il data URI del file. */
export function embedLocalImages(text: string): string {
  const found = new Map<string, string>();
  for (const match of text.matchAll(/Image\(\s*"((?:file:\/\/)?\/[^"]*)"/g)) {
    const path = match[1] ?? "";
    if (!found.has(path)) found.set(path, loadLocalImage(path));
  }
  let result = text;
  for (const [path, uri] of found) result = result.split(`"${path}"`).join(`"${uri}"`);
  return result;
}
