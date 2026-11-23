import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import type { GenerativeUiData } from "../shared/generative-ui.js";

// Data lives under the Paseo home (PASEO_HOME, default ~/.paseo) so a daemon started with a custom home keeps
// its own data. PASEO_PLUGIN_DATA_DIR overrides the plugin-data root (used by tests).
function paseoHome(): string {
  const raw = process.env.PASEO_HOME;
  if (!raw) return join(homedir(), ".paseo");
  return raw === "~" ? homedir() : raw.startsWith("~/") ? join(homedir(), raw.slice(2)) : raw;
}
const dataDirectory = join(process.env.PASEO_PLUGIN_DATA_DIR ?? join(paseoHome(), "plugin-data"), "generative-ui");
const maxRows = 200;
export type SavedRow = { id: string; data: GenerativeUiData };
function fileFor(agentId: string) { return join(dataDirectory, `${encodeURIComponent(agentId)}.json`); }
export async function readRows(agentId: string): Promise<SavedRow[]> { try { const parsed = JSON.parse(await readFile(fileFor(agentId), "utf8")); return Array.isArray(parsed) ? parsed.slice(-maxRows) : []; } catch { return []; } }
export async function saveRow(agentId: string, row: SavedRow) { const rows = (await readRows(agentId)).filter((entry) => entry.id !== row.id); rows.push(row); await mkdir(dataDirectory, { recursive: true }); const target = fileFor(agentId); const temporary = `${target}.${process.pid}.tmp`; await writeFile(temporary, JSON.stringify(rows.slice(-maxRows)), "utf8"); await rename(temporary, target); }
export async function removeRows(agentId: string) { await rm(fileFor(agentId), { force: true }); }

// Credenziali che devono sopravvivere al ricaricamento del plugin (`paseo plugin reload`).
// SINTOMO se tornano in memoria: dopo un reload `show_ui` risponde «Non autorizzato» nelle chat già aperte, perché il
// processo MCP di quella chat tiene per sempre il token del ponte e il token agente ricevuti alla creazione.
// File con prefisso `_` per non collidere con i file delle righe (`<agentId>.json`), permessi 0600.
const bridgeTokenFile = join(dataDirectory, "_bridge-token");
const agentTokensFile = join(dataDirectory, "_agent-tokens.json");

export function loadOrCreateBridgeToken(create: () => string): string {
  try {
    const saved = readFileSync(bridgeTokenFile, "utf8").trim();
    if (/^[0-9a-f]{64}$/.test(saved)) return saved;
  } catch {
    // primo avvio: si crea sotto
  }
  const token = create();
  try {
    mkdirSync(dataDirectory, { recursive: true });
    writeFileSync(bridgeTokenFile, token, { encoding: "utf8", mode: 0o600 });
  } catch {
    // se non si riesce a salvare il token resta valido fino al prossimo reload
  }
  return token;
}

export function loadAgentTokens(): Map<string, string> {
  try {
    const parsed = JSON.parse(readFileSync(agentTokensFile, "utf8"));
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return new Map(Object.entries(parsed).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
    }
  } catch {
    // nessun file o contenuto illeggibile: si riparte vuoti
  }
  return new Map();
}

export function saveAgentTokens(tokens: Map<string, string>) {
  try {
    mkdirSync(dataDirectory, { recursive: true });
    const temporary = `${agentTokensFile}.${process.pid}.tmp`;
    writeFileSync(temporary, JSON.stringify(Object.fromEntries(tokens)), { encoding: "utf8", mode: 0o600 });
    renameSync(temporary, agentTokensFile);
  } catch {
    // best effort: in memoria funziona comunque fino al prossimo reload
  }
}
