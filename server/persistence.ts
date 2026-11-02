import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import type { GenerativeUiData } from "../shared/generative-ui.js";

const dataDirectory = join(process.env.PASEO_PLUGIN_DATA_DIR ?? homedir(), ".paseo", "plugin-data", "generative-ui");
const maxRows = 200;
export type SavedRow = { id: string; data: GenerativeUiData };
function fileFor(agentId: string) { return join(dataDirectory, `${encodeURIComponent(agentId)}.json`); }
export async function readRows(agentId: string): Promise<SavedRow[]> { try { const parsed = JSON.parse(await readFile(fileFor(agentId), "utf8")); return Array.isArray(parsed) ? parsed.slice(-maxRows) : []; } catch { return []; } }
export async function saveRow(agentId: string, row: SavedRow) { const rows = (await readRows(agentId)).filter((entry) => entry.id !== row.id); rows.push(row); await mkdir(dataDirectory, { recursive: true }); const target = fileFor(agentId); const temporary = `${target}.${process.pid}.tmp`; await writeFile(temporary, JSON.stringify(rows.slice(-maxRows)), "utf8"); await rename(temporary, target); }
export async function removeRows(agentId: string) { await rm(fileFor(agentId), { force: true }); }
