import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { join } from "node:path";
import type { PluginHookContext, PluginServerContext } from "@getpaseo/plugin/server";
import { embedLocalImages } from "./server/local-images.js";
import { mcpProgram } from "./server/mcp-program.js";
import {
  embeddedImagePattern,
  generativeUiSchema,
  maxEmbeddedImagesBytes,
  maxGenerativeUiBodyBytes,
  maxGenerativeUiDataBytes,
} from "./shared/generative-ui.js";
import { maxOpenUiChars } from "./shared/openui-signatures.js";
import { sanitizeGenerativeUiData } from "./shared/html.js";
import { loadAgentTokens, loadOrCreateBridgeToken, readRows, removeRows, saveAgentTokens, saveRow } from "./server/persistence.js";

const bridgePort = 37621;

function resolveNodeCommand(): string {
  for (const directory of (process.env.PATH ?? "").split(":")) {
    const candidate = join(directory, "node");
    if (existsSync(candidate)) return candidate;
  }
  return "node";
}

function readJson(request: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    request.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > maxGenerativeUiBodyBytes) {
        reject(new Error("Corpo della richiesta troppo grande."));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on("end", () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch {
        reject(new Error("JSON non valido."));
      }
    });
    request.on("error", reject);
  });
}

function reply(response: ServerResponse, status: number, body: Record<string, unknown>) {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(body));
}

