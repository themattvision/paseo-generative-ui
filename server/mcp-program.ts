import { OPENUI_PROMPT } from "../shared/openui-prompt.generated.js";

// Il programma MCP gira come script inline (node --eval) e non può importare moduli: la descrizione
// con il prompt OpenUI viene costruita qui, nel modulo server, e inserita come stringa JSON.
const showUiDescription = `Inserisce o aggiorna un blocco di interfaccia nella timeline della chat.\n\n${OPENUI_PROMPT}`;

export const mcpProgram = String.raw`
const maxBytes = 64 * 1024;
const bridgeUrl = process.env.GENERATIVE_UI_BRIDGE_URL;
const bridgeToken = process.env.GENERATIVE_UI_BRIDGE_TOKEN;
const agentToken = process.env.GENERATIVE_UI_AGENT_TOKEN;
const send = (message) => process.stdout.write(JSON.stringify(message) + "\n");
const tool = {
  name: "show_ui",
  description: ${JSON.stringify(showUiDescription)},
  inputSchema: {
    type: "object",
    properties: {
      title: { type: "string", description: "Titolo opzionale dell'interfaccia." },
      spec: { type: "object", description: "Spec JSON dell'interfaccia (formato classico). Usa spec oppure openui, non entrambi." },
      openui: { type: "string", description: "Testo OpenUI Lang (root = Col([...]) e righe di definizione). Alternativo a spec, massimo 20000 caratteri." },
      id: { type: "string", description: "Id opzionale per aggiornare una riga già inviata." },
    },
    required: [],
    additionalProperties: false,
  },
};
const failure = (message) => ({ content: [{ type: "text", text: message }], isError: true });
// IMMAGINI LOCALI (16 novembre 2026): il telefono non legge i file del Mac, quindi un Image("file:///...") o con
// percorso assoluto veniva mostrato come segnaposto vuoto. Qui, dove il file esiste, lo si legge, lo si rimpicciolisce
// (sips, solo macOS) e lo si incorpora come data URI; il bridge applica il tetto sulle immagini.
const maxImageBytes = 260 * 1024;
const mimeByExtension = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", gif: "image/gif", webp: "image/webp" };
async function loadLocalImage(rawPath) {
  const fs = await import("node:fs");
  const os = await import("node:os");
  const path = await import("node:path");
  const { execFileSync } = await import("node:child_process");
  let file = rawPath.startsWith("file://") ? rawPath.slice(7) : rawPath;
  if (!fs.existsSync(file)) { try { file = decodeURIComponent(file); } catch {} }
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
    throw new Error("Immagine non trovata: " + file + ". Il telefono non legge il Mac: passa un file che esiste su questo computer.");
  }
  const extension = path.extname(file).slice(1).toLowerCase();
  const original = fs.readFileSync(file);
  if (mimeByExtension[extension] && original.length <= maxImageBytes) {
    return "data:" + mimeByExtension[extension] + ";base64," + original.toString("base64");
  }
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), "genui-img-"));
  try {
    for (const [size, quality] of [[960, 70], [720, 60], [540, 50], [400, 45]]) {
      const target = path.join(folder, "out-" + size + ".jpg");
      try {
        execFileSync("/usr/bin/sips", ["-s", "format", "jpeg", "-s", "formatOptions", String(quality), "-Z", String(size), file, "--out", target], { stdio: "ignore", timeout: 20000 });
      } catch { continue; }
      const resized = fs.readFileSync(target);
      if (resized.length <= maxImageBytes) return "data:image/jpeg;base64," + resized.toString("base64");
    }
  } finally {
    fs.rmSync(folder, { recursive: true, force: true });
  }
  throw new Error("Impossibile rimpicciolire l'immagine " + file + " sotto i 260 KiB: usa un file più piccolo.");
}
async function embedLocalImages(text) {
  const pattern = /Image\(\s*"((?:file:\/\/)?\/[^"]*)"/g;
  const found = new Map();
  for (const match of text.matchAll(pattern)) {
    if (!found.has(match[1])) found.set(match[1], await loadLocalImage(match[1]));
  }
  let result = text;
  for (const [rawPath, uri] of found) result = result.split('"' + rawPath + '"').join('"' + uri + '"');
  return result;
}
async function callTool(args) {
  let { title, spec, openui, id } = args ?? {};
  if (!bridgeUrl || !bridgeToken || !agentToken) return failure("Bridge Generative UI non configurato per questo agente.");
  if (title !== undefined && typeof title !== "string") return failure("title deve essere una stringa.");
  if (spec !== undefined && openui !== undefined) return failure("Passa spec oppure openui, non entrambi.");
  if (spec === undefined && openui === undefined) return failure("Passa spec (oggetto JSON) oppure openui (testo OpenUI Lang).");
  if (spec !== undefined && (!spec || typeof spec !== "object" || Array.isArray(spec))) return failure("spec deve essere un oggetto JSON.");
  if (openui !== undefined && typeof openui !== "string") return failure("openui deve essere una stringa.");
  if (id !== undefined && typeof id !== "string") return failure("id deve essere una stringa.");
  if (Buffer.byteLength(JSON.stringify({ title, spec, openui }), "utf8") > maxBytes) return failure("I dati dell'interfaccia superano il limite di 64 KiB.");
  try {
    if (typeof openui === "string") openui = await embedLocalImages(openui);
    const response = await fetch(bridgeUrl, {
      method: "POST",
      headers: { authorization: "Bearer " + bridgeToken, "content-type": "application/json" },
      body: JSON.stringify({ agentToken, title, spec, openui, id }),
    });
    const body = await response.json().catch(() => ({}));
    return response.ok
      ? { content: [{ type: "text", text: "Interfaccia mostrata nella timeline." }] }
      : failure(typeof body.error === "string" ? body.error : "Impossibile mostrare l'interfaccia.");
  } catch (error) {
    return failure(error instanceof Error ? error.message : "Impossibile contattare il bridge.");
  }
}
let buffer = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  buffer += chunk;
  let index;
  while ((index = buffer.indexOf("\n")) >= 0) {
    const line = buffer.slice(0, index);
    buffer = buffer.slice(index + 1);
    void handle(line);
  }
});
async function handle(line) {
  if (!line.trim()) return;
  let request;
  try { request = JSON.parse(line); } catch { return; }
  if (request.method === "notifications/initialized") return;
  if (request.method === "initialize") {
    send({ jsonrpc: "2.0", id: request.id, result: { protocolVersion: request.params?.protocolVersion ?? "2024-11-05", capabilities: { tools: {} }, serverInfo: { name: "generative-ui", version: "1.0.0" } } });
    return;
  }
  if (request.method === "tools/list") {
    send({ jsonrpc: "2.0", id: request.id, result: { tools: [tool] } });
    return;
  }
  if (request.method === "tools/call") {
    const result = request.params?.name === "show_ui" ? await callTool(request.params.arguments) : failure("Strumento sconosciuto.");
    send({ jsonrpc: "2.0", id: request.id, result });
  }
}
`;