export default function contribute(server: PluginServerContext) {
  const nodeCommand = resolveNodeCommand();
  // Token del ponte e token agente restano gli stessi dopo un reload del plugin, altrimenti le chat già aperte
  // perdono `show_ui` («Non autorizzato») finché non si riapre la sessione.
  const token = loadOrCreateBridgeToken(() => randomBytes(32).toString("hex"));
  let paseo: PluginHookContext["paseo"] | undefined;
  const agentTokens = loadAgentTokens();
  const pendingRows = new Map<string, Map<string, ReturnType<typeof generativeUiSchema.parse>>>();
  async function flushPending(agentId: string) {
    const queue = pendingRows.get(agentId);
    if (!queue || queue.size === 0) return;
    pendingRows.delete(agentId);
    for (const [rowId, data] of queue) await append(agentId, rowId, data, true);
  }
  async function append(agentId: string, id: string, data: ReturnType<typeof generativeUiSchema.parse>, persist: boolean) {
    if (!paseo) throw new Error("Bridge Generative UI non ancora inizializzato.");
    await paseo.agents.ref(agentId).timeline.append({ type: "plugin", id, kind: "generative-ui", version: 1, data });
    if (persist) await saveRow(agentId, { id, data });
  }
  const bridge = createServer(async (request, response) => {
    if (request.method !== "POST" || request.url !== "/append") {
      reply(response, 404, { error: "Risorsa non trovata." });
      return;
    }
    if (request.headers.authorization !== `Bearer ${token}`) {
      reply(response, 401, { error: "Non autorizzato." });
      return;
    }
    try {
      const input = await readJson(request);
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Input non valido.");
      const { agentToken, id, ...data } = input as Record<string, unknown>;
      if (typeof agentToken !== "string") throw new Error("Token agente mancante.");
      const agentId = agentTokens.get(agentToken);
      if (!agentId) throw new Error("Agente non disponibile per questo token.");
      if (id !== undefined && (typeof id !== "string" || !id)) throw new Error("id non valido.");
      const rowId = typeof id === "string" ? id : `generative-ui-${randomBytes(8).toString("hex")}`;
      // Errore leggibile per l'agente (es. riga e riferimento OpenUI non risolti), non il JSON grezzo di Zod.
      // Le immagini incorporate (data URI) si tolgono prima dei controlli di testo e si rimettono dopo: i limiti di
      // 20000 caratteri e 64 KiB riguardano il testo, le immagini hanno un tetto a parte.
      // File locali (Image("/percorso") o file://) → data URI, qui nel bridge così vale anche per le chat già aperte.
      if (typeof data.openui === "string") data.openui = embedLocalImages(data.openui);
      const embedded: string[] = [];
      if (typeof data.openui === "string") {
        const textOnly: string = data.openui.replace(embeddedImagePattern, (uri) => {
          embedded.push(uri);
          return `data:image/jpeg;base64,STUB${embedded.length - 1}END`;
        });
        data.openui = textOnly;
        if (textOnly.length > maxOpenUiChars) throw new Error(`Il testo OpenUI supera il limite di ${maxOpenUiChars} caratteri.`);
      }
      if (embedded.reduce((total, uri) => total + uri.length, 0) > maxEmbeddedImagesBytes) {
        throw new Error("Le immagini incorporate superano il limite di 900 KiB: usa foto più piccole.");
      }
      const checked = generativeUiSchema.safeParse(data);
      if (!checked.success) throw new Error(checked.error.issues[0]?.message ?? "Dati dell'interfaccia non validi.");
      const clean = sanitizeGenerativeUiData({ ...checked.data, rowId });
      if (Buffer.byteLength(JSON.stringify(clean), "utf8") > maxGenerativeUiDataBytes) {
        throw new Error("I dati dell'interfaccia superano il limite di 64 KiB.");
      }
      const parsed =
        embedded.length > 0 && typeof clean.openui === "string"
          ? { ...clean, openui: clean.openui.replace(/data:image\/jpeg;base64,STUB(\d+)END/g, (_match, index) => embedded[Number(index)] ?? "") }
          : clean;
      // Il blocco NON si aggiunge subito: una riga inserita fra le chiamate agli strumenti finisce nel
      // gruppo di lavoro che il telefono tiene chiuso. Si accoda e si aggiunge a fine turno (agent.turn_ended),
      // cioè dopo la risposta finale. Con lo stesso id l'ultima versione sostituisce la precedente.
      const queue = pendingRows.get(agentId) ?? new Map<string, ReturnType<typeof generativeUiSchema.parse>>();
      queue.delete(rowId);
      queue.set(rowId, parsed);
      pendingRows.set(agentId, queue);
      reply(response, 200, { ok: true });
    } catch (error) {
      reply(response, 400, { error: error instanceof Error ? error.message : "Input non valido." });
    }
  });
  bridge.on("error", (error) => console.error("Bridge Generative UI non disponibile:", error));
  bridge.listen(bridgePort, "127.0.0.1");
  const bridgeUrl = `http://127.0.0.1:${bridgePort}/append`;
  const removeHook = server.before("agent.create", ({ request }, context) => {
    paseo = context.paseo;
    const agentToken = randomBytes(32).toString("hex");
    return {
    ...request,
    env: { ...request.env, GENERATIVE_UI_AGENT_TOKEN: agentToken },
    config: {
      ...request.config,
      mcpServers: {
        ...request.config.mcpServers,
        "generative-ui": {
          type: "stdio",
          command: nodeCommand,
          args: ["--input-type=commonjs", "--eval", mcpProgram],
          env: {
            GENERATIVE_UI_BRIDGE_URL: bridgeUrl,
            GENERATIVE_UI_BRIDGE_TOKEN: token,
            GENERATIVE_UI_AGENT_TOKEN: agentToken,
          },
          alwaysLoad: true,
        },
      },
    },
    };
  });
  const removeSessionHook = server.before("agent.session_open", async ({ request }, context) => {
    paseo = context.paseo;
    const agentToken = request.env.GENERATIVE_UI_AGENT_TOKEN;
    if (agentToken && agentTokens.get(agentToken) !== request.agentId) {
      agentTokens.set(agentToken, request.agentId);
      saveAgentTokens(agentTokens);
    }
    // Il replay dei blocchi salvati è best effort: se l'agente non è ancora caricato in memoria il daemon
    // risponde "Unknown agent" e, lasciando propagare l'errore, fetch_agent_timeline_request fallisce e
    // l'app (telefono incluso) non mostra la timeline della chat. Si salta e si riprova alla prossima apertura.
    try {
      for (const row of await readRows(request.agentId)) await append(request.agentId, row.id, row.data, false);
    } catch {
      // intenzionalmente ignorato: non deve mai bloccare l'apertura della sessione
    }
    return request;
  });
  const removeArchiveHook = server.on("agent.archived", ({ agent }) => {
    pendingRows.delete(agent.id);
    void removeRows(agent.id);
    for (const [agentToken, agentId] of agentTokens) if (agentId === agent.id) agentTokens.delete(agentToken);
    saveAgentTokens(agentTokens);
  });
  const removeTurnEndHook = server.on("agent.turn_ended", async ({ agent }, context) => {
    paseo = context.paseo;
    await flushPending(agent.id);
  });
  return () => {
    removeTurnEndHook();
    removeHook();
    removeSessionHook();
    removeArchiveHook();
    bridge.close();
  };
}
